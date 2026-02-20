/**
 * LogSystem Adapter - 兼容旧版 LogSystem API
 * 将旧的 LogSystem 调用适配到新的 StructuredLogger.server
 * 
 * 这是 v6 修复：解决 config.ts 和 server/routes/logs.ts 中的 LogSystem 引用问题
 */

import { getStructuredLogger, type LogLevel, type LogActor, type LogQueryFilter } from './StructuredLogger.server'

export interface LogEntry {
  id: string
  timestamp: string
  level: string
  event: string
  message: string
  actor: string
  metadata?: Record<string, any>
}

export interface LogStats {
  total: number
  byLevel: Record<string, number>
  byEvent: Record<string, number>
  byActor: Record<string, number>
  recentErrors: LogEntry[]
}

export interface LogFilter {
  level?: string
  event?: string
  actor?: string
  startTime?: Date
  endTime?: Date
  search?: string
}

/**
 * 兼容旧版 LogSystem 的适配器
 */
class LogSystemAdapter {
  private logger = getStructuredLogger()

  /**
   * 添加日志 (兼容旧 API)
   */
  async add(
    level: string,
    event: string,
    message: string,
    actor: string = 'system',
    metadata?: Record<string, any>
  ): Promise<void> {
    const upperLevel = level.toUpperCase() as LogLevel
    const validActor = (actor === 'human' || actor === 'ai' || actor === 'system') 
      ? actor as LogActor 
      : 'system'

    // 根据级别调用对应方法
    switch (upperLevel) {
      case 'DEBUG':
        this.logger.debug(event, message, { actor: validActor, ...metadata })
        break
      case 'WARN':
        this.logger.warn(event, message, { actor: validActor, ...metadata })
        break
      case 'ERROR':
        this.logger.error(event, message, { actor: validActor, ...metadata })
        break
      case 'SUCCESS':
        this.logger.success(event, message, { actor: validActor, ...metadata })
        break
      case 'INFO':
      default:
        this.logger.info(event, message, { actor: validActor, ...metadata })
        break
    }
  }

  /**
   * 获取最近日志 (兼容旧 API)
   */
  async getRecent(count: number = 100, level?: string): Promise<LogEntry[]> {
    const logs = await this.logger.getRecentLogs(count, level as LogLevel)
    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      event: log.event,
      message: log.message,
      actor: log.actor,
      metadata: log.data
    }))
  }

  /**
   * 获取统计 (兼容旧 API)
   */
  async getStats(): Promise<LogStats> {
    const stats = await this.logger.getStats()
    return {
      total: stats.total,
      byLevel: stats.byLevel,
      byEvent: stats.byEvent,
      byActor: stats.byActor,
      recentErrors: stats.recentErrors.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        event: log.event,
        message: log.message,
        actor: log.actor,
        metadata: log.data
      }))
    }
  }

  /**
   * 查询日志 (兼容旧 API)
   */
  async query(filter: LogFilter): Promise<LogEntry[]> {
    const queryFilter: LogQueryFilter = {
      level: filter.level as LogLevel,
      event: filter.event,
      actor: filter.actor as LogActor,
      startTime: filter.startTime,
      endTime: filter.endTime,
      search: filter.search
    }
    const logs = await this.logger.queryLogs(queryFilter)
    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      event: log.event,
      message: log.message,
      actor: log.actor,
      metadata: log.data
    }))
  }

  /**
   * 清理旧日志 (兼容旧 API)
   * 注意：实际清理由 winston-daily-rotate-file 自动处理
   */
  async cleanup(days: number): Promise<number> {
    // Winston 自动处理日志轮转和清理
    // 这里返回 0 表示无需手动清理
    this.logger.info('log.cleanup', 'Log cleanup requested (handled by winston rotation)', { days })
    return 0
  }
}

// 单例实例
const logSystemAdapter = new LogSystemAdapter()

export { logSystemAdapter as logSystem }
export default logSystemAdapter
