/**
 * StructuredLogger - 浏览器端空实现
 * 
 * 服务端实际实现位于 .vitepress/agent/runtime/StructuredLogger.server.ts
 * 该文件仅作为浏览器端的类型定义和空实现
 */

// 类型定义
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

// 浏览器端空实现
class BrowserLogger {
  private sessionId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  private currentRequestId: string | null = null

  debug(event: string, message: string, data?: Record<string, any>): void {
    console.debug(`[DEBUG] ${event}: ${message}`, data)
  }
  
  info(event: string, message: string, data?: Record<string, any>): void {
    console.info(`[INFO] ${event}: ${message}`, data)
  }
  
  warn(event: string, message: string, data?: Record<string, any>): void {
    console.warn(`[WARN] ${event}: ${message}`, data)
  }
  
  error(event: string, message: string, data?: Record<string, any>): void {
    console.error(`[ERROR] ${event}: ${message}`, data)
  }
  
  success(event: string, message: string, data?: Record<string, any>): void {
    console.log(`[SUCCESS] ${event}: ${message}`, data)
  }
  
  startRequest(requestId?: string, actor?: LogActor): string {
    const reqId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    this.currentRequestId = reqId
    return reqId
  }
  
  endRequest(requestId?: string, statusCode?: number): void {}
  startTimer(label: string): void {}
  endTimer(label: string, event?: string, message?: string, data?: Record<string, any>): number { return 0 }
  startLLMChain(taskId: string, model?: string): void {}
  endLLMChain(taskId: string, result?: any): void {}
  logFileOperation(operation: any, path: any, result: any): void {}
  logSkillExecution(skillName: any, taskId: any, params: any, result: any): void {}
  getRecentLogs(count?: number): StructuredLogEntry[] { return [] }
  queryLogs(filter?: LogQueryFilter): StructuredLogEntry[] { return [] }
  getStats(): LogStats { 
    return { 
      total: 0, 
      byLevel: {}, 
      byEvent: {}, 
      byActor: { human: 0, ai: 0, system: 0 }, 
      byComponent: {}, 
      recentErrors: [], 
      avgDurationByComponent: {} 
    }
  }
  close(): void {}
}

let loggerInstance: BrowserLogger | null = null

export function getStructuredLogger(): BrowserLogger {
  if (!loggerInstance) {
    loggerInstance = new BrowserLogger()
  }
  return loggerInstance
}

export function createStructuredLogger(): BrowserLogger {
  loggerInstance = new BrowserLogger()
  return loggerInstance
}
