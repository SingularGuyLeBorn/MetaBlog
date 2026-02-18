/**
 * SkillMemoryManager.ts - 技能记忆管理
 * 负责技能执行历史、偏好学习、技能效果追踪
 */
import type { TaskHistory } from '../../core/types'
import { saveSkillExecution as saveSkillExecutionApi } from '../../api/memory'

/**
 * 技能执行记录
 */
export interface SkillExecutionRecord {
  id: string
  skillName: string
  input: Record<string, any>
  output: any
  success: boolean
  executionTime: number
  tokensUsed: number
  cost: number
  executedAt: number
}

/**
 * 技能偏好配置
 */
export interface SkillPreference {
  skillName: string
  preferredParams: Record<string, any>
  successRate: number
  avgExecutionTime: number
  totalExecutions: number
}

// 内存缓存
const executionCache: SkillExecutionRecord[] = []
const preferenceCache = new Map<string, SkillPreference>()

/**
 * 技能记忆管理器
 */
export class SkillMemoryManager {
  /**
   * 记录技能执行
   */
  async recordExecution(record: Omit<SkillExecutionRecord, 'id' | 'executedAt'>): Promise<void> {
    const fullRecord: SkillExecutionRecord = {
      ...record,
      id: `skill_exec_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      executedAt: Date.now()
    }
    
    executionCache.push(fullRecord)
    
    // 更新偏好统计
    await this.updatePreference(record.skillName, fullRecord)
    
    // 异步保存到服务器
    await saveSkillExecutionApi(fullRecord).catch((e: any) => {
      console.warn('[SkillMemory] Failed to save execution:', e)
    })
  }

  /**
   * 获取技能执行历史
   * @todo 将在技能分析面板中启用
   */
  async getExecutionHistory(skillName?: string, limit: number = 20): Promise<SkillExecutionRecord[]> {
    let results = executionCache
    if (skillName) {
      results = results.filter(r => r.skillName === skillName)
    }
    return results
      .sort((a, b) => b.executedAt - a.executedAt)
      .slice(0, limit)
  }

  /**
   * 获取技能偏好
   */
  async getPreference(skillName: string): Promise<SkillPreference | null> {
    return preferenceCache.get(skillName) || null
  }

  /**
   * 获取所有技能偏好
   * @todo 将在技能管理面板中启用
   */
  async getAllPreferences(): Promise<SkillPreference[]> {
    return Array.from(preferenceCache.values())
  }

  /**
   * 获取推荐参数（基于历史成功率）
   * @todo 将在智能参数推荐功能中启用
   */
  async getRecommendedParams(skillName: string, input: Record<string, any>): Promise<Record<string, any> | null> {
    const pref = await this.getPreference(skillName)
    if (!pref || pref.successRate < 0.5) return null

    return { ...pref.preferredParams, ...input }
  }

  /**
   * 分析技能成功率
   * @todo 将在技能统计报告中启用
   */
  async analyzeSuccessRate(skillName: string): Promise<{
    successRate: number
    total: number
    avgTime: number
    avgCost: number
  }> {
    const executions = executionCache.filter(e => e.skillName === skillName)
    if (executions.length === 0) {
      return { successRate: 0, total: 0, avgTime: 0, avgCost: 0 }
    }

    const successful = executions.filter(e => e.success).length
    const totalTime = executions.reduce((sum, e) => sum + e.executionTime, 0)
    const totalCost = executions.reduce((sum, e) => sum + e.cost, 0)

    return {
      successRate: successful / executions.length,
      total: executions.length,
      avgTime: totalTime / executions.length,
      avgCost: totalCost / executions.length
    }
  }

  /**
   * 从任务历史学习偏好
   * @todo 将在自动学习功能中启用
   */
  async learnFromTask(task: TaskHistory): Promise<void> {
    if (!task.steps || task.steps.length === 0) return

    // 从任务步骤中提取技能执行记录
    for (const step of task.steps) {
      await this.recordExecution({
        skillName: step.skill,
        input: step.input,
        output: step.output,
        success: task.result === 'success',
        executionTime: step.completedAt ? step.completedAt - step.startedAt : 0,
        tokensUsed: step.tokens,
        cost: step.cost
      })
    }
  }

  /**
   * 获取最常用技能
   * @todo 将在技能热度排行中启用
   */
  async getMostUsedSkills(limit: number = 5): Promise<{ skillName: string; count: number }[]> {
    const counts = new Map<string, number>()
    for (const exec of executionCache) {
      counts.set(exec.skillName, (counts.get(exec.skillName) || 0) + 1)
    }
    
    return Array.from(counts.entries())
      .map(([skillName, count]) => ({ skillName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * 获取技能使用建议
   * @todo 将在技能助手功能中启用
   */
  async getUsageAdvice(skillName: string): Promise<string[]> {
    const advice: string[] = []
    const pref = await this.getPreference(skillName)
    
    if (!pref) {
      advice.push(`技能 "${skillName}" 暂无使用记录`)
      return advice
    }

    if (pref.successRate < 0.5) {
      advice.push(`该技能成功率较低 (${(pref.successRate * 100).toFixed(1)}%)，建议检查输入参数`)
    } else if (pref.successRate > 0.9) {
      advice.push(`该技能成功率很高 (${(pref.successRate * 100).toFixed(1)}%)，可放心使用`)
    }

    if (pref.avgExecutionTime > 30000) {
      advice.push(`执行时间较长 (平均 ${(pref.avgExecutionTime / 1000).toFixed(1)}s)，建议优化`)
    }

    return advice
  }

  // ============ 私有方法 ============

  private async updatePreference(skillName: string, record: SkillExecutionRecord): Promise<void> {
    let pref = preferenceCache.get(skillName)
    
    if (!pref) {
      pref = {
        skillName,
        preferredParams: {},
        successRate: 0,
        avgExecutionTime: 0,
        totalExecutions: 0
      }
      preferenceCache.set(skillName, pref)
    }

    // 更新统计
    const total = pref.totalExecutions + 1
    const successful = executionCache.filter(
      e => e.skillName === skillName && e.success
    ).length

    pref.successRate = successful / total
    pref.avgExecutionTime = 
      (pref.avgExecutionTime * pref.totalExecutions + record.executionTime) / total
    pref.totalExecutions = total

    // 记录成功参数
    if (record.success) {
      pref.preferredParams = { ...pref.preferredParams, ...record.input }
    }
  }
}

// 导出单例
let instance: SkillMemoryManager | null = null
export function getSkillMemoryManager(): SkillMemoryManager {
  if (!instance) {
    instance = new SkillMemoryManager()
  }
  return instance
}
