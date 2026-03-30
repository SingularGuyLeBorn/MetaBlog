/**
 * Task System - 任务调度系统类型定义
 * 
 * 支持后台任务、定时任务、工作流任务
 */

/** 任务状态 */
export type TaskStatus = 
  | 'pending'      // 等待执行
  | 'running'      // 执行中
  | 'completed'    // 已完成
  | 'failed'       // 失败
  | 'cancelled'    // 已取消
  | 'retrying'     // 重试中

/** 任务优先级 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

/** 任务类型 */
export type TaskType = 
  | 'content_fetch'    // 内容获取
  | 'content_process'  // 内容处理
  | 'article_generate' // 文章生成
  | 'article_publish'  // 文章发布
  | 'skill_execute'    // 技能执行
  | 'agent_chat'       // Agent对话
  | 'file_sync'        // 文件同步
  | 'git_sync'         // Git同步
  | 'backup'           // 备份
  | 'custom'           // 自定义

/** 任务参数 */
export interface TaskParams {
  [key: string]: any
}

/** 任务步骤 */
export interface TaskStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  result?: any
  error?: string
}

/** 任务执行结果 */
export interface TaskResult {
  success: boolean
  data?: any
  error?: string
  output?: string
}

/** 任务定义 */
export interface Task {
  id: string
  name: string
  description?: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  
  // 任务参数
  params: TaskParams
  
  // 执行配置
  config: {
    maxRetries: number
    timeout: number
    retryDelay: number
  }
  
  // 执行状态
  progress: {
    current: number
    total: number
    percentage: number
  }
  
  // 执行步骤
  steps: TaskStep[]
  
  // 执行结果
  result?: TaskResult
  
  // 执行统计
  stats: {
    createdAt: number
    startedAt?: number
    completedAt?: number
    retryCount: number
    duration?: number
  }
  
  // 关联信息
  metadata: {
    createdBy: string
    agentId?: string
    sessionId?: string
    parentTaskId?: string
    tags: string[]
  }
}

/** 任务模板 */
export interface TaskTemplate {
  id: string
  name: string
  description: string
  type: TaskType
  category: 'content' | 'agent' | 'system' | 'maintenance' | 'custom'
  icon?: string
  defaultPriority: TaskPriority
  defaultConfig: {
    maxRetries: number
    timeout: number
    retryDelay: number
  }
  paramsSchema: {
    name: string
    key: string
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    required: boolean
    description?: string
    default?: any
  }[]
}

/** 任务创建参数 */
export interface TaskCreateParams {
  name: string
  description?: string
  type: TaskType
  priority?: TaskPriority
  params?: TaskParams
  config?: Partial<Task['config']>
  metadata?: Partial<Task['metadata']>
}

/** 任务更新参数 */
export interface TaskUpdateParams {
  name?: string
  description?: string
  priority?: TaskPriority
  params?: TaskParams
  config?: Partial<Task['config']>
  metadata?: Partial<Task['metadata']>
}

/** 任务查询选项 */
export interface TaskQueryOptions {
  status?: TaskStatus[]
  type?: TaskType[]
  priority?: TaskPriority[]
  agentId?: string
  createdBy?: string
  startTime?: number
  endTime?: number
  tags?: string[]
  limit?: number
  offset?: number
}

/** 任务统计 */
export interface TaskStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

/** 任务批次 */
export interface TaskBatch {
  tasks: TaskCreateParams[]
  options?: {
    sequential?: boolean
    stopOnError?: boolean
  }
}

/** 任务日志 */
export interface TaskLog {
  id: string
  taskId: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
}

/** 工作流定义 */
export interface Workflow {
  id: string
  name: string
  description?: string
  tasks: {
    id: string
    taskId: string
    dependsOn: string[]
    condition?: string
  }[]
  trigger?: {
    type: 'manual' | 'scheduled' | 'event'
    cron?: string
    event?: string
  }
}
