/**
 * Logs API Routes
 * 提供日志查询和统计接口
 * 
 * v6 修复：使用 LogSystemAdapter 替代已删除的 LogSystem
 */
import type { ServerResponse } from '../types'
import { logSystem } from '../../agent/runtime/LogSystemAdapter'
import type { LogFilter } from '../../agent/runtime/LogSystemAdapter'

export async function handleLogsAPI(url: URL, method: string, body?: any): Promise<ServerResponse> {
  const path = url.pathname
  
  // GET /api/logs/recent - 获取最近日志
  if (path === '/api/logs/recent' && method === 'GET') {
    const count = parseInt(url.searchParams.get('count') || '100')
    const level = url.searchParams.get('level') as any
    
    const logs = await logSystem.getRecent(count, level)
    return { 
      success: true, 
      data: logs,
      meta: { count: logs.length }
    }
  }
  
  // GET /api/logs/stats - 获取日志统计
  if (path === '/api/logs/stats' && method === 'GET') {
    const stats = await logSystem.getStats()
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
    
    await logSystem.add(
      level || 'info',
      event,
      message,
      actor || 'human',
      metadata
    )
    
    return { success: true }
  }
  
  // POST /api/logs/query - 查询日志
  if (path === '/api/logs/query' && method === 'POST') {
    const filter: LogFilter = body?.filter || {}
    const logs = await logSystem.query(filter)
    return { 
      success: true, 
      data: logs,
      meta: { count: logs.length }
    }
  }
  
  // POST /api/logs/cleanup - 清理旧日志
  if (path === '/api/logs/cleanup' && method === 'POST') {
    const days = body?.days || 30
    const deleted = await logSystem.cleanup(days)
    return { 
      success: true, 
      data: { deleted },
      message: `Cleaned up ${deleted} old log entries`
    }
  }
  
  // GET /api/logs/export - 导出日志
  if (path === '/api/logs/export' && method === 'GET') {
    const format = url.searchParams.get('format') || 'json'
    const logs = await logSystem.getRecent(10000) // 最多导出10000条
    
    if (format === 'json') {
      return {
        success: true,
        data: logs,
        meta: { format: 'json', count: logs.length }
      }
    }
    
    if (format === 'text') {
      const text = logs.map(log => {
        const actorEmoji = log.actor === 'human' ? '👤' : 
                          log.actor === 'ai' ? '🤖' : '⚙️'
        return `[${log.timestamp}] ${actorEmoji} [${log.actor}] ${log.level.toUpperCase()} | ${log.event} | ${log.message}`
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
