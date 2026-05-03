/**
 * ============================================================================
 * 类型定义 - agent-runtime
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/types
 */


import type { Task } from './task'

/** Agent 运行状态 */
/**
 * AgentRuntimeStatus 类型别名
 *
 */
export type AgentRuntimeStatus =
  | 'created'      // 已创建
  | 'starting'     // 启动中
  | 'running'      // 运行中
  | 'paused'       // 已暂停
  | 'stopping'     // 停止中
  | 'stopped'      // 已停止
  | 'error'        // 错误
  | 'recovering'   // 恢复中

/** Agent 运行模式 */
/**
 * AgentRuntimeMode 类型别名
 *
 */
export type AgentRuntimeMode =
  | 'manual'       // 手动模式
  | 'auto'         // 自动模式
  | 'daemon'       // 守护模式

/** Agent 心跳 */
/**
 * AgentHeartbeat 接口定义
 *
 */
export interface AgentHeartbeat {
  agentId: string
  timestamp: number
  status: AgentRuntimeStatus
  stats: {
    cpuUsage: number
    memoryUsage: number
    taskQueueLength: number
    activeTaskCount: number
    completedTaskCount: number
    failedTaskCount: number
  }
}

/** Agent 运行时配置 */
/**
 * AgentRuntimeConfig 接口定义
 *
 */
export interface AgentRuntimeConfig {
  agentId: string
  mode: AgentRuntimeMode

  // 自动恢复配置
  recovery: {
    enabled: boolean
    maxRetries: number
    retryDelay: number
  }

  // 心跳配置
  heartbeat: {
    enabled: boolean
    interval: number  // ms
    timeout: number   // ms
  }

  // 任务调度配置
  scheduler: {
    enabled: boolean
    maxConcurrentTasks: number
    taskTimeout: number
  }

  // 日志配置
  logging: {
    enabled: boolean
    level: 'debug' | 'info' | 'warn' | 'error'
    maxLogFiles: number
  }
}

/** Agent 运行时实例 */
/**
 * AgentRuntime 接口定义
 *
 */
export interface AgentRuntime {
  id: string
  agentId: string
  status: AgentRuntimeStatus
  config: AgentRuntimeConfig

  // 运行统计
  stats: {
    startedAt?: number
    pausedAt?: number
    stoppedAt?: number
    totalUptime: number  // ms
    lastHeartbeatAt?: number
    errorCount: number
    recoveryCount: number
  }

  // 当前任务
  activeTasks: Task[]
  queuedTasks: Task[]
  completedTasks: Task[]

  // 消息队列
  messages: AgentMessage[]

  // 元数据
  metadata: {
    createdAt: number
    updatedAt: number
    version: string
  }
}

/** Agent 消息 */
/**
 * AgentMessage 接口定义
 *
 */
export interface AgentMessage {
  id: string
  type: 'command' | 'notification' | 'query' | 'response'
  from: string  // 'user' | 'meta-agent' | 'system' | agent-id
  to: string    // agent-id | 'broadcast'
  content: string
  payload?: any
  timestamp: number
  read: boolean
  priority: 'low' | 'normal' | 'high' | 'critical'
}

/** Agent 控制命令 */
/**
 * AgentControlCommand 接口定义
 *
 */
export interface AgentControlCommand {
  id: string
  type: 'start' | 'pause' | 'resume' | 'stop' | 'restart' | 'kill'
  agentId: string
  issuedBy: string
  issuedAt: number
  reason?: string
  force?: boolean
}

/** Agent 运行日志 */
/**
 * AgentRuntimeLog 接口定义
 *
 */
export interface AgentRuntimeLog {
  id: string
  agentId: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  event: string
  message: string
  data?: any
}

/** Agent 性能指标 */
/**
 * AgentMetrics 接口定义
 *
 */
export interface AgentMetrics {
  agentId: string
  timestamp: number

  // 执行指标
  execution: {
    tasksPerMinute: number
    averageTaskDuration: number
    successRate: number
  }

  // 资源指标
  resources: {
    cpuPercent: number
    memoryMB: number
    diskUsageMB: number
  }

  // 效率指标
  efficiency: {
    idleTimePercent: number
    queueWaitTimeAverage: number
    concurrentTaskUtilization: number
  }
}

/** 创建运行时参数 */
/**
 * CreateAgentRuntimeParams 接口定义
 *
 */
export interface CreateAgentRuntimeParams {
  agentId: string
  mode?: AgentRuntimeMode
  config?: Partial<AgentRuntimeConfig>
}

/** 更新运行时参数 */
/**
 * UpdateAgentRuntimeParams 接口定义
 *
 */
export interface UpdateAgentRuntimeParams {
  mode?: AgentRuntimeMode
  config?: Partial<AgentRuntimeConfig>
}

/** 运行时查询选项 */
/**
 * AgentRuntimeQueryOptions 接口定义
 *
 */
export interface AgentRuntimeQueryOptions {
  status?: AgentRuntimeStatus[]
  mode?: AgentRuntimeMode[]
  agentId?: string
  limit?: number
  offset?: number
}

/** 运行时统计 */
/**
 * AgentRuntimeStats 接口定义
 *
 */
export interface AgentRuntimeStats {
  total: number
  byStatus: Record<AgentRuntimeStatus, number>
  byMode: Record<AgentRuntimeMode, number>

  // 全局统计
  global: {
    totalTasksExecuted: number
    totalTasksFailed: number
    averageUptime: number
    totalErrors: number
  }
}

/** 干预操作 */
/**
 * AgentIntervention 接口定义
 *
 */
export interface AgentIntervention {
  id: string
  agentId: string
  type: 'pause' | 'resume' | 'stop' | 'message' | 'task'
  action: string
  performedBy: string
  performedAt: number
  reason?: string
  result?: 'success' | 'failed'
  error?: string
}
