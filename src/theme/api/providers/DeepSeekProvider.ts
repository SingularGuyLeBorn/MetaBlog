/**
 * ============================================================================
 * API 服务 - DeepSeekProvider
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/api
 */


import type { ChatMessage } from '@/theme/types'
import { BaseProvider } from './BaseProvider'
import type { ChatOptions, ProviderInfo, StreamCallbacks, ToolCall } from './types'

/**
 * DeepSeekProvider 类
 *
 */
export class DeepSeekProvider extends BaseProvider {
  readonly info: ProviderInfo = {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '深度求索,专注于大语言模型研发',
    themeColor: '#4D6BFA',
    website: 'https://deepseek.com',
    icon: '🔍'
  }

  constructor(apiKey?: string) {
    super({
      apiConfig: {
        baseURL: 'https://api.deepseek.com/v1',
        // 注意：前端不应直接持有 API Key. 
        // 生产环境由后端 /api/chat 代理所有 LLM 请求,Key 仅存在于服务端. 
        // 此处 apiKey 仅在服务端 SSR 或测试场景下由调用方传入. 
        apiKey: apiKey || '',
        model: 'deepseek-v4-flash'
      }
    })
  }

  async chatStream(options: ChatOptions, callbacks: StreamCallbacks): Promise<void> {
    this.validateApiKey()

    const { messages, config, tools, signal } = options
    const model = this.getModel(config.model)

    if (!model) {
      throw new Error(`不支持的模型: ${config.model}`)
    }

    // 转换消息格式
    const convertedMessages = await this.convertMessages(messages)

    // 构建请求体
    const requestBody: any = {
      model: config.model,
      messages: convertedMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: true,
      temperature: config.temperature ?? model.defaultTemperature,
      max_tokens: config.maxTokens ?? model.maxOutputTokens
    }

    // 添加工具(如果支持)
    if (model.capabilities.functionCalling && tools && tools.length > 0) {
      requestBody.tools = this.convertTools(tools)
    }

    // DeepSeek Reasoner 特殊处理
    if (config.model === 'deepseek-v4-pro') {
      // Reasoner 模型不支持 temperature 和 tools
      delete requestBody.temperature
      delete requestBody.tools
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.apiConfig.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify(requestBody),
          signal
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `DeepSeek API 错误: ${response.status}`)
      }

      // 解析流
      let reasoningBuffer = ''
      let contentBuffer = ''

      for await (const chunk of this.parseSSEStream(response)) {
        if (signal?.aborted) break

        const delta = chunk.choices?.[0]?.delta
        if (!delta) continue

        // 处理思考内容(reasoning_content)
        if (delta.reasoning_content) {
          reasoningBuffer += delta.reasoning_content
          callbacks.onReasoning?.(delta.reasoning_content)
        }

        // 处理普通内容
        if (delta.content) {
          contentBuffer += delta.content
          callbacks.onContent(delta.content)
        }

        // 处理工具调用
        const toolCall = this.extractToolCalls(delta)
        if (toolCall) {
          callbacks.onToolCall?.(toolCall)
        }
      }

      callbacks.onComplete?.()

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        callbacks.onComplete?.()
        return
      }
      callbacks.onError?.(error as Error)
      throw error
    }
  }

  /**
   * DeepSeek 非流式请求(用于工具调用)
   */
  async chat(options: ChatOptions): Promise<{
    content: string
    reasoning?: string
    toolCalls?: ToolCall[]
  }> {
    this.validateApiKey()

    const { messages, config, tools } = options
    const model = this.getModel(config.model)

    if (!model) {
      throw new Error(`不支持的模型: ${config.model}`)
    }

    // 转换消息格式
    const convertedMessages = await this.convertMessages(messages)

    const requestBody: any = {
      model: config.model,
      messages: convertedMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: false,
      temperature: config.temperature ?? model.defaultTemperature,
      max_tokens: config.maxTokens ?? model.maxOutputTokens
    }

    // 添加工具
    if (model.capabilities.functionCalling && tools && tools.length > 0) {
      requestBody.tools = this.convertTools(tools)
    }

    // Reasoner 特殊处理
    if (config.model === 'deepseek-v4-pro') {
      delete requestBody.temperature
      delete requestBody.tools
    }

    const response = await this.fetchWithTimeout(
      `${this.apiConfig.baseURL}/chat/completions`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(requestBody)
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error?.message || `DeepSeek API 错误: ${response.status}`)
    }

    const result = await response.json()
    const choice = result.choices?.[0]
    const message = choice?.message

    return {
      content: message?.content || '',
      reasoning: message?.reasoning_content,
      toolCalls: message?.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}')
      }))
    }
  }

  /**
   * 覆盖消息转换 - DeepSeek 不支持多模态
   */
  protected async convertMessages(messages: ChatMessage[]): Promise<any[]> {
    // DeepSeek 目前不支持 vision,忽略图片附件
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  }
}
