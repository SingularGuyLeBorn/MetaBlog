/**
 * ============================================================================
 * MCP 工具模块 - meta-agent-manager
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/mcp-tools
 */


import type {
  WorkerRegistration,
  WorkerStatus,
  WorkerPriority,
  MetaAgentConfig,
  TaskAssignment,
  TaskAssignmentRequest,
  MetaAgentStatus,
  LoadBalanceDecision,
  WorkerFailureEvent,
  ResourceSchedule,
  RegisterWorkerRequest,
  BatchTaskAssignmentRequest,
  BatchTaskAssignmentResult,
  TaskAssignmentStrategy
} from '../../src/theme/types/meta-agent'

import type { Task, TaskPriority } from '../../src/theme/types/task'
import type { AgentRuntimeStatus } from '../../src/theme/types/agent-runtime'
import { getAgentRuntimeManager } from './agent-runtime-manager'
import * as fs from 'fs'
import * as path from 'path'

// 数据目录
const DATA_DIR = path.join(process.cwd(), '.data')
const META_DIR = path.join(DATA_DIR, 'meta')
const META_CONFIG_FILE = path.join(META_DIR, 'config.json')
const META_LOGS_DIR = path.join(DATA_DIR, 'logs', 'meta')

// 确保目录存在
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDir(META_DIR)
ensureDir(META_LOGS_DIR)

// 默认配置
const DEFAULT_CONFIG: MetaAgentConfig = {
  loadBalancing: {
    strategy: 'least-loaded',
    enabled: true,
    healthCheckInterval: 30000,
    failoverEnabled: true
  },
  taskAssignment: {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    priorityWeight: 0.3,
    capabilityWeight: 0.4,
    loadWeight: 0.3
  },
  faultRecovery: {
    enabled: true,
    maxFailures: 3,
    recoveryDelay: 5000,
    autoRestart: true
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    alertThreshold: {
      cpuPercent: 80,
      memoryPercent: 80,
      errorRate: 0.1
    }
  }
}

// Meta-Agent Manager 类
class MetaAgentManager {
  private workers: Map<string, WorkerRegistration> = new Map()
  private workerStatuses: Map<string, WorkerStatus> = new Map()
  private assignments: Map<string, TaskAssignment> = new Map()
  private config: MetaAgentConfig = DEFAULT_CONFIG
  private failureEvents: WorkerFailureEvent[] = []
  private stats = {
    totalAssigned: 0,
    totalCompleted: 0,
    totalFailed: 0
  }
  private startedAt: number = Date.now()
  private status: 'initializing' | 'running' | 'stopped' | 'error' = 'stopped'
  private healthCheckTimer?: NodeJS.Timeout
  private metricsTimer?: NodeJS.Timeout

  constructor() {
    this.loadConfig()
  }

  // 加载配置
  private loadConfig() {
    try {
      if (fs.existsSync(META_CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(META_CONFIG_FILE, 'utf-8'))
        this.config = { ...DEFAULT_CONFIG, ...data.config }
      }
    } catch (error) {
      console.error('[MetaAgentManager] Failed to load config:', error)
    }
  }

  // 保存配置
  private saveConfig() {
    try {
      const data = {
        config: this.config,
        updatedAt: Date.now()
      }
      fs.writeFileSync(META_CONFIG_FILE, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[MetaAgentManager] Failed to save config:', error)
    }
  }

  // 记录日志
  private log(event: string, message: string, data?: any) {
    const entry = {
      timestamp: Date.now(),
      level: 'info' as const,
      event,
      message,
      data
    }

    try {
      const date = new Date().toISOString().split('T')[0]
      const logFile = path.join(META_LOGS_DIR, `${date}.jsonl`)
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.error('[MetaAgentManager] Failed to save log:', error)
    }
  }

  // 启动 Meta-Agent
  start(): void {
    if (this.status === 'running') return

    this.status = 'initializing'
    this.log('meta_agent_starting', 'Meta-Agent starting')

    try {
      // 启动健康检查
      if (this.config.loadBalancing.enabled) {
        this.startHealthCheck()
      }

      // 启动监控
      if (this.config.monitoring.enabled) {
        this.startMonitoring()
      }

      this.status = 'running'
      this.startedAt = Date.now()
      this.log('meta_agent_started', 'Meta-Agent started')
    } catch (error: any) {
      this.status = 'error'
      this.log('meta_agent_start_failed', `Meta-Agent start failed: ${error.message}`)
      throw error
    }
  }

  // 停止 Meta-Agent
  stop(): void {
    if (this.status !== 'running') return

    this.status = 'stopped'
    
    // 停止健康检查
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }

    // 停止监控
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = undefined
    }

    this.log('meta_agent_stopped', 'Meta-Agent stopped')
  }

  // 注册 Worker
  registerWorker(request: RegisterWorkerRequest): WorkerRegistration {
    const now = Date.now()
    
    const registration: WorkerRegistration = {
      agentId: request.agentId,
      name: request.name,
      description: request.description,
      capabilities: request.capabilities,
      maxConcurrentTasks: request.maxConcurrentTasks,
      priority: request.priority,
      registeredAt: now,
      lastHeartbeatAt: now,
      status: 'created'
    }

    this.workers.set(request.agentId, registration)

    // 初始化状态
    this.workerStatuses.set(request.agentId, {
      agentId: request.agentId,
      status: 'created',
      health: 'healthy',
      load: {
        currentTasks: 0,
        maxTasks: request.maxConcurrentTasks,
        queueLength: 0,
        cpuUsage: 0,
        memoryUsage: 0
      },
      performance: {
        tasksCompleted: 0,
        tasksFailed: 0,
        averageTaskDuration: 0
      },
      availability: {
        isAvailable: true
      }
    })

    this.log('worker_registered', `Worker registered: ${request.name}`, {
      agentId: request.agentId,
      capabilities: request.capabilities
    })

    return registration
  }

  // 注销 Worker
  unregisterWorker(agentId: string, reason?: string): boolean {
    const worker = this.workers.get(agentId)
    if (!worker) return false

    // 重新分配该 Worker 的任务
    this.reassignWorkerTasks(agentId)

    this.workers.delete(agentId)
    this.workerStatuses.delete(agentId)

    this.log('worker_unregistered', `Worker unregistered: ${worker.name}`, {
      agentId,
      reason
    })

    return true
  }

  // 更新 Worker 状态
  updateWorkerStatus(agentId: string, status: Partial<WorkerStatus>): boolean {
    const existingStatus = this.workerStatuses.get(agentId)
    if (!existingStatus) return false

    this.workerStatuses.set(agentId, { ...existingStatus, ...status })

    // 更新注册信息中的状态
    const registration = this.workers.get(agentId)
    if (registration) {
      registration.status = status.status || registration.status
      registration.lastHeartbeatAt = Date.now()
    }

    return true
  }

  // 获取 Worker
  getWorker(agentId: string): WorkerRegistration | undefined {
    return this.workers.get(agentId)
  }

  // 获取 Worker 状态
  getWorkerStatus(agentId: string): WorkerStatus | undefined {
    return this.workerStatuses.get(agentId)
  }

  // 获取所有 Workers
  getAllWorkers(): WorkerRegistration[] {
    return Array.from(this.workers.values())
  }

  // 获取所有 Worker 状态
  getAllWorkerStatuses(): WorkerStatus[] {
    return Array.from(this.workerStatuses.values())
  }

  // 分配任务
  assignTask(request: TaskAssignmentRequest): TaskAssignment | null {
    const strategy = this.config.loadBalancing.strategy
    const candidates = this.selectWorkerCandidates(request, strategy)

    if (candidates.length === 0) {
      this.log('assignment_failed', 'No available workers for task', { taskId: request.taskId })
      return null
    }

    // 选择最佳 Worker
    const selectedWorker = candidates[0]

    const assignment: TaskAssignment = {
      taskId: request.taskId,
      assignedTo: selectedWorker.agentId,
      assignedAt: Date.now(),
      priority: request.priority,
      expectedDuration: request.estimatedDuration,
      reason: {
        strategy,
        factors: {
          capabilityMatch: this.calculateCapabilityMatch(selectedWorker, request.requiredCapabilities),
          loadBalance: this.calculateLoadBalance(selectedWorker),
          priority: this.calculatePriorityFactor(selectedWorker)
        }
      }
    }

    this.assignments.set(request.taskId, assignment)
    this.stats.totalAssigned++

    // 更新 Worker 负载
    const status = this.workerStatuses.get(selectedWorker.agentId)
    if (status) {
      status.load.currentTasks++
      status.availability.isAvailable = status.load.currentTasks < status.load.maxTasks
    }

    this.log('task_assigned', `Task ${request.taskId} assigned to ${selectedWorker.name}`, {
      taskId: request.taskId,
      workerId: selectedWorker.agentId,
      strategy
    })

    return assignment
  }

  // 批量分配任务
  assignBatchTasks(request: BatchTaskAssignmentRequest): BatchTaskAssignmentResult {
    const assignments: TaskAssignment[] = []
    const failed: { taskId: string; reason: string }[] = []
    const startTime = Date.now()

    for (const taskRequest of request.tasks) {
      const assignment = this.assignTask(taskRequest)
      
      if (assignment) {
        assignments.push(assignment)
      } else {
        failed.push({
          taskId: taskRequest.taskId,
          reason: 'No available workers'
        })

        // 如果是原子操作,回滚已分配的任务
        if (request.options?.atomic) {
          for (const a of assignments) {
            this.assignments.delete(a.taskId)
          }
          return {
            success: false,
            assignments: [],
            failed: request.tasks.map(t => ({
              taskId: t.taskId,
              reason: 'Atomic operation failed'
            })),
            stats: {
              total: request.tasks.length,
              assigned: 0,
              failed: request.tasks.length,
              averageAssignmentTime: Date.now() - startTime
            }
          }
        }
      }
    }

    const endTime = Date.now()

    return {
      success: failed.length === 0,
      assignments,
      failed,
      stats: {
        total: request.tasks.length,
        assigned: assignments.length,
        failed: failed.length,
        averageAssignmentTime: (endTime - startTime) / request.tasks.length
      }
    }
  }

  // 选择 Worker 候选者
  private selectWorkerCandidates(
    request: TaskAssignmentRequest,
    strategy: TaskAssignmentStrategy
  ): WorkerRegistration[] {
    let candidates = Array.from(this.workers.values()).filter(worker => {
      const status = this.workerStatuses.get(worker.agentId)
      if (!status) return false

      // 检查健康状态
      if (status.health === 'unhealthy') return false

      // 检查可用性
      if (!status.availability.isAvailable) return false

      // 检查排除列表
      if (request.excludedWorkers?.includes(worker.agentId)) return false

      // 检查能力匹配
      if (request.requiredCapabilities.length > 0) {
        const hasAllCapabilities = request.requiredCapabilities.every(cap =>
          worker.capabilities.includes(cap)
        )
        if (!hasAllCapabilities) return false
      }

      return true
    })

    // 应用策略排序
    switch (strategy) {
      case 'round-robin':
        // 简单的轮询,按注册时间排序
        candidates.sort((a, b) => a.registeredAt - b.registeredAt)
        break

      case 'least-loaded':
        candidates.sort((a, b) => {
          const statusA = this.workerStatuses.get(a.agentId)!
          const statusB = this.workerStatuses.get(b.agentId)!
          const loadA = statusA.load.currentTasks / statusA.load.maxTasks
          const loadB = statusB.load.currentTasks / statusB.load.maxTasks
          return loadA - loadB
        })
        break

      case 'priority-based':
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
        candidates.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        break

      case 'capability-match':
        candidates.sort((a, b) => {
          const matchA = this.calculateCapabilityMatch(a, request.requiredCapabilities)
          const matchB = this.calculateCapabilityMatch(b, request.requiredCapabilities)
          return matchB - matchA
        })
        break

      case 'random':
        candidates.sort(() => Math.random() - 0.5)
        break
    }

    // 优先选择指定 Workers
    if (request.preferredWorkers && request.preferredWorkers.length > 0) {
      const preferred = candidates.filter(c => request.preferredWorkers!.includes(c.agentId))
      if (preferred.length > 0) {
        candidates = preferred
      }
    }

    return candidates
  }

  // 计算能力匹配度
  private calculateCapabilityMatch(worker: WorkerRegistration, required: string[]): number {
    if (required.length === 0) return 1
    const matched = required.filter(cap => worker.capabilities.includes(cap)).length
    return matched / required.length
  }

  // 计算负载均衡因子
  private calculateLoadBalance(worker: WorkerRegistration): number {
    const status = this.workerStatuses.get(worker.agentId)
    if (!status) return 0
    return 1 - (status.load.currentTasks / status.load.maxTasks)
  }

  // 计算优先级因子
  private calculatePriorityFactor(worker: WorkerRegistration): number {
    const priorityOrder = { critical: 1, high: 0.75, normal: 0.5, low: 0.25 }
    return priorityOrder[worker.priority]
  }

  // 重新分配 Worker 的任务
  private reassignWorkerTasks(agentId: string): void {
    const assignmentsToReassign = Array.from(this.assignments.values())
      .filter(a => a.assignedTo === agentId)

    for (const assignment of assignmentsToReassign) {
      this.assignments.delete(assignment.taskId)
      
      // 尝试重新分配
      this.log('task_reassigning', `Reassigning task ${assignment.taskId}`, {
        taskId: assignment.taskId,
        fromWorker: agentId
      })
    }
  }

  // 获取任务分配
  getTaskAssignment(taskId: string): TaskAssignment | undefined {
    return this.assignments.get(taskId)
  }

  // 完成任务
  completeTask(taskId: string, success: boolean): void {
    const assignment = this.assignments.get(taskId)
    if (!assignment) return

    // 更新 Worker 状态
    const status = this.workerStatuses.get(assignment.assignedTo)
    if (status) {
      status.load.currentTasks = Math.max(0, status.load.currentTasks - 1)
      status.availability.isAvailable = status.load.currentTasks < status.load.maxTasks

      if (success) {
        status.performance.tasksCompleted++
        this.stats.totalCompleted++
      } else {
        status.performance.tasksFailed++
        this.stats.totalFailed++
      }
    }

    this.assignments.delete(taskId)

    this.log('task_completed', `Task ${taskId} completed`, {
      taskId,
      success,
      workerId: assignment.assignedTo
    })
  }

  // 获取 Meta-Agent 状态
  getStatus(): MetaAgentStatus {
    const workers = Array.from(this.workerStatuses.values())
    
    return {
      status: this.status,
      startedAt: this.startedAt,
      workers: {
        total: workers.length,
        healthy: workers.filter(w => w.health === 'healthy').length,
        degraded: workers.filter(w => w.health === 'degraded').length,
        unhealthy: workers.filter(w => w.health === 'unhealthy').length,
        byStatus: workers.reduce((acc, w) => {
          acc[w.status] = (acc[w.status] || 0) + 1
          return acc
        }, {} as Record<AgentRuntimeStatus, number>)
      },
      tasks: {
        totalAssigned: this.stats.totalAssigned,
        totalCompleted: this.stats.totalCompleted,
        totalFailed: this.stats.totalFailed,
        currentlyRunning: Array.from(this.assignments.values()).length,
        queued: 0  // TODO: implement queue tracking
      },
      performance: {
        averageAssignmentTime: 0,  // TODO: track this
        tasksPerMinute: this.calculateTasksPerMinute(),
        successRate: this.stats.totalAssigned > 0
          ? this.stats.totalCompleted / this.stats.totalAssigned
          : 0
      }
    }
  }

  // 计算每分钟任务数
  private calculateTasksPerMinute(): number {
    // 简化计算：基于启动时间
    const minutesRunning = (Date.now() - this.startedAt) / 60000
    if (minutesRunning < 1) return 0
    return this.stats.totalCompleted / minutesRunning
  }

  // 获取负载均衡决策
  getLoadBalanceDecision(): LoadBalanceDecision {
    const workers = Array.from(this.workerStatuses.values())
    
    // 计算平均负载
    const avgLoad = workers.reduce((sum, w) => 
      sum + (w.load.currentTasks / w.load.maxTasks), 0
    ) / (workers.length || 1)

    // 检查是否需要扩容
    if (avgLoad > 0.8) {
      return {
        type: 'scale-up',
        reason: 'High average load',
        scaleRecommendation: {
          recommendedWorkers: workers.length + 1,
          currentWorkers: workers.length,
          reason: 'Average load exceeds 80%'
        }
      }
    }

    // 检查是否需要缩容
    if (avgLoad < 0.2 && workers.length > 1) {
      return {
        type: 'scale-down',
        reason: 'Low average load',
        scaleRecommendation: {
          recommendedWorkers: Math.max(1, workers.length - 1),
          currentWorkers: workers.length,
          reason: 'Average load below 20%'
        }
      }
    }

    // 检查负载不平衡
    const loads = workers.map(w => w.load.currentTasks / w.load.maxTasks)
    const maxLoad = Math.max(...loads)
    const minLoad = Math.min(...loads)
    
    if (maxLoad - minLoad > 0.5) {
      // 建议任务迁移
      const overloadedWorker = workers.find(w => 
        w.load.currentTasks / w.load.maxTasks === maxLoad
      )
      const underloadedWorker = workers.find(w => 
        w.load.currentTasks / w.load.maxTasks === minLoad
      )

      if (overloadedWorker && underloadedWorker) {
        return {
          type: 'rebalance',
          reason: 'Load imbalance detected',
          migrations: [{
            fromWorker: overloadedWorker.agentId,
            toWorker: underloadedWorker.agentId,
            tasks: []  // TODO: identify specific tasks to migrate
          }]
        }
      }
    }

    return {
      type: 'assign',
      reason: 'Normal operation'
    }
  }

  // 启动健康检查
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.loadBalancing.healthCheckInterval)
  }

  // 执行健康检查
  private performHealthCheck(): void {
    for (const [agentId, status] of this.workerStatuses) {
      // 检查心跳超时
      const registration = this.workers.get(agentId)
      if (!registration) continue

      const timeSinceLastHeartbeat = Date.now() - registration.lastHeartbeatAt
      const timeout = 120000  // 2 minutes

      if (timeSinceLastHeartbeat > timeout) {
        // 标记为不健康
        status.health = 'unhealthy'
        status.availability.isAvailable = false

        // 记录故障事件
        const failureEvent: WorkerFailureEvent = {
          agentId,
          timestamp: Date.now(),
          type: 'unresponsive',
          severity: 'critical',
          details: {
            errorMessage: `Heartbeat timeout: ${timeSinceLastHeartbeat}ms`
          },
          recovery: {
            attempted: false,
            action: 'none'
          }
        }

        this.failureEvents.push(failureEvent)

        this.log('worker_unhealthy', `Worker ${agentId} marked unhealthy`, {
          agentId,
          timeSinceLastHeartbeat
        })

        // 尝试故障转移
        if (this.config.loadBalancing.failoverEnabled) {
          this.reassignWorkerTasks(agentId)
        }
      }
    }
  }

  // 启动监控
  private startMonitoring(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics()
    }, this.config.monitoring.metricsInterval)
  }

  // 收集指标
  private collectMetrics(): void {
    // 简化的指标收集
    for (const [agentId, status] of this.workerStatuses) {
      // 检查 CPU 和内存使用率阈值
      if (status.load.cpuUsage > this.config.monitoring.alertThreshold.cpuPercent) {
        this.log('alert_cpu_high', `Worker ${agentId} CPU usage high`, {
          agentId,
          cpuUsage: status.load.cpuUsage
        })
      }
    }
  }

  // 更新配置
  updateConfig(config: Partial<MetaAgentConfig>): void {
    this.config = { ...this.config, ...config }
    this.saveConfig()
    this.log('config_updated', 'Meta-Agent config updated', config)
  }

  // 获取配置
  getConfig(): MetaAgentConfig {
    return this.config
  }

  // 获取故障事件历史
  getFailureHistory(agentId?: string): WorkerFailureEvent[] {
    let history = this.failureEvents
    if (agentId) {
      history = history.filter(e => e.agentId === agentId)
    }
    return history.sort((a, b) => b.timestamp - a.timestamp)
  }
}

// 单例实例
let manager: MetaAgentManager | null = null

/**
 * 获取MetaAgentManager
 *
 * @returns 返回值(MetaAgentManager)
 */
export function getMetaAgentManager(): MetaAgentManager {
  if (!manager) {
    manager = new MetaAgentManager()
  }
  return manager
}

export { MetaAgentManager }
