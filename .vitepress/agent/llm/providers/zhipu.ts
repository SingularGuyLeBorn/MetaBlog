/**
 * Zhipu (智谱清言) Provider
 * 支持 GLM-4, GLM-4-Plus, GLM-4-Flash 等模型
 */
import type { 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { LLMProvider, getModelPricing } from '../types'

export class ZhipuProvider extends LLMProvider {
  name = 'zhipu'
  private baseURL: string

  constructor(config: LLMProviderConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://open.bigmodel.cn/api/paas/v4'
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
      throw new Error(`Zhipu API error: ${error}`)
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
    // P0-3: 检查 signal 是否已被中止
    if (request.signal?.aborted) {
      throw new Error('Request aborted')
    }

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
      signal: request.signal  // P0-3: 传递 AbortSignal
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Zhipu API error: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

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
      request.signal?.removeEventListener('abort', abortHandler)
      reader.releaseLock()
    }
  }

  estimateTokens(text: string): number {
    // GLM 使用类似的 tokenizer
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
      'glm-4',
      'glm-4-plus',
      'glm-4-0520',
      'glm-4-air',
      'glm-4-airx',
      'glm-4-flash',
      'glm-4v',
      'glm-3-turbo'
    ]
  }

  calculateCost(usage: LLMResponse['usage']): number {
    const pricing = getModelPricing(this.config.model)
    const inputCost = (usage.promptTokens / 1000) * pricing.input
    const outputCost = (usage.completionTokens / 1000) * pricing.output
    return inputCost + outputCost
  }
}
