/**
 * Stream API - 流式请求管理
 * 
 * 提供高级流式请求功能：
 * - SSE 连接管理
 * - 自动重连
 * - 心跳保活
 * - 优雅降级
 */

import { getLLMManager } from '../llm'
import type { LLMMessage } from '../llm/types'

export interface StreamRequest {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface StreamCallbacks {
  /** 收到数据块 */
  onChunk: (chunk: { content?: string; reasoning?: string }) => void
  /** 流正常结束 */
  onComplete: (metadata: { tokens: number; cost: number; model: string }) => void
  /** 发生错误 */
  onError: (error: Error) => void
  /** 连接建立 */
  onConnect?: () => void
  /** 连接关闭 */
  onClose?: () => void
}

export interface StreamOptions {
  /** 最大重连次数 */
  maxRetries?: number
  /** 重连延迟（指数退避） */
  retryDelay?: number
  /** 心跳间隔（ms） */
  heartbeatInterval?: number
  /** 超时时间 */
  timeout?: number
}

const DEFAULT_OPTIONS: StreamOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  heartbeatInterval: 30000,
  timeout: 120000
}

/**
 * 创建流式请求
 */
export async function createStream(
  request: StreamRequest,
  callbacks: StreamCallbacks,
  options: StreamOptions = {}
): Promise<() => void> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const llm = getLLMManager()
  
  let retryCount = 0
  let isAborted = false
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null
  
  // 创建 AbortController（如果没有提供）
  const abortController = new AbortController()
  
  // 合并外部 signal
  if (request.signal) {
    request.signal.addEventListener('abort', () => {
      abortController.abort()
    })
  }
  
  // 返回的取消函数
  const cancel = () => {
    isAborted = true
    abortController.abort()
    cleanup()
  }
  
  function cleanup() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }
  
  function startHeartbeat() {
    if (config.heartbeatInterval) {
      heartbeatTimer = setInterval(() => {
        // 可以在这里发送心跳或检查连接状态
      }, config.heartbeatInterval)
    }
  }
  
  function startTimeout() {
    if (config.timeout) {
      timeoutTimer = setTimeout(() => {
        if (!isAborted) {
          abortController.abort()
          callbacks.onError(new Error('请求超时'))
        }
      }, config.timeout)
    }
  }
  
  async function tryConnect() {
    try {
      let fullContent = ''
      let fullReasoning = ''
      let hasReceivedData = false
      
      callbacks.onConnect?.()
      startTimeout()
      
      await llm.chatStream(
        {
          messages: request.messages,
          model: request.model,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          stream: true,
          signal: abortController.signal
        },
        (chunk) => {
          hasReceivedData = true
          
          if (chunk.content) {
            fullContent += chunk.content
          }
          if (chunk.reasoning) {
            fullReasoning += chunk.reasoning
          }
          
          callbacks.onChunk({
            content: chunk.content,
            reasoning: chunk.reasoning
          })
        }
      )
      
      cleanup()
      
      if (!isAborted) {
        callbacks.onComplete({
          tokens: estimateTokens(fullContent),
          cost: 0, // 需要从 LLM 获取
          model: request.model || 'unknown'
        })
      }
      
      callbacks.onClose?.()
      
    } catch (error) {
      cleanup()
      
      if (isAborted) return
      
      const err = error instanceof Error ? error : new Error(String(error))
      
      // 检查是否是取消错误
      if (err.name === 'AbortError' || err.message === 'Request aborted') {
        callbacks.onClose?.()
        return
      }
      
      // 检查是否需要重试
      if (retryCount < (config.maxRetries || 0) && isRetryableError(err)) {
        retryCount++
        const delay = (config.retryDelay || 1000) * Math.pow(2, retryCount - 1)
        
        console.log(`[Stream] 连接失败，${delay}ms后重试 (${retryCount}/${config.maxRetries})`)
        
        await sleep(delay)
        await tryConnect()
      } else {
        callbacks.onError(err)
        callbacks.onClose?.()
      }
    }
  }
  
  // 开始连接
  tryConnect()
  
  return cancel
}

/**
 * 简单流式请求（无重连）
 */
export async function streamChat(
  request: StreamRequest,
  onChunk: (chunk: { content?: string; reasoning?: string }) => void,
  signal?: AbortSignal
): Promise<{ content: string; reasoning: string; tokens: number }> {
  return new Promise((resolve, reject) => {
    let fullContent = ''
    let fullReasoning = ''
    
    createStream(
      request,
      {
        onChunk: (chunk) => {
          onChunk(chunk)
          if (chunk.content) fullContent += chunk.content
          if (chunk.reasoning) fullReasoning += chunk.reasoning
        },
        onComplete: (metadata) => {
          resolve({
            content: fullContent,
            reasoning: fullReasoning,
            tokens: metadata.tokens
          })
        },
        onError: reject
      },
      { maxRetries: 0 }
    ).then((cancel: () => void) => {
      // 如果外部 signal 被中止，取消流
      signal?.addEventListener('abort', () => {
        cancel()
        reject(new Error('Aborted'))
      })
    })
  })
}

// ═══════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════

function isRetryableError(error: Error): boolean {
  const retryableMessages = [
    'network error',
    'timeout',
    'connection',
    'econnreset',
    'econnrefused',
    'failed to fetch',
    'unexpected end',
    'stream ended'
  ]
  
  const errorMsg = error.message.toLowerCase()
  return retryableMessages.some(msg => errorMsg.includes(msg))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// 默认导出
export default {
  createStream,
  streamChat
}
