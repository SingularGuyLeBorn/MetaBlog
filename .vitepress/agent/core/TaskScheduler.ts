import { getStructuredLogger } from '../runtime/StructuredLogger'
import { agentConfig } from '../agent.config.js'
import { getBackgroundTaskManager, TaskType } from './BackgroundTaskManager'

export class TaskScheduler {
  private timer: number | null = null
  private logger = getStructuredLogger()
  private taskManager = getBackgroundTaskManager()
  
  // Track last run time for each task to avoid duplicate runs
  private lastRunMap = new Map<TaskType, number>()

  start() {
    if (this.timer) return
    this.logger.info('scheduler.start', 'Starting TaskScheduler...')
    
    // Check every minute
    this.timer = window.setInterval(() => {
      this.checkTasks()
    }, 60 * 1000)
    
    // Also perform an immediate check
    this.checkTasks()
  }

  stop() {
    if (this.timer) {
      window.clearInterval(this.timer)
      this.timer = null
      this.logger.info('scheduler.stop', 'TaskScheduler stopped.')
    }
  }

  private async checkTasks() {
    const now = new Date()
    
    // mapping between config keys and TaskType
    const taskMapping: Record<string, TaskType> = {
      'arxivDigest': 'arxiv-digest',
      'rssAggregator': 'rss-aggregator',
      'codeDocs': 'code-docs',
      'contentCleanup': 'content-cleanup'
    }

    for (const [configKey, taskType] of Object.entries(taskMapping)) {
      const config = agentConfig.tasks[configKey]
      if (!config || !config.enabled) continue
      
      const schedule = config.schedule
      if (!schedule || !schedule.enabled || !schedule.cron) continue
      
      if (this.shouldRun(taskType, schedule.cron, now)) {
        this.logger.info('scheduler.trigger', `Scheduled trigger for ${taskType}`)
        this.lastRunMap.set(taskType, now.getTime())
        try {
          await this.taskManager.triggerTask(taskType, {}, { 
            name: `[定时执行] ${configKey}`,
            triggeredBy: 'system' 
          })
        } catch (e) {
          this.logger.error('scheduler.error', `Failed to trigger ${taskType}: ${e}`)
        }
      }
    }
  }

  private shouldRun(taskType: TaskType, cron: string, now: Date): boolean {
    const lastRun = this.lastRunMap.get(taskType) || 0
    // Prevent running multiple times in the same minute
    if (now.getTime() - lastRun < 60000) return false

    // Very simplistic cron evaluation just for '0 0 * * *' (midnight) or similar basic ones.
    // cron format: minute hour day month dayOfWeek
    const parts = cron.split(' ')
    if (parts.length !== 5) return false
    
    const [min, hour, day, month, dow] = parts
    
    const match = (part: string, val: number) => {
      if (part === '*') return true
      if (part.includes('/')) {
        const step = parseInt(part.split('/')[1], 10)
        return val % step === 0
      }
      return parseInt(part, 10) === val
    }

    return match(min, now.getMinutes()) &&
           match(hour, now.getHours()) &&
           match(day, now.getDate()) &&
           match(month, now.getMonth() + 1) &&
           match(dow, now.getDay())
  }
}

// Singleton pattern
let schedulerInstance: TaskScheduler | null = null
export function getTaskScheduler(): TaskScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new TaskScheduler()
  }
  return schedulerInstance
}
