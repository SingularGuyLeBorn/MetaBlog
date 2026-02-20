/**
 * Logger - 结构化日志系统
 * 记录 Agent 的所有操作和决策过程
 */
import type { Logger as ILogger, LogEntry, LogLevel } from '../core/types'

export class LoggerImpl implements ILogger {
  private logs: LogEntry[] = []
  private maxLogs: number = 1000
  private listeners: Map<LogLevel, Set<(entry: LogEntry) => void>> = new Map()

  constructor(maxLogs: number = 1000) {
    this.maxLogs = maxLogs
    this.loadFromStorage()
  }

  debug(message: string, metadata?: any): void {
    this.log('DEBUG', message, metadata)
  }

  info(message: string, metadata?: any): void {
    this.log('INFO', message, metadata)
  }

  warn(message: string, metadata?: any): void {
    this.log('WARN', message, metadata)
  }

  error(message: string, metadata?: any): void {
    this.log('ERROR', message, metadata)
  }

  private log(level: LogLevel, message: string, metadata?: any): void {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      source: this.getCallerInfo(),
      message,
      metadata,
      taskId: metadata?.taskId
    }

    this.logs.push(entry)

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 持久化
    this.persistToStorage()

    // 触发监听器
    this.listeners.get(level)?.forEach(cb => {
      try {
        cb(entry)
      } catch (e) {
        console.error('Log listener error:', e)
      }
    })

    // 控制台输出
    this.consoleOutput(entry)
  }

  getLogs(level?: LogLevel, taskId?: string): LogEntry[] {
    let filtered = this.logs

    if (level) {
      const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR']
      const minLevel = levels.indexOf(level)
      filtered = filtered.filter(l => levels.indexOf(l.level) >= minLevel)
    }

    if (taskId) {
      filtered = filtered.filter(l => l.taskId === taskId)
    }

    return filtered
  }

  /**
   * 监听特定级别的日志
   */
  on(level: LogLevel, callback: (entry: LogEntry) => void): () => void {
    if (!this.listeners.has(level)) {
      this.listeners.set(level, new Set())
    }
    this.listeners.get(level)!.add(callback)

    return () => {
      this.listeners.get(level)?.delete(callback)
    }
  }

  /**
   * 获取格式化的日志（用于显示）
   */
  formatLogEntry(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toLocaleTimeString()
    const levelEmoji: Record<LogLevel, string> = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
      SUCCESS: '✅'
    }

    return `[${time}] ${levelEmoji[entry.level]} [${entry.source}] ${entry.message}`
  }

  /**
   * 导出日志为 JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * 清除日志
   */
  clear(): void {
    this.logs = []
    this.persistToStorage()
  }

  /**
   * 获取任务执行的时间线
   */
  getTaskTimeline(taskId: string): LogEntry[] {
    return this.logs
      .filter(l => l.taskId === taskId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number
    byLevel: Record<LogLevel, number>
    byTask: Record<string, number>
  } {
    const byLevel: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 }
    const byTask: Record<string, number> = {}

    for (const log of this.logs) {
      byLevel[log.level]++
      if (log.taskId) {
        byTask[log.taskId] = (byTask[log.taskId] || 0) + 1
      }
    }

    return {
      total: this.logs.length,
      byLevel: byLevel as Record<LogLevel, number>,
      byTask
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private getCallerInfo(): string {
    // 简化版本，返回 'Agent'
    // 实际可以使用 Error().stack 解析调用栈
    return 'Agent'
  }

  private consoleOutput(entry: LogEntry): void {
    const styles: Record<LogLevel, string> = {
      DEBUG: 'color: #888',
      INFO: 'color: #1677ff',
      WARN: 'color: #faad14',
      ERROR: 'color: #f5222d; font-weight: bold',
      SUCCESS: 'color: #52c41a; font-weight: bold'
    }

    const prefix = `[Agent] ${entry.level.toUpperCase()}`
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      console.log(`%c${prefix}: ${entry.message}`, styles[entry.level], entry.metadata)
    } else {
      console.log(`%c${prefix}: ${entry.message}`, styles[entry.level])
    }
  }

  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      localStorage.setItem('metablog_agent_logs', JSON.stringify(this.logs.slice(-100)))
    } catch (e) {
      // 忽略存储错误
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem('metablog_agent_logs')
      if (stored) {
        this.logs = JSON.parse(stored)
      }
    } catch (e) {
      console.error('Failed to load logs:', e)
    }
  }
}
