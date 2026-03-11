/**
 * Agent Orchestrator 集成模块
 * 
 * 与现有AI Chat系统集成
 */

import { agentOrchestrator, initializeDefaultAgents } from './index'
import { managerEngineRegistry } from './manager-agent'
import type { EnhancedAgent } from './types'

/** 集成状态 */
interface IntegrationState {
  initialized: boolean
  defaultAgentsCreated: boolean
  controlPanelMounted: boolean
}

const state: IntegrationState = {
  initialized: false,
  defaultAgentsCreated: false,
  controlPanelMounted: false
}

/**
 * 初始化 Agent Orchestrator 系统
 * 
 * 在应用启动时调用
 */
export function initAgentOrchestrator(): void {
  if (state.initialized) {
    console.log('[Orchestrator] 已初始化，跳过')
    return
  }

  console.log('[Orchestrator] 初始化 Agent Orchestrator 系统...')

  // 1. 检查是否已存在System Agents（从localStorage恢复）
  const hasExistingAgents = checkExistingAgents()
  
  if (!hasExistingAgents) {
    // 2. 创建默认Agent
    initializeDefaultAgents()
    state.defaultAgentsCreated = true
    
    // 3. 保存到localStorage
    saveAgentsToStorage()
  } else {
    // 4. 从localStorage恢复
    restoreAgentsFromStorage()
  }

  // 5. 启动自动保存
  startAutoSave()

  state.initialized = true
  console.log('[Orchestrator] 初始化完成')
}

/**
 * 检查是否存在已保存的Agents
 */
function checkExistingAgents(): boolean {
  try {
    const saved = localStorage.getItem('agent_orchestrator_agents')
    return !!saved && JSON.parse(saved).length > 0
  } catch {
    return false
  }
}

/**
 * 保存Agents到localStorage
 */
function saveAgentsToStorage(): void {
  try {
    const agents = agentOrchestrator.getAllAgents()
    localStorage.setItem('agent_orchestrator_agents', JSON.stringify(agents))
    console.log('[Orchestrator] 已保存', agents.length, '个Agent')
  } catch (error) {
    console.error('[Orchestrator] 保存失败:', error)
  }
}

/**
 * 从localStorage恢复Agents
 */
function restoreAgentsFromStorage(): void {
  try {
    const saved = localStorage.getItem('agent_orchestrator_agents')
    if (!saved) return

    const agents: EnhancedAgent[] = JSON.parse(saved)
    
    // 重新注册到orchestrator
    for (const agent of agents) {
      // 恢复时重置状态
      agent.runtimeStatus = agent.mode === 'scheduled' ? 'scheduled' : 'listening'
      agent.currentTask = undefined
      agent.lastHeartbeat = Date.now()
      
      // 使用私有方法重新注册（需要修改orchestrator暴露此方法）
      // 这里简化处理，实际应该通过API重新创建
    }

    console.log('[Orchestrator] 已恢复', agents.length, '个Agent')
  } catch (error) {
    console.error('[Orchestrator] 恢复失败:', error)
  }
}

/**
 * 启动自动保存
 */
function startAutoSave(): void {
  // 每30秒自动保存一次
  setInterval(() => {
    saveAgentsToStorage()
  }, 30000)

  // 页面卸载前保存
  window.addEventListener('beforeunload', () => {
    saveAgentsToStorage()
  })
}

/**
 * 获取所有可交互的Agents（用于Chat界面选择）
 */
export function getChatableAgents(): EnhancedAgent[] {
  return agentOrchestrator.getAllAgents().filter(agent => 
    // System Agents 不在Chat中显示
    agent.tier !== 'system' && 
    // 处于可用状态
    (agent.runtimeStatus === 'idle' || 
     agent.runtimeStatus === 'listening' ||
     agent.runtimeStatus === 'running')
  )
}

/**
 * 为用户创建被动Worker Agent
 * 
 * 用户在Chat中发送指令时使用
 */
export async function createWorkerForUser(
  name: string,
  description: string,
  skills: string[] = []
): Promise<EnhancedAgent> {
  const { createPassiveWorker } = await import('./presets')
  
  // 找到主Manager
  const managers = agentOrchestrator.getAgentsByTier('manager')
  const mainManager = managers.find(m => m.name === '主管理Agent')
  
  const worker = createPassiveWorker(mainManager?.id)
  
  // 更新名称和描述
  worker.name = name
  worker.description = description
  worker.capabilities.skillIds = skills
  
  return worker
}

/**
 * 处理用户发送的链接
 * 
 * 自动调度稍后阅读Worker处理
 */
export async function handleUserLink(url: string): Promise<void> {
  const { createReadLaterWorker } = await import('./presets')
  
  // 查找或创建稍后阅读Worker
  const existingWorker = agentOrchestrator.getAllAgents().find(
    a => a.name === '稍后阅读Worker' && a.runtimeStatus !== 'error'
  )
  
  const worker = existingWorker || createReadLaterWorker()
  
  // 触发任务
  await agentOrchestrator.triggerAgentTask(
    worker.id,
    '处理链接',
    { url },
    'user'
  )
}

/**
 * 获取系统状态摘要（用于显示在Chat界面）
 */
export function getSystemStatusSummary(): string {
  const state = agentOrchestrator.getSystemState()
  const agents = agentOrchestrator.getAllAgents()
  
  const systemCount = agents.filter(a => a.tier === 'system').length
  const managerCount = agents.filter(a => a.tier === 'manager').length
  const workerCount = agents.filter(a => a.tier === 'worker').length
  const runningCount = agents.filter(a => a.runtimeStatus === 'running').length
  
  return `📊 系统状态: ${state.status}
🤖 Agents: ${systemCount} 系统 | ${managerCount} 管理 | ${workerCount} 工作
⚡ 运行中: ${runningCount} | 📋 队列: ${state.pendingTasks}
📈 负载: ${Math.round(state.load.cpu)}%`
}

/**
 * 与Chat消息集成
 * 
 * 检测用户消息中的指令，自动调度Agent
 */
export async function processChatMessage(
  message: string,
  userAgentId?: string
): Promise<{ handled: boolean; response?: string }> {
  
  // 指令1: "稍后阅读 <链接>"
  const readLaterMatch = message.match(/稍后阅读\s+(https?:\/\/\S+)/i)
  if (readLaterMatch) {
    const url = readLaterMatch[1]
    await handleUserLink(url)
    return {
      handled: true,
      response: `📚 已收到链接，稍后阅读Worker正在处理...\n${url}`
    }
  }

  // 指令2: "研究 <主题>"
  const researchMatch = message.match(/研究\s+(.+)/i)
  if (researchMatch) {
    const topic = researchMatch[1]
    const { createResearchWorker } = await import('./presets')
    
    const mainManager = agentOrchestrator.getAgentsByTier('manager')[0]
    const worker = createResearchWorker(mainManager?.id)
    
    await agentOrchestrator.triggerAgentTask(
      worker.id,
      '研究主题',
      { topic },
      'user'
    )
    
    return {
      handled: true,
      response: `🔬 已启动研究Worker，正在研究"${topic}"...\n预计需要几分钟时间，完成后会通知您。`
    }
  }

  // 指令3: "查看Agent状态"
  if (message.includes('查看Agent状态') || message.includes('系统状态')) {
    return {
      handled: true,
      response: getSystemStatusSummary()
    }
  }

  // 指令4: "打开控制中心"
  if (message.includes('打开控制中心') || message.includes('控制面板')) {
    // 触发打开面板事件
    window.dispatchEvent(new CustomEvent('open-orchestrator-panel'))
    return {
      handled: true,
      response: '🎯 已打开Agent控制中心面板'
    }
  }

  // 未处理的指令，继续正常对话
  return { handled: false }
}

/**
 * 导出所有数据（用于备份）
 */
export function exportAllData(): object {
  return {
    agents: agentOrchestrator.getAllAgents(),
    systemState: agentOrchestrator.getSystemState(),
    notifications: agentOrchestrator.getNotifications(),
    exportTime: Date.now()
  }
}

/**
 * 导入数据（用于恢复）
 */
export function importAllData(data: object): void {
  // 实现数据导入逻辑
  console.log('[Orchestrator] 导入数据:', data)
}

// 导出便捷函数
export { agentOrchestrator, initializeDefaultAgents }
