/**
 * Meta-Agent - 控制其他 Agent 的类型定义
 * 
 * Meta-Agent 负责：
 * 1. Worker Agent 生命周期管理
 * 2. 任务分配和负载均衡
 * 3. 故障检测和恢复
 * 4. 资源调度
 */

import type { AgentRuntime, AgentRuntimeStatus } from './agent-runtime'
import type { Task, TaskPriority } from './task'

/** Worker Agent 注册信息 */
export interface WorkerRegistration {
  agentId: string
  name: string
  description?: string
  capabilities: string[]  // 能力列表
  maxConcurrentTasks: number
  priority: WorkerPriority
  registeredAt: number
  lastHeartbeatAt: number
  status: AgentRuntimeStatus
}

/** Worker 优先级 */
export type WorkerPriority = 'low' | 'normal' | 'high' | 'critical'

/** Worker 状态 */
export interface WorkerStatus {
  agentId: string
  status: AgentRuntimeStatus
  health: 'healthy' | 'degraded' | 'unhealthy'
  
  // 负载信息
  load: {
    currentTasks: number
    maxTasks: number
    queueLength: number
    cpuUsage: number
    memoryUsage: number
  }
  
  // 性能指标
  performance: {
    tasksCompleted: number
    tasksFailed: number
    averageTaskDuration: number
    lastTaskCompletedAt?: number
  }
  
  // 可用性
  availability: {
    isAvailable: boolean
    nextAvailableAt?: number
    maintenanceWindow?: { start: number; end: number }
  }
}

/** 任务分配策略 */
export type TaskAssignmentStrategy = 
  | 'round-robin'      // 轮询
  | 'least-loaded'     // 最小负载
  | 'priority-based'   // 优先级
  | 'capability-match' // 能力匹配
  | 'random'           // 随机

/** Meta-Agent 配置 */
export interface MetaAgentConfig {
  // 负载均衡配置
  loadBalancing: {
    strategy: TaskAssignmentStrategy
    enabled: boolean
    healthCheckInterval: number
    failoverEnabled: boolean
  }
  
  // 任务分配配置
  taskAssignment: {
    maxRetries: number
    retryDelay: number
    timeout: number
    priorityWeight: number
    capabilityWeight: number
    loadWeight: number
  }
  
  // 故障恢复配置
  faultRecovery: {
    enabled: boolean
    maxFailures: number
    recoveryDelay: number
    autoRestart: boolean
  }
  
  // 监控配置
  monitoring: {
    enabled: boolean
    metricsInterval: number
    alertThreshold: {
      cpuPercent: number
      memoryPercent: number
      errorRate: number
    }
  }
}

/** 任务分配结果 */
export interface TaskAssignment {
  taskId: string
  assignedTo: string  // Worker agentId
  assignedAt: number
  priority: TaskPriority
  expectedDuration?: number
  
  // 分配原因
  reason: {
    strategy: TaskAssignmentStrategy
    factors: {
      capabilityMatch: number  // 0-1
      loadBalance: number      // 0-1
      priority: number         // 0-1
    }
  }
}

/** 任务分配请求 */
export interface TaskAssignmentRequest {
  taskId: string
  type: string
  priority: TaskPriority
  requiredCapabilities: string[]
  estimatedDuration?: number
  preferredWorkers?: string[]
  excludedWorkers?: string[]
}

/** Meta-Agent 状态 */
export interface MetaAgentStatus {
  // 基本信息
  status: 'initializing' | 'running' | 'stopped' | 'error'
  startedAt: number
  
  // Worker 统计
  workers: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
    byStatus: Record<AgentRuntimeStatus, number>
  }
  
  // 任务统计
  tasks: {
    totalAssigned: number
    totalCompleted: number
    totalFailed: number
    currentlyRunning: number
    queued: number
  }
  
  // 性能指标
  performance: {
    averageAssignmentTime: number
    tasksPerMinute: number
    successRate: number
  }
}

/** 负载均衡决策 */
export interface LoadBalanceDecision {
  type: 'assign' | 'rebalance' | 'scale-up' | 'scale-down'
  reason: string
  
  // 任务迁移建议
  migrations?: {
    fromWorker: string
    toWorker: string
    tasks: string[]
  }[]
  
  // 扩容建议
  scaleRecommendation?: {
    recommendedWorkers: number
    currentWorkers: number
    reason: string
  }
}

/** 故障事件 */
export interface WorkerFailureEvent {
  agentId: string
  timestamp: number
  type: 'crash' | 'unresponsive' | 'high-error-rate' | 'resource-exhausted'
  severity: 'warning' | 'critical' | 'fatal'
  details: {
    errorMessage?: string
    stackTrace?: string
    metricsSnapshot?: any
  }
  
  // 恢复操作
  recovery: {
    attempted: boolean
    action: 'restart' | 'reassign-tasks' | 'alert' | 'none'
    result?: 'success' | 'failed'
    error?: string
  }
}

/** 资源调度计划 */
export interface ResourceSchedule {
  timestamp: number
  workers: {
    agentId: string
    allocatedTasks: string[]
    expectedLoad: number  // 0-1
  }[]
  
  // 优化目标
  objectives: {
    minimizeMakespan: boolean
    balanceLoad: boolean
    maximizeUtilization: boolean
    respectPriorities: boolean
  }
}

/** Worker 注册请求 */
export interface RegisterWorkerRequest {
  agentId: string
  name: string
  description?: string
  capabilities: string[]
  maxConcurrentTasks: number
  priority: WorkerPriority
}

/** Worker 注销请求 */
export interface UnregisterWorkerRequest {
  agentId: string
  reason?: string
  force?: boolean
}

/** 批量任务分配请求 */
export interface BatchTaskAssignmentRequest {
  tasks: TaskAssignmentRequest[]
  strategy?: TaskAssignmentStrategy
  options?: {
    atomic: boolean  // 全部成功或全部失败
    timeout: number
  }
}

/** 批量任务分配结果 */
export interface BatchTaskAssignmentResult {
  success: boolean
  assignments: TaskAssignment[]
  failed: {
    taskId: string
    reason: string
  }[]
  
  // 统计
  stats: {
    total: number
    assigned: number
    failed: number
    averageAssignmentTime: number
  }
}
