/**
 * Report Agent Manager - 报告 Agent 管理系统
 * 
 * 功能：
 * 1. 收集各 Agent 状态
 * 2. 生成报告
 * 3. 邮件/消息推送
 * 4. 异常告警
 */

import type {
  ReportConfig,
  ReportType,
  ReportFormat,
  SystemStatusReport,
  PerformanceReport,
  TaskReport,
  GeneratedReport,
  GenerateReportRequest,
  ReportNotification,
  ReportSchedule,
  DeliveryChannel,
  AlertCondition
} from '../../src/theme/types/report-agent'

import type { AgentRuntimeStatus } from '../../src/theme/types/agent-runtime'
import type { TaskStatus } from '../../src/theme/types/task'
import { getAgentRuntimeManager } from './agent-runtime-manager'
import { getMetaAgentManager } from './meta-agent-manager'
import { getTaskManager } from './task-manager'
import * as fs from 'fs'
import * as path from 'path'

// 数据目录
const DATA_DIR = path.join(process.cwd(), '.data')
const REPORTS_DIR = path.join(DATA_DIR, 'reports')
const REPORT_CONFIG_FILE = path.join(REPORTS_DIR, 'config.json')
const REPORT_LOGS_DIR = path.join(DATA_DIR, 'logs', 'reports')

// 确保目录存在
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDir(REPORTS_DIR)
ensureDir(REPORT_LOGS_DIR)

// Report Agent Manager 类
class ReportAgentManager {
  private configs: Map<string, ReportConfig> = new Map()
  private schedules: Map<string, ReportSchedule> = new Map()
  private notifications: ReportNotification[] = []
  private generatedReports: GeneratedReport[] = []
  private scheduleTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.loadConfigs()
    this.loadSchedules()
  }

  // 加载配置
  private loadConfigs() {
    try {
      if (fs.existsSync(REPORT_CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(REPORT_CONFIG_FILE, 'utf-8'))
        if (data.configs) {
          for (const [id, config] of Object.entries(data.configs)) {
            this.configs.set(id, config as ReportConfig)
          }
        }
      }
    } catch (error) {
      console.error('[ReportAgentManager] Failed to load configs:', error)
    }
  }

  // 保存配置
  private saveConfigs() {
    try {
      const data = {
        configs: Object.fromEntries(this.configs),
        updatedAt: Date.now()
      }
      fs.writeFileSync(REPORT_CONFIG_FILE, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[ReportAgentManager] Failed to save configs:', error)
    }
  }

  // 加载调度
  private loadSchedules() {
    try {
      const schedulesFile = path.join(REPORTS_DIR, 'schedules.json')
      if (fs.existsSync(schedulesFile)) {
        const data = JSON.parse(fs.readFileSync(schedulesFile, 'utf-8'))
        if (data.schedules) {
          for (const schedule of data.schedules) {
            this.schedules.set(schedule.id, schedule)
            if (schedule.enabled) {
              this.startSchedule(schedule)
            }
          }
        }
      }
    } catch (error) {
      console.error('[ReportAgentManager] Failed to load schedules:', error)
    }
  }

  // 保存调度
  private saveSchedules() {
    try {
      const schedulesFile = path.join(REPORTS_DIR, 'schedules.json')
      const data = {
        schedules: Array.from(this.schedules.values()),
        updatedAt: Date.now()
      }
      fs.writeFileSync(schedulesFile, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[ReportAgentManager] Failed to save schedules:', error)
    }
  }

  // 记录日志
  private log(event: string, message: string, data?: any) {
    const entry = {
      timestamp: Date.now(),
      level: 'info' as const,
      event,
      message,
      data
    }

    try {
      const date = new Date().toISOString().split('T')[0]
      const logFile = path.join(REPORT_LOGS_DIR, `${date}.jsonl`)
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.error('[ReportAgentManager] Failed to save log:', error)
    }
  }

  // 创建报告配置
  createReportConfig(id: string, config: ReportConfig): ReportConfig {
    this.configs.set(id, config)
    this.saveConfigs()
    
    this.log('config_created', `Report config created: ${id}`, { type: config.type })
    
    return config
  }

  // 获取报告配置
  getReportConfig(id: string): ReportConfig | undefined {
    return this.configs.get(id)
  }

  // 更新报告配置
  updateReportConfig(id: string, updates: Partial<ReportConfig>): ReportConfig | null {
    const config = this.configs.get(id)
    if (!config) return null

    const updated = { ...config, ...updates }
    this.configs.set(id, updated)
    this.saveConfigs()

    this.log('config_updated', `Report config updated: ${id}`)

    return updated
  }

  // 删除报告配置
  deleteReportConfig(id: string): boolean {
    const deleted = this.configs.delete(id)
    if (deleted) {
      this.saveConfigs()
      this.log('config_deleted', `Report config deleted: ${id}`)
    }
    return deleted
  }

  // 生成系统状态报告
  async generateSystemStatusReport(
    period: { start: number; end: number } = {
      start: Date.now() - 24 * 60 * 60 * 1000,
      end: Date.now()
    }
  ): Promise<SystemStatusReport> {
    const runtimeManager = getAgentRuntimeManager()
    const metaManager = getMetaAgentManager()
    const taskManager = getTaskManager()

    const { runtimes } = runtimeManager.queryRuntimes()
    const workers = metaManager.getAllWorkerStatuses()
    const taskStats = taskManager.getStats()

    const now = Date.now()

    // 计算系统正常运行时间
    const totalUptime = runtimes.reduce((sum, r) => sum + r.stats.totalUptime, 0)
    const avgUptime = runtimes.length > 0 ? totalUptime / runtimes.length : 0

    return {
      timestamp: now,
      period,
      overview: {
        totalAgents: runtimes.length,
        activeAgents: runtimes.filter(r => r.status === 'running').length,
        totalTasks: taskStats.total,
        completedTasks: taskStats.completed,
        failedTasks: taskStats.failed,
        systemUptime: avgUptime
      },
      agents: runtimes.map(runtime => {
        const worker = workers.find(w => w.agentId === runtime.agentId)
        return {
          agentId: runtime.agentId,
          name: `Agent ${runtime.agentId.slice(-8)}`,
          status: runtime.status,
          health: (worker?.health as 'healthy' | 'degraded' | 'unhealthy') || 'healthy',
          lastHeartbeat: runtime.stats.lastHeartbeatAt || 0,
          stats: {
            tasksCompleted: runtime.completedTasks.length,
            tasksFailed: runtime.stats.errorCount,
            averageTaskDuration: 0  // TODO: calculate
          }
        }
      }),
      tasks: {
        byStatus: {
          pending: taskStats.pending,
          running: taskStats.running,
          completed: taskStats.completed,
          failed: taskStats.failed,
          cancelled: taskStats.cancelled,
          retrying: 0
        } as Record<TaskStatus, number>,
        byType: {},  // TODO: implement
        averageCompletionTime: 0,  // TODO: calculate
        successRate: taskStats.total > 0 ? taskStats.completed / taskStats.total : 0
      },
      performance: {
        cpuUsage: workers.reduce((sum, w) => sum + w.load.cpuUsage, 0) / (workers.length || 1),
        memoryUsage: workers.reduce((sum, w) => sum + w.load.memoryUsage, 0),
        diskUsage: 0,  // TODO: implement
        networkIO: { in: 0, out: 0 }  // TODO: implement
      },
      issues: {
        critical: 0,
        warning: 0,
        info: 0,
        recentErrors: []
      }
    }
  }

  // 生成任务报告
  async generateTaskReport(
    period: { start: number; end: number } = {
      start: Date.now() - 24 * 60 * 60 * 1000,
      end: Date.now()
    }
  ): Promise<TaskReport> {
    const taskManager = getTaskManager()
    const stats = taskManager.getStats()

    const now = Date.now()

    return {
      timestamp: now,
      period,
      summary: {
        total: stats.total,
        completed: stats.completed,
        failed: stats.failed,
        cancelled: stats.cancelled,
        inProgress: stats.running,
        pending: stats.pending
      },
      tasks: [],  // TODO: fetch actual tasks
      byType: {},
      byAgent: {}
    }
  }

  // 生成报告
  async generateReport(request: GenerateReportRequest): Promise<GeneratedReport> {
    const now = Date.now()
    const period = request.period || {
      start: now - 24 * 60 * 60 * 1000,
      end: now
    }

    let content: any
    let title: string
    let summary: string

    switch (request.type) {
      case 'status':
        content = await this.generateSystemStatusReport(period)
        title = 'System Status Report'
        summary = `System has ${content.overview.totalAgents} agents, ${content.overview.totalTasks} tasks.`
        break

      case 'task':
        content = await this.generateTaskReport(period)
        title = 'Task Report'
        summary = `${content.summary.completed} tasks completed, ${content.summary.failed} failed.`
        break

      case 'performance':
        title = 'Performance Report'
        summary = 'Performance metrics and trends.'
        content = {}  // TODO: implement
        break

      default:
        title = 'Custom Report'
        summary = 'Custom report content.'
        content = {}
    }

    // 格式化内容
    let formattedContent: string
    switch (request.format) {
      case 'json':
        formattedContent = JSON.stringify(content, null, 2)
        break
      case 'markdown':
        formattedContent = this.formatAsMarkdown(title, summary, content)
        break
      case 'html':
        formattedContent = this.formatAsHTML(title, summary, content)
        break
      default:
        formattedContent = JSON.stringify(content, null, 2)
    }

    const report: GeneratedReport = {
      id: `report_${now}_${Math.random().toString(36).substring(2, 9)}`,
      type: request.type,
      format: request.format,
      timestamp: now,
      period,
      title,
      summary,
      content: formattedContent,
      metadata: {
        generatedBy: 'report-agent',
        generatedAt: now,
        version: '1.0.0',
        dataPoints: Object.keys(content).length
      }
    }

    this.generatedReports.push(report)

    // 保存到文件
    if (request.export?.saveToFile || true) {
      const fileName = `report_${report.id}.${request.format === 'json' ? 'json' : request.format}`
      const filePath = path.join(REPORTS_DIR, fileName)
      fs.writeFileSync(filePath, formattedContent)
      report.export = {
        filePath,
        downloadUrl: `/api/reports/download/${report.id}`,
        size: fs.statSync(filePath).size
      }
    }

    this.log('report_generated', `Report generated: ${report.id}`, {
      type: request.type,
      format: request.format
    })

    return report
  }

  // 格式化为 Markdown
  private formatAsMarkdown(title: string, summary: string, content: any): string {
    return `# ${title}

Generated at: ${new Date().toISOString()}

## Summary

${summary}

## Content

\`\`\`json
${JSON.stringify(content, null, 2)}
\`\`\`
`
  }

  // 格式化为 HTML
  private formatAsHTML(title: string, summary: string, content: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    pre { background: #f5f5f5; padding: 20px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated at: ${new Date().toISOString()}</p>
  <h2>Summary</h2>
  <p>${summary}</p>
  <h2>Content</h2>
  <pre>${JSON.stringify(content, null, 2)}</pre>
</body>
</html>`
  }

  // 发送通知
  async sendNotification(
    type: ReportNotification['type'],
    title: string,
    message: string,
    channels: DeliveryChannel[],
    details?: any
  ): Promise<ReportNotification> {
    const notification: ReportNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      type,
      priority: 'normal',
      title,
      message,
      details,
      delivery: {
        channels,
        status: channels.reduce((acc, c) => {
          acc[c] = 'pending'
          return acc
        }, {} as Record<DeliveryChannel, 'pending' | 'sent' | 'failed'>),
        sentAt: {} as Record<DeliveryChannel, number>,
        errors: {} as Record<DeliveryChannel, string>
      },
      read: false
    }

    this.notifications.push(notification)

    // 发送到各个渠道
    for (const channel of channels) {
      try {
        await this.deliverToChannel(channel, notification)
        notification.delivery.status[channel] = 'sent'
        notification.delivery.sentAt![channel] = Date.now()
      } catch (error: any) {
        notification.delivery.status[channel] = 'failed'
        notification.delivery.errors![channel] = error.message
      }
    }

    this.log('notification_sent', `Notification sent: ${notification.id}`, {
      channels,
      status: notification.delivery.status
    })

    return notification
  }

  // 发送到指定渠道
  private async deliverToChannel(channel: DeliveryChannel, notification: ReportNotification): Promise<void> {
    switch (channel) {
      case 'email':
        // TODO: implement email delivery
        console.log(`[Email] ${notification.title}: ${notification.message}`)
        break

      case 'webhook':
        // TODO: implement webhook delivery
        console.log(`[Webhook] ${notification.title}: ${notification.message}`)
        break

      case 'push':
        // TODO: implement push notification
        console.log(`[Push] ${notification.title}: ${notification.message}`)
        break

      case 'console':
        console.log(`[Report] ${notification.title}: ${notification.message}`)
        break

      case 'file':
        const logFile = path.join(REPORT_LOGS_DIR, 'notifications.jsonl')
        fs.appendFileSync(logFile, JSON.stringify(notification) + '\n')
        break

      default:
        throw new Error(`Unknown delivery channel: ${channel}`)
    }
  }

  // 创建报告调度
  createSchedule(id: string, name: string, config: ReportConfig, cron: string): ReportSchedule {
    const schedule: ReportSchedule = {
      id,
      name,
      enabled: true,
      config,
      schedule: {
        type: 'recurring',
        cron,
        runCount: 0
      },
      history: []
    }

    this.schedules.set(id, schedule)
    this.saveSchedules()
    this.startSchedule(schedule)

    this.log('schedule_created', `Report schedule created: ${id}`, { cron })

    return schedule
  }

  // 启动调度
  private startSchedule(schedule: ReportSchedule): void {
    // 简化的调度实现：使用 setInterval 模拟 cron
    // 实际应该使用 node-cron 等库
    const interval = 60 * 60 * 1000  // 1 hour

    const timer = setInterval(async () => {
      if (!schedule.enabled) return

      try {
        const report = await this.generateReport({
          type: schedule.config.type,
          format: schedule.config.format,
          period: {
            start: Date.now() - 24 * 60 * 60 * 1000,
            end: Date.now()
          }
        })

        schedule.schedule.lastRunAt = Date.now()
        schedule.schedule.runCount++
        schedule.history.push({
          runAt: Date.now(),
          reportId: report.id,
          status: 'success'
        })

        // 发送通知
        if (schedule.config.delivery.channels.length > 0) {
          await this.sendNotification(
            'report',
            `Scheduled Report: ${report.title}`,
            report.summary,
            schedule.config.delivery.channels,
            { reportId: report.id }
          )
        }

        this.saveSchedules()
      } catch (error: any) {
        schedule.history.push({
          runAt: Date.now(),
          reportId: '',
          status: 'failed',
          error: error.message
        })
        this.saveSchedules()
      }
    }, interval)

    this.scheduleTimers.set(schedule.id, timer)
  }

  // 停止调度
  stopSchedule(id: string): boolean {
    const timer = this.scheduleTimers.get(id)
    if (timer) {
      clearInterval(timer)
      this.scheduleTimers.delete(id)
      return true
    }
    return false
  }

  // 获取通知列表
  getNotifications(unreadOnly = false): ReportNotification[] {
    let notifications = this.notifications
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read)
    }
    return notifications.sort((a, b) => b.timestamp - a.timestamp)
  }

  // 标记通知已读
  markNotificationRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id)
    if (!notification) return false

    notification.read = true
    notification.readAt = Date.now()
    return true
  }

  // 获取报告列表
  getReports(type?: ReportType): GeneratedReport[] {
    let reports = this.generatedReports
    if (type) {
      reports = reports.filter(r => r.type === type)
    }
    return reports.sort((a, b) => b.timestamp - a.timestamp)
  }

  // 检查告警条件
  async checkAlerts(): Promise<void> {
    const runtimeManager = getAgentRuntimeManager()
    const metaManager = getMetaAgentManager()
    const stats = runtimeManager.getStats()
    const metaStatus = metaManager.getStatus()

    // 检查 Agent 错误率
    const errorRate = stats.global.totalErrors / (stats.total || 1)
    if (errorRate > 0.1) {
      await this.sendNotification(
        'alert',
        'High Error Rate Alert',
        `System error rate is ${(errorRate * 100).toFixed(1)}%, exceeding threshold of 10%`,
        ['console', 'file'],
        { errorRate, threshold: 0.1 }
      )
    }

    // 检查是否有不健康的 Worker
    const unhealthyWorkers = metaStatus.workers.unhealthy
    if (unhealthyWorkers > 0) {
      await this.sendNotification(
        'alert',
        'Unhealthy Workers Alert',
        `${unhealthyWorkers} workers are unhealthy`,
        ['console', 'file'],
        { unhealthyWorkers }
      )
    }
  }
}

// 单例实例
let manager: ReportAgentManager | null = null

export function getReportAgentManager(): ReportAgentManager {
  if (!manager) {
    manager = new ReportAgentManager()
  }
  return manager
}

export { ReportAgentManager }
