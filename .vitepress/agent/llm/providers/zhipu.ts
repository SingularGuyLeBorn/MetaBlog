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
import { LLMProvider } from '../types'
import { readSSEStream } from '../utils/stream'

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
      throw new Error(`Zhipu API error: ${error}`)
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
}
