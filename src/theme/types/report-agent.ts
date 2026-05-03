/**
 * ============================================================================
 * 类型定义 - report-agent
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/types
 */


import type { AgentRuntimeStatus } from './agent-runtime'
import type { TaskStatus } from './task'

/** 报告类型 */
/**
 * ReportType 类型别名
 *
 */
export type ReportType =
  | 'status'       // 状态报告
  | 'performance'  // 性能报告
  | 'task'         // 任务报告
  | 'error'        // 错误报告
  | 'summary'      // 摘要报告
  | 'custom'       // 自定义报告

/** 报告格式 */
/**
 * ReportFormat 类型别名
 *
 */
export type ReportFormat = 'json' | 'markdown' | 'html' | 'pdf'

/** 报告频率 */
/**
 * ReportFrequency 类型别名
 *
 */
export type ReportFrequency =
  | 'realtime'   // 实时
  | 'hourly'     // 每小时
  | 'daily'      // 每天
  | 'weekly'     // 每周
  | 'on-demand'  // 按需

/** 报告配置 */
/**
 * ReportConfig 接口定义
 *
 */
export interface ReportConfig {
  // 基本配置
  enabled: boolean
  type: ReportType
  format: ReportFormat
  frequency: ReportFrequency

  // 内容配置
  content: {
    includeSystemStatus: boolean
    includeAgentStatus: boolean
    includeTaskStatus: boolean
    includePerformanceMetrics: boolean
    includeErrorLogs: boolean
    maxErrorLogEntries: number
  }

  // 推送配置
  delivery: {
    channels: DeliveryChannel[]

    // 邮件配置
    email?: {
      recipients: string[]
      subjectTemplate: string
      smtpConfig?: any
    }

    // Webhook 配置
    webhook?: {
      url: string
      method: 'POST' | 'PUT'
      headers: Record<string, string>
      timeout: number
    }

    // 消息推送配置
    push?: {
      provider: 'pushover' | 'pushbullet' | 'custom'
      config: any
    }
  }

  // 告警配置
  alerts: {
    enabled: boolean
    conditions: AlertCondition[]
  }

  // 调度配置
  schedule?: {
    cron?: string
    timezone: string
    lastReportAt?: number
    nextReportAt?: number
  }
}

/** 推送渠道 */
/**
 * DeliveryChannel 类型别名
 *
 */
export type DeliveryChannel = 'email' | 'webhook' | 'push' | 'console' | 'file'

/** 告警条件 */
/**
 * AlertCondition 接口定义
 *
 */
export interface AlertCondition {
  id: string
  name: string
  enabled: boolean

  // 触发条件
  trigger: {
    metric: string
    operator: 'gt' | 'lt' | 'eq' | 'neq' | 'gte' | 'lte'
    threshold: number
    duration?: number  // 持续多久触发 (ms)
  }

  // 严重级别
  severity: 'info' | 'warning' | 'critical' | 'emergency'

  // 通知配置
  notification: {
    channels: DeliveryChannel[]
    cooldown: number  // 冷却时间 (ms)
    lastTriggeredAt?: number
  }

  // 动作
  actions: {
    autoPauseAgent?: boolean
    autoRestartAgent?: boolean
    notifyAdmin: boolean
  }
}

/** 系统状态报告 */
/**
 * SystemStatusReport 接口定义
 *
 */
export interface SystemStatusReport {
  timestamp: number
  period: { start: number; end: number }

  // 系统概览
  overview: {
    totalAgents: number
    activeAgents: number
    totalTasks: number
    completedTasks: number
    failedTasks: number
    systemUptime: number
  }

  // Agent 状态
  agents: {
    agentId: string
    name: string
    status: AgentRuntimeStatus
    health: 'healthy' | 'degraded' | 'unhealthy'
    lastHeartbeat: number
    stats: {
      tasksCompleted: number
      tasksFailed: number
      averageTaskDuration: number
    }
  }[]

  // 任务统计
  tasks: {
    byStatus: Record<TaskStatus, number>
    byType: Record<string, number>
    averageCompletionTime: number
    successRate: number
  }

  // 性能指标
  performance: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkIO: { in: number; out: number }
  }

  // 异常和错误
  issues: {
    critical: number
    warning: number
    info: number
    recentErrors: {
      timestamp: number
      agentId: string
      error: string
      severity: 'critical' | 'warning' | 'info'
    }[]
  }
}

/** 性能报告 */
/**
 * PerformanceReport 接口定义
 *
 */
export interface PerformanceReport {
  timestamp: number
  period: { start: number; end: number }

  // 整体性能
  summary: {
    totalTasksExecuted: number
    averageExecutionTime: number
    throughput: number  // tasks per minute
    successRate: number
  }

  // 各 Agent 性能
  agentPerformance: {
    agentId: string
    name: string

    execution: {
      tasksCompleted: number
      tasksFailed: number
      averageTaskDuration: number
      minTaskDuration: number
      maxTaskDuration: number
    }

    resources: {
      averageCpuUsage: number
      peakCpuUsage: number
      averageMemoryUsage: number
      peakMemoryUsage: number
    }

    efficiency: {
      utilizationRate: number
      idleTimePercent: number
      queueWaitTime: number
    }
  }[]

  // 趋势分析
  trends: {
    taskVolume: { timestamp: number; count: number }[]
    successRate: { timestamp: number; rate: number }[]
    resourceUsage: { timestamp: number; cpu: number; memory: number }[]
  }

  // 瓶颈分析
  bottlenecks: {
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    recommendation: string
  }[]
}

/** 任务报告 */
/**
 * TaskReport 接口定义
 *
 */
export interface TaskReport {
  timestamp: number
  period: { start: number; end: number }

  // 任务概览
  summary: {
    total: number
    completed: number
    failed: number
    cancelled: number
    inProgress: number
    pending: number
  }

  // 任务详情
  tasks: {
    taskId: string
    type: string
    status: TaskStatus
    priority: string
    assignedTo: string
    createdAt: number
    startedAt?: number
    completedAt?: number
    duration?: number
    result?: any
    error?: string
  }[]

  // 按类型统计
  byType: Record<string, {
    count: number
    completed: number
    failed: number
    averageDuration: number
  }>

  // 按 Agent 统计
  byAgent: Record<string, {
    total: number
    completed: number
    failed: number
    averageDuration: number
  }>
}

/** 生成的报告 */
/**
 * GeneratedReport 接口定义
 *
 */
export interface GeneratedReport {
  id: string
  type: ReportType
  format: ReportFormat
  timestamp: number
  period: { start: number; end: number }

  // 内容
  title: string
  summary: string
  content: any  // 根据 format 不同,类型不同

  // 元数据
  metadata: {
    generatedBy: string
    generatedAt: number
    version: string
    dataPoints: number
  }

  // 导出
  export?: {
    filePath?: string
    downloadUrl?: string
    size?: number
  }
}

/** 报告请求 */
/**
 * GenerateReportRequest 接口定义
 *
 */
export interface GenerateReportRequest {
  type: ReportType
  format: ReportFormat
  period?: { start: number; end: number }

  // 筛选条件
  filters?: {
    agentIds?: string[]
    taskTypes?: string[]
    statuses?: string[]
    severity?: string[]
  }

  // 导出选项
  export?: {
    saveToFile: boolean
    filePath?: string
    sendEmail: boolean
    emailRecipients?: string[]
  }
}

/** 通知消息 */
/**
 * ReportNotification 接口定义
 *
 */
export interface ReportNotification {
  id: string
  timestamp: number
  type: 'report' | 'alert' | 'summary'
  priority: 'low' | 'normal' | 'high' | 'critical'

  // 内容
  title: string
  message: string
  details?: any

  // 推送状态
  delivery: {
    channels: DeliveryChannel[]
    status: Record<DeliveryChannel, 'pending' | 'sent' | 'failed'>
    sentAt?: Record<DeliveryChannel, number>
    errors?: Record<DeliveryChannel, string>
  }

  // 阅读状态
  read: boolean
  readAt?: number
}

/** 报告调度 */
/**
 * ReportSchedule 接口定义
 *
 */
export interface ReportSchedule {
  id: string
  name: string
  enabled: boolean

  // 报告配置
  config: ReportConfig

  // 调度
  schedule: {
    type: 'once' | 'recurring'
    cron?: string
    nextRunAt?: number
    lastRunAt?: number
    runCount: number
  }

  // 历史
  history: {
    runAt: number
    reportId: string
    status: 'success' | 'failed'
    error?: string
  }[]
}
