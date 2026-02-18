/**
 * Chat Service - 前端聊天服务
 * 
 * 提供直接的 LLM 聊天功能，支持：
 * - 基础对话
 * - 流式输出（支持 reasoning_content 推理过程）
 * - 多轮对话上下文
 * - 自动读取环境变量配置
 * 
 * 使用方法:
 * ```typescript
 * import { useChatService } from './chat-service'
 * 
 * const chat = useChatService()
 * 
 * // 发送消息
 * const response = await chat.sendMessage('你好')
 * 
 * // 流式对话（深度思考模式）
 * await chat.sendMessageStream('证明勾股定理', (chunk) => {
 *   if (chunk.reasoning) {
 *     console.log('推理:', chunk.reasoning)
 *   } else {
 *     console.log('回答:', chunk.content)
 *   }
 * })
 * ```
 */

import { ref, computed } from 'vue'
import { getLLMManager, createLLMManager } from './llm'
import { loadEnvConfig, createLLMConfigFromEnv } from './config/env'
import type { LLMMessage } from './llm/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  reasoning?: string  // 推理过程（深度思考模式）
  timestamp: number
  metadata?: {
    tokens?: number
    cost?: number
    model?: string
    isError?: boolean
    isResearch?: boolean
    sources?: string[]
    [key: string]: any  // 允许其他自定义属性
  }
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  systemPrompt?: string
}

export function useChatService() {
  // 消息历史
  const messages = ref<ChatMessage[]>([])
  
  // 状态
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  
  // 当前对话的 token 和成本统计
  const totalTokens = computed(() => 
    messages.value.reduce((sum, m) => sum + (m.metadata?.tokens || 0), 0)
  )
  const totalCost = computed(() => 
    messages.value.reduce((sum, m) => sum + (m.metadata?.cost || 0), 0)
  )
  
  // 确保 LLM Manager 已初始化
  function ensureLLMManager() {
    try {
      return getLLMManager()
    } catch {
      const config = createLLMConfigFromEnv()
      return createLLMManager(config)
    }
  }
  
  /**
   * 发送消息（非流式）
   */
  async function sendMessage(
    content: string,
    options: ChatOptions = {}
  ): Promise<ChatMessage> {
    const llm = ensureLLMManager()
    const env = loadEnvConfig()
    
    isLoading.value = true
    error.value = null
    
    try {
      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(userMessage)
      
      // 构建消息列表
      const chatMessages: LLMMessage[] = []
      
      // 系统提示词
      if (options.systemPrompt) {
        chatMessages.push({ role: 'system', content: options.systemPrompt })
      }
      
      // 添加历史消息（最近 10 条）
      const recentMessages = messages.value.slice(-11, -1)
      for (const msg of recentMessages) {
        // 只添加 LLM 支持的角色（排除 system 和 tool）
        if (msg.role === 'user' || msg.role === 'assistant') {
          chatMessages.push({ role: msg.role, content: msg.content })
        }
      }
      
      // 添加当前消息
      chatMessages.push({ role: 'user', content })
      
      // 调用 LLM
      const response = await llm.chat({
        messages: chatMessages,
        model: options.model || env.DEEPSEEK_MODEL || 'deepseek-chat',
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 2048
      })
      
      // 添加助手回复
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: {
          tokens: response.usage.totalTokens,
          cost: response.cost,
          model: response.model
        }
      }
      messages.value.push(assistantMessage)
      
      return assistantMessage
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      error.value = errorMsg
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 发送消息（流式）
   * 
   * 对于 deepseek-reasoner 模型，会返回 reasoning_content（推理过程）
   */
  async function sendMessageStream(
    content: string,
    onChunk: (chunk: { content: string; reasoning?: string; isReasoning?: boolean }) => void,
    options: ChatOptions = {}
  ): Promise<ChatMessage> {
    const llm = ensureLLMManager()
    const env = loadEnvConfig()
    
    isLoading.value = true
    isStreaming.value = true
    error.value = null
    
    // 判断是否是深度思考模式
    const isReasonerModel = (options.model || env.DEEPSEEK_MODEL || 'deepseek-chat').includes('reasoner')
    
    try {
      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now()
      }
      messages.value.push(userMessage)
      
      // 构建消息列表
      const chatMessages: LLMMessage[] = []
      
      // 系统提示词
      if (options.systemPrompt) {
        chatMessages.push({ role: 'system', content: options.systemPrompt })
      }
      
      // 添加历史消息
      const recentMessages = messages.value.slice(-11, -1)
      for (const msg of recentMessages) {
        // 只添加 LLM 支持的角色（排除 system 和 tool）
        if (msg.role === 'user' || msg.role === 'assistant') {
          // 对于 reasoner 模型，历史消息只保留 content，不保留 reasoning
          chatMessages.push({ role: msg.role, content: msg.content })
        }
      }
      
      // 添加当前消息
      chatMessages.push({ role: 'user', content })
      
      // 创建助手消息占位
      const assistantMessageId = `assistant_${Date.now()}`
      let fullContent = ''
      let fullReasoning = ''
      let hasReceivedContent = false
      let hasReceivedReasoning = false
      
      // 流式调用
      const { usage, cost } = await llm.chatStream(
        {
          messages: chatMessages,
          model: options.model || env.DEEPSEEK_MODEL || 'deepseek-chat',
          temperature: options.temperature ?? 0.7,
          maxTokens: options.maxTokens ?? 2048,
          stream: true
        },
        (chunk) => {
          const content = chunk.content || ''
          const reasoning = chunk.reasoning || ''
          
          // 处理推理过程
          if (reasoning) {
            hasReceivedReasoning = true
            fullReasoning += reasoning
            onChunk({ content: '', reasoning, isReasoning: true })
          }
          
          // 处理正式回答
          if (content) {
            hasReceivedContent = true
            fullContent += content
            onChunk({ content, reasoning: '', isReasoning: false })
          }
        }
      )
      
      // 添加完整的助手回复
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: fullContent,
        reasoning: fullReasoning || undefined,
        timestamp: Date.now(),
        metadata: {
          tokens: usage.totalTokens,
          cost,
          model: options.model || env.DEEPSEEK_MODEL || 'deepseek-chat'
        }
      }
      messages.value.push(assistantMessage)
      
      return assistantMessage
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      error.value = errorMsg
      throw err
    } finally {
      isLoading.value = false
      isStreaming.value = false
    }
  }
  
  /**
   * 清空对话历史
   */
  function clearMessages() {
    messages.value = []
    error.value = null
  }
  
  /**
   * 获取当前配置信息
   */
  function getConfig() {
    const env = loadEnvConfig()
    return {
      defaultProvider: env.LLM_DEFAULT_PROVIDER,
      deepseekModel: env.DEEPSEEK_MODEL || 'deepseek-chat',
      hasApiKey: !!(env.DEEPSEEK_API_KEY && !env.DEEPSEEK_API_KEY.includes('your'))
    }
  }
  
  return {
    // 状态
    messages,
    isLoading,
    isStreaming,
    error,
    totalTokens,
    totalCost,
    
    // 方法
    sendMessage,
    sendMessageStream,
    clearMessages,
    getConfig
  }
}

// 默认导出
export default useChatService
