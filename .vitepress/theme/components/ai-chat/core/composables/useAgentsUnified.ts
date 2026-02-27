/**
 * useAgentsUnified - 统一的 Agent 管理中心
 * 
 * 合并 useAgents 和 useAgentControl 的功能：
 * - 后端持久化存储（useAgents 方式）
 * - 丰富的配置选项（useAgentControl 方式）
 * - 定时调度器
 * - 前端只缓存 activeAgentId（UI 状态）
 */

import { ref, computed, type Ref } from 'vue'
import { getActiveAgentId, setActiveAgentId } from '../services/agentStorage'

// ==================== 类型定义 ====================

export type AgentLevel = 'meta' | 'core' | 'fixed' | 'custom' | 'temp'
export type AgentStatus = 'online' | 'offline' | 'busy' | 'idle' | 'running' | 'paused' | 'error' | 'creating'
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'webhook' | 'mention'

export interface Trigger {
  id: string
  type: TriggerType
  name: string
  enabled: boolean
  config: {
    cron?: string
    timezone?: string
    eventName?: string
    eventFilter?: Record<string, any>
    webhookUrl?: string
    webhookSecret?: string
    mentionKeywords?: string[]
  }
  lastTriggered?: string
  triggerCount: number
}

export interface AgentPermission {
  id: string
  name: string
  description: string
  granted: boolean
}

export interface FunctionCallConfig {
  enabled: boolean
  allowedTools: string[]
  customTools: Array<{
    name: string
    description: string
    parameters: Record<string, any>
    handler: string
  }>
  timeout: number
  maxCallsPerRequest: number
}

export interface MemoryConfig {
  shortTerm: {
    maxMessages: number
    ttl: number
    messages: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp: string
    }>
  }
  longTerm: {
    enabled: boolean
    storagePath: string
    entries: Array<{
      key: string
      value: string
      importance: number
      createdAt: string
      updatedAt: string
    }>
  }
  contextWindow: number
}

export interface LifecycleConfig {
  autoStart: boolean
  maxRunTime: number
  idleTimeout: number
  cleanupPolicy: 'keep' | 'archive' | 'delete'
  archiveAfter: number
}

export interface RuntimeConfig {
  model: string
  temperature: number
  maxTokens: number
  timeout: number
  retryCount: number
  retryDelay: number
}

export interface Agent {
  // 基础信息
  id: string
  name: string
  avatar: string
  avatarId?: number
  description: string
  level: AgentLevel
  status: AgentStatus
  seat: number
  
  // 功能配置
  skills: string[]
  permissions: AgentPermission[]
  systemPrompt: string
  
  // 记忆系统
  memoryEnabled: boolean
  memoryContent: string
  memory?: MemoryConfig
  
  // 工具调用
  functionCall?: FunctionCallConfig
  
  // 生命周期
  lifecycle?: LifecycleConfig
  
  // 运行配置
  runtime?: RuntimeConfig
  
  // 触发器
  triggers?: Trigger[]
  
  // 统计
  createdAt: number
  updatedAt: number
  lastActiveAt: number
  lastRunAt?: number
  callCount: number
  totalRuns?: number
  errorCount?: number
  
  // 默认标记
  isDefault: boolean
}

export interface AgentCreateParams {
  name?: string
  avatar?: string
  avatarId?: number
  description?: string
  level?: AgentLevel
  skills?: string[]
  systemPrompt?: string
  triggers?: Trigger[]
  functionCall?: FunctionCallConfig
  memory?: MemoryConfig
  lifecycle?: LifecycleConfig
  runtime?: RuntimeConfig
  permissions?: AgentPermission[]
  memoryEnabled?: boolean
}

// ==================== 常量 ====================

// 权限模板
export const PERMISSION_TEMPLATES: Omit<AgentPermission, 'granted'>[] = [
  { id: 'chat', name: '对话权限', description: '可以进行对话交流' },
  { id: 'file_read', name: '文件读取', description: '可以读取项目文件' },
  { id: 'file_write', name: '文件写入', description: '可以修改项目文件' },
  { id: 'skill_use', name: '技能调用', description: '可以使用已配置的技能' },
  { id: 'skill_create', name: '技能创建', description: '可以创建新技能' },
  { id: 'agent_manage', name: 'Agent 管理', description: '可以管理其他 Agent' },
  { id: 'memory_access', name: '记忆访问', description: '可以访问长期记忆' },
  { id: 'web_search', name: '网络搜索', description: '可以进行网络搜索' },
  { id: 'code_execute', name: '代码执行', description: '可以执行代码' },
  { id: 'system_config', name: '系统配置', description: '可以修改系统配置' }
]

// 等级配置
export const LEVEL_CONFIG: Record<AgentLevel, { label: string; color: string; icon: string; maxSeat: number }> = {
  meta: { label: '元 Agent', color: '#8b5cf6', icon: '👑', maxSeat: 1 },
  core: { label: '核心 Agent', color: '#3b82f6', icon: '🔧', maxSeat: 3 },
  fixed: { label: '固定 Agent', color: '#10b981', icon: '📌', maxSeat: 5 },
  custom: { label: '自定义 Agent', color: '#f59e0b', icon: '✨', maxSeat: 20 },
  temp: { label: '临时 Agent', color: '#6b7280', icon: '⏱️', maxSeat: 10 }
}

// 100个头像配置
export const AVATAR_STYLES = [
  'adventurer', 'adventurer-neutral', 'avataaars', 'big-ears',
  'big-ears-neutral', 'big-smile', 'bottts', 'bottts-neutral',
  'croodles', 'croodles-neutral', 'fun-emoji', 'icons',
  'identicon', 'initials', 'lorelei', 'lorelei-neutral',
  'micah', 'miniavs', 'notionists', 'notionists-neutral',
  'open-peeps', 'personas', 'pixel-art', 'pixel-art-neutral',
  'rings', 'shapes', 'thumbs'
] as const

// 默认运行时配置
const DEFAULT_RUNTIME: RuntimeConfig = {
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 2048,
  timeout: 60,
  retryCount: 3,
  retryDelay: 1
}

// 默认生命周期配置
const DEFAULT_LIFECYCLE: LifecycleConfig = {
  autoStart: false,
  maxRunTime: 0,
  idleTimeout: 300,
  cleanupPolicy: 'keep',
  archiveAfter: 30
}

// 默认记忆配置
const DEFAULT_MEMORY: MemoryConfig = {
  shortTerm: {
    maxMessages: 20,
    ttl: 3600,
    messages: []
  },
  longTerm: {
    enabled: false,
    storagePath: '',
    entries: []
  },
  contextWindow: 4096
}

// 默认工具调用配置
const DEFAULT_FUNCTION_CALL: FunctionCallConfig = {
  enabled: false,
  allowedTools: [],
  customTools: [],
  timeout: 30,
  maxCallsPerRequest: 5
}

// 默认触发器
const createDefaultTrigger = (): Trigger => ({
  id: `trigger-${Date.now()}`,
  type: 'manual',
  name: '手动触发',
  enabled: true,
  config: {},
  triggerCount: 0
})

// 生成头像 URL
export function generateAvatarUrl(id: number, seed?: string): string {
  const style = AVATAR_STYLES[id % AVATAR_STYLES.length]
  const actualSeed = seed || `agent-${id}`
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(actualSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`
}

// 获取随机可用头像 ID
export function getRandomAvatarId(usedIds: number[]): number {
  const available = Array.from({ length: 100 }, (_, i) => i + 1)
    .filter(id => !usedIds.includes(id))
  if (available.length === 0) return Math.floor(Math.random() * 100) + 1
  return available[Math.floor(Math.random() * available.length)]
}

// 创建默认 Agent
const createDefaultAgent = (id: string, params: AgentCreateParams, seat: number): Agent => ({
  id,
  name: params.name || '未命名 Agent',
  avatar: params.avatar || '🤖',
  avatarId: params.avatarId || Math.floor(Math.random() * 100) + 1,
  description: params.description || '',
  level: params.level || 'custom',
  status: 'idle',
  seat,
  skills: params.skills || [],
  permissions: PERMISSION_TEMPLATES.map(p => ({ ...p, granted: p.id === 'chat' })),
  systemPrompt: params.systemPrompt || `你是一个有用的 AI 助手。

## 工具使用指南
当你调用工具（如创建文章、搜索等）后：
1. 工具执行结果会返回给你
2. 你需要根据工具执行结果，用自然语言向用户解释发生了什么
3. 不要只返回工具结果，要提供有帮助的、友好的回复

例如：
- 如果文章创建成功，告诉用户文章已创建，并说明文件路径
- 如果搜索有结果，总结搜索结果给用户
- 如果操作失败，解释失败原因并提供建议

记住：用户希望看到的是你的回复，而不是原始的工具返回值。`,
  memoryEnabled: false,
  memoryContent: '',
  memory: params.memory || DEFAULT_MEMORY,
  functionCall: params.functionCall || DEFAULT_FUNCTION_CALL,
  lifecycle: params.lifecycle || DEFAULT_LIFECYCLE,
  runtime: params.runtime || DEFAULT_RUNTIME,
  triggers: params.triggers || [createDefaultTrigger()],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastActiveAt: Date.now(),
  callCount: 0,
  totalRuns: 0,
  errorCount: 0,
  isDefault: false
})

// ==================== 定时调度器 ====================

class TriggerScheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private agentsRef: Ref<Agent[]>
  private onTrigger: (agentId: string, triggerId: string) => Promise<void>

  constructor(
    agentsRef: Ref<Agent[]>,
    onTrigger: (agentId: string, triggerId: string) => Promise<void>
  ) {
    this.agentsRef = agentsRef
    this.onTrigger = onTrigger
  }

  // 启动调度器
  start() {
    if (this.checkInterval) return
    
    // 每分钟检查一次定时触发器
    this.checkInterval = setInterval(() => {
      this.checkScheduledTriggers()
    }, 60000)
    
    // 立即检查一次
    this.checkScheduledTriggers()
    
    console.log('[TriggerScheduler] Started')
  }

  // 停止调度器
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    
    // 清除所有定时器
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    
    console.log('[TriggerScheduler] Stopped')
  }

  // 检查定时触发器
  private checkScheduledTriggers() {
    const now = new Date()
    
    for (const agent of this.agentsRef.value) {
      if (!agent.triggers) continue
      
      for (const trigger of agent.triggers) {
        if (trigger.type !== 'scheduled') continue
        if (!trigger.enabled) continue
        if (!trigger.config.cron) continue
        
        // 简单的 cron 检查（只支持 "分 时 * * *" 格式）
        // 例如: "0 9 * * *" 表示每天 9:00
        const cronParts = trigger.config.cron.split(' ')
        if (cronParts.length !== 5) continue
        
        const [cronMin, cronHour] = cronParts
        const currentMin = now.getMinutes()
        const currentHour = now.getHours()
        
        const matchMin = cronMin === '*' || parseInt(cronMin) === currentMin
        const matchHour = cronHour === '*' || parseInt(cronHour) === currentHour
        
        if (matchMin && matchHour) {
          // 检查是否已经触发过（避免重复触发）
          const lastTriggered = trigger.lastTriggered 
            ? new Date(trigger.lastTriggered) 
            : null
          
          if (!lastTriggered || 
              lastTriggered.getHours() !== currentHour || 
              lastTriggered.getMinutes() !== currentMin) {
            
            console.log(`[TriggerScheduler] Executing trigger ${trigger.id} for agent ${agent.id}`)
            this.onTrigger(agent.id, trigger.id)
          }
        }
      }
    }
  }

  // 为特定 Agent 调度触发器
  scheduleAgentTriggers(agentId: string) {
    // 移除该 Agent 的旧定时器
    this.unscheduleAgentTriggers(agentId)
    
    const agent = this.agentsRef.value.find(a => a.id === agentId)
    if (!agent || !agent.triggers) return
    
    for (const trigger of agent.triggers) {
      if (trigger.type !== 'scheduled' || !trigger.enabled) continue
      
      const timerKey = `${agentId}:${trigger.id}`
      
      // 解析 cron 并设置定时器（简化实现）
      // 完整实现需要 cron-parser 库
      console.log(`[TriggerScheduler] Scheduled ${timerKey} with cron: ${trigger.config.cron}`)
    }
  }

  // 取消特定 Agent 的触发器
  unscheduleAgentTriggers(agentId: string) {
    for (const [key, timer] of this.timers) {
      if (key.startsWith(`${agentId}:`)) {
        clearTimeout(timer)
        this.timers.delete(key)
      }
    }
  }
}

// ==================== API 函数 ====================

async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function createAgentAPI(params: AgentCreateParams): Promise<Agent> {
  const response = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function updateAgentAPI(id: string, updates: Partial<Agent>): Promise<Agent> {
  const response = await fetch('/api/agents/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates })
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function deleteAgentAPI(id: string): Promise<void> {
  const response = await fetch('/api/agents/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

async function triggerAgentAPI(agentId: string, triggerId: string): Promise<void> {
  const response = await fetch('/api/agents/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, triggerId })
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

// ==================== Composable ====================

export function useAgentsUnified() {
  // 状态
  const agents: Ref<Agent[]> = ref([])
  const activeAgentId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const scheduler = ref<TriggerScheduler | null>(null)

  // 计算属性
  const activeAgent = computed(() => 
    agents.value.find(a => a.id === activeAgentId.value) || agents.value[0] || null
  )

  const agentsByLevel = computed(() => {
    const result: Record<AgentLevel, Agent[]> = {
      meta: [],
      core: [],
      fixed: [],
      custom: [],
      temp: []
    }
    agents.value.forEach(agent => {
      result[agent.level].push(agent)
    })
    return result
  })

  const sortedAgents = computed(() => {
    const statusOrder: Record<AgentStatus, number> = {
      running: 0,
      error: 1,
      online: 2,
      paused: 3,
      busy: 4,
      idle: 5,
      offline: 6,
      creating: 7
    }
    return [...agents.value].sort((a, b) => {
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      const statusDiff = (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99)
      if (statusDiff !== 0) return statusDiff
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  })

  const usedAvatarIds = computed(() => agents.value.map(a => a.avatarId || 1))

  const agentsByStatus = computed(() => ({
    all: agents.value,
    running: agents.value.filter(a => a.status === 'running'),
    paused: agents.value.filter(a => a.status === 'paused'),
    error: agents.value.filter(a => a.status === 'error'),
    idle: agents.value.filter(a => a.status === 'idle'),
    busy: agents.value.filter(a => a.status === 'busy'),
    online: agents.value.filter(a => a.status === 'online'),
    offline: agents.value.filter(a => a.status === 'offline'),
    creating: agents.value.filter(a => a.status === 'creating')
  }))

  // 初始化
  async function init() {
    isLoading.value = true
    error.value = null

    try {
      const data = await fetchAgents()
      
      // 确保数据完整性
      agents.value = data.map((a: Partial<Agent>) => ({
        ...createDefaultAgent(a.id || `agent-${Date.now()}`, {}, 999),
        ...a
      }))

      // 确保有默认 Agent
      const hasDefault = agents.value.some(a => a.isDefault)
      if (!hasDefault && agents.value.length > 0) {
        agents.value[0].isDefault = true
      }

      // 加载活跃 Agent ID
      const stored = await getActiveAgentId()
      if (stored && agents.value.find(a => a.id === stored)) {
        activeAgentId.value = stored
      } else {
        activeAgentId.value = agents.value[0]?.id || null
      }

      // 启动定时调度器
      if (!scheduler.value) {
        scheduler.value = new TriggerScheduler(agents, handleTrigger)
        scheduler.value.start()
      }

    } catch (e) {
      error.value = String(e)
      console.error('[useAgentsUnified] Failed to load:', e)
    } finally {
      isLoading.value = false
    }
  }

  // 处理触发器执行
  async function handleTrigger(agentId: string, triggerId: string) {
    try {
      await triggerAgentAPI(agentId, triggerId)
      
      // 更新本地状态
      const agent = agents.value.find(a => a.id === agentId)
      if (agent) {
        agent.totalRuns = (agent.totalRuns || 0) + 1
        agent.lastRunAt = Date.now()
        agent.status = 'running'
        
        const trigger = agent.triggers?.find(t => t.id === triggerId)
        if (trigger) {
          trigger.lastTriggered = new Date().toISOString()
          trigger.triggerCount++
        }
      }
    } catch (e) {
      console.error('[useAgentsUnified] Trigger failed:', e)
      const agent = agents.value.find(a => a.id === agentId)
      if (agent) {
        agent.status = 'error'
        agent.errorCount = (agent.errorCount || 0) + 1
      }
    }
  }

  // CRUD 操作
  async function create(params: AgentCreateParams): Promise<Agent> {
    const seat = agents.value.length + 1
    const tempAgent = createDefaultAgent(`temp-${Date.now()}`, params, seat)
    
    const newAgent = await createAgentAPI({
      ...tempAgent,
      ...params
    })
    
    agents.value.push(newAgent)
    
    if (agents.value.length === 1) {
      setActive(newAgent.id)
    }
    
    return newAgent
  }

  async function update(id: string, data: Partial<Agent>): Promise<boolean> {
    const index = agents.value.findIndex(a => a.id === id)
    if (index === -1) return false

    const updated = await updateAgentAPI(id, data)
    
    agents.value[index] = {
      ...agents.value[index],
      ...updated,
      updatedAt: Date.now()
    }
    
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const index = agents.value.findIndex(a => a.id === id)
    if (index === -1) return false

    await deleteAgentAPI(id)
    
    agents.value.splice(index, 1)
    
    if (activeAgentId.value === id) {
      activeAgentId.value = agents.value[0]?.id || null
    }
    
    return true
  }

  async function setActive(id: string) {
    activeAgentId.value = id
    await setActiveAgentId(id)
  }

  // 状态管理
  async function startAgent(id: string): Promise<boolean> {
    return update(id, { status: 'running', lastRunAt: Date.now() })
  }

  async function pauseAgent(id: string): Promise<boolean> {
    return update(id, { status: 'paused' })
  }

  async function stopAgent(id: string): Promise<boolean> {
    return update(id, { status: 'idle' })
  }

  async function setError(id: string, errorMsg?: string): Promise<boolean> {
    const agent = agents.value.find(a => a.id === id)
    if (!agent) return false

    return update(id, {
      status: 'error',
      errorCount: (agent.errorCount || 0) + 1
    })
  }

  // 触发器管理
  async function addTrigger(
    agentId: string, 
    trigger: Omit<Trigger, 'id' | 'triggerCount'>
  ): Promise<boolean> {
    const agent = agents.value.find(a => a.id === agentId)
    if (!agent) return false

    const newTrigger: Trigger = {
      ...trigger,
      id: `trigger-${Date.now()}`,
      triggerCount: 0
    }

    const triggers = [...(agent.triggers || []), newTrigger]
    return update(agentId, { triggers })
  }

  async function updateTrigger(
    agentId: string, 
    triggerId: string, 
    data: Partial<Trigger>
  ): Promise<boolean> {
    const agent = agents.value.find(a => a.id === agentId)
    if (!agent || !agent.triggers) return false

    const trigger = agent.triggers.find(t => t.id === triggerId)
    if (!trigger) return false

    Object.assign(trigger, data)
    return update(agentId, { triggers: agent.triggers })
  }

  async function removeTrigger(agentId: string, triggerId: string): Promise<boolean> {
    const agent = agents.value.find(a => a.id === agentId)
    if (!agent || !agent.triggers) return false

    const triggers = agent.triggers.filter(t => t.id !== triggerId)
    return update(agentId, { triggers })
  }

  // 统计
  function getStats() {
    const byStatus = agentsByStatus.value
    return {
      total: agents.value.length,
      running: byStatus.running.length,
      paused: byStatus.paused.length,
      error: byStatus.error.length,
      idle: byStatus.idle.length,
      online: byStatus.online.length,
      offline: byStatus.offline.length,
      totalRuns: agents.value.reduce((sum, a) => sum + (a.totalRuns || 0), 0),
      totalErrors: agents.value.reduce((sum, a) => sum + (a.errorCount || 0), 0)
    }
  }

  // 清理
  function dispose() {
    if (scheduler.value) {
      scheduler.value.stop()
      scheduler.value = null
    }
  }

  return {
    // 状态
    agents,
    activeAgentId,
    activeAgent,
    isLoading,
    error,

    // 计算属性
    agentsByLevel,
    sortedAgents,
    usedAvatarIds,
    agentsByStatus,

    // 方法
    init,
    create,
    update,
    remove,
    setActive,
    startAgent,
    pauseAgent,
    stopAgent,
    setError,
    addTrigger,
    updateTrigger,
    removeTrigger,
    getStats,
    dispose,

    // 头像
    generateAvatarUrl,
    getRandomAvatarId
  }
}

export type UseAgentsUnifiedReturn = ReturnType<typeof useAgentsUnified>
