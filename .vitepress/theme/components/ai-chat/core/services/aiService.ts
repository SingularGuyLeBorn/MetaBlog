/**
 * AI Service - DeepSeek API (简化稳定的 Function Call 实现)
 * 
 * 核心流程：
 * 1. 发送用户消息 + tools 定义
 * 2. AI 返回 tool_calls（非流式）
 * 3. 执行工具函数
 * 4. 发送 tool 结果（流式）获取最终回复
 */
import type { ChatMessage, SessionConfig, MessageRole, ToolCallRecord, ThinkingStep } from '../types'
import { addLog } from './logger'

// ==================== API 调试日志记录器 ====================

interface ApiDebugEntry {
  timestamp: string
  type: 'request' | 'response' | 'error'
  endpoint: string
  round: number
  data: any
}

class ApiDebugLogger {
  private currentSessionId: string | null = null
  private sessionStartTime: number = 0
  private round: number = 0
  private entries: ApiDebugEntry[] = []

  startSession(sessionId: string) {
    // 如果有之前的 session，先保存
    if (this.currentSessionId && this.entries.length > 0) {
      this.flush()
    }
    this.currentSessionId = sessionId
    this.sessionStartTime = Date.now()
    this.round = 0
    this.entries = []
  }

  logRequest(endpoint: string, data: any) {
    this.round++
    this.entries.push({
      timestamp: new Date().toISOString(),
      type: 'request',
      endpoint,
      round: this.round,
      data: JSON.parse(JSON.stringify(data)) // 深拷贝
    })
  }

  logResponse(endpoint: string, data: any) {
    this.entries.push({
      timestamp: new Date().toISOString(),
      type: 'response',
      endpoint,
      round: this.round,
      data: JSON.parse(JSON.stringify(data)) // 深拷贝
    })
  }

  logError(endpoint: string, error: any) {
    this.entries.push({
      timestamp: new Date().toISOString(),
      type: 'error',
      endpoint,
      round: this.round,
      data: {
        message: error.message || String(error),
        stack: error.stack,
        name: error.name
      }
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
      // 发送到服务端保存到文件
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

// 日志辅助函数
function logApiRequest(endpoint: string, data: any) {
  // 记录到详细调试日志
  apiDebugLogger.logRequest(endpoint, data)
  
  // 计算请求体大小
  const bodySize = JSON.stringify(data).length
  
  // 简化消息用于日志显示（避免过长）
  const simplifiedMessages = data.messages?.map((m: any) => {
    const msg: any = {
      role: m.role,
      content_length: m.content?.length || 0
    }
    if (m.tool_calls) {
      msg.tool_calls = m.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name
      }))
    }
    if (m.tool_call_id) {
      msg.tool_call_id = m.tool_call_id
      // tool 消息的内容可能很长，只显示长度
      msg.content_preview = m.content?.substring(0, 100) + (m.content?.length > 100 ? '...' : '')
    } else {
      msg.content_preview = m.content?.substring(0, 200) + (m.content?.length > 200 ? '...' : '')
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
      endpoint,
      model: data.model,
      bodySize,
      messageCount: data.messages?.length,
      hasTools: !!data.tools,
      toolCount: data.tools?.length,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      messages: simplifiedMessages,  // 详细的消息内容
      raw_body: data  // 完整的请求体（用于调试）
    }
  })
}

function logApiResponse(endpoint: string, data: any, duration: number) {
  // 记录到详细调试日志
  apiDebugLogger.logResponse(endpoint, data)
  
  const message = data.choices?.[0]?.message
  const responseSize = JSON.stringify(data).length
  
  // 简化消息用于日志
  const simplifiedMessage = message ? {
    role: message.role,
    content_length: message.content?.length || 0,
    content_preview: message.content?.substring(0, 300) + (message.content?.length > 300 ? '...' : ''),
    has_reasoning: !!message.reasoning_content,
    reasoning_length: message.reasoning_content?.length,
    reasoning_preview: message.reasoning_content?.substring(0, 200) + (message.reasoning_content?.length > 200 ? '...' : ''),
    tool_calls: message.tool_calls?.map((tc: any) => ({
      id: tc.id,
      name: tc.function?.name,
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
      endpoint,
      duration,
      responseSize,
      id: data.id,
      model: data.model,
      hasChoices: !!data.choices,
      choiceCount: data.choices?.length,
      hasToolCalls: !!message?.tool_calls,
      toolCallCount: message?.tool_calls?.length,
      finishReason: data.choices?.[0]?.finish_reason,
      usage: data.usage,
      message: simplifiedMessage,  // 详细的消息预览
      raw_response: data  // 完整的原始响应（用于调试）
    }
  })
}

function logApiError(endpoint: string, error: any, duration?: number, requestData?: any) {
  // 记录到详细调试日志
  apiDebugLogger.logError(endpoint, error)
  
  addLog({
    level: 'error',
    category: 'api',
    component: 'aiService',
    event: 'api_error',
    message: `API Error from ${endpoint}: ${error.message || error}`,
    data: {
      endpoint,
      error: error.message || String(error),
      error_name: error.name,
      stack: error.stack,
      duration,
      type: error.name || 'UnknownError',
      // 记录请求信息以便诊断
      request_summary: requestData ? {
        model: requestData.model,
        message_count: requestData.messages?.length,
        body_size: JSON.stringify(requestData).length
      } : undefined
    }
  })
}

function logToolCall(name: string, args: any, status: 'start' | 'complete' | 'error', result?: any, error?: string, duration?: number) {
  addLog({
    level: status === 'error' ? 'error' : 'info',
    category: 'tool',
    component: 'aiService',
    event: status === 'start' ? 'tool_call_start' : status === 'complete' ? 'tool_call_complete' : 'tool_call_error',
    message: `Tool ${name} ${status}${duration ? ` (${duration}ms)` : ''}`,
    data: {
      toolName: name,
      arguments: args,
      result: status === 'complete' ? (typeof result === 'string' ? result.substring(0, 500) : result) : undefined,
      error,
      duration
    }
  })
}

const API_BASE_URL = 'https://api.deepseek.com/v1'

function getApiKey(): string {
  const key = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (key && !key.includes('your-api-key')) {
    return key
  }
  throw new Error('DeepSeek API Key not configured')
}

export interface StreamCallbacks {
  onContent: (text: string) => void
  onReasoning: (text: string) => void
  onComplete: () => void
  onError: (error: Error) => void
  onToolRecord?: (record: ToolCallRecord) => void
  /** 新增：思考步骤回调（用于分步展示） */
  onThinkingStep?: (step: ThinkingStep) => void
}

/** 清理 AI 输出中的调试标签 */
function cleanAIOutput(content: string): string {
  // 移除所有 DSML 相关标签和调试标记
  return content
    // 移除各种形式的 DSML 标签
    .replace(/<\|DSML\|[^>]*>/g, '')
    .replace(/<\|\/DSML\|[^>]*>/g, '')
    .replace(/\|DSML\|/g, '')
    .replace(/<\|[^|]+\|>/g, '')  // 匹配 <|...|> 格式
    // 移除调试标记
    .replace(/function_calls/g, '')
    .replace(/invoke/g, '')
    .replace(/parameter/g, '')
    // 清理多余空行
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 工具定义 */
interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

/** 工具调用请求 */
interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

type ToolExecutor = (args: Record<string, any>) => Promise<string> | string

const tools: Map<string, { definition: ToolDefinition; executor: ToolExecutor }> = new Map()

function registerTool(name: string, definition: ToolDefinition, executor: ToolExecutor) {
  tools.set(name, { definition, executor })
}

async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  const tool = tools.get(name)
  if (!tool) return `错误：工具 "${name}" 未找到`
  try {
    return await tool.executor(args)
  } catch (error) {
    return `执行错误: ${error instanceof Error ? error.message : String(error)}`
  }
}

function getToolDefinitions(): ToolDefinition[] {
  return Array.from(tools.values()).map(t => t.definition)
}

/** 执行工具并创建记录 */
async function executeToolWithRecord(
  name: string, 
  args: Record<string, any>,
  onRecord?: (record: ToolCallRecord) => void
): Promise<{ result: string; record: ToolCallRecord }> {
  const tool = tools.get(name)
  const startTime = Date.now()
  
  const record: ToolCallRecord = {
    id: `tool_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: tool?.definition.function.description,
    arguments: args,
    result: '',
    status: 'running',
    startTime
  }
  
  // 记录工具调用开始
  logToolCall(name, args, 'start')
  onRecord?.(record)
  
  try {
    addLog({
      level: 'info',
      category: 'tool',
      component: 'aiService',
      event: 'tool_call_start',
      message: `执行工具: ${name}`,
      data: { toolName: name, arguments: args }
    })
    
    const result = await executeTool(name, args)
    const duration = Date.now() - startTime
    
    record.status = 'success'
    record.result = result
    record.endTime = Date.now()
    record.duration = duration
    
    // 记录工具调用成功
    logToolCall(name, args, 'complete', result, undefined, duration)
    onRecord?.(record)
    
    addLog({
      level: 'info',
      category: 'tool',
      component: 'aiService',
      event: 'tool_call_complete',
      message: `工具执行成功: ${name} (${duration}ms)`,
      data: { 
        toolName: name, 
        duration,
        result: typeof result === 'string' ? result : JSON.stringify(result)
      }
    })
    
    return { result, record }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    record.status = 'error'
    record.error = errorMsg
    record.result = `执行错误: ${errorMsg}`
    record.endTime = Date.now()
    record.duration = duration
    
    // 记录工具调用失败
    logToolCall(name, args, 'error', undefined, errorMsg, duration)
    onRecord?.(record)
    
    addLog({
      level: 'error',
      category: 'tool',
      component: 'aiService',
      event: 'tool_call_error',
      message: `工具执行失败: ${name} - ${errorMsg}`,
      data: { 
        toolName: name, 
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
        duration
      }
    })
    
    return { result: record.result, record }
  }
}

/** 非流式请求 */
async function chatNonStream(
  messages: any[],
  config: SessionConfig,
  includeTools: boolean,
  isToolContinuation: boolean = false
): Promise<{ content?: string; toolCalls?: ToolCall[]; reasoningContent?: string; error?: string }> {
  const apiKey = getApiKey()
  const startTime = Date.now()
  
  // 判断思考模式
  const isReasoningModel = config.model === 'deepseek-reasoner'
  const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-chat'
  const isReasoningMode = isReasoningModel || isThinkingEnabled
  
  // 新用户问题开始时：清除之前的 reasoning_content 节省带宽
  // 注意：deepseek-reasoner 模型会自动处理，不需要特殊逻辑
  let processedMessages = messages
  if (isThinkingEnabled && !isToolContinuation) {
    // deepseek-chat 思考模式：清除 reasoning_content
    processedMessages = messages.map((m: any) => {
      if (m.role === 'assistant' && m.reasoning_content) {
        const { reasoning_content, ...rest } = m
        return rest
      }
      return m
    })
  }
  
  const requestBody: any = {
    model: config.model,
    messages: processedMessages,
    max_tokens: config.maxTokens,
    stream: false
  }
  
  // deepseek-reasoner 模型不支持 temperature 等参数（设置也不会生效）
  if (!isReasoningModel) {
    requestBody.temperature = config.temperature
  }
  
  // 在 deepseek-chat 上启用思考模式
  if (isThinkingEnabled) {
    requestBody.thinking = { type: 'enabled' }
  }
  
  if (includeTools) {
    requestBody.tools = getToolDefinitions()
    // 注意：DeepSeek API 不需要 tool_choice 参数
  }

  // 记录请求
  logApiRequest('/chat/completions (non-stream)', requestBody)

  try {
    const requestBodyString = JSON.stringify(requestBody)
    const requestSizeKB = (requestBodyString.length / 1024).toFixed(2)
    
    addLog({
      level: 'debug',
      category: 'api',
      component: 'aiService',
      event: 'api_request_size',
      message: `请求体大小: ${requestSizeKB} KB`,
      data: { sizeKB: requestSizeKB, messageCount: requestBody.messages.length }
    })
    
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: requestBodyString
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
    
    // 提取思考内容（deepseek-reasoner 模型）
    const reasoningContent = message?.reasoning_content
    
    if (message?.tool_calls?.length > 0) {
      // 记录检测到的工具调用
      addLog({
        level: 'info',
        category: 'tool',
        component: 'aiService',
        event: 'tool_call_detected',
        message: `AI 请求调用 ${message.tool_calls.length} 个工具`,
        data: {
          toolNames: message.tool_calls.map((tc: any) => tc.function?.name),
          hasReasoning: !!reasoningContent
        }
      })
      // 同时返回 content（可能是空字符串）和 toolCalls
      return { content: message?.content || '', toolCalls: message.tool_calls, reasoningContent }
    }
    
    return { content: message?.content || '', reasoningContent }
  } catch (error) {
    const duration = Date.now() - startTime
    
    // 诊断 Failed to fetch 错误
    let errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('Failed to fetch')) {
      errorMessage = `网络请求失败 (Failed to fetch)。可能原因: 1) CORS 限制 2) 网络连接问题 3) 请求体过大 4) API 服务不可用。详细信息: ${errorMessage}`
      
      // 检查请求体大小
      try {
        const bodySize = JSON.stringify(requestBody).length
        if (bodySize > 100 * 1024) {
          errorMessage += ` [请求体过大: ${(bodySize/1024).toFixed(2)}KB]`
        }
      } catch {}
    }
    
    logApiError('/chat/completions (non-stream)', new Error(errorMessage), duration, requestBody)
    return { error: errorMessage }
  }
}

/** 流式请求 */
async function chatStreamInternal(
  messages: any[],
  config: SessionConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  isToolContinuation: boolean = false
): Promise<void> {
  const apiKey = getApiKey()
  const startTime = Date.now()
  
  // 判断思考模式
  const isReasoningModel = config.model === 'deepseek-reasoner'
  const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-chat'
  const isReasoningMode = isReasoningModel || isThinkingEnabled
  
  // 新用户问题开始时：清除之前的 reasoning_content 节省带宽
  // 注意：deepseek-reasoner 模型会自动处理，不需要特殊逻辑
  let processedMessages = messages
  if (isThinkingEnabled && !isToolContinuation) {
    // deepseek-chat 思考模式：清除 reasoning_content
    processedMessages = messages.map((m: any) => {
      if (m.role === 'assistant' && m.reasoning_content) {
        const { reasoning_content, ...rest } = m
        return rest
      }
      return m
    })
  }
  
  const requestBody: any = {
    model: config.model,
    messages: processedMessages,
    max_tokens: config.maxTokens,
    stream: true
  }
  
  // deepseek-reasoner 模型不支持 temperature
  if (!isReasoningModel) {
    requestBody.temperature = config.temperature
  }
  
  // 在 deepseek-chat 上启用思考模式
  if (isThinkingEnabled) {
    requestBody.thinking = { type: 'enabled' }
  }
  
  // 记录流式请求
  logApiRequest('/chat/completions (stream)', requestBody)

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let fullReasoning = ''
  let chunkCount = 0

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      const error = new Error(`HTTP ${response.status}: ${errorText}`)
      logApiError('/chat/completions (stream)', error, Date.now() - startTime, requestBody)
      throw new Error(`API Error: ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is null')
    }

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
          const duration = Date.now() - startTime
          addLog({
            level: 'debug',
            category: 'api',
            component: 'aiService',
            event: 'api_response',
            message: `Stream completed (${duration}ms, ${chunkCount} chunks)`,
            data: {
              endpoint: '/chat/completions (stream)',
              duration,
              chunkCount,
              contentLength: fullContent.length,
              reasoningLength: fullReasoning.length
            }
          })
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
            // 清理 DSML 调试标签
            const cleaned = cleanAIOutput(fullContent)
            callbacks.onContent(cleaned)
          }
        } catch (parseError) {
          // 记录解析错误但不中断流
          addLog({
            level: 'warn',
            category: 'api',
            component: 'aiService',
            event: 'api_response',
            message: 'Failed to parse SSE chunk',
            data: { line: line.substring(0, 200), error: String(parseError) }
          })
        }
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorObj = error instanceof Error ? error : new Error(String(error))
    
    // 诊断 Failed to fetch 错误
    let errorMessage = errorObj.message
    let errorType = errorObj.name
    
    if (errorObj.name === 'TypeError' && errorObj.message.includes('fetch')) {
      errorType = 'NetworkError'
      errorMessage = `网络请求失败 (Failed to fetch)。可能原因: 1) CORS 限制 2) 网络连接问题 3) 请求体过大 4) API 服务不可用。原始错误: ${errorObj.message}`
      
      // 检查请求体大小
      try {
        const bodySize = JSON.stringify(requestBody).length
        if (bodySize > 100 * 1024) {
          errorMessage += ` [请求体过大: ${(bodySize/1024).toFixed(2)}KB]`
        }
      } catch {}
    }
    
    // 详细记录流式错误
    addLog({
      level: 'error',
      category: 'api',
      component: 'aiService',
      event: 'api_error',
      message: `Stream error after ${duration}ms: ${errorMessage}`,
      data: {
        endpoint: '/chat/completions (stream)',
        error: errorMessage,
        name: errorObj.name,
        stack: errorObj.stack,
        duration,
        contentReceived: fullContent.length,
        chunksReceived: chunkCount,
        type: errorType
      }
    })
    
    logApiError('/chat/completions (stream)', new Error(errorMessage), duration, requestBody)
    throw new Error(errorMessage)
  }

  callbacks.onComplete()
}

/** 思考模式下的流式请求 - 同时处理 reasoning_content 和 content */
async function chatStreamWithReasoning(
  messages: any[],
  config: SessionConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  isToolContinuation: boolean = false
): Promise<void> {
  const apiKey = getApiKey()
  const startTime = Date.now()
  
  const isReasoningModel = config.model === 'deepseek-reasoner'
  const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-chat'
  
  // 处理消息：保留 reasoning_content（思考模式下不能清除）
  let processedMessages = messages
  if (isReasoningModel && !isToolContinuation) {
    // deepseek-reasoner：确保所有 assistant 消息有 reasoning_content
    processedMessages = messages.map((m: any) => {
      if (m.role === 'assistant') {
        return { ...m, reasoning_content: m.reasoning_content || '' }
      }
      return m
    })
  }
  
  const requestBody: any = {
    model: config.model,
    messages: processedMessages,
    max_tokens: config.maxTokens,
    stream: true
  }
  
  if (!isReasoningModel) {
    requestBody.temperature = config.temperature
  }
  
  if (isThinkingEnabled) {
    requestBody.thinking = { type: 'enabled' }
  }
  
  logApiRequest('/chat/completions (stream-reasoning)', requestBody)

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let fullReasoning = ''
  let hasReceivedContent = false
  let hasReceivedReasoning = false
  let hasCreatedFinalStep = false

  try {
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
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
          
          // 处理思考内容（reasoning_content）
          if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content
            hasReceivedReasoning = true
            callbacks.onReasoning(fullReasoning)
          }
          
          // 处理正文内容（content）
          if (delta?.content) {
            // 第一次收到 content 时，创建最终思考步骤
            if (!hasCreatedFinalStep && fullReasoning) {
              hasCreatedFinalStep = true
              const finalStep: ThinkingStep = {
                id: `step_${Date.now()}_final`,
                type: 'thinking',
                index: Date.now(), // 使用 timestamp 作为 index，确保排在最后
                content: fullReasoning,
                createdAt: Date.now()
              }
              callbacks.onThinkingStep?.(finalStep)
            }
            
            fullContent += delta.content
            hasReceivedContent = true
            const cleaned = cleanAIOutput(fullContent)
            callbacks.onContent(cleaned)
          }
        } catch (parseError) {
          // 忽略解析错误
        }
      }
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    logApiError('/chat/completions (stream-reasoning)', errorObj, Date.now() - startTime, requestBody)
    throw errorObj
  }

  callbacks.onComplete()
}

/** 主服务 - 官方模式实现（思考过程中嵌入工具调用） */
export const aiService = {
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
    maxToolRounds: number = 10,
    sessionId?: string
  ): Promise<{ toolRecords?: ToolCallRecord[] }> {
    const toolRecords: ToolCallRecord[] = []
    const startTime = Date.now()
    
    // 启动 API 调试日志 session
    const debugSessionId = sessionId || `session_${startTime}`
    apiDebugLogger.startSession(debugSessionId)
    
    addLog({
      level: 'info',
      category: 'chat',
      component: 'aiService',
      event: 'message_start',
      message: `开始新对话，模型: ${config.model}`,
      data: {
        model: config.model,
        messageCount: messages.length,
        hasSystemPrompt: !!config.systemPrompt,
        debugSessionId
      }
    })
    
    try {
      // 保留最近 10 条消息
      const currentMessages = messages.slice(-10)
      
      // 判断思考模式
      const isReasoningModel = config.model === 'deepseek-reasoner'
      const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-chat'
      const isReasoningMode = isReasoningModel || isThinkingEnabled
      
      // 构建 API 消息
      let apiMessages: any[] = [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        ...currentMessages.map(m => {
          const baseMsg: any = {
            role: m.role,
            content: m.content
          }
          if (m.role === 'assistant') {
            if (m.reasoning?.content) {
              baseMsg.reasoning_content = m.reasoning.content
            }
            if (m.metadata?.toolCalls?.length) {
              baseMsg.tool_calls = m.metadata.toolCalls
            }
          }
          if (m.role === 'tool' && m.metadata?.toolCallId) {
            baseMsg.tool_call_id = m.metadata.toolCallId
          }
          return baseMsg
        })
      ]
      
      // 过滤空消息
      apiMessages = apiMessages.filter((m: any) => {
        if (m.role === 'assistant') {
          const hasContent = m.content?.trim().length > 0
          const hasReasoning = m.reasoning_content?.trim().length > 0
          const hasToolCalls = m.tool_calls?.length > 0
          return hasContent || hasReasoning || hasToolCalls
        }
        return true
      })
      
      // 确保 reasoning_content 字段存在
      if (isReasoningModel) {
        apiMessages = apiMessages.map((m: any) => {
          if (m.role === 'assistant') {
            return { ...m, reasoning_content: m.reasoning_content || '' }
          }
          return m
        })
      }
      
      // ====== 官方模式：工具调用阶段非流式，最终回复支持流式 ======
      let toolRound = 0
      let hasMoreToolCalls = true
      let fullThinking = ''  // 完整的思考过程
      let stepIndex = 0      // 思考步骤序号
      let toolStepIndex = 0  // 工具步骤序号（用于生成唯一ID）
      
      while (hasMoreToolCalls && toolRound < maxToolRounds) {
        toolRound++
        
        addLog({
          level: 'debug',
          category: 'chat',
          component: 'aiService',
          event: 'tool_round_start',
          message: `第 ${toolRound} 轮工具检测`,
          data: { round: toolRound }
        })
        
        // ====== 工具检测必须用非流式（官方要求）======
        const response = await chatNonStream(apiMessages, config, true, toolRound > 1)
        
        if (response.error) {
          callbacks.onError(new Error(response.error))
          return { toolRecords }
        }
        
        // 添加本轮的思考内容作为步骤
        if (response.reasoningContent) {
          if (fullThinking) {
            fullThinking += '\n\n'
          }
          fullThinking += response.reasoningContent
          callbacks.onReasoning(fullThinking)
          
          // 创建思考步骤
          const thinkingStep: ThinkingStep = {
            id: `step_${Date.now()}_${stepIndex}`,
            type: 'thinking',
            index: stepIndex++,
            content: response.reasoningContent,
            createdAt: Date.now()
          }
          callbacks.onThinkingStep?.(thinkingStep)
        }
        
        const toolCalls = response.toolCalls
        
        // 如果没有工具调用
        if (!toolCalls || toolCalls.length === 0) {
          // 如果是第一轮且无工具，直接输出（流式或非流式）
          if (toolRound === 1) {
            if (config.streaming) {
              // 第一轮无工具，直接流式输出
              await chatStreamInternal(apiMessages, config, callbacks, signal, false)
            } else {
              // 非流式：直接显示已经拿到的回复
              if (response.content) {
                callbacks.onContent(cleanAIOutput(response.content))
              }
              if (isReasoningMode && response.reasoningContent) {
                callbacks.onReasoning(response.reasoningContent)
              }
              callbacks.onComplete()
            }
            
            // 记录完成
            const duration = Date.now() - startTime
            addLog({
              level: 'info',
              category: 'chat',
              component: 'aiService',
              event: 'message_complete',
              message: `对话完成 (${duration}ms)`,
              data: { 
                duration, 
                toolRounds: 0,
                toolCount: 0
              }
            })
            
            await apiDebugLogger.flush()
            return { toolRecords }
          }
          
          // 后续轮次无工具：说明工具执行已完成，统一在循环外获取最终回复
          hasMoreToolCalls = false
          addLog({
            level: 'debug',
            category: 'chat',
            component: 'aiService',
            event: 'message_stream',
            message: '工具执行完成，准备获取最终回复',
            data: { round: toolRound }
          })
          break
        }
        
        // 执行所有工具调用
        addLog({
          level: 'info',
          category: 'tool',
          component: 'aiService',
          event: 'tool_call_start',
          message: `开始执行 ${toolCalls.length} 个工具调用`,
          data: { round: toolRound, toolCount: toolCalls.length }
        })
        
        // 执行所有工具调用（严格按照官方文档格式）
        const toolResultMessages = []
        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments || '{}')
          
          // 创建工具步骤
          const toolStep: ThinkingStep = {
            id: `step_${Date.now()}_${toolStepIndex++}`,
            type: 'tool_call',
            index: stepIndex++,
            toolRecord: {
              id: toolCall.id,
              name: toolCall.function.name,
              arguments: args,
              result: '',
              status: 'running',
              startTime: Date.now()
            },
            createdAt: Date.now()
          }
          callbacks.onThinkingStep?.(toolStep)
          
          const { result, record } = await executeToolWithRecord(
            toolCall.function.name, 
            args,
            callbacks.onToolRecord
          )
          toolRecords.push(record)
          
          // 更新工具步骤为完成状态
          toolStep.toolRecord = { ...record, status: 'success' }
          callbacks.onThinkingStep?.(toolStep)
          
          // 官方 tool 消息格式：只有 role, tool_call_id, content
          toolResultMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result
          })
        }
        
        // 构建下一轮请求的消息（严格按照官方文档）
        // 官方示例: messages.append(response.choices[0].message)
        // 包含 role, content, reasoning_content, tool_calls
        const assistantMessage: any = {
          role: 'assistant',
          content: response.content || '',  // API 返回的 content
          tool_calls: toolCalls.map((tc: any) => ({
            id: tc.id,
            type: tc.type || 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))
        }
        
        // 思考模式下必须回传 reasoning_content（官方文档关键要求）
        // deepseek-reasoner 模型要求该字段必须存在（即使是空字符串）
        if (isReasoningModel) {
          assistantMessage.reasoning_content = response.reasoningContent || ''
        } else if (response.reasoningContent) {
          assistantMessage.reasoning_content = response.reasoningContent
        }
        
        // 按顺序追加消息：先 assistant 消息，再 tool 结果
        apiMessages.push(assistantMessage)
        apiMessages.push(...toolResultMessages)
        
        // 记录本轮工具调用完成
        addLog({
          level: 'info',
          category: 'tool',
          component: 'aiService',
          event: 'tool_call_complete',
          message: `第 ${toolRound} 轮工具调用完成，${toolCalls.length} 个工具执行成功`,
          data: { 
            round: toolRound, 
            toolCount: toolCalls.length,
            toolNames: toolCalls.map(tc => tc.function.name),
            toolRecords: toolRecords.map(r => ({
              id: r.id,
              name: r.name,
              status: r.status,
              duration: r.duration
            }))
          }
        })
      }
      
      // 最后获取 AI 回复
      // 根据配置决定是否使用流式输出
      addLog({
        level: 'info',
        category: 'chat',
        component: 'aiService',
        event: 'message_stream',
        message: `所有工具执行完成，获取最终回复 (${config.streaming ? '流式' : '非流式'})`,
        data: { 
          totalRounds: toolRound, 
          totalToolCalls: toolRecords.length,
          finalMessageCount: apiMessages.length,
          streaming: config.streaming
        }
      })
      
      // 思考模式下的流式输出需要特殊处理
      // 因为思考模式的流式响应同时包含 reasoning_content 和 content
      if (config.streaming) {
        if (isReasoningMode) {
          // 思考模式：使用增强的流式处理，支持 reasoning + content 混合输出
          // 传入已累积的思考内容作为基础
          await chatStreamWithReasoning(
            apiMessages, 
            config, 
            {
              ...callbacks,
              // 包装 onReasoning 以累积之前的思考内容
              onReasoning: (newReasoning: string) => {
                // 将新的思考内容追加到累积的思考中
                if (fullThinking && !newReasoning.startsWith(fullThinking)) {
                  const combined = fullThinking + '\n\n[最终思考]\n' + newReasoning
                  callbacks.onReasoning(combined)
                } else {
                  callbacks.onReasoning(newReasoning)
                }
              }
            }, 
            signal, 
            toolRecords.length > 0
          )
        } else {
          // 普通模式：标准流式输出
          await chatStreamInternal(apiMessages, config, callbacks, signal, toolRecords.length > 0)
        }
      } else {
        // 非流式输出
        const finalResponse = await chatNonStream(apiMessages, config, false, toolRecords.length > 0)
        
        if (finalResponse.error) {
          throw new Error(finalResponse.error)
        }
        
        // 思考模式下，非流式响应可能包含 reasoning_content
        if (isReasoningMode && finalResponse.reasoningContent) {
          if (fullThinking) {
            fullThinking += '\n\n[最终思考]\n' + finalResponse.reasoningContent
          } else {
            fullThinking = finalResponse.reasoningContent
          }
          callbacks.onReasoning(fullThinking)
          
          // 创建最终思考步骤
          const finalStep: ThinkingStep = {
            id: `step_${Date.now()}_final`,
            type: 'thinking',
            index: stepIndex++,
            content: finalResponse.reasoningContent,
            createdAt: Date.now()
          }
          callbacks.onThinkingStep?.(finalStep)
        }
        
        // 触发回调显示内容
        if (finalResponse.content) {
          callbacks.onContent(cleanAIOutput(finalResponse.content))
        }
        callbacks.onComplete()
      }
      
      // 记录完成
      const duration = Date.now() - startTime
      addLog({
        level: 'info',
        category: 'chat',
        component: 'aiService',
        event: 'message_complete',
        message: `对话完成 (${duration}ms)`,
        data: { 
          duration, 
          toolRounds: toolRound,
          toolCount: toolRecords.length
        }
      })
      
      // 保存 API 调试日志
      await apiDebugLogger.flush()
      
      return { toolRecords }
      
    } catch (error) {
      const duration = Date.now() - startTime
      const errorName = (error as Error).name
      const errorMessage = (error as Error).message
      
      if (errorName !== 'AbortError') {
        addLog({
          level: 'error',
          category: 'chat',
          component: 'aiService',
          event: 'message_error',
          message: `对话错误: ${errorMessage}`,
          data: { 
            error: errorMessage,
            stack: (error as Error).stack,
            duration,
            type: errorName || 'UnknownError'
          }
        })
        callbacks.onError(error as Error)
      } else {
        callbacks.onComplete()
      }
      
      // 即使出错也保存 API 调试日志（包含错误信息）
      await apiDebugLogger.flush()
      
      return { toolRecords }
    }
  },
  
  registerTool(name: string, definition: ToolDefinition, executor: ToolExecutor) {
    registerTool(name, definition, executor)
  },
  
  getRegisteredTools(): string[] {
    return Array.from(tools.keys())
  }
}

// ============ 工具实现 ============

/**
 * 获取文章内容
 */
async function getArticleContent(args: Record<string, any>): Promise<string> {
  const path = args.path as string
  const maxLength = args.max_length as number | undefined
  try {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent('sections/' + path)}`)
    if (!response.ok) {
      return `错误：无法读取文章 ${path}`
    }
    let content = await response.text()
    // 清理 frontmatter
    content = content.replace(/^---[\s\S]*?---/, '').trim()
    
    // 强制限制内容长度，避免消息过长导致 API 请求失败
    // 默认 1500 字符，最大不超过 3000（防止请求体超过 8KB）
    const limit = Math.min(maxLength || 1500, 3000)
    if (content.length > limit) {
      content = content.substring(0, limit) + `\n\n...（内容已截断，共 ${content.length} 字符，显示前 ${limit} 字符）`
    }
    
    return content
  } catch (error) {
    return `错误：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 搜索文章
 */
async function searchArticles(args: Record<string, any>): Promise<string> {
  const query = args.query as string
  const limit = args.limit as number | undefined
  try {
    const response = await fetch(`/api/articles/search?q=${encodeURIComponent(query)}&limit=${limit || 5}`)
    if (!response.ok) {
      return fallbackSearch(query, limit || 5)
    }
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) {
      return '未找到相关文章'
    }
    return result.data.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    ).join('\n')
  } catch (error) {
    return fallbackSearch(query, limit || 5)
  }
}

/**
 * 本地搜索回退
 */
async function fallbackSearch(query: string, limit: number): Promise<string> {
  try {
    const response = await fetch('/api/articles/list-all')
    if (!response.ok) return '搜索功能暂时不可用'
    
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) return '暂无文章数据'
    
    const lowerQuery = query.toLowerCase()
    const matches = result.data.filter((a: any) => 
      a.title?.toLowerCase().includes(lowerQuery) ||
      a.path?.toLowerCase().includes(lowerQuery)
    ).slice(0, limit)
    
    if (matches.length === 0) return `未找到与 "${query}" 相关的文章`
    
    return matches.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    ).join('\n')
  } catch {
    return '搜索功能暂时不可用'
  }
}

/**
 * 列出所有文章
 */
async function listArticles(args: Record<string, any>): Promise<string> {
  const section = args.section as string | undefined
  const limit = args.limit as number | undefined
  try {
    const response = await fetch('/api/articles/list-all')
    if (!response.ok) return '无法获取文章列表'
    
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) return '暂无文章'
    
    let articles = result.data
    if (section) {
      articles = articles.filter((a: any) => a.section === section)
    }
    
    // 默认限制返回数量，避免消息过长
    const actualLimit = limit || 20
    articles = articles.slice(0, actualLimit)
    
    const lines = articles.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    )
    
    // 如果还有更多文章，添加提示
    if (result.data.length > actualLimit) {
      lines.push(`\n... 还有 ${result.data.length - actualLimit} 篇文章未显示`)
    }
    
    return lines.join('\n')
  } catch (error) {
    return `错误：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 创建新文章
 */
async function createArticle(args: Record<string, any>): Promise<string> {
  const { title, path: articlePath, content = '' } = args
  
  addLog({
    level: 'info',
    category: 'tool',
    component: 'createArticle',
    message: `开始创建文章: ${title}`,
    data: { title, path: articlePath, contentLength: content.length }
  })
  
  try {
    const response = await fetch('/api/articles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, path: articlePath, content })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      addLog({
        level: 'error',
        category: 'tool',
        component: 'createArticle',
        message: `HTTP 错误: ${response.status}`,
        data: { status: response.status, error: errorText }
      })
      return `创建失败：HTTP ${response.status} - ${errorText}`
    }
    
    const result = await response.json()
    if (!result.success) {
      addLog({
        level: 'error',
        category: 'tool',
        component: 'createArticle',
        message: `创建文章失败: ${result.error}`,
        data: { title, path: articlePath, error: result.error }
      })
      return `创建失败：${result.error || '未知错误'}`
    }
    
    addLog({
      level: 'info',
      category: 'tool',
      component: 'createArticle',
      message: `文章创建成功: ${result.data?.path}`,
      data: { title, path: result.data?.path, fullPath: result.data?.fullPath }
    })
    
    return `✅ 文章创建成功！\n📄 标题：${title}\n📁 路径：${result.data?.path || articlePath}`
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const isNetworkError = error instanceof TypeError && errorMsg.includes('fetch')
    
    addLog({
      level: 'error',
      category: 'tool',
      component: 'createArticle',
      message: `创建文章异常: ${errorMsg}`,
      data: { 
        title, 
        path: articlePath, 
        error: errorMsg, 
        isNetworkError,
        stack: error instanceof Error ? error.stack : undefined 
      }
    })
    
    if (isNetworkError) {
      return `❌ 网络错误：无法连接到后端服务器\n\n可能原因：\n1. 后端服务未启动\n2. 网络连接中断\n3. 请求超时\n\n请检查：\n- 确保 VitePress 开发服务器正常运行\n- 检查浏览器控制台网络日志\n- 尝试刷新页面后重试`
    }
    
    return `❌ 创建失败：${errorMsg}`
  }
}

/**
 * 更新文章
 */
async function updateArticle(args: Record<string, any>): Promise<string> {
  const { path: articlePath, content } = args
  try {
    const response = await fetch('/api/articles/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath, content })
    })
    
    const result = await response.json()
    if (!result.success) {
      return `更新失败：${result.error || '未知错误'}`
    }
    
    return `✅ 文章更新成功！\n📁 路径：${articlePath}\n📝 字数：${content.length}`
  } catch (error) {
    return `更新失败：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 删除文章
 */
async function deleteArticle(args: Record<string, any>): Promise<string> {
  const { path: articlePath } = args
  try {
    const response = await fetch('/api/articles/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath })
    })
    
    const result = await response.json()
    if (!result.success) {
      return `删除失败：${result.error || '未知错误'}`
    }
    
    return `✅ 文章已删除：${articlePath}`
  } catch (error) {
    return `删除失败：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取当前时间
 */
function getCurrentTime(): string {
  return new Date().toISOString()
}

/**
 * 测试回声工具
 */
async function testEcho(args: Record<string, any>): Promise<string> {
  const ts = new Date().toLocaleString('zh-CN')
  return `🎯 工具调用成功\n📅 ${ts}\n📨 "${args.message}"\n🔢 重复: ${args.repeat_count || 1}`
}

// ============ 注册工具 ============

registerTool('get_article_content', {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的内容。仅在用户要求"查看某篇文章"、"读取某篇文章"或需要基于已有文章内容回答时使用。不要主动调用此工具。',
    parameters: {
      type: 'object',
      properties: { 
        path: { 
          type: 'string', 
          description: '文章路径，例如 "knowledge/getting-started.md"' 
        },
        max_length: {
          type: 'number',
          description: '最大返回字符数，默认8000，避免消息过长'
        }
      },
      required: ['path']
    }
  }
}, getArticleContent)

registerTool('search_articles', {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '根据关键词搜索文章',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: '搜索关键词，例如 "深度学习"' 
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认5条' 
        }
      },
      required: ['query']
    }
  }
}, searchArticles)

registerTool('list_articles', {
  type: 'function',
  function: {
    name: 'list_articles',
    description: '列出文章列表，可按分类筛选。仅在用户询问"有哪些文章"、"文章列表"或需要查找特定文章时使用。不要主动调用此工具。',
    parameters: {
      type: 'object',
      properties: {
        section: { 
          type: 'string', 
          description: '可选：按分类筛选，例如 "knowledge"、"posts"' 
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认20，最大50' 
        }
      },
      required: []
    }
  }
}, listArticles)

registerTool('create_article', {
  type: 'function',
  function: {
    name: 'create_article',
    description: `创建一篇新文章。当用户明确要求创建文章、写博客、新建文档时使用。

重要提示：
- path 参数必须包含文件夹和文件名，格式为 "section/filename.md"
- 例如："knowledge/transformer-detailed.md" 会在 knowledge 文件夹下创建 transformer-detailed.md
- 如果用户没有指定 section，默认使用 "knowledge" 或 "posts"
- 标题应该简洁明了，反映文章主题
- 不要主动调用此工具，除非用户明确要求创建文章`,
    parameters: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: '文章标题，例如 "Transformer 详解"' 
        },
        path: { 
          type: 'string', 
          description: '文章完整路径，格式为 "section/filename.md"，例如 "knowledge/transformer-detailed.md"' 
        },
        content: { 
          type: 'string', 
          description: '文章内容（支持 Markdown），可以包含标题、段落、代码块等' 
        }
      },
      required: ['title', 'path']
    }
  }
}, createArticle)

registerTool('update_article', {
  type: 'function',
  function: {
    name: 'update_article',
    description: '更新/修改已有文章的内容。当用户要求编辑、修改、更新文章时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '文章路径，例如 "posts/existing-article.md"' 
        },
        content: { 
          type: 'string', 
          description: '新的文章内容（完整替换）' 
        }
      },
      required: ['path', 'content']
    }
  }
}, updateArticle)

registerTool('delete_article', {
  type: 'function',
  function: {
    name: 'delete_article',
    description: '删除文章。当用户要求删除、移除文章时使用。此操作不可逆！',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '要删除的文章路径' 
        }
      },
      required: ['path']
    }
  }
}, deleteArticle)

registerTool('get_current_time', {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: '获取当前系统时间。当用户询问"现在几点"、"当前时间"、"今天日期"等时间相关问题时，必须调用此工具获取准确时间。',
    parameters: { type: 'object', properties: {} }
  }
}, getCurrentTime)

registerTool('test_echo', {
  type: 'function',
  function: {
    name: 'test_echo',
    description: '【测试专用】回声工具，验证工具调用是否正常工作。当用户说"测试工具"时使用。',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '要回显的消息' },
        repeat_count: { type: 'number', description: '重复次数' }
      },
      required: ['message']
    }
  }
}, testEcho)
