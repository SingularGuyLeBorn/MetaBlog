/**
 * Storage Service - 本地存储
 */
import type { ChatSession, ChatMessage } from '../composables/types'

const STORAGE_KEY = 'ai-chat:v1'

interface StorageData {
  sessions: ChatSession[]
  messages: Record<string, ChatMessage[]>
  lastSessionId: string | null
  version: number
}

function isClient(): boolean {
  return typeof window !== 'undefined'
}

export const storage = {
  save(data: StorageData): boolean {
    if (!isClient()) return false
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      return true
    } catch {
      return false
    }
  },

  load(): StorageData {
    if (!isClient()) {
      return { sessions: [], messages: {}, lastSessionId: null, version: 1 }
    }
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        return JSON.parse(data)
      }
    } catch {
      // ignore
    }
    return { sessions: [], messages: {}, lastSessionId: null, version: 1 }
  },

  saveSession(session: ChatSession): boolean {
    const data = this.load()
    const index = data.sessions.findIndex(s => s.id === session.id)
    if (index >= 0) {
      data.sessions[index] = session
    } else {
      data.sessions.unshift(session)
    }
    return this.save(data)
  },

  deleteSession(sessionId: string): boolean {
    const data = this.load()
    data.sessions = data.sessions.filter(s => s.id !== sessionId)
    delete data.messages[sessionId]
    if (data.lastSessionId === sessionId) {
      data.lastSessionId = data.sessions[0]?.id || null
    }
    return this.save(data)
  },

  saveMessages(sessionId: string, msgs: ChatMessage[]): boolean {
    const data = this.load()
    data.messages[sessionId] = msgs
    return this.save(data)
  },

  saveLastSession(sessionId: string | null): boolean {
    const data = this.load()
    data.lastSessionId = sessionId
    return this.save(data)
  }
}
