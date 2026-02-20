/**
 * LLM Provider 统一类型定义
 * 支持多厂商适配：OpenAI, Anthropic, Google, 智谱, DeepSeek, Qwen, Kimi
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMRequest {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  tools?: LLMTool[]
  signal?: AbortSignal  // P0-3: 支持请求取消
}

export interface LLMResponse {
  content: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  finishReason: string
}

export interface LLMTool {
  name: string
  description: string
  parameters: Record<string, any>
}

export interface LLMStreamChunk {
  content: string
  reasoning?: string  // 深度思考模式的推理过程
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  finishReason?: string
}

export interface LLMProviderConfig {
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
}

export abstract class LLMProvider {
  protected config: LLMProviderConfig
  abstract name: string

  constructor(config: LLMProviderConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      ...config
    }
  }

  /**
   * 发送聊天请求
   */
  abstract chat(request: LLMRequest): Promise<LLMResponse>

  /**
   * 流式聊天请求
   * P0-3: 当 signal 触发 abort 时，应停止流式读取
   */
  abstract chatStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void>

  /**
   * 计算 Token 数量（估算）
   */
  abstract estimateTokens(text: string): number

  /**
   * 获取提供商特定的模型列表
   */
  abstract getAvailableModels(): string[]

  /**
   * 计算成本
   */
  abstract calculateCost(usage: LLMResponse['usage']): number
}

// 支持的厂商类型
export type ProviderType = 
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'zhipu'
  | 'deepseek'
  | 'qwen'
  | 'kimi'
  | 'fallback'  // 故障降级专用

// LLM Manager 配置
export interface LLMManagerConfig {
  // 默认使用的 provider
  defaultProvider: ProviderType
  // 各 provider 的配置
  providers: Partial<Record<ProviderType, LLMProviderConfig>>
  // 每日预算限制（美元）
  dailyBudget?: number
  // 是否启用自动跟进/重试
  followup?: boolean
}

// 模型定价（每 1K tokens，美元）
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  
  // Anthropic
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  
  // Google Gemini
  'gemini-1.5-pro': { input: 0.0035, output: 0.0105 },
  'gemini-1.5-flash': { input: 0.00035, output: 0.00105 },
  'gemini-pro': { input: 0.0005, output: 0.0015 },
  
  // 智谱清言 (GLM)
  'glm-4': { input: 0.0014, output: 0.0014 },
  'glm-4-plus': { input: 0.0014, output: 0.0014 },
  'glm-4-flash': { input: 0.00007, output: 0.00007 },
  
  // DeepSeek
  'deepseek-chat': { input: 0.00027, output: 0.0011 },
  'deepseek-coder': { input: 0.00027, output: 0.0011 },
  'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
  
  // Qwen (阿里云)
  'qwen-max': { input: 0.0035, output: 0.007 },
  'qwen-plus': { input: 0.0008, output: 0.002 },
  'qwen-turbo': { input: 0.0003, output: 0.0006 },
  
  // Kimi (Moonshot)
  'kimi-latest': { input: 0.003, output: 0.003 },
  'kimi-k1': { input: 0.003, output: 0.003 },
  'moonshot-v1-8k': { input: 0.0005, output: 0.0005 },
  'moonshot-v1-32k': { input: 0.001, output: 0.001 },
  'moonshot-v1-128k': { input: 0.002, output: 0.002 }
}

// 获取模型定价
export function getModelPricing(model: string): { input: number; output: number } {
  // 尝试精确匹配
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model]
  }
  
  // 尝试前缀匹配
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(key) || key.startsWith(model)) {
      return pricing
    }
  }
  
  // 默认定价
  return { input: 0.001, output: 0.002 }
}
