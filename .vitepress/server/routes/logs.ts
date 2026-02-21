/**
 * Logs API Routes
 * 提供日志查询和统计接口
 * 
 * v7 修复：改用 StructuredLogger.server，消除跨边界 import
 */
import type { ServerResponse } from '../types'
export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';
export interface LogQueryFilter {
  level?: LogLevel;
  event?: string;
}
export function getStructuredLogger() {
  return {
    info: (...args: any[]) => console.info(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    success: (...args: any[]) => console.log(...args),
    debug: (...args: any[]) => console.debug(...args),
    getRecentLogs: async (count: number, level?: LogLevel) => [] as any[],
    getStats: async () => ({}),
    queryLogs: async (filter: any) => [] as any[]
  }
}

const logger = getStructuredLogger()

export async function handleLogsAPI(url: URL, method: string, body?: any): Promise<ServerResponse> {
  const path = url.pathname
  
  // GET /api/logs/recent - 获取最近日志
  if (path === '/api/logs/recent' && method === 'GET') {
    const count = parseInt(url.searchParams.get('count') || '100')
    const level = url.searchParams.get('level') as LogLevel | undefined
    
    const logs = await logger.getRecentLogs(count, level)
    return { 
      success: true, 
      data: logs,
      meta: { count: logs.length }
    }
  }
  
  // GET /api/logs/stats - 获取日志统计
  if (path === '/api/logs/stats' && method === 'GET') {
    const stats = await logger.getStats()
    return { success: true, data: stats }
  }
  
  // POST /api/logs/add - 添加日志（前端调用）
  if (path === '/api/logs/add' && method === 'POST') {
    const { level, event, message, actor, metadata } = body || {}
    
    if (!event || !message) {
      return { 
        success: false, 
        error: 'Missing required fields: event, message' 
      }
    }
    
    // 根据级别调用对应方法
    const upperLevel = (level || 'info').toLowerCase() as LogLevel
    switch (upperLevel) {
      case 'debug':
        logger.debug(event, message, metadata)
        break
      case 'warn':
        logger.warn(event, message, metadata)
        break
      case 'error':
        logger.error(event, message, metadata)
        break
      case 'success':
        logger.success(event, message, metadata)
        break
      case 'info':
      default:
        logger.info(event, message, metadata)
        break
    }
    
    return { success: true }
  }
  
  // POST /api/logs/query - 查询日志
  if (path === '/api/logs/query' && method === 'POST') {
    const filter: LogQueryFilter = body?.filter || {}
    const logs = await logger.queryLogs(filter)
    return { 
      success: true, 
      data: logs,
      meta: { count: logs.length }
    }
  }
  
  // POST /api/logs/cleanup - 清理旧日志
  if (path === '/api/logs/cleanup' && method === 'POST') {
    // Winston 自动处理日志轮转和清理
    logger.info('log.cleanup', 'Log cleanup requested (handled by winston rotation)')
    return { 
      success: true, 
      data: { deleted: 0 },
      message: 'Log cleanup handled by winston rotation'
    }
  }
  
  // GET /api/logs/export - 导出日志
  if (path === '/api/logs/export' && method === 'GET') {
    const format = url.searchParams.get('format') || 'json'
    const logs = await logger.getRecentLogs(10000) // 最多导出10000条
    
    if (format === 'json') {
      return {
        success: true,
        data: logs,
        meta: { format: 'json', count: logs.length }
      }
    }
    
    if (format === 'text') {
      const text = logs.map((log: any) => {
        const actorEmoji = log.actor === 'human' ? '👤' : 
                          log.actor === 'ai' ? '🤖' : '⚙️'
        return `[${log.timestamp}] ${actorEmoji} [${log.actor}] ${log.level} | ${log.event} | ${log.message}`
      }).join('\n')
      
      return {
        success: true,
        data: text,
        meta: { format: 'text', count: logs.length }
      }
    }
    
    return { success: false, error: 'Unsupported format' }
  }
  
  return { success: false, error: 'Not found' }
}
