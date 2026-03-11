/**
 * Agent Orchestrator 类型定义
 * 
 * 三级Agent权限系统：
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │  用户 (User) - 最高权限，可操作所有Agent                        │
 * │  ├── 固定Agent (System) - 只有用户可操作，系统级服务             │
 * │  ├── 高级Agent (Manager) - 可管理普通Agent，常驻后台自主决策       │
 * │  └── 普通Agent (Worker) - 执行任务，受Manager管理               │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * 核心特性：
 * - 自我进化：Manager Agent 根据系统状态自主优化 Worker Agent
 * - 实时监控：可视化面板展示所有Agent状态
 * - 常驻后台：Manager Agent 24/7监控系统
 */

import type { Agent, AgentCreateParams } from '../types/agent'

// ==================== Agent 等级 ====================

/** Agent 等级 - 三级权限系统 */
export type AgentTier = 'system' | 'manager' | 'worker'

/** Agent 运行模式 */
export type AgentMode = 'passive' | 'scheduled' | 'hybrid' | 'always_on'

/** Agent 运行状态 */
export type AgentRuntimeStatus = 
  | 'idle'           // 空闲
  | 'listening'      // 监听中（被动模式）
  | 'scheduled'      // 等待定时触发
  | 'running'        // 执行中
  | 'paused'         // 已暂停
  | 'error'          // 错误
  | 'maintenance'    // 维护中
  | 'evolving'       // 自我进化中

// ==================== 权限系统 ====================

/** 操作类型 */
export type AgentOperation = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete'
  | 'pause'
  | 'resume'
  | 'trigger'
  | 'evolve'
  | 'monitor'
  | 'manage'

/** 权限规则 */
export interface PermissionRule {
  operation: AgentOperation
  /** 是否允许 */
  allowed: boolean
  /** 限制条件 */
  constraints?: {
    /** 最大可管理数量 */
    maxCount?: number
    /** 允许的目标等级 */
    targetTiers?: AgentTier[]
    /** 需要用户确认 */
    requireConfirm?: boolean
  }
}

/** 权限矩阵 */
export interface PermissionMatrix {
  /** 操作者等级 */
  operatorTier: AgentTier
  /** 目标等级 */
  targetTier: AgentTier
  /** 允许的操作 */
  allowedOperations: AgentOperation[]
}

/** 默认权限矩阵 */
export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix[] = [
  // 用户操作权限（通过UI操作，不通过Agent）
  { operatorTier: 'system', targetTier: 'system', allowedOperations: ['create', 'read', 'update', 'delete', 'pause', 'resume', 'trigger', 'evolve', 'monitor', 'manage'] },
  { operatorTier: 'system', targetTier: 'manager', allowedOperations: ['create', 'read', 'update', 'delete', 'pause', 'resume', 'trigger', 'evolve', 'monitor', 'manage'] },
  { operatorTier: 'system', targetTier: 'worker', allowedOperations: ['create', 'read', 'update', 'delete', 'pause', 'resume', 'trigger', 'evolve', 'monitor', 'manage'] },
  
  // Manager Agent 权限 - 不能操作系统级Agent
  { operatorTier: 'manager', targetTier: 'system', allowedOperations: [] },
  { operatorTier: 'manager', targetTier: 'manager', allowedOperations: ['read', 'monitor'] },
  { operatorTier: 'manager', targetTier: 'worker', allowedOperations: ['create', 'read', 'update', 'delete', 'pause', 'resume', 'trigger', 'evolve', 'monitor', 'manage'] },
  
  // Worker Agent 权限 - 只能读取和监控自己
  { operatorTier: 'worker', targetTier: 'system', allowedOperations: [] },
  { operatorTier: 'worker', targetTier: 'manager', allowedOperations: [] },
  { operatorTier: 'worker', targetTier: 'worker', allowedOperations: ['read', 'monitor'] },
]

// ==================== 扩展 Agent 定义 ====================

/** 扩展的 Agent 定义 */
export interface EnhancedAgent extends Agent {
  /** 等级：system | manager | worker */
  tier: AgentTier
  /** 运行模式 */
  mode: AgentMode
  /** 运行时状态 */
  runtimeStatus: AgentRuntimeStatus
  
  /** 定时配置 */
  scheduleConfig?: ScheduleConfig
  
  /** 当前任务 */
  currentTask?: RunningTask
  /** 任务历史 */
  taskHistory: TaskRecord[]
  
  /** 父Agent ID */
  parentAgentId?: string
  /** 子Agent IDs（仅Manager和System） */
  childAgentIds: string[]
  
  /** 创建者 */
  createdBy: 'user' | string  // 'user' 或 Agent ID
  
  /** 执行统计 */
  stats: AgentStats
  
  /** 能力评分（用于自我进化） */
  capabilityScore: CapabilityScore
  
  /** 最后心跳时间 */
  lastHeartbeat: number
  
  /** 是否常驻后台 */
  isResident: boolean
  
  /** 监控配置 */
  monitoringConfig: MonitoringConfig
}

/** 定时配置 */
export interface ScheduleConfig {
  /** Cron 表达式 */
  cron?: string
  /** 固定时间间隔（毫秒） */
  interval?: number
  /** 时区 */
  timezone: string
  /** 是否启用 */
  enabled: boolean
  /** 下次执行时间 */
  nextRunAt?: number
  /** 最后一次执行时间 */
  lastRunAt?: number
  /** 任务超时（毫秒） */
  timeout: number
  /** 重试次数 */
  retryCount: number
  /** 重试间隔（毫秒） */
  retryDelay: number
}

/** 运行中的任务 */
export interface RunningTask {
  id: string
  name: string
  type: TaskType
  status: 'running' | 'paused'
  startedAt: number
  progress: number // 0-100
  currentStep: string
  currentTool?: string
  toolCallChain: ToolCallInfo[]
  logs: LogEntry[]
}

/** 工具调用信息 */
export interface ToolCallInfo {
  toolName: string
  startedAt: number
  completedAt?: number
  status: 'running' | 'completed' | 'error'
  input?: any
  output?: any
  error?: string
}

/** 日志条目 */
export interface LogEntry {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  metadata?: any
}

/** 任务类型 */
export type TaskType = 
  | 'content_generation' 
  | 'data_collection' 
  | 'analysis' 
  | 'maintenance' 
  | 'monitoring'
  | 'optimization'
  | 'evolution'
  | 'custom'

/** 任务记录 */
export interface TaskRecord {
  id: string
  name: string
  type: TaskType
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  triggerSource: 'user' | 'manual' | 'scheduled' | 'manager' | 'system'
  triggeredBy?: string
  startedAt: number
  completedAt?: number
  duration?: number
  progress?: number
  input?: any
  output?: any
  error?: string
  toolCalls: ToolCallInfo[]
  logs: LogEntry[]
}

/** Agent 统计 */
export interface AgentStats {
  totalTasks: number
  successfulTasks: number
  failedTasks: number
  cancelledTasks: number
  totalExecutionTime: number
  averageExecutionTime: number
  lastTaskAt?: number
  uptime: number // 运行时长（毫秒）
}

/** 能力评分 */
export interface CapabilityScore {
  overall: number // 0-100
  reliability: number // 可靠性
  efficiency: number // 效率
  quality: number // 输出质量
  adaptability: number // 适应性
  lastEvaluatedAt: number
}

/** 监控配置 */
export interface MonitoringConfig {
  /** 是否监控 */
  enabled: boolean
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number
  /** 性能指标收集 */
  collectMetrics: boolean
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  /** 异常告警 */
  alertOnError: boolean
  /** 长时间运行告警阈值（毫秒） */
  longRunningThreshold?: number
}

// ==================== 系统状态 ====================

/** 系统整体状态 */
export interface SystemState {
  /** 系统运行状态 */
  status: 'healthy' | 'degraded' | 'error' | 'maintenance'
  /** 所有Agent状态快照 */
  agents: AgentStateSnapshot[]
  /** 活跃任务数 */
  activeTasks: number
  /** 待处理任务数 */
  pendingTasks: number
  /** 系统负载 */
  load: SystemLoad
  /** 最后更新 */
  lastUpdated: number
  /** 系统事件 */
  recentEvents: SystemEvent[]
}

/** Agent 状态快照 */
export interface AgentStateSnapshot {
  id: string
  name: string
  tier: AgentTier
  mode: AgentMode
  runtimeStatus: AgentRuntimeStatus
  currentTask?: {
    id: string
    name: string
    progress: number
    currentTool?: string
  }
  stats: AgentStats
  lastHeartbeat: number
  isResident: boolean
}

/** 系统负载 */
export interface SystemLoad {
  cpu: number // 0-100
  memory: number // MB
  activeAgents: number
  queuedTasks: number
}

/** 系统事件 */
export interface SystemEvent {
  id: string
  type: SystemEventType
  timestamp: number
  agentId?: string
  taskId?: string
  message?: string
  severity?: 'info' | 'warning' | 'error' | 'critical'
  metadata?: any
  payload?: any
}

/** 系统事件类型 */
export type SystemEventType =
  | 'agent:created'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:deleted'
  | 'agent:status_changed'
  | 'agent:error'
  | 'agent:evolved'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:cancelled'
  | 'system:overload'
  | 'system:error'
  | 'system:maintenance'

// ==================== 自我进化 ====================

/** 进化策略 */
export interface EvolutionStrategy {
  id: string
  name: string
  description: string
  trigger: EvolutionTrigger
  action: EvolutionAction
  enabled: boolean
}

/** 进化触发条件 */
export interface EvolutionTrigger {
  type: 'performance' | 'error_rate' | 'scheduled' | 'manual' | 'load'
  threshold?: number
  schedule?: string // cron
  condition?: string // 表达式
}

/** 进化动作 */
export interface EvolutionAction {
  type: 'optimize_prompt' | 'adjust_schedule' | 'scale_up' | 'scale_down' | 'recreate' | 'notify'
  params?: any
}

/** 进化记录 */
export interface EvolutionRecord {
  id: string
  agentId: string
  strategyId: string
  triggeredAt: number
  previousState: any
  newState: any
  result: 'success' | 'failed' | 'partial'
  message: string
}

// ==================== Manager Agent 决策 ====================

/** 决策上下文 */
export interface DecisionContext {
  systemState: SystemState
  managedAgents: EnhancedAgent[]
  recentEvents: SystemEvent[]
  historicalData: HistoricalMetrics
}

/** 历史指标 */
export interface HistoricalMetrics {
  timeRange: { start: number; end: number }
  taskSuccessRate: number
  averageResponseTime: number
  errorRate: number
  resourceUtilization: number
}

/** 决策结果 */
export interface DecisionResult {
  decision: 'create_agent' | 'update_agent' | 'delete_agent' | 'pause_agent' | 'resume_agent' | 'optimize_agent' | 'no_action'
  targetAgentId?: string
  params?: any
  reason: string
  confidence: number // 0-1
  expectedOutcome: string
}

// ==================== 面板数据 ====================

/** 控制中心面板数据 */
export interface ControlPanelData {
  systemState: SystemState
  agents: EnhancedAgent[]
  activeTasks: RunningTask[]
  recentEvents: SystemEvent[]
  evolutionHistory: EvolutionRecord[]
  notifications: NotificationMessage[]
}

/** 通知消息 */
export interface NotificationMessage {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  agentId?: string
  taskId?: string
  timestamp: number
  read: boolean
  actions?: NotificationAction[]
}

/** 通知操作 */
export interface NotificationAction {
  label: string
  action: string
  data?: any
}

// ==================== 创建参数 ====================

/** 创建 System Agent 参数 */
export interface CreateSystemAgentParams extends AgentCreateParams {
  mode?: 'passive' | 'always_on'
  monitoringConfig?: Partial<MonitoringConfig>
  isResident?: boolean
}

/** 创建 Manager Agent 参数 */
export interface CreateManagerAgentParams extends AgentCreateParams {
  mode?: 'always_on'
  evolutionStrategies?: EvolutionStrategy[]
  managedWorkerIds?: string[]
  autoDecisions?: boolean
  decisionInterval?: number // 决策间隔（毫秒）
}

/** 创建 Worker Agent 参数 */
export interface CreateWorkerAgentParams extends AgentCreateParams {
  mode: 'passive' | 'scheduled' | 'hybrid'
  scheduleConfig?: Partial<ScheduleConfig>
  tasks?: TaskDefinition[]
  managerId?: string
  autoEvolve?: boolean
}

/** 任务定义 */
export interface TaskDefinition {
  id: string
  name: string
  description: string
  type: TaskType
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
  tools: string[]
  handler?: (input: any, context: TaskContext) => Promise<any>
}

/** 任务上下文 */
export interface TaskContext {
  agentId: string
  taskId: string
  startTime: number
  logger: (level: LogEntry['level'], message: string, metadata?: any) => void
  updateProgress: (progress: number, step: string) => void
  updateCurrentTool: (toolName: string) => void
  getAgent: () => EnhancedAgent
  getSystemState: () => SystemState
}

// ==================== Orchestrator 配置 ====================

export interface OrchestratorConfig {
  /** 最大并发任务数 */
  maxConcurrentTasks: number
  /** 默认任务超时（毫秒） */
  defaultTaskTimeout: number
  /** 是否启用通知 */
  enableNotifications: boolean
  /** 历史记录保留天数 */
  historyRetentionDays: number
  /** 是否启用权限检查 */
  enablePermissionCheck: boolean
  /** Manager 自动决策间隔（毫秒） */
  managerDecisionInterval: number
  /** 心跳超时（毫秒） */
  heartbeatTimeout: number
  /** 是否启用自我进化 */
  enableSelfEvolution: boolean
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxConcurrentTasks: 10,
  defaultTaskTimeout: 300000,
  enableNotifications: true,
  historyRetentionDays: 30,
  enablePermissionCheck: true,
  managerDecisionInterval: 60000, // 1分钟
  heartbeatTimeout: 30000, // 30秒
  enableSelfEvolution: true
}
