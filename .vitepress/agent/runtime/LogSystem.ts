/**
 * MetaUniverse Log System v2
 * 完整的系统日志记录服务，支持人类/AI操作区分，持久化存储
 */

import { promises as fs } from 'fs'
import { join } from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'system'
export type LogActor = 'human' | 'ai' | 'system' // 操作者类型

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  event: string
  message: string
  actor: LogActor      // 谁执行的操作：human, ai, system
  actorId?: string     // 具体标识（用户ID/AI模型/系统模块）
  source: string       // 来源组件
  sessionId?: string   // 会话标识
  taskId?: string      // 任务标识
  skillName?: string   // AI技能名称
  duration?: number    // 操作耗时(ms)
  metadata?: Record<string, any>
  data?: any           // 详细数据
}

export interface LogFilter {
  level?: LogLevel
  event?: string
  actor?: LogActor
  actorId?: string
  search?: string
  startTime?: Date
  endTime?: Date
}

export interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byEvent: Record<string, number>
  byActor: Record<LogActor, number>
  recentErrors: LogEntry[]
  humanActivity: number
  aiActivity: number
}

// 日志文件路径
const LOGS_DIR = join(process.cwd(), '.vitepress', 'agent', 'logs')
const LOG_FILE = join(LOGS_DIR, 'system.log')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_MEMORY_LOGS = 2000

// 内存中的日志缓存（最近的日志）
const memoryLogs: LogEntry[] = []

// 系统启动时间
const SYSTEM_START_TIME = new Date().toISOString()

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 获取当前时间戳
function getTimestamp(): string {
  return new Date().toISOString()
}

// 格式化日志为文本行
function formatLogLine(entry: LogEntry): string {
  const actorEmoji = entry.actor === 'human' ? '👤' : 
                     entry.actor === 'ai' ? '🤖' : '⚙️'
  return `[${entry.timestamp}] ${actorEmoji} [${entry.actor.toUpperCase()}] ${entry.level.toUpperCase()} | ${entry.event} | ${entry.message}`
}

// 确保日志目录存在
async function ensureLogDir(): Promise<void> {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true })
  } catch (e) {
    console.error('Failed to create logs directory:', e)
  }
}

// 检查并轮转日志文件
async function rotateLogIfNeeded(): Promise<void> {
  try {
    const stats = await fs.stat(LOG_FILE).catch(() => null)
    if (stats && stats.size > MAX_FILE_SIZE) {
      const backupFile = join(LOGS_DIR, `system-${Date.now()}.log`)
      await fs.rename(LOG_FILE, backupFile)
    }
  } catch (e) {
    // 忽略轮转错误
  }
}

// 追加日志到文件
async function appendToFile(entry: LogEntry): Promise<void> {
  try {
    await ensureLogDir()
    await rotateLogIfNeeded()
    const line = formatLogLine(entry) + '\n'
    await fs.appendFile(LOG_FILE, line, 'utf-8')
  } catch (e) {
    console.error('Failed to write log to file:', e)
  }
}

/**
 * 记录日志（核心方法）
 */
export function log(
  level: LogLevel,
  event: string,
  message: string,
  options: {
    actor?: LogActor
    actorId?: string
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
    actor: options.actor || 'system',
    actorId: options.actorId,
    source: options.source || 'system',
    taskId: options.taskId,
    skillName: options.skillName,
    duration: options.duration,
    metadata: options.metadata,
    data: options.data
  }

  // 添加到内存缓存
  memoryLogs.unshift(entry)
  if (memoryLogs.length > MAX_MEMORY_LOGS) {
    memoryLogs.pop()
  }

  // 异步写入文件
  appendToFile(entry).catch(() => {})

  // 控制台输出（带颜色）
  const colors = {
    debug: '\x1b[36m',    // 青色
    info: '\x1b[34m',     // 蓝色
    warn: '\x1b[33m',     // 黄色
    error: '\x1b[31m',    // 红色
    success: '\x1b[32m',  // 绿色
    system: '\x1b[35m',   // 紫色
    reset: '\x1b[0m'
  }
  
  const actorEmoji = entry.actor === 'human' ? '👤' : 
                     entry.actor === 'ai' ? '🤖' : '⚙️'
  
  const color = colors[level] || colors.reset
  console.log(
    `${color}[${level.toUpperCase()}]${colors.reset} ` +
    `${actorEmoji} [${entry.actor.toUpperCase()}${entry.actorId ? `:${entry.actorId}` : ''}] ` +
    `${event}: ${message}`
  )

  return entry
}

/**
 * 便捷方法 - 按操作者类型
 */
export const human = {
  debug: (event: string, message: string, opts?: any) => 
    log('debug', event, message, { ...opts, actor: 'human' }),
  info: (event: string, message: string, opts?: any) => 
    log('info', event, message, { ...opts, actor: 'human' }),
  warn: (event: string, message: string, opts?: any) => 
    log('warn', event, message, { ...opts, actor: 'human' }),
  error: (event: string, message: string, opts?: any) => 
    log('error', event, message, { ...opts, actor: 'human' }),
  success: (event: string, message: string, opts?: any) => 
    log('success', event, message, { ...opts, actor: 'human' }),
}

export const ai = {
  debug: (event: string, message: string, opts?: any) => 
    log('debug', event, message, { ...opts, actor: 'ai' }),
  info: (event: string, message: string, opts?: any) => 
    log('info', event, message, { ...opts, actor: 'ai' }),
  warn: (event: string, message: string, opts?: any) => 
    log('warn', event, message, { ...opts, actor: 'ai' }),
  error: (event: string, message: string, opts?: any) => 
    log('error', event, message, { ...opts, actor: 'ai' }),
  success: (event: string, message: string, opts?: any) => 
    log('success', event, message, { ...opts, actor: 'ai' }),
}

export const system = {
  debug: (event: string, message: string, opts?: any) => 
    log('debug', event, message, { ...opts, actor: 'system' }),
  info: (event: string, message: string, opts?: any) => 
    log('info', event, message, { ...opts, actor: 'system' }),
  warn: (event: string, message: string, opts?: any) => 
    log('warn', event, message, { ...opts, actor: 'system' }),
  error: (event: string, message: string, opts?: any) => 
    log('error', event, message, { ...opts, actor: 'system' }),
  success: (event: string, message: string, opts?: any) => 
    log('success', event, message, { ...opts, actor: 'system' }),
}

// 向后兼容的logger
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
    if (filter.actor) {
      result = result.filter(log => log.actor === filter.actor)
    }
    if (filter.actorId) {
      result = result.filter(log => log.actorId === filter.actorId)
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
    byLevel: { debug: 0, info: 0, warn: 0, error: 0, success: 0, system: 0 },
    byEvent: {},
    byActor: { human: 0, ai: 0, system: 0 },
    recentErrors: [],
    humanActivity: 0,
    aiActivity: 0
  }

  memoryLogs.forEach(log => {
    // 按级别统计
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1
    
    // 按事件统计
    stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1
    
    // 按操作者统计
    stats.byActor[log.actor] = (stats.byActor[log.actor] || 0) + 1
    
    // 人类/AI活动计数
    if (log.actor === 'human') stats.humanActivity++
    if (log.actor === 'ai') stats.aiActivity++
    
    // 收集最近的错误
    if (log.level === 'error' && stats.recentErrors.length < 10) {
      stats.recentErrors.push(log)
    }
  })

  return stats
}

/**
 * 获取系统运行时间
 */
export function getSystemUptime(): string {
  const start = new Date(SYSTEM_START_TIME)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${hours}h ${minutes}m ${seconds}s`
}

/**
 * 导出日志
 */
export function exportLogs(format: 'json' | 'csv' = 'json'): string {
  if (format === 'csv') {
    const headers = ['timestamp', 'level', 'actor', 'actorId', 'event', 'message', 'source', 'taskId', 'duration']
    const rows = memoryLogs.map(log => [
      log.timestamp,
      log.level,
      log.actor,
      log.actorId || '',
      log.event,
      `"${log.message.replace(/"/g, '""')}"`,
      log.source,
      log.taskId || '',
      log.duration || ''
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

/**
 * 获取唯一操作者ID列表
 */
export function getUniqueActorIds(): string[] {
  const ids = new Set(memoryLogs.filter(log => log.actorId).map(log => log.actorId!))
  return Array.from(ids).sort()
}

/**
 * 记录系统启动
 */
export function recordSystemStartup(): void {
  log('system', 'system.startup', 'MetaUniverse System Started', {
    actor: 'system',
    source: 'LogSystem',
    metadata: { startTime: SYSTEM_START_TIME, version: '2.0.0' }
  })
}

// 获取最近日志（异步版本）
async function getRecent(count: number = 100, level?: LogLevel): Promise<LogEntry[]> {
  let logs = [...memoryLogs]
  if (level) {
    logs = logs.filter(log => log.level === level)
  }
  return logs.slice(0, count)
}

// 异步查询日志
async function queryLogs(filter: LogFilter): Promise<LogEntry[]> {
  return filterLogs(filter)
}

// 清理旧日志
async function cleanup(days: number = 30): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  
  const originalLength = memoryLogs.length
  const filtered = memoryLogs.filter(log => new Date(log.timestamp) >= cutoff)
  
  // 更新内存日志
  memoryLogs.length = 0
  memoryLogs.push(...filtered)
  
  return originalLength - filtered.length
}

// 添加日志（异步包装）
async function addLog(
  level: LogLevel,
  event: string,
  message: string,
  actor: LogActor = 'system',
  metadata?: Record<string, any>
): Promise<void> {
  log(level, event, message, {
    actor,
    metadata,
    source: actor === 'human' ? 'frontend' : actor === 'ai' ? 'ai-service' : 'system'
  })
}

// 单例实例
export const logSystem = {
  log,
  human,
  ai,
  system,
  logger,
  add: addLog,
  getLogs,
  getRecent,
  query: queryLogs,
  getStats,
  getSystemUptime,
  exportLogs,
  clearLogs,
  cleanup,
  getUniqueEvents,
  getUniqueActorIds,
  recordSystemStartup,
  SYSTEM_START_TIME
}

export default logSystem
