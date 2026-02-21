/**
 * MetaUniverse Agent Runtime
 * 人机共生的 AI-Native 博客系统
 * 
 * 架构层级:
 * L5: 人机共生界面层 (Human-AI Interface)
 * L4: 智能编排层 (AI Orchestration)
 * L3: 工具与感知层 (Tools & Senses)
 * L2: 运行时与观察层 (Runtime & Observability)
 * L1: 记忆存储层 (Memory Storage)
 */

// ============================================
// Core
// ============================================
export { AgentRuntime } from './core/AgentRuntime'
export { IntentRouter } from './core/IntentRouter'
export { StateMachine } from './core/StateMachine'

// ============================================
// Skills
// ============================================
export { skillEngine, SkillEngine } from './skills/SkillEngine'
export { builtinSkills } from './skills/builtin'

// ============================================
// Memory (按功能拆分的子模块)
// ============================================
export { 
  MemoryManager, 
  getMemoryManager 
} from './memory'
export { 
  EntityManager, 
  getEntityManager 
} from './memory/entities/EntityManager'
export { 
  TaskManager, 
  getTaskManager 
} from './memory/tasks/TaskManager'
export { 
  SessionManager, 
  getSessionManager 
} from './memory/context/SessionManager'
export { 
  SkillMemoryManager, 
  getSkillMemoryManager 
} from './memory/skills/SkillMemoryManager'

// ============================================
// Runtime
// ============================================
export { LoggerImpl } from './runtime/Logger'
export { CostTrackerImpl } from './runtime/CostTracker'

// ============================================
// LLM
// ============================================
export { LLMProvider, getModelPricing } from './llm/types'
export type {
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMProviderConfig,
  ProviderType,
  LLMManagerConfig
} from './llm/types'

export {
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  ZhipuProvider,
  DeepSeekProvider,
  QwenProvider,
  KimiProvider
} from './llm'

export {
  LLMManager,
  createLLMManager,
  getLLMManager
} from './llm/manager'

// ============================================
// Config
// ============================================
export {
  loadEnvConfig,
  createLLMConfigFromEnv,
  getEnabledProviders,
  isProviderConfigured
} from './config/env'

// ============================================
// Chat Service
// ============================================
export { useChatService } from './chat-service'
export type { ChatMessage, ChatOptions } from './chat-service'

// ============================================
// Types (统一类型导出)
// ============================================
export type * from './types'

// ============================================
// 注意：以下导出被注释掉以避免循环依赖
// 如需使用，请直接从源文件导入
// ============================================

// 测试函数（从 test-llm-api.ts）- 可能导致循环依赖
// export { runLLMAPITests, testDeepSeek, ... } from './test-llm-api'

// 示例用法（从 example-usage.ts）- 仅作为参考
// export { examples } from './example-usage'

// ============================================
// 版本信息
// ============================================
export const VERSION = '1.0.0'
export const CODENAME = 'Digital Life'

/**
 * 检查系统健康状态
 */
export async function checkHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, boolean>
}> {
  const components: Record<string, boolean> = {
    agentRuntime: true,
    memoryManager: true,
    skillEngine: true,
    gitIntegration: true
  }

  // 检查 Git 状态
  try {
    const { execSync } = await import('child_process')
    execSync('git status', { stdio: 'ignore' })
    components.gitIntegration = true
  } catch {
    components.gitIntegration = false
  }

  const allHealthy = Object.values(components).every(v => v)
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    components
  }
}
