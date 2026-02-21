/**
 * useChat - Chat 功能组合式函数
 * 
 * 提供简化的 Chat 功能访问，适用于只需要基本功能的组件
 * 
 * 使用示例：
 * ```typescript
 * const { 
 *   messages, 
   isLoading, 
   sendMessage, 
   interrupt 
 } = useChat()
 * ```
 */
import { computed, watch, nextTick } from 'vue'
import { useChatStores } from '../../agent/stores'

export interface UseChatOptions {
  /** 自动滚动到底部 */
  autoScroll?: boolean
  /** 消息更新回调 */
  onMessageUpdate?: () => void
  /** 状态变化回调 */
  onStateChange?: (state: string) => void
}

export function useChat(options: UseChatOptions = {}) {
  const { chat, message, session, stream } = useChatStores()
  
  const { 
    autoScroll = true,
    onMessageUpdate,
    onStateChange 
  } = options
  
  // ═══════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════
  
  const messages = computed(() => {
    if (!session.currentSessionId) return []
    return message.getSessionMessages(session.currentSessionId)
  })
  
  const isLoading = computed(() => chat.isLoading)
  const isStreaming = computed(() => chat.isStreaming)
  const canSend = computed(() => chat.canSend)
  const canInterrupt = computed(() => chat.canInterrupt)
  const currentState = computed(() => chat.currentState)
  
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
    
    // 监听流式更新
    watch(() => stream.buffer, () => {
      if (autoScroll) {
        nextTick(() => scrollToBottom())
      }
    }, { deep: true })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 发送消息
   */
  async function sendMessage(content: string, opts: { stream?: boolean } = {}) {
    // 直接传递内容到 store，不再需要通过 updateInput 设置
    return chat.sendMessage(content, { stream: opts.stream !== false })
  }
  
  /**
   * 中断生成
   */
  function interrupt() {
    return chat.interrupt()
  }
  
  /**
   * 重新生成最后一条消息
   */
  async function regenerate() {
    return chat.retry()
  }
  
  /**
   * 清空当前会话
   */
  function clearChat() {
    if (session.currentSessionId) {
      message.clearSessionMessages(session.currentSessionId)
    }
  }
  
  /**
   * 导出会话
   */
  function exportChat(format: 'json' | 'markdown' = 'markdown') {
    if (!session.currentSessionId) return ''
    return message.exportMessages(session.currentSessionId, format)
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
    return session.createSession(title || '新对话')
  }
  
  /**
   * 切换会话
   */
  async function switchChat(sessionId: string) {
    return session.switchSession(sessionId)
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
    
    // 当前输入
    inputContent: computed(() => chat.inputContent),
    updateInput: chat.updateInput,
    
    // 方法
    sendMessage,
    interrupt,
    regenerate,
    clearChat,
    exportChat,
    newChat,
    switchChat,
    scrollToBottom
  }
}

/**
 * useChatInput - 输入框专用组合式函数
 * 
 * 提供输入框相关的功能和快捷键
 */
export function useChatInput() {
  const { chat } = useChatStores()
  
  /**
   * 处理键盘事件
   */
  function handleKeydown(e: KeyboardEvent, onSend: () => void) {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (chat.canSend) {
        onSend()
      }
    }
    
    // Ctrl/Cmd + C 中断
    if (e.key === 'c' && (e.ctrlKey || e.metaKey) && chat.canInterrupt) {
      e.preventDefault()
      chat.interrupt()
    }
    
    // Escape 取消输入
    if (e.key === 'Escape' && chat.inputContent) {
      chat.updateInput('')
    }
  }
  
  /**
   * 插入文本到输入框
   */
  function insertText(text: string) {
    const current = chat.inputContent
    chat.updateInput(current + text)
  }
  
  /**
   * 清空输入
   */
  function clearInput() {
    chat.updateInput('')
    chat.inputArticles = []
  }
  
  return {
    inputContent: computed(() => chat.inputContent),
    canSend: computed(() => chat.canSend),
    updateInput: chat.updateInput,
    handleKeydown,
    insertText,
    clearInput
  }
}

/**
 * useChatHistory - 历史记录专用组合式函数
 */
export function useChatHistory() {
  const { session } = useChatStores()
  
  return {
    // 分组的历史记录
    today: computed(() => session.todaySessions),
    yesterday: computed(() => session.yesterdaySessions),
    thisWeek: computed(() => session.thisWeekSessions),
    older: computed(() => session.olderSessions),
    
    // 当前
    currentId: computed(() => session.currentSessionId),
    current: computed(() => session.currentSession),
    
    // 操作
    switch: session.switchSession,
    create: session.createSession,
    delete: session.deleteSession,
    search: session.searchSessions
  }
}

// 默认导出
export default useChat
