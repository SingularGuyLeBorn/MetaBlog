/**
 * Google Gemini Provider
 * 支持 Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro
 */
import type { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { getModelPricing } from '../types'

export class GeminiProvider implements LLMProvider {
  name = 'gemini'
  private baseURL: string

  constructor(private config: LLMProviderConfig) {
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.model
    
    // 转换消息格式为 Gemini 格式
    const contents = this.convertMessages(request.messages)
    
    const response = await fetch(
      `${this.baseURL}/models/${model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature ?? this.config.temperature,
            maxOutputTokens: request.maxTokens ?? this.config.maxTokens,
            topP: request.topP ?? 1
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${error}`)
    }

    const data = await response.json()
    
    // 计算 token 使用量（Gemini 返回 usageMetadata）
    const usage = data.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0
    }

    return {
      content: data.candidates[0]?.content?.parts[0]?.text || '',
      usage: {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount
      },
      model: model,
      finishReason: data.candidates[0]?.finishReason || 'STOP'
    }
  }

  async chatStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void> {
    const model = request.model || this.config.model
    const contents = this.convertMessages(request.messages)

    const response = await fetch(
      `${this.baseURL}/models/${model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature ?? this.config.temperature,
            maxOutputTokens: request.maxTokens ?? this.config.maxTokens,
            topP: request.topP ?? 1
          }
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    try {
      while (true) {
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
              const text = parsed.candidates[0]?.content?.parts[0]?.text || ''
              const finishReason = parsed.candidates[0]?.finishReason

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
      reader.releaseLock()
    }
  }

  estimateTokens(text: string): number {
    // Gemini 使用类似的 tokenizer
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
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro'
    ]
  }

  calculateCost(usage: LLMResponse['usage']): number {
    const pricing = getModelPricing(this.config.model)
    const inputCost = (usage.promptTokens / 1000) * pricing.input
    const outputCost = (usage.completionTokens / 1000) * pricing.output
    return inputCost + outputCost
  }

  /**
   * 转换标准消息格式为 Gemini 格式
   */
  private convertMessages(messages: LLMRequest['messages']): any[] {
    const contents = []
    let currentRole = ''
    let currentParts: { text: string }[] = []

    for (const msg of messages) {
      // Gemini 使用 'user' 和 'model' 角色
      const role = msg.role === 'assistant' ? 'model' : 'user'

      if (role !== currentRole && currentParts.length > 0) {
        contents.push({
          role: currentRole,
          parts: currentParts
        })
        currentParts = []
      }

      currentRole = role
      currentParts.push({ text: msg.content })
    }

    if (currentParts.length > 0) {
      contents.push({
        role: currentRole,
        parts: currentParts
      })
    }

    return contents
  }
}
