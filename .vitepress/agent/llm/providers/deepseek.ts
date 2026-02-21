/**
 * DeepSeek Provider
 * 支持 DeepSeek-Chat, DeepSeek-Coder, DeepSeek-Reasoner
 */
import type { 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig 
} from '../types'
import { LLMProvider } from '../types'
import { readSSEStream } from '../utils/stream'

export class DeepSeekProvider extends LLMProvider {
  name = 'deepseek'
  private baseURL: string

  constructor(config: LLMProviderConfig) {
    super(config)
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
    console.log(`[DeepSeek] Starting chatStream, model: ${request.model || this.config.model}`);
    console.log(`[DeepSeek] BaseURL: ${this.baseURL}`);
    console.log(`[DeepSeek] API Key length: ${this.config.apiKey?.length}`);
    
    try {
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

      console.log(`[DeepSeek] Response status: ${response.status}`);

      if (!response.ok) {
        const error = await response.text()
        console.error(`[DeepSeek] API error: ${error}`);
        throw new Error(`DeepSeek API error: ${error}`)
      }

      // 使用公共 SSE 流读取函数
      console.log(`[DeepSeek] Starting to read SSE stream`);
      await readSSEStream(response, request.signal, (data) => {
        try {
          const chunk = JSON.parse(data)
          const delta = chunk.choices[0]?.delta
          const content = delta?.content || ''
          const reasoning = delta?.reasoning_content || ''
          const finishReason = chunk.choices[0]?.finish_reason

          onChunk({
            content,
            reasoning,
            finishReason
          })
        } catch {
          // 忽略解析错误
        }
      })
      console.log(`[DeepSeek] SSE stream completed`);
    } catch (error) {
      console.error(`[DeepSeek] Fetch error:`, error);
      throw error;
    }
  }

  getAvailableModels(): string[] {
    return [
      'deepseek-chat',
      'deepseek-coder',
      'deepseek-reasoner'
    ]
  }
}
