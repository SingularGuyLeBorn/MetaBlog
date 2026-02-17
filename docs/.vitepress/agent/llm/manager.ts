/**
 * LLM Manager
 * 统一管理多个 LLM Provider
 */
import type { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig,
  ProviderType 
} from './types'

// Provider implementations
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { GeminiProvider } from './providers/gemini'
import { ZhipuProvider } from './providers/zhipu'
import { DeepSeekProvider } from './providers/deepseek'
import { QwenProvider } from './providers/qwen'
import { KimiProvider } from './providers/kimi'

export interface LLMManagerConfig {
  // 默认使用的 provider
  defaultProvider: ProviderType
  // 各 provider 的配置
  providers: Partial<Record<ProviderType, LLMProviderConfig>>
  // 每日预算限制（美元）
  dailyBudget?: number
}

export class LLMManager {
  private providers: Map<ProviderType, LLMProvider> = new Map()
  private config: LLMManagerConfig
  private dailyUsage: number = 0
  private usageHistory: Array<{
    timestamp: number
    provider: ProviderType
    model: string
    tokens: number
    cost: number
  }> = []

  constructor(config: LLMManagerConfig) {
    this.config = {
      dailyBudget: 10,
      ...config
    }
    this.initializeProviders()
    this.loadUsageFromStorage()
  }

  /**
   * 初始化所有配置的 provider
   */
  private initializeProviders(): void {
    for (const [type, providerConfig] of Object.entries(this.config.providers)) {
      if (!providerConfig?.apiKey) continue

      const provider = this.createProvider(type as ProviderType, providerConfig)
      if (provider) {
        this.providers.set(type as ProviderType, provider)
      }
    }
  }

  /**
   * 创建 Provider 实例
   */
  private createProvider(type: ProviderType, config: LLMProviderConfig): LLMProvider | null {
    switch (type) {
      case 'openai':
        return new OpenAIProvider(config)
      case 'anthropic':
        return new AnthropicProvider(config)
      case 'gemini':
        return new GeminiProvider(config)
      case 'zhipu':
        return new ZhipuProvider(config)
      case 'deepseek':
        return new DeepSeekProvider(config)
      case 'qwen':
        return new QwenProvider(config)
      case 'kimi':
        return new KimiProvider(config)
      default:
        return null
    }
  }

  /**
   * 获取指定 provider
   */
  getProvider(type?: ProviderType): LLMProvider {
    const providerType = type || this.config.defaultProvider
    const provider = this.providers.get(providerType)
    
    if (!provider) {
      throw new Error(`Provider ${providerType} not found or not configured`)
    }
    
    return provider
  }

  /**
   * 检查是否超出预算
   */
  isOverBudget(): boolean {
    return this.dailyUsage >= (this.config.dailyBudget || 10)
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudget(): number {
    return Math.max(0, (this.config.dailyBudget || 10) - this.dailyUsage)
  }

  /**
   * 发送聊天请求
   */
  async chat(
    request: LLMRequest,
    providerType?: ProviderType
  ): Promise<LLMResponse & { cost: number }> {
    if (this.isOverBudget()) {
      throw new Error('Daily budget exceeded')
    }

    const provider = this.getProvider(providerType)
    const response = await provider.chat(request)
    const cost = provider.calculateCost(response.usage)

    // 记录使用量
    this.recordUsage(providerType || this.config.defaultProvider, response.model, response.usage.totalTokens, cost)

    return { ...response, cost }
  }

  /**
   * 流式聊天请求
   */
  async chatStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk & { cost?: number }) => void,
    providerType?: ProviderType
  ): Promise<{ usage: LLMResponse['usage']; cost: number }> {
    if (this.isOverBudget()) {
      throw new Error('Daily budget exceeded')
    }

    const provider = this.getProvider(providerType)
    
    let totalContent = ''
    let finalUsage: LLMResponse['usage'] = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    }

    await provider.chatStream(request, (chunk) => {
      totalContent += chunk.content
      if (chunk.finishReason) {
        // 估算 token 使用量
        finalUsage = {
          promptTokens: provider.estimateTokens(
            request.messages.map(m => m.content).join('\n')
          ),
          completionTokens: provider.estimateTokens(totalContent),
          totalTokens: 0
        }
        finalUsage.totalTokens = finalUsage.promptTokens + finalUsage.completionTokens
      }
      onChunk(chunk)
    })

    const cost = provider.calculateCost(finalUsage)
    this.recordUsage(providerType || this.config.defaultProvider, request.model || 'unknown', finalUsage.totalTokens, cost)

    return { usage: finalUsage, cost }
  }

  /**
   * 获取所有可用的 providers
   */
  getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys())
  }

  /**
   * 获取所有可用模型
   */
  getAvailableModels(): Array<{ provider: ProviderType; models: string[] }> {
    const result: Array<{ provider: ProviderType; models: string[] }> = []
    
    for (const [type, provider] of this.providers) {
      result.push({
        provider: type,
        models: provider.getAvailableModels()
      })
    }
    
    return result
  }

  /**
   * 估算 token 数量
   */
  estimateTokens(text: string, providerType?: ProviderType): number {
    const provider = this.getProvider(providerType)
    return provider.estimateTokens(text)
  }

  /**
   * 获取使用统计
   */
  getUsageStats(): {
    dailyUsage: number
    dailyBudget: number
    remaining: number
    history: typeof this.usageHistory
  } {
    return {
      dailyUsage: this.dailyUsage,
      dailyBudget: this.config.dailyBudget || 10,
      remaining: this.getRemainingBudget(),
      history: this.usageHistory
    }
  }

  /**
   * 记录使用量
   */
  private recordUsage(provider: ProviderType, model: string, tokens: number, cost: number): void {
    this.dailyUsage += cost
    this.usageHistory.push({
      timestamp: Date.now(),
      provider,
      model,
      tokens,
      cost
    })
    
    this.saveUsageToStorage()

    // 预算警告
    if (this.isOverBudget()) {
      console.warn('⚠️ Daily budget exceeded!')
    } else if (this.dailyUsage >= (this.config.dailyBudget || 10) * 0.8) {
      console.warn('⚠️ Daily budget almost exceeded!')
    }
  }

  /**
   * 从存储加载使用量
   */
  private loadUsageFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem('metablog_llm_usage')
      if (stored) {
        const data = JSON.parse(stored)
        const today = new Date().toDateString()
        
        // 只加载今天的使用量
        if (data.date === today) {
          this.dailyUsage = data.dailyUsage || 0
          this.usageHistory = data.history || []
        } else {
          // 新的一天，重置
          this.dailyUsage = 0
          this.usageHistory = []
        }
      }
    } catch (e) {
      console.error('Failed to load LLM usage:', e)
    }
  }

  /**
   * 保存使用量到存储
   */
  private saveUsageToStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      localStorage.setItem('metablog_llm_usage', JSON.stringify({
        date: new Date().toDateString(),
        dailyUsage: this.dailyUsage,
        history: this.usageHistory.slice(-100) // 只保留最近 100 条
      }))
    } catch (e) {
      console.error('Failed to save LLM usage:', e)
    }
  }

  /**
   * 重置每日使用量（新的一天）
   */
  resetDailyUsage(): void {
    this.dailyUsage = 0
    this.usageHistory = []
    this.saveUsageToStorage()
  }
}

// 单例实例
let llmManagerInstance: LLMManager | null = null

export function createLLMManager(config: LLMManagerConfig): LLMManager {
  llmManagerInstance = new LLMManager(config)
  return llmManagerInstance
}

export function getLLMManager(): LLMManager {
  if (!llmManagerInstance) {
    throw new Error('LLM Manager not initialized')
  }
  return llmManagerInstance
}
