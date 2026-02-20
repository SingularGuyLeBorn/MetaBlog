/**
 * StructuredLogger - 服务端 Winston 实现
 * 
 * 该文件仅在服务端 (Node.js) 环境使用
 * 浏览器端请使用 StructuredLogger.ts（空实现）
 */

import { createLogger, format, transports, Logger as WinstonLogger } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { join } from 'path'

// 类型定义（复制以保持独立）
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

// 配置
const LOGS_DIR = join(process.cwd(), '.vitepress', 'agent', 'logs')
const MAX_FILES = '7d'
const DATE_PATTERN = 'YYYY-MM-DD'

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
    format.colorize(),
    format.printf(({ level, message, timestamp, event, requestId, component }: any) => {
      const reqInfo = requestId ? ` [${requestId}]` : ''
      const compInfo = component ? ` (${component})` : ''
      return `[${timestamp}] ${level}:${reqInfo}${compInfo} ${event}: ${message}`
    })
  )

  return createLogger({
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
    this.sessionId = `sess_${Date.now()}`
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
    this.log('SUCCESS', event, message, data)
  }

  startRequest(requestId?: string, actor: LogActor = 'system'): string {
    const reqId = requestId || `req_${Date.now()}`
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

  getRecentLogs(count: number = 100): StructuredLogEntry[] {
    // 从文件读取最近日志的逻辑
    return []
  }

  queryLogs(filter?: LogQueryFilter): StructuredLogEntry[] {
    // 查询日志的逻辑
    return []
  }

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
