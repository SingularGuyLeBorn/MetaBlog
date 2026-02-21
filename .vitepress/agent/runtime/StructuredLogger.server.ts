/**
 * StructuredLogger - 服务端 Winston 实现 (完整版)
 * 
 * 新增:
 * - 从文件读取日志功能
 * - 日志查询与筛选
 * - 日志统计分析
 */

import { createLogger, format, transports, Logger as WinstonLogger } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { join } from 'path'
import { promises as fs } from 'fs'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

// 类型定义
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
export type LogActor = 'human' | 'ai' | 'system'
export type FileEventType = 'add' | 'change' | 'unlink' | 'rename'

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
  component: string
  data?: Record<string, any>
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
  search?: string
}

export interface LogStats {
  total: number
  byLevel: Record<string, number>
  byEvent: Record<string, number>
  byActor: Record<LogActor, number>
  byComponent: Record<string, number>
  recentErrors: StructuredLogEntry[]
  avgDurationByComponent: Record<string, number>
  hourlyDistribution: Record<string, number>
}

// 配置
const LOGS_DIR = join(process.cwd(), '.vitepress', 'agent', 'logs')
const MAX_FILES = '7d'
const DATE_PATTERN = 'YYYY-MM-DD'

// 自定义日志级别（添加 success）
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,  // 添加 success 级别
    info: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    success: 'green',  // success 显示绿色
    info: 'blue',
    debug: 'gray'
  }
}

function createWinstonLogger(): WinstonLogger {
  const structuredFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.json({
      replacer: (key: string, value: any) => {
        if (value instanceof Error) {
          return { message: value.message, stack: value.stack, name: value.name }
        }
        return value
      }
    })
  )

  const consoleFormat = format.combine(
    format.timestamp({ format: 'HH:mm:ss' }),
    format.colorize({ all: true, colors: customLevels.colors }),
    format.printf(({ level, message, timestamp, event, requestId, component }: any) => {
      const reqInfo = requestId ? ` [${requestId}]` : ''
      const compInfo = component ? ` (${component})` : ''
      return `[${timestamp}] ${level}:${reqInfo}${compInfo} ${event}: ${message}`
    })
  )

  return createLogger({
    levels: customLevels.levels,  // 使用自定义级别
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    defaultMeta: {
      service: 'metablog-agent',
      environment: process.env.NODE_ENV || 'development'
    },
    transports: [
      ...(process.env.NODE_ENV !== 'production' 
        ? [new transports.Console({ format: consoleFormat })] 
        : []),
      new DailyRotateFile({
        filename: join(LOGS_DIR, 'app-%DATE%.log'),
        datePattern: DATE_PATTERN,
        maxFiles: MAX_FILES,
        format: structuredFormat,
        level: 'debug'
      }),
      new DailyRotateFile({
        filename: join(LOGS_DIR, 'error-%DATE%.log'),
        datePattern: DATE_PATTERN,
        maxFiles: MAX_FILES,
        format: structuredFormat,
        level: 'error'
      })
    ],
    exceptionHandlers: [
      new DailyRotateFile({
        filename: join(LOGS_DIR, 'exceptions-%DATE%.log'),
        datePattern: DATE_PATTERN,
        maxFiles: MAX_FILES
      })
    ],
    rejectionHandlers: [
      new DailyRotateFile({
        filename: join(LOGS_DIR, 'rejections-%DATE%.log'),
        datePattern: DATE_PATTERN,
        maxFiles: MAX_FILES
      })
    ]
  })
}

class ServerLogger {
  private winston: WinstonLogger
  private sessionId: string
  private currentRequestId: string | null = null
  private performanceTimers: Map<string, number> = new Map()

  constructor() {
    this.winston = createWinstonLogger()
    this.sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    this.info('system.startup', 'StructuredLogger initialized', { 
      sessionId: this.sessionId,
      logsDir: LOGS_DIR,
      retention: MAX_FILES
    })
  }

  private log(level: LogLevel, event: string, message: string, data?: Record<string, any>): void {
    const entry = {
      level: level.toLowerCase(),
      message,
      event,
      ...data,
      sessionId: this.sessionId,
      requestId: this.currentRequestId,
      timestamp: new Date().toISOString()
    }
    this.winston.log(level.toLowerCase(), message, entry)
  }

  debug(event: string, message: string, data?: Record<string, any>): void {
    this.log('DEBUG', event, message, data)
  }

  info(event: string, message: string, data?: Record<string, any>): void {
    this.log('INFO', event, message, data)
  }

  warn(event: string, message: string, data?: Record<string, any>): void {
    this.log('WARN', event, message, data)
  }

  error(event: string, message: string, data?: Record<string, any>): void {
    this.log('ERROR', event, message, data)
  }

  success(event: string, message: string, data?: Record<string, any>): void {
    // FIX: 使用 winston 的 success 方法（自定义级别）
    const entry = {
      level: 'SUCCESS',
      event,
      component: 'system',
      actor: 'system' as LogActor,
      ...data,
      sessionId: this.sessionId,
      requestId: this.currentRequestId,
      timestamp: new Date().toISOString()
    }
    // 使用类型断言访问自定义方法
    ;(this.winston as any).success(message, entry)
  }

  startRequest(requestId?: string, actor: LogActor = 'system'): string {
    const reqId = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    this.currentRequestId = reqId
    this.performanceTimers.set(reqId, Date.now())
    this.info('request.started', `Request ${reqId} started`, { requestId: reqId, actor })
    return reqId
  }

  endRequest(requestId?: string, statusCode?: number): void {
    const reqId = requestId || this.currentRequestId
    if (!reqId) return
    
    const startTime = this.performanceTimers.get(reqId)
    const duration = startTime ? Date.now() - startTime : undefined
    this.performanceTimers.delete(reqId)
    
    this.info('request.completed', `Request ${reqId} completed`, { 
      requestId: reqId, 
      statusCode,
      durationMs: duration 
    })
    
    if (this.currentRequestId === reqId) {
      this.currentRequestId = null
    }
  }

  startTimer(label: string): void {
    this.performanceTimers.set(label, Date.now())
  }

  endTimer(label: string, event?: string, message?: string, data?: Record<string, any>): number {
    const startTime = this.performanceTimers.get(label)
    if (!startTime) return 0
    
    const duration = Date.now() - startTime
    this.performanceTimers.delete(label)
    
    if (event) {
      this.info(event, message || `Timer ${label} ended`, { ...data, durationMs: duration })
    }
    return duration
  }

  startLLMChain(taskId: string, model?: string): void {
    this.info('llm.chain.started', `LLM chain started for ${taskId}`, { taskId, model })
  }

  endLLMChain(taskId: string, result?: any): void {
    this.info('llm.chain.completed', `LLM chain completed for ${taskId}`, { taskId, result })
  }

  logFileOperation(operation: string, path: string, result: { success: boolean; error?: string }): void {
    this.info(`file.${operation}`, `File ${operation}: ${path}`, { path, ...result })
  }

  logAPIRequest(method: string, url: string, details: { statusCode: number; durationMs: number; requestHeaders?: Record<string, string> }): void {
    this.info('api.request', `${method} ${url}`, details)
  }

  logFileEvent(eventType: 'add' | 'change' | 'unlink' | 'rename', path: string, metadata?: { size?: number; durationMs?: number }): void {
    this.info(`file.${eventType}`, `File ${eventType}: ${path}`, { path, ...metadata })
  }

  logSkillExecution(skillName: string, taskId: string, params: any, result: { success: boolean; tokensUsed?: number; cost?: number; duration?: number }): void {
    this.info('skill.executed', `Skill ${skillName} executed`, {
      skillName, taskId, params, ...result
    })
  }

  // ============================================
  // 日志查询功能 (新增)
  // ============================================

  /**
   * 获取最近日志
   */
  async getRecentLogs(count: number = 100, level?: LogLevel): Promise<StructuredLogEntry[]> {
    const logs: StructuredLogEntry[] = []
    
    try {
      // 获取最新的日志文件
      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .sort()
        .reverse()
        .slice(0, 3) // 最近3天的日志
      
      for (const file of logFiles) {
        if (logs.length >= count) break
        
        const filePath = join(LOGS_DIR, file)
        const fileLogs = await this.readLogFile(filePath, count - logs.length, level)
        logs.push(...fileLogs)
      }
      
      return logs.slice(0, count)
    } catch (error) {
      this.error('logger.query-failed', 'Failed to get recent logs', { error: String(error) })
      return []
    }
  }

  /**
   * 查询日志 (支持筛选)
   */
  async queryLogs(filter: LogQueryFilter = {}): Promise<StructuredLogEntry[]> {
    const logs: StructuredLogEntry[] = []
    
    try {
      // 确定要读取的文件范围
      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files
        .filter(f => f.startsWith('app-') && f.endsWith('.log'))
        .sort()
      
      // 根据时间筛选优化文件选择
      let targetFiles = logFiles
      if (filter.startTime) {
        const startDate = filter.startTime.toISOString().split('T')[0]
        targetFiles = logFiles.filter(f => {
          const fileDate = f.replace('app-', '').replace('.log', '')
          return fileDate >= startDate
        })
      }
      
      // 读取并筛选日志
      for (const file of targetFiles) {
        const filePath = join(LOGS_DIR, file)
        const fileLogs = await this.readLogFileWithFilter(filePath, filter)
        logs.push(...fileLogs)
      }
      
      // 排序并限制数量
      return logs
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000) // 最多返回1000条
        
    } catch (error) {
      this.error('logger.query-failed', 'Failed to query logs', { error: String(error) })
      return []
    }
  }

  /**
   * 获取日志统计
   */
  async getStats(timeRange?: { start: Date; end: Date }): Promise<LogStats> {
    const logs = await this.queryLogs({
      startTime: timeRange?.start,
      endTime: timeRange?.end
    })
    
    const stats: LogStats = {
      total: logs.length,
      byLevel: {},
      byEvent: {},
      byActor: { human: 0, ai: 0, system: 0 },
      byComponent: {},
      recentErrors: [],
      avgDurationByComponent: {},
      hourlyDistribution: {}
    }
    
    const durationsByComponent: Record<string, number[]> = {}
    
    for (const log of logs) {
      // 按级别统计
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1
      
      // 按事件统计
      stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1
      
      // 按操作者统计
      if (log.actor) {
        stats.byActor[log.actor] = (stats.byActor[log.actor] || 0) + 1
      }
      
      // 按组件统计
      if (log.component) {
        stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1
      }
      
      // 收集错误
      if (log.level === 'ERROR' && stats.recentErrors.length < 10) {
        stats.recentErrors.push(log)
      }
      
      // 计算耗时
      if (log.data?.durationMs && log.component) {
        if (!durationsByComponent[log.component]) {
          durationsByComponent[log.component] = []
        }
        durationsByComponent[log.component].push(log.data.durationMs)
      }
      
      // 按小时分布
      const hour = new Date(log.timestamp).getHours().toString()
      stats.hourlyDistribution[hour] = (stats.hourlyDistribution[hour] || 0) + 1
    }
    
    // 计算平均耗时
    for (const [component, durations] of Object.entries(durationsByComponent)) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      stats.avgDurationByComponent[component] = Math.round(avg)
    }
    
    return stats
  }

  /**
   * 搜索日志
   */
  async searchLogs(query: string, limit: number = 100): Promise<StructuredLogEntry[]> {
    const logs = await this.queryLogs()
    const searchLower = query.toLowerCase()
    
    return logs
      .filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.event.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.data).toLowerCase().includes(searchLower)
      )
      .slice(0, limit)
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  private async readLogFile(
    filePath: string, 
    limit: number, 
    level?: LogLevel
  ): Promise<StructuredLogEntry[]> {
    const logs: StructuredLogEntry[] = []
    
    try {
      const fileStream = createReadStream(filePath)
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      })
      
      for await (const line of rl) {
        if (logs.length >= limit) break
        
        try {
          const entry = JSON.parse(line)
          
          // 级别筛选
          if (level && entry.level?.toUpperCase() !== level) {
            continue
          }
          
          logs.push(this.normalizeLogEntry(entry))
        } catch {
          // 忽略解析失败的行
        }
      }
      
      return logs
    } catch {
      return []
    }
  }

  private async readLogFileWithFilter(
    filePath: string,
    filter: LogQueryFilter
  ): Promise<StructuredLogEntry[]> {
    const logs: StructuredLogEntry[] = []
    
    try {
      const fileStream = createReadStream(filePath)
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
      })
      
      for await (const line of rl) {
        try {
          const entry = JSON.parse(line)
          
          // 应用筛选条件
          if (filter.level && entry.level?.toUpperCase() !== filter.level) continue
          if (filter.event && entry.event !== filter.event) continue
          if (filter.requestId && entry.requestId !== filter.requestId) continue
          if (filter.taskId && entry.taskId !== filter.taskId) continue
          if (filter.component && entry.component !== filter.component) continue
          if (filter.actor && entry.actor !== filter.actor) continue
          
          // 时间筛选
          if (filter.startTime && new Date(entry.timestamp) < filter.startTime) continue
          if (filter.endTime && new Date(entry.timestamp) > filter.endTime) continue
          
          // 文本搜索
          if (filter.search) {
            const searchText = `${entry.message} ${entry.event} ${JSON.stringify(entry)}`.toLowerCase()
            if (!searchText.includes(filter.search.toLowerCase())) continue
          }
          
          logs.push(this.normalizeLogEntry(entry))
        } catch {
          // 忽略解析失败的行
        }
      }
      
      return logs
    } catch {
      return []
    }
  }

  private normalizeLogEntry(entry: any): StructuredLogEntry {
    return {
      id: entry.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      level: (entry.level?.toUpperCase() || 'INFO') as LogLevel,
      event: entry.event || 'unknown',
      message: entry.message || '',
      requestId: entry.requestId,
      sessionId: entry.sessionId || this.sessionId,
      traceId: entry.traceId || `trace_${Date.now()}`,
      taskId: entry.taskId,
      actor: entry.actor || 'system',
      component: entry.component || 'unknown',
      data: entry.data || entry.metadata || {}
    }
  }

  close(): void {
    this.winston.close()
  }
}

let loggerInstance: ServerLogger | null = null

export function getStructuredLogger(): ServerLogger {
  if (!loggerInstance) {
    loggerInstance = new ServerLogger()
  }
  return loggerInstance
}

export function createStructuredLogger(): ServerLogger {
  loggerInstance = new ServerLogger()
  return loggerInstance
}

// 导出类型
export { ServerLogger }
