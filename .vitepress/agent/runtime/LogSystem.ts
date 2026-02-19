/**
 * MetaUniverse Log System
 * 统一的系统日志记录服务，追踪所有操作和事件
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  event: string
  message: string
  source: string
  sessionId?: string
  taskId?: string
  skillName?: string
  duration?: number
  metadata?: Record<string, any>
  data?: any
}

export interface LogFilter {
  level?: LogLevel
  event?: string
  search?: string
  startTime?: Date
  endTime?: Date
}

export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byEvent: Record<string, number>
  recentErrors: LogEntry[]
}

// 内存中的日志存储
const memoryLogs: LogEntry[] = []
const MAX_MEMORY_LOGS = 1000

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 获取当前时间戳
function getTimestamp(): string {
  return new Date().toISOString()
}

/**
 * 记录日志
 */
export function log(
  level: LogLevel,
  event: string,
  message: string,
  options: {
    source?: string
    taskId?: string
    skillName?: string
    duration?: number
    metadata?: Record<string, any>
    data?: any
  } = {}
): LogEntry {
  const entry: LogEntry = {
    id: generateId(),
    timestamp: getTimestamp(),
    level,
    event,
    message,
    source: options.source || 'system',
    taskId: options.taskId,
    skillName: options.skillName,
    duration: options.duration,
    metadata: options.metadata,
    data: options.data
  }

  // 添加到内存
  memoryLogs.unshift(entry)
  
  // 限制内存大小
  if (memoryLogs.length > MAX_MEMORY_LOGS) {
    memoryLogs.pop()
  }

  // 控制台输出
  const consoleMethod = level === 'error' ? console.error :
                        level === 'warn' ? console.warn :
                        level === 'success' ? console.log :
                        level === 'debug' ? console.debug : console.log
  
  consoleMethod(`[${level.toUpperCase()}] ${event}: ${message}`, options)

  return entry
}

/**
 * 便捷方法
 */
export const logger = {
  debug: (event: string, message: string, opts?: any) => log('debug', event, message, opts),
  info: (event: string, message: string, opts?: any) => log('info', event, message, opts),
  warn: (event: string, message: string, opts?: any) => log('warn', event, message, opts),
  error: (event: string, message: string, opts?: any) => log('error', event, message, opts),
  success: (event: string, message: string, opts?: any) => log('success', event, message, opts),
}

/**
 * 获取日志列表
 */
export function getLogs(filter?: LogFilter): LogEntry[] {
  let result = [...memoryLogs]

  if (filter) {
    if (filter.level) {
      result = result.filter(log => log.level === filter.level)
    }
    if (filter.event) {
      result = result.filter(log => log.event === filter.event)
    }
    if (filter.search) {
      const search = filter.search.toLowerCase()
      result = result.filter(log => 
        log.message.toLowerCase().includes(search) ||
        log.event.toLowerCase().includes(search) ||
        log.source.toLowerCase().includes(search)
      )
    }
    if (filter.startTime) {
      result = result.filter(log => new Date(log.timestamp) >= filter.startTime!)
    }
    if (filter.endTime) {
      result = result.filter(log => new Date(log.timestamp) <= filter.endTime!)
    }
  }

  return result
}

/**
 * 获取统计信息
 */
export function getStats(): LogStats {
  const stats: LogStats = {
    total: memoryLogs.length,
    byLevel: { debug: 0, info: 0, warn: 0, error: 0, success: 0 },
    byEvent: {},
    recentErrors: []
  }

  memoryLogs.forEach(log => {
    // 按级别统计
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1
    
    // 按事件统计
    stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1
    
    // 收集最近的错误
    if (log.level === 'error' && stats.recentErrors.length < 10) {
      stats.recentErrors.push(log)
    }
  })

  return stats
}

/**
 * 导出日志
 */
export function exportLogs(format: 'json' | 'csv' = 'json'): string {
  if (format === 'csv') {
    const headers = ['timestamp', 'level', 'event', 'message', 'source', 'taskId']
    const rows = memoryLogs.map(log => [
      log.timestamp,
      log.level,
      log.event,
      `"${log.message.replace(/"/g, '""')}"`,
      log.source,
      log.taskId || ''
    ])
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }
  
  return JSON.stringify(memoryLogs, null, 2)
}

/**
 * 清空日志
 */
export function clearLogs(): void {
  memoryLogs.length = 0
}

/**
 * 获取唯一事件列表
 */
export function getUniqueEvents(): string[] {
  const events = new Set(memoryLogs.map(log => log.event))
  return Array.from(events).sort()
}

// 单例实例
export const logSystem = {
  log,
  logger,
  getLogs,
  getStats,
  exportLogs,
  clearLogs,
  getUniqueEvents
}

export default logSystem
