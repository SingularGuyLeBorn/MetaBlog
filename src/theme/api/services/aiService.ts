/**
 * AI Service - DeepSeek/Kimi API (支持多模态的 Function Call 实现)
 * 
 * 核心流程：
 * 1. 发送用户消息 + tools 定义(支持图片/视频)
 * 2. AI 返回 tool_calls(非流式)
 * 3. 执行工具函数
 * 4. 发送 tool 结果(流式)获取最终回复
 * 
 * 更新：增加Kimi多模态支持(图片/视频理解)
 */
import {
  executeToolWithRecord,
  getToolDefinitions,
  initializeDefaultTools,
  type ToolCall,
  type ToolDefinition
} from '@/theme/tools/index'
import type { ChatMessage, SessionConfig, ThinkingStep, ToolCallRecord } from '@/theme/types'
import { addLog } from './logger'
import { buildKimiImageContent, buildKimiVideoContent } from './multimediaService'
import {
  endSessionLog,
  logError,
  logThinkingStep,
  logUserInput,
  startSessionLog
} from './sessionLogger'

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
    } else if (typeof m.content === 'string') {
      msg.content_length = m.content.length
      msg.content_preview = m.content.substring(0, 2000) + (m.content.length > 2000 ? '...' : '')
    } else {
      // 其他类型(null, undefined, object等)
      msg.content_type = typeof m.content
      msg.content_preview = String(m.content || '').substring(0, 2000)
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

  const contentStr = typeof message.content === 'string' ? message.content : ''
  const reasoningStr = typeof message.reasoning_content === 'string' ? message.reasoning_content : ''

  const simplifiedMessage = message ? {
    role: message.role,
    content_length: contentStr.length,
    content_preview: contentStr.substring(0, 2000) + (contentStr.length > 2000 ? '...' : ''),
    has_reasoning: !!message.reasoning_content,
    reasoning_length: reasoningStr.length,
    reasoning_preview: reasoningStr.substring(0, 1000) + (reasoningStr.length > 1000 ? '...' : ''),
    tool_calls: message.tool_calls?.map((tc: any) => ({
      id: tc.id, name: tc.function?.name,
      arguments_preview: tc.function?.arguments?.substring(0, 500) + (tc.function?.arguments?.length > 500 ? '...' : '')
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

export type ModelProvider = 'deepseek' | 'kimi'

export interface ModelConfig {
  provider: ModelProvider
  model: string
  baseURL: string
  supportsVision: boolean
  supportsVideo: boolean
  supportsFunctionCalling: boolean
  maxTokens: number
  /** 模型总上下文窗口大小(输入+输出) */
  contextWindow: number
}

// 支持的模型配置 - 仅 DeepSeek 和 Kimi
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // DeepSeek V4 模型 - 仅文本输入
  // ═══════════════════════════════════════════════════════════════
  'deepseek-v4-pro': {
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
    baseURL: 'https://api.deepseek.com/v1',
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 1000000
  },
  'deepseek-v4-flash': {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    baseURL: 'https://api.deepseek.com/v1',
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 1000000
  },

  // ═══════════════════════════════════════════════════════════════
  // Kimi K2.5 - 原生多模态（图片+视频）
  // ═══════════════════════════════════════════════════════════════
  'kimi-k2.5': {
    provider: 'kimi',
    model: 'kimi-k2.5',
    baseURL: 'https://api.moonshot.cn/v1',
    supportsVision: true,
    supportsVideo: true,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000
  }
}

// 获取模型配置
function getModelConfig(modelName: string): ModelConfig {
  const config = MODEL_CONFIGS[modelName]
  if (config) {
    return config
  }

  // 如果找不到配置，抛出错误(不再自动推断，确保使用预定义模型)
  throw new Error(`不支持的模型: ${modelName}。请使用 DeepSeek 或 Kimi 系列模型。`)
}


// ==================== 类型定义 ====================

export interface StreamCallbacks {
  onContent: (text: string) => void
  onReasoning: (text: string) => void
  onComplete: () => void
  onError: (error: Error) => void
  onToolRecord?: (record: ToolCallRecord) => void
  onThinkingStep?: (step: ThinkingStep) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  onTokenEstimate?: (estimate: { input: number }) => void
}

// ==================== 多模态消息处理 ====================

/**
 * 从文本中提取 ms://file_id 格式的 Kimi 文件引用
 * 用于识别 readArticle 返回的 vision 图片引用
 */
function extractMsFileIds(content: string): string[] {
  const matches = content.matchAll(/ms:\/\/([a-zA-Z0-9_\-]+)/g)
  return Array.from(new Set(Array.from(matches).map((m) => m[1])))
}

/**
 * 将ChatMessage转换为API消息格式
 * 支持多模态内容(图片、视频)
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
          } catch {
            // blob URL 可能已失效（页面刷新后）或网络异常，静默跳过
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
          } catch {
            // 静默跳过
          }
        }
      }

      baseMsg.content = contentParts
    } else {
      // 模型不支持多模态，只发送文本
      let textContent = message.content || ''
      // 收集图片的 OCR 结果（由 ChatLayout 在发送前写入 attachment.ocrText）
      const ocrTexts: string[] = []
      for (const att of message.attachments) {
        if (att.type === 'image' && att.ocrText) {
          ocrTexts.push(`【图片 "${att.name}" 中的文字】\n${att.ocrText}`)
        }
      }
      if (ocrTexts.length > 0) {
        textContent += '\n\n---\n' + ocrTexts.join('\n\n---\n')
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

  // 检测 ms://file_id（来自 readArticle 的 vision 图片引用）并转换为 vision 输入
  if (modelConfig.supportsVision && typeof baseMsg.content === 'string') {
    const fileIds = extractMsFileIds(baseMsg.content)
    if (fileIds.length > 0) {
      const contentParts: any[] = []
      contentParts.push({ type: 'text', text: baseMsg.content })
      for (const fileId of fileIds) {
        contentParts.push({ type: 'image_url', image_url: { url: `ms://${fileId}` } })
      }
      baseMsg.content = contentParts
    }
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

// ==================== Token 估算(js-tiktoken)====================
import { estimateTextTokens } from '@/theme/utils/tokenEstimator'

/**
 * 智能截断消息 —— 按模型上下文窗口动态调整
 * 
 * 三级策略：
 * 1. 估算总 token，如果在预算内 → 不截断
 * 2. 对 tool 结果按可用空间比例截断(保底 3k 字符，上限按模型定)
 * 3. 如果还超 → 丢弃最早的消息，优先保留最近对话
 */
function smartTruncateMessages(
  messages: any[],
  modelConfig: ModelConfig,
  systemPrompt: string = ''
): any[] {
  const contextWindow = modelConfig.contextWindow
  const outputReserve = modelConfig.maxTokens
  const systemTokens = estimateTextTokens(systemPrompt) + 2000 // 工具定义约 2k tokens
  const safetyMargin = 1000

  // 可用于历史消息的 token 预算
  const availableTokens = contextWindow - outputReserve - systemTokens - safetyMargin

  // 计算当前总估算 token
  const currentTokens = messages.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')
    return sum + estimateTextTokens(text)
  }, 0)

  // 没超预算，原样返回
  if (currentTokens <= availableTokens) {
    return messages
  }

  console.log(`[smartTruncate] 当前 ${currentTokens} tokens > 预算 ${availableTokens}，开始处理`)

  // ═══════════════════════════════════════════════════════════════
  // 第一阶段：截断 tool 结果(通常最长)
  // ═══════════════════════════════════════════════════════════════
  const toolMsgs = messages.filter(m => m.role === 'tool')
  const nonToolMsgs = messages.filter(m => m.role !== 'tool')

  // 非 tool 消息的 token 占用
  const nonToolTokens = nonToolMsgs.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')
    return sum + estimateTextTokens(text)
  }, 0)

  // 给 tool 消息分配的预算(至少留 30% 给 tool)
  const toolBudget = Math.max(availableTokens - nonToolTokens, Math.floor(availableTokens * 0.3))
  const perToolTokens = toolMsgs.length > 0 ? Math.floor(toolBudget / toolMsgs.length) : 0

  // 单条 tool 截断上限：1M 上下文时代，不设固定上限，由 budget 决定
  // 小模型仍保留保护上限防止单条结果撑爆上下文
  const maxToolChars = contextWindow >= 1000000 ? Infinity
    : contextWindow >= 256000 ? 200000
      : contextWindow >= 128000 ? 100000
        : contextWindow >= 64000 ? 50000
          : 20000

  // 保底 12000 字符，不超过上限
  const toolTruncateLimit = Math.max(Math.min(perToolTokens * 3, maxToolChars), 12000)

  let processed = messages.map(m => {
    if (m.role !== 'tool' || typeof m.content !== 'string') return m
    if (m.content.length <= toolTruncateLimit) return m

    return {
      ...m,
      content: m.content.substring(0, toolTruncateLimit) +
        `\n\n---` +
        `\n[历史消息中的工具结果被截断] 原长 ${m.content.length} 字符，当前限制 ${toolTruncateLimit} 字符。` +
        `\n注意：这是之前某次工具调用的返回结果，因上下文长度限制被截断。如需完整信息，请重新调用相关工具。`
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // 第二阶段：检查还超不超，对早期 assistant 消息截断
  // ═══════════════════════════════════════════════════════════════
  const afterToolTokens = processed.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')
    return sum + estimateTextTokens(text)
  }, 0)

  if (afterToolTokens > availableTokens) {
    // 保留最近 8 条(4轮)完整，更早的 assistant 消息保留完整内容
    // 1M 上下文时代，完整信息比碎片更有价值；如仍超预算，第三阶段会丢弃最早消息
    const keepRecent = 8
    const recent = processed.slice(-keepRecent)
    const older = processed.slice(0, -keepRecent)

    processed = [...older, ...recent]
  }

  // ═══════════════════════════════════════════════════════════════
  // 第三阶段：如果还超，逐步丢弃最早的消息
  // ═══════════════════════════════════════════════════════════════
  let finalTokens = processed.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')
    return sum + estimateTextTokens(text)
  }, 0)

  while (finalTokens > availableTokens && processed.length > 6) {
    // 优先丢弃 tool 结果(通常最长且是"过去"的观察)
    const toolIndex = processed.findIndex(m => m.role === 'tool')
    if (toolIndex >= 0 && toolIndex < processed.length - 6) {
      processed.splice(toolIndex, 1)
    } else {
      // 其次丢弃早期的 assistant 消息
      const assistantIndex = processed.findIndex(m => m.role === 'assistant')
      if (assistantIndex >= 0 && assistantIndex < processed.length - 6) {
        processed.splice(assistantIndex, 1)
      } else {
        // 最后只能丢最早的任意消息
        processed.shift()
      }
    }

    finalTokens = processed.reduce((sum, m) => {
      const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')
      return sum + estimateTextTokens(text)
    }, 0)
  }

  console.log(`[smartTruncate] 处理后 ${finalTokens} tokens，保留 ${processed.length}/${messages.length} 条消息`)
  return processed
}

/** @deprecated 兼容旧接口，内部转发到 smartTruncateMessages */
function truncateMessages(messages: any[], maxContentLength: number = 128000): any[] {
  // 旧接口不感知模型，按传入的 maxContentLength 做简单截断
  return messages.map(m => {
    if (typeof m.content !== 'string') return m
    if (m.role === 'tool' && m.content.length > maxContentLength) {
      return {
        ...m,
        content: m.content.substring(0, maxContentLength) +
          `\n\n... [内容已截断，省略 ${m.content.length - maxContentLength} 字符]`
      }
    }
    if (m.role === 'assistant' && m.content.length > maxContentLength * 2) {
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
): Promise<{ content?: string; toolCalls?: ToolCall[]; reasoningContent?: string; error?: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  const modelConfig = getModelConfig(config.model)

  const startTime = Date.now()

  const isReasoningModel = config.model === 'deepseek-v4-pro'
  const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-v4-flash'

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

  // 构建工具定义
  let tools: any[] | undefined
  if (includeTools && modelConfig.supportsFunctionCalling) {
    tools = getToolDefinitions()
  }

  // Kimi K2.5 思考模式与内置工具冲突
  if (config.model === 'kimi-k2.5' && config.enableReasoning) {
    const hasBuiltinTools = includeTools && getToolDefinitions().some((t: ToolDefinition) =>
      t.function.name.startsWith('$')
    )
    if (hasBuiltinTools) {
      config = { ...config, enableReasoning: false }
    }
  }

  const proxyBody = {
    messages: processedMessages,
    config,
    stream: false,
    tools
  }

  logApiRequest('/api/chat (non-stream)', proxyBody)

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyBody)
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      const error = new Error(`HTTP ${response.status}: ${errorText}`)
      logApiError('/api/chat (non-stream)', error, duration, proxyBody)
      return { error: `API Error: ${errorText}` }
    }

    const result = await response.json()
    if (!result.success) {
      return { error: result.error || 'Chat failed' }
    }

    logApiResponse('/api/chat (non-stream)', result.data, duration)

    const data = result.data
    const message = data.choices?.[0]?.message
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

    const usage = data.usage
    return { content: message?.content || '', reasoningContent, usage }
  } catch (error) {
    const duration = Date.now() - startTime
    let errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('Failed to fetch')) {
      errorMessage = `网络请求失败。可能原因: 1) 网络问题 2) 请求体过大。详细信息: ${errorMessage}`
    }
    logApiError('/api/chat (non-stream)', new Error(errorMessage), duration, proxyBody)
    return { error: errorMessage }
  }
}

async function chatStreamInternal(
  messages: any[],
  config: SessionConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  isToolContinuation: boolean = false,
  includeTools: boolean = false,
  toolContext?: {
    agentId?: string
    availableSkills?: string[]
    declaredTools?: string[]
    availableTools?: string[]
  },
  sessionId?: string
): Promise<{ content?: string; toolCalls?: ToolCall[]; reasoningContent?: string; error?: string; aborted?: boolean }> {
  const modelConfig = getModelConfig(config.model)

  const startTime = Date.now()

  const isReasoningModel = config.model === 'deepseek-v4-pro'
  const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-v4-flash'

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

  // 构建工具定义
  let tools: ToolDefinition[] | undefined
  if (includeTools && modelConfig.supportsFunctionCalling) {
    const allDefs = getToolDefinitions()
    if (toolContext?.availableTools) {
      tools = allDefs.filter(d => toolContext.availableTools!.includes(d.function.name))
    } else {
      tools = allDefs
    }
  }

  // Kimi K2.5 思考模式与内置工具冲突
  if (config.model === 'kimi-k2.5' && config.enableReasoning) {
    const hasBuiltinTools = includeTools && getToolDefinitions().some((t: ToolDefinition) =>
      t.function.name.startsWith('$')
    )
    if (hasBuiltinTools) {
      config = { ...config, enableReasoning: false }
    }
  }

  const proxyBody: any = {
    messages: processedMessages,
    config,
    stream: true,
    tools,
    sessionId
  }

  logApiRequest('/api/chat (stream)', proxyBody)

  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let fullReasoning = ''
  let chunkCount = 0
  let toolCalls: any[] = []

  // 流式回调 throttle，避免前端每 1~2 个 token 就重渲染一次
  const CONTENT_THROTTLE_MS = 80
  let lastContentFlush = 0
  let pendingContent = ''
  function flushContent(force = false) {
    if (!pendingContent && !force) return
    const now = Date.now()
    if (!force && now - lastContentFlush < CONTENT_THROTTLE_MS) return
    lastContentFlush = now
    callbacks.onContent(cleanAIOutput(pendingContent))
  }

  // 内部超时控制
  const internalController = new AbortController()
  const onExternalAbort = () => internalController.abort(signal?.reason)
  signal?.addEventListener('abort', onExternalAbort)

  let idleTimer: ReturnType<typeof setTimeout> | null = null
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      internalController.abort(new Error('Stream idle timeout: no data received for 60s'))
    }, 60000)
  }
  function clearIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  const connectionTimer = setTimeout(() => {
    internalController.abort(new Error('Connection timeout: failed to establish stream within 30s'))
  }, 30000)

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(proxyBody),
      signal: internalController.signal
    })

    clearTimeout(connectionTimer)
    resetIdleTimer()

    if (!response.ok) {
      const errorText = await response.text()
      const errorStr = `HTTP ${response.status}: ${errorText}`
      logApiError('/api/chat (stream)', new Error(errorStr), Date.now() - startTime, proxyBody)
      return { error: errorStr }
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is null')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      resetIdleTimer()
      chunkCount++
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          flushContent(true)
          return {
            content: fullContent,
            reasoningContent: fullReasoning,
            toolCalls: toolCalls.length > 0 ? toolCalls.filter(Boolean) : undefined
          }
        }

        try {
          const chunk = JSON.parse(data)

          // 捕获后端注入的 token 估算
          if (chunk.token_estimate && callbacks.onTokenEstimate) {
            callbacks.onTokenEstimate(chunk.token_estimate)
          }

          // 捕获 API 返回的 usage(通常在最后一块中)
          if (chunk.usage && callbacks.onUsage) {
            callbacks.onUsage(chunk.usage)
          }

          const delta = chunk.choices?.[0]?.delta

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index
              if (!toolCalls[idx]) {
                toolCalls[idx] = {
                  id: tc.id,
                  type: tc.type || 'function',
                  function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
                }
              } else {
                if (tc.function?.name) toolCalls[idx].function.name += tc.function.name
                if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments
              }
            }
          }

          if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content
            callbacks.onReasoning(fullReasoning)
          }

          if (delta?.content) {
            fullContent += delta.content
            pendingContent = fullContent
            flushContent()
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 返回最终在流结束时积累的数据(防由于网络结束但未发送[DONE])
    flushContent(true)
    return {
      content: fullContent,
      reasoningContent: fullReasoning,
      toolCalls: toolCalls.length > 0 ? toolCalls.filter(Boolean) : undefined
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    const isAbort = errorObj.name === 'AbortError' || errorObj.message?.toLowerCase().includes('aborted')
    if (isAbort) {
      return {
        content: fullContent,
        reasoningContent: fullReasoning,
        toolCalls: toolCalls.length > 0 ? toolCalls.filter(Boolean) : undefined,
        aborted: true
      }
    }
    logApiError('/api/chat (stream)', errorObj, Date.now() - startTime, proxyBody)
    return { error: errorObj.message }
  } finally {
    clearIdleTimer()
    signal?.removeEventListener('abort', onExternalAbort)
  }
}

// ==================== 主服务 ====================

export const aiService = {
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
    maxToolRounds: number = 100,
    sessionId?: string,
    toolContext?: {
      agentId?: string
      availableSkills?: string[]
      declaredTools?: string[]
      availableTools?: string[]
    }
  ): Promise<{ toolRecords?: ToolCallRecord[]; injectedMessages?: Array<{ role: string; content: string }> }> {
    const toolRecords: ToolCallRecord[] = []
    const startTime = Date.now()

    const debugSessionId = sessionId || `session-${startTime}`
    const modelConfig = getModelConfig(config.model)
    const isReasoningModel = config.model === 'deepseek-v4-pro'
    const isThinkingEnabled = config.enableReasoning && config.model === 'deepseek-v4-flash'
    const isReasoningMode = isReasoningModel || isThinkingEnabled

    apiDebugLogger.startSession(debugSessionId)

    // ═══════════════════════════════════════════════════════════════
    // 【渐进式披露】核心工具列表与动态激活机制
    // ═══════════════════════════════════════════════════════════════
    //
    // 设计背景：
    //   OpenAI 官方建议每轮对话暴露的工具不超过 20 个。
    //   本系统有 80+ 个工具，全部暴露会导致：
    //   - Context bloat(工具定义占 40-50% 上下文)
    //   - LLM 选择困惑(从 80+ 个工具中挑选)
    //   - Token 浪费和响应延迟增加
    //
    // 解决方案：
    //   1. 默认只暴露 ~7 个核心元工具(CORE_TOOL_NAMES)
    //   2. 领域工具默认隐藏，通过以下方式动态激活：
    //      - searchCapabilities 搜索匹配 → 自动暴露 schema
    //      - loadSkill 加载 Skill → 自动暴露关联工具 schema
    //   3. 激活状态保存在 sessionActiveTools(Set)中，跨轮次持久
    //   4. 每轮对话前 buildDynamicToolContext() 合并核心+激活工具
    //
    // 核心工具(始终暴露)：
    const CORE_TOOL_NAMES = [
      'searchCapabilities',   // 能力发现器：搜索并激活匹配工具
      'loadSkill',            // 工作流加载器：加载 Skill 指导+激活工具
      'getAllTools',         // 工具目录浏览(文本形式，不暴露 schema)
      'getAllSkills',        // Skill 目录浏览(文本形式，不暴露 schema)
      'getCurrentTime',      // 通用基础工具
      'calculate',             // 通用基础工具
      'webSearch'             // 通用网络搜索
    ]

    // sessionActiveTools：本轮对话中已动态激活的工具名称集合
    // 
    // 激活触发点：
    // - searchCapabilities 执行后 → result.activateTools 中的工具被加入
    // - loadSkill 执行后 → skill.tools 中的工具被加入
    // - 一旦加入，后续所有轮次都保持可用，直到会话结束
    const sessionActiveTools = new Set<string>()

    /**
     * 构建动态 toolContext
     * 
     * 将外部传入的 toolContext 与 sessionActiveTools 合并，
     * 生成每轮对话实际使用的可用工具列表。
     * 
     * 合并规则：
     * - 如果外部 toolContext 未传入 availableTools，默认使用 CORE_TOOL_NAMES
     * - 将 sessionActiveTools 中的工具追加到基础列表
     * - 使用 Set 去重，避免同一工具重复暴露
     * 
     * @returns 包含 merged availableTools 的 toolContext 对象；
     *          如果外部未传入 toolContext，返回 undefined
     */
    const buildDynamicToolContext = () => {
      if (!toolContext) return undefined
      // 基础工具列表：外部配置优先，未配置则使用核心工具
      const baseTools = toolContext.availableTools || CORE_TOOL_NAMES
      // 合并核心工具 + 会话中动态激活的工具，自动去重
      const merged = [...new Set([...baseTools, ...sessionActiveTools])]
      return {
        ...toolContext,
        availableTools: merged
      }
    }

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

    // 收集所有轮次中需要注入到对话上下文的消息
    const allInjectedMessages: Array<{ role: string; content: string }> = []

    try {
      // 转换消息格式，支持多模态
      const apiMessages: any[] = []

      // 添加系统提示词 (支持 Skills 的渐进式披露)
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

      // 转换每条消息(不再硬编码 slice(-10)，由 smartTruncateMessages 在内部按需截断)
      for (const message of messages) {
        const apiMsg = await convertMessageToApiFormat(message, modelConfig)
        apiMessages.push(apiMsg)
      }

      // 过滤空消息
      let filteredMessages = apiMessages.filter((m: any) => {
        if (m.role === 'assistant') {
          const hasContent = m.content?.trim().length > 0 || Array.isArray(m.content)
          const hasReasoning = m.reasoning_content?.trim().length > 0
          const hasToolCalls = m.tool_calls?.length > 0
          return hasContent || hasReasoning || hasToolCalls
        }
        return true
      })

      if (isReasoningModel) {
        filteredMessages = filteredMessages.map((m: any) => {
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
      let lastResponseContent = ''

      while (hasMoreToolCalls && toolRound < maxToolRounds) {
        toolRound++

        addLog({
          level: 'debug', category: 'chat', component: 'aiService',
          event: 'tool_round_start', message: `第 ${toolRound} 轮工具检测`,
          data: { round: toolRound }
        })

        const dynamicContext = buildDynamicToolContext()
        const hasAnyTools = !!(dynamicContext?.availableTools?.length)
        const response = await chatStreamInternal(filteredMessages, config, callbacks, signal, toolRound > 1, hasAnyTools, dynamicContext, sessionId)

        if (response.aborted) {
          callbacks.onComplete()
          return { toolRecords, injectedMessages: allInjectedMessages }
        }

        if (response.error) {
          callbacks.onError(new Error(response.error))
          return { toolRecords, injectedMessages: allInjectedMessages }
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
            round: toolRound,  // 标记轮次
            index: stepIndex,  // 使用当前索引
            content: currentThinking,
            createdAt: Date.now()
          }
          stepIndex++  // 递增索引
          callbacks.onThinkingStep?.(thinkingStep)

          logThinkingStep(toolRound, 'thinking', currentThinking, {
            stepId: thinkingStep.id,
            stepIndex: thinkingStep.index
          })

          apiDebugLogger.logNote('thinking', '【UI展示】思考步骤', { stepIndex, content: currentThinking }, true)
        }

        const toolCalls = response.toolCalls

        // 处理中间文本(工具调用前 AI 生成的说明文字)
        if (response.content && toolCalls && toolCalls.length > 0) {
          const textStep: ThinkingStep = {
            id: `text_${toolRound}_${Date.now()}_${stepIndex}`,
            type: 'text',
            round: toolRound,
            index: stepIndex,
            content: cleanAIOutput(response.content),
            createdAt: Date.now()
          }
          stepIndex++
          callbacks.onThinkingStep?.(textStep)

          // 清空 content 区域，避免中间文本残留为最终回复
          callbacks.onContent('')

          apiDebugLogger.logNote('intermediate_text', '【UI展示】中间文本', { content: response.content }, true)
        }

        if (!toolCalls || toolCalls.length === 0) {
          // 没有工具调用，直接显示最终回复
          if (response.content) {
            apiDebugLogger.logNote('final_response', '【UI展示】最终回复(流式输出完毕)', { content: response.content }, true)
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
          return { toolRecords, injectedMessages: allInjectedMessages }
        }

        // 达到最大轮次前，记录最后一轮的内容，用于轮次耗尽时给出总结
        if (response.content) {
          lastResponseContent = response.content
        }

        // 执行工具调用
        addLog({
          level: 'info', category: 'tool', component: 'aiService',
          event: 'tool_call_start', message: `开始执行 ${toolCalls.length} 个工具调用`,
          data: { round: toolRound, toolCount: toolCalls.length }
        })

        const toolResultMessages = []
        const injectMessages: Array<{ role: string; content: string }> = []

        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments || '{}')
          const toolStartTime = Date.now()

          const toolStepId = `tool_${toolRound}_${toolStartTime}_${stepIndex}`
          const runningStep: ThinkingStep = {
            id: toolStepId,
            type: 'tool_call',
            round: toolRound,
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
          stepIndex++
          // 先显示 running 状态，让用户立刻看到工具正在执行
          callbacks.onThinkingStep?.(runningStep)

          // 执行工具并获取结果
          // executeToolWithRecord 返回：
          // - result: ToolResult(执行结果)
          // - record: ToolCallRecord(调用记录，用于 UI 展示)
          // - injectMessages: 需要注入对话上下文的额外消息(如 loadSkill 的 Skill 内容)
          // - activateTools: 执行后应动态激活的工具名称列表(渐进式披露关键字段)
          const { result, record, injectMessages: toolInjectMessages, activateTools: toolActivated } = await executeToolWithRecord(toolCall)
          toolRecords.push(record)

          // ─────────────────────────────────────────────────────────────
          // 【渐进式披露】动态工具激活
          // ─────────────────────────────────────────────────────────────
          // searchCapabilities、loadSkill 等元工具执行后，会在 result.activateTools
          // 中返回需要激活的领域工具名称。将这些工具加入 sessionActiveTools，
          // 下轮对话的 buildDynamicToolContext() 会自动将其 schema 暴露给模型。
          //
          // 示例流程：
          //   Round 1: searchCapabilities("github repo") → activateTools: ["githubGetRepo"]
          //   Round 2: buildDynamicToolContext() → availableTools 包含 "githubGetRepo"
          //           → 模型可以调用 githubGetRepo
          if (toolActivated && toolActivated.length > 0) {
            for (const toolName of toolActivated) {
              sessionActiveTools.add(toolName)
            }
            addLog({
              level: 'info', category: 'tool', component: 'aiService',
              event: 'tools_activated', message: `动态激活 ${toolActivated.length} 个工具`,
              data: { activated: toolActivated, totalActive: sessionActiveTools.size }
            })
          }

          // 收集需要注入到对话上下文中的消息
          // 典型场景：loadSkill 执行后，将 Skill 完整内容作为新消息注入，
          // 让模型在下一轮可以看到工作流指导(LOD-2 渐进式披露)
          if (toolInjectMessages && toolInjectMessages.length > 0) {
            injectMessages.push(...toolInjectMessages)
          }

          // 执行完成后创建新的 step 对象(确保 Vue 响应式系统检测到变化)
          const successStep: ThinkingStep = {
            ...runningStep,
            toolRecord: {
              id: toolCall.id,
              name: toolCall.function.name,
              arguments: args,
              result: result,
              status: result.success !== false ? 'success' : 'error',
              startTime: record.startTime,
              endTime: record.endTime,
              duration: record.duration || (Date.now() - toolStartTime)
            }
          }
          callbacks.onThinkingStep?.(successStep)

          apiDebugLogger.logNote('tool_call', '【UI展示】工具调用步骤', {
            name: toolCall.function.name,
            args,
            result
          }, true)

          // 将 ToolResult 转换为字符串
          let resultContent: string
          if (typeof result === 'string') {
            resultContent = result
          } else if (result && typeof result === 'object') {
            if (result.success) {
              // 【关键修复】优先将 data 序列化传给 AI，message 只作为状态提示
              // 之前只传 message 导致 AI 看不到 readArticle 的 content、readFile 的内容等真实数据
              if (result.data !== undefined) {
                const dataStr = typeof result.data === 'string'
                  ? result.data
                  : JSON.stringify(result.data, null, 2)
                resultContent = result.message
                  ? `[${result.message}]\n\n${dataStr}`
                  : dataStr
              } else {
                resultContent = result.message || '操作成功'
              }
            } else {
              resultContent = result.message || result.error || '操作失败'
            }
          } else {
            resultContent = String(result || '')
          }

          // 工具结果截断：单条结果上限大幅提高(1M 上下文时代)
          // loadSkill 的结果通常较短(成功消息)，其完整内容通过 injectMessages 注入
          const MAX_TOOL_RESULT_LENGTH = 100000
          const originalLength = resultContent.length
          if (originalLength > MAX_TOOL_RESULT_LENGTH) {
            resultContent = resultContent.substring(0, MAX_TOOL_RESULT_LENGTH) +
              `\n\n... [内容已截断，原始长度 ${originalLength} 字符]`
          }

          toolResultMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: resultContent
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

        // 注入 loadSkill 等工具返回的额外消息(skill 内容等)
        if (injectMessages.length > 0) {
          for (const msg of injectMessages) {
            filteredMessages.push(msg)
            allInjectedMessages.push(msg)
          }
          addLog({
            level: 'info', category: 'tool', component: 'aiService',
            event: 'inject_messages', message: `注入 ${injectMessages.length} 条额外消息到对话上下文`,
            data: { count: injectMessages.length, roles: injectMessages.map(m => m.role) }
          })
        }

        addLog({
          level: 'info', category: 'tool', component: 'aiService',
          event: 'tool_call_complete', message: `第 ${toolRound} 轮工具调用完成`,
          data: { round: toolRound, toolCount: toolCalls.length, toolNames: toolCalls.map(tc => tc.function.name) }
        })
      }

      // 如果是因为达到 maxToolRounds 而退出循环，尝试再发一次不带 tools 的请求获取最终总结
      if (toolRound >= maxToolRounds && lastResponseContent) {
        addLog({
          level: 'warn', category: 'chat', component: 'aiService',
          event: 'max_rounds_reached', message: `已达到最大工具轮次 (${maxToolRounds})，尝试获取最终回复`,
          data: { maxToolRounds }
        })
        filteredMessages.push({
          role: 'assistant',
          content: lastResponseContent
        })
        filteredMessages.push({
          role: 'user',
          content: '请基于以上搜索结果，直接给出最终回答，不要再调用任何工具。'
        })
        const finalContext = buildDynamicToolContext()
        const finalResponse = await chatStreamInternal(filteredMessages, config, callbacks, signal, true, false, finalContext, sessionId)
        if (!finalResponse.error) {
          if (finalResponse.content) {
            callbacks.onContent(cleanAIOutput(finalResponse.content))
          }
          if (isReasoningMode && finalResponse.reasoningContent) {
            callbacks.onReasoning(fullThinking + '\n\n---\n' + finalResponse.reasoningContent)
          }
        }
      }

      callbacks.onComplete()

      const duration = Date.now() - startTime
      addLog({
        level: 'info', category: 'chat', component: 'aiService',
        event: 'message_complete', message: `对话完成 (${duration}ms)`,
        data: { duration, toolRounds: toolRound, toolCount: toolRecords.length }
      })

      endSessionLog()

      await apiDebugLogger.flush()
      return { toolRecords, injectedMessages: allInjectedMessages }

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
      return { toolRecords, injectedMessages: allInjectedMessages }
    }
  },

  // 保留registerTool用于动态注册
  registerTool(name: string, definition: ToolDefinition, executor: (args: Record<string, any>) => Promise<string> | string) {
    import('../../tools/index').then(({ registerTool }) => {
      registerTool(name, definition, executor)
    })
  },

  getRegisteredTools(): string[] {
    const { getRegisteredToolNames } = require('../../tools/index')
    return getRegisteredToolNames()
  },

  // 获取模型配置信息(用于UI展示)
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
