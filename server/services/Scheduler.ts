/**
 * Scheduler Service - 定时任务调度器
 * 
 * 负责管理 Agent 的定时触发任务
 * 使用 node-cron 实现 Cron 表达式调度
 */

import cron from 'node-cron'
import { promises as fs } from 'fs'
import { join } from 'path'
import { EventEmitter } from 'events'

// 数据存储路径
const DATA_DIR = join(process.cwd(), '.data')
const AGENTS_FILE = join(DATA_DIR, 'agents.json')

// 触发器类型
export type TriggerType = 'manual' | 'scheduled' | 'event' | 'webhook' | 'mention'

export interface Trigger {
  id: string
  type: TriggerType
  name: string
  enabled: boolean
  config: {
    cron?: string
    timezone?: string
    eventName?: string
    eventFilter?: Record<string, any>
    webhookUrl?: string
    webhookSecret?: string
    mentionKeywords?: string[]
  }
  lastTriggered?: string
  triggerCount: number
}

export interface Agent {
  id: string
  name: string
  status: string
  triggers?: Trigger[]
  [key: string]: any
}

// 调度任务映射
interface ScheduledTask {
  agentId: string
  triggerId: string
  task: cron.ScheduledTask
}

/**
 * Scheduler 类
 * 
 * 管理所有 Agent 的定时任务
 * 监听 agents.json 变化自动重新加载
 */
export class Scheduler extends EventEmitter {
  private tasks: Map<string, ScheduledTask> = new Map()
  private isRunning = false
  private watchInterval: NodeJS.Timeout | null = null
  private lastAgentsHash = ''

  constructor() {
    super()
    this.startWatching()
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) return
    
    console.log('[Scheduler] Starting...')
    await this.reloadTasks()
    this.isRunning = true
    console.log(`[Scheduler] Started with ${this.tasks.size} scheduled tasks`)
  }

  /**
   * 停止调度器
   */
  stop(): void {
    console.log('[Scheduler] Stopping...')
    
    // 停止所有任务
    this.tasks.forEach(({ task }) => {
      task.stop()
    })
    this.tasks.clear()
    
    // 停止监听
    if (this.watchInterval) {
      clearInterval(this.watchInterval)
      this.watchInterval = null
    }
    
    this.isRunning = false
    console.log('[Scheduler] Stopped')
  }

  /**
   * 重新加载所有任务
   */
  async reloadTasks(): Promise<void> {
    try {
      const agents = await this.readAgents()
      const currentTaskKeys = new Set(this.tasks.keys())
      const newTaskKeys = new Set<string>()
      
      for (const agent of agents) {
        if (!agent.triggers) continue
        
        for (const trigger of agent.triggers) {
          if (trigger.type !== 'scheduled' || !trigger.enabled) continue
          if (!trigger.config.cron) continue
          
          // 验证 Cron 表达式
          if (!cron.validate(trigger.config.cron)) {
            console.warn(`[Scheduler] Invalid cron expression: ${trigger.config.cron} for agent ${agent.id}`)
            continue
          }
          
          const taskKey = `${agent.id}:${trigger.id}`
          newTaskKeys.add(taskKey)
          
          // 如果任务已存在且没有变化，跳过
          if (this.tasks.has(taskKey)) {
            continue
          }
          
          // 创建新任务
          this.scheduleTask(agent, trigger, taskKey)
        }
      }
      
      // 清理不再需要的任务
      for (const key of currentTaskKeys) {
        if (!newTaskKeys.has(key)) {
          const scheduled = this.tasks.get(key)
          if (scheduled) {
            scheduled.task.stop()
            this.tasks.delete(key)
            console.log(`[Scheduler] Removed task: ${key}`)
          }
        }
      }
      
    } catch (error) {
      console.error('[Scheduler] Failed to reload tasks:', error)
    }
  }

  /**
   * 调度单个任务
   */
  private scheduleTask(agent: Agent, trigger: Trigger, taskKey: string): void {
    const cronExpression = trigger.config.cron!
    const timezone = trigger.config.timezone || 'Asia/Shanghai'
    
    console.log(`[Scheduler] Scheduling task: ${taskKey} with cron "${cronExpression}" (${timezone})`)
    
    const task = cron.schedule(
      cronExpression,
      async () => {
        await this.executeTask(agent, trigger)
      },
      {
        scheduled: true,
        timezone,
        name: taskKey
      }
    )
    
    this.tasks.set(taskKey, {
      agentId: agent.id,
      triggerId: trigger.id,
      task
    })
  }

  /**
   * 执行任务
   */
  private async executeTask(agent: Agent, trigger: Trigger): Promise<void> {
    console.log(`[Scheduler] Executing task: ${agent.name} (${trigger.name})`)
    
    try {
      // 更新触发统计
      trigger.lastTriggered = new Date().toISOString()
      trigger.triggerCount++
      
      // 更新 Agent 状态
      await this.updateAgentStatus(agent.id, {
        status: 'running',
        lastRunAt: Date.now(),
        trigger
      })
      
      // 发出触发事件
      this.emit('trigger', {
        agentId: agent.id,
        triggerId: trigger.id,
        timestamp: Date.now()
      })
      
      // 执行 Agent 任务（调用 AI 服务）
      await this.invokeAgent(agent, trigger)
      
      // 恢复 Agent 状态
      await this.updateAgentStatus(agent.id, {
        status: 'idle'
      })
      
    } catch (error) {
      console.error(`[Scheduler] Task execution failed for ${agent.id}:`, error)
      
      await this.updateAgentStatus(agent.id, {
        status: 'error',
        errorCount: (agent.errorCount || 0) + 1
      })
      
      this.emit('error', {
        agentId: agent.id,
        triggerId: trigger.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * 调用 Agent 执行
   */
  private async invokeAgent(agent: Agent, trigger: Trigger): Promise<void> {
    // 这里应该调用 AI 服务
    // 为了演示，先发出事件让外部处理
    this.emit('invoke', {
      agentId: agent.id,
      triggerId: trigger.id,
      agent,
      trigger
    })
    
    // TODO: 实际调用 AI 服务
    console.log(`[Scheduler] Invoking agent ${agent.id} with trigger ${trigger.id}`)
  }

  /**
   * 更新 Agent 状态
   */
  private async updateAgentStatus(agentId: string, updates: Partial<Agent>): Promise<void> {
    try {
      const agents = await this.readAgents()
      const index = agents.findIndex(a => a.id === agentId)
      
      if (index !== -1) {
        agents[index] = {
          ...agents[index],
          ...updates,
          updatedAt: Date.now()
        }
        
        await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8')
      }
    } catch (error) {
      console.error('[Scheduler] Failed to update agent status:', error)
    }
  }

  /**
   * 读取所有 Agents
   */
  private async readAgents(): Promise<Agent[]> {
    try {
      const data = await fs.readFile(AGENTS_FILE, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  /**
   * 监听 agents.json 变化
   */
  private startWatching(): void {
    // 每 5 秒检查一次文件变化
    this.watchInterval = setInterval(async () => {
      try {
        const stats = await fs.stat(AGENTS_FILE)
        const hash = `${stats.mtime.getTime()}-${stats.size}`
        
        if (this.lastAgentsHash && this.lastAgentsHash !== hash) {
          console.log('[Scheduler] Agents file changed, reloading tasks...')
          await this.reloadTasks()
        }
        
        this.lastAgentsHash = hash
      } catch {
        // 文件可能不存在，忽略错误
      }
    }, 5000)
  }

  /**
   * 获取所有调度任务状态
   */
  getTasksStatus(): Array<{
    agentId: string
    triggerId: string
    running: boolean
  }> {
    return Array.from(this.tasks.entries()).map(([key, { agentId, triggerId, task }]) => ({
      agentId,
      triggerId,
      running: task.getStatus()?.running || false
    }))
  }

  /**
   * 手动触发任务（用于测试）
   */
  async manualTrigger(agentId: string, triggerId: string): Promise<boolean> {
    const agents = await this.readAgents()
    const agent = agents.find(a => a.id === agentId)
    
    if (!agent || !agent.triggers) return false
    
    const trigger = agent.triggers.find(t => t.id === triggerId)
    if (!trigger) return false
    
    await this.executeTask(agent, trigger)
    return true
  }
}

// 导出单例
export const scheduler = new Scheduler()
