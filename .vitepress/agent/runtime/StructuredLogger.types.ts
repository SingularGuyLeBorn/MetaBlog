/**
 * StructuredLogger 类型定义
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
export type LogActor = 'human' | 'ai' | 'system'
export type FileEventType = 'add' | 'change' | 'unlink' | 'rename'
export type LLMPhase = 'prompt' | 'tool_call' | 'result' | 'error'

export interface PerformanceMetrics {
  startTime: number
  endTime?: number
  durationMs?: number
  cpuUsage?: number
  memoryUsage?: number
}

export interface FileSystemEvent {
  eventType: FileEventType
  path: string
  oldPath?: string
  size?: number
  hash?: string
}

export interface LLMDecisionChain {
  phase: LLMPhase
  model?: string
  prompt?: string
  toolCalls?: Array<{
    name: string
    arguments: Record<string, any>
    result?: any
  }>
  result?: any
  error?: string
}

export interface StructuredLogEntry {
  id: string
  timestamp: string
  level: LogLevel
  event: string
  message: string
  requestId?: string
  sessionId: string
  traceId: string
  taskId?: string
  actor: LogActor
  actorId?: string
  component: string
  sourceFile?: string
  lineNumber?: number
  durationMs?: number
  memoryUsage?: number
  data?: Record<string, any>
  fileEvent?: FileSystemEvent
  llmChain?: LLMDecisionChain
  error?: {
    message: string
    stack?: string
    code?: string
  }
  environment: string
  version: string
}

export interface LogQueryFilter {
  level?: LogLevel
  event?: string
  requestId?: string
  taskId?: string
  component?: string
  actor?: LogActor
  startTime?: Date
  endTime?: Date
  hasError?: boolean
}

export interface LogStats {
  total: number
  byLevel: Record<string, number>
  byEvent: Record<string, number>
  byActor: Record<LogActor, number>
  byComponent: Record<string, number>
  recentErrors: StructuredLogEntry[]
  avgDurationByComponent: Record<string, number>
}
