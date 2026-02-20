/**
 * LLM Manager - 带故障切换的多 Provider 管理器
 * 
 * 新增功能:
 * - Provider 故障自动切换
 * - 健康状态检查
 * - 智能路由选择
 * - 失败重试机制
 */

import type { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMStreamChunk,
  LLMProviderConfig,
  ProviderType,
  LLMManagerConfig
} from './types'

// 使用历史记录类型
interface UsageHistoryItem {
  timestamp: number
  provider: ProviderType
  model: string
  tokens: number
  cost: number
}

// Provider 健康状态
interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastCheck: number
  consecutiveFailures: number
  totalRequests: number
  failedRequests: number
  avgResponseTime: number
  lastError?: string
}

// Provider implementations
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { GeminiProvider } from './providers/gemini'
import { ZhipuProvider } from './providers/zhipu'
import { DeepSeekProvider } from './providers/deepseek'
import { QwenProvider } from './providers/qwen'
import { KimiProvider } from './providers/kimi'

// 配置接口扩展
interface FailoverConfig {
  enabled: boolean
  maxRetries: number
  retryDelay: number
  healthCheckInterval: number
  failureThreshold: number // 连续失败次数阈值
  responseTimeThreshold: number // 响应时间阈值(ms)
}

export class LLMManager {
  private providers: Map<ProviderType, LLMProvider> = new Map()
  private providerHealth: Map<ProviderType, ProviderHealth> = new Map()
  private config: LLMManagerConfig & { failover: FailoverConfig }
  private dailyUsage: number = 0
  private usageHistory: UsageHistoryItem[] = []
  private healthCheckTimer: number | null = null

  constructor(config: LLMManagerConfig) {
    this.config = {
      dailyBudget: 10,
      ...config,
      failover: {
        enabled: true,
        maxRetries: 2,
        retryDelay: 1000,
        healthCheckInterval: 60000, // 1分钟
        failureThreshold: 3,
        responseTimeThreshold: 10000, // 10秒
        ...config.failover
      }
    }
    this.initializeProviders()
    this.loadUsageFromStorage()
    this.startHealthChecks()
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
        // 初始化健康状态
        this.providerHealth.set(type as ProviderType, {
          status: 'healthy',
          lastCheck: Date.now(),
          consecutiveFailures: 0,
          totalRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0
        })
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
   * 启动健康检查
   */
  private startHealthChecks(): void {
    if (!this.config.failover.enabled) return
    
    this.healthCheckTimer = window.setInterval(() => {
      this.performHealthChecks()
    }, this.config.failover.healthCheckInterval)
  }

  /**
   * 执行健康检查
   */
  private async performHealthChecks(): Promise<void> {
    for (const [type, provider] of this.providers) {
      try {
        const startTime = Date.now()
        
        // 简单的健康检查：尝试一个快速的 API 调用
        await provider.chat({
          messages: [{ role: 'user', content: 'hi' }],
          maxTokens: 5
        })
        
        const responseTime = Date.now() - startTime
        this.updateHealthStatus(type, true, responseTime)
        
      } catch (error) {
        this.updateHealthStatus(type, false, 0, error instanceof Error ? error.message : String(error))
      }
    }
  }

  /**
   * 更新健康状态
   */
  private updateHealthStatus(
    type: ProviderType, 
    success: boolean, 
    responseTime: number,
    error?: string
  ): void {
    const health = this.providerHealth.get(type)
    if (!health) return

    health.totalRequests++
    health.lastCheck = Date.now()

    if (success) {
      health.consecutiveFailures = 0
      health.lastError = undefined
      
      // 更新平均响应时间
      health.avgResponseTime = 
        (health.avgResponseTime * (health.totalRequests - 1) + responseTime) / health.totalRequests
      
      // 根据响应时间和失败率确定状态
      if (health.avgResponseTime > this.config.failover.responseTimeThreshold) {
        health.status = 'degraded'
      } else {
        health.status = 'healthy'
      }
    } else {
      health.failedRequests++
      health.consecutiveFailures++
      health.lastError = error
      
      if (health.consecutiveFailures >= this.config.failover.failureThreshold) {
        health.status = 'unhealthy'
      } else {
        health.status = 'degraded'
      }
    }

    this.providerHealth.set(type, health)
  }

  /**
   * 获取最佳可用 Provider
   */
  private getBestProvider(preferredType?: ProviderType): { provider: LLMProvider; type: ProviderType } {
    const candidates: Array<{ type: ProviderType; provider: LLMProvider; health: ProviderHealth }> = []

    // 收集所有可用的 provider
    for (const [type, provider] of this.providers) {
      const health = this.providerHealth.get(type)
      if (health && health.status !== 'unhealthy') {
        candidates.push({ type, provider, health })
      }
    }

    if (candidates.length === 0) {
      throw new Error('No healthy LLM providers available')
    }

    // 如果指定了首选 provider 且健康，优先使用
    if (preferredType) {
      const preferred = candidates.find(c => c.type === preferredType)
      if (preferred) {
        return { provider: preferred.provider, type: preferred.type }
      }
    }

    // 按健康状态排序：healthy > degraded
    candidates.sort((a, b) => {
      if (a.health.status === b.health.status) {
        // 相同状态下，选择平均响应时间更短的
        return a.health.avgResponseTime - b.health.avgResponseTime
      }
      return a.health.status === 'healthy' ? -1 : 1
    })

    return { provider: candidates[0].provider, type: candidates[0].type }
  }

  /**
   * 获取指定 provider
   */
  getProvider(type?: ProviderType): LLMProvider {
    const { provider } = this.getBestProvider(type)
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
   * 发送聊天请求（带故障切换）
   */
  async chat(
    request: LLMRequest,
    providerType?: ProviderType
  ): Promise<LLMResponse & { cost: number; provider: ProviderType }> {
    if (this.isOverBudget()) {
      throw new Error('Daily budget exceeded')
    }

    const errors: Array<{ type: ProviderType; error: string }> = []
    let attempts = 0
    const maxAttempts = Math.min(
      this.config.failover.maxRetries + 1,
      this.providers.size
    )

    while (attempts < maxAttempts) {
      try {
        const { provider, type } = this.getBestProvider(
          attempts === 0 ? providerType : undefined
        )
        
        const startTime = Date.now()
        const response = await provider.chat(request)
        const responseTime = Date.now() - startTime
        
        const cost = provider.calculateCost(response.usage)

        // 更新健康状态
        this.updateHealthStatus(type, true, responseTime)

        // 记录使用量
        this.recordUsage(type, response.model, response.usage.totalTokens, cost)

        return { ...response, cost, provider: type }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const currentProvider = attempts === 0 && providerType ? providerType : 'fallback'
        
        errors.push({ type: currentProvider, error: errorMsg })
        
        // 更新健康状态
        this.updateHealthStatus(currentProvider, false, 0, errorMsg)
        
        attempts++
        
        if (attempts < maxAttempts) {
          // 等待后重试
          await this.delay(this.config.failover.retryDelay * attempts)
        }
      }
    }

    // 所有 provider 都失败了
    throw new Error(
      `All LLM providers failed after ${attempts} attempts:\n` +
      errors.map(e => `  ${e.type}: ${e.error}`).join('\n')
    )
  }

  /**
   * 流式聊天请求（带故障切换）
   * P0-3: 支持通过 signal 取消请求
   */
  async chatStream(
    request: LLMRequest,
    onChunk: (chunk: LLMStreamChunk & { cost?: number; provider?: ProviderType }) => void,
    providerType?: ProviderType
  ): Promise<{ usage: LLMResponse['usage']; cost: number; provider: ProviderType }> {
    if (this.isOverBudget()) {
      throw new Error('Daily budget exceeded')
    }

    // P0-3: 检查是否已被取消
    if (request.signal?.aborted) {
      throw new Error('Request aborted')
    }

    const errors: Array<{ type: ProviderType; error: string }> = []
    let attempts = 0
    const maxAttempts = Math.min(
      this.config.failover.maxRetries + 1,
      this.providers.size
    )

    while (attempts < maxAttempts) {
      // P0-3: 检查是否已被取消
      if (request.signal?.aborted) {
        throw new Error('Request aborted')
      }

      try {
        const { provider, type } = this.getBestProvider(
          attempts === 0 ? providerType : undefined
        )
        
        let totalContent = ''
        let finalUsage: LLMResponse['usage'] = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }

        const startTime = Date.now()

        await provider.chatStream(request, (chunk) => {
          totalContent += chunk.content
          if (chunk.finishReason) {
            finalUsage = {
              promptTokens: provider.estimateTokens(
                request.messages.map(m => m.content).join('\n')
              ),
              completionTokens: provider.estimateTokens(totalContent),
              totalTokens: 0
            }
            finalUsage.totalTokens = finalUsage.promptTokens + finalUsage.completionTokens
          }
          onChunk({ ...chunk, provider: type })
        })

        const responseTime = Date.now() - startTime
        const cost = provider.calculateCost(finalUsage)
        
        // 更新健康状态
        this.updateHealthStatus(type, true, responseTime)

        // 记录使用量
        this.recordUsage(type, request.model || 'unknown', finalUsage.totalTokens, cost)

        return { usage: finalUsage, cost, provider: type }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        // P0-3: 如果是用户取消，直接抛出不重试
        if (errorMsg === 'Request aborted') {
          throw error
        }
        
        const currentProvider = attempts === 0 && providerType ? providerType : 'fallback'
        
        errors.push({ type: currentProvider, error: errorMsg })
        
        // 更新健康状态
        this.updateHealthStatus(currentProvider, false, 0, errorMsg)
        
        attempts++
        
        if (attempts < maxAttempts) {
          await this.delay(this.config.failover.retryDelay * attempts)
        }
      }
    }

    throw new Error(
      `All LLM providers failed after ${attempts} attempts:\n` +
      errors.map(e => `  ${e.type}: ${e.error}`).join('\n')
    )
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
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
  getAvailableModels(): Array<{ provider: ProviderType; models: string[]; health: ProviderHealth }> {
    const result: Array<{ provider: ProviderType; models: string[]; health: ProviderHealth }> = []
    
    for (const [type, provider] of this.providers) {
      const health = this.providerHealth.get(type)
      if (health) {
        result.push({
          provider: type,
          models: provider.getAvailableModels(),
          health
        })
      }
    }
    
    return result
  }

  /**
   * 获取 Provider 健康状态
   */
  getProviderHealth(): Map<ProviderType, ProviderHealth> {
    return new Map(this.providerHealth)
  }

  /**
   * 估算 token 数量
   */
  estimateTokens(text: string, providerType?: ProviderType): number {
    const { provider } = this.getBestProvider(providerType)
    return provider.estimateTokens(text)
  }

  /**
   * 获取使用统计
   */
  getUsageStats(): {
    dailyUsage: number
    dailyBudget: number
    remaining: number
    history: UsageHistoryItem[]
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

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
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

// 导出类型
export type { ProviderHealth, FailoverConfig }
