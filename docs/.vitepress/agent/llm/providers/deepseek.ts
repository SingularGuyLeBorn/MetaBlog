/**
 * DeepSeek Provider
 * 支持 DeepSeek-Chat, DeepSeek-Coder, DeepSeek-Reasoner
 */
import type { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { getModelPricing } from '../types'

export class DeepSeekProvider implements LLMProvider {
  name = 'deepseek'
  private baseURL: string

  constructor(private config: LLMProviderConfig) {
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1'
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
      throw new Error(`DeepSeek API error: ${error}`)
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
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

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
          }
        }
      }
    } finally {
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
      'deepseek-chat',
      'deepseek-coder',
      'deepseek-reasoner'
    ]
  }

  calculateCost(usage: LLMResponse['usage']): number {
    const pricing = getModelPricing(this.config.model)
    const inputCost = (usage.promptTokens / 1000) * pricing.input
    const outputCost = (usage.completionTokens / 1000) * pricing.output
    return inputCost + outputCost
  }
}
