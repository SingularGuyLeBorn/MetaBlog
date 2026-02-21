/**
 * AI Service - DeepSeek API
 */
import type { ChatMessage, SessionConfig, MessageRole } from '../composables/types'

const API_BASE_URL = 'https://api.deepseek.com/v1'

function getApiKey(): string {
  const key = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (key && !key.includes('your-api-key')) {
    return key
  }
  throw new Error('DeepSeek API Key not configured')
}

export interface StreamCallbacks {
  onContent: (text: string) => void
  onReasoning: (text: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export const aiService = {
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const apiKey = getApiKey()
    
    const requestBody = {
      model: config.model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system' as MessageRole, content: config.systemPrompt }] : []),
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`API Error: ${error}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is null')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let fullReasoning = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            callbacks.onComplete()
            return
          }

          try {
            const chunk = JSON.parse(data)
            const delta = chunk.choices?.[0]?.delta
            
            if (delta?.reasoning_content) {
              fullReasoning += delta.reasoning_content
              callbacks.onReasoning(fullReasoning)
            }
            
            if (delta?.content) {
              fullContent += delta.content
              callbacks.onContent(fullContent)
            }
          } catch {
            // ignore parse error
          }
        }
      }

      callbacks.onComplete()
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        callbacks.onComplete()
      } else {
        callbacks.onError(error as Error)
      }
    }
  }
}
