/**
 * Agents API Routes - Agent 管理服务端路由
 * 
 * 数据持久化存储在 .data/agents.json
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'

const router = Router()

// 数据存储路径
const DATA_DIR = join(process.cwd(), '.data')
const AGENTS_FILE = join(DATA_DIR, 'agents.json')

// 统一响应类型
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Agent 类型定义（完整版）
export type AgentLevel = 'meta' | 'core' | 'fixed' | 'custom' | 'temp'
export type AgentStatus = 'online' | 'offline' | 'busy' | 'idle' | 'running' | 'paused' | 'error'
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
  id: string
  name: string
  avatar: string
  avatarId?: number
  description: string
  level: AgentLevel
  status: AgentStatus
  seat: number
  skills: string[]
  permissions: AgentPermission[]
  systemPrompt: string
  memoryEnabled: boolean
  memoryContent: string
  memory?: MemoryConfig
  functionCall?: FunctionCallConfig
  lifecycle?: LifecycleConfig
  runtime?: RuntimeConfig
  triggers?: Trigger[]
  createdAt: number
  updatedAt: number
  isMaster?: boolean  // 标记是否为 Master Agent（不可删除）
  lastActiveAt: number
  lastRunAt?: number
  callCount: number
  totalRuns?: number
  errorCount?: number
  isDefault: boolean
}

// 权限模板
const PERMISSION_TEMPLATES: Omit<AgentPermission, 'granted'>[] = [
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

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Master Agent 配置
const MASTER_AGENT_CONFIG = {
  id: 'master-agent',
  name: 'Master Agent',
  avatar: '👑',
  avatarId: 0,
  description: '系统级超级助手，拥有管理其他 Agent 和系统配置的特权。不可删除、不可修改。',
  level: 'meta' as AgentLevel,
  status: 'online' as AgentStatus,
  seat: 0,
  skills: ['sys_admin', 'agent_management', 'system_config'],
  permissions: PERMISSION_TEMPLATES.map(p => ({ ...p, granted: true })),
  systemPrompt: `你是 MetaBlog 系统的 Master Agent，拥有系统级特权。

你的职责：
1. 管理其他 Agent（创建、配置、删除）
2. 监控系统状态
3. 协助用户配置系统

你可以使用的系统工具：
- sys_list_agents: 列出所有 Agent
- sys_create_agent: 创建新 Agent
- sys_update_agent: 更新 Agent 配置
- sys_delete_agent: 删除 Agent（不能删除 meta 级）
- sys_update_trigger: 配置 Agent 触发器
- sys_list_skills: 列出所有技能
- sys_get_system_status: 获取系统状态

请用专业、友好的态度帮助用户管理系统。`,
  memoryEnabled: true,
  memoryContent: '',
  memory: {
    shortTerm: { maxMessages: 50, ttl: 7200, messages: [] },
    longTerm: { enabled: true, storagePath: '.memory/master-agent', entries: [] },
    contextWindow: 8192
  },
  functionCall: {
    enabled: true,
    allowedTools: ['sys_list_agents', 'sys_create_agent', 'sys_update_agent', 'sys_delete_agent', 'sys_update_trigger', 'sys_list_skills', 'sys_get_system_status'],
    customTools: [],
    timeout: 60,
    maxCallsPerRequest: 10
  },
  lifecycle: {
    autoStart: true,
    maxRunTime: 0,
    idleTimeout: 0,
    cleanupPolicy: 'keep' as const,
    archiveAfter: 365
  },
  runtime: {
    model: 'deepseek-chat',
    temperature: 0.5,
    maxTokens: 4096,
    timeout: 120,
    retryCount: 3,
    retryDelay: 1
  },
  triggers: [{
    id: 'master-trigger-default',
    type: 'manual' as TriggerType,
    name: '手动触发',
    enabled: true,
    config: {},
    triggerCount: 0
  }],
  isDefault: false,
  isMaster: true  // 标记为 Master Agent
}

// 读取所有 Agents
async function readAgents(): Promise<Agent[]> {
  await ensureDataDir()
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8')
    const agents: Agent[] = JSON.parse(data)
    
    // 确保 Master Agent 存在
    const hasMaster = agents.some(a => a.id === MASTER_AGENT_CONFIG.id || a.isMaster)
    if (!hasMaster) {
      const masterAgent: Agent = {
        ...MASTER_AGENT_CONFIG,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastActiveAt: Date.now(),
        callCount: 0,
        totalRuns: 0,
        errorCount: 0
      }
      agents.unshift(masterAgent)
      await writeAgents(agents)
    }
    
    return agents
  } catch {
    // 文件不存在，创建默认 Agents（包含 Master）
    const now = Date.now()
    const masterAgent: Agent = {
      ...MASTER_AGENT_CONFIG,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      callCount: 0,
      totalRuns: 0,
      errorCount: 0
    }
    const defaultAgent: Agent = {
      id: 'default-assistant',
      name: 'Meta 助手',
      avatar: '🤖',
      avatarId: 1,
      description: '基于 DeepSeek 大模型的通用 AI 助手，为您提供专业智能对话体验',
      level: 'meta',
      status: 'online',
      seat: 1,
      skills: ['write', 'code', 'summarize', 'translate'],
      permissions: PERMISSION_TEMPLATES.map(p => ({ ...p, granted: true })),
      systemPrompt: '你是一个 helpful 的 AI 助手，擅长回答问题、提供建议和协助完成各种任务。',
      memoryEnabled: true,
      memoryContent: '',
      memory: {
        shortTerm: { maxMessages: 20, ttl: 3600, messages: [] },
        longTerm: { enabled: true, storagePath: '.memory/default-assistant', entries: [] },
        contextWindow: 4096
      },
      functionCall: {
        enabled: false,
        allowedTools: [],
        customTools: [],
        timeout: 30,
        maxCallsPerRequest: 5
      },
      lifecycle: {
        autoStart: false,
        maxRunTime: 0,
        idleTimeout: 300,
        cleanupPolicy: 'keep',
        archiveAfter: 30
      },
      runtime: {
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 2048,
        timeout: 60,
        retryCount: 3,
        retryDelay: 1
      },
      triggers: [{
        id: `trigger-${now}`,
        type: 'manual',
        name: '手动触发',
        enabled: true,
        config: {},
        triggerCount: 0
      }],
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      callCount: 0,
      totalRuns: 0,
      errorCount: 0,
      isDefault: true
    }
    const initialAgents = [masterAgent, defaultAgent]
    await writeAgents(initialAgents)
    return initialAgents
  }
}

// 写入所有 Agents
async function writeAgents(agents: Agent[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8')
}

// GET /api/agents - 获取所有 Agents
router.get('/', async (req, res) => {
  try {
    const agents = await readAgents()
    res.json({ success: true, data: agents } as ApiResponse<Agent[]>)
  } catch (error) {
    console.error('[Agents API] Failed to read:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read agents data' 
    } as ApiResponse)
  }
})

// POST /api/agents - 创建 Agent
router.post('/', async (req, res) => {
  try {
    const params = req.body
    const agents = await readAgents()
    
    const now = Date.now()
    const newAgent: Agent = {
      id: `agent-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name || '未命名 Agent',
      avatar: params.avatar || '🤖',
      avatarId: params.avatarId || Math.floor(Math.random() * 100) + 1,
      description: params.description || '',
      level: params.level || 'custom',
      status: 'idle',
      seat: agents.length + 1,
      skills: params.skills || [],
      permissions: params.permissions || PERMISSION_TEMPLATES.map(p => ({ 
        ...p, 
        granted: p.id === 'chat' 
      })),
      systemPrompt: params.systemPrompt || '你是一个有用的 AI 助手。',
      memoryEnabled: params.memoryEnabled ?? false,
      memoryContent: '',
      memory: params.memory || {
        shortTerm: { maxMessages: 20, ttl: 3600, messages: [] },
        longTerm: { enabled: false, storagePath: '', entries: [] },
        contextWindow: 4096
      },
      functionCall: params.functionCall || {
        enabled: false,
        allowedTools: [],
        customTools: [],
        timeout: 30,
        maxCallsPerRequest: 5
      },
      lifecycle: params.lifecycle || {
        autoStart: false,
        maxRunTime: 0,
        idleTimeout: 300,
        cleanupPolicy: 'keep',
        archiveAfter: 30
      },
      runtime: params.runtime || {
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 2048,
        timeout: 60,
        retryCount: 3,
        retryDelay: 1
      },
      triggers: params.triggers || [{
        id: `trigger-${now}`,
        type: 'manual',
        name: '手动触发',
        enabled: true,
        config: {},
        triggerCount: 0
      }],
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      callCount: 0,
      totalRuns: 0,
      errorCount: 0,
      isDefault: false
    }
    
    agents.push(newAgent)
    await writeAgents(agents)
    
    res.json({ success: true, data: newAgent } as ApiResponse<Agent>)
  } catch (error) {
    console.error('[Agents API] Failed to create:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create agent' 
    } as ApiResponse)
  }
})

// POST /api/agents/update - 更新 Agent
router.post('/update', async (req, res) => {
  try {
    const { id, ...updates } = req.body
    const agents = await readAgents()
    
    const index = agents.findIndex(a => a.id === id)
    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agent not found' 
      } as ApiResponse)
    }
    
    const existingAgent = agents[index]
    
    // 保护 meta 级 Agent 的关键字段
    if (existingAgent.level === 'meta' || existingAgent.isMaster) {
      // 不允许修改 level、isMaster、id 等关键字段
      delete (updates as Partial<Agent>).level
      delete (updates as Partial<Agent>).isMaster
      delete (updates as Partial<Agent>).id
      
      // Master Agent 还有额外的保护字段
      if (existingAgent.isMaster) {
        delete (updates as Partial<Agent>).systemPrompt
        delete (updates as Partial<Agent>).functionCall
        delete (updates as Partial<Agent>).permissions
      }
    }
    
    agents[index] = {
      ...existingAgent,
      ...updates,
      id, // 确保 ID 不变
      updatedAt: Date.now()
    }
    
    await writeAgents(agents)
    res.json({ success: true, data: agents[index] } as ApiResponse<Agent>)
  } catch (error) {
    console.error('[Agents API] Failed to update:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update agent' 
    } as ApiResponse)
  }
})

// POST /api/agents/delete - 删除 Agent
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body
    const agents = await readAgents()
    
    const agentToDelete = agents.find(a => a.id === id)
    if (!agentToDelete) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agent not found' 
      } as ApiResponse)
    }
    
    // 保护 meta 级 Agent（包括 Master Agent）
    if (agentToDelete.level === 'meta' || agentToDelete.isMaster) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete meta-level or master agent' 
      } as ApiResponse)
    }
    
    const filtered = agents.filter(a => a.id !== id)
    await writeAgents(filtered)
    res.json({ success: true } as ApiResponse)
  } catch (error) {
    console.error('[Agents API] Failed to delete:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete agent' 
    } as ApiResponse)
  }
})

// POST /api/agents/trigger - 触发 Agent（用于定时调度）
router.post('/trigger', async (req, res) => {
  try {
    const { agentId, triggerId } = req.body
    const agents = await readAgents()
    
    const agent = agents.find(a => a.id === agentId)
    if (!agent) {
      return res.status(404).json({ 
        success: false, 
        error: 'Agent not found' 
      } as ApiResponse)
    }
    
    // 更新触发统计
    if (agent.triggers) {
      const trigger = agent.triggers.find(t => t.id === triggerId)
      if (trigger) {
        trigger.lastTriggered = new Date().toISOString()
        trigger.triggerCount++
      }
    }
    
    // 更新 Agent 运行统计
    agent.totalRuns = (agent.totalRuns || 0) + 1
    agent.lastRunAt = Date.now()
    agent.status = 'running'
    agent.updatedAt = Date.now()
    
    await writeAgents(agents)
    
    res.json({ 
      success: true, 
      data: { agent, triggered: true }
    } as ApiResponse)
  } catch (error) {
    console.error('[Agents API] Failed to trigger:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger agent' 
    } as ApiResponse)
  }
})

export default router
