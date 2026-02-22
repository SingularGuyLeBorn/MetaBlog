/**
 * useAgents - Agent 管理中心（后端持久化版）
 * 
 * Agent 等级体系：
 * - meta: 元 Agent，最高权限，可管理其他 Agent
 * - core: 核心 Agent，系统级功能
 * - fixed: 固定唤起 Agent，常驻助手
 * - custom: 自定义 Agent，用户创建的
 * - temp: 临时 Agent，一次性任务
 */

import { ref, computed } from 'vue'

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
  seat: number
  skills: string[]
  permissions: AgentPermission[]
  systemPrompt: string
  memoryEnabled: boolean
  memoryContent: string
  createdAt: number
  updatedAt: number
  lastActiveAt: number
  callCount: number
  isDefault: boolean
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

// 默认 Agent
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

// 存储键（仅用于活跃 Agent ID）
const ACTIVE_AGENT_KEY = 'ai-active-agent-id'

// 状态
const agents = ref<Agent[]>([])
const activeAgentId = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// API 函数
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

export function useAgents() {
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
    return [...agents.value].sort((a, b) => {
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      return a.seat - b.seat
    })
  })

  // 初始化 - 从后端加载
  async function init() {
    isLoading.value = true
    error.value = null
    
    try {
      const data = await fetchAgents()
      
      // 确保默认 Agent 存在
      if (!data.find((a: Agent) => a.id === DEFAULT_AGENT.id)) {
        data.unshift({ ...DEFAULT_AGENT })
        // 保存到后端
        await createAgentAPI(DEFAULT_AGENT)
      }
      
      agents.value = data
      
      // 加载活跃 Agent ID（从 localStorage，这只是 UI 状态）
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(ACTIVE_AGENT_KEY)
        if (stored && agents.value.find(a => a.id === stored)) {
          activeAgentId.value = stored
        } else {
          activeAgentId.value = agents.value[0]?.id || null
        }
      }
    } catch (e) {
      error.value = String(e)
      console.error('[useAgents] Failed to load:', e)
    } finally {
      isLoading.value = false
    }
  }

  // 创建 Agent
  async function create(params: AgentCreateParams): Promise<Agent> {
    const now = Date.now()
    const newAgentData = {
      name: params.name,
      avatar: params.avatar || '🤖',
      description: params.description,
      level: params.level,
      status: 'idle' as AgentStatus,
      seat: 999,
      skills: params.skills || [],
      permissions: PERMISSION_TEMPLATES.map(p => ({
        ...p,
        granted: p.id === 'chat'
      })),
      systemPrompt: params.systemPrompt || '',
      memoryEnabled: false,
      memoryContent: '',
      lastActiveAt: now,
      callCount: 0,
      isDefault: false
    }
    
    const newAgent = await createAgentAPI(newAgentData)
    agents.value.push(newAgent)
    
    // 如果是第一个 Agent，设为活跃
    if (agents.value.length === 1) {
      setActive(newAgent.id)
    }
    
    return newAgent
  }

  // 更新 Agent
  async function update(id: string, data: Partial<Agent>): Promise<void> {
    const updated = await updateAgentAPI(id, data)
    const index = agents.value.findIndex(a => a.id === id)
    if (index !== -1) {
      agents.value[index] = updated
    }
  }

  // 删除 Agent
  async function remove(id: string): Promise<void> {
    await deleteAgentAPI(id)
    agents.value = agents.value.filter(a => a.id !== id)
    
    // 如果删除的是活跃 Agent，重置
    if (activeAgentId.value === id) {
      activeAgentId.value = agents.value[0]?.id || null
      if (typeof localStorage !== 'undefined' && activeAgentId.value) {
        localStorage.setItem(ACTIVE_AGENT_KEY, activeAgentId.value)
      }
    }
  }

  // 设置活跃 Agent
  function setActive(id: string) {
    activeAgentId.value = id
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_AGENT_KEY, id)
    }
  }

  // 获取统计
  function getStats() {
    return {
      total: agents.value.length,
      online: agents.value.filter(a => a.status === 'online').length,
      byLevel: {
        meta: agents.value.filter(a => a.level === 'meta').length,
        core: agents.value.filter(a => a.level === 'core').length,
        fixed: agents.value.filter(a => a.level === 'fixed').length,
        custom: agents.value.filter(a => a.level === 'custom').length,
        temp: agents.value.filter(a => a.level === 'temp').length
      }
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
    
    // 方法
    init,
    create,
    update,
    remove,
    setActive,
    getStats
  }
}
