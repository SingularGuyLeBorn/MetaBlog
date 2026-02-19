/**
 * Logger Composable
 * 在组件中方便地记录系统日志
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'

export interface LogOptions {
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
        source: options.source || 'client',
        taskId: options.taskId,
        skillName: options.skillName,
        duration: options.duration,
        metadata: options.metadata
      })
    })
  } catch (e) {
    console.error('Failed to send log:', e)
  }
}

/**
 * Logger 对象
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
}

/**
 * 记录文件操作
 */
export function logFileOperation(
  operation: 'create' | 'rename' | 'move' | 'copy' | 'delete',
  filePath: string,
  details?: { oldPath?: string; newName?: string }
): void {
  const messages: Record<string, string> = {
    create: `创建文件: ${filePath}`,
    rename: `重命名文件: ${details?.oldPath} -> ${filePath}`,
    move: `移动文件: ${details?.oldPath} -> ${filePath}`,
    copy: `复制文件: ${details?.oldPath} -> ${filePath}`,
    delete: `删除文件: ${filePath}`
  }
  
  logger.success(`file.${operation}`, messages[operation], {
    source: 'file-manager',
    metadata: { filePath, ...details }
  })
}

/**
 * 记录Agent操作
 */
export function logAgentOperation(
  operation: string,
  message: string,
  metadata?: Record<string, any>
): void {
  logger.info(`agent.${operation}`, message, {
    source: 'agent',
    metadata
  })
}

/**
 * 记录错误
 */
export function logError(
  context: string,
  error: Error | string,
  metadata?: Record<string, any>
): void {
  const message = error instanceof Error ? error.message : error
  logger.error(`error.${context}`, message, {
    source: 'error-handler',
    metadata: { error: message, ...metadata }
  })
}

export default logger
