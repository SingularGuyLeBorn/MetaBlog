/**
 * useAgents - Agent 管理中心
 * 
 * Agent 等级体系：
 * - meta: 元 Agent，最高权限，可管理其他 Agent
 * - core: 核心 Agent，系统级功能
 * - fixed: 固定唤起 Agent，常驻助手
 * - custom: 自定义 Agent，用户创建的
 * - temp: 临时 Agent，一次性任务
 * 
 * 座次系统：数字越小，排名越前
 */

import { ref, computed, watch } from 'vue'
import type { Skill } from './useSkills'

export type AgentLevel = 'meta' | 'core' | 'fixed' | 'custom' | 'temp'
export type AgentStatus = 'online' | 'offline' | 'busy' | 'idle'

export interface AgentPermission {
  id: string
  name: string
  description: string
  granted: boolean
}

export interface Agent {
  id: string
  name: string
  avatar: string
  description: string
  level: AgentLevel
  status: AgentStatus
  seat: number // 座次，越小越靠前
  skills: string[] // 技能 ID 列表
  permissions: AgentPermission[]
  systemPrompt: string
  memoryEnabled: boolean
  memoryContent: string
  createdAt: number
  updatedAt: number
  lastActiveAt: number
  callCount: number // 被调用次数
  isDefault: boolean // 是否为默认 Agent
}

export interface AgentCreateParams {
  name: string
  avatar?: string
  description: string
  level: AgentLevel
  skills?: string[]
  systemPrompt?: string
}

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

// 默认 Agent（顶部 AI 助手）
const DEFAULT_AGENT: Agent = {
  id: 'default-assistant',
  name: 'Meta 助手',
  avatar: '🤖',
  description: '基于 DeepSeek 大模型的通用 AI 助手，为您提供专业智能对话体验',
  level: 'meta',
  status: 'online',
  seat: 1,
  skills: ['write', 'code', 'summarize', 'translate'],
  permissions: PERMISSION_TEMPLATES.map(p => ({ ...p, granted: true })),
  systemPrompt: '你是一个 helpful 的 AI 助手，擅长回答问题、提供建议和协助完成各种任务。',
  memoryEnabled: true,
  memoryContent: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastActiveAt: Date.now(),
  callCount: 0,
  isDefault: true
}

// 存储键
const STORAGE_KEY = 'ai-agents-v1'
const ACTIVE_AGENT_KEY = 'ai-active-agent-id'

// 创建新 Agent
function createAgent(params: AgentCreateParams): Agent {
  const now = Date.now()
  return {
    id: `agent-${now}-${Math.random().toString(36).slice(2, 9)}`,
    name: params.name,
    avatar: params.avatar || '🤖',
    description: params.description,
    level: params.level,
    status: 'idle',
    seat: 999, // 默认座次，需要手动调整
    skills: params.skills || [],
    permissions: PERMISSION_TEMPLATES.map(p => ({
      ...p,
      granted: p.id === 'chat' // 默认只有对话权限
    })),
    systemPrompt: params.systemPrompt || '',
    memoryEnabled: false,
    memoryContent: '',
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
    callCount: 0,
    isDefault: false
  }
}

// 加载 Agents
function loadAgents(): Agent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const agents = JSON.parse(stored)
      // 确保默认 Agent 存在
      if (!agents.find((a: Agent) => a.id === DEFAULT_AGENT.id)) {
        agents.unshift({ ...DEFAULT_AGENT })
      }
      return agents
    }
  } catch (e) {
    console.error('[useAgents] Failed to load agents:', e)
  }
  return [{ ...DEFAULT_AGENT }]
}

// 保存 Agents
function saveAgents(agents: Agent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents))
  } catch (e) {
    console.error('[useAgents] Failed to save agents:', e)
  }
}

// 加载当前激活的 Agent ID
function loadActiveAgentId(): string {
  try {
    return localStorage.getItem(ACTIVE_AGENT_KEY) || DEFAULT_AGENT.id
  } catch {
    return DEFAULT_AGENT.id
  }
}

// 保存当前激活的 Agent ID
function saveActiveAgentId(id: string) {
  try {
    localStorage.setItem(ACTIVE_AGENT_KEY, id)
  } catch (e) {
    console.error('[useAgents] Failed to save active agent:', e)
  }
}

// Composable
export function useAgents() {
  const agents = ref<Agent[]>(loadAgents())
  const activeAgentId = ref<string>(loadActiveAgentId())

  // 按座次排序的 Agents
  const sortedAgents = computed(() => {
    return [...agents.value].sort((a, b) => {
      // 先按等级排序
      const levelOrder = { meta: 0, core: 1, fixed: 2, custom: 3, temp: 4 }
      if (levelOrder[a.level] !== levelOrder[b.level]) {
        return levelOrder[a.level] - levelOrder[b.level]
      }
      // 再按座次排序
      return a.seat - b.seat
    })
  })

  // 按等级分组的 Agents
  const agentsByLevel = computed(() => {
    const groups: Record<AgentLevel, Agent[]> = {
      meta: [],
      core: [],
      fixed: [],
      custom: [],
      temp: []
    }
    sortedAgents.value.forEach(agent => {
      groups[agent.level].push(agent)
    })
    return groups
  })

  // 当前激活的 Agent
  const activeAgent = computed(() => {
    return agents.value.find(a => a.id === activeAgentId.value) || agents.value[0]
  })

  // 默认 Agent
  const defaultAgent = computed(() => {
    return agents.value.find(a => a.isDefault) || agents.value[0]
  })

  // 监听变化并保存
  watch(agents, (val) => {
    saveAgents(val)
  }, { deep: true })

  watch(activeAgentId, (val) => {
    saveActiveAgentId(val)
  })

  // CRUD 操作
  function create(params: AgentCreateParams): Agent {
    const agent = createAgent(params)
    agents.value.push(agent)
    return agent
  }

  function update(id: string, updates: Partial<Agent>): boolean {
    const index = agents.value.findIndex(a => a.id === id)
    if (index === -1) return false
    
    agents.value[index] = {
      ...agents.value[index],
      ...updates,
      updatedAt: Date.now()
    }
    return true
  }

  function remove(id: string): boolean {
    const agent = agents.value.find(a => a.id === id)
    if (!agent || agent.isDefault) return false // 不能删除默认 Agent
    
    agents.value = agents.value.filter(a => a.id !== id)
    
    // 如果删除的是当前激活的 Agent，切换到默认
    if (activeAgentId.value === id) {
      activeAgentId.value = defaultAgent.value?.id || agents.value[0]?.id
    }
    
    return true
  }

  function getById(id: string): Agent | undefined {
    return agents.value.find(a => a.id === id)
  }

  function setActive(id: string): boolean {
    const agent = agents.value.find(a => a.id === id)
    if (!agent) return false
    
    activeAgentId.value = id
    agent.lastActiveAt = Date.now()
    agent.callCount++
    return true
  }

  // 更新 Agent 状态
  function setStatus(id: string, status: AgentStatus): boolean {
    return update(id, { status })
  }

  // 调整座次
  function setSeat(id: string, seat: number): boolean {
    return update(id, { seat })
  }

  // 批量调整座次（交换两个 Agent 的座次）
  function swapSeat(id1: string, id2: string): boolean {
    const agent1 = agents.value.find(a => a.id === id1)
    const agent2 = agents.value.find(a => a.id === id2)
    if (!agent1 || !agent2) return false
    
    const temp = agent1.seat
    agent1.seat = agent2.seat
    agent2.seat = temp
    
    update(id1, { seat: agent1.seat })
    update(id2, { seat: agent2.seat })
    
    return true
  }

  // 更新权限
  function setPermission(agentId: string, permissionId: string, granted: boolean): boolean {
    const agent = getById(agentId)
    if (!agent) return false
    
    const perm = agent.permissions.find(p => p.id === permissionId)
    if (!perm) return false
    
    perm.granted = granted
    update(agentId, { permissions: agent.permissions })
    return true
  }

  // 添加技能
  function addSkill(agentId: string, skillId: string): boolean {
    const agent = getById(agentId)
    if (!agent || agent.skills.includes(skillId)) return false
    
    agent.skills.push(skillId)
    update(agentId, { skills: agent.skills })
    return true
  }

  // 移除技能
  function removeSkill(agentId: string, skillId: string): boolean {
    const agent = getById(agentId)
    if (!agent) return false
    
    agent.skills = agent.skills.filter(s => s !== skillId)
    update(agentId, { skills: agent.skills })
    return true
  }

  // 获取统计信息
  function getStats() {
    return {
      total: agents.value.length,
      byLevel: {
        meta: agents.value.filter(a => a.level === 'meta').length,
        core: agents.value.filter(a => a.level === 'core').length,
        fixed: agents.value.filter(a => a.level === 'fixed').length,
        custom: agents.value.filter(a => a.level === 'custom').length,
        temp: agents.value.filter(a => a.level === 'temp').length
      },
      online: agents.value.filter(a => a.status === 'online').length,
      totalCalls: agents.value.reduce((sum, a) => sum + a.callCount, 0)
    }
  }

  return {
    // State
    agents,
    activeAgentId,
    sortedAgents,
    agentsByLevel,
    activeAgent,
    defaultAgent,
    
    // CRUD
    create,
    update,
    remove,
    getById,
    setActive,
    
    // 状态管理
    setStatus,
    setSeat,
    swapSeat,
    
    // 权限和技能
    setPermission,
    addSkill,
    removeSkill,
    
    // 统计
    getStats
  }
}

export default useAgents
