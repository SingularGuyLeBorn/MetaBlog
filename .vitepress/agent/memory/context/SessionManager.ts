/**
 * SessionManager.ts - 会话上下文管理
 * 负责聊天会话的创建、保存、上下文维护
 */
import type { SessionMemory, ChatMessage } from '../../core/types'
import { 
  getAllSessions, 
  getSession as getSessionApi, 
  saveSession as saveSessionApi 
} from '../../api/memory'

// 内存缓存
const sessionCache = new Map<string, SessionMemory>()

/**
 * 会话消息（扩展 ChatMessage，metadata 可包含任意字段）
 */
interface SessionMessage extends ChatMessage {
  metadata?: Record<string, any>
}

/**
 * 会话上下文选项
 */
export interface ContextOptions {
  maxMessages?: number
  contextWindow?: number
  preserveSystemPrompt?: boolean
}

/**
 * 会话管理器
 */
export class SessionManager {
  private options: ContextOptions

  constructor(options: ContextOptions = {}) {
    this.options = {
      maxMessages: 100,
      contextWindow: 10,
      preserveSystemPrompt: true,
      ...options
    }
  }

  /**
   * 从服务器加载会话
   */
  async loadFromServer(): Promise<void> {
    try {
      const sessions = await getAllSessions()
      for (const s of sessions) {
        sessionCache.set(s.id, s)
      }
      console.log(`[SessionManager] Loaded ${sessions.length} sessions`)
    } catch (e) {
      console.warn('[SessionManager] Failed to load from server:', e)
    }
  }

  /**
   * 创建新会话
   */
  async create(metadata?: Record<string, any>): Promise<SessionMemory> {
    const session: SessionMemory = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      messages: [],
      context: metadata || {},
      createdAt: Date.now(),
      lastActive: Date.now()
    }
    sessionCache.set(session.id, session)
    await saveSessionApi(session)
    return session
  }

  /**
   * 获取会话
   */
  async get(sessionId: string): Promise<SessionMemory | null> {
    const cached = sessionCache.get(sessionId)
    if (cached) {
      cached.lastActive = Date.now()
      return cached
    }

    try {
      const session = await getSessionApi(sessionId)
      if (session) {
        session.lastActive = Date.now()
        sessionCache.set(sessionId, session)
        return session
      }
    } catch (e) {
      console.error('[SessionManager] Failed to get session:', e)
    }
    return null
  }

  /**
   * 保存会话
   */
  async save(session: SessionMemory): Promise<void> {
    session.lastActive = Date.now()
    sessionCache.set(session.id, session)
    await saveSessionApi(session)
  }

  /**
   * 添加消息到会话
   * @todo 将在多轮对话功能中启用
   */
  async addMessage(
    sessionId: string, 
    role: 'system' | 'user' | 'assistant', 
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) return

    const message: SessionMessage = {
      id: `msg_${Date.now()}`,
      role,
      content,
      timestamp: Date.now(),
      ...metadata
    }

    session.messages.push(message)

    // 裁剪消息数量
    if (session.messages.length > this.options.maxMessages!) {
      if (this.options.preserveSystemPrompt && session.messages[0]?.role === 'system') {
        session.messages.splice(1, session.messages.length - this.options.maxMessages!)
      } else {
        session.messages = session.messages.slice(-this.options.maxMessages!)
      }
    }

    await this.save(session)
  }

  /**
   * 获取最近的消息（用于上下文窗口）
   * @todo 将在上下文记忆功能中启用
   */
  async getRecentMessages(sessionId: string, count?: number): Promise<ChatMessage[]> {
    const session = await this.get(sessionId)
    if (!session) return []

    const limit = count || this.options.contextWindow!
    const messages = session.messages

    if (this.options.preserveSystemPrompt && messages[0]?.role === 'system') {
      return [messages[0], ...messages.slice(-limit)]
    }
    return messages.slice(-limit)
  }

  /**
   * 获取完整对话历史
   * @todo 将在对话导出功能中启用
   */
  async getFullHistory(sessionId: string): Promise<ChatMessage[]> {
    const session = await this.get(sessionId)
    return session?.messages || []
  }

  /**
   * 更新会话上下文
   * @todo 将在上下文编辑功能中启用
   */
  async updateContext(sessionId: string, context: Record<string, any>): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) return

    session.context = { ...session.context, ...context }
    await this.save(session)
  }

  /**
   * 列出所有会话（按最后活动时间倒序）
   */
  async list(): Promise<SessionMemory[]> {
    return Array.from(sessionCache.values())
      .sort((a, b) => b.lastActive - a.lastActive)
  }

  /**
   * 删除会话
   */
  async delete(sessionId: string): Promise<void> {
    sessionCache.delete(sessionId)
  }

  /**
   * 清空会话消息
   * @todo 将在清空对话功能中启用
   */
  async clearMessages(sessionId: string, keepSystemPrompt: boolean = true): Promise<void> {
    const session = await this.get(sessionId)
    if (!session) return

    if (keepSystemPrompt && session.messages[0]?.role === 'system') {
      session.messages = [session.messages[0]]
    } else {
      session.messages = []
    }
    await this.save(session)
  }
}

// 导出单例
let instance: SessionManager | null = null
export function getSessionManager(options?: ContextOptions): SessionManager {
  if (!instance) {
    instance = new SessionManager(options)
  }
  return instance
}

// 类型导出（ContextOptions 已在上面导出）
