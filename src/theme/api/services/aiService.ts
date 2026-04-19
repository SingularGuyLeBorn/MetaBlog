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
import type { ChatMessage, SessionConfig, MessageRole, ToolCallRecord, ThinkingStep } from '@/theme/types'
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
} from '@/theme/tools/index'
import { 
  type SkillMetadata,
  type ActiveSkill
} from '@/theme/skills/index'
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
    } else if (typeof m.content === 'string') {
      msg.content_length = m.content.length
      msg.content_preview = m.content.substring(0, 200) + (m.content.length > 200 ? '...' : '')
    } else {
      // 其他类型（null, undefined, object等）
      msg.content_type = typeof m.content
      msg.content_preview = String(m.content || '').substring(0, 200)
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
    content_preview: contentStr.substring(0, 300) + (contentStr.length > 300 ? '...' : ''),
    has_reasoning: !!message.reasoning_content,
    reasoning_length: reasoningStr.length,
    reasoning_preview: reasoningStr.substring(0, 200) + (reasoningStr.length > 200 ? '...' : ''),
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

export type ModelProvider = 'deepseek' | 'kimi'

export interface ModelConfig {
  provider: ModelProvider
  model: string
  baseURL: string
  apiKey: string
  supportsVision: boolean
  supportsVideo: boolean
  supportsFunctionCalling: boolean
  maxTokens: number
  /** 模型总上下文窗口大小（输入+输出） */
  contextWindow: number
}

// 支持的模型配置 - 仅 DeepSeek 和 Kimi
const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // DeepSeek 模型
  // ═══════════════════════════════════════════════════════════════
  'deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 128000
  },
  'deepseek-reasoner': {
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 64000,
    contextWindow: 128000
  },
  
  // ═══════════════════════════════════════════════════════════════
  // Kimi (Moonshot) 模型 - 支持多模态
  // ═══════════════════════════════════════════════════════════════
  // K2.5 系列 - 最新多模态模型
  'kimi-k2.5': {
    provider: 'kimi',
    model: 'kimi-k2.5',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000
  },
  // K2 Turbo 预览版
  'kimi-k2-turbo-preview': {
    provider: 'kimi',
    model: 'kimi-k2-turbo-preview',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000
  },
  // K2 思考模式
  'kimi-k2-thinking': {
    provider: 'kimi',
    model: 'kimi-k2-thinking',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000
  },
  // K2 思考模式 Turbo
  'kimi-k2-thinking-turbo': {
    provider: 'kimi',
    model: 'kimi-k2-thinking-turbo',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000
  },
  // Vision 预览版系列
  'moonshot-v1-8k-vision-preview': {
    provider: 'kimi',
    model: 'moonshot-v1-8k-vision-preview',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 8192
  },
  'moonshot-v1-32k-vision-preview': {
    provider: 'kimi',
    model: 'moonshot-v1-32k-vision-preview',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 32000,
    contextWindow: 32000
  },
  'moonshot-v1-128k-vision-preview': {
    provider: 'kimi',
    model: 'moonshot-v1-128k-vision-preview',
    baseURL: 'https://api.moonshot.cn/v1',
    apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 128000,
    contextWindow: 128000
  }
}

// 获取模型配置
function getModelConfig(modelName: string): ModelConfig {
  const config = MODEL_CONFIGS[modelName]
  if (config) {
    return config
  }
  
  // 如果找不到配置，抛出错误（不再自动推断，确保使用预定义模型）
  throw new Error(`不支持的模型: ${modelName}。请使用 DeepSeek 或 Kimi 系列模型。`)
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
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
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

// ==================== Token 估算（js-tiktoken）====================
import { estimateTextTokens, estimateChatTokens } from '@/theme/utils/tokenEstimator'

/**
 * 智能截断消息 —— 按模型上下文窗口动态调整
 * 
 * 三级策略：
 * 1. 估算总 token，如果在预算内 → 不截断
 * 2. 对 tool 结果按可用空间比例截断（保底 3k 字符，上限按模型定）
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
  
  console.log(`[smartTruncate] 当前 ${currentTokens} tokens > 预算 ${availableTokens}，开始截断`)
  
  // ═══════════════════════════════════════════════════════════════
  // 第一阶段：截断 tool 结果（通常最长）
  // ═══════════════════════════════════════════════════════════════
  const toolMsgs = messages.filter(m => m.role === 'tool')
  const nonToolMsgs = messages.filter(m => m.role !== 'tool')
  
  // 非 tool 消息的 token 占用
  const nonToolTokens = nonToolMsgs.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')
    return sum + estimateTextTokens(text)
  }, 0)
  
  // 给 tool 消息分配的预算（至少留 30% 给 tool）
  const toolBudget = Math.max(availableTokens - nonToolTokens, Math.floor(availableTokens * 0.3))
  const perToolTokens = toolMsgs.length > 0 ? Math.floor(toolBudget / toolMsgs.length) : 0
  
  // 单条 tool 截断上限：按模型上下文分级
  // 64k 模型 → 12k 字符, 128k → 24k, 256k → 48k
  const maxToolChars = contextWindow >= 256000 ? 48000
    : contextWindow >= 128000 ? 24000
    : contextWindow >= 64000 ? 12000
    : 4000
  
  // 保底 3000 字符，不超过上限
  const toolTruncateLimit = Math.max(Math.min(perToolTokens * 3, maxToolChars), 3000)
  
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
    // 保留最近 8 条（4轮）完整，更早的 assistant 消息截断到摘要
    const keepRecent = 8
    const recent = processed.slice(-keepRecent)
    const older = processed.slice(0, -keepRecent)
    
    const truncatedOlder = older.map(m => {
      if (m.role !== 'assistant' || typeof m.content !== 'string') return m
      if (m.content.length <= 800) return m
      return {
        ...m,
        content: m.content.substring(0, 800) + `\n\n... [早期 assistant 消息已截断，仅保留摘要]`
      }
    })
    
    processed = [...truncatedOlder, ...recent]
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 第三阶段：如果还超，逐步丢弃最早的消息
  // ═══════════════════════════════════════════════════════════════
  let finalTokens = processed.reduce((sum, m) => {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '')
    return sum + estimateTextTokens(text)
  }, 0)
  
  while (finalTokens > availableTokens && processed.length > 6) {
    // 优先丢弃 tool 结果（通常最长且是"过去"的观察）
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
  
  console.log(`[smartTruncate] 截断后 ${finalTokens} tokens，保留 ${processed.length}/${messages.length} 条消息`)
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
  
  // 智能截断：按模型上下文动态调整
  processedMessages = smartTruncateMessages(processedMessages, modelConfig, config.systemPrompt)
  
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
    
    // 提取 API 返回的 usage
    const usage = result.usage
    
    return { content: message?.content || '', reasoningContent, usage }
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
  isToolContinuation: boolean = false,
  includeTools: boolean = false,
  toolContext?: {
    agentId?: string
    availableSkills?: string[]
    declaredTools?: string[]
    availableTools?: string[]
  }
): Promise<{ content?: string; toolCalls?: ToolCall[]; reasoningContent?: string; error?: string; aborted?: boolean }> {
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
  
  processedMessages = smartTruncateMessages(processedMessages, modelConfig, config.systemPrompt)
  
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
  
  if (config.model === 'kimi-k2.5' && config.enableReasoning) {
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
    const allDefs = getToolDefinitions()
    let activeDefs = allDefs
    if (toolContext?.availableTools) {
      activeDefs = allDefs.filter(d => toolContext.availableTools!.includes(d.function.name))
    }
    if (activeDefs.length > 0) {
      requestBody.tools = activeDefs
    }
  }
  
  logApiRequest('/chat/completions (stream)', requestBody)

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
    const response = await fetch(`${modelConfig.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: internalController.signal
    })

    clearTimeout(connectionTimer)
    resetIdleTimer()

    if (!response.ok) {
      const errorText = await response.text()
      const errorStr = `HTTP ${response.status}: ${errorText}`
      logApiError('/chat/completions (stream)', new Error(errorStr), Date.now() - startTime, requestBody)
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
          
          // 捕获 API 返回的 usage（通常在最后一块中）
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
    
    // 返回最终在流结束时积累的数据（防由于网络结束但未发送[DONE]）
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
    logApiError('/chat/completions (stream)', errorObj, Date.now() - startTime, requestBody)
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
      
      // 转换每条消息（不再硬编码 slice(-10)，由 smartTruncateMessages 在内部按需截断）
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
        
        const hasAnyTools = !!(toolContext?.availableTools?.length)
        const response = await chatStreamInternal(filteredMessages, config, callbacks, signal, toolRound > 1, hasAnyTools, toolContext)

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
        
        // 处理中间文本（工具调用前 AI 生成的说明文字）
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
            apiDebugLogger.logNote('final_response', '【UI展示】最终回复（流式输出完毕）', { content: response.content }, true)
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
          
          const { result, record, injectMessages: toolInjectMessages } = await executeToolWithRecord(toolCall)
          toolRecords.push(record)
          
          // 收集需要注入到对话上下文中的消息（如 load_skill 返回的 skill 内容）
          if (toolInjectMessages && toolInjectMessages.length > 0) {
            injectMessages.push(...toolInjectMessages)
          }
          
          // 执行完成后创建新的 step 对象（确保 Vue 响应式系统检测到变化）
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
              resultContent = result.message || JSON.stringify(result.data)
            } else {
              resultContent = result.message || result.error || '操作失败'
            }
          } else {
            resultContent = String(result || '')
          }
          
          // 工具结果截断：防止超长内容撑爆上下文窗口
          // load_skill 的结果通常较短（成功消息），其完整内容通过 injectMessages 注入
          const MAX_TOOL_RESULT_LENGTH = 6000
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
        
        // 注入 load_skill 等工具返回的额外消息（skill 内容等）
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
        const finalResponse = await chatStreamInternal(filteredMessages, config, callbacks, signal, true, false, toolContext)
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
