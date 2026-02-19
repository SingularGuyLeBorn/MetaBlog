/**
 * Frontend Logger Composable
 * 在组件中方便地记录系统日志，支持人类/AI/System标识
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'system'
export type LogActor = 'human' | 'ai' | 'system'

export interface LogOptions {
  actor?: LogActor
  actorId?: string
  source?: string
  taskId?: string
  skillName?: string
  duration?: number
  metadata?: Record<string, any>
}

/**
 * 发送日志到服务器
 */
async function sendLog(
  level: LogLevel,
  event: string,
  message: string,
  options: LogOptions = {}
): Promise<void> {
  try {
    await fetch('/api/logs/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        event,
        message,
        actor: options.actor || 'human',
        actorId: options.actorId,
        source: options.source || 'client',
        taskId: options.taskId,
        skillName: options.skillName,
        duration: options.duration,
        metadata: options.metadata,
        timestamp: new Date().toISOString()
      })
    })
  } catch (e) {
    console.error('Failed to send log:', e)
  }
}

/**
 * useLogger composable - 在Vue组件中使用
 */
export function useLogger(actor: LogActor = 'human') {
  return {
    log: (level: LogLevel, event: string, message: string, metadata?: any) =>
      sendLog(level, event, message, { actor, metadata }),
    logInfo: (event: string, message: string, metadata?: any) =>
      sendLog('info', event, message, { actor, metadata }),
    logError: (event: string, message: string, metadata?: any) =>
      sendLog('error', event, message, { actor, metadata }),
    logWarn: (event: string, message: string, metadata?: any) =>
      sendLog('warn', event, message, { actor, metadata }),
    logSuccess: (event: string, message: string, metadata?: any) =>
      sendLog('success', event, message, { actor, metadata }),
    logDebug: (event: string, message: string, metadata?: any) =>
      sendLog('debug', event, message, { actor, metadata })
  }
}

/**
 * 通用日志方法
 */
export function log(
  level: LogLevel,
  event: string,
  message: string,
  options?: LogOptions
) {
  return sendLog(level, event, message, options)
}

/**
 * 人类操作日志
 */
export const human = {
  debug: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('debug', event, message, { ...opts, actor: 'human' }),
  info: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('info', event, message, { ...opts, actor: 'human' }),
  warn: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('warn', event, message, { ...opts, actor: 'human' }),
  error: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('error', event, message, { ...opts, actor: 'human' }),
  success: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('success', event, message, { ...opts, actor: 'human' }),
}

/**
 * AI操作日志
 */
export const ai = {
  debug: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('debug', event, message, { ...opts, actor: 'ai' }),
  info: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('info', event, message, { ...opts, actor: 'ai' }),
  warn: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('warn', event, message, { ...opts, actor: 'ai' }),
  error: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('error', event, message, { ...opts, actor: 'ai' }),
  success: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('success', event, message, { ...opts, actor: 'ai' }),
}

/**
 * 系统日志
 */
export const system = {
  debug: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('debug', event, message, { ...opts, actor: 'system' }),
  info: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('info', event, message, { ...opts, actor: 'system' }),
  warn: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('warn', event, message, { ...opts, actor: 'system' }),
  error: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('error', event, message, { ...opts, actor: 'system' }),
  success: (event: string, message: string, opts?: Omit<LogOptions, 'actor'>) =>
    sendLog('success', event, message, { ...opts, actor: 'system' }),
}

/**
 * 从服务器获取日志
 */
export async function fetchLogs(count: number = 100, level?: LogLevel): Promise<any[]> {
  try {
    const url = `/api/logs/recent?count=${count}${level ? `&level=${level}` : ''}`
    const response = await fetch(url)
    const result = await response.json()
    if (result.success) {
      return result.data
    }
    return []
  } catch (e) {
    console.error('Failed to fetch logs:', e)
    return []
  }
}

/**
 * 获取日志统计
 */
export async function fetchLogStats(): Promise<any> {
  try {
    const response = await fetch('/api/logs/stats')
    const result = await response.json()
    if (result.success) {
      return result.data
    }
    return null
  } catch (e) {
    console.error('Failed to fetch log stats:', e)
    return null
  }
}

/**
 * Logger对象（向后兼容）
 */
export const logger = {
  debug: (event: string, message: string, opts?: LogOptions) =>
    sendLog('debug', event, message, opts),
  info: (event: string, message: string, opts?: LogOptions) =>
    sendLog('info', event, message, opts),
  warn: (event: string, message: string, opts?: LogOptions) =>
    sendLog('warn', event, message, opts),
  error: (event: string, message: string, opts?: LogOptions) =>
    sendLog('error', event, message, opts),
  success: (event: string, message: string, opts?: LogOptions) =>
    sendLog('success', event, message, opts),
  getLogs: fetchLogs,
  getStats: fetchLogStats
}

/**
 * 记录文件操作
 */
export function logFileOperation(
  operation: 'create' | 'rename' | 'move' | 'copy' | 'delete',
  filePath: string,
  details?: { oldPath?: string; newName?: string; actor?: LogActor }
): void {
  const messages: Record<string, string> = {
    create: `创建文件: ${filePath}`,
    rename: `重命名文件: ${details?.oldPath} -> ${filePath}`,
    move: `移动文件: ${details?.oldPath} -> ${filePath}`,
    copy: `复制文件: ${details?.oldPath} -> ${filePath}`,
    delete: `删除文件: ${filePath}`
  }
  
  const actor = details?.actor || 'human'
  
  sendLog('success', `file.${operation}`, messages[operation], {
    actor,
    source: 'file-manager',
    metadata: { filePath, ...details }
  })
}

/**
 * 记录Agent/AI操作
 */
export function logAgentOperation(
  operation: string,
  message: string,
  metadata?: Record<string, any>,
  actorId?: string
): void {
  ai.info(`agent.${operation}`, message, {
    source: 'agent',
    actorId,
    metadata
  })
}

/**
 * 记录用户界面操作
 */
export function logUserAction(
  action: string,
  target?: string,
  metadata?: Record<string, any>
): void {
  human.info(`ui.${action}`, target || action, {
    source: 'ui',
    metadata
  })
}

/**
 * 记录错误
 */
export function logError(
  context: string,
  error: Error | string,
  metadata?: Record<string, any>,
  actor: LogActor = 'human'
): void {
  const message = error instanceof Error ? error.message : error
  sendLog('error', `error.${context}`, message, {
    actor,
    source: 'error-handler',
    metadata: { error: message, ...metadata }
  })
}

// 默认导出
export default {
  log,
  human,
  ai,
  system,
  logger,
  logFileOperation,
  logAgentOperation,
  logUserAction,
  logError
}
