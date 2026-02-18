/**
 * 🤖 MetaUniverse LLM API 测试
 * 
 * 测试多厂商 LLM Provider 是否可用：OpenAI, Anthropic, Gemini, 智谱, DeepSeek, Qwen, Kimi
 * 
 * 参考: model-reference/deepseek/notebook/02-流式输出.ipynb
 * 
 * 使用方法:
 * ```typescript
 * import { runLLMAPITests } from './test-llm-api'
 * 
 * // 运行所有测试
 * await runLLMAPITests()
 * 
 * // 测试单个 Provider
 * import { testDeepSeek } from './test-llm-api'
 * await testDeepSeek()
 * 
 * // 流式输出测试
 * import { testDeepSeekStream } from './test-llm-api'
 * await testDeepSeekStream()
 * ```
 */

import { loadEnvConfig } from './config/env'
import { createLLMManager, getLLMManager, type LLMManager } from './llm/manager'
import { createLLMConfigFromEnv } from './config/env'
import type { LLMMessage } from './llm/types'

// 存储测试结果
export interface TestResult {
  provider: string
  success: boolean
  model?: string
  response?: string
  tokens?: number
  cost?: number
  error?: string
  duration: number
}

// 流式输出结果
export interface StreamResult {
  provider: string
  content: string
  reasoning?: string
  tokens: number
  cost: number
  duration: number
}

const results: TestResult[] = []

/**
 * 初始化 LLM Manager
 */
function initLLMManager(): LLMManager {
  try {
    return getLLMManager()
  } catch {
    const config = createLLMConfigFromEnv()
    return createLLMManager(config)
  }
}

/**
 * 测试 DeepSeek
 */
export async function testDeepSeek(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY.includes('your')) {
    return {
      provider: 'deepseek',
      success: false,
      error: '⚠️ 未配置 DEEPSEEK_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ role: 'user', content: '回复"DeepSeek OK"' }],
      model: env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: 20
    }, 'deepseek')

    const duration = Date.now() - startTime
    const result: TestResult = {
      provider: 'deepseek',
      success: true,
      model: response.model,
      response: response.content.slice(0, 50),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
    
    console.log(`✅ DeepSeek OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 50)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ DeepSeek Error: ${errorMsg}`)
    return {
      provider: 'deepseek',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 测试 DeepSeek 流式输出
 * 参考: model-reference/deepseek/notebook/02-流式输出.ipynb
 */
export async function testDeepSeekStream(
  onChunk?: (chunk: { content: string; isReasoning?: boolean }) => void
): Promise<StreamResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY.includes('your')) {
    throw new Error('⚠️ 未配置 DEEPSEEK_API_KEY')
  }

  const llm = initLLMManager()
  
  let fullContent = ''
  let reasoningContent = ''
  let isInContent = false
  
  console.log('📝 流式输出：')
  
  await llm.chatStream(
    {
      messages: [{ role: 'user', content: '讲一个短故事' }],
      model: env.DEEPSEEK_MODEL || 'deepseek-chat',
      maxTokens: 500
    },
    (chunk) => {
      const content = chunk.content || ''
      fullContent += content
      
      // 检查是否是思考过程（这里简化处理，实际需根据响应结构判断）
      if (!isInContent && content.trim()) {
        isInContent = true
      }
      
      // 实时输出到控制台
      process.stdout?.write?.(content) || console.log(content)
      
      // 回调通知
      onChunk?.({ content, isReasoning: false })
    },
    'deepseek'
  )
  
  console.log() // 换行
  
  const duration = Date.now() - startTime
  const llmManager = getLLMManager()
  const stats = llmManager.getUsageStats()
  
  return {
    provider: 'deepseek',
    content: fullContent,
    reasoning: reasoningContent || undefined,
    tokens: fullContent.length / 2, // 估算
    cost: 0, // 流式暂无法精确计算
    duration
  }
}

/**
 * 测试 DeepSeek Reasoner 流式输出（含思考过程）
 * 参考: model-reference/deepseek/notebook/02-流式输出.ipynb
 */
export async function testDeepSeekReasonerStream(
  onReasoning?: (content: string) => void,
  onContent?: (content: string) => void
): Promise<StreamResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY.includes('your')) {
    throw new Error('⚠️ 未配置 DEEPSEEK_API_KEY')
  }

  const llm = initLLMManager()
  
  let fullContent = ''
  let reasoningContent = ''
  let isInContent = false
  
  console.log('🧠 思考过程：')
  console.log('-'.repeat(60))
  
  await llm.chatStream(
    {
      messages: [{ role: 'user', content: '证明勾股定理' }],
      model: 'deepseek-reasoner',
      maxTokens: 4096
    },
    (chunk) => {
      const content = chunk.content || ''
      
      // 简化处理：前半部分可能是思考过程
      // 实际实现需要根据 API 返回的 reasoning_content 字段判断
      if (!isInContent) {
        if (content.includes('证明') || content.includes('定理')) {
          isInContent = true
          console.log('\n\n📄 正式答案：')
          console.log('-'.repeat(60))
        } else {
          reasoningContent += content
          process.stdout?.write?.(content) || console.log(content)
          onReasoning?.(content)
          return
        }
      }
      
      fullContent += content
      process.stdout?.write?.(content) || console.log(content)
      onContent?.(content)
    },
    'deepseek'
  )
  
  console.log('\n')
  console.log('='.repeat(60))
  
  const duration = Date.now() - startTime
  
  console.log(`思考部分: ${reasoningContent.length} 字符`)
  console.log(`回答部分: ${fullContent.length} 字符`)
  
  return {
    provider: 'deepseek-reasoner',
    content: fullContent,
    reasoning: reasoningContent || undefined,
    tokens: (reasoningContent.length + fullContent.length) / 2,
    cost: 0,
    duration
  }
}

/**
 * DeepSeek 流式聊天封装类
 * 参考: model-reference/deepseek/notebook/02-流式输出.ipynb
 */
export class DeepSeekStreamingChat {
  private llm: LLMManager
  
  constructor() {
    this.llm = initLLMManager()
  }
  
  /**
   * 流式对话
   * @param message 用户消息
   * @param model 模型名称
   * @param showReasoning 是否显示思考过程
   * @param onUpdate 内容更新回调
   */
  async chat(
    message: string,
    model: string = 'deepseek-chat',
    showReasoning: boolean = true,
    onUpdate?: (chunk: { content: string; isReasoning: boolean; done: boolean }) => void
  ): Promise<{ content: string; reasoning?: string }> {
    const fullContent: string[] = []
    const reasoningContent: string[] = []
    let isInContent = false
    
    await this.llm.chatStream(
      {
        messages: [{ role: 'user', content: message }],
        model,
        maxTokens: model === 'deepseek-reasoner' ? 4096 : 2048
      },
      (chunk) => {
        const content = chunk.content || ''
        
        // 对于 reasoner 模型，简单判断思考/内容边界
        if (model === 'deepseek-reasoner' && !isInContent) {
          // 检测是否进入正式答案（简化逻辑）
          const totalLength = reasoningContent.join('').length
          if (totalLength > 100 && (content.includes('综上所述') || content.includes('因此'))) {
            isInContent = true
            if (showReasoning) {
              console.log('\n')
            }
          } else {
            reasoningContent.push(content)
            if (showReasoning) {
              // 灰色显示思考过程
              console.log(`\x1b[90m${content}\x1b[0m`)
            }
            onUpdate?.({ content, isReasoning: true, done: false })
            return
          }
        }
        
        fullContent.push(content)
        process.stdout?.write?.(content) || console.log(content)
        onUpdate?.({ content, isReasoning: false, done: !!chunk.finishReason })
      },
      'deepseek'
    )
    
    console.log()
    
    return {
      content: fullContent.join(''),
      reasoning: reasoningContent.join('') || undefined
    }
  }
}

/**
 * 测试 OpenAI
 */
export async function testOpenAI(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.includes('your')) {
    return {
      provider: 'openai',
      success: false,
      error: '⚠️ 未配置 OPENAI_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ 
        role: 'user', 
        content: 'Hello, this is a test. Reply with "OpenAI OK"' 
      }],
      model: env.OPENAI_MODEL || 'gpt-4o',
      maxTokens: 20
    }, 'openai')

    const duration = Date.now() - startTime
    const result: TestResult = {
      provider: 'openai',
      success: true,
      model: response.model,
      response: response.content.slice(0, 50),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
    
    console.log(`✅ OpenAI OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 50)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ OpenAI Error: ${errorMsg}`)
    return {
      provider: 'openai',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 测试 Anthropic (Claude)
 */
export async function testAnthropic(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY.includes('your')) {
    return {
      provider: 'anthropic',
      success: false,
      error: '⚠️ 未配置 ANTHROPIC_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ 
        role: 'user', 
        content: 'Reply with "Anthropic OK"' 
      }],
      model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      maxTokens: 20
    }, 'anthropic')

    const duration = Date.now() - startTime
    const result: TestResult = {
      provider: 'anthropic',
      success: true,
      model: response.model,
      response: response.content.slice(0, 50),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
    
    console.log(`✅ Anthropic OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 50)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Anthropic Error: ${errorMsg}`)
    return {
      provider: 'anthropic',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 测试 Google Gemini
 */
export async function testGemini(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.includes('your')) {
    return {
      provider: 'gemini',
      success: false,
      error: '⚠️ 未配置 GEMINI_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ 
        role: 'user', 
        content: 'Reply with "Gemini OK"' 
      }],
      model: env.GEMINI_MODEL || 'gemini-1.5-pro',
      maxTokens: 20
    }, 'gemini')

    const duration = Date.now() - startTime
    const result: TestResult = {
      provider: 'gemini',
      success: true,
      model: response.model,
      response: response.content.slice(0, 50),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
    
    console.log(`✅ Gemini OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 50)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Gemini Error: ${errorMsg}`)
    return {
      provider: 'gemini',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 测试智谱清言 (Zhipu)
 */
export async function testZhipu(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.ZHIPU_API_KEY || env.ZHIPU_API_KEY.includes('your')) {
    return {
      provider: 'zhipu',
      success: false,
      error: '⚠️ 未配置 ZHIPU_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ 
        role: 'user', 
        content: '回复"智谱OK"' 
      }],
      model: env.ZHIPU_MODEL || 'glm-4',
      maxTokens: 20
    }, 'zhipu')

    const duration = Date.now() - startTime
    const result: TestResult = {
      provider: 'zhipu',
      success: true,
      model: response.model,
      response: response.content.slice(0, 50),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
    
    console.log(`✅ 智谱 OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 50)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ 智谱 Error: ${errorMsg}`)
    return {
      provider: 'zhipu',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 测试阿里云 Qwen
 */
export async function testQwen(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.QWEN_API_KEY || env.QWEN_API_KEY.includes('your')) {
    return {
      provider: 'qwen',
      success: false,
      error: '⚠️ 未配置 QWEN_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ 
        role: 'user', 
        content: '回复"Qwen OK"' 
      }],
      model: env.QWEN_MODEL || 'qwen-plus',
      maxTokens: 20
    }, 'qwen')

    const duration = Date.now() - startTime
    const result: TestResult = {
      provider: 'qwen',
      success: true,
      model: response.model,
      response: response.content.slice(0, 50),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
    
    console.log(`✅ Qwen OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 50)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Qwen Error: ${errorMsg}`)
    return {
      provider: 'qwen',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 测试 Kimi (Moonshot)
 */
export async function testKimi(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.KIMI_API_KEY || env.KIMI_API_KEY.includes('your')) {
    return {
      provider: 'kimi',
      success: false,
      error: '⚠️ 未配置 KIMI_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ 
        role: 'user', 
        content: '回复"Kimi OK"' 
      }],
      model: env.KIMI_MODEL || 'kimi-latest',
      maxTokens: 20
    }, 'kimi')

    const duration = Date.now() - startTime
    const result: TestResult = {
      provider: 'kimi',
      success: true,
      model: response.model,
      response: response.content.slice(0, 50),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
    
    console.log(`✅ Kimi OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 50)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Kimi Error: ${errorMsg}`)
    return {
      provider: 'kimi',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 测试 DeepSeek Reasoner (思考模式)
 */
export async function testDeepSeekReasoner(): Promise<TestResult> {
  const env = loadEnvConfig()
  const startTime = Date.now()
  
  if (!env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY.includes('your')) {
    return {
      provider: 'deepseek-reasoner',
      success: false,
      error: '⚠️ 未配置 DEEPSEEK_API_KEY',
      duration: 0
    }
  }

  try {
    const llm = initLLMManager()
    const response = await llm.chat({
      messages: [{ 
        role: 'user', 
        content: '解方程：3x² - 6x + 2 = 0' 
      }],
      model: 'deepseek-reasoner',
      maxTokens: 4096
    }, 'deepseek')

    const duration = Date.now() - startTime
    
    console.log(`✅ DeepSeek Reasoner OK (${duration}ms)`)
    console.log(`   Model: ${response.model}`)
    console.log(`   Response: ${response.content.slice(0, 100)}...`)
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    
    return {
      provider: 'deepseek-reasoner',
      success: true,
      model: response.model,
      response: response.content.slice(0, 100),
      tokens: response.usage.totalTokens,
      cost: response.cost,
      duration
    }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ DeepSeek Reasoner Error: ${errorMsg}`)
    return {
      provider: 'deepseek-reasoner',
      success: false,
      error: errorMsg,
      duration
    }
  }
}

/**
 * 运行所有 LLM API 测试
 */
export async function runLLMAPITests(): Promise<TestResult[]> {
  console.log('\n' + '='.repeat(50))
  console.log('🚀 批量测试所有已配置的 LLM API')
  console.log('='.repeat(50) + '\n')

  const results: TestResult[] = []

  // 测试各个 Provider
  results.push(await testOpenAI())
  console.log('')
  
  results.push(await testAnthropic())
  console.log('')
  
  results.push(await testGemini())
  console.log('')
  
  results.push(await testZhipu())
  console.log('')
  
  results.push(await testDeepSeek())
  console.log('')
  
  results.push(await testQwen())
  console.log('')
  
  results.push(await testKimi())
  console.log('')

  // 测试 DeepSeek Reasoner（如果 DeepSeek 配置成功）
  const deepseekResult = results.find(r => r.provider === 'deepseek')
  if (deepseekResult?.success) {
    results.push(await testDeepSeekReasoner())
    console.log('')
  }

  // 打印总结
  console.log('='.repeat(50))
  console.log('📊 测试总结')
  console.log('='.repeat(50))
  
  const successCount = results.filter(r => r.success).length
  const totalCost = results
    .filter(r => r.success && r.cost)
    .reduce((sum, r) => sum + (r.cost || 0), 0)
  
  console.log(`✅ 成功: ${successCount}/${results.length}`)
  console.log(`💰 总成本: $${totalCost.toFixed(4)}`)
  console.log('\n详细结果:')
  
  for (const result of results) {
    const icon = result.success ? '✅' : '❌'
    const duration = result.duration > 0 ? `(${result.duration}ms)` : ''
    console.log(`  ${icon} ${result.provider} ${duration}`)
    if (result.error) {
      console.log(`     ${result.error}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✨ 测试完成！')
  console.log('='.repeat(50))

  return results
}

/**
 * 运行流式输出测试
 * 参考: model-reference/deepseek/notebook/02-流式输出.ipynb
 */
export async function runStreamTests(): Promise<void> {
  console.log('\n' + '='.repeat(50))
  console.log('🌊 流式输出测试')
  console.log('='.repeat(50) + '\n')
  
  const env = loadEnvConfig()
  
  if (!env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY.includes('your')) {
    console.log('⚠️ 未配置 DEEPSEEK_API_KEY，跳过流式测试')
    return
  }
  
  // 测试基础流式输出
  console.log('1️⃣ 基础流式输出 (deepseek-chat)')
  console.log('-'.repeat(50))
  try {
    await testDeepSeekStream()
  } catch (error) {
    console.error('流式测试失败:', error)
  }
  
  console.log('\n')
  
  // 测试思考模式流式输出
  console.log('2️⃣ 思考模式流式输出 (deepseek-reasoner)')
  console.log('-'.repeat(50))
  try {
    await testDeepSeekReasonerStream()
  } catch (error) {
    console.error('思考模式流式测试失败:', error)
  }
  
  console.log('\n')
  
  // 测试流式聊天类
  console.log('3️⃣ 流式聊天类测试')
  console.log('-'.repeat(50))
  try {
    const chat = new DeepSeekStreamingChat()
    const result = await chat.chat(
      '解释量子力学',
      'deepseek-reasoner',
      true
    )
    console.log('\n')
    console.log('='.repeat(50))
    console.log(`总结: 思考 ${(result.reasoning || '').length} 字符, 回答 ${result.content.length} 字符`)
  } catch (error) {
    console.error('流式聊天类测试失败:', error)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('✨ 流式测试完成！')
  console.log('='.repeat(50))
}

/**
 * 测试文章生成功能
 */
export async function testArticleGeneration(topic?: string): Promise<void> {
  const env = loadEnvConfig()
  const defaultProvider = env.LLM_DEFAULT_PROVIDER || 'deepseek'
  
  console.log(`\n📝 测试文章生成（使用 ${defaultProvider}）...`)
  
  const testTopic = topic || '什么是强化学习（简要介绍）'
  
  try {
    const llm = initLLMManager()
    
    const response = await llm.chat({
      messages: [
        { 
          role: 'system', 
          content: '你是一个专业的技术博客作者。为给定的主题生成简短的测试文章（300字以内）。' 
        },
        { 
          role: 'user', 
          content: `请写一篇关于 '${testTopic}' 的简短介绍文章：` 
        }
      ],
      maxTokens: 500
    })
    
    console.log('✅ 文章生成成功！')
    console.log(`   Tokens: ${response.usage.totalTokens}`)
    console.log(`   Cost: $${response.cost.toFixed(4)}`)
    console.log('\n📄 文章内容预览：')
    console.log(`${response.content.slice(0, 300)}...`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ 文章生成失败: ${errorMsg}`)
  }
}

/**
 * 检查已配置的 Providers
 */
export function checkConfiguredProviders(): void {
  const env = loadEnvConfig()
  
  console.log('\n📋 环境配置检查')
  console.log('='.repeat(50))
  
  const providers = []
  if (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('your')) providers.push('openai')
  if (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('your')) providers.push('anthropic')
  if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes('your')) providers.push('gemini')
  if (env.ZHIPU_API_KEY && !env.ZHIPU_API_KEY.includes('your')) providers.push('zhipu')
  if (env.DEEPSEEK_API_KEY && !env.DEEPSEEK_API_KEY.includes('your')) providers.push('deepseek')
  if (env.QWEN_API_KEY && !env.QWEN_API_KEY.includes('your')) providers.push('qwen')
  if (env.KIMI_API_KEY && !env.KIMI_API_KEY.includes('your')) providers.push('kimi')
  
  console.log(`✅ 已配置的 Providers: [${providers.join(', ')}]`)
  console.log(`📊 默认 Provider: ${env.LLM_DEFAULT_PROVIDER}`)
  console.log(`💰 每日预算: $${env.LLM_DAILY_BUDGET}`)
  
  // 显示各 Provider 配置详情
  console.log('\n详细配置:')
  
  if (env.DEEPSEEK_API_KEY && !env.DEEPSEEK_API_KEY.includes('your')) {
    console.log(`  DeepSeek:`)
    console.log(`    API Key: ${env.DEEPSEEK_API_KEY.slice(0, 10)}...`)
    console.log(`    Base URL: ${env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'}`)
    console.log(`    Model: ${env.DEEPSEEK_MODEL || 'deepseek-chat'}`)
  }
  
  if (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('your')) {
    console.log(`  OpenAI:`)
    console.log(`    API Key: ${env.OPENAI_API_KEY.slice(0, 10)}...`)
    console.log(`    Model: ${env.OPENAI_MODEL || 'gpt-4o'}`)
  }
  
  console.log('='.repeat(50))
}

// 默认导出
export default {
  runLLMAPITests,
  runStreamTests,
  testDeepSeek,
  testDeepSeekStream,
  testDeepSeekReasonerStream,
  DeepSeekStreamingChat,
  testOpenAI,
  testAnthropic,
  testGemini,
  testZhipu,
  testQwen,
  testKimi,
  testDeepSeekReasoner,
  testArticleGeneration,
  checkConfiguredProviders
}
