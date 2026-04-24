/**
 * DeepSeek 多轮工具调用 + 思考模式 压力测试脚本
 *
 * 用途：排查"连续调用 10+ 工具后卡死/无响应"问题
 * 测试项：
 *   1. 流式连接建立超时
 *   2. 流式 idle 超时（长时间无 chunk）
 *   3. 多轮 tool_calls + reasoning_content 回传正确性
 *   4. 总耗时与 chunk 频率统计
 *
 * 运行方式：
 *   npx tsx model-reference/deepseek/test-multi-round-tools.ts
 *
 * 环境变量：
 *   VITE_DEEPSEEK_API_KEY - 必填
 *   DEEPSEEK_MODEL        - 选填，默认 deepseek-reasoner
 */

import { readFileSync } from 'fs'

function loadEnv() {
  try {
    const envText = readFileSync('.env', 'utf-8')
    const m = envText.match(/^VITE_DEEPSEEK_API_KEY=(.+)$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  } catch {
    // ignore
  }
  return process.env.VITE_DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || ''
}

const API_KEY = loadEnv()
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-reasoner'
const BASE_URL = 'https://api.deepseek.com/v1'

if (!API_KEY) {
  console.error('❌ 请设置环境变量 VITE_DEEPSEEK_API_KEY 或 DEEPSEEK_API_KEY')
  process.exit(1)
}

interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: any
  }
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  reasoning_content?: string
  tool_calls?: any[]
  tool_call_id?: string
}

const TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: '搜索网络获取信息',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取城市天气',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' }
        },
        required: ['city']
      }
    }
  }
]

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function streamChat(
  messages: Message[],
  options: {
    round: number
    connectionTimeoutMs?: number
    idleTimeoutMs?: number
  }
) {
  const startTime = Date.now()
  const connectionTimeoutMs = options.connectionTimeoutMs || 30000
  const idleTimeoutMs = options.idleTimeoutMs || 60000

  const body: any = {
    model: MODEL,
    messages,
    stream: true,
    max_tokens: 4096,
    tools: TOOLS
  }

  if (MODEL === 'deepseek-chat') {
    body.thinking = { type: 'enabled' }
  }

  const controller = new AbortController()
  const connectionTimer = setTimeout(() => {
    controller.abort(new Error(`Connection timeout: no response within ${connectionTimeoutMs}ms`))
  }, connectionTimeoutMs)

  let idleTimer: NodeJS.Timeout | null = null
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => {
      controller.abort(new Error(`Idle timeout: no chunk received within ${idleTimeoutMs}ms`))
    }, idleTimeoutMs)
  }
  function clearIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(connectionTimer)
    resetIdleTimer()
  } catch (err: any) {
    clearTimeout(connectionTimer)
    clearIdleTimer()
    throw err
  }

  if (!response.ok) {
    clearIdleTimer()
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullContent = ''
  let fullReasoning = ''
  let chunkCount = 0
  let toolCalls: any[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    resetIdleTimer()
    chunkCount++
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        clearIdleTimer()
        return {
          content: fullContent,
          reasoningContent: fullReasoning,
          toolCalls: toolCalls.length > 0 ? toolCalls.filter(Boolean) : undefined,
          duration: Date.now() - startTime,
          chunkCount
        }
      }
      try {
        const chunk = JSON.parse(data)
        const delta = chunk.choices?.[0]?.delta
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index
            if (!toolCalls[idx]) {
              toolCalls[idx] = {
                id: tc.id,
                type: tc.type || 'function',
                function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' }
              }
            } else {
              if (tc.function?.name) toolCalls[idx].function.name += tc.function.name
              if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments
            }
          }
        }
        if (delta?.reasoning_content) {
          fullReasoning += delta.reasoning_content
        }
        if (delta?.content) {
          fullContent += delta.content
        }
      } catch {
        // ignore
      }
    }
  }

  clearIdleTimer()
  return {
    content: fullContent,
    reasoningContent: fullReasoning,
    toolCalls: toolCalls.length > 0 ? toolCalls.filter(Boolean) : undefined,
    duration: Date.now() - startTime,
    chunkCount
  }
}

async function executeTool(toolCall: any) {
  const name = toolCall.function.name
  const args = JSON.parse(toolCall.function.arguments || '{}')
  await sleep(200) // 模拟网络延迟
  if (name === 'search_web') {
    return `搜索结果：关于 "${args.query}" 的最新信息（模拟数据）`
  }
  if (name === 'get_weather') {
    return `${args.city} 今天晴，25°C（模拟数据）`
  }
  return '未知工具结果'
}

async function runTest() {
  console.log(`\n🚀 开始 DeepSeek 多轮工具调用测试`)
  console.log(`   模型: ${MODEL}`)
  console.log(`   API: ${BASE_URL}`)
  console.log(`   工具: ${TOOLS.map(t => t.function.name).join(', ')}`)
  console.log(`-`.repeat(60))

  const messages: Message[] = [
    {
      role: 'system',
      content:
        '你是测试助手。请使用工具搜索多个主题（如：LLM推理优化、KV Cache、Speculative Decoding），' +
        '每轮搜索一个主题，至少搜索 8 次，最后给出总结。'
    },
    {
      role: 'user',
      content: '请帮我搜索 8 个以上相关主题并总结成一篇文章。'
    }
  ]

  const maxRounds = 15
  let round = 0
  const roundStats: any[] = []

  try {
    while (round < maxRounds) {
      round++
      process.stdout.write(`\n[Round ${round}] 请求中... `)
      const result = await streamChat(messages, { round })

      console.log(`✅ 完成 | 耗时 ${result.duration}ms | chunks ${result.chunkCount}`)
      console.log(`   reasoning: ${result.reasoningContent?.length || 0} chars`)
      console.log(`   content: ${result.content?.length || 0} chars`)
      console.log(`   toolCalls: ${result.toolCalls?.length || 0}`)

      roundStats.push({
        round,
        duration: result.duration,
        chunkCount: result.chunkCount,
        reasoningLength: result.reasoningContent?.length || 0,
        contentLength: result.content?.length || 0,
        toolCount: result.toolCalls?.length || 0
      })

      if (!result.toolCalls || result.toolCalls.length === 0) {
        console.log(`\n🎉 无更多工具调用，对话结束`)
        messages.push({
          role: 'assistant',
          content: result.content || '',
          reasoning_content: result.reasoningContent || ''
        })
        break
      }

      // 构建 assistant message（必须包含 reasoning_content，否则 API 会 400）
      const assistantMsg: Message = {
        role: 'assistant',
        content: result.content || '',
        reasoning_content: result.reasoningContent || '',
        tool_calls: result.toolCalls.map((tc: any) => ({
          id: tc.id,
          type: tc.type || 'function',
          function: { name: tc.function.name, arguments: tc.function.arguments }
        }))
      }
      messages.push(assistantMsg)

      // 执行工具
      for (const tc of result.toolCalls) {
        const toolResult = await executeTool(tc)
        console.log(`   🔧 ${tc.function.name}(${tc.function.arguments}) -> ${toolResult.slice(0, 80)}`)
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: toolResult
        })
      }
    }

    console.log(`\n` + `=`.repeat(60))
    console.log('📊 测试统计')
    console.log(`=`.repeat(60))
    console.table(roundStats)
    console.log(`总轮次: ${roundStats.length}`)
    console.log(`总耗时: ${roundStats.reduce((a, b) => a + b.duration, 0)}ms`)
    console.log(`总 chunks: ${roundStats.reduce((a, b) => a + b.chunkCount, 0)}`)
  } catch (err: any) {
    console.error(`\n❌ 测试失败: ${err.message}`)
    console.error(err.stack)
    process.exit(1)
  }
}

runTest()
