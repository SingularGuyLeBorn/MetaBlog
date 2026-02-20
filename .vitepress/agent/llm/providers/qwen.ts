/**
 * Qwen (阿里云通义千问) Provider
 * 支持 qwen-max, qwen-plus, qwen-turbo 等模型
 */
import type { 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { LLMProvider, getModelPricing } from '../types'

export class QwenProvider extends LLMProvider {
  name = 'qwen'
  private baseURL: string

  constructor(config: LLMProviderConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://dashscope.aliyuncs.com/api/v1'
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.config.model,
        input: {
          messages: request.messages
        },
        parameters: {
          temperature: request.temperature ?? this.config.temperature,
          max_tokens: request.maxTokens ?? this.config.maxTokens,
          top_p: request.topP ?? 1,
          result_format: 'message'
        }
      }),
      signal: request.signal  // P0-3: 传递 AbortSignal
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Qwen API error: ${error}`)
    }

    const data = await response.json()
    
    return {
      content: data.output.choices[0].message.content,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.total_tokens
      },
      model: data.model || request.model || this.config.model,
      finishReason: data.output.choices[0].finish_reason || 'stop'
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

    const response = await fetch(`${this.baseURL}/services/aigc/text-generation/generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-DashScope-SSE': 'enable'
      },
      body: JSON.stringify({
        model: request.model || this.config.model,
        input: {
          messages: request.messages
        },
        parameters: {
          temperature: request.temperature ?? this.config.temperature,
          max_tokens: request.maxTokens ?? this.config.maxTokens,
          top_p: request.topP ?? 1,
          result_format: 'message',
          incremental_output: true
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Qwen API error: ${error}`)
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
            
            try {
              const parsed = JSON.parse(data)
              const text = parsed.output?.choices[0]?.message?.content || ''
              const finishReason = parsed.output?.choices[0]?.finish_reason

              onChunk({
                content: text,
                finishReason
              })
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
      'qwen-max',
      'qwen-max-latest',
      'qwen-plus',
      'qwen-plus-latest',
      'qwen-turbo',
      'qwen-turbo-latest',
      'qwen-long'
    ]
  }

  calculateCost(usage: LLMResponse['usage']): number {
    const pricing = getModelPricing(this.config.model)
    const inputCost = (usage.promptTokens / 1000) * pricing.input
    const outputCost = (usage.completionTokens / 1000) * pricing.output
    return inputCost + outputCost
  }
}
