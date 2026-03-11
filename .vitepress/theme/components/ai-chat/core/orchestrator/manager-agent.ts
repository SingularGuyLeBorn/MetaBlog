/**
 * Manager Agent 自主决策引擎
 * 
 * 职责：
 * 1. 24/7 监控系统状态
 * 2. 自主管理 Worker Agents（创建、优化、删除）
 * 3. 根据系统负载和任务需求做出决策
 * 4. 实现自我进化逻辑
 * 5. 异常情况自动处理
 * 
 * 约束：
 * - 不能操作系统级 Agent
 * - 只能在用户授权范围内行动
 * - 重要操作需要记录并通知
 */

import type {
  EnhancedAgent,
  DecisionContext,
  DecisionResult,
  EvolutionStrategy,
  EvolutionRecord,
  SystemState,
  HistoricalMetrics,
  CreateWorkerAgentParams,
  AgentTier
} from './types'
import { agentOrchestrator } from './orchestrator'
import { generateUUID } from '../utils/uuid'

/** 决策规则 */
interface DecisionRule {
  id: string
  name: string
  description: string
  condition: (context: DecisionContext) => boolean
  action: (context: DecisionContext) => Promise<DecisionResult>
  priority: number
  enabled: boolean
}

/** Manager Agent 引擎 */
export class ManagerAgentEngine {
  private managerId: string
  private decisionRules: DecisionRule[] = []
  private evolutionStrategies: EvolutionStrategy[] = []
  private decisionHistory: DecisionResult[] = []
  private isRunning = false

  constructor(managerId: string) {
    this.managerId = managerId
    this.initDecisionRules()
    this.initEvolutionStrategies()
  }

  // ==================== 初始化决策规则 ====================

  private initDecisionRules(): void {
    this.decisionRules = [
      // 规则1: 系统负载过高，需要扩容
      {
        id: 'scale-up-on-high-load',
        name: '高负载扩容',
        description: '当系统负载超过阈值时，创建新的Worker Agent',
        condition: (ctx) => {
          const load = ctx.systemState.load
          return load.cpu > 80 || load.queuedTasks > 10
        },
        action: async (ctx) => this.executeScaleUp(ctx),
        priority: 100,
        enabled: true
      },

      // 规则2: 长时间空闲Worker，考虑缩容
      {
        id: 'scale-down-on-idle',
        name: '空闲缩容',
        description: '当Worker长时间空闲时，暂停或删除',
        condition: (ctx) => {
          const idleWorkers = ctx.managedAgents.filter(a => {
            if (a.runtimeStatus !== 'listening' && a.runtimeStatus !== 'scheduled') return false
            if (!a.stats.lastTaskAt) return false
            const idleTime = Date.now() - a.stats.lastTaskAt
            return idleTime > 24 * 60 * 60 * 1000 // 24小时
          })
          return idleWorkers.length > 2 // 超过2个空闲Worker
        },
        action: async (ctx) => this.executeScaleDown(ctx),
        priority: 80,
        enabled: true
      },

      // 规则3: Worker失败率过高，暂停并通知
      {
        id: 'pause-on-high-failure',
        name: '高失败率暂停',
        description: '当Worker失败率超过阈值时，暂停该Worker',
        condition: (ctx) => {
          return ctx.managedAgents.some(a => {
            if (a.stats.totalTasks < 5) return false
            const failureRate = a.stats.failedTasks / a.stats.totalTasks
            return failureRate > 0.3 && a.runtimeStatus !== 'paused'
          })
        },
        action: async (ctx) => this.executePauseOnFailure(ctx),
        priority: 90,
        enabled: true
      },

      // 规则4: 根据历史数据优化Worker配置
      {
        id: 'optimize-on-pattern',
        name: '模式优化',
        description: '根据任务执行模式，优化Worker配置',
        condition: (ctx) => {
          // 每小时检查一次
          const now = Date.now()
          const lastOptimization = this.getLastOptimizationTime()
          return now - lastOptimization > 60 * 60 * 1000
        },
        action: async (ctx) => this.executeOptimization(ctx),
        priority: 50,
        enabled: true
      },

      // 规则5: 创建专用Worker处理积压任务
      {
        id: 'create-for-backlog',
        name: '积压任务处理',
        description: '当任务队列积压时，创建临时Worker',
        condition: (ctx) => {
          return ctx.systemState.pendingTasks > 5
        },
        action: async (ctx) => this.executeCreateForBacklog(ctx),
        priority: 95,
        enabled: true
      },

      // 规则6: 定时任务Worker调度
      {
        id: 'schedule-maintenance',
        name: '定时维护',
        description: '执行定时维护任务',
        condition: (ctx) => {
          const now = new Date()
          // 每天凌晨3点执行维护
          return now.getHours() === 3 && now.getMinutes() < 5
        },
        action: async (ctx) => this.executeMaintenance(ctx),
        priority: 30,
        enabled: true
      }
    ]
  }

  // ==================== 初始化进化策略 ====================

  private initEvolutionStrategies(): void {
    this.evolutionStrategies = [
      {
        id: 'auto-scale',
        name: '自动扩缩容',
        description: '根据负载自动调整Worker数量',
        trigger: {
          type: 'load',
          threshold: 80
        },
        action: {
          type: 'scale_up',
          params: { count: 1 }
        },
        enabled: true
      },
      {
        id: 'failure-recovery',
        name: '故障恢复',
        description: '自动恢复失败的Worker',
        trigger: {
          type: 'error_rate',
          threshold: 0.3
        },
        action: {
          type: 'recreate',
          params: {}
        },
        enabled: true
      },
      {
        id: 'performance-optimization',
        name: '性能优化',
        description: '根据历史性能优化配置',
        trigger: {
          type: 'scheduled',
          schedule: '0 2 * * *' // 每天凌晨2点
        },
        action: {
          type: 'optimize_prompt',
          params: {}
        },
        enabled: true
      }
    ]
  }

  // ==================== 决策执行 ====================

  /**
   * 执行决策循环
   */
  async runDecisionCycle(): Promise<DecisionResult[]> {
    if (this.isRunning) return []
    
    this.isRunning = true
    const results: DecisionResult[] = []

    try {
      const context = await this.buildDecisionContext()
      
      // 按优先级排序规则
      const sortedRules = this.decisionRules
        .filter(r => r.enabled)
        .sort((a, b) => b.priority - a.priority)

      // 评估每个规则
      for (const rule of sortedRules) {
        try {
          const shouldExecute = rule.condition(context)
          
          if (shouldExecute) {
            console.log(`[ManagerAgent] 触发规则: ${rule.name}`)
            const result = await rule.action(context)
            results.push(result)
            this.decisionHistory.push(result)
            
            // 记录决策
            this.logDecision(rule, result)
          }
        } catch (error) {
          console.error(`[ManagerAgent] 规则执行失败: ${rule.name}`, error)
        }
      }

      // 执行进化策略
      await this.executeEvolutionStrategies(context)

    } finally {
      this.isRunning = false
    }

    return results
  }

  /**
   * 构建决策上下文
   */
  private async buildDecisionContext(): Promise<DecisionContext> {
    const manager = agentOrchestrator.getAgent(this.managerId)
    if (!manager || manager.tier !== 'manager') {
      throw new Error('无效的Manager Agent')
    }

    const systemState = agentOrchestrator.getSystemState()
    
    // 获取受管理的Workers
    const managedAgents = manager.childAgentIds
      .map(id => agentOrchestrator.getAgent(id))
      .filter((a): a is EnhancedAgent => a !== undefined && a.tier === 'worker')

    // 获取历史指标
    const historicalData = await this.calculateHistoricalMetrics(managedAgents)

    return {
      systemState,
      managedAgents,
      recentEvents: systemState.recentEvents.slice(0, 20),
      historicalData
    }
  }

  /**
   * 计算历史指标
   */
  private async calculateHistoricalMetrics(agents: EnhancedAgent[]): Promise<HistoricalMetrics> {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    let totalTasks = 0
    let successfulTasks = 0
    let totalDuration = 0
    let errorCount = 0

    for (const agent of agents) {
      for (const task of agent.taskHistory) {
        if (task.startedAt > oneDayAgo) {
          totalTasks++
          if (task.status === 'completed') {
            successfulTasks++
          } else if (task.status === 'failed') {
            errorCount++
          }
          if (task.duration) {
            totalDuration += task.duration
          }
        }
      }
    }

    return {
      timeRange: { start: oneDayAgo, end: now },
      taskSuccessRate: totalTasks > 0 ? successfulTasks / totalTasks : 1,
      averageResponseTime: totalTasks > 0 ? totalDuration / totalTasks : 0,
      errorRate: totalTasks > 0 ? errorCount / totalTasks : 0,
      resourceUtilization: this.calculateResourceUtilization(agents)
    }
  }

  private calculateResourceUtilization(agents: EnhancedAgent[]): number {
    if (agents.length === 0) return 0
    const runningAgents = agents.filter(a => a.runtimeStatus === 'running').length
    return runningAgents / agents.length
  }

  // ==================== 具体行动实现 ====================

  /**
   * 扩容：创建新的Worker
   */
  private async executeScaleUp(context: DecisionContext): Promise<DecisionResult> {
    const workerName = `Worker-${Date.now()}`
    
    const params: CreateWorkerAgentParams = {
      name: workerName,
      description: '自动扩容创建的Worker Agent',
      level: 'custom',
      mode: 'passive',
      managerId: this.managerId,
      capabilities: {
        skillIds: ['content_generation', 'data_collection'],
        toolIds: ['web_search', 'fetch_url', 'create_article'],
        customSystemPrompt: '你是一个通用Worker Agent，负责处理各种任务。'
      }
    }

    const worker = agentOrchestrator.createWorkerAgent(params, this.managerId)

    return {
      decision: 'create_agent',
      targetAgentId: worker.id,
      reason: `系统负载过高(CPU: ${context.systemState.load.cpu}%), 自动扩容创建新Worker`,
      confidence: 0.9,
      expectedOutcome: '分担系统负载，提高并发处理能力'
    }
  }

  /**
   * 缩容：暂停或删除空闲Worker
   */
  private async executeScaleDown(context: DecisionContext): Promise<DecisionResult> {
    // 找到最空闲的Worker
    const idleWorkers = context.managedAgents.filter(a => {
      if (a.runtimeStatus !== 'listening' && a.runtimeStatus !== 'scheduled') return false
      if (!a.stats.lastTaskAt) return true
      const idleTime = Date.now() - a.stats.lastTaskAt
      return idleTime > 24 * 60 * 60 * 1000
    })

    if (idleWorkers.length === 0) {
      return {
        decision: 'no_action',
        reason: '没有找到可以缩容的Worker',
        confidence: 1,
        expectedOutcome: '保持现状'
      }
    }

    // 优先删除最近创建的、空闲时间最长的
    const targetWorker = idleWorkers
      .sort((a, b) => (b.stats.lastTaskAt || 0) - (a.stats.lastTaskAt || 0))[0]

    // 暂停而不是删除，给用户反悔的机会
    agentOrchestrator.pauseAgent(targetWorker.id, this.managerId)

    return {
      decision: 'pause_agent',
      targetAgentId: targetWorker.id,
      reason: `Worker "${targetWorker.name}" 空闲超过24小时，自动暂停以节省资源`,
      confidence: 0.8,
      expectedOutcome: '释放资源，降低系统开销'
    }
  }

  /**
   * 失败率过高时暂停Worker
   */
  private async executePauseOnFailure(context: DecisionContext): Promise<DecisionResult> {
    const problematicWorker = context.managedAgents.find(a => {
      if (a.stats.totalTasks < 5) return false
      const failureRate = a.stats.failedTasks / a.stats.totalTasks
      return failureRate > 0.3 && a.runtimeStatus !== 'paused'
    })

    if (!problematicWorker) {
      return {
        decision: 'no_action',
        reason: '没有找到问题Worker',
        confidence: 1,
        expectedOutcome: '保持现状'
      }
    }

    const failureRate = problematicWorker.stats.failedTasks / problematicWorker.stats.totalTasks
    agentOrchestrator.pauseAgent(problematicWorker.id, this.managerId)

    return {
      decision: 'pause_agent',
      targetAgentId: problematicWorker.id,
      reason: `Worker "${problematicWorker.name}" 失败率过高(${Math.round(failureRate * 100)}%)，自动暂停`,
      confidence: 0.95,
      expectedOutcome: '防止更多失败，等待人工检查'
    }
  }

  /**
   * 执行优化
   */
  private async executeOptimization(context: DecisionContext): Promise<DecisionResult> {
    // 分析Worker性能并给出优化建议
    const optimizations: string[] = []

    for (const worker of context.managedAgents) {
      if (worker.stats.averageExecutionTime > 60000) {
        optimizations.push(`${worker.name}: 执行时间较长，建议优化Prompt或增加资源`)
      }
      if (worker.taskHistory.length > 0) {
        const recentTasks = worker.taskHistory.slice(0, 10)
        const successRate = recentTasks.filter(t => t.status === 'completed').length / recentTasks.length
        if (successRate < 0.8) {
          optimizations.push(`${worker.name}: 近期成功率较低，建议检查配置`)
        }
      }
    }

    // 记录优化建议
    if (optimizations.length > 0) {
      console.log('[ManagerAgent] 优化建议:', optimizations)
    }

    return {
      decision: 'optimize_agent',
      reason: '基于历史数据分析，生成优化建议',
      confidence: 0.7,
      expectedOutcome: '提高整体系统性能和稳定性',
      params: { suggestions: optimizations }
    }
  }

  /**
   * 为积压任务创建临时Worker
   */
  private async executeCreateForBacklog(context: DecisionContext): Promise<DecisionResult> {
    const workerName = `BacklogWorker-${Date.now()}`
    
    const params: CreateWorkerAgentParams = {
      name: workerName,
      description: '临时Worker，用于处理积压任务',
      level: 'custom',
      mode: 'passive',
      managerId: this.managerId,
      capabilities: {
        skillIds: ['task_processing'],
        toolIds: ['process_task'],
        customSystemPrompt: '你是一个临时Worker，专注于快速处理积压任务。'
      }
    }

    const worker = agentOrchestrator.createWorkerAgent(params, this.managerId)

    // 触发任务执行
    await agentOrchestrator.triggerAgentTask(worker.id, '处理积压任务', {}, 'manager')

    return {
      decision: 'create_agent',
      targetAgentId: worker.id,
      reason: `任务队列积压(${context.systemState.pendingTasks}个任务)，创建临时Worker处理`,
      confidence: 0.85,
      expectedOutcome: '快速清理任务队列'
    }
  }

  /**
   * 执行维护任务
   */
  private async executeMaintenance(context: DecisionContext): Promise<DecisionResult> {
    const maintenanceTasks: string[] = []

    // 1. 清理过期历史记录
    for (const worker of context.managedAgents) {
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      worker.taskHistory = worker.taskHistory.filter(t => t.startedAt > oneMonthAgo)
      maintenanceTasks.push(`清理 ${worker.name} 的过期历史记录`)
    }

    // 2. 更新能力评分
    for (const worker of context.managedAgents) {
      if (worker.stats.totalTasks > 0) {
        const successRate = worker.stats.successfulTasks / worker.stats.totalTasks
        worker.capabilityScore.reliability = Math.round(successRate * 100)
        worker.capabilityScore.efficiency = Math.round(100 - Math.min(worker.stats.averageExecutionTime / 60000 * 10, 50))
        worker.capabilityScore.overall = Math.round(
          (worker.capabilityScore.reliability + worker.capabilityScore.efficiency + worker.capabilityScore.quality) / 3
        )
        worker.capabilityScore.lastEvaluatedAt = Date.now()
      }
      maintenanceTasks.push(`更新 ${worker.name} 的能力评分`)
    }

    return {
      decision: 'no_action',
      reason: '执行日常维护任务',
      confidence: 1,
      expectedOutcome: '系统保持最佳状态',
      params: { maintenanceTasks }
    }
  }

  // ==================== 进化策略 ====================

  /**
   * 执行进化策略
   */
  private async executeEvolutionStrategies(context: DecisionContext): Promise<void> {
    for (const strategy of this.evolutionStrategies) {
      if (!strategy.enabled) continue

      const shouldTrigger = await this.evaluateTrigger(strategy.trigger, context)
      
      if (shouldTrigger) {
        console.log(`[ManagerAgent] 触发进化策略: ${strategy.name}`)
        await this.executeEvolutionAction(strategy.action, context)
      }
    }
  }

  /**
   * 评估触发条件
   */
  private async evaluateTrigger(
    trigger: EvolutionStrategy['trigger'],
    context: DecisionContext
  ): Promise<boolean> {
    switch (trigger.type) {
      case 'performance':
        return context.historicalData.taskSuccessRate < (trigger.threshold || 0.8)
      
      case 'error_rate':
        return context.historicalData.errorRate > (trigger.threshold || 0.1)
      
      case 'load':
        return context.systemState.load.cpu > (trigger.threshold || 80)
      
      case 'scheduled':
        // 简化的定时检查
        return false // 需要更复杂的定时逻辑
      
      default:
        return false
    }
  }

  /**
   * 执行进化动作
   */
  private async executeEvolutionAction(
    action: EvolutionStrategy['action'],
    context: DecisionContext
  ): Promise<void> {
    switch (action.type) {
      case 'scale_up':
        await this.executeScaleUp(context)
        break
      
      case 'scale_down':
        await this.executeScaleDown(context)
        break
      
      case 'optimize_prompt':
        // 实现Prompt优化逻辑
        console.log('[ManagerAgent] 执行Prompt优化')
        break
      
      case 'recreate':
        // 重新创建问题Worker
        console.log('[ManagerAgent] 执行Worker重建')
        break
      
      default:
        break
    }
  }

  // ==================== 辅助方法 ====================

  private getLastOptimizationTime(): number {
    // 从决策历史中找最后优化时间
    const lastOptimization = this.decisionHistory
      .filter(d => d.decision === 'optimize_agent')
      .pop()
    
    return lastOptimization ? Date.now() - 3600000 : 0 // 如果没有，返回很久以前
  }

  private logDecision(rule: DecisionRule, result: DecisionResult): void {
    console.log(`[ManagerAgent] 决策记录:`, {
      rule: rule.name,
      decision: result.decision,
      target: result.targetAgentId,
      reason: result.reason,
      confidence: result.confidence
    })
  }

  // ==================== 公共API ====================

  /**
   * 添加自定义决策规则
   */
  addDecisionRule(rule: DecisionRule): void {
    this.decisionRules.push(rule)
  }

  /**
   * 启用/禁用决策规则
   */
  toggleDecisionRule(ruleId: string, enabled: boolean): void {
    const rule = this.decisionRules.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = enabled
    }
  }

  /**
   * 添加进化策略
   */
  addEvolutionStrategy(strategy: EvolutionStrategy): void {
    this.evolutionStrategies.push(strategy)
  }

  /**
   * 获取决策历史
   */
  getDecisionHistory(): DecisionResult[] {
    return [...this.decisionHistory]
  }

  /**
   * 手动触发决策循环
   */
  async forceDecisionCycle(): Promise<DecisionResult[]> {
    return this.runDecisionCycle()
  }
}

/** Manager Agent 引擎管理器 */
export class ManagerEngineRegistry {
  private engines: Map<string, ManagerAgentEngine> = new Map()

  createEngine(managerId: string): ManagerAgentEngine {
    const engine = new ManagerAgentEngine(managerId)
    this.engines.set(managerId, engine)
    return engine
  }

  getEngine(managerId: string): ManagerAgentEngine | undefined {
    return this.engines.get(managerId)
  }

  removeEngine(managerId: string): void {
    this.engines.delete(managerId)
  }
}

export const managerEngineRegistry = new ManagerEngineRegistry()
