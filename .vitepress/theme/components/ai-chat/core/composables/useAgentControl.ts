/**
 * useAgentControl - Agent 控制中心核心逻辑
 * 
 * 功能：
 * - Agent CRUD 操作
 * - 状态管理
 * - 100个动态头像分配
 * - 触发条件管理
 */

import { ref, computed, type Ref } from 'vue'

// ==================== 类型定义 ====================

export type AgentStatus = 'running' | 'paused' | 'error' | 'idle' | 'creating'

export type TriggerType = 'manual' | 'scheduled' | 'event' | 'webhook' | 'mention'

export interface TriggerConfig {
  // manual: 无额外配置
  // scheduled: cron 表达式
  cron?: string
  timezone?: string
  // event: 事件名称和条件
  eventName?: string
  eventFilter?: Record<string, any>
  // webhook: URL 和密钥
  webhookUrl?: string
  webhookSecret?: string
  // mention: @提及触发
  mentionKeywords?: string[]
}

export interface Trigger {
  id: string
  type: TriggerType
  name: string
  enabled: boolean
  config: TriggerConfig
  lastTriggered?: Date
  triggerCount: number
}

export interface ShortTermMemory {
  maxMessages: number
  ttl: number // 秒
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: Date
  }>
}

export interface LongTermMemory {
  enabled: boolean
  storagePath: string
  entries: Array<{
    key: string
    value: string
    importance: number
    createdAt: Date
    updatedAt: Date
  }>
}

export interface FunctionCallConfig {
  enabled: boolean
  allowedTools: string[]
  customTools: Array<{
    name: string
    description: string
    parameters: Record<string, any>
    handler: string // 前端存储的函数体或后端端点
  }>
  timeout: number
  maxCallsPerRequest: number
}

export interface AgentPermissions {
  fileAccess: boolean
  allowedPaths: string[]
  networkAccess: boolean
  allowedDomains: string[]
  commandExecution: boolean
  allowedCommands: string[]
  codeExecution: boolean
}

export interface RuntimeConfig {
  model: string
  temperature: number
  maxTokens: number
  timeout: number // 秒
  retryCount: number
  retryDelay: number // 秒
}

export interface LifecycleConfig {
  autoStart: boolean
  maxRunTime: number // 秒，0 表示无限制
  idleTimeout: number // 秒
  cleanupPolicy: 'keep' | 'archive' | 'delete'
  archiveAfter: number // 天
}

export interface Agent {
  // 基础信息
  id: string
  name: string
  description: string
  avatarId: number // 1-100
  
  // 状态
  status: AgentStatus
  createdAt: Date
  updatedAt: Date
  lastRunAt?: Date
  totalRuns: number
  errorCount: number
  
  // 触发条件
  triggers: Trigger[]
  
  // 记忆
  memory: {
    shortTerm: ShortTermMemory
    longTerm: LongTermMemory
    contextWindow: number
  }
  
  // 技能
  skills: string[] // skill IDs
  
  // 工具调用
  functionCall: FunctionCallConfig
  
  // 权限
  permissions: AgentPermissions
  
  // 运行配置
  runtime: RuntimeConfig
  
  // 生命周期
  lifecycle: LifecycleConfig
  
  // 系统提示词
  systemPrompt: string
}

export interface AgentCreateParams {
  name: string
  description?: string
  avatarId?: number
  systemPrompt?: string
}

// ==================== 100个头像配置 ====================

export const AVATAR_STYLES = [
  'adventurer', 'adventurer-neutral', 'avataaars', 'big-ears',
  'big-ears-neutral', 'big-smile', 'bottts', 'bottts-neutral',
  'croodles', 'croodles-neutral', 'fun-emoji', 'icons',
  'identicon', 'initials', 'lorelei', 'lorelei-neutral',
  'micah', 'miniavs', 'notionists', 'notionists-neutral',
  'open-peeps', 'personas', 'pixel-art', 'pixel-art-neutral',
  'rings', 'shapes', 'thumbs'
] as const

// 生成 100 个头像 URL (使用 DiceBear API)
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

// ==================== Composable ====================

const STORAGE_KEY = 'ai-chat-agents-v2'

// 默认 Agent 配置
const createDefaultAgent = (id: string, params: AgentCreateParams): Agent => ({
  id,
  name: params.name,
  description: params.description || '',
  avatarId: params.avatarId || 1,
  
  status: 'idle',
  createdAt: new Date(),
  updatedAt: new Date(),
  totalRuns: 0,
  errorCount: 0,
  
  triggers: [{
    id: `trigger-${Date.now()}`,
    type: 'manual',
    name: '手动触发',
    enabled: true,
    config: {},
    triggerCount: 0
  }],
  
  memory: {
    shortTerm: {
      maxMessages: 20,
      ttl: 3600,
      messages: []
    },
    longTerm: {
      enabled: true,
      storagePath: `.memory/${id}`,
      entries: []
    },
    contextWindow: 4096
  },
  
  skills: [],
  
  functionCall: {
    enabled: false,
    allowedTools: [],
    customTools: [],
    timeout: 30,
    maxCallsPerRequest: 5
  },
  
  permissions: {
    fileAccess: true,
    allowedPaths: ['docs/'],
    networkAccess: false,
    allowedDomains: [],
    commandExecution: false,
    allowedCommands: [],
    codeExecution: false
  },
  
  runtime: {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 60,
    retryCount: 3,
    retryDelay: 1
  },
  
  lifecycle: {
    autoStart: false,
    maxRunTime: 0,
    idleTimeout: 300,
    cleanupPolicy: 'keep',
    archiveAfter: 30
  },
  
  systemPrompt: params.systemPrompt || '你是一个有用的 AI 助手。'
})

export function useAgentControl() {
  // 状态
  const agents: Ref<Agent[]> = ref([])
  const activeAgentId = ref<string | null>(null)
  const isLoading = ref(false)
  
  // 计算属性
  const activeAgent = computed(() => 
    agents.value.find(a => a.id === activeAgentId.value) || null
  )
  
  const agentsByStatus = computed(() => ({
    running: agents.value.filter(a => a.status === 'running'),
    paused: agents.value.filter(a => a.status === 'paused'),
    error: agents.value.filter(a => a.status === 'error'),
    idle: agents.value.filter(a => a.status === 'idle'),
    creating: agents.value.filter(a => a.status === 'creating')
  }))
  
  const sortedAgents = computed(() => {
    const statusOrder: Record<AgentStatus, number> = {
      running: 0,
      error: 1,
      paused: 2,
      idle: 3,
      creating: 4
    }
    return [...agents.value].sort((a, b) => {
      // 先按状态排序
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      // 再按更新时间排序
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  })
  
  // 获取已使用的头像 ID
  const usedAvatarIds = computed(() => 
    agents.value.map(a => a.avatarId)
  )
  
  // 持久化
  function saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents.value))
    }
  }
  
  function loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          agents.value = parsed.map((a: any) => ({
            ...a,
            createdAt: new Date(a.createdAt),
            updatedAt: new Date(a.updatedAt),
            lastRunAt: a.lastRunAt ? new Date(a.lastRunAt) : undefined
          }))
        } catch (e) {
          console.error('Failed to load agents:', e)
        }
      }
    }
  }
  
  // CRUD 操作
  function create(params: AgentCreateParams): Agent {
    const id = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const avatarId = params.avatarId || getRandomAvatarId(usedAvatarIds.value)
    
    const agent = createDefaultAgent(id, { ...params, avatarId })
    agents.value.push(agent)
    saveToStorage()
    
    // 如果是第一个 Agent，自动设为活跃
    if (agents.value.length === 1) {
      setActive(id)
    }
    
    return agent
  }
  
  function update(id: string, data: Partial<Agent>): boolean {
    const index = agents.value.findIndex(a => a.id === id)
    if (index === -1) return false
    
    agents.value[index] = {
      ...agents.value[index],
      ...data,
      updatedAt: new Date()
    }
    saveToStorage()
    return true
  }
  
  function remove(id: string): boolean {
    const index = agents.value.findIndex(a => a.id === id)
    if (index === -1) return false
    
    agents.value.splice(index, 1)
    
    // 如果删除的是活跃 Agent，重置
    if (activeAgentId.value === id) {
      activeAgentId.value = agents.value[0]?.id || null
    }
    
    saveToStorage()
    return true
  }
  
  function setActive(id: string) {
    activeAgentId.value = id
  }
  
  // 状态管理
  function startAgent(id: string): boolean {
    return update(id, { status: 'running', lastRunAt: new Date() })
  }
  
  function pauseAgent(id: string): boolean {
    return update(id, { status: 'paused' })
  }
  
  function stopAgent(id: string): boolean {
    return update(id, { status: 'idle' })
  }
  
  function setError(id: string, error?: string): boolean {
    const agent = agents.value.find(a => a.id === id)
    if (!agent) return false
    
    return update(id, { 
      status: 'error',
      errorCount: agent.errorCount + 1
    })
  }
  
  // 触发器管理
  function addTrigger(agentId: string, trigger: Omit<Trigger, 'id' | 'triggerCount'>): boolean {
    const agent = agents.value.find(a => a.id === agentId)
    if (!agent) return false
    
    const newTrigger: Trigger = {
      ...trigger,
      id: `trigger-${Date.now()}`,
      triggerCount: 0
    }
    
    agent.triggers.push(newTrigger)
    saveToStorage()
    return true
  }
  
  function updateTrigger(agentId: string, triggerId: string, data: Partial<Trigger>): boolean {
    const agent = agents.value.find(a => a.id === agentId)
    if (!agent) return false
    
    const trigger = agent.triggers.find(t => t.id === triggerId)
    if (!trigger) return false
    
    Object.assign(trigger, data)
    saveToStorage()
    return true
  }
  
  function removeTrigger(agentId: string, triggerId: string): boolean {
    const agent = agents.value.find(a => a.id === agentId)
    if (!agent) return false
    
    const index = agent.triggers.findIndex(t => t.id === triggerId)
    if (index === -1) return false
    
    agent.triggers.splice(index, 1)
    saveToStorage()
    return true
  }
  
  // 统计
  function getStats() {
    const total = agents.value.length
    const byStatus = agentsByStatus.value
    
    return {
      total,
      running: byStatus.running.length,
      paused: byStatus.paused.length,
      error: byStatus.error.length,
      idle: byStatus.idle.length,
      totalRuns: agents.value.reduce((sum, a) => sum + a.totalRuns, 0),
      totalErrors: agents.value.reduce((sum, a) => sum + a.errorCount, 0)
    }
  }
  
  // 初始化
  function init() {
    loadFromStorage()
    
    // 如果没有 Agent，创建一个默认的
    if (agents.value.length === 0) {
      create({
        name: '默认助手',
        description: '通用的 AI 助手，可以回答各种问题',
        systemPrompt: '你是一个有用的 AI 助手，擅长回答各种问题和协助用户完成任务。'
      })
    }
  }
  
  return {
    // 状态
    agents,
    activeAgentId,
    activeAgent,
    isLoading,
    
    // 计算属性
    agentsByStatus,
    sortedAgents,
    usedAvatarIds,
    
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
    
    // 头像
    generateAvatarUrl,
    getRandomAvatarId
  }
}

export type UseAgentControlReturn = ReturnType<typeof useAgentControl>
