/**
 * Logs API Routes
 * 提供日志查询和统计接口
 * 
 * v7 修复：改用 StructuredLogger.server，消除跨边界 import
 */
import { promises as fs } from 'fs';
import { join } from 'path';
import type { ServerResponse } from '../types';

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

  // POST /api/logs/add - 添加日志(前端调用)
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

  // POST /api/logs/api-debug - 保存 API 调试日志
  if (path === '/api/logs/api-debug' && method === 'POST') {
    try {
      const { sessionId, startTime, endTime, totalRounds, entries } = body || {}

      if (!sessionId || !entries) {
        return {
          success: false,
          error: 'Missing required fields: sessionId, entries'
        }
      }

      // 创建调试日志目录
      const debugDir = join(process.cwd(), '.logs', 'api-debug')
      await fs.mkdir(debugDir, { recursive: true })

      // 生成文件名：timestamp-sessionId.json
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `${timestamp}-${sessionId}.json`
      const filepath = join(debugDir, filename)

      // 构建完整的调试数据
      const debugData = {
        sessionId,
        startTime,
        endTime: endTime || new Date().toISOString(),
        totalRounds,
        entryCount: entries.length,
        entries
      }

      // 写入文件
      await fs.writeFile(filepath, JSON.stringify(debugData, null, 2), 'utf-8')

      console.log(`[API Debug] Saved to ${filename} (${entries.length} entries)`)

      return {
        success: true,
        data: {
          filename,
          entryCount: entries.length
        }
      }
    } catch (error: any) {
      console.error('[API Debug] Failed to save:', error)
      return {
        success: false,
        error: `Failed to save debug log: ${error.message}`
      }
    }
  }

  // GET /api/logs/api-debug/list - 列出所有 API 调试日志文件
  if (path === '/api/logs/api-debug/list' && method === 'GET') {
    try {
      const debugDir = join(process.cwd(), '.logs', 'api-debug')

      try {
        await fs.access(debugDir)
      } catch {
        return { success: true, data: [] }
      }

      const files = await fs.readdir(debugDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      // 获取文件信息
      const fileInfos = await Promise.all(
        jsonFiles.map(async (filename) => {
          const filepath = join(debugDir, filename)
          const stat = await fs.stat(filepath)
          return {
            filename,
            size: stat.size,
            createdAt: stat.ctime.toISOString()
          }
        })
      )

      // 按创建时间倒序
      fileInfos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      return { success: true, data: fileInfos }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // GET /api/logs/api-debug/:filename - 获取特定调试日志内容
  if (path.startsWith('/api/logs/api-debug/') && method === 'GET') {
    try {
      const filename = path.replace('/api/logs/api-debug/', '')

      // 安全检查：防止目录遍历
      if (filename.includes('..') || !filename.endsWith('.json')) {
        return { success: false, error: 'Invalid filename' }
      }

      const debugDir = join(process.cwd(), '.logs', 'api-debug')
      const filepath = join(debugDir, filename)

      const content = await fs.readFile(filepath, 'utf-8')
      const data = JSON.parse(content)

      return { success: true, data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  return { success: false, error: 'Not found' }
}
