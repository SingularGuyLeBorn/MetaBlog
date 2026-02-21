/**
 * AI Service - DeepSeek API (支持标准 Function Call)
 */
import type { ChatMessage, SessionConfig, MessageRole } from '../types'
import type { ToolDefinition } from '../types/tools'
import { toolRegistry } from './toolRegistry'

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
 */
function cleanMessages(messages: ChatMessage[]): Array<{ role: MessageRole; content: string; name?: string; tool_call_id?: string; tool_calls?: any[] }> {
  const result: any[] = []
  
  for (const m of messages) {
    // 跳过空消息（除了 user）
    if (!m.content.trim() && m.role !== 'user') continue
    
    const last = result[result.length - 1]
    
    // 跳过连续的 assistant 消息（但保留带 tool_calls 的）
    if (last?.role === 'assistant' && m.role === 'assistant' && !last.tool_calls && !m.metadata?.toolCalls) {
      continue
    }
    
    const msg: any = {
      role: m.role === 'tool' ? 'tool' : m.role,
      content: m.content
    }
    
    // 添加 tool_calls（assistant 消息有 tool_calls）
    if (m.metadata?.toolCalls) {
      msg.tool_calls = m.metadata.toolCalls
    }
    
    // tool 消息需要 tool_call_id 和 name
    if (m.role === 'tool' && m.metadata?.toolCallId) {
      msg.tool_call_id = m.metadata.toolCallId
      msg.name = m.metadata.toolName || 'unknown'
    }
    
    result.push(msg)
  }
  
  return result
}

export const aiService = {
  /**
   * 主聊天方法 - 支持 Function Call
   */
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal,
    enableTools: boolean = true
  ): Promise<void> {
    try {
      // 第一步：发送请求（非流式）检查是否需要工具调用
      const toolCalls = await this.checkToolCalls(messages, config, enableTools)
      
      if (toolCalls && toolCalls.length > 0) {
        // 有工具调用，执行工具并继续对话
        await this.handleToolCalls(toolCalls, messages, config, callbacks, signal)
      } else {
        // 没有工具调用，直接流式输出回复
        await this.streamResponse(messages, config, callbacks, signal)
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        callbacks.onComplete()
      } else {
        callbacks.onError(error as Error)
      }
    }
  },

  /**
   * 检查是否需要工具调用（非流式请求）
   */
  async checkToolCalls(
    messages: ChatMessage[],
    config: SessionConfig,
    enableTools: boolean
  ): Promise<any[] | null> {
    const apiKey = getApiKey()
    const cleanMsgs = cleanMessages(messages)
    
    const requestBody: any = {
      model: config.model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system' as MessageRole, content: config.systemPrompt }] : []),
        ...cleanMsgs
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false
    }

    // 添加工具定义（如果启用且不是 reasoner 模型）
    if (enableTools && config.model !== 'deepseek-reasoner') {
      requestBody.tools = toolRegistry.getDefinitions()
    }

    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${error}`)
    }

    const result = await response.json()
    const message = result.choices?.[0]?.message
    
    // 返回工具调用（如果有）
    if (message?.tool_calls && message.tool_calls.length > 0) {
      return message.tool_calls
    }
    
    return null
  },

  /**
   * 流式输出响应
   */
  async streamResponse(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const apiKey = getApiKey()
    const cleanMsgs = cleanMessages(messages)
    
    const requestBody = {
      model: config.model,
      messages: [
        ...(config.systemPrompt ? [{ role: 'system' as MessageRole, content: config.systemPrompt }] : []),
        ...cleanMsgs
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true
    }

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
  },

  /**
   * 处理工具调用
   */
  async handleToolCalls(
    toolCalls: any[],
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    // 执行所有工具调用
    const toolResults: any[] = []
    
    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments || '{}')
        const result = await toolRegistry.execute(toolCall.function.name, args)
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          name: toolCall.function.name,
          content: result
        })
      } catch (error) {
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          name: toolCall.function.name,
          content: `执行错误: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    }

    // 构建新消息：添加 assistant 的 tool_calls 和 tool 结果
    const sessionId = messages[0]?.sessionId || 'unknown'
    
    // Assistant 消息（包含 tool_calls）
    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      sessionId,
      role: 'assistant',
      content: '',
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        toolCalls: toolCalls
      }
    }

    // Tool 结果消息
    const toolMessages: ChatMessage[] = toolResults.map((result, i) => ({
      id: `msg_${Date.now()}_tool_${i}`,
      sessionId,
      role: 'tool' as MessageRole,
      content: result.content,
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        toolName: result.name,
        toolCallId: result.tool_call_id
      }
    }))

    // 合并消息历史
    const newMessages = [...messages, assistantMsg, ...toolMessages]
    
    // 重新调用 API 获取最终回复（流式）
    await this.streamResponse(newMessages, config, callbacks, signal)
  }
}
