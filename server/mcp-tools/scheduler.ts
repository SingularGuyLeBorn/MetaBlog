/**
 * ============================================================================
 * MCP 工具模块 - scheduler
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/mcp-tools
 */


export interface ScheduledTask {
  id: string
  name: string
  cron: string
  handler: () => Promise<void>
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
}

/**
 * TaskConfig 接口定义
 *
 */
export interface TaskConfig {
  id?: string
  name: string
  cron: string
  handler: () => Promise<void>
  enabled?: boolean
}

/**
 * SchedulerTool 类
 *
 */
export class SchedulerTool {
  name = 'scheduler'
  description = '定时任务调度器'

  private tasks: Map<string, ScheduledTask> = new Map()
  private intervals: Map<string, any> = new Map()

  // 创建定时任务
  schedule(config: TaskConfig): string {
    const id = config.id || `task_${Date.now()}_${Math.random().toString(36).slice(2)}`

    const task: ScheduledTask = {
      id,
      name: config.name,
      cron: config.cron,
      handler: config.handler,
      enabled: config.enabled ?? true,
      runCount: 0,
    }

    this.tasks.set(id, task)

    if (task.enabled) {
      this.startTask(task)
    }

    return id
  }

  // 立即执行任务
  async runNow(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    await this.executeTask(task)
  }

  // 停止任务
  stop(taskId: string): void {
    const interval = this.intervals.get(taskId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(taskId)
    }

    const task = this.tasks.get(taskId)
    if (task) {
      task.enabled = false
    }
  }

  // 启动任务
  start(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.enabled = true
      this.startTask(task)
    }
  }

  // 删除任务
  remove(taskId: string): void {
    this.stop(taskId)
    this.tasks.delete(taskId)
  }

  // 获取任务列表
  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).map(task => ({
      ...task,
      handler: undefined as any, // 不返回 handler 函数
    }))
  }

  // 获取任务详情
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId)
  }

  // 解析 Cron 表达式(简化版,只支持特定格式)
  private parseCron(cron: string): number {
    // 支持的格式:
    // "*/5 * * * *" - 每5分钟
    // "0 * * * *" - 每小时
    // "0 9 * * *" - 每天9点
    // "0 9 * * 1" - 每周一9点

    const parts = cron.split(' ')
    if (parts.length !== 5) {
      throw new Error('Invalid cron format. Use: minute hour day month weekday')
    }

    const [minute, hour] = parts

    // 简化处理：返回毫秒间隔
    if (minute.startsWith('*/')) {
      const interval = parseInt(minute.replace('*/', ''))
      return interval * 60 * 1000
    }

    if (minute === '0' && hour === '*') {
      return 60 * 60 * 1000 // 每小时
    }

    if (minute === '0' && hour !== '*') {
      return 24 * 60 * 60 * 1000 // 每天
    }

    // 默认5分钟
    return 5 * 60 * 1000
  }

  // 启动任务调度
  private startTask(task: ScheduledTask): void {
    // 停止现有调度
    this.stop(task.id)

    try {
      const interval = this.parseCron(task.cron)

      // 计算下次执行时间
      task.nextRun = new Date(Date.now() + interval)

      // 创建定时器
      const timer = setInterval(async () => {
        await this.executeTask(task)
        task.nextRun = new Date(Date.now() + interval)
      }, interval)

      this.intervals.set(task.id, timer)

    } catch (error) {
      console.error(`Failed to start task ${task.id}:`, error)
    }
  }

  // 执行任务
  private async executeTask(task: ScheduledTask): Promise<void> {
    console.log(`[Scheduler] Executing task: ${task.name} (${task.id})`)

    try {
      await task.handler()
      task.lastRun = new Date()
      task.runCount++
      console.log(`[Scheduler] Task completed: ${task.name}`)
    } catch (error) {
      console.error(`[Scheduler] Task failed: ${task.name}`, error)
    }
  }

  // 停止所有任务
  stopAll(): void {
    for (const [id] of this.intervals) {
      this.stop(id)
    }
  }

  // 启动所有任务
  startAll(): void {
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.startTask(task)
      }
    }
  }

  // 获取运行状态
  getStatus(): {
    total: number
    running: number
    stopped: number
  } {
    const tasks = Array.from(this.tasks.values())
    return {
      total: tasks.length,
      running: tasks.filter(t => t.enabled).length,
      stopped: tasks.filter(t => !t.enabled).length,
    }
  }
}

// 导出单例
export const scheduler = new SchedulerTool()

// 常用 Cron 表达式预设
export const CronPresets = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_AT_9AM: '0 9 * * *',
  EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
  EVERY_WEEK: '0 0 * * 0',
  EVERY_MONTH: '0 0 1 * *',
} as const
