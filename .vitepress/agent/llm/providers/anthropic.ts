/**
 * Anthropic Provider
 * 支持 Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
 */
import type { 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { LLMProvider, getModelPricing } from '../types'

export class AnthropicProvider extends LLMProvider {
  name = 'anthropic'
  private baseURL: string

  constructor(config: LLMProviderConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1'
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    // 提取 system 消息
    const systemMessage = request.messages.find(m => m.role === 'system')?.content || ''
    const messages = request.messages.filter(m => m.role !== 'system')

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model || this.config.model,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
        temperature: request.temperature ?? this.config.temperature,
        system: systemMessage || undefined,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const data = await response.json()
    
    return {
      content: data.content[0]?.text || '',
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      model: data.model,
      finishReason: data.stop_reason
    }
  }

  async chatStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void> {
    // P0-3: 检查 signal 是否已被中止
    if (request.signal?.aborted) {
      throw new Error('Request aborted')
    }

    const systemMessage = request.messages.find(m => m.role === 'system')?.content || ''
    const messages = request.messages.filter(m => m.role !== 'system')

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model || this.config.model,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
        temperature: request.temperature ?? this.config.temperature,
        system: systemMessage || undefined,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true
      }),
      signal: request.signal  // P0-3: 传递 AbortSignal
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    // P0-3: 监听 abort 事件来取消 reader
    const abortHandler = () => {
      reader.cancel('Request aborted').catch(() => {})
    }
    request.signal?.addEventListener('abort', abortHandler)

    try {
      while (true) {
        // P0-3: 检查 signal 状态
        if (request.signal?.aborted) {
          throw new Error('Request aborted')
        }

        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              
              if (parsed.type === 'content_block_delta') {
                onChunk({
                  content: parsed.delta.text || ''
                })
              } else if (parsed.type === 'message_stop') {
                onChunk({
                  content: '',
                  finishReason: 'stop'
                })
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      request.signal?.removeEventListener('abort', abortHandler)
      reader.releaseLock()
    }
  }

  estimateTokens(text: string): number {
    // Claude 使用类似的 tokenizer
    let tokens = 0
    for (const char of text) {
      if (/[\u4e00-\u9fa5]/.test(char)) {
        tokens += 2.5
      } else if (/[a-zA-Z]/.test(char)) {
        tokens += 0.25
      } else {
        tokens += 0.5
      }
    }
    return Math.ceil(tokens)
  }

  getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ]
  }

  calculateCost(usage: LLMResponse['usage']): number {
    const pricing = getModelPricing(this.config.model)
    const inputCost = (usage.promptTokens / 1000) * pricing.input
    const outputCost = (usage.completionTokens / 1000) * pricing.output
    return inputCost + outputCost
  }
}
