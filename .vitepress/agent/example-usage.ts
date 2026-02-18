/**
 * 🚀 MetaUniverse Agent LLM API 使用示例
 * 
 * 本文件展示如何在前端 Agent 中使用环境变量读取和 LLM API 调用
 * 
 * 参考:
 * - model-reference/deepseek/notebook/01-基础对话.ipynb
 * - model-reference/deepseek/notebook/02-流式输出.ipynb
 * 
 * 注意：为避免循环依赖，此文件不从 ./index 导入，而是直接从子模块导入
 */

import { AgentRuntime } from './core/AgentRuntime'
import { loadEnvConfig, createLLMConfigFromEnv } from './config/env'
import { createLLMManager, getLLMManager } from './llm/manager'
import { 
  runLLMAPITests, 
  runStreamTests,
  testDeepSeek,
  testDeepSeekStream,
  testDeepSeekReasonerStream,
  DeepSeekStreamingChat
} from './test-llm-api'

// ============================================
// 示例 1: 检查环境配置
// ============================================
export function example1_checkConfig() {
  console.log('📋 示例 1: 检查环境配置')
  console.log('='.repeat(50))
  
  const env = loadEnvConfig()
  console.log('\n手动读取配置:')
  console.log(`  默认 Provider: ${env.LLM_DEFAULT_PROVIDER}`)
  console.log(`  每日预算: $${env.LLM_DAILY_BUDGET}`)
  console.log(`  DeepSeek API Key: ${env.DEEPSEEK_API_KEY ? env.DEEPSEEK_API_KEY.slice(0, 10) + '...' : '未配置'}`)
}

// ============================================
// 示例 2: 初始化 LLM Manager
// ============================================
export function example2_initManager() {
  console.log('\n📋 示例 2: 初始化 LLM Manager')
  console.log('='.repeat(50))
  
  // 方式 1: 从环境变量自动创建配置
  const llm = initLLMManager()
  console.log('\n✅ LLM Manager 初始化成功')
  console.log(`可用 Providers: [${llm.getAvailableProviders().join(', ')}]`)
  
  return llm
}

// 初始化 LLM Manager 的辅助函数
function initLLMManager() {
  try {
    return getLLMManager()
  } catch {
    const config = createLLMConfigFromEnv()
    return createLLMManager(config)
  }
}

// ============================================
// 示例 3: 基础对话（参考 notebook 01-基础对话.ipynb）
// ============================================
export async function example3_basicChat() {
  console.log('\n📋 示例 3: 基础对话')
  console.log('='.repeat(50))
  
  try {
    const llm = initLLMManager()
    
    // 发送对话请求
    const response = await llm.chat({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello! 请回复 "DeepSeek OK"' }
      ],
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 100
    }, 'deepseek')
    
    console.log('✅ 对话成功')
    console.log(`  Model: ${response.model}`)
    console.log(`  Content: ${response.content}`)
    console.log(`  Tokens: ${response.usage.totalTokens}`)
    console.log(`  Cost: $${response.cost.toFixed(4)}`)
    
    return response
  } catch (error) {
    console.error('❌ 对话失败:', error)
    throw error
  }
}

// ============================================
// 示例 4: 流式输出（参考 notebook 02-流式输出.ipynb）
// ============================================
export async function example4_streamingChat() {
  console.log('\n📋 示例 4: 流式输出')
  console.log('='.repeat(50))
  
  try {
    const llm = initLLMManager()
    
    let fullContent = ''
    
    console.log('📝 流式输出内容：\n')
    
    await llm.chatStream(
      {
        messages: [{ role: 'user', content: '讲一个短故事' }],
        model: 'deepseek-chat',
        maxTokens: 500
      },
      (chunk) => {
        // 实时处理每个 chunk
        const content = chunk.content || ''
        fullContent += content
        process.stdout?.write?.(content)
      },
      'deepseek'
    )
    
    console.log('\n\n✅ 流式输出完成')
    console.log(`总字符数: ${fullContent.length}`)
    
    return fullContent
  } catch (error) {
    console.error('❌ 流式输出失败:', error)
    throw error
  }
}

// ============================================
// 示例 5: 思考模式（Reasoner）
// ============================================
export async function example5_reasoner() {
  console.log('\n📋 示例 5: 思考模式（Reasoner）')
  console.log('='.repeat(50))
  
  try {
    const llm = initLLMManager()
    
    console.log('🧠 使用 deepseek-reasoner 解方程...\n')
    
    const response = await llm.chat({
      messages: [{ role: 'user', content: '解方程：3x² - 6x + 2 = 0' }],
      model: 'deepseek-reasoner',
      maxTokens: 4096
    }, 'deepseek')
    
    console.log('✅ 思考完成')
    console.log(`\n📄 答案：\n${response.content}`)
    console.log(`\nTokens: ${response.usage.totalTokens}`)
    console.log(`Cost: $${response.cost.toFixed(4)}`)
    
    return response
  } catch (error) {
    console.error('❌ 思考模式失败:', error)
    throw error
  }
}

// ============================================
// 示例 6: 使用流式聊天类
// ============================================
export async function example6_streamingClass() {
  console.log('\n📋 示例 6: 使用流式聊天类')
  console.log('='.repeat(50))
  
  try {
    const chat = new DeepSeekStreamingChat()
    
    console.log('💬 开始流式对话...\n')
    
    // 方式 1: 简单使用
    const result = await chat.chat(
      '解释什么是机器学习',
      'deepseek-chat',
      false // 不显示思考过程
    )
    
    console.log('\n✅ 对话完成')
    console.log(`内容长度: ${result.content.length} 字符`)
    
    return result
  } catch (error) {
    console.error('❌ 流式聊天失败:', error)
    throw error
  }
}

// ============================================
// 示例 7: 使用回调的流式聊天
// ============================================
export async function example7_streamingWithCallback() {
  console.log('\n📋 示例 7: 使用回调的流式聊天')
  console.log('='.repeat(50))
  
  try {
    const chat = new DeepSeekStreamingChat()
    
    console.log('💬 开始流式对话（带回调）...\n')
    
    const chunks: string[] = []
    
    const result = await chat.chat(
      '写一首关于AI的诗',
      'deepseek-chat',
      false,
      (update) => {
        // 实时接收更新
        chunks.push(update.content)
        // 可以在这里更新 UI
        if (update.done) {
          console.log('\n[完成]')
        }
      }
    )
    
    console.log('\n✅ 对话完成')
    console.log(`共收到 ${chunks.length} 个 chunks`)
    
    return result
  } catch (error) {
    console.error('❌ 流式聊天失败:', error)
    throw error
  }
}

// ============================================
// 示例 8: 批量测试所有 API
// ============================================
export async function example8_runAllTests() {
  console.log('\n📋 示例 8: 批量测试所有 API')
  console.log('='.repeat(50))
  
  // 运行所有 API 测试
  const results = await runLLMAPITests()
  
  // 运行流式测试
  await runStreamTests()
  
  return results
}

// ============================================
// 示例 9: 在 Agent Runtime 中使用
// ============================================
export async function example9_agentRuntime() {
  console.log('\n📋 示例 9: 在 Agent Runtime 中使用')
  console.log('='.repeat(50))
  
  // 获取 Agent 实例
  const agent = AgentRuntime.getInstance({
    mode: 'COLLAB',
    enableCostTracking: true
  })
  
  await agent.initialize()
  
  // 处理用户输入
  const response = await agent.processInput('帮我写一篇关于深度学习的简介', {
    currentFile: 'article.md'
  })
  
  console.log('Agent 回复:', response.content)
  
  return response
}

// ============================================
// 主函数：运行所有示例
// ============================================
export async function runAllExamples() {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 MetaUniverse Agent LLM API 使用示例')
  console.log('='.repeat(60))
  
  // 示例 1: 检查配置
  example1_checkConfig()
  
  // 示例 2: 初始化
  example2_initManager()
  
  // 示例 3-7: 异步示例
  try {
    await example3_basicChat()
    await example4_streamingChat()
    await example5_reasoner()
    await example6_streamingClass()
    await example7_streamingWithCallback()
  } catch (error) {
    console.error('示例执行失败:', error)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('✨ 所有示例执行完成')
  console.log('='.repeat(60))
}

// 导出所有示例
export const examples = {
  example1_checkConfig,
  example2_initManager,
  example3_basicChat,
  example4_streamingChat,
  example5_reasoner,
  example6_streamingClass,
  example7_streamingWithCallback,
  example8_runAllTests,
  example9_agentRuntime,
  runAllExamples
}

export default examples
