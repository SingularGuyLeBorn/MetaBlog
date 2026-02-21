/**
 * AI Service - DeepSeek API
 * 
 * 简化版：暂不支持 Function Call，避免 400 错误
 * 工具功能通过 System Prompt 注入实现
 */
import type { ChatMessage, SessionConfig, MessageRole } from '../types'

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

/**
 * 清理消息数组，确保符合 API 要求
 * - 过滤空消息
 * - 确保没有连续的 assistant 消息
 */
function cleanMessages(messages: ChatMessage[]): Array<{ role: MessageRole; content: string }> {
  return messages
    .filter(m => m.content.trim() || m.role === 'user')
    .reduce((acc, m) => {
      const last = acc[acc.length - 1]
      // 跳过连续的 assistant 消息
      if (last?.role === 'assistant' && m.role === 'assistant') {
        return acc
      }
      acc.push({
        role: m.role,
        content: m.content
      })
      return acc
    }, [] as { role: MessageRole; content: string }[])
}

/**
 * 构建增强的系统提示词（包含工具说明）
 */
function buildSystemPrompt(basePrompt: string): string {
  const toolDescription = `
你可以使用以下工具来帮助用户：

1. get_article_content - 获取文章完整内容
   参数: { "path": "文章路径" }
   
2. search_articles - 搜索文章
   参数: { "query": "搜索关键词", "limit": 5 }
   
3. list_articles - 列出所有文章
   参数: { "section": "可选分类", "limit": 10 }
   
4. get_current_time - 获取当前时间
   参数: {}

当需要调用工具时，请按以下格式输出：
<tool_call>
{
  "name": "工具名",
  "arguments": {参数对象}
}
</tool_call>

系统会自动执行工具并将结果返回给你。
`
  return basePrompt ? `${basePrompt}\n\n${toolDescription}` : toolDescription
}

export const aiService = {
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const apiKey = getApiKey()
    const cleanMsgs = cleanMessages(messages)
    
    // 构建增强的系统提示词
    const systemPrompt = buildSystemPrompt(config.systemPrompt)
    
    const requestBody = {
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system' as MessageRole, content: systemPrompt }] : []),
        ...cleanMsgs
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
