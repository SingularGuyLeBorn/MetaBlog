/**
 * Chat Store - 聊天主状态管理
 * 
 * 职责：
 * 1. 管理整体聊天状态
 * 2. 编排消息发送流程
 * 3. 协调状态机流转
 * 4. 处理错误恢复
 */
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ChatStateMachine } from './machines/ChatStateMachine'
import { useSessionStore } from './sessionStore'
import {MessageStatus, useMessageStore} from './messageStore'
import { useStreamStore } from './streamStore'
import { saveChatSession } from '../api'
import type { SendMessageOptions, Message } from './types'

export const useChatStore = defineStore('chat', () => {
  // ═══════════════════════════════════════════════════════════════
  // 依赖
  // ═══════════════════════════════════════════════════════════════
  
  const sessionStore = useSessionStore()
  const messageStore = useMessageStore()
  const streamStore = useStreamStore()
  
  // ═══════════════════════════════════════════════════════════════
  // 状态
  // ═══════════════════════════════════════════════════════════════
  
  /** 状态机实例 */
  const machine = new ChatStateMachine()
  
  /** 当前状态 */
  const currentState = ref(machine.getState())
  
  /** 当前输入内容 */
  const inputContent = ref('')
  
  /** 当前会话ID */
  const currentSessionId = ref<string | null>(null)
  
  /** 错误信息 */
  const error = ref<Error | null>(null)
  
  /** 是否流式输出 */
  const isStreamingMode = ref(true)
  
  /** 输入中引用的文章 */
  const inputArticles = ref<Array<{ id: string; title: string }>>([])
  
  // ═══════════════════════════════════════════════════════════════
  // 计算属性
  // ═══════════════════════════════════════════════════════════════
  
  /** 是否可以发送消息 */
  const canSend = computed(() => {
    return machine.can('SEND_MESSAGE') && inputContent.value.trim().length > 0
  })
  
  /** 是否可以中断 */
  const canInterrupt = computed(() => {
    return machine.can('INTERRUPT')
  })
  
  /** 是否可以重试 */
  const canRetry = computed(() => {
    return machine.can('RETRY')
  })
  
  /** 是否正在加载 */
  const isLoading = computed(() => {
    const state = currentState.value
    return state === 'SENDING' || state === 'RECEIVING'
  })
  
  /** 是否正在流式输出 */
  const isStreaming = computed(() => {
    return currentState.value === 'STREAMING'
  })
  
  /** 是否处于错误状态 */
  const isError = computed(() => {
    return currentState.value === 'ERROR'
  })
  
  /** 当前会话 */
  const currentSession = computed(() => {
    if (!currentSessionId.value) return null
    return sessionStore.sessions.find((s: any) => s.id === currentSessionId.value) || null
  })
  
  /** 当前会话的消息 */
  const currentMessages = computed((): Message[] => {
    if (!currentSessionId.value) return []
    return messageStore.getSessionMessages(currentSessionId.value) as Message[]
  })
  
  // ═══════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 更新状态机状态
   */
  function updateState() {
    currentState.value = machine.getState()
  }
  
  /**
   * 执行状态流转
   */
  function transition(event: any): boolean {
    const result = machine.transition(event)
    if (result) {
      updateState()
    }
    return result
  }
  
  /**
   * 发送非流式消息
   */
  async function sendNonStreaming(content: string, messageId: string): Promise<void> {
    // TODO: 调用 API 发送非流式消息
    // 这里简化处理，实际应该调用 API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟 AI 回复
    const reply: Message = {
      id: `msg_${Date.now()}`,
      sessionId: currentSessionId.value!,
      role: 'assistant',
      content: `这是非流式回复：${content}`,
      status: 'completed' as const,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    messageStore.addMessage(reply)
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 公共方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 更新输入内容
   */
  function updateInput(content: string) {
    inputContent.value = content
    
    // 根据输入内容自动流转状态
    // 只有在 IDLE 状态才能进入 COMPOSING
    if (content.trim() && machine.getState() === 'IDLE') {
      transition({ type: 'START_COMPOSING' })
    }
    // 只有在 COMPOSING 状态才能 RESET 回 IDLE
    else if (!content.trim() && machine.getState() === 'COMPOSING') {
      transition({ type: 'RESET' })
    }
    // 其他状态（SENDING/STREAMING/ERROR等）不做自动状态流转
  }
  
  /**
   * 发送消息
   * @param content 消息内容（可选，默认使用 inputContent）
   * @param options 发送选项
   */
  async function sendMessage(content?: string, options: SendMessageOptions = {}): Promise<boolean> {
    // 使用传入的内容或当前输入
    const messageContent = (content || inputContent.value).trim()
    if (!messageContent) return false
    
    // 检查状态机是否允许发送
    if (!machine.can('SEND_MESSAGE')) {
      console.warn('[chatStore] 当前状态不允许发送:', machine.getState())
      return false
    }
    
    // 执行状态流转: COMPOSING -> SENDING 或 IDLE -> SENDING
    if (!transition({ type: 'SEND_MESSAGE' })) {
      console.warn('[chatStore] 状态流转失败，当前状态:', machine.getState())
      return false
    }
    
    // 清空输入（此时已经在 SENDING 状态，不再触发 RESET）
    inputContent.value = ''
    
    // 确保有当前会话（如果还没有，创建一个）
    let sessionId = currentSessionId.value
    if (!sessionId) {
      try {
        const session = await sessionStore.createSession('新对话')
        sessionId = session.id
        currentSessionId.value = sessionId
      } catch (err) {
        error.value = err instanceof Error ? err : new Error('创建会话失败')
        transition({ type: 'ERROR', payload: { error: err } })
        return false
      }
    }
    
    // 乐观更新：添加用户消息
    const userMessage = await messageStore.addMessageOptimistic({
      sessionId: sessionId!,
      role: 'user',
      content: messageContent,
      status: 'completed' as MessageStatus
    })
    
    try {
      if (options.stream !== false) {
        // 流式发送
        transition({ type: 'START_STREAM' })
        
        // 添加空的 AI 消息用于流式填充
        const aiMessageId = await messageStore.addMessageOptimistic({
          sessionId: sessionId!,
          role: 'assistant',
          content: '',
          status: 'streaming'
        })
        
        // 启动流式处理
        await streamStore.startStreaming(messageContent, aiMessageId, {
          onChunk: (chunk) => {
            messageStore.updateStreamingContent(aiMessageId, chunk.content || '')
          },
          onComplete: async () => {
            messageStore.finalizeMessage(aiMessageId)
            transition({ type: 'STREAM_END' })
            
            // 保存会话到后端
            try {
              const messages = messageStore.getSessionMessages(sessionId!)
              await saveChatSession({
                id: sessionId!,
                title: sessionStore.currentSession?.title || '新对话',
                messages: messages.map(m => ({
                  role: m.role as 'user' | 'assistant' | 'system',
                  content: m.content,
                  timestamp: m.createdAt
                })),
                createdAt: sessionStore.currentSession?.createdAt || Date.now(),
                updatedAt: Date.now()
              })
            } catch (err) {
              console.warn('[chatStore] 保存会话失败:', err)
            }
            
            // 如果输入框有内容，自动进入 COMPOSING 状态
            if (inputContent.value.trim()) {
              transition({ type: 'START_COMPOSING' })
            }
          },
          onError: (err) => {
            error.value = err
            transition({ type: 'ERROR', payload: { error: err } })
          }
        })
      } else {
        // 非流式发送
        await sendNonStreaming(messageContent, userMessage)
        transition({ type: 'RECEIVE_RESPONSE' })
      }
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      transition({ type: 'ERROR', payload: { error: err } })
      return false
    }
  }
  
  /**
   * 中断生成
   */
  async function interrupt(): Promise<boolean> {
    if (!canInterrupt.value) return false
    
    streamStore.stopStreaming()
    transition({ type: 'INTERRUPT' })
    
    return true
  }
  
  /**
   * 重试失败的消息
   */
  async function retry(): Promise<boolean> {
    if (!canRetry.value) return false
    
    error.value = null
    transition({ type: 'RETRY' })
    
    // 获取最后一条用户消息并重新发送
    const messages = currentMessages.value
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    
    if (lastUserMessage) {
      updateInput(lastUserMessage.content)
      return sendMessage()
    }
    
    return false
  }
  
  /**
   * 切换会话
   */
  async function switchSession(sessionId: string): Promise<void> {
    if (currentSessionId.value === sessionId) return
    
    // 如果有正在进行的流式输出，先中断它
    if (machine.getState() === 'STREAMING' || machine.getState() === 'SENDING') {
      streamStore.stopStreaming()
    }
    
    // 重置状态
    machine.reset()
    updateState()
    error.value = null
    inputContent.value = ''
    
    currentSessionId.value = sessionId
    
    // 加载会话消息（从后端获取）
    try {
      const messages = await messageStore.fetchSessionMessages(sessionId)
      messageStore.loadSessionMessages(sessionId, messages)
    } catch (err) {
      console.warn('[chatStore] 加载会话消息失败:', err)
      // 如果加载失败，初始化为空数组
      messageStore.loadSessionMessages(sessionId, [])
    }
  }
  
  /**
   * 创建新会话并切换
   */
  async function newChat(title?: string): Promise<void> {
    const session = await sessionStore.createSession(title || '新对话')
    await switchSession(session.id)
  }
  
  /**
   * 重置状态
   */
  function reset() {
    machine.reset()
    updateState()
    error.value = null
    inputContent.value = ''
  }
  
  /**
   * 清空当前会话
   */
  async function clearChat(): Promise<void> {
    if (!currentSessionId.value) return
    
    messageStore.clearSessionMessages(currentSessionId.value)
    reset()
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 返回
  // ═══════════════════════════════════════════════════════════════
  
  return {
    // State
    currentState,
    inputContent,
    currentSessionId,
    error,
    isStreamingMode,
    inputArticles,
    
    // Computed
    canSend,
    canInterrupt,
    canRetry,
    isLoading,
    isStreaming,
    isError,
    currentSession,
    currentMessages,
    
    // Methods
    updateInput,
    sendMessage,
    interrupt,
    retry,
    switchSession,
    newChat,
    reset,
    clearChat
  }
})
