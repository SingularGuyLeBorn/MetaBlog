/**
 * EnhancedLogger - 增强版结构化日志系统
 * 支持更详细的日志字段和持久化
 */
import type { LogLevel } from '../core/types'

// ============================================
// Types
// ============================================

export interface EnhancedLogEntry {
  id: string
  timestamp: number
  level: LogLevel
  event: string        // 事件类型，如 skill.executed, file.saved
  message: string
  data: Record<string, any>
  
  // 追踪信息
  sessionId: string
  traceId: string
  taskId?: string
  
  // 执行信息
  skillName?: string
  duration?: number    // 执行耗时(ms)
  
  // 来源
  source: string       // 组件/文件来源
  line?: number        // 代码行号
  
  // 上下文
  userAgent?: string
  url?: string
}

export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byEvent: Record<string, number>
  byTask: Record<string, number>
  byDay: Record<string, number>
  recentErrors: EnhancedLogEntry[]
}

export interface LogFilter {
  level?: LogLevel
  event?: string
  taskId?: string
  skillName?: string
  source?: string
  startTime?: number
  endTime?: number
  search?: string
}

// ============================================
// Enhanced Logger
// ============================================

export class EnhancedLogger {
  private logs: EnhancedLogEntry[] = []
  private maxLogs: number = 5000
  private listeners: Map<LogLevel, Set<(entry: EnhancedLogEntry) => void>> = new Map()
  private sessionId: string
  private traceId: string = ''
  
  constructor(maxLogs: number = 5000) {
    this.maxLogs = maxLogs
    this.sessionId = this.generateSessionId()
    this.loadFromStorage()
    
    // 定期清理旧日志（每天）
    this.scheduleCleanup()
  }
  
  // ============================================
  // Public API - Logging Methods
  // ============================================
  
  debug(event: string, message: string, data?: Record<string, any>): void {
    this.log('debug', event, message, data)
  }
  
  info(event: string, message: string, data?: Record<string, any>): void {
    this.log('info', event, message, data)
  }
  
  warn(event: string, message: string, data?: Record<string, any>): void {
    this.log('warn', event, message, data)
  }
  
  error(event: string, message: string, data?: Record<string, any>): void {
    this.log('error', event, message, data)
  }
  
  /**
   * 记录技能执行
   */
  logSkillExecution(
    skillName: string, 
    taskId: string, 
    params: any, 
    result: { success: boolean; tokensUsed?: number; cost?: number; duration?: number }
  ): void {
    this.info('skill.executed', `Skill ${skillName} executed`, {
      skillName,
      taskId,
      params,
      success: result.success,
      tokensUsed: result.tokensUsed,
      cost: result.cost,
      duration: result.duration
    })
  }
  
  /**
   * 记录文件操作
   */
  logFileOperation(
    operation: 'read' | 'write' | 'delete' | 'move',
    path: string,
    result: { success: boolean; error?: string }
  ): void {
    this.info(`file.${operation}`, `File ${operation}: ${path}`, {
      operation,
      path,
      ...result
    })
  }
  
  /**
   * 记录 LLM 调用
   */
  logLLMCall(
    provider: string,
    model: string,
    result: { tokens: number; cost: number; duration: number; success: boolean }
  ): void {
    this.info('llm.called', `LLM called: ${provider}/${model}`, {
      provider,
      model,
      ...result
    })
  }
  
  /**
   * 开始一个追踪
   */
  startTrace(traceId?: string): string {
    this.traceId = traceId || this.generateTraceId()
    this.debug('trace.started', 'Trace started', { traceId: this.traceId })
    return this.traceId
  }
  
  /**
   * 结束当前追踪
   */
  endTrace(): void {
    if (this.traceId) {
      this.debug('trace.ended', 'Trace ended', { traceId: this.traceId })
      this.traceId = ''
    }
  }
  
  // ============================================
  // Public API - Query Methods
  // ============================================
  
  /**
   * 获取所有日志
   */
  getLogs(filter?: LogFilter): EnhancedLogEntry[] {
    let result = [...this.logs]
    
    if (filter) {
      if (filter.level) {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
        const minLevel = levels.indexOf(filter.level)
        result = result.filter(l => levels.indexOf(l.level) >= minLevel)
      }
      
      if (filter.event) {
        result = result.filter(l => l.event === filter.event)
      }
      
      if (filter.taskId) {
        result = result.filter(l => l.taskId === filter.taskId)
      }
      
      if (filter.skillName) {
        result = result.filter(l => l.skillName === filter.skillName)
      }
      
      if (filter.source) {
        result = result.filter(l => l.source.includes(filter.source!))
      }
      
      if (filter.startTime) {
        result = result.filter(l => l.timestamp >= filter.startTime!)
      }
      
      if (filter.endTime) {
        result = result.filter(l => l.timestamp <= filter.endTime!)
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        result = result.filter(l => 
          l.message.toLowerCase().includes(searchLower) ||
          l.event.toLowerCase().includes(searchLower) ||
          JSON.stringify(l.data).toLowerCase().includes(searchLower)
        )
      }
    }
    
    return result.sort((a, b) => b.timestamp - a.timestamp)
  }
  
  /**
   * 获取任务时间线
   */
  getTaskTimeline(taskId: string): EnhancedLogEntry[] {
    return this.logs
      .filter(l => l.taskId === taskId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }
  
  /**
   * 获取追踪时间线
   */
  getTraceTimeline(traceId: string): EnhancedLogEntry[] {
    return this.logs
      .filter(l => l.traceId === traceId)
      .sort((a, b) => a.timestamp - b.timestamp)
  }
  
  /**
   * 获取统计信息
   */
  getStats(): LogStats {
    const byLevel: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 }
    const byEvent: Record<string, number> = {}
    const byTask: Record<string, number> = {}
    const byDay: Record<string, number> = {}
    const recentErrors: EnhancedLogEntry[] = []
    
    for (const log of this.logs) {
      // By level
      byLevel[log.level]++
      
      // By event
      byEvent[log.event] = (byEvent[log.event] || 0) + 1
      
      // By task
      if (log.taskId) {
        byTask[log.taskId] = (byTask[log.taskId] || 0) + 1
      }
      
      // By day
      const day = new Date(log.timestamp).toISOString().split('T')[0]
      byDay[day] = (byDay[day] || 0) + 1
      
      // Recent errors
      if (log.level === 'error' && recentErrors.length < 10) {
        recentErrors.push(log)
      }
    }
    
    return {
      total: this.logs.length,
      byLevel: byLevel as Record<LogLevel, number>,
      byEvent,
      byTask,
      byDay,
      recentErrors
    }
  }
  
  /**
   * 导出日志
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'event', 'message', 'taskId', 'skillName', 'duration', 'source']
      const rows = this.logs.map(l => [
        new Date(l.timestamp).toISOString(),
        l.level,
        l.event,
        `"${l.message.replace(/"/g, '""')}"`,
        l.taskId || '',
        l.skillName || '',
        l.duration || '',
        l.source
      ])
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    }
    
    return JSON.stringify(this.logs, null, 2)
  }
  
  /**
   * 监听日志
   */
  on(level: LogLevel, callback: (entry: EnhancedLogEntry) => void): () => void {
    if (!this.listeners.has(level)) {
      this.listeners.set(level, new Set())
    }
    this.listeners.get(level)!.add(callback)
    
    return () => {
      this.listeners.get(level)?.delete(callback)
    }
  }
  
  /**
   * 清除日志
   */
  clear(): void {
    this.logs = []
    this.persistToStorage()
    this.info('logs.cleared', 'Logs cleared', {})
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private log(level: LogLevel, event: string, message: string, data: Record<string, any> = {}): void {
    const entry: EnhancedLogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      event,
      message,
      data,
      sessionId: this.sessionId,
      traceId: this.traceId || this.generateTraceId(),
      taskId: data?.taskId,
      skillName: data?.skillName,
      duration: data?.duration,
      source: this.getCallerInfo(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof location !== 'undefined' ? location.href : undefined
    }
    
    this.logs.push(entry)
    
    // 限制数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
    
    // 持久化
    this.persistToStorage()
    
    // 触发监听器
    this.listeners.get(level)?.forEach(cb => {
      try { cb(entry) } catch (e) {}
    })
    
    // 控制台输出
    this.consoleOutput(entry)
  }
  
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private getCallerInfo(): string {
    try {
      const err = new Error()
      const stack = err.stack?.split('\n')
      if (stack && stack.length > 3) {
        const caller = stack[3]
        const match = caller.match(/at\s+(\w+)\s+\(/)
        if (match) return match[1]
      }
    } catch {}
    return 'Agent'
  }
  
  private consoleOutput(entry: EnhancedLogEntry): void {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #888',
      info: 'color: #1677ff',
      warn: 'color: #faad14',
      error: 'color: #f5222d; font-weight: bold'
    }
    
    const emoji = { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }
    const prefix = `${emoji[entry.level]} [${entry.event}]`
    
    if (entry.taskId) {
      console.log(`%c${prefix} ${entry.message}`, styles[entry.level], {
        taskId: entry.taskId,
        ...entry.data
      })
    } else {
      console.log(`%c${prefix} ${entry.message}`, styles[entry.level], entry.data)
    }
  }
  
  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return
    
    try {
      // 只保存最近 500 条到 localStorage
      localStorage.setItem('metablog_enhanced_logs', JSON.stringify(this.logs.slice(-500)))
    } catch (e) {
      console.error('Failed to persist logs:', e)
    }
  }
  
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return
    
    try {
      const stored = localStorage.getItem('metablog_enhanced_logs')
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load logs:', e)
    }
  }
  
  private scheduleCleanup(): void {
    // 每天清理一次超过 30 天的日志
    const ONE_DAY = 24 * 60 * 60 * 1000
    const THIRTY_DAYS = 30 * ONE_DAY
    
    setInterval(() => {
      const cutoff = Date.now() - THIRTY_DAYS
      const originalCount = this.logs.length
      this.logs = this.logs.filter(l => l.timestamp > cutoff)
      
      if (this.logs.length < originalCount) {
        this.persistToStorage()
        this.debug('logs.cleaned', `Cleaned ${originalCount - this.logs.length} old logs`, {})
      }
    }, ONE_DAY)
  }
}

// 单例导出
let loggerInstance: EnhancedLogger | null = null

export function getEnhancedLogger(): EnhancedLogger {
  if (!loggerInstance) {
    loggerInstance = new EnhancedLogger()
  }
  return loggerInstance
}

export function createEnhancedLogger(maxLogs?: number): EnhancedLogger {
  loggerInstance = new EnhancedLogger(maxLogs)
  return loggerInstance
}
