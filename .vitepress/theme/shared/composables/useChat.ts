/**
 * useChat - Chat 功能组合式函数
 * 
 * 提供简化的 Chat 功能访问，适用于只需要基本功能的组件
 * 
 * 使用示例：
 * ```typescript
 * const { 
 *   messages, 
 *   isLoading, 
 *   sendMessage, 
 *   interrupt 
 * } = useChat()
 * ```
 */
import { computed, watch, nextTick, ref } from 'vue'
import { useAIChat } from '../../features/chat/stores/chatStore'
import type { ChatSession, ChatMessage, MessageGroup } from '../../features/chat/types'

export interface UseChatOptions {
  /** 自动滚动到底部 */
  autoScroll?: boolean
  /** 消息更新回调 */
  onMessageUpdate?: () => void
  /** 状态变化回调 */
  onStateChange?: (state: string) => void
}

export function useChat(options: UseChatOptions = {}) {
  const aiChat = useAIChat()
  const { 
    currentSession,
    currentSessionId,
    sessions,
    messageGroups,
    isStreaming,
    createSession,
    switchSession,
    deleteSession,
    deleteVersion,
    sendMessage: aiSendMessage,
    regenerateResponse
  } = aiChat
  
  const interrupt = (aiChat as any).interrupt || (() => {})
  
  const { 
    autoScroll = true,
    onMessageUpdate,
    onStateChange 
  } = options
  
  // ═══════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════
  
  const messages = computed(() => {
    if (!currentSessionId.value) return []
    const groups = (messageGroups.value as Record<string, any>)[currentSessionId.value] || []
    // Flatten message groups to messages
    const result: ChatMessage[] = []
    groups.forEach((group: any) => {
      result.push(group.userMessage)
      const activeVersion = group.aiVersions[group.currentVersionIndex]
      if (activeVersion) {
        result.push(activeVersion)
      }
    })
    return result
  })
  
  const isLoading = computed(() => isStreaming.value)
  const canSend = computed(() => !isStreaming.value)
  const canInterrupt = computed(() => isStreaming.value)
  const currentState = computed(() => isStreaming.value ? 'streaming' : 'idle')
  
  // ═══════════════════════════════════════════════════════════════
  // 监听
  // ═══════════════════════════════════════════════════════════════
  
  // 监听状态变化
  if (onStateChange) {
    watch(currentState, (newState) => {
      onStateChange(newState)
    })
  }
  
  // 监听消息变化，自动滚动
  if (autoScroll) {
    watch(() => messages.value.length, () => {
      nextTick(() => {
        scrollToBottom()
      })
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 发送消息
   */
  async function sendMessage(content: string, opts: { stream?: boolean } = {}) {
    if (!currentSessionId.value) {
      await createSession('新对话')
    }
    return aiSendMessage(content)
  }
  
  /**
   * 中断生成
   */
  function doInterrupt() {
    return interrupt()
  }
  
  /**
   * 重新生成最后一条消息
   */
  async function regenerate() {
    if (!currentSessionId.value) return
    const groups = (messageGroups.value as Record<string, any>)[currentSessionId.value] || []
    const lastGroup = groups[groups.length - 1]
    if (lastGroup) {
      await regenerateResponse(lastGroup.userMessage.id)
    }
  }
  
  /**
   * 清空当前会话
   */
  function clearChat() {
    if (currentSessionId.value) {
      const groups = (messageGroups.value as Record<string, any>)[currentSessionId.value] || []
      groups.forEach((group: any) => {
        deleteVersion(group.userMessage.id, group.aiVersions[0]?.id)
      })
    }
  }
  
  /**
   * 导出会话
   */
  function exportChat(format: 'json' | 'markdown' = 'markdown') {
    if (!currentSessionId.value) return ''
    const msgs = messages.value
    if (format === 'json') {
      return JSON.stringify(msgs, null, 2)
    }
    // markdown format
    return msgs.map(m => {
      const role = m.role === 'user' ? 'User' : 'AI'
      return `### ${role}\n\n${m.content}\n`
    }).join('\n---\n\n')
  }
  
  /**
   * 滚动到底部（需要传入容器引用）
   */
  function scrollToBottom(container?: HTMLElement) {
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }
  
  /**
   * 创建新会话
   */
  async function newChat(title?: string) {
    return createSession(title || '新对话')
  }
  
  /**
   * 切换会话
   */
  async function switchChat(sessionId: string) {
    return switchSession(sessionId)
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════
  
  return {
    // 状态
    messages,
    isLoading,
    isStreaming,
    canSend,
    canInterrupt,
    currentState,
    currentSession,
    sessions,
    
    // 方法
    sendMessage,
    interrupt: doInterrupt,
    regenerate,
    clearChat,
    exportChat,
    newChat,
    switchChat,
    scrollToBottom,
    createSession,
    switchSession,
    deleteSession
  }
}

/**
 * useChatInput - 输入框专用组合式函数
 * 
 * 提供输入框相关的功能和快捷键
 */
export function useChatInput() {
  const inputContent = ref('')
  
  /**
   * 处理键盘事件
   */
  function handleKeydown(e: KeyboardEvent, onSend: () => void) {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputContent.value.trim()) {
        onSend()
      }
    }
    
    // Escape 取消输入
    if (e.key === 'Escape' && inputContent.value) {
      inputContent.value = ''
    }
  }
  
  /**
   * 插入文本到输入框
   */
  function insertText(text: string) {
    inputContent.value += text
  }
  
  /**
   * 清空输入
   */
  function clearInput() {
    inputContent.value = ''
  }
  
  return {
    inputContent,
    canSend: computed(() => inputContent.value.trim().length > 0),
    updateInput: (val: string) => { inputContent.value = val },
    handleKeydown,
    insertText,
    clearInput
  }
}

/**
 * useChatHistory - 历史记录专用组合式函数
 */
export function useChatHistory() {
  const aiChat = useAIChat()
  const { sessions, currentSessionId, switchSession, createSession, deleteSession } = aiChat
  
  // 分组的历史记录
  const today = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sessions.value.filter(s => new Date(s.updatedAt).getTime() >= today.getTime())
  })
  
  const yesterday = computed(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return sessions.value.filter(s => {
      const updated = new Date(s.updatedAt).getTime()
      return updated >= yesterday.getTime() && updated < today.getTime()
    })
  })
  
  const thisWeek = computed(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    return sessions.value.filter(s => {
      const updated = new Date(s.updatedAt).getTime()
      return updated >= weekAgo.getTime() && updated < yesterday.getTime()
    })
  })
  
  const older = computed(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)
    return sessions.value.filter(s => new Date(s.updatedAt).getTime() < weekAgo.getTime())
  })
  
  function searchSessions(query: string): ChatSession[] {
    const lowerQuery = query.toLowerCase()
    return sessions.value.filter(s => 
      s.title.toLowerCase().includes(lowerQuery)
    )
  }
  
  return {
    // 分组的历史记录
    today,
    yesterday,
    thisWeek,
    older,
    
    // 当前
    currentId: currentSessionId,
    current: computed(() => sessions.value.find(s => s.id === currentSessionId.value)),
    
    // 操作
    switch: switchSession,
    create: createSession,
    delete: deleteSession,
    search: searchSessions
  }
}

// 默认导出
export default useChat
