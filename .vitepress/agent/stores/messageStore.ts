/**
 * Message Store - 消息状态管理
 * 
 * 职责：
 * 1. 管理所有会话的消息数据
 * 2. 提供消息CRUD操作
 * 3. 消息状态跟踪（pending/streaming/completed/error）
 * 4. 乐观更新和撤销
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getChatSession } from '../api'
import type { Message, MessageRole, MessageStatus } from './types'

export type { Message, MessageRole, MessageStatus } from './types'

interface MessageDraft {
  content: string
  timestamp: number
}

export const useMessageStore = defineStore('message', () => {
  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════
  
  // 消息存储：sessionId -> Message[]
  const messagesBySession = ref<Record<string, Message[]>>({})
  
  // 当前正在编辑的消息草稿
  const drafts = ref<Record<string, MessageDraft>>({})
  
  // 乐观更新队列（用于失败时回滚）
  const optimisticQueue = ref<{ messageId: string; previousState: Partial<Message> }[]>([])
  
  // ═══════════════════════════════════════════════════════════════
  // Getters
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 获取指定会话的消息列表
   */
  const getSessionMessages = computed(() => {
    return (sessionId: string): Message[] => {
      return messagesBySession.value[sessionId] || []
    }
  })
  
  /**
   * 获取指定会话的最后一条消息
   */
  const getLastMessage = computed(() => {
    return (sessionId: string): Message | null => {
      const messages = messagesBySession.value[sessionId]
      return messages?.length ? messages[messages.length - 1] : null
    }
  })
  
  /**
   * 获取最后一条AI消息
   */
  const getLastAssistantMessage = computed(() => {
    return (sessionId: string): Message | null => {
      const messages = messagesBySession.value[sessionId] || []
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          return messages[i]
        }
      }
      return null
    }
  })
  
  /**
   * 获取最后一条用户消息
   */
  const getLastUserMessage = computed(() => {
    return (sessionId: string): Message | null => {
      const messages = messagesBySession.value[sessionId] || []
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          return messages[i]
        }
      }
      return null
    }
  })
  
  /**
   * 统计消息数量
   */
  const getMessageCount = computed(() => {
    return (sessionId: string): number => {
      return messagesBySession.value[sessionId]?.length || 0
    }
  })
  
  /**
   * 获取指定消息的上下文（前后N条）
   */
  const getMessageContext = computed(() => {
    return (sessionId: string, messageId: string, contextSize: number = 5): Message[] => {
      const messages = messagesBySession.value[sessionId] || []
      const index = messages.findIndex(m => m.id === messageId)
      if (index === -1) return []
      
      const start = Math.max(0, index - contextSize)
      const end = Math.min(messages.length, index + contextSize + 1)
      return messages.slice(start, end)
    }
  })
  
  // ═══════════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 添加新消息
   */
  async function addMessage(params: {
    sessionId: string
    role: MessageRole
    content: string
    reasoning?: string
    status?: MessageStatus
    attachedArticles?: { path: string; title: string }[]
    metadata?: Message['metadata']
  }): Promise<Message> {
    const now = Date.now()
    const message: Message = {
      id: `msg_${now}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      reasoning: params.reasoning,
      status: params.status || 'completed',
      attachedArticles: params.attachedArticles,
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now
    }
    
    // 初始化会话消息数组
    if (!messagesBySession.value[params.sessionId]) {
      messagesBySession.value[params.sessionId] = []
    }
    
    messagesBySession.value[params.sessionId].push(message)
    
    // 触发持久化（通过插件或监听）
    return message
  }
  
  /**
   * 更新消息
   */
  function updateMessage(
    messageId: string,
    updates: Partial<Omit<Message, 'id' | 'sessionId' | 'createdAt'>>
  ): boolean {
    // 查找消息
    for (const sessionId in messagesBySession.value) {
      const messages = messagesBySession.value[sessionId]
      const index = messages.findIndex(m => m.id === messageId)
      
      if (index !== -1) {
        const message = messages[index]
        
        // 保存乐观更新前的状态
        optimisticQueue.value.push({
          messageId,
          previousState: { ...message }
        })
        
        // 应用更新
        messages[index] = {
          ...message,
          ...updates,
          updatedAt: Date.now()
        }
        
        return true
      }
    }
    
    console.warn(`[MessageStore] 消息不存在: ${messageId}`)
    return false
  }
  
  /**
   * 删除消息
   */
  function deleteMessage(messageId: string): boolean {
    for (const sessionId in messagesBySession.value) {
      const messages = messagesBySession.value[sessionId]
      const index = messages.findIndex(m => m.id === messageId)
      
      if (index !== -1) {
        messages.splice(index, 1)
        return true
      }
    }
    return false
  }
  
  /**
   * 批量删除消息（如清空会话）
   */
  function clearSessionMessages(sessionId: string) {
    delete messagesBySession.value[sessionId]
  }
  
  /**
   * 撤销乐观更新
   */
  function rollbackOptimisticUpdate(messageId: string): boolean {
    const queueIndex = optimisticQueue.value.findIndex(q => q.messageId === messageId)
    if (queueIndex === -1) return false
    
    const { previousState } = optimisticQueue.value[queueIndex]
    
    // 恢复消息状态
    for (const sessionId in messagesBySession.value) {
      const messages = messagesBySession.value[sessionId]
      const index = messages.findIndex(m => m.id === messageId)
      
      if (index !== -1) {
        messages[index] = {
          ...messages[index],
          ...previousState
        }
        
        // 从队列中移除
        optimisticQueue.value.splice(queueIndex, 1)
        return true
      }
    }
    
    return false
  }
  
  /**
   * 保存消息草稿
   */
  function saveDraft(sessionId: string, content: string) {
    drafts.value[sessionId] = {
      content,
      timestamp: Date.now()
    }
  }
  
  /**
   * 获取消息草稿
   */
  function getDraft(sessionId: string): string {
    return drafts.value[sessionId]?.content || ''
  }
  
  /**
   * 清除消息草稿
   */
  function clearDraft(sessionId: string) {
    delete drafts.value[sessionId]
  }
  
  /**
   * 乐观更新：添加消息（立即显示，可能回滚）
   */
  async function addMessageOptimistic(params: {
    sessionId: string
    role: MessageRole
    content: string
    status?: MessageStatus
  }): Promise<string> {
    const message = await addMessage({
      ...params,
      status: params.status || 'pending'
    })
    return message.id
  }
  
  /**
   * 更新流式内容（直接赋值模式）
   * 注意：content 参数应该是完整内容，不是增量
   */
  function updateStreamingContent(messageId: string, content: string): boolean {
    for (const sessionId in messagesBySession.value) {
      const messages = messagesBySession.value[sessionId]
      const index = messages.findIndex(m => m.id === messageId)
      
      if (index !== -1) {
        messages[index].content = content
        messages[index].status = 'streaming'
        messages[index].updatedAt = Date.now()
        return true
      }
    }
    return false
  }
  
  /**
   * 完成消息（流式结束）
   */
  function finalizeMessage(messageId: string): boolean {
    for (const sessionId in messagesBySession.value) {
      const messages = messagesBySession.value[sessionId]
      const index = messages.findIndex(m => m.id === messageId)
      
      if (index !== -1) {
        messages[index].status = 'completed'
        messages[index].updatedAt = Date.now()
        return true
      }
    }
    return false
  }
  
  /**
   * 回滚消息（删除）
   */
  function rollbackMessage(messageId: string): boolean {
    return deleteMessage(messageId)
  }
  
  /**
   * 从后端获取会话消息
   */
  async function fetchSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      const session = await getChatSession(sessionId)
      if (!session?.messages) return []
      
      // 转换 ChatMessage 为 Message
      return session.messages.map((m, index) => ({
        id: `msg_${sessionId}_${index}`,
        sessionId,
        role: m.role,
        content: m.content,
        reasoning: m.reasoning,
        status: 'completed' as MessageStatus,
        attachedArticles: m.attachedArticles,
        createdAt: m.timestamp || Date.now(),
        updatedAt: m.timestamp || Date.now()
      }))
    } catch (err) {
      console.error('[MessageStore] 获取会话消息失败:', err)
      return []
    }
  }
  
  /**
   * 加载会话消息（从后端）
   */
  function loadSessionMessages(sessionId: string, messages?: Message[] | null) {
    // 严格检查 messages 是否为数组
    const safeMessages = Array.isArray(messages) ? messages : []
    messagesBySession.value[sessionId] = safeMessages.map(m => ({
      ...m,
      // 确保所有必要字段存在
      status: m.status || 'completed',
      createdAt: m.createdAt || Date.now(),
      updatedAt: m.updatedAt || Date.now()
    }))
  }
  
  /**
   * 重新生成AI回复（删除当前AI消息并重新发送）
   */
  async function regenerateMessage(messageId: string): Promise<boolean> {
    // 查找消息
    let sessionId: string | null = null
    let userMessageIndex = -1
    
    for (const sid in messagesBySession.value) {
      const messages = messagesBySession.value[sid]
      const index = messages.findIndex(m => m.id === messageId)
      
      if (index !== -1 && messages[index].role === 'assistant') {
        sessionId = sid
        // 找到对应的用户消息（前一条）
        for (let i = index - 1; i >= 0; i--) {
          if (messages[i].role === 'user') {
            userMessageIndex = i
            break
          }
        }
        break
      }
    }
    
    if (!sessionId || userMessageIndex === -1) {
      console.warn(`[MessageStore] 无法重新生成: ${messageId}`)
      return false
    }
    
    // 删除当前AI消息及之后的所有消息
    const messages = messagesBySession.value[sessionId]
    const assistantIndex = messages.findIndex(m => m.id === messageId)
    messages.splice(assistantIndex)
    
    return true
  }
  
  /**
   * 导出会话消息（用于分享或备份）
   */
  function exportMessages(sessionId: string, format: 'json' | 'markdown' = 'json'): string {
    const messages = messagesBySession.value[sessionId] || []
    
    if (format === 'json') {
      return JSON.stringify(messages, null, 2)
    }
    
    // Markdown 格式
    return messages.map(m => {
      const role = m.role === 'user' ? '**用户**' : m.role === 'assistant' ? '**AI**' : '**系统**'
      return `${role}:\n${m.content}\n`
    }).join('\n---\n\n')
  }
  
  return {
    // State
    messagesBySession,
    
    // Getters
    getSessionMessages,
    getLastMessage,
    getLastAssistantMessage,
    getLastUserMessage,
    getMessageCount,
    getMessageContext,
    
    // Actions
    addMessage,
    addMessageOptimistic,
    updateMessage,
    updateStreamingContent,
    finalizeMessage,
    rollbackMessage,
    deleteMessage,
    clearSessionMessages,
    rollbackOptimisticUpdate,
    saveDraft,
    getDraft,
    clearDraft,
    fetchSessionMessages,
    loadSessionMessages,
    regenerateMessage,
    exportMessages
  }
})
