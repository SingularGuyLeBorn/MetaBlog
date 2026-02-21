/**
 * Session Store - 会话管理
 * 
 * 职责：
 * 1. 管理会话列表（CRUD）
 * 2. 当前会话切换
 * 3. 会话元数据管理（标题、时间戳等）
 * 4. 与会话API的交互
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  listChatSessions, 
  saveChatSession, 
  deleteChatSession 
} from '../api'
import type { Session } from './types'

export const useSessionStore = defineStore('session', () => {
  // State
  const sessions = ref<Session[]>([])
  const currentSessionId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const isInitialized = ref(false)
  const searchQuery = ref('')

  // Getters
  const currentSession = computed((): Session | null => {
    if (!currentSessionId.value) return null
    return sessions.value.find((s: any) => s.id === currentSessionId.value) || null
  })

  const sortedSessions = computed((): Session[] => {
    return [...sessions.value].sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return b.updatedAt - a.updatedAt
    })
  })

  const todaySessions = computed((): Session[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sortedSessions.value.filter((s: any) => s.updatedAt >= today.getTime())
  })

  const yesterdaySessions = computed((): Session[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return sortedSessions.value.filter((s: any) => {
      return s.updatedAt >= yesterday.getTime() && s.updatedAt < today.getTime()
    })
  })

  const thisWeekSessions = computed((): Session[] => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sortedSessions.value.filter((s: any) => s.updatedAt >= weekAgo.getTime())
  })

  const olderSessions = computed((): Session[] => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sortedSessions.value.filter((s: any) => s.updatedAt < weekAgo.getTime())
  })

  // Actions
  async function initialize() {
    if (isInitialized.value) return
    isLoading.value = true
    error.value = null

    try {
      const summaries = await listChatSessions()
      sessions.value = summaries.map((s: any) => ({
        id: s.id,
        title: s.title,
        type: 'chat' as const,
        status: 'active' as const,
        config: {},
        stats: {
          messageCount: s.messageCount || 0,
          totalTokens: 0,
          totalCost: 0
        },
        createdAt: new Date(s.createdAt).getTime(),
        updatedAt: new Date(s.updatedAt).getTime()
      }))
      isInitialized.value = true
      restoreLastSession()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      console.error('[SessionStore] 初始化失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createSession(title: string = '新对话'): Promise<Session> {
    const now = Date.now()
    const session: Session = {
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      type: 'chat',
      status: 'active',
      config: {},
      stats: {
        messageCount: 0,
        totalTokens: 0,
        totalCost: 0
      },
      createdAt: now,
      updatedAt: now
    }

    sessions.value.unshift(session)
    currentSessionId.value = session.id

    try {
      await saveChatSession({
        id: session.id,
        title: session.title,
        messages: [],
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      })
      saveLastSession(session.id)
    } catch (err) {
      sessions.value = sessions.value.filter((s: any) => s.id !== session.id)
      throw err
    }

    return session
  }

  async function switchSession(sessionId: string | null) {
    if (sessionId === currentSessionId.value) return
    currentSessionId.value = sessionId
    if (sessionId) {
      saveLastSession(sessionId)
    }
  }

  async function updateSession(sessionId: string, updates: Partial<Session>): Promise<boolean> {
    const session = sessions.value.find((s: any) => s.id === sessionId)
    if (!session) return false

    const oldValues = { ...session }
    Object.assign(session, updates)
    session.updatedAt = Date.now()

    try {
      await saveChatSession({
        id: session.id,
        title: session.title,
        messages: [],
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      })
      return true
    } catch (err) {
      Object.assign(session, oldValues)
      return false
    }
  }

  async function updateSessionTitle(sessionId: string, title: string) {
    const session = sessions.value.find((s: any) => s.id === sessionId)
    if (!session) return false

    const oldTitle = session.title
    session.title = title
    session.updatedAt = Date.now()

    try {
      await saveChatSession({
        id: session.id,
        title: session.title,
        messages: [],
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      })
      return true
    } catch (err) {
      session.title = oldTitle
      return false
    }
  }

  async function deleteSession(sessionId: string): Promise<boolean> {
    const index = sessions.value.findIndex((s: any) => s.id === sessionId)
    if (index === -1) return false

    const deletedSession = sessions.value[index]
    sessions.value.splice(index, 1)

    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value[0]?.id || null
    }

    try {
      await deleteChatSession(sessionId)
      return true
    } catch (err) {
      sessions.value.splice(index, 0, deletedSession)
      if (currentSessionId.value === null) {
        currentSessionId.value = sessionId
      }
      return false
    }
  }

  function togglePin(sessionId: string) {
    const session = sessions.value.find((s: any) => s.id === sessionId)
    if (session) {
      session.isPinned = !session.isPinned
    }
  }

  function updateMessageCount(sessionId: string, count: number) {
    const session = sessions.value.find((s: any) => s.id === sessionId)
    if (session) {
      session.stats.messageCount = count
      session.updatedAt = Date.now()
    }
  }

  async function autoRenameSession(sessionId: string, firstMessageContent: string) {
    const session = sessions.value.find((s: any) => s.id === sessionId)
    if (!session || session.title !== '新对话') return

    const newTitle = firstMessageContent.slice(0, 20) + 
      (firstMessageContent.length > 20 ? '...' : '')
    await updateSessionTitle(sessionId, newTitle)
  }

  function searchSessions(query: string): Session[] {
    const lowerQuery = query.toLowerCase()
    return sessions.value.filter((s: any) => 
      s.title.toLowerCase().includes(lowerQuery)
    )
  }

  // LocalStorage helpers
  const LAST_SESSION_KEY = 'chat:last-session-id'

  function saveLastSession(sessionId: string) {
    localStorage.setItem(LAST_SESSION_KEY, sessionId)
  }

  function restoreLastSession() {
    const lastId = localStorage.getItem(LAST_SESSION_KEY)
    if (lastId && sessions.value.find((s: any) => s.id === lastId)) {
      currentSessionId.value = lastId
    } else if (sessions.value.length > 0) {
      currentSessionId.value = sessions.value[0].id
    }
  }

  return {
    sessions,
    currentSessionId,
    isLoading,
    error,
    isInitialized,
    searchQuery,
    currentSession,
    sortedSessions,
    todaySessions,
    yesterdaySessions,
    thisWeekSessions,
    olderSessions,
    initialize,
    createSession,
    switchSession,
    updateSession,
    updateSessionTitle,
    deleteSession,
    togglePin,
    updateMessageCount,
    autoRenameSession,
    searchSessions
  }
})
