/**
 * Provider 基类
 * 封装通用逻辑，具体厂商只需实现差异部分
 */

import type {
  IProvider,
  ProviderInfo,
  ModelInfo,
  ChatOptions,
  StreamCallbacks,
  StandardMessage,
  ToolDefinition,
  ToolCall
} from './types'
import type { ChatMessage, MessageAttachment } from '../../types'
import { getModelById, getProviderById } from './models'

/** API 配置 */
export interface ApiConfig {
  baseURL: string
  apiKey: string
  model: string
}

/** Provider 配置选项 */
export interface ProviderOptions {
  /** API 基础配置 */
  apiConfig: ApiConfig
  /** 额外的请求头 */
  headers?: Record<string, string>
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * Provider 抽象基类
 * 所有具体 Provider 必须继承此类
 */
export abstract class BaseProvider implements IProvider {
  /** 厂商信息 */
  abstract readonly info: ProviderInfo
  
  /** API 配置 */
  protected apiConfig: ApiConfig
  
  /** 额外请求头 */
  protected headers: Record<string, string>
  
  /** 超时时间 */
  protected timeout: number
  
  constructor(options: ProviderOptions) {
    this.apiConfig = options.apiConfig
    this.headers = options.headers || {}
    this.timeout = options.timeout || 120000
  }
  
  // ==================== 模型管理 ====================
  
  /** 获取该厂商支持的所有模型 */
  getModels(): ModelInfo[] {
    return this.getModelList().filter(m => m.providerId === this.info.id)
  }
  
  /** 获取指定模型信息 */
  getModel(modelId: string): ModelInfo | undefined {
    const model = getModelById(modelId)
    if (model && model.providerId === this.info.id) {
      return model
    }
    return undefined
  }
  
  /** 检查是否支持指定模型 */
  supportsModel(modelId: string): boolean {
    const model = getModelById(modelId)
    return model?.providerId === this.info.id
  }
  
  /** 
   * 子类可覆盖，用于筛选厂商特定模型
   * 默认从全局模型配置中筛选
   */
  protected getModelList(): ModelInfo[] {
    // 从全局配置导入
    const { getAllModels } = require('./models')
    return getAllModels()
  }
  
  // ==================== 抽象方法 - 子类必须实现 ====================
  
  /**
   * 流式对话
   * 核心方法，处理与厂商 API 的流式通信
   */
  abstract chatStream(options: ChatOptions, callbacks: StreamCallbacks): Promise<void>
  
  /**
   * 非流式对话
   * 默认实现：使用流式方法收集完整响应
   * 子类可覆盖以提供更高效的实现
   */
  async chat(options: ChatOptions): Promise<{
    content: string
    reasoning?: string
    toolCalls?: ToolCall[]
  }> {
    const chunks: string[] = []
    const reasoningChunks: string[] = []
    const toolCalls: ToolCall[] = []
    
    await this.chatStream(options, {
      onContent: (text) => chunks.push(text),
      onReasoning: (text) => reasoningChunks.push(text),
      onToolCall: (tc) => toolCalls.push(tc)
    })
    
    return {
      content: chunks.join(''),
      reasoning: reasoningChunks.length > 0 ? reasoningChunks.join('') : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    }
  }
  
  // ==================== 通用工具方法 ====================
  
  /**
   * 验证 API Key
   */
  protected validateApiKey(): void {
    if (!this.apiConfig.apiKey || this.apiConfig.apiKey.includes('your-api-key')) {
      throw new Error(`${this.info.name} API Key 未配置`)
    }
  }
  
  /**
   * 构建请求头
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiConfig.apiKey}`,
      ...this.headers
    }
  }
  
  /**
   * 通用的消息转换
   * 将内部 ChatMessage 转换为标准化格式
   * 子类可覆盖以处理厂商特定格式
   */
  protected async convertMessages(
    messages: ChatMessage[],
    supportsVision: boolean
  ): Promise<StandardMessage[]> {
    const standardMessages: StandardMessage[] = []
    
    for (const msg of messages) {
      const standardMsg: StandardMessage = {
        role: msg.role as any,
        content: msg.content
      }
      
      // 处理多模态附件
      if (supportsVision && msg.attachments && msg.attachments.length > 0) {
        const contentParts = await this.buildMultimodalContent(msg.content, msg.attachments)
        standardMsg.content = contentParts
      }
      
      // 处理思考内容
      if (msg.reasoning?.content) {
        standardMsg.reasoning = msg.reasoning.content
      }
      
      standardMessages.push(standardMsg)
    }
    
    return standardMessages
  }
  
  /**
   * 构建多模态内容
   * 将附件转换为内容片段
   */
  protected async buildMultimodalContent(
    textContent: string,
    attachments: MessageAttachment[]
  ): Promise<Array<{ type: string; [key: string]: any }>> {
    const parts: Array<{ type: string; [key: string]: any }> = []
    
    // 添加文本
    if (textContent) {
      parts.push({ type: 'text', text: textContent })
    }
    
    // 处理图片
    for (const att of attachments) {
      if (att.type === 'image') {
        const imageUrl = await this.attachmentToUrl(att)
        parts.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        })
      }
      // 视频处理由子类实现
    }
    
    return parts
  }
  
  /**
   * 将附件转换为 URL
   * 本地 blob 转为 base64
   */
  protected async attachmentToUrl(attachment: MessageAttachment): Promise<string> {
    // 如果已经是 data URL 或 http URL，直接使用
    if (attachment.url.startsWith('data:') || attachment.url.startsWith('http')) {
      return attachment.url
    }
    
    // blob URL 需要转换为 base64
    if (attachment.url.startsWith('blob:')) {
      const response = await fetch(attachment.url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }
    
    return attachment.url
  }
  
  /**
   * 解析 SSE 流
   * 通用 SSE 解析器
   */
  protected async *parseSSEStream(response: Response): AsyncGenerator<any, void, unknown> {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Response body is null')
    
    const decoder = new TextDecoder()
    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return
          try {
            yield JSON.parse(data)
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }
  
  /**
   * 带超时的 fetch
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout = this.timeout
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }
  
  /**
   * 工具定义转换
   * 将内部工具定义转换为厂商特定格式
   * 子类可覆盖
   */
  protected convertTools(tools?: ToolDefinition[]): any[] | undefined {
    if (!tools || tools.length === 0) return undefined
    
    // 默认使用 OpenAI 格式（多数厂商兼容）
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }
  
  /**
   * 提取工具调用
   * 从响应中提取工具调用信息
   * 子类可覆盖
   */
  protected extractToolCalls(delta: any): ToolCall | undefined {
    if (delta.tool_calls) {
      const tc = delta.tool_calls[0]
      if (tc && tc.function) {
        return {
          id: tc.id || `call_${Date.now()}`,
          name: tc.function.name,
          arguments: tc.function.arguments ? JSON.parse(tc.function.arguments) : {}
        }
      }
    }
    return undefined
  }
}
