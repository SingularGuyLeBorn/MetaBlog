/**
 * AI Service - DeepSeek API (简化稳定的 Function Call 实现)
 * 
 * 核心流程：
 * 1. 发送用户消息 + tools 定义
 * 2. AI 返回 tool_calls（非流式）
 * 3. 执行工具函数
 * 4. 发送 tool 结果（流式）获取最终回复
 */
import type { ChatMessage, SessionConfig, MessageRole, ToolCallRecord } from '../types'

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
  onToolRecord?: (record: ToolCallRecord) => void
}

/** 清理 AI 输出中的调试标签 */
function cleanAIOutput(content: string): string {
  // 移除 DSML 标签
  return content
    .replace(/<\|DSML\|[^>]*>/g, '')
    .replace(/<\|\/DSML\|[^>]*>/g, '')
    .replace(/\|DSML\|/g, '')
    .replace(/function_calls/g, '')
    .replace(/invoke/g, '')
    .replace(/parameter/g, '')
    .trim()
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

type ToolExecutor = (args: Record<string, any>) => Promise<string> | string

const tools: Map<string, { definition: ToolDefinition; executor: ToolExecutor }> = new Map()

function registerTool(name: string, definition: ToolDefinition, executor: ToolExecutor) {
  tools.set(name, { definition, executor })
}

async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  const tool = tools.get(name)
  if (!tool) return `错误：工具 "${name}" 未找到`
  try {
    return await tool.executor(args)
  } catch (error) {
    return `执行错误: ${error instanceof Error ? error.message : String(error)}`
  }
}

function getToolDefinitions(): ToolDefinition[] {
  return Array.from(tools.values()).map(t => t.definition)
}

/** 执行工具并创建记录 */
async function executeToolWithRecord(
  name: string, 
  args: Record<string, any>,
  onRecord?: (record: ToolCallRecord) => void
): Promise<{ result: string; record: ToolCallRecord }> {
  const tool = tools.get(name)
  const startTime = Date.now()
  
  const record: ToolCallRecord = {
    id: `tool_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: tool?.definition.function.description,
    arguments: args,
    result: '',
    status: 'running',
    startTime
  }
  
  onRecord?.(record)
  
  try {
    const result = await executeTool(name, args)
    record.status = 'success'
    record.result = result
    record.endTime = Date.now()
    record.duration = record.endTime - startTime
    onRecord?.(record)
    return { result, record }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    record.status = 'error'
    record.error = errorMsg
    record.result = `执行错误: ${errorMsg}`
    record.endTime = Date.now()
    record.duration = record.endTime - startTime
    onRecord?.(record)
    return { result: record.result, record }
  }
}

/** 非流式请求 */
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
    
    if (message?.tool_calls?.length > 0) {
      return { toolCalls: message.tool_calls }
    }
    
    return { content: message?.content || '' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** 流式请求 */
async function chatStreamInternal(
  messages: any[],
  config: SessionConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = getApiKey()
  
  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true
    }),
    signal
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error: ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body is null')

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
          // 清理 DSML 调试标签
          const cleaned = cleanAIOutput(fullContent)
          callbacks.onContent(cleaned)
        }
      } catch {}
    }
  }

  callbacks.onComplete()
}

/** 主服务 */
export const aiService = {
  async chatStream(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: StreamCallbacks,
    signal?: AbortSignal
  ): Promise<{ toolRecords?: ToolCallRecord[] }> {
    const toolRecords: ToolCallRecord[] = []
    
    try {
      // 只使用当前对话的消息（避免历史消息格式问题）
      const currentMessages = messages.slice(-2) // 用户消息 + 可能的 assistant
      
      const apiMessages = [
        ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
        ...currentMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ]
      
      // 第一步：检查是否需要工具
      const firstResponse = await chatNonStream(apiMessages, config, true)
      
      if (firstResponse.error) {
        callbacks.onError(new Error(firstResponse.error))
        return { toolRecords }
      }
      
      // 有工具调用
      const toolCalls = firstResponse.toolCalls
      if (toolCalls && toolCalls.length > 0) {
        // 不显示提示，直接执行工具
        
        // 执行工具
        const toolResults = []
        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments || '{}')
          const { result, record } = await executeToolWithRecord(
            toolCall.function.name, 
            args,
            callbacks.onToolRecord
          )
          toolRecords.push(record)
          toolResults.push({
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: result
          })
        }
        
        // 构建第二次请求的消息（严格格式）
        const secondMessages = [
          ...(config.systemPrompt ? [{ role: 'system', content: config.systemPrompt }] : []),
          ...currentMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          {
            role: 'assistant',
            content: '',
            tool_calls: toolCalls
          },
          ...toolResults.map(r => ({
            role: 'tool',
            tool_call_id: r.tool_call_id,
            name: r.name,
            content: r.content
          }))
        ]
        
        // 第二步：获取最终回复
        await chatStreamInternal(secondMessages, config, callbacks, signal)
        return { toolRecords }
      }
      
      // 无工具调用，直接流式
      await chatStreamInternal(apiMessages, config, callbacks, signal)
      return { toolRecords }
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        callbacks.onError(error as Error)
      } else {
        callbacks.onComplete()
      }
      return { toolRecords }
    }
  },
  
  registerTool(name: string, definition: ToolDefinition, executor: ToolExecutor) {
    registerTool(name, definition, executor)
  },
  
  getRegisteredTools(): string[] {
    return Array.from(tools.keys())
  }
}

// ============ 注册工具 ============

registerTool('get_article_content', {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的完整内容',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string', description: '文章路径' } },
      required: ['path']
    }
  }
}, async (args) => `[模拟] 文章 "${args.path}" 的内容...`)

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
}, async (args) => `[模拟搜索] "${args.query}" 的结果：\n1. 文章一\n2. 文章二`)

registerTool('get_current_time', {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: '获取当前时间',
    parameters: { type: 'object', properties: {} }
  }
}, () => new Date().toISOString())

registerTool('test_echo', {
  type: 'function',
  function: {
    name: 'test_echo',
    description: '【测试专用】回声工具，验证工具调用是否正常工作。当用户说"测试工具"时使用。',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '要回显的消息' },
        repeat_count: { type: 'number', description: '重复次数' }
      },
      required: ['message']
    }
  }
}, async (args) => {
  const ts = new Date().toLocaleString('zh-CN')
  return `🎯 工具调用成功\n📅 ${ts}\n📨 "${args.message}"\n🔢 重复: ${args.repeat_count || 1}`
})
