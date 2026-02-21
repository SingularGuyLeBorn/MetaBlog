/**
 * Logger Service - 结构化日志服务
 * 
 * 特性：
 * 1. 开发模式下输出详细日志
 * 2. 生产模式下仅保留错误日志
 * 3. 统一的日志格式（时间戳、模块名、级别）
 * 4. 支持结构化数据输出
 */

import type { LogLevel, LogEntry } from '../components/ai-chat/composables/types'

// 是否是开发模式
const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV !== 'production'
  : import.meta.env?.DEV !== false

// 日志级别优先级
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

// 当前日志级别（生产环境只显示 warn 及以上）
const CURRENT_LEVEL: LogLevel = isDev ? 'debug' : 'warn'

/**
 * 创建日志条目
 */
function createEntry(
  level: LogLevel,
  module: string,
  message: string,
  data?: any
): LogEntry {
  return {
    level,
    module,
    message,
    data,
    timestamp: Date.now()
  }
}

/**
 * 格式化日志输出
 */
function formatLog(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return `[${time}] [${entry.module}] ${entry.message}`
}

/**
 * 检查是否应该记录该级别日志
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CURRENT_LEVEL]
}

/**
 * 日志服务
 */
export const logger = {
  /**
   * Debug 日志 - 详细的调试信息
   */
  debug(module: string, message: string, data?: any) {
    if (!shouldLog('debug')) return
    const entry = createEntry('debug', module, message, data)
    console.log(`%c${formatLog(entry)}`, 'color: #6b7280', data || '')
  },

  /**
   * Info 日志 - 一般信息
   */
  info(module: string, message: string, data?: any) {
    if (!shouldLog('info')) return
    const entry = createEntry('info', module, message, data)
    console.log(`%c${formatLog(entry)}`, 'color: #3b82f6', data || '')
  },

  /**
   * Warn 日志 - 警告信息
   */
  warn(module: string, message: string, data?: any) {
    if (!shouldLog('warn')) return
    const entry = createEntry('warn', module, message, data)
    console.warn(`%c${formatLog(entry)}`, 'color: #f59e0b', data || '')
  },

  /**
   * Error 日志 - 错误信息
   */
  error(module: string, message: string, error?: any) {
    if (!shouldLog('error')) return
    const entry = createEntry('error', module, message, error)
    console.error(`%c${formatLog(entry)}`, 'color: #ef4444; font-weight: bold', '')
    if (error) {
      console.error(error)
    }
  },

  /**
   * API 请求日志
   */
  apiRequest(method: string, url: string, body?: any) {
    this.info('api:request', `${method} ${url}`, {
      method,
      url,
      body: body ? JSON.stringify(body).slice(0, 500) : undefined
    })
  },

  /**
   * API 响应日志
   */
  apiResponse(method: string, url: string, status: number, duration: number) {
    const level = status >= 400 ? 'error' : 'info'
    this[level]('api:response', `${method} ${url} - ${status} (${duration}ms)`, {
      status,
      duration
    })
  },

  /**
   * 流式数据日志
   */
  streamChunk(content: string, isReasoning: boolean) {
    this.debug('stream:chunk', `Received ${isReasoning ? 'reasoning' : 'content'}: ${content.slice(0, 50)}...`, {
      length: content.length,
      isReasoning
    })
  },

  /**
   * Session 操作日志
   */
  session(action: string, sessionId: string, data?: any) {
    this.info('session', `${action}: ${sessionId.slice(0, 8)}...`, data)
  },

  /**
   * 消息操作日志
   */
  message(action: string, messageId: string, data?: any) {
    this.info('message', `${action}: ${messageId.slice(0, 8)}...`, data)
  }
}

// 默认导出
export default logger
