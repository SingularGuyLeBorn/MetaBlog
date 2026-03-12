/**
 * 统一数据存储实现
 */

import type {
  SystemConfig, StoredAgent, StoredSession, StoredMessage,
  StoredMemory, ArticleMetadata, StoredMCPServer, LogEntry,
  StoredTask, StoredSkill
} from './types'
import { generateUUID } from '../utils/uuid'

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
    } catch {}
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

// ==================== 通用JSON存储 ====================
export class JsonStorage<T extends { id: string }> {
  private cache: T[] | null = null
  private cacheTime = 0
  private readonly TTL = 5000

  constructor(private indexPath: string) {}

  async getAll(): Promise<T[]> {
    if (this.cache && Date.now() - this.cacheTime < this.TTL) {
      return this.cache
    }
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(this.indexPath)}`)
      if (res.ok) {
        this.cache = JSON.parse(await res.text())
        this.cacheTime = Date.now()
        return this.cache!
      }
    } catch {}
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
      body: JSON.stringify({
        path: this.indexPath,
        content: JSON.stringify(data, null, 2)
      })
    })
  }

  clearCache(): void {
    this.cache = null
  }
}

// ==================== 各实体存储实例 ====================
export const agentStorage = new JsonStorage<StoredAgent>('.data/agents/index.json')
export const sessionStorage = new JsonStorage<StoredSession>('.data/sessions/index.json')
export const memoryStorage = new JsonStorage<StoredMemory>('.data/memories/index.json')
export const mcpStorage = new JsonStorage<StoredMCPServer>('.data/mcp/index.json')
export const taskStorage = new JsonStorage<StoredTask>('.data/tasks/index.json')
export const skillStorage = new JsonStorage<StoredSkill>('.data/skills/index.json')
export const articleStorage = new JsonStorage<ArticleMetadata>('.data/articles/index.json')

// ==================== 消息存储（按会话分组）====================
export class MessageStorage {
  async getBySession(sessionId: string): Promise<StoredMessage[]> {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(`.data/messages/${sessionId}/index.json`)}`)
      if (res.ok) return JSON.parse(await res.text())
    } catch {}
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

  async deleteBySession(sessionId: string): Promise<void> {
    await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `.data/messages/${sessionId}` })
    })
  }
}

export const messageStorage = new MessageStorage()

// ==================== 日志存储（按日期分组）====================
export class LogStorage {
  private buffer: LogEntry[] = []
  private flushTimer: number | null = null

  async getToday(): Promise<LogEntry[]> {
    const date = new Date().toISOString().split('T')[0]
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(`.data/logs/${date}.json`)}`)
      if (res.ok) return JSON.parse(await res.text())
    } catch {}
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
      body: JSON.stringify({
        path: `.data/logs/${date}.json`,
        content: JSON.stringify(combined, null, 2)
      })
    })
  }
}

export const logStorage = new LogStorage()
