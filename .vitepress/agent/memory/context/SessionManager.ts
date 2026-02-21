/**
 * SessionManager.ts - 会话上下文管�?
 * 
 * 负责会话的创建、存储、查�?
 * **已文件化**: 会话数据持久化到文件系统
 */
import type { SessionMemory, ChatMessage } from '../../core/types'
import { createStorage } from '../FileStorage'

export interface ContextOptions {
  currentFile?: string
  selectedText?: string
  wikiLinks?: string[]
}

// 存储结构
interface SessionStorage {
  sessions: Record<string, SessionMemory>
  activeSessionId: string | null
  version: number
  lastUpdated: string
}

// 创建文件存储实例
const storage = createStorage<SessionStorage>({
  name: 'sessions',
  defaultData: {
    sessions: {},
    activeSessionId: null,
    version: 1,
    lastUpdated: new Date().toISOString()
  }
})

/**
 * 会话管理�?
 */
export class SessionManager {
  private cacheLoaded: boolean = false
  private maxSessions: number = 50 // 最大保留会话数

  /**
   * 初始化：从文件加载数�?
   */
  async initialize(): Promise<void> {
    if (this.cacheLoaded) return
    
    await storage.load()
    this.cacheLoaded = true
    
    const data = storage.getData()
    const sessionCount = Object.keys(data.sessions).length
    console.log(`[SessionManager] 初始化完成，加载 ${sessionCount} 个会话`)
  }

  /**
   * 从服务器加载（兼容旧接口�?
   */
  async loadFromServer(): Promise<void> {
    return this.initialize()
  }

  /**
   * 保存到文�?
   */
  private async persist(): Promise<void> {
    storage.updateData(data => {
      data.lastUpdated = new Date().toISOString()
      
      // 限制会话数量
      const sessionIds = Object.keys(data.sessions)
      if (sessionIds.length > this.maxSessions) {
        // 按最后活跃时间排序，保留最新的
        const sorted = sessionIds
          .map(id => data.sessions[id])
          .sort((a, b) => b.lastActive - a.lastActive)
          .slice(0, this.maxSessions)
        
        data.sessions = {}
        for (const session of sorted) {
          data.sessions[session.id] = session
        }
      }
    })
    await storage.save()
  }

  /**
   * 获取会话
   */
  async get(sessionId: string): Promise<SessionMemory | null> {
    await this.initialize()
    const data = storage.getData()
    return data.sessions[sessionId] || null
  }

  /**
   * 保存会话
   */
  async save(session: SessionMemory): Promise<void> {
    await this.initialize()
    
    session.lastActive = Date.now()
    storage.updateData(data => {
      data.sessions[session.id] = session
      data.activeSessionId = session.id
    })
    
    await this.persist()
  }

  /**
   * 创建新会�?
   */
  async create(context?: ContextOptions): Promise<SessionMemory> {
    await this.initialize()
    
    const session: SessionMemory = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messages: [],
      context: {
        currentFile: context?.currentFile,
        selectedText: context?.selectedText,
        wikiLinks: context?.wikiLinks
      },
      createdAt: Date.now(),
      lastActive: Date.now()
    }
    
    await this.save(session)
    console.log(`[SessionManager] 创建会话: ${session.id}`)
    return session
  }

  /**
   * 获取活跃会话
   */
  async getActiveSession(): Promise<SessionMemory | null> {
    await this.initialize()
    const data = storage.getData()
    
    if (data.activeSessionId) {
      return this.get(data.activeSessionId)
    }
    return null
  }

  /**
   * 设置活跃会话
   */
  async setActiveSession(sessionId: string): Promise<void> {
    await this.initialize()
    
    storage.updateData(data => {
      data.activeSessionId = sessionId
    })
    
    await this.persist()
  }

  /**
   * 添加消息到会�?
   */
  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    
    session.messages.push(message)
    session.lastActive = Date.now()
    
    await this.save(session)
  }

  /**
   * 清空会话消息
   */
  async clearMessages(sessionId: string): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    
    session.messages = []
    session.lastActive = Date.now()
    
    await this.save(session)
  }

  /**
   * 更新会话上下�?
   */
  async updateContext(sessionId: string, context: Partial<ContextOptions>): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    
    session.context = { ...session.context, ...context }
    session.lastActive = Date.now()
    
    await this.save(session)
  }

  /**
   * 删除会话
   */
  async delete(sessionId: string): Promise<void> {
    await this.initialize()
    
    storage.updateData(data => {
      delete data.sessions[sessionId]
      
      // 如果删除的是活跃会话，清空活跃会�?
      if (data.activeSessionId === sessionId) {
        data.activeSessionId = null
      }
    })
    
    await this.persist()
    console.log(`[SessionManager] 删除会话: ${sessionId}`)
  }

  /**
   * 列出所有会�?
   */
  async list(): Promise<SessionMemory[]> {
    await this.initialize()
    const data = storage.getData()
    
    return Object.values(data.sessions)
      .sort((a, b) => b.lastActive - a.lastActive)
  }

  /**
   * 清理过期会话（超�?7 天未活跃�?
   */
  async cleanupExpired(): Promise<number> {
    await this.initialize()
    const data = storage.getData()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    
    let count = 0
    const sessionsToDelete: string[] = []
    
    for (const [id, session] of Object.entries(data.sessions)) {
      if (session.lastActive < sevenDaysAgo) {
        sessionsToDelete.push(id)
        count++
      }
    }
    
    for (const id of sessionsToDelete) {
      delete data.sessions[id]
    }
    
    if (count > 0) {
      await this.persist()
      console.log(`[SessionManager] 清理 ${count} 个过期会话`)
    }
    
    return count
  }

  /**
   * 清空所有会�?
   */
  async clear(): Promise<void> {
    await storage.clear()
    console.log('[SessionManager] 清空所有会话')
  }
}

// 单例实例
let instance: SessionManager | null = null

export function getSessionManager(): SessionManager {
  if (!instance) {
    instance = new SessionManager()
  }
  return instance
}

export default SessionManager
