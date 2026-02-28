/**
 * AI Service - DeepSeek/Kimi API (支持多模态的 Function Call 实现)
 * 
 * 核心流程：
 * 1. 发送用户消息 + tools 定义（支持图片/视频）
 * 2. AI 返回 tool_calls（非流式）
 * 3. 执行工具函数
 * 4. 发送 tool 结果（流式）获取最终回复
 * 
 * 更新：增加Kimi多模态支持（图片/视频理解）
 */
import type { ChatMessage, SessionConfig, MessageRole, ToolCallRecord, ThinkingStep } from '../types'
import { addLog } from './logger'
import {
  startSessionLog,
  addLogEntry,
  logUserInput,
  logAIRequest,
  logAIResponse,
  logAIContent,
  logThinkingStep,
  logToolCall,
  logToolResult,
  logHumanNote,
  logError,
  endSessionLog
} from './sessionLogger'
import { 
  getToolDefinitions, 
  executeToolWithRecord,
  initializeDefaultTools,
  type ToolDefinition,
  type ToolCall
} from '../tools'
import { fileToBase64, detectMediaType, buildKimiImageContent, buildKimiVideoContent } from './multimediaService'

// 初始化默认工具
initializeDefaultTools()

// ==================== API 调试日志记录器 ====================

interface ApiDebugEntry {
  timestamp: string
  type: 'request' | 'response' | 'error' | 'note'
  endpoint: string
  round: number
  data: any
  uiVisible?: boolean
  humanNote?: string
}

class ApiDebugLogger {
  private currentSessionId: string | null = null
  private sessionStartTime: number = 0
  private round: number = 0
  private entries: ApiDebugEntry[] = []

  startSession(sessionId: string) {
    if (this.currentSessionId && this.entries.length > 0) {
      this.flush()
    }
    this.currentSessionId = sessionId
    this.sessionStartTime = Date.now()
    this.round = 0
    this.entries = []
  }

  logRequest(endpoint: string, data: any, humanNote?: string) {
    this.round++
    this.entries.push({
      timestamp: new Date().toISOString(),
      type: 'request',
      endpoint,
      round: this.round,
      data: JSON.parse(JSON.stringify(data)),
      humanNote
    })
  }

  logResponse(endpoint: string, data: any, humanNote?: string) {
    this.entries.push({
      timestamp: new Date().toISOString(),
      type: 'response',
      endpoint,
      round: this.round,
      data: JSON.parse(JSON.stringify(data)),
      humanNote
    })
  }

  logError(endpoint: string, error: any, humanNote?: string) {
    this.entries.push({
      timestamp: new Date().toISOString(),
      type: 'error',
      endpoint,
      round: this.round,
      data: {
        message: error.message || String(error),
        stack: error.stack,
        name: error.name
      },
      humanNote
    })
  }

  logNote(endpoint: string, note: string, data?: any, uiVisible?: boolean) {
    this.entries.push({
      timestamp: new Date().toISOString(),
      type: 'note',
      endpoint,
      round: this.round,
      data: data || {},
      humanNote: note,
      uiVisible
    })
  }

  async flush() {
    if (!this.currentSessionId || this.entries.length === 0) return

    const debugData = {
      sessionId: this.currentSessionId,
      startTime: new Date(this.sessionStartTime).toISOString(),
      endTime: new Date().toISOString(),
      totalRounds: this.round,
      entries: this.entries
    }

    try {
      await fetch('/api/logs/api-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debugData)
      })
    } catch (e) {
      console.error('[ApiDebugLogger] Failed to save debug log:', e)
    }
  }
}

const apiDebugLogger = new ApiDebugLogger()

// ==================== 日志辅助函数 ====================

function logApiRequest(endpoint: string, data: any) {
  apiDebugLogger.logRequest(endpoint, data, '【API请求】发送到AI服务')
  
  const bodySize = JSON.stringify(data).length
  const simplifiedMessages = data.messages?.map((m: any) => {
    const msg: any = { role: m.role }
    if (Array.isArray(m.content)) {
      // 多模态消息
      msg.content_type = 'multimodal'
      msg.content_parts = m.content.map((c: any) => c.type)
    } else {
      msg.content_length = m.content?.length || 0
      msg.content_preview = m.content?.substring(0, 200) + (m.content?.length > 200 ? '...' : '')
    }
    if (m.tool_calls) {
      msg.tool_calls = m.tool_calls.map((tc: any) => ({ id: tc.id, name: tc.function?.name }))
    }
    if (m.tool_call_id) {
      msg.tool_call_id = m.tool_call_id
    }
    if (m.reasoning_content) {
      msg.has_reasoning = true
      msg.reasoning_length = m.reasoning_content.length
    }
    return msg
  })
  
  addLog({
    level: 'debug',
    category: 'api',
    component: 'aiService',
    event: 'api_request',
    message: `API Request to ${endpoint} (size: ${bodySize} bytes)`,
    data: {
      endpoint, model: data.model, bodySize,
      messageCount: data.messages?.length,
      hasTools: !!data.tools, toolCount: data.tools?.length,
      temperature: data.temperature, max_tokens: data.max_tokens,
      messages: simplifiedMessages,
      raw_body: data
    }
  })
}

function logApiResponse(endpoint: string, data: any, duration: number) {
  apiDebugLogger.logResponse(endpoint, data, '【API响应】AI服务返回')
  
  const message = data.choices?.[0]?.message
  const responseSize = JSON.stringify(data).length
  
  const simplifiedMessage = message ? {
    role: message.role,
    content_length: message.content?.length || 0,
    content_preview: message.content?.substring(0, 300) + (message.content?.length > 300 ? '...' : ''),
    has_reasoning: !!message.reasoning_content,
    reasoning_length: message.reasoning_content?.length,
    reasoning_preview: message.reasoning_content?.substring(0, 200) + (message.reasoning_content?.length > 200 ? '...' : ''),
    tool_calls: message.tool_calls?.map((tc: any) => ({
      id: tc.id, name: tc.function?.name,
      arguments_preview: tc.function?.arguments?.substring(0, 100) + (tc.function?.arguments?.length > 100 ? '...' : '')
    }))
  } : null
  
  addLog({
    level: 'debug',
    category: 'api',
    component: 'aiService',
    event: 'api_response',
    message: `API Response from ${endpoint} (${duration}ms, ${responseSize} bytes)`,
    data: {
      endpoint, duration, responseSize,
      id: data.id, model: data.model,
      hasChoices: !!data.choices, choiceCount: data.choices?.length,
      hasToolCalls: !!message?.tool_calls, toolCallCount: message?.tool_calls?.length,
      finishReason: data.choices?.[0]?.finish_reason,
      usage: data.usage,
      message: simplifiedMessage,
      raw_response: data
    }
  })
}

function logApiError(endpoint: string, error: any, duration?: number, requestData?: any) {
  apiDebugLogger.logError(endpoint, error, `【API错误】${error.message || String(error)}`)
  
  addLog({
    level: 'error',
    category: 'api',
    component: 'aiService',
    event: 'api_error',
    message: `API Error from ${endpoint}: ${error.message || error}`,
    data: {
      endpoint, error: error.message || String(error),
      error_name: error.name, stack: error.stack, duration,
      type: error.name || 'UnknownError',
      request_summary: requestData ? {
        model: requestData.model,
        message_count: requestData.messages?.length,
        body_size: JSON.stringify(requestData).length
      } : undefined
    }
  })
}

// ==================== 多模型配置 ====================

export type ModelProvider = 'deepseek' | 'kimi' | 'openai' | 'anthropic' | 'custom'

export interface ModelConfig {
  provider: ModelProvider
  model: string
  baseURL: string
  apiKey: string
  supportsVision: boolean
  supportsVideo: boolean
  supportsFunctionCalling: boolean
  maxTokens: number
}

// 支持的模型配置
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // DeepSeek 模型 - 纯文本
  'deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192
  },
  'deepseek-reasoner': {
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192
  },
  // Kimi (Moonshot) 模型 - 支持多模态
  'kimi-k2.5': {
    provider: 'kimi',
    model: 'kimi-k2.5',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: true,
    supportsFunctionCalling: true,
    maxTokens: 8192
  },
  'kimi-k2': {
    provider: 'kimi',
    model: 'kimi-k2',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: true,
    supportsFunctionCalling: true,
    maxTokens: 8192
  },
  'kimi-k1.5': {
    provider: 'kimi',
    model: 'kimi-k1.5',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false, // k1.5不支持视频
    supportsFunctionCalling: true,
    maxTokens: 8192
  }
}

// 获取模型配置
function getModelConfig(modelName: string): ModelConfig {
  const config = MODEL_CONFIGS[modelName]
  if (config) {
    return config
  }
  
  // 如果找不到配置，尝试基于模型名称推断
  if (modelName.startsWith('kimi')) {
    return {
      provider: 'kimi',
      model: modelName,
      baseURL: 'https://api.moonshot.cn/v1',
      apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
      supportsVision: true,
      supportsVideo: modelName.includes('k2'), // k2系列支持视频
      supportsFunctionCalling: true,
      maxTokens: 8192
    }
  }
  
  // 默认使用 DeepSeek
  return {
    provider: 'deepseek',
    model: modelName,
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192
  }
}

// 验证 API Key
function validateApiKey(config: ModelConfig): void {
  if (!config.apiKey || config.apiKey.includes('your-api-key')) {
    throw new Error(`${config.provider} API Key not configured`)
  }
}

// ==================== 类型定义 ====================

export interface StreamCallbacks {
  onContent: (text: string) => void
  onReasoning: (text: string) => void
  onComplete: () => void
  onError: (error: Error) => void
  onToolRecord?: (record: ToolCallRecord) => void
  onThinkingStep?: (step: ThinkingStep) => void
}

// ==================== 多模态消息处理 ====================

/**
 * 将ChatMessage转换为API消息格式
 * 支持多模态内容（图片、视频）
 */
async function convertMessageToApiFormat(
  message: ChatMessage,
  modelConfig: ModelConfig
): Promise<any> {
  const baseMsg: any = { role: message.role }
  
  // 检查是否有附件
  if (message.attachments && message.attachments.length > 0) {
    // 模型支持多模态
    if (modelConfig.supportsVision) {
      const contentParts: any[] = []
      
      // 添加文本内容
      if (message.content) {
        contentParts.push({ type: 'text', text: message.content })
      }
      
      // 处理附件
      for (const attachment of message.attachments) {
        if (attachment.type === 'image' && modelConfig.supportsVision) {
          try {
            // 如果是本地文件，转换为base64
            if (attachment.url.startsWith('blob:') || attachment.url.startsWith('data:')) {
              const response = await fetch(attachment.url)
              const blob = await response.blob()
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = reader.result as string
                  resolve(result.split(',')[1])
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
              contentParts.push(buildKimiImageContent(base64, attachment.mimeType || 'image/jpeg'))
            } else {
              // 外部URL
              contentParts.push({
                type: 'image_url',
                image_url: { url: attachment.url }
              })
            }
          } catch (error) {
            console.error('处理图片失败:', error)
          }
        } else if (attachment.type === 'video' && modelConfig.supportsVideo) {
          try {
            if (attachment.url.startsWith('blob:') || attachment.url.startsWith('data:')) {
              const response = await fetch(attachment.url)
              const blob = await response.blob()
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => {
                  const result = reader.result as string
                  resolve(result.split(',')[1])
                }
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
              contentParts.push(buildKimiVideoContent(base64, attachment.mimeType || 'video/mp4'))
            } else {
              contentParts.push({
                type: 'video_url',
                video_url: { url: attachment.url }
              })
            }
          } catch (error) {
            console.error('处理视频失败:', error)
          }
        }
      }
      
      baseMsg.content = contentParts
    } else {
      // 模型不支持多模态，只发送文本和附件链接
      let textContent = message.content || ''
      if (message.attachments.length > 0) {
        textContent += '\n\n[附件]\n'
        message.attachments.forEach((att, i) => {
          textContent += `${i + 1}. ${att.type}: ${att.url}\n`
        })
        textContent += '\n注意：当前模型不支持直接理解多媒体内容，请描述或分析这些附件。'
      }
      baseMsg.content = textContent
    }
  } else {
    // 纯文本消息
    baseMsg.content = message.content
  }
  
  // 处理工具调用相关字段
  if (message.role === 'assistant') {
    if (message.reasoning?.content) {
      baseMsg.reasoning_content = message.reasoning.content
    }
    if (message.metadata?.toolCalls?.length) {
      baseMsg.tool_calls = message.metadata.toolCalls
    }
  }
  
  if (message.role === 'tool' && message.metadata?.toolCallId) {
    baseMsg.tool_call_id = message.metadata.toolCallId
  }
  
  return baseMsg
}

// ==================== 工具函数 ====================

function cleanAIOutput(content: string): string {
  return content
    .replace(/<\|DSML\|[^>]*>/g, '')
    .replace(/<\|\/DSML\|[^>]*>/g, '')
    .replace(/\|DSML\|/g, '')
    .replace(/<\|[^|]+\|>/g, '')
    .replace(/function_calls/g, '')
    .replace(/invoke/g, '')
    .replace(/parameter/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 截断过长的消息内容，防止请求体过大
 */
function truncateMessages(messages: any[], maxContentLength: number = 8000): any[] {
  return messages.map(m => {
    // 处理多模态消息
    if (Array.isArray(m.content)) {
      return m
    }
    
    if (m.role === 'tool' && m.content && m.content.length > maxContentLength) {
      const truncated = m.content.substring(0, maxContentLength)
      const truncatedLength = m.content.length - maxContentLength
      return {
        ...m,
        content: truncated + `\n\n... [内容已截断，省略 ${truncatedLength} 字符]`
      }
    }
    if (m.role === 'assistant' && m.content && m.content.length > maxContentLength * 2) {
      return {
        ...m,
        content: m.content.substring(0, maxContentLength * 2) + `\n\n... [内容已截断]`
      }
    }
    return m
  })
}

// ==================== API 请求 ====================

async function chatNonStream(
  messages: any[],
  config: SessionConfig,
  includeTools: boolean,
  isToolContinuation: boolean = false
): Promise<{ content?: string; toolCalls?: ToolCall[]; reasoningContent?: string; error?: string }> {
  const modelConfig = getModelConfig(config.model)
  validateApiKey(modelConfig)
  
  const startTime = Date.now()
  
  const isReasoningModel = config.model === 'deepseek-reasoner'
  const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-chat'
  const isReasoningMode = isReasoningModel || isThinkingEnabled
  
  let processedMessages = messages
  if (isThinkingEnabled && !isToolContinuation) {
    processedMessages = messages.map((m: any) => {
      if (m.role === 'assistant' && m.reasoning_content) {
        const { reasoning_content, ...rest } = m
        return rest
      }
      return m
    })
  }
  
  // 截断过长的消息，防止请求体过大
  processedMessages = truncateMessages(processedMessages, 6000)
  
  const requestBody: any = {
    model: modelConfig.model,
    messages: processedMessages,
    max_tokens: Math.min(config.maxTokens, modelConfig.maxTokens),
    stream: false
  }
  
  if (!isReasoningModel) {
    requestBody.temperature = config.temperature
  }
  
  if (isThinkingEnabled) {
    requestBody.thinking = { type: 'enabled' }
  }
  
  // Kimi K2.5的思考模式需要特殊处理（与内置工具冲突）
  if (config.model === 'kimi-k2.5' && config.enableReasoning) {
    // 如果启用了思考模式且使用了内置工具，需要禁用思考模式
    const hasBuiltinTools = includeTools && getToolDefinitions().some((t: ToolDefinition) => 
      t.function.name.startsWith('$')
    )
    if (hasBuiltinTools) {
      requestBody.thinking = { type: 'disabled' }
    } else {
      requestBody.thinking = { type: 'enabled' }
    }
  }
  
  if (includeTools && modelConfig.supportsFunctionCalling) {
    const toolDefs = getToolDefinitions()
    requestBody.tools = toolDefs
  }

  logApiRequest('/chat/completions (non-stream)', requestBody)

  try {
    const response = await fetch(`${modelConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      const error = new Error(`HTTP ${response.status}: ${errorText}`)
      logApiError('/chat/completions (non-stream)', error, duration, requestBody)
      return { error: `API Error: ${errorText}` }
    }

    const result = await response.json()
    logApiResponse('/chat/completions (non-stream)', result, duration)
    
    const message = result.choices?.[0]?.message
    const reasoningContent = message?.reasoning_content
    
    if (message?.tool_calls?.length > 0) {
      addLog({
        level: 'info', category: 'tool', component: 'aiService',
        event: 'tool_call_detected',
        message: `AI 请求调用 ${message.tool_calls.length} 个工具`,
        data: { toolNames: message.tool_calls.map((tc: any) => tc.function?.name), hasReasoning: !!reasoningContent }
      })
      return { content: message?.content || '', toolCalls: message.tool_calls, reasoningContent }
    }
    
    return { content: message?.content || '', reasoningContent }
  } catch (error) {
    const duration = Date.now() - startTime
    let errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('Failed to fetch')) {
      errorMessage = `网络请求失败。可能原因: 1) CORS 限制 2) 网络问题 3) 请求体过大。详细信息: ${errorMessage}`
    }
    logApiError('/chat/completions (non-stream)', new Error(errorMessage), duration, requestBody)
    return { error: errorMessage }
  }
}

async function chatStreamInternal(
  messages: any[],
  config: SessionConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  isToolContinuation: boolean = false
): Promise<void> {
  const modelConfig = getModelConfig(config.model)
  validateApiKey(modelConfig)
  
  const startTime = Date.now()
  
  const isReasoningModel = config.model === 'deepseek-reasoner'
  const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-chat'
  
  let processedMessages = messages
  
  if (isThinkingEnabled && !isToolContinuation) {
    processedMessages = processedMessages.map((m: any) => {
      if (m.role === 'assistant' && m.reasoning_content) {
        const { reasoning_content, ...rest } = m
        return rest
      }
      return m
    })
  }
  
  processedMessages = truncateMessages(processedMessages, 6000)
  
  const requestBody: any = {
    model: modelConfig.model,
    messages: processedMessages,
    max_tokens: Math.min(config.maxTokens, modelConfig.maxTokens),
    stream: true
  }
  
  if (!isReasoningModel) {
    requestBody.temperature = config.temperature
  }
  
  if (isThinkingEnabled) {
    requestBody.thinking = { type: 'enabled' }
  }
  
  logApiRequest('/chat/completions (stream)', requestBody)

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let fullReasoning = ''
  let chunkCount = 0

  try {
    const response = await fetch(`${modelConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is null')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunkCount++
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          callbacks.onComplete()
          return
        }

        try {
          const chunk = JSON.parse(data)
          const delta = chunk.choices?.[0]?.delta
          
          if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content
            callbacks.onReasoning(fullReasoning)
          }
          
          if (delta?.content) {
            fullContent += delta.content
            callbacks.onContent(cleanAIOutput(fullContent))
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    logApiError('/chat/completions (stream)', errorObj, Date.now() - startTime, requestBody)
    throw errorObj
  }

  callbacks.onComplete()
}

// ==================== 主服务 ====================

export const aiService = {
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
    maxToolRounds: number = 10,
    sessionId?: string,
    toolContext?: {
      agentId?: string
      skillIds?: string[]
      declaredTools?: string[]
      availableTools?: string[]
    }
  ): Promise<{ toolRecords?: ToolCallRecord[] }> {
    const toolRecords: ToolCallRecord[] = []
    const startTime = Date.now()
    
    const debugSessionId = sessionId || `session_${startTime}`
    const modelConfig = getModelConfig(config.model)
    const isReasoningModel = config.model === 'deepseek-reasoner'
    const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-chat'
    const isReasoningMode = isReasoningModel || isThinkingEnabled
    
    apiDebugLogger.startSession(debugSessionId)
    
    // 启动 Session 日志
    startSessionLog(debugSessionId, {
      model: config.model,
      reasoningEnabled: isReasoningModel || config.enableReasoning,
      supportsVision: modelConfig.supportsVision,
      supportsVideo: modelConfig.supportsVideo
    })
    
    // 记录用户输入
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      const hasAttachments = lastUserMessage.attachments && lastUserMessage.attachments.length > 0
      logUserInput(lastUserMessage.content, {
        messageId: lastUserMessage.id,
        sessionId: debugSessionId,
        hasAttachments,
        attachmentTypes: hasAttachments ? lastUserMessage.attachments?.map(a => a.type) : undefined
      })
    }
    
    addLog({
      level: 'info', category: 'chat', component: 'aiService',
      event: 'message_start',
      message: `开始新对话，模型: ${config.model}`,
      data: { 
        model: config.model, 
        messageCount: messages.length, 
        hasSystemPrompt: !!config.systemPrompt, 
        debugSessionId,
        supportsVision: modelConfig.supportsVision,
        supportsVideo: modelConfig.supportsVideo
      }
    })
    
    try {
      // 转换消息格式，支持多模态
      const apiMessages: any[] = []
      
      // 添加系统提示词
      if (config.systemPrompt) {
        // 为多模态模型添加提示
        let enhancedPrompt = config.systemPrompt
        if (modelConfig.supportsVision && messages.some(m => m.attachments?.some(a => a.type === 'image'))) {
          enhancedPrompt += '\n\n你可以理解用户上传的图片内容。'
        }
        if (modelConfig.supportsVideo && messages.some(m => m.attachments?.some(a => a.type === 'video'))) {
          enhancedPrompt += '\n\n你可以理解用户上传的视频内容。'
        }
        apiMessages.push({ role: 'system', content: enhancedPrompt })
      }
      
      // 转换每条消息
      for (const message of messages.slice(-10)) {
        const apiMsg = await convertMessageToApiFormat(message, modelConfig)
        apiMessages.push(apiMsg)
      }
      
      // 过滤空消息
      const filteredMessages = apiMessages.filter((m: any) => {
        if (m.role === 'assistant') {
          const hasContent = m.content?.trim().length > 0 || Array.isArray(m.content)
          const hasReasoning = m.reasoning_content?.trim().length > 0
          const hasToolCalls = m.tool_calls?.length > 0
          return hasContent || hasReasoning || hasToolCalls
        }
        return true
      })
      
      if (isReasoningModel) {
        processedMessages: filteredMessages.map((m: any) => {
          if (m.role === 'assistant') {
            return { ...m, reasoning_content: m.reasoning_content || '' }
          }
          return m
        })
      }
      
      let toolRound = 0
      let hasMoreToolCalls = true
      let fullThinking = ''
      let stepIndex = 0
      
      while (hasMoreToolCalls && toolRound < maxToolRounds) {
        toolRound++
        
        addLog({
          level: 'debug', category: 'chat', component: 'aiService',
          event: 'tool_round_start', message: `第 ${toolRound} 轮工具检测`,
          data: { round: toolRound }
        })
        
        const response = await chatNonStream(filteredMessages, config, true, toolRound > 1)
        
        if (response.error) {
          callbacks.onError(new Error(response.error))
          return { toolRecords }
        }
        
        // 处理思考内容
        if (response.reasoningContent) {
          const currentThinking = response.reasoningContent
          
          if (fullThinking) {
            fullThinking += '\n\n---\n' + currentThinking
          } else {
            fullThinking = currentThinking
          }
          
          callbacks.onReasoning(fullThinking)
          
          const thinkingStep: ThinkingStep = {
            id: `step_${toolRound}_${Date.now()}_${stepIndex}`,
            type: 'thinking',
            index: stepIndex++,
            content: currentThinking,
            createdAt: Date.now()
          }
          callbacks.onThinkingStep?.(thinkingStep)
          
          logThinkingStep(toolRound, 'thinking', currentThinking, {
            stepId: thinkingStep.id,
            stepIndex: thinkingStep.index
          })
          
          apiDebugLogger.logNote('thinking', '【UI展示】思考步骤', { stepIndex, content: currentThinking }, true)
        }
        
        const toolCalls = response.toolCalls
        
        if (!toolCalls || toolCalls.length === 0) {
          // 没有工具调用，直接显示最终回复
          if (response.content) {
            const cleanedContent = cleanAIOutput(response.content)
            callbacks.onContent(cleanedContent)
            
            logAIContent(cleanedContent, {
              round: toolRound,
              hasThinking: !!response.reasoningContent,
              model: config.model
            })
            apiDebugLogger.logNote('final_response', '【UI展示】最终回复（立即显示）', { content: response.content }, true)
          }
          if (isReasoningMode && response.reasoningContent) {
            callbacks.onReasoning(fullThinking || response.reasoningContent)
          }
          callbacks.onComplete()
          
          const duration = Date.now() - startTime
          addLog({
            level: 'info', category: 'chat', component: 'aiService',
            event: 'message_complete', message: `对话完成 (${duration}ms)`,
            data: { duration, toolRounds: toolRound, toolCount: toolRecords.length }
          })
          
          await apiDebugLogger.flush()
          return { toolRecords }
        }
        
        // 执行工具调用
        addLog({
          level: 'info', category: 'tool', component: 'aiService',
          event: 'tool_call_start', message: `开始执行 ${toolCalls.length} 个工具调用`,
          data: { round: toolRound, toolCount: toolCalls.length }
        })
        
        const toolResultMessages = []
        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments || '{}')
          const toolStartTime = Date.now()
          
          const toolStepId = `tool_${toolRound}_${toolStartTime}_${stepIndex++}`
          const toolStep: ThinkingStep = {
            id: toolStepId,
            type: 'tool_call',
            index: stepIndex,
            toolRecord: {
              id: toolCall.id,
              name: toolCall.function.name,
              arguments: args,
              result: '',
              status: 'running',
              startTime: toolStartTime
            },
            createdAt: toolStartTime
          }
          callbacks.onThinkingStep?.(toolStep)
          
          const { result, record } = await executeToolWithRecord(
            toolCall.function.name, 
            args,
            toolContext,
            callbacks.onToolRecord
          )
          toolRecords.push(record)
          
          toolStep.toolRecord = {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: args,
            result: result,
            status: 'success',
            startTime: record.startTime,
            endTime: record.endTime,
            duration: record.duration
          }
          callbacks.onThinkingStep?.(toolStep)
          
          apiDebugLogger.logNote('tool_call', '【UI展示】工具调用步骤', { 
            name: toolCall.function.name, 
            args,
            result 
          }, true)
          
          toolResultMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result
          })
        }
        
        const assistantMessage: any = {
          role: 'assistant',
          content: response.content || '',
          tool_calls: toolCalls.map((tc: any) => ({
            id: tc.id,
            type: tc.type || 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments }
          }))
        }
        
        if (isReasoningModel) {
          assistantMessage.reasoning_content = response.reasoningContent || ''
        } else if (response.reasoningContent) {
          assistantMessage.reasoning_content = response.reasoningContent
        }
        
        filteredMessages.push(assistantMessage)
        filteredMessages.push(...toolResultMessages)
        
        addLog({
          level: 'info', category: 'tool', component: 'aiService',
          event: 'tool_call_complete', message: `第 ${toolRound} 轮工具调用完成`,
          data: { round: toolRound, toolCount: toolCalls.length, toolNames: toolCalls.map(tc => tc.function.name) }
        })
      }
      
      const duration = Date.now() - startTime
      addLog({
        level: 'info', category: 'chat', component: 'aiService',
        event: 'message_complete', message: `对话完成 (${duration}ms)`,
        data: { duration, toolRounds: toolRound, toolCount: toolRecords.length }
      })
      
      endSessionLog()
      
      await apiDebugLogger.flush()
      return { toolRecords }
      
    } catch (error) {
      const duration = Date.now() - startTime
      const errorName = (error as Error).name
      const errorMessage = (error as Error).message
      
      logError(error as Error, '对话处理过程中发生错误')
      endSessionLog()
      
      if (errorName !== 'AbortError') {
        addLog({
          level: 'error', category: 'chat', component: 'aiService',
          event: 'message_error', message: `对话错误: ${errorMessage}`,
          data: { error: errorMessage, stack: (error as Error).stack, duration, type: errorName || 'UnknownError' }
        })
        callbacks.onError(error as Error)
      } else {
        callbacks.onComplete()
      }
      
      await apiDebugLogger.flush()
      return { toolRecords }
    }
  },
  
  // 保留registerTool用于动态注册
  registerTool(name: string, definition: ToolDefinition, executor: (args: Record<string, any>) => Promise<string> | string) {
    import('../tools').then(({ registerTool }) => {
      registerTool(name, definition, executor)
    })
  },
  
  getRegisteredTools(): string[] {
    const { getRegisteredToolNames } = require('../tools')
    return getRegisteredToolNames()
  },
  
  // 获取模型配置信息（用于UI展示）
  getModelCapabilities(modelName: string) {
    const config = getModelConfig(modelName)
    return {
      provider: config.provider,
      supportsVision: config.supportsVision,
      supportsVideo: config.supportsVideo,
      supportsFunctionCalling: config.supportsFunctionCalling,
      maxTokens: config.maxTokens
    }
  }
}
