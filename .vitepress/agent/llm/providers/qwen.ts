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
import { LLMProvider } from '../types'
import { readSSEStream } from '../utils/stream'

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
      signal: request.signal
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

    await readSSEStream(response, request.signal, (data) => {
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
    })
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
}
