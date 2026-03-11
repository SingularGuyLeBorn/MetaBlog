/**
 * Agent Orchestrator - 核心调度器
 * 
 * 职责：
 * 1. 管理所有Agent的生命周期
 * 2. 权限控制（三级权限系统）
 * 3. 任务调度和分发
 * 4. 状态监控和心跳管理
 * 5. 事件总线
 */

import { ref, computed, type Ref } from 'vue'
import type {
  EnhancedAgent,
  AgentTier,
  AgentRuntimeStatus,
  TaskRecord,
  RunningTask,
  SystemState,
  AgentStateSnapshot,
  SystemEvent,
  SystemEventType,
  OrchestratorConfig,
  CreateSystemAgentParams,
  CreateManagerAgentParams,
  CreateWorkerAgentParams,
  PermissionMatrix,
  AgentOperation,
  NotificationMessage,
  EvolutionRecord,
  LogEntry,
  ToolCallInfo,
  TaskContext, AgentStats,
} from './types'
import { 
  DEFAULT_ORCHESTRATOR_CONFIG, 
  DEFAULT_PERMISSION_MATRIX 
} from './types'
import { generateUUID } from '../utils/uuid'
import type { AgentCreateParams } from '../types/agent'

/** 权限检查错误 */
class PermissionDeniedError extends Error {
  constructor(
    public operatorTier: AgentTier,
    public targetTier: AgentTier,
    public operation: AgentOperation
  ) {
    super(`${operatorTier} 无权对 ${targetTier} 执行 ${operation} 操作`)
    this.name = 'PermissionDeniedError'
  }
}

/** Agent Orchestrator */
export class AgentOrchestrator {
  private config: OrchestratorConfig
  private agents: Map<string, EnhancedAgent> = new Map()
  private runningTasks: Map<string, RunningTask> = new Map()
  private eventHandlers: Map<SystemEventType, Set<(event: SystemEvent) => void>> = new Map()
  private notifications: Ref<NotificationMessage[]> = ref([])
  private evolutionHistory: Ref<EvolutionRecord[]> = ref([])
  private systemState: Ref<SystemState> = ref(this.createInitialSystemState())
  private heartbeatTimers: Map<string, number> = new Map()
  private taskQueue: string[] = []
  private isProcessingQueue = false

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_ORCHESTRATOR_CONFIG, ...config }
    this.startSystemMonitor()
  }

  // ==================== 初始化 ====================

  private createInitialSystemState(): SystemState {
    return {
      status: 'healthy',
      agents: [],
      activeTasks: 0,
      pendingTasks: 0,
      load: { cpu: 0, memory: 0, activeAgents: 0, queuedTasks: 0 },
      lastUpdated: Date.now(),
      recentEvents: []
    }
  }

  // ==================== 权限控制 ====================

  /**
   * 检查权限
   * @param operatorTier 操作者等级
   * @param targetTier 目标等级
   * @param operation 操作类型
   */
  checkPermission(
    operatorTier: AgentTier,
    targetTier: AgentTier,
    operation: AgentOperation
  ): boolean {
    if (!this.config.enablePermissionCheck) return true

    const matrix = DEFAULT_PERMISSION_MATRIX.find(
      m => m.operatorTier === operatorTier && m.targetTier === targetTier
    )
    
    if (!matrix) return false
    return matrix.allowedOperations.includes(operation)
  }

  /**
   * 断言权限
   */
  assertPermission(
    operatorTier: AgentTier,
    targetTier: AgentTier,
    operation: AgentOperation
  ): void {
    if (!this.checkPermission(operatorTier, targetTier, operation)) {
      throw new PermissionDeniedError(operatorTier, targetTier, operation)
    }
  }

  // ==================== Agent 管理 ====================

  /**
   * 创建 System Agent（只有用户能创建）
   */
  createSystemAgent(params: CreateSystemAgentParams): EnhancedAgent {
    const agent: EnhancedAgent = {
      ...this.createBaseAgent(params),
      tier: 'system',
      mode: params.mode || 'always_on',
      runtimeStatus: 'idle',
      taskHistory: [],
      childAgentIds: [],
      createdBy: 'user',
      stats: this.createEmptyStats(),
      capabilityScore: this.createEmptyCapabilityScore(),
      lastHeartbeat: Date.now(),
      isResident: params.isResident ?? true,
      monitoringConfig: {
        enabled: true,
        heartbeatInterval: 30000,
        collectMetrics: true,
        logLevel: 'info',
        alertOnError: true,
        ...params.monitoringConfig
      }
    }

    this.agents.set(agent.id, agent)
    this.startHeartbeat(agent.id)
    this.emitEvent('agent:created', { agentId: agent.id, tier: 'system' })
    this.notify('success', 'System Agent 已创建', `Agent "${agent.name}" 已启动并常驻后台`)
    
    return agent
  }

  /**
   * 创建 Manager Agent（用户或System Agent创建）
   */
  createManagerAgent(
    params: CreateManagerAgentParams,
    createdBy: 'user' | string = 'user'
  ): EnhancedAgent {
    const agent: EnhancedAgent = {
      ...this.createBaseAgent(params),
      tier: 'manager',
      mode: 'always_on',
      runtimeStatus: 'idle',
      taskHistory: [],
      childAgentIds: params.managedWorkerIds || [],
      createdBy,
      stats: this.createEmptyStats(),
      capabilityScore: this.createEmptyCapabilityScore(),
      lastHeartbeat: Date.now(),
      isResident: true,
      monitoringConfig: {
        enabled: true,
        heartbeatInterval: 30000,
        collectMetrics: true,
        logLevel: 'info',
        alertOnError: true
      }
    }

    this.agents.set(agent.id, agent)
    this.startHeartbeat(agent.id)
    this.startManagerDecisionLoop(agent.id)
    this.emitEvent('agent:created', { agentId: agent.id, tier: 'manager' })
    this.notify('success', 'Manager Agent 已创建', `Agent "${agent.name}" 已启动并将自主管理 Worker Agents`)

    return agent
  }

  /**
   * 创建 Worker Agent（用户、System或Manager创建）
   */
  createWorkerAgent(
    params: CreateWorkerAgentParams,
    createdBy: 'user' | string = 'user'
  ): EnhancedAgent {
    // 检查创建者权限
    if (typeof createdBy === 'string') {
      const creator = this.agents.get(createdBy)
      if (creator) {
        this.assertPermission(creator.tier, 'worker', 'create')
      }
    }

    const agent: EnhancedAgent = {
      ...this.createBaseAgent(params),
      tier: 'worker',
      mode: params.mode || 'passive',
      runtimeStatus: params.mode === 'scheduled' ? 'scheduled' : 'listening',
      scheduleConfig: params.mode === 'scheduled' ? {
        timezone: 'Asia/Shanghai',
        enabled: true,
        timeout: 300000,
        retryCount: 3,
        retryDelay: 5000,
        ...params.scheduleConfig
      } : undefined,
      taskHistory: [],
      childAgentIds: [],
      parentAgentId: params.managerId,
      createdBy,
      stats: this.createEmptyStats(),
      capabilityScore: this.createEmptyCapabilityScore(),
      lastHeartbeat: Date.now(),
      isResident: false,
      monitoringConfig: {
        enabled: true,
        heartbeatInterval: 60000,
        collectMetrics: true,
        logLevel: 'info',
        alertOnError: true
      }
    }

    this.agents.set(agent.id, agent)
    this.startHeartbeat(agent.id)

    // 如果指定了Manager，添加到Manager的子列表
    if (params.managerId) {
      const manager = this.agents.get(params.managerId)
      if (manager && manager.tier === 'manager') {
        manager.childAgentIds.push(agent.id)
      }
    }

    this.emitEvent('agent:created', { agentId: agent.id, tier: 'worker', createdBy })
    this.notify('info', 'Worker Agent 已创建', `Agent "${agent.name}" 已就绪`)

    return agent
  }

  /**
   * 删除 Agent
   */
  deleteAgent(agentId: string, deletedBy: 'user' | string = 'user'): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false

    // 权限检查
    if (typeof deletedBy === 'string') {
      const deleter = this.agents.get(deletedBy)
      if (deleter) {
        this.assertPermission(deleter.tier, agent.tier, 'delete')
      }
    }

    // System Agent 只能由用户删除
    if (agent.tier === 'system' && deletedBy !== 'user') {
      throw new PermissionDeniedError('manager', 'system', 'delete')
    }

    // 停止心跳
    this.stopHeartbeat(agentId)

    // 停止Manager的决策循环
    if (agent.tier === 'manager' && agent.runtime?.decisionIntervalId) {
      clearInterval(agent.runtime.decisionIntervalId)
      // 清理引擎
      import('./manager-agent').then(({ managerEngineRegistry }) => {
        managerEngineRegistry.removeEngine(agentId)
      })
    }

    // 从父Agent中移除
    if (agent.parentAgentId) {
      const parent = this.agents.get(agent.parentAgentId)
      if (parent) {
        parent.childAgentIds = parent.childAgentIds.filter(id => id !== agentId)
      }
    }

    // 如果是Manager，需要处理其管理的Worker
    if (agent.tier === 'manager' && agent.childAgentIds.length > 0) {
      // 可以选择将Worker转交给其他Manager，或标记为孤儿
      for (const childId of agent.childAgentIds) {
        const child = this.agents.get(childId)
        if (child) {
          child.parentAgentId = undefined
        }
      }
    }

    this.agents.delete(agentId)
    this.emitEvent('agent:deleted', { agentId, tier: agent.tier })
    this.notify('info', 'Agent 已删除', `Agent "${agent.name}" 已被移除`)

    return true
  }

  /**
   * 更新 Agent 状态
   */
  updateAgentStatus(
    agentId: string,
    status: AgentRuntimeStatus,
    updatedBy: 'user' | string = 'user'
  ): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false

    // 权限检查
    if (typeof updatedBy === 'string') {
      const updater = this.agents.get(updatedBy)
      if (updater) {
        this.assertPermission(updater.tier, agent.tier, 'update')
      }
    }

    const oldStatus = agent.runtimeStatus
    agent.runtimeStatus = status
    agent.lastActiveAt = Date.now()

    this.emitEvent('agent:status_changed', { 
      agentId, 
      oldStatus, 
      newStatus: status 
    })

    return true
  }

  /**
   * 暂停 Agent
   */
  pauseAgent(agentId: string, pausedBy: 'user' | string = 'user'): boolean {
    return this.updateAgentStatus(agentId, 'paused', pausedBy)
  }

  /**
   * 恢复 Agent
   */
  resumeAgent(agentId: string, resumedBy: 'user' | string = 'user'): boolean {
    const agent = this.agents.get(agentId)
    if (!agent) return false
    
    const newStatus = agent.mode === 'scheduled' ? 'scheduled' : 'listening'
    return this.updateAgentStatus(agentId, newStatus, resumedBy)
  }

  // ==================== 任务执行 ====================

  /**
   * 触发 Agent 执行任务
   */
  async triggerAgentTask(
    agentId: string,
    taskName: string,
    input: any,
    triggeredBy: 'user' | 'scheduled' | 'manager' | 'system' = 'user'
  ): Promise<TaskRecord | null> {
    const agent = this.agents.get(agentId)
    if (!agent) return null

    // 检查Agent状态
    if (agent.runtimeStatus === 'paused' || agent.runtimeStatus === 'error') {
      throw new Error(`Agent ${agent.name} 当前状态为 ${agent.runtimeStatus}，无法执行任务`)
    }

    // 如果Agent正在运行任务，加入队列
    if (agent.currentTask) {
      this.taskQueue.push(agentId)
      this.notify('warning', '任务已排队', `Agent "${agent.name}" 正在执行其他任务，新任务已加入队列`)
      return null
    }

    return this.executeTask(agent, taskName, input, triggeredBy)
  }

  /**
   * 执行具体任务
   */
  private async executeTask(
    agent: EnhancedAgent,
    taskName: string,
    input: any,
    triggeredBy: 'user' | 'scheduled' | 'manager' | 'system'
  ): Promise<TaskRecord> {
    const taskId = generateUUID()
    const startTime = Date.now()

    // 创建运行中的任务
    const runningTask: RunningTask = {
      id: taskId,
      name: taskName,
      type: 'custom',
      status: 'running',
      startedAt: startTime,
      progress: 0,
      currentStep: '初始化',
      toolCallChain: [],
      logs: [{
        timestamp: startTime,
        level: 'info',
        message: `任务 "${taskName}" 开始执行`
      }]
    }

    agent.currentTask = runningTask
    agent.runtimeStatus = 'running'
    this.runningTasks.set(taskId, runningTask)

    this.emitEvent('task:started', { 
      agentId: agent.id, 
      taskId,
      taskName 
    })

    // 创建任务记录
    const taskRecord: TaskRecord = {
      id: taskId,
      name: taskName,
      type: 'custom',
      status: 'running',
      triggerSource: triggeredBy,
      triggeredBy: triggeredBy === 'user' ? undefined : triggeredBy,
      startedAt: startTime,
      toolCalls: [],
      logs: [...runningTask.logs]
    }

    try {
      // 任务上下文
      const context: TaskContext = {
        agentId: agent.id,
        taskId,
        startTime,
        logger: (level, message, metadata) => {
          const log: LogEntry = { timestamp: Date.now(), level, message, metadata }
          runningTask.logs.push(log)
          taskRecord.logs.push(log)
        },
        updateProgress: (progress, step) => {
          runningTask.progress = progress
          runningTask.currentStep = step
        },
        updateCurrentTool: (toolName) => {
          runningTask.currentTool = toolName
          const toolCall: ToolCallInfo = {
            toolName,
            startedAt: Date.now(),
            status: 'running'
          }
          runningTask.toolCallChain.push(toolCall)
          taskRecord.toolCalls.push(toolCall)
        },
        getAgent: () => agent,
        getSystemState: () => this.systemState.value
      }

      // 这里应该调用实际的AI服务执行任务
      // 暂时模拟任务执行
      await this.simulateTaskExecution(context, input)

      // 任务完成
      const endTime = Date.now()
      taskRecord.status = 'completed'
      taskRecord.completedAt = endTime
      taskRecord.duration = endTime - startTime

      agent.stats.successfulTasks++
      agent.stats.lastTaskAt = endTime

      this.emitEvent('task:completed', { 
        agentId: agent.id, 
        taskId,
        duration: taskRecord.duration 
      })

      this.notify('success', '任务完成', `Agent "${agent.name}" 完成了 "${taskName}"`)

    } catch (error) {
      const endTime = Date.now()
      taskRecord.status = 'failed'
      taskRecord.completedAt = endTime
      taskRecord.duration = endTime - startTime
      taskRecord.error = error instanceof Error ? error.message : String(error)

      agent.stats.failedTasks++

      this.emitEvent('task:failed', { 
        agentId: agent.id, 
        taskId,
        error: taskRecord.error 
      })

      this.notify('error', '任务失败', `Agent "${agent.name}" 执行 "${taskName}" 失败: ${taskRecord.error}`)
    }

    // 更新统计
    agent.stats.totalTasks++
    agent.stats.totalExecutionTime += taskRecord.duration || 0
    agent.stats.averageExecutionTime = agent.stats.totalExecutionTime / agent.stats.totalTasks

    // 保存任务历史
    agent.taskHistory.unshift(taskRecord)
    if (agent.taskHistory.length > 100) {
      agent.taskHistory = agent.taskHistory.slice(0, 100)
    }

    // 清理
    agent.currentTask = undefined
    this.runningTasks.delete(taskId)
    
    // 恢复状态
    if (agent.mode === 'scheduled') {
      agent.runtimeStatus = 'scheduled'
    } else {
      agent.runtimeStatus = agent.mode === 'always_on' ? 'idle' : 'listening'
    }

    // 处理队列
    this.processTaskQueue()

    return taskRecord
  }

  /**
   * 模拟任务执行（实际应调用AI服务）
   */
  private async simulateTaskExecution(context: TaskContext, input: any): Promise<any> {
    const steps = ['分析输入', '调用工具', '处理结果', '生成输出']
    
    for (let i = 0; i < steps.length; i++) {
      context.updateProgress((i / steps.length) * 100, steps[i])
      context.logger('info', `执行步骤: ${steps[i]}`)
      
      // 模拟工具调用
      if (i === 1) {
        context.updateCurrentTool('web_search')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    context.updateProgress(100, '完成')
    return { success: true, output: '任务执行结果' }
  }

  /**
   * 处理任务队列
   */
  private async processTaskQueue(): Promise<void> {
    if (this.isProcessingQueue || this.taskQueue.length === 0) return

    this.isProcessingQueue = true

    while (this.taskQueue.length > 0) {
      const agentId = this.taskQueue.shift()
      if (!agentId) continue

      const agent = this.agents.get(agentId)
      if (agent && !agent.currentTask) {
        // 实际应该根据配置决定执行什么任务
        await this.triggerAgentTask(agentId, '队列任务', {}, 'system')
      }
    }

    this.isProcessingQueue = false
  }

  // ==================== 监控与心跳 ====================

  /**
   * 启动心跳
   */
  private startHeartbeat(agentId: string): void {
    const agent = this.agents.get(agentId)
    if (!agent) return

    const interval = agent.monitoringConfig.heartbeatInterval
    
    const timer = window.setInterval(() => {
      this.checkAgentHealth(agentId)
    }, interval)

    this.heartbeatTimers.set(agentId, timer)
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(agentId: string): void {
    const timer = this.heartbeatTimers.get(agentId)
    if (timer) {
      clearInterval(timer)
      this.heartbeatTimers.delete(agentId)
    }
  }

  /**
   * 检查Agent健康状态
   */
  private checkAgentHealth(agentId: string): void {
    const agent = this.agents.get(agentId)
    if (!agent) return

    const now = Date.now()
    const timeSinceLastHeartbeat = now - agent.lastHeartbeat

    // 如果超过心跳超时时间没有更新，标记为异常
    if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
      if (agent.runtimeStatus === 'running') {
        this.emitEvent('agent:error', { 
          agentId, 
          message: 'Agent 心跳超时',
          severity: 'warning'
        })
      }
    }

    agent.lastHeartbeat = now
  }

  /**
   * 启动系统监控
   */
  private startSystemMonitor(): void {
    window.setInterval(() => {
      this.updateSystemState()
    }, 5000) // 每5秒更新一次系统状态
  }

  /**
   * 更新系统状态
   */
  private updateSystemState(): void {
    const agents: AgentStateSnapshot[] = []
    let activeTasks = 0

    for (const agent of this.agents.values()) {
      agents.push({
        id: agent.id,
        name: agent.name,
        tier: agent.tier,
        mode: agent.mode,
        runtimeStatus: agent.runtimeStatus,
        currentTask: agent.currentTask ? {
          id: agent.currentTask.id,
          name: agent.currentTask.name,
          progress: agent.currentTask.progress,
          currentTool: agent.currentTask.currentTool
        } : undefined,
        stats: agent.stats,
        lastHeartbeat: agent.lastHeartbeat,
        isResident: agent.isResident
      })

      if (agent.currentTask) {
        activeTasks++
      }
    }

    this.systemState.value = {
      ...this.systemState.value,
      agents,
      activeTasks,
      pendingTasks: this.taskQueue.length,
      load: {
        cpu: this.calculateCpuLoad(),
        memory: this.calculateMemoryLoad(),
        activeAgents: agents.filter(a => a.runtimeStatus === 'running').length,
        queuedTasks: this.taskQueue.length
      },
      lastUpdated: Date.now()
    }
  }

  private calculateCpuLoad(): number {
    // 简化的CPU负载计算
    const runningAgents = Array.from(this.agents.values()).filter(
      a => a.runtimeStatus === 'running'
    ).length
    return Math.min(runningAgents * 10, 100)
  }

  private calculateMemoryLoad(): number {
    // 简化的内存计算
    return this.agents.size * 50 // 假设每个Agent占用50MB
  }

  // ==================== Manager Agent 决策循环 ====================

  /**
   * 启动 Manager 决策循环
   */
  private startManagerDecisionLoop(managerId: string): void {
    const manager = this.agents.get(managerId)
    if (!manager || manager.tier !== 'manager') return

    // 导入Manager引擎
    import('./manager-agent').then(({ managerEngineRegistry }) => {
      const engine = managerEngineRegistry.createEngine(managerId)
      
      console.log(`[Orchestrator] Manager ${manager.name} 决策引擎已启动`)
      
      // 立即执行一次决策
      engine.runDecisionCycle().then(results => {
        if (results.length > 0) {
          console.log(`[Orchestrator] Manager ${manager.name} 初始决策:`, results.map(r => r.decision))
        }
      })
      
      // 定时执行决策
      const intervalId = window.setInterval(async () => {
        // 检查Manager状态
        const currentManager = this.agents.get(managerId)
        if (!currentManager || currentManager.runtimeStatus === 'paused' || currentManager.runtimeStatus === 'error') {
          return
        }
        
        try {
          const results = await engine.runDecisionCycle()
          
          if (results.length > 0) {
            console.log(`[Orchestrator] Manager ${currentManager.name} 执行决策:`, 
              results.map(r => ({ action: r.decision, target: r.targetAgentId, reason: r.reason }))
            )
            
            // 发送通知
            for (const result of results) {
              if (result.decision !== 'no_action') {
                this.notify('info', 'Manager 自主决策', 
                  `${currentManager.name} 执行: ${result.decision} - ${result.reason}`,
                  managerId
                )
              }
            }
          }
        } catch (error) {
          console.error(`[Orchestrator] Manager ${currentManager.name} 决策失败:`, error)
          this.emitEvent('agent:error', {
            agentId: managerId,
            message: `决策失败: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error'
          })
        }
      }, this.config.managerDecisionInterval)
      
      // 保存interval ID以便清理
      manager.runtime = { ...manager.runtime, decisionIntervalId: intervalId }
    })
  }

  /**
   * 执行 Manager 决策
   */
  private async executeManagerDecision(managerId: string): Promise<void> {
    const manager = this.agents.get(managerId)
    if (!manager || manager.tier !== 'manager') return

    // 只处理处于idle或监控状态的Manager
    if (manager.runtimeStatus === 'paused' || manager.runtimeStatus === 'error') {
      return
    }

    // 获取所有受管理的Worker
    const managedWorkers = manager.childAgentIds
      .map(id => this.agents.get(id))
      .filter((a): a is EnhancedAgent => a !== undefined && a.tier === 'worker')

    // 检查Worker状态并做出决策
    for (const worker of managedWorkers) {
      // 如果Worker长时间没有任务，考虑调整
      if (worker.runtimeStatus === 'listening' && worker.stats.lastTaskAt) {
        const idleTime = Date.now() - worker.stats.lastTaskAt
        if (idleTime > 24 * 60 * 60 * 1000) { // 超过24小时空闲
          // 可以在这里实现自动优化逻辑
          this.emitEvent('agent:status_changed', {
            agentId: worker.id,
            message: 'Worker 长时间空闲',
            severity: 'info'
          })
        }
      }

      // 如果Worker失败率过高，暂停并通知
      if (worker.stats.totalTasks > 10) {
        const failureRate = worker.stats.failedTasks / worker.stats.totalTasks
        if (failureRate > 0.3) { // 失败率超过30%
          this.pauseAgent(worker.id, managerId)
          this.notify('warning', 'Worker Agent 异常', 
            `Agent "${worker.name}" 失败率过高(${Math.round(failureRate * 100)}%)，已自动暂停`)
        }
      }
    }
  }

  // ==================== 事件系统 ====================

  /**
   * 订阅事件
   */
  onEvent(type: SystemEventType, handler: (event: SystemEvent) => void): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set())
    }
    this.eventHandlers.get(type)!.add(handler)

    // 返回取消订阅函数
    return () => {
      this.eventHandlers.get(type)?.delete(handler)
    }
  }

  /**
   * 发射事件
   */
  private emitEvent(type: SystemEventType, payload: any): void {
    const event: SystemEvent = {
      id: generateUUID(),
      type,
      timestamp: Date.now(),
      payload
    }

    // 保存到系统事件
    this.systemState.value.recentEvents.unshift(event)
    if (this.systemState.value.recentEvents.length > 100) {
      this.systemState.value.recentEvents = this.systemState.value.recentEvents.slice(0, 100)
    }

    // 调用处理器
    const handlers = this.eventHandlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error('Event handler error:', error)
        }
      })
    }
  }

  // ==================== 通知系统 ====================

  /**
   * 发送通知
   */
  private notify(
    type: NotificationMessage['type'],
    title: string,
    message: string,
    agentId?: string
  ): void {
    if (!this.config.enableNotifications) return

    const notification: NotificationMessage = {
      id: generateUUID(),
      type,
      title,
      message,
      agentId,
      timestamp: Date.now(),
      read: false
    }

    this.notifications.value.unshift(notification)
    if (this.notifications.value.length > 50) {
      this.notifications.value = this.notifications.value.slice(0, 50)
    }
  }

  /**
   * 标记通知已读
   */
  markNotificationRead(notificationId: string): void {
    const notification = this.notifications.value.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  // ==================== 查询方法 ====================

  /**
   * 获取所有Agent
   */
  getAllAgents(): EnhancedAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * 获取Agent
   */
  getAgent(agentId: string): EnhancedAgent | undefined {
    return this.agents.get(agentId)
  }

  /**
   * 按等级获取Agent
   */
  getAgentsByTier(tier: AgentTier): EnhancedAgent[] {
    return Array.from(this.agents.values()).filter(a => a.tier === tier)
  }

  /**
   * 获取系统状态
   */
  getSystemState(): SystemState {
    return this.systemState.value
  }

  /**
   * 获取通知列表
   */
  getNotifications(): NotificationMessage[] {
    return this.notifications.value
  }

  /**
   * 获取控制面板数据
   */
  getControlPanelData() {
    return {
      systemState: this.systemState.value,
      agents: this.getAllAgents(),
      activeTasks: Array.from(this.runningTasks.values()),
      recentEvents: this.systemState.value.recentEvents,
      evolutionHistory: this.evolutionHistory.value,
      notifications: this.notifications.value
    }
  }

  // ==================== 辅助方法 ====================

  private createBaseAgent(params: AgentCreateParams): any {
    const now = Date.now()
    return {
      id: generateUUID(),
      name: params.name,
      avatar: params.avatar || '🤖',
      description: params.description,
      level: params.level || 'custom',
      status: 'online',
      seat: params.seat || 0,
      capabilities: {
        mode: 'raw',
        skillIds: params.capabilities?.skillIds || [],
        toolIds: params.capabilities?.toolIds || [],
        customSystemPrompt: params.capabilities?.customSystemPrompt || ''
      },
      memory: {
        enabled: true,
        content: '',
        autoExtract: false,
        maxTokens: 2000,
        ...params.memory
      },
      permissions: params.permissions || [],
      callCount: 0,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      runtime: params.runtime || {}
    }
  }

  private createEmptyStats(): AgentStats {
    return {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      uptime: 0
    }
  }

  private createEmptyCapabilityScore(): any {
    return {
      overall: 50,
      reliability: 50,
      efficiency: 50,
      quality: 50,
      adaptability: 50,
      lastEvaluatedAt: Date.now()
    }
  }
}

// 导出单例
export const agentOrchestrator = new AgentOrchestrator()
