/**
 * AI Service - DeepSeek API (真正的 Function Call 实现)
 * 
 * 工具调用流程：
 * 1. 发送用户消息 + tools 定义给 AI
 * 2. AI 返回 tool_calls（如果需要工具）
 * 3. 系统执行工具函数
 * 4. 发送 tool 结果给 AI
 * 5. AI 返回最终回复
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

/** 工具定义 */
interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

/** 工具调用请求 */
interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 工具执行函数 */
type ToolExecutor = (args: Record<string, any>) => Promise<string> | string

/** 注册的工具 */
const tools: Map<string, { definition: ToolDefinition; executor: ToolExecutor }> = new Map()

/** 注册工具 */
function registerTool(name: string, definition: ToolDefinition, executor: ToolExecutor) {
  tools.set(name, { definition, executor })
}

/** 执行工具 */
async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  const tool = tools.get(name)
  if (!tool) {
    return `错误：工具 "${name}" 未找到`
  }
  try {
    return await tool.executor(args)
  } catch (error) {
    return `执行错误: ${error instanceof Error ? error.message : String(error)}`
  }
}

/** 获取工具定义列表 */
function getToolDefinitions(): ToolDefinition[] {
  return Array.from(tools.values()).map(t => t.definition)
}

// ============ 注册示例工具（可以先返回假数据） ============

// 1. 获取文章
registerTool('get_article_content', {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的完整内容',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章路径' }
      },
      required: ['path']
    }
  }
}, async (args) => {
  // 这里是假实现，后续替换成真实逻辑
  return `[模拟数据] 文章 "${args.path}" 的内容：\n这是一篇关于前端开发的技术文章，详细介绍了...`
})

// 2. 搜索文章
registerTool('search_articles', {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '根据关键词搜索文章',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'number', description: '返回数量限制' }
      },
      required: ['query']
    }
  }
}, async (args) => {
  // 假实现
  return `[模拟搜索结果] 关键词 "${args.query}" 的搜索结果：\n1. 文章一\n2. 文章二\n3. 文章三`
})

// 3. 获取时间
registerTool('get_current_time', {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: '获取当前时间',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
}, () => {
  return new Date().toISOString()
})

/** 准备发送给 API 的消息 */
function prepareMessages(messages: ChatMessage[]): any[] {
  const result: any[] = []
  
  for (const msg of messages) {
    const apiMsg: any = {
      role: msg.role,
      content: msg.content
    }
    
    // 如果消息有 tool_calls（assistant 消息）
    if (msg.metadata?.toolCalls && msg.role === 'assistant') {
      apiMsg.tool_calls = msg.metadata.toolCalls
    }
    
    // 如果消息是 tool 角色
    if (msg.role === 'tool' && msg.metadata?.toolCallId) {
      apiMsg.tool_call_id = msg.metadata.toolCallId
      apiMsg.name = msg.metadata.toolName || 'unknown'
    }
    
    result.push(apiMsg)
  }
  
  return result
}

/** 非流式请求（用于检查是否需要工具调用） */
async function chatNonStream(
  messages: any[],
  config: SessionConfig,
  includeTools: boolean
): Promise<{ content?: string; toolCalls?: ToolCall[]; error?: string }> {
  const apiKey = getApiKey()
  
  const requestBody: any = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    stream: false
  }
  
  // 添加工具定义
  if (includeTools && config.model !== 'deepseek-reasoner') {
    requestBody.tools = getToolDefinitions()
    requestBody.tool_choice = 'auto'
  }

  try {
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
      return { error: `API Error: ${error}` }
    }

    const result = await response.json()
    const message = result.choices?.[0]?.message
    
    if (message?.tool_calls && message.tool_calls.length > 0) {
      return { toolCalls: message.tool_calls }
    }
    
    return { content: message?.content || '' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** 流式请求（获取最终回复） */
async function chatStreamInternal(
  messages: any[],
  config: SessionConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = getApiKey()
  
  const requestBody = {
    model: config.model,
    messages,
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
}

/** 主聊天服务 */
export const aiService = {
  /**
   * 主聊天方法
   */
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const sessionId = messages[0]?.sessionId || 'unknown'
      
      // 第一步：非流式请求，检查是否需要工具调用
      const apiMessages = [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        ...prepareMessages(messages)
      ]
      
      const firstResponse = await chatNonStream(apiMessages, config, true)
      
      if (firstResponse.error) {
        callbacks.onError(new Error(firstResponse.error))
        return
      }
      
      // 如果有工具调用
      if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
        // 显示工具调用状态
        callbacks.onContent(`🔧 正在使用工具: ${firstResponse.toolCalls[0].function.name}...`)
        
        // 执行所有工具
        const toolResults = []
        for (const toolCall of firstResponse.toolCalls) {
          const args = JSON.parse(toolCall.function.arguments || '{}')
          const result = await executeTool(toolCall.function.name, args)
          toolResults.push({
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: result
          })
        }
        
        // 构建新消息历史
        const assistantMsg: ChatMessage = {
          id: `msg_${Date.now()}_assistant`,
          sessionId,
          role: 'assistant',
          content: '',
          status: 'completed',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {
            toolCalls: firstResponse.toolCalls
          }
        }
        
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
        
        // 准备第二次请求的消息
        const secondMessages = [
          ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
          ...prepareMessages(messages),
          {
            role: 'assistant',
            content: '',
            tool_calls: firstResponse.toolCalls
          },
          ...toolResults.map(r => ({
            role: 'tool',
            tool_call_id: r.tool_call_id,
            name: r.name,
            content: r.content
          }))
        ]
        
        // 第二步：流式请求获取最终回复
        await chatStreamInternal(secondMessages, config, callbacks, signal)
      } else {
        // 不需要工具，直接流式输出
        await chatStreamInternal(apiMessages, config, callbacks, signal)
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
   * 注册新工具（供外部扩展）
   */
  registerTool(name: string, definition: ToolDefinition, executor: ToolExecutor) {
    registerTool(name, definition, executor)
  },
  
  /**
   * 获取已注册工具列表
   */
  getRegisteredTools(): string[] {
    return Array.from(tools.keys())
  }
}
