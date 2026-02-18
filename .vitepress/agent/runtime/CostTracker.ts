/**
 * Cost Tracker - Token 计费追踪
 * 追踪 AI 调用的成本和 Token 使用情况
 */
import type { CostTracker as ICostTracker, CostEntry } from '../core/types'

// 模型定价（每 1K tokens，美元）
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'default': { input: 0.01, output: 0.02 }
}

export class CostTrackerImpl implements ICostTracker {
  private entries: CostEntry[] = []
  private listeners: Set<(entry: CostEntry) => void> = new Set()
  private budgetLimit: number = 10 // 每日预算限制（美元）

  constructor(budgetLimit?: number) {
    if (budgetLimit) {
      this.budgetLimit = budgetLimit
    }
    this.loadFromStorage()
  }

  record(entry: CostEntry): void {
    // 如果 entry 没有成本，自动计算
    if (!entry.cost && entry.tokens) {
      entry.cost = this.calculateCost(entry.model, entry.tokens)
    }

    this.entries.push(entry)
    this.persistToStorage()

    // 触发监听器
    this.listeners.forEach(cb => {
      try {
        cb(entry)
      } catch (e) {
        console.error('Cost tracker listener error:', e)
      }
    })

    // 检查预算警告
    this.checkBudgetWarning()
  }

  getTotalCost(): number {
    return this.entries.reduce((sum, e) => sum + e.cost, 0)
  }

  getCostByTask(taskId: string): number {
    return this.entries
      .filter(e => e.taskId === taskId)
      .reduce((sum, e) => sum + e.cost, 0)
  }

  getCostBySkill(skill: string): number {
    return this.entries
      .filter(e => e.skill === skill)
      .reduce((sum, e) => sum + e.cost, 0)
  }

  getDailyCost(date: string): number {
    // date 格式: 'YYYY-MM-DD'
    const targetDate = new Date(date).setHours(0, 0, 0, 0)
    const nextDate = targetDate + 24 * 60 * 60 * 1000

    return this.entries
      .filter(e => {
        const entryDate = new Date(e.timestamp).setHours(0, 0, 0, 0)
        return entryDate >= targetDate && entryDate < nextDate
      })
      .reduce((sum, e) => sum + e.cost, 0)
  }

  getTodayCost(): number {
    const today = new Date().toISOString().split('T')[0]
    return this.getDailyCost(today)
  }

  /**
   * 获取 Token 统计
   */
  getTokenStats(): {
    total: number
    byModel: Record<string, number>
    bySkill: Record<string, number>
  } {
    const byModel: Record<string, number> = {}
    const bySkill: Record<string, number> = {}
    let total = 0

    for (const entry of this.entries) {
      total += entry.tokens
      byModel[entry.model] = (byModel[entry.model] || 0) + entry.tokens
      bySkill[entry.skill] = (bySkill[entry.skill] || 0) + entry.tokens
    }

    return { total, byModel, bySkill }
  }

  /**
   * 获取成本统计
   */
  getCostStats(): {
    total: number
    byModel: Record<string, number>
    bySkill: Record<string, number>
    today: number
  } {
    const byModel: Record<string, number> = {}
    const bySkill: Record<string, number> = {}

    for (const entry of this.entries) {
      byModel[entry.model] = (byModel[entry.model] || 0) + entry.cost
      bySkill[entry.skill] = (bySkill[entry.skill] || 0) + entry.cost
    }

    return {
      total: this.getTotalCost(),
      byModel,
      bySkill,
      today: this.getTodayCost()
    }
  }

  /**
   * 计算成本
   */
  calculateCost(model: string, tokens: number, isOutput: boolean = true): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['default']
    const rate = isOutput ? pricing.output : pricing.input
    return (tokens / 1000) * rate
  }

  /**
   * 估算成本
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING['default']
    const inputCost = (inputTokens / 1000) * pricing.input
    const outputCost = (outputTokens / 1000) * pricing.output
    return inputCost + outputCost
  }

  /**
   * 检查是否超出预算
   */
  isOverBudget(): boolean {
    return this.getTodayCost() > this.budgetLimit
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudget(): number {
    return Math.max(0, this.budgetLimit - this.getTodayCost())
  }

  /**
   * 设置预算限制
   */
  setBudgetLimit(limit: number): void {
    this.budgetLimit = limit
  }

  /**
   * 监听成本变化
   */
  onCost(callback: (entry: CostEntry) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * 导出成本报告
   */
  exportReport(): string {
    const stats = this.getCostStats()
    const tokenStats = this.getTokenStats()

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalCost: `$${stats.total.toFixed(4)}`,
        todayCost: `$${stats.today.toFixed(4)}`,
        budgetLimit: `$${this.budgetLimit.toFixed(2)}`,
        remaining: `$${this.getRemainingBudget().toFixed(4)}`,
        totalTokens: tokenStats.total
      },
      bySkill: Object.entries(stats.bySkill).map(([skill, cost]) => ({
        skill,
        cost: `$${cost.toFixed(4)}`,
        tokens: tokenStats.bySkill[skill] || 0
      })),
      byModel: Object.entries(stats.byModel).map(([model, cost]) => ({
        model,
        cost: `$${cost.toFixed(4)}`,
        tokens: tokenStats.byModel[model] || 0
      })),
      entries: this.entries.slice(-50).map(e => ({
        ...e,
        timestamp: new Date(e.timestamp).toISOString(),
        cost: `$${e.cost.toFixed(4)}`
      }))
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * 格式化成本显示
   */
  static formatCost(cost: number): string {
    if (cost < 0.01) {
      return `${(cost * 100).toFixed(2)}¢`
    }
    return `$${cost.toFixed(4)}`
  }

  /**
   * 格式化 Token 显示
   */
  static formatTokens(tokens: number): string {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  // ============================================
  // 私有方法
  // ============================================

  private checkBudgetWarning(): void {
    const todayCost = this.getTodayCost()
    const ratio = todayCost / this.budgetLimit

    if (ratio >= 1) {
      console.warn(`⚠️ 每日预算已用完！今日花费: $${todayCost.toFixed(4)}`)
    } else if (ratio >= 0.8) {
      console.warn(`⚠️ 每日预算即将用完: ${(ratio * 100).toFixed(0)}%`)
    }
  }

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      localStorage.setItem('metablog_cost_entries', JSON.stringify(this.entries))
    } catch (e) {
      // 如果存储失败，保留最近的条目
      this.entries = this.entries.slice(-100)
      try {
        localStorage.setItem('metablog_cost_entries', JSON.stringify(this.entries))
      } catch (e2) {
        // 忽略
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem('metablog_cost_entries')
      if (stored) {
        this.entries = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load cost entries:', e)
    }
  }
}

// 导出别名，方便组件导入
export { CostTrackerImpl as CostTracker }
