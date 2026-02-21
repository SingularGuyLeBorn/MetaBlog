/**
 * useAIChat - AI Chat 核心 Composable (正确版)
 * 
 * 关键修复：不用 computed 包装 messages，直接暴露 ref
 * Vue 3 会自动追踪 ref 内部属性的变化
 */
import { ref, computed } from 'vue'
import type { ChatSession, ChatMessage, SessionConfig } from './types'
import { storage } from '../services/storage'
import { aiService } from '../services/aiService'

const DEFAULT_CONFIG: SessionConfig = {
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '',
  enableReasoning: false,
  streaming: true
}

const sessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)
// 直接暴露 messages ref，不用 computed 包装
const messages = ref<Record<string, ChatMessage[]>>({})
const isStreaming = ref(false)
const isInitialized = ref(false)

export function useAIChat() {
  if (!isInitialized.value) {
    const data = storage.load()
    sessions.value = data.sessions
    messages.value = data.messages
    currentSessionId.value = data.lastSessionId
    
    if (sessions.value.length === 0) {
      createSession('新对话')
    }
    isInitialized.value = true
  }

  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || null
  })

  function createSession(title: string = '新对话') {
    const now = Date.now()
    const session: ChatSession = {
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      config: { ...DEFAULT_CONFIG },
      stats: { messageCount: 0, totalTokens: 0 },
      createdAt: now,
      updatedAt: now
    }
    
    sessions.value.unshift(session)
    currentSessionId.value = session.id
    messages.value[session.id] = []
    
    storage.save({
      sessions: sessions.value,
      messages: messages.value,
      lastSessionId: currentSessionId.value,
      version: 1
    })
    
    return session
  }

  function switchSession(id: string) {
    currentSessionId.value = id
    storage.saveLastSession(id)
  }

  function renameSession(id: string, newTitle: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = newTitle
      session.updatedAt = Date.now()
      storage.saveSession(session)
    }
  }

  function deleteSession(id: string) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index === -1) return
    
    sessions.value.splice(index, 1)
    delete messages.value[id]
    
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id || null
    }
    
    storage.deleteSession(id)
    
    if (sessions.value.length === 0) {
      createSession('新对话')
    }
  }

  function autoRenameSession(sessionId: string, firstMessage: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.title !== '新对话') return
    
    let title = firstMessage.trim().slice(0, 20)
    if (firstMessage.length > 20) title += '...'
    if (!title) title = '新对话'
    
    session.title = title
    session.updatedAt = Date.now()
    storage.saveSession(session)
  }

  async function sendMessage(content: string): Promise<boolean> {
    if (!currentSession.value || !content.trim()) return false
    
    const sessionId = currentSessionId.value!
    const config = currentSession.value.config
    
    const sessionMsgs = messages.value[sessionId] || []
    if (sessionMsgs.length === 0) {
      autoRenameSession(sessionId, content.trim())
    }
    
    // 用户消息
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role: 'user',
      content: content.trim(),
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    if (!messages.value[sessionId]) {
      messages.value[sessionId] = []
    }
    messages.value[sessionId].push(userMsg)
    
    // AI 消息
    const aiMsg: ChatMessage = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    messages.value[sessionId].push(aiMsg)
    
    isStreaming.value = true
    const aiMsgIndex = messages.value[sessionId].length - 1
    
    try {
      const history = messages.value[sessionId].slice(0, -1)
      
      await aiService.chatStream(
        history,
        config,
        {
          onContent: (text) => {
            // 直接修改对象属性，Vue 3 Proxy 会自动追踪
            const targetMsg = messages.value[sessionId][aiMsgIndex]
            targetMsg.content = text
            targetMsg.updatedAt = Date.now()
          },
          onReasoning: (text) => {
            const targetMsg = messages.value[sessionId][aiMsgIndex]
            targetMsg.reasoning = { content: text, isVisible: true }
            targetMsg.updatedAt = Date.now()
          },
          onComplete: () => {
            const targetMsg = messages.value[sessionId][aiMsgIndex]
            targetMsg.status = 'completed'
            targetMsg.updatedAt = Date.now()
            isStreaming.value = false
            storage.saveMessages(sessionId, messages.value[sessionId])
          },
          onError: (err) => {
            const targetMsg = messages.value[sessionId][aiMsgIndex]
            targetMsg.status = 'error'
            targetMsg.content = `错误：${err.message}`
            targetMsg.updatedAt = Date.now()
            isStreaming.value = false
            storage.saveMessages(sessionId, messages.value[sessionId])
          }
        }
      )
      
      return true
    } catch (err) {
      isStreaming.value = false
      return false
    }
  }

  function interruptGeneration() {
    isStreaming.value = false
  }

  function clearMessages() {
    if (!currentSessionId.value) return
    messages.value[currentSessionId.value] = []
    storage.saveMessages(currentSessionId.value, [])
  }

  function updateSessionConfig(id: string, config: Partial<SessionConfig>) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.config = { ...session.config, ...config }
      session.updatedAt = Date.now()
      storage.saveSession(session)
    }
  }

  async function regenerateLastMessage(): Promise<boolean> {
    if (!currentSessionId.value || isStreaming.value) return false
    
    const sessionId = currentSessionId.value
    const msgs = messages.value[sessionId]
    if (!msgs || msgs.length < 1) return false
    
    // 找到最后一条用户消息
    let lastUserIndex = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i
        break
      }
    }
    
    if (lastUserIndex === -1) return false
    
    // 删除这条用户消息之后的所有AI回复
    msgs.splice(lastUserIndex + 1)
    
    const config = currentSession.value?.config || DEFAULT_CONFIG
    
    // 添加新的AI消息占位（不添加用户消息！）
    const aiMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    msgs.push(aiMsg)
    
    isStreaming.value = true
    const aiMsgIndex = msgs.length - 1
    
    try {
      // 历史记录包含到用户消息为止
      const history = msgs.slice(0, -1)
      
      await aiService.chatStream(
        history,
        config,
        {
          onContent: (text) => {
            const targetMsg = msgs[aiMsgIndex]
            targetMsg.content = text
            targetMsg.updatedAt = Date.now()
          },
          onReasoning: (text) => {
            const targetMsg = msgs[aiMsgIndex]
            targetMsg.reasoning = { content: text, isVisible: true }
            targetMsg.updatedAt = Date.now()
          },
          onComplete: () => {
            const targetMsg = msgs[aiMsgIndex]
            targetMsg.status = 'completed'
            targetMsg.updatedAt = Date.now()
            isStreaming.value = false
            storage.saveMessages(sessionId, msgs)
          },
          onError: (err) => {
            const targetMsg = msgs[aiMsgIndex]
            targetMsg.status = 'error'
            targetMsg.content = `错误：${err.message}`
            targetMsg.updatedAt = Date.now()
            isStreaming.value = false
            storage.saveMessages(sessionId, msgs)
          }
        }
      )
      
      return true
    } catch (err) {
      isStreaming.value = false
      return false
    }
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    // 关键：直接暴露 messages ref，不提供 computed 包装
    messages,
    isStreaming,
    defaultConfig: DEFAULT_CONFIG,
    createSession,
    switchSession,
    renameSession,
    deleteSession,
    sendMessage,
    interruptGeneration,
    clearMessages,
    regenerateLastMessage,
    updateSessionConfig
  }
}
