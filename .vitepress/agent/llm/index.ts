/**
 * LLM Module
 * 多厂商大语言模型适配器
 */

// 类型
export type {
  LLMMessage,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  LLMTool,
  LLMProviderConfig,
  ProviderType,
  LLMManagerConfig
} from './types'

export { LLMProvider, getModelPricing } from './types'

// Providers
export { OpenAIProvider } from './providers/openai'
export { AnthropicProvider } from './providers/anthropic'
export { GeminiProvider } from './providers/gemini'
export { ZhipuProvider } from './providers/zhipu'
export { DeepSeekProvider } from './providers/deepseek'
export { QwenProvider } from './providers/qwen'
export { KimiProvider } from './providers/kimi'

// Manager
export { 
  LLMManager, 
  createLLMManager, 
  getLLMManager 
} from './manager'

// Config (注意：避免与 agent/index.ts 重复导入)
// 如需使用 config/env 中的函数，请直接从 agent/index.ts 导入
