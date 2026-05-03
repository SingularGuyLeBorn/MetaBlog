/**
 * ============================================================================
 * Pinia Store - dataStore
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/stores
 */


// ==================== 类型 ====================
export interface SystemConfig {
  version: string
  app: { name: string; description: string; debug: boolean }
  features: {
    agentOrchestrator: { enabled: boolean; autoStart: boolean; managerDecisionInterval: number; maxWorkers: number; enableSelfEvolution: boolean }
    websocket: { enabled: boolean; port: number; heartbeatInterval: number }
    mcp: { enabled: boolean; autoReconnect: boolean; maxRetries: number }
    memory: { enabled: boolean; maxMemories: number; autoCleanup: boolean }
    skills: { autoLoad: boolean; hotReload: boolean; allowCustomSkills: boolean }
  }
  storage: { format: string; prettyPrint: boolean; autoBackup: boolean; backupInterval: number; maxBackups: number }
  ui: { theme: 'light' | 'dark' | 'auto'; compact: boolean; animations: 'none' | 'minimal' | 'full' }
  llm: { defaultProvider: string; maxConcurrentRequests: number; requestTimeout: number; retryAttempts: number }
  limits: { maxAgents: number; maxSessions: number; maxMessagesPerSession: number; maxFileSize: number; maxLogEntries: number }
}

/**
 * StoredAgent 接口定义
 *
 */
export interface StoredAgent {
  id: string
  name: string
  avatar: string
  description: string
  tier: 'system' | 'manager' | 'worker'
  mode: 'passive' | 'scheduled' | 'hybrid' | 'always_on'
  runtimeStatus: string
  capabilities: any
  memory: any
  stats: { totalTasks: number; successfulTasks: number; failedTasks: number; totalExecutionTime: number }
  createdAt: number
  updatedAt: number
  createdBy: string
}

/**
 * StoredSession 接口定义
 *
 */
export interface StoredSession {
  id: string
  title: string
  agentId: string
  agentName: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

/**
 * StoredMessage 接口定义
 *
 */
export interface StoredMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  tokens?: number
}

/**
 * StoredMemory 接口定义
 *
 */
export interface StoredMemory {
  id: string
  content: string
  category: string
  importance: number
  createdAt: number
  updatedAt: number
  enabled: boolean
}

/**
 * ArticleMetadata 接口定义
 *
 */
export interface ArticleMetadata {
  id: string
  path: string
  title: string
  createdAt: number
  updatedAt: number
  wordCount: number
  readingTime: number
  section: string
  tags: string[]
  category?: string
  readCount: number
  likeCount: number
  source: 'manual' | 'agent-generated' | 'imported'
  sessionId?: string
  agentId?: string
  aiSummary?: string
  embedding?: number[]
  keywords?: string[]
}

/**
 * StoredMCPServer 接口定义
 *
 */
export interface StoredMCPServer {
  id: string
  name: string
  type: string
  config: any
  enabled: boolean
  lastConnectedAt?: number
}

/**
 * LogEntry 接口定义
 *
 */
export interface LogEntry {
  id: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  component: string
  event: string
  message: string
  metadata?: any
}

/**
 * StoredTask 接口定义
 *
 */
export interface StoredTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  type: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  result?: any
  error?: string
}

/**
 * StoredSkill 接口定义
 *
 */
export interface StoredSkill {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  prompts: any[]
  tools: string[]
  createdAt: number
  updatedAt: number
}

// ==================== 配置管理 ====================
class ConfigManager {
  private config: SystemConfig | null = null
  private readonly path = '.data/config/system.json'

  async load(): Promise<SystemConfig> {
    if (this.config) return this.config
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(this.path)}`)
      if (res.ok) {
        this.config = JSON.parse(await res.text())
        return this.config!
      }
    } catch { }
    return this.getDefault()
  }

  async save(cfg: Partial<SystemConfig>): Promise<void> {
    const current = await this.load()
    this.config = { ...current, ...cfg }
    await this.writeFile(this.path, JSON.stringify(this.config, null, 2))
  }

  get(): SystemConfig {
    return this.config || this.getDefault()
  }

  private getDefault(): SystemConfig {
    return {
      version: '2.0.0',
      app: { name: 'MetaBlog', description: 'AI驱动的智能博客系统', debug: false },
      features: {
        agentOrchestrator: { enabled: true, autoStart: true, managerDecisionInterval: 60000, maxWorkers: 10, enableSelfEvolution: true },
        websocket: { enabled: true, port: 5173, heartbeatInterval: 30000 },
        mcp: { enabled: true, autoReconnect: true, maxRetries: 3 },
        memory: { enabled: true, maxMemories: 1000, autoCleanup: true },
        skills: { autoLoad: true, hotReload: true, allowCustomSkills: true }
      },
      storage: { format: 'json', prettyPrint: true, autoBackup: true, backupInterval: 86400000, maxBackups: 7 },
      ui: { theme: 'light', compact: true, animations: 'minimal' },
      llm: { defaultProvider: 'deepseek', maxConcurrentRequests: 3, requestTimeout: 60000, retryAttempts: 2 },
      limits: { maxAgents: 20, maxSessions: 100, maxMessagesPerSession: 500, maxFileSize: 10485760, maxLogEntries: 10000 }
    }
  }

  private async writeFile(path: string, content: string): Promise<void> {
    await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    })
  }
}

export const configManager = new ConfigManager()

// ==================== 通用存储 ====================
/**
 * JsonStorage 类
 *
 */
export class JsonStorage<T extends { id: string }> {
  private cache: T[] | null = null
  private cacheTime = 0
  private readonly TTL = 5000

  constructor(private indexPath: string) { }

  async getAll(): Promise<T[]> {
    if (this.cache && Date.now() - this.cacheTime < this.TTL) return this.cache
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(this.indexPath)}`)
      if (res.ok) {
        this.cache = JSON.parse(await res.text())
        this.cacheTime = Date.now()
        return this.cache!
      }
    } catch { }
    return []
  }

  async getById(id: string): Promise<T | null> {
    const all = await this.getAll()
    return all.find(x => x.id === id) || null
  }

  async save(data: T): Promise<void> {
    const all = await this.getAll()
    const idx = all.findIndex(x => x.id === data.id)
    if (idx >= 0) all[idx] = data
    else all.push(data)
    await this.write(all)
  }

  async delete(id: string): Promise<void> {
    const all = await this.getAll()
    const filtered = all.filter(x => x.id !== id)
    await this.write(filtered)
  }

  private async write(data: T[]): Promise<void> {
    this.cache = data
    this.cacheTime = Date.now()
    await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: this.indexPath, content: JSON.stringify(data, null, 2) })
    })
  }

  clearCache(): void {
    this.cache = null
  }
}

// ==================== 存储实例 ====================
export const agentStorage = new JsonStorage<StoredAgent>('.data/agents/index.json')
export const sessionStorage = new JsonStorage<StoredSession>('.data/sessions/index.json')
export const memoryStorage = new JsonStorage<StoredMemory>('.data/memories/index.json')
export const mcpStorage = new JsonStorage<StoredMCPServer>('.data/mcp/index.json')
export const taskStorage = new JsonStorage<StoredTask>('.data/tasks/index.json')
export const skillStorage = new JsonStorage<StoredSkill>('.data/skills/index.json')
export const articleStorage = new JsonStorage<ArticleMetadata>('.data/articles/index.json')

// ==================== 消息存储 ====================
/**
 * MessageStorage 类
 *
 */
export class MessageStorage {
  async getBySession(sessionId: string): Promise<StoredMessage[]> {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(`.data/messages/${sessionId}/index.json`)}`)
      if (res.ok) return JSON.parse(await res.text())
    } catch { }
    return []
  }

  async save(msg: StoredMessage): Promise<void> {
    const msgs = await this.getBySession(msg.sessionId)
    msgs.push(msg)
    await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `.data/messages/${msg.sessionId}/index.json`,
        content: JSON.stringify(msgs, null, 2)
      })
    })
  }
}

export const messageStorage = new MessageStorage()

// ==================== 日志存储 ====================
/**
 * LogStorage 类
 *
 */
export class LogStorage {
  private buffer: LogEntry[] = []
  private flushTimer: number | null = null

  async getToday(): Promise<LogEntry[]> {
    const date = new Date().toISOString().split('T')[0]
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(`.data/logs/${date}.json`)}`)
      if (res.ok) return JSON.parse(await res.text())
    } catch { }
    return []
  }

  append(entry: LogEntry): void {
    this.buffer.push(entry)
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = window.setTimeout(() => this.flush(), 1000)
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    const date = new Date().toISOString().split('T')[0]
    const existing = await this.getToday()
    const combined = [...existing, ...this.buffer]
    const cfg = configManager.get()
    if (combined.length > cfg.limits.maxLogEntries) {
      combined.splice(0, combined.length - cfg.limits.maxLogEntries)
    }
    this.buffer = []
    await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `.data/logs/${date}.json`, content: JSON.stringify(combined, null, 2) })
    })
  }
}

export const logStorage = new LogStorage()

// ==================== 迁移脚本 ====================
interface OldAgent {
  id: string
  name: string
  avatar: string
  description: string
  level: string
  status: string
  capabilities: any
  memory: any
  permissions: any[]
  callCount: number
  isDefault: boolean
  createdAt: number
  updatedAt: number
  runtime?: any
}

interface OldSession {
  id: string
  title: string
  config: any
  stats: { messageCount: number; totalTokens: number }
  createdAt: number
  updatedAt: number
}

interface OldMemory {
  id: string
  content: string
  category: string
  createdAt: number
  updatedAt: number
  enabled: boolean
  importance: number
  source: string
}

/**
 * migrateData 函数
 *
 * @returns 返回值(Promise<{ success: boolean; report: string[] }>)
 */
export async function migrateData(): Promise<{ success: boolean; report: string[] }> {
  const report: string[] = []
  report.push('=== 数据迁移开始 ===')

  try {
    const agentsMigrated = await migrateAgents()
    report.push(`✓ Agents: ${agentsMigrated} 个已迁移`)
  } catch (e: any) {
    report.push(`✗ Agents迁移失败: ${e.message}`)
  }

  try {
    const sessionsMigrated = await migrateSessions()
    report.push(`✓ Sessions: ${sessionsMigrated} 个已迁移`)
  } catch (e: any) {
    report.push(`✗ Sessions迁移失败: ${e.message}`)
  }

  try {
    const memoriesMigrated = await migrateMemories()
    report.push(`✓ Memories: ${memoriesMigrated} 个已迁移`)
  } catch (e: any) {
    report.push(`✗ Memories迁移失败: ${e.message}`)
  }

  try {
    const messagesMigrated = await migrateMessages()
    report.push(`✓ Messages: ${messagesMigrated} 条已迁移`)
  } catch (e: any) {
    report.push(`✗ Messages迁移失败: ${e.message}`)
  }

  try {
    await configManager.load()
    report.push('✓ 配置已初始化')
  } catch (e: any) {
    report.push(`✗ 配置初始化失败: ${e.message}`)
  }

  report.push('=== 数据迁移完成 ===')
  return { success: true, report }
}

async function migrateAgents(): Promise<number> {
  const res = await fetch('/api/files/read?path=.data/agents.json')
  if (!res.ok) return 0

  const oldAgents: OldAgent[] = JSON.parse(await res.text())
  let count = 0

  for (const old of oldAgents) {
    const agent: StoredAgent = {
      id: old.id,
      name: old.name,
      avatar: old.avatar,
      description: old.description,
      tier: mapTier(old.level),
      mode: 'passive',
      runtimeStatus: old.status === 'online' ? 'idle' : 'paused',
      capabilities: old.capabilities,
      memory: old.memory,
      stats: {
        totalTasks: old.callCount || 0,
        successfulTasks: 0,
        failedTasks: 0,
        totalExecutionTime: 0
      },
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      createdBy: 'user'
    }
    await agentStorage.save(agent)
    count++
  }
  return count
}

async function migrateSessions(): Promise<number> {
  const res = await fetch('/api/files/read?path=.data/sessions.json')
  if (!res.ok) return 0

  const oldSessions: OldSession[] = JSON.parse(await res.text())
  let count = 0

  for (const old of oldSessions) {
    const session: StoredSession = {
      id: old.id,
      title: old.title,
      agentId: old.config?.agentId || '',
      agentName: old.config?.agentName || '',
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      messageCount: old.stats?.messageCount || 0
    }
    await sessionStorage.save(session)
    count++
  }
  return count
}

async function migrateMemories(): Promise<number> {
  const res = await fetch('/api/files/read?path=.data/memories.json')
  if (!res.ok) return 0

  const oldMemories: OldMemory[] = JSON.parse(await res.text())
  let count = 0

  for (const old of oldMemories) {
    const memory: StoredMemory = {
      id: old.id,
      content: old.content,
      category: old.category,
      importance: old.importance,
      createdAt: old.createdAt,
      updatedAt: old.updatedAt,
      enabled: old.enabled
    }
    await memoryStorage.save(memory)
    count++
  }
  return count
}

async function migrateMessages(): Promise<number> {
  const res = await fetch('/api/files/read?path=.data/session-messages.json')
  if (!res.ok) return 0

  const oldData = JSON.parse(await res.text())
  let count = 0

  for (const [sessionId, messages] of Object.entries(oldData)) {
    const msgs = messages as any[]
    for (const old of msgs) {
      const msg: StoredMessage = {
        id: old.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        role: old.role,
        content: old.content,
        timestamp: old.timestamp,
        tokens: old.tokens
      }
      await messageStorage.save(msg)
      count++
    }
  }
  return count
}

function mapTier(level: string): 'system' | 'manager' | 'worker' {
  if (level === 'meta' || level === 'core') return 'system'
  if (level === 'manager') return 'manager'
  return 'worker'
}
