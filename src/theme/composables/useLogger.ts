import { ref } from 'vue'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  message: string
  context?: Record<string, any>
}

const logs = ref<LogEntry[]>([])
const maxLogs = 1000

export function useLogger() {
  const addLog = (level: LogLevel, message: string, context?: Record<string, any>) => {
    const entry: LogEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: Date.now(),
      level,
      message,
      context
    }
    
    logs.value.push(entry)
    
    // 限制日志数量
    if (logs.value.length > maxLogs) {
      logs.value.shift()
    }
    
    // 控制台输出
    const consoleMethod = level === 'error' ? console.error : 
                          level === 'warn' ? console.warn : 
                          level === 'debug' ? console.debug : console.log
    consoleMethod(`[${level.toUpperCase()}] ${message}`, context || '')
  }

  return {
    logs,
    debug: (message: string, context?: Record<string, any>) => addLog('debug', message, context),
    info: (message: string, context?: Record<string, any>) => addLog('info', message, context),
    warn: (message: string, context?: Record<string, any>) => addLog('warn', message, context),
    error: (message: string, context?: Record<string, any>) => addLog('error', message, context),
    clear: () => { logs.value = [] }
  }
}

// 默认 logger 实例
export const logger = useLogger()

// 文件操作日志
export function logFileOperation(
  operation: 'create' | 'rename' | 'delete' | 'move' | 'copy',
  path: string,
  metadata?: Record<string, any>
) {
  logger.info(`File ${operation}: ${path}`, {
    operation,
    path,
    ...metadata
  })
}

export default useLogger
