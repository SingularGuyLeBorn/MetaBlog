/**
 * Stream Store - 流式响应管理
 * 
 * 职责：
 * 1. 通过后端 API 调用 LLM（不是直接调用）
 * 2. 管理 SSE 连接状态
 * 3. 流数据缓冲与重放
 * 4. 流式消息的平滑更新（防抖/节流）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LLMMessage } from '../llm/types'

export interface StreamChunk {
  content: string
  reasoning?: string
  isReasoning?: boolean
}

export interface StreamOptions {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface StreamCallbacks {
  onChunk: (chunk: StreamChunk) => void
  onComplete: (metadata: { tokens: number; cost: number; model: string }) => void
  onError: (error: Error) => void
}

export const useStreamStore = defineStore('stream', () => {
  // ═══════════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════════
  
  const isStreaming = ref(false)
  const isConnecting = ref(false)
  
  const streamStartTime = ref<number>(0)
  const firstTokenTime = ref<number>(0)
  const chunkCount = ref(0)
  
  const buffer = ref<string>('')
  const reasoningBuffer = ref<string>('')
  
  const retryCount = ref(0)
  const maxRetries = 3
  const retryDelay = 1000
  
  let debounceTimer: number | null = null
  const DEBOUNCE_MS = 16 // ~60fps
  
  let currentAbortController: AbortController | null = null
  
  // ═══════════════════════════════════════════════════════════════
  // Getters
  // ═══════════════════════════════════════════════════════════════
  
  const duration = computed(() => {
    if (!streamStartTime.value) return 0
    return Date.now() - streamStartTime.value
  })
  
  const timeToFirstToken = computed(() => {
    if (!firstTokenTime.value || !streamStartTime.value) return 0
    return firstTokenTime.value - streamStartTime.value
  })
  
  const canRetry = computed(() => retryCount.value < maxRetries)
  
  // ═══════════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 启动流式请求（简化版）
   */
  async function startStreaming(
    content: string,
    messageId: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const options: StreamOptions = {
      messages: [{ role: 'user', content }]
    }
    return startStream(options, callbacks)
  }
  
  /**
   * 停止流式输出
   */
  function stopStreaming(): boolean {
    return interrupt()
  }
  
  /**
   * 启动流式请求 - 调用后端 API
   */
  async function startStream(
    options: StreamOptions,
    callbacks: StreamCallbacks
  ): Promise<void> {
    if (isStreaming.value || isConnecting.value) {
      throw new Error('已有正在进行的流式请求')
    }
    
    isConnecting.value = true
    streamStartTime.value = Date.now()
    firstTokenTime.value = 0
    chunkCount.value = 0
    buffer.value = ''
    reasoningBuffer.value = ''
    
    currentAbortController = new AbortController()
    
    // 如果外部提供了 signal，监听它
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        currentAbortController?.abort()
      })
    }
    
    try {
      console.log('[StreamStore] Starting fetch to /api/chat');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: options.messages,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          stream: true
        }),
        signal: currentAbortController.signal
      })
      
      console.log('[StreamStore] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StreamStore] Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }
      
      if (!response.body) {
        throw new Error('Response body is null')
      }
      
      isConnecting.value = false
      isStreaming.value = true
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      let fullContent = ''
      let fullReasoning = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            // 流结束
            callbacks.onComplete({
              tokens: estimateTokens(fullContent),
              cost: 0,
              model: options.model || 'unknown'
            })
            return
          }
          
          try {
            const parsed = JSON.parse(data)
            
            // 记录首Token时间
            if (!firstTokenTime.value && (parsed.content || parsed.reasoning)) {
              firstTokenTime.value = Date.now()
            }
            
            chunkCount.value++
            
            // 累积内容
            if (parsed.content) {
              fullContent += parsed.content
              buffer.value += parsed.content
            }
            
            if (parsed.reasoning) {
              fullReasoning += parsed.reasoning
              reasoningBuffer.value += parsed.reasoning
            }
            
            // 使用防抖更新UI
            scheduleUpdate(() => {
              callbacks.onChunk({
                content: fullContent,
                reasoning: fullReasoning,
                isReasoning: !!parsed.isReasoning
              })
              buffer.value = ''
              reasoningBuffer.value = ''
            })
            
          } catch (e) {
            // 忽略解析错误的行
          }
        }
      }
      
      // 完成回调
      callbacks.onComplete({
        tokens: estimateTokens(fullContent),
        cost: 0,
        model: options.model || 'unknown'
      })
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      
      // 检查是否是取消错误
      if (error.name === 'AbortError' || error.message === 'Request aborted') {
        console.log('[StreamStore] 流被用户取消')
        callbacks.onComplete({
          tokens: estimateTokens(buffer.value),
          cost: 0,
          model: options.model || 'unknown'
        })
        return
      }
      
      // 重连逻辑
      if (canRetry.value && isRetryableError(error)) {
        retryCount.value++
        console.log(`[StreamStore] 连接失败，${retryDelay}ms后重试 (${retryCount.value}/${maxRetries})`)
        
        await delay(retryDelay * retryCount.value)
        
        return startStream(options, callbacks)
      }
      
      callbacks.onError(error)
    } finally {
      isStreaming.value = false
      isConnecting.value = false
      currentAbortController = null
      
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
    }
  }
  
  /**
   * 中断当前流
   */
  function interrupt(): boolean {
    if (!currentAbortController) return false
    
    currentAbortController.abort()
    return true
  }
  
  /**
   * 重置状态
   */
  function reset() {
    interrupt()
    isStreaming.value = false
    isConnecting.value = false
    retryCount.value = 0
    buffer.value = ''
    reasoningBuffer.value = ''
    streamStartTime.value = 0
    firstTokenTime.value = 0
    chunkCount.value = 0
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 私有辅助方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 防抖更新
   */
  function scheduleUpdate(updateFn: () => void) {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    debounceTimer = window.setTimeout(() => {
      updateFn()
      debounceTimer = null
    }, DEBOUNCE_MS)
  }
  
  /**
   * 判断错误是否可重试
   */
  function isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'network error',
      'timeout',
      'connection',
      'econnreset',
      'econnrefused',
      'failed to fetch'
    ]
    
    const errorMsg = error.message.toLowerCase()
    return retryableMessages.some(msg => errorMsg.includes(msg))
  }
  
  /**
   * 估算Token数量
   */
  function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
  
  /**
   * 延迟辅助
   */
  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  return {
    // State
    isStreaming,
    isConnecting,
    streamStartTime,
    firstTokenTime,
    chunkCount,
    retryCount,
    buffer,
    
    // Getters
    duration,
    timeToFirstToken,
    canRetry,
    
    // Actions
    startStream,
    startStreaming,
    stopStreaming,
    interrupt,
    reset
  }
})
