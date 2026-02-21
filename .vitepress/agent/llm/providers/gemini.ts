/**
 * Google Gemini Provider
 * 支持 Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro
 */
import type { 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { LLMProvider } from '../types'
import { readSSEStream } from '../utils/stream'

export class GeminiProvider extends LLMProvider {
  name = 'gemini'
  private baseURL: string

  constructor(config: LLMProviderConfig) {
    super(config)
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || this.config.model
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
        }),
        signal: request.signal
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${error}`)
    }

    const data = await response.json()
    
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

    await readSSEStream(response, request.signal, (data) => {
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
    })
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

  private convertMessages(messages: LLMRequest['messages']): any[] {
    const contents = []
    let currentRole = ''
    let currentParts: { text: string }[] = []

    for (const msg of messages) {
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
