/**
 * Boot Logger - 系统启动日志记录
 * 在VitePress启动时记录关键系统事件
 */
import { getStructuredLogger } from './StructuredLogger'

export interface BootEvent {
  phase: 'init' | 'config' | 'server' | 'ready' | 'error'
  message: string
  metadata?: Record<string, any>
  timestamp: string
}

class BootLogger {
  private startTime = Date.now()
  private events: BootEvent[] = []
  private isBooted = false

  constructor() {
    this.log('init', 'Boot logger initialized')
  }

  log(phase: BootEvent['phase'], message: string, metadata?: Record<string, any>) {
    const event: BootEvent = {
      phase,
      message,
      metadata,
      timestamp: new Date().toISOString()
    }
    this.events.push(event)
    
    // 立即写入日志系统
    const duration = Date.now() - this.startTime
    const logger = getStructuredLogger()
    const level = phase === 'error' ? 'error' : 'info'
    const event = `boot.${phase}`
    const msg = `[+${duration}ms] ${message}`
    const data = { ...metadata, bootTime: duration }
    
    if (level === 'error') {
      logger.error(event, msg, data)
    } else if (level === 'warn') {
      logger.warn(event, msg, data)
    } else {
      logger.info(event, msg, data)
    }
  }

  // VitePress配置加载
  logConfigLoad(configPath: string) {
    this.log('config', 'Configuration loaded', { configPath })
  }

  // 服务器启动
  logServerStart(port: number, host: string) {
    this.log('server', `Dev server started on ${host}:${port}`, { port, host })
  }

  // 插件初始化
  logPluginInit(pluginName: string, status: 'success' | 'error' = 'success') {
    this.log(
      status === 'error' ? 'error' : 'init',
      `Plugin ${pluginName} ${status}`,
      { pluginName, status }
    )
  }

  // 系统就绪
  logReady() {
    const totalDuration = Date.now() - this.startTime
    this.isBooted = true
    this.log('ready', 'System ready', { 
      totalBootTime: totalDuration,
      eventCount: this.events.length
    })
  }

  // 启动错误
  logError(error: Error, context?: string) {
    this.log('error', context || 'Boot error', {
      error: error.message,
      stack: error.stack
    })
  }

  // 获取启动报告
  getBootReport() {
    return {
      success: this.isBooted,
      duration: Date.now() - this.startTime,
      events: this.events,
      phases: this.events.reduce((acc, e) => {
        acc[e.phase] = (acc[e.phase] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }
}

// 单例实例
export const bootLogger = new BootLogger()

// 便利函数
export const logBoot = (phase: BootEvent['phase'], message: string, metadata?: Record<string, any>) => 
  bootLogger.log(phase, message, metadata)
