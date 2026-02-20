/**
 * Kimi (Moonshot) Provider
 * 支持 kimi-latest, kimi-k1, moonshot-v1 系列模型
 */
import type { 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { LLMProvider } from '../types'
import { readSSEStream } from '../utils/stream'

export class KimiProvider extends LLMProvider {
  name = 'kimi'
  private baseURL: string

  constructor(config: LLMProviderConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://api.moonshot.cn/v1'
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.config.model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.temperature,
        max_tokens: request.maxTokens ?? this.config.maxTokens,
        top_p: request.topP ?? 1,
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Kimi API error: ${error}`)
    }

    const data = await response.json()
    
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      model: data.model,
      finishReason: data.choices[0].finish_reason
    }
  }

  async chatStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || this.config.model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.temperature,
        max_tokens: request.maxTokens ?? this.config.maxTokens,
        top_p: request.topP ?? 1,
        stream: true
      }),
      signal: request.signal
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Kimi API error: ${error}`)
    }

    await readSSEStream(response, request.signal, (data) => {
      try {
        const chunk = JSON.parse(data)
        const delta = chunk.choices[0]?.delta?.content || ''
        const finishReason = chunk.choices[0]?.finish_reason

        onChunk({
          content: delta,
          finishReason
        })
      } catch {
        // 忽略解析错误
      }
    })
  }

  getAvailableModels(): string[] {
    return [
      'kimi-latest',
      'kimi-k1',
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
      'moonshot-v1-8k-vision-preview',
      'moonshot-v1-32k-vision-preview'
    ]
  }
}
