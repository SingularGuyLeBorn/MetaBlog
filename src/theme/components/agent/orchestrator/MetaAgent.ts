/**
 * MetaAgent
 * 高级编排和调度 Agent (Browser-compatible version)
 */

import { ContentAgent, ContentTask, ContentResult } from '@/theme/components/agent/agents/ContentAgent'
import { StorageAgent, StorageTask, StorageResult } from '@/theme/components/agent/agents/StorageAgent'

// Simple in-browser scheduler (replaces server-side scheduler)
interface ScheduledTask {
  id: string
  cron: string
  handler: () => Promise<void>
  enabled: boolean
}

class SimpleScheduler {
  private tasks: Map<string, ScheduledTask> = new Map()
  
  schedule(task: ScheduledTask): void {
    this.tasks.set(task.id, task)
    console.log(`[Scheduler] Task scheduled: ${task.id} (${task.cron})`)
  }
  
  stop(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.enabled = false
      this.tasks.set(taskId, task)
    }
  }
  
  startAll(): void {
    console.log(`[Scheduler] Starting ${this.tasks.size} tasks`)
  }
  
  stopAll(): void {
    console.log(`[Scheduler] Stopping all tasks`)
    this.tasks.forEach(task => task.enabled = false)
  }
  
  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }
}

export const CronPresets = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_AT_9AM: '0 9 * * *',
  EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
}

const scheduler = new SimpleScheduler()

export interface MetaAgentConfig {
  contentAgent: ContentAgent
  storageAgent: StorageAgent
  autoApprove?: boolean
  defaultSchedule?: string
}

export interface ContentWorkflow {
  id: string
  name: string
  source: {
    type: 'url' | 'search' | 'rss'
    urls?: string[]
    searchQuery?: string
    platforms?: string[]
  }
  target: {
    section?: string
    autoPublish?: boolean
  }
  schedule?: {
    enabled: boolean
    cron?: string
  }
  filter?: {
    minLength?: number
    keywords?: string[]
    excludeKeywords?: string[]
  }
}

export interface WorkflowResult {
  workflowId: string
  executedAt: string
  tasks: {
    content: ContentResult[]
    storage: StorageResult[]
  }
  summary: {
    total: number
    success: number
    failed: number
  }
}

export class MetaAgent {
  name = 'MetaAgent'
  description = '编排调度 Agent'
  
  private contentAgent: ContentAgent
  private storageAgent: StorageAgent
  private config: Required<MetaAgentConfig>
  private workflows: Map<string, ContentWorkflow> = new Map()
  private results: Map<string, WorkflowResult> = new Map()

  constructor(config: MetaAgentConfig) {
    this.config = {
      autoApprove: false,
      defaultSchedule: CronPresets.EVERY_DAY_AT_9AM,
      ...config,
    }
    
    this.contentAgent = config.contentAgent
    this.storageAgent = config.storageAgent
  }

  // 创建内容工作流
  createWorkflow(workflow: Omit<ContentWorkflow, 'id'>): string {
    const id = `workflow_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    const fullWorkflow: ContentWorkflow = {
      ...workflow,
      id,
    }
    
    this.workflows.set(id, fullWorkflow)
    
    if (workflow.schedule?.enabled && workflow.schedule.cron) {
      this.scheduleWorkflow(id, workflow.schedule.cron)
    }
    
    return id
  }

  // 立即执行工作流
  async executeWorkflow(workflowId: string): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    console.log(`[MetaAgent] Executing workflow: ${workflow.name}`)

    const result: WorkflowResult = {
      workflowId,
      executedAt: new Date().toISOString(),
      tasks: {
        content: [],
        storage: [],
      },
      summary: {
        total: 0,
        success: 0,
        failed: 0,
      },
    }

    try {
      const urls = await this.resolveSource(workflow.source)
      result.summary.total = urls.length

      // Fetch content
      for (const url of urls) {
        const contentResult = await this.contentAgent.fetch(url)
        result.tasks.content.push(contentResult)
        
        if (contentResult.success && contentResult.content) {
          // Store content
          const storageResult = await this.storageAgent.store({
            content: contentResult.content,
            section: workflow.target.section as any,
            options: {
              downloadImages: true,
              autoCommit: workflow.target.autoPublish,
            },
          })
          
          result.tasks.storage.push(storageResult)
          
          if (storageResult.success) {
            result.summary.success++
          } else {
            result.summary.failed++
          }
        } else {
          result.summary.failed++
        }
      }

    } catch (error) {
      console.error(`[MetaAgent] Workflow failed: ${workflowId}`, error)
    }

    this.results.set(workflowId, result)
    
    console.log(`[MetaAgent] Workflow completed: ${workflow.name}`, result.summary)
    
    return result
  }

  // 处理 URL 命令
  async handleUrlCommand(
    url: string,
    options: {
      section?: string
      platform?: string
      autoPublish?: boolean
    } = {}
  ): Promise<{ content: ContentResult; storage: StorageResult }> {
    console.log(`[MetaAgent] Handling URL: ${url}`)

    const contentResult = await this.contentAgent.fetch(url, { platform: options.platform })

    if (!contentResult.success) {
      throw new Error(`Content extraction failed: ${contentResult.error}`)
    }

    const storageResult = await this.storageAgent.store({
      content: contentResult.content!,
      section: options.section as any,
      options: {
        downloadImages: true,
        autoCommit: options.autoPublish,
      },
    })

    return { content: contentResult, storage: storageResult }
  }

  // 调度工作流
  private scheduleWorkflow(workflowId: string, cron: string): void {
    scheduler.schedule({
      id: `schedule_${workflowId}`,
      cron,
      handler: async () => {
        await this.executeWorkflow(workflowId)
      },
      enabled: true,
    })
    
    console.log(`[MetaAgent] Workflow scheduled: ${workflowId} (${cron})`)
  }

  // 解析内容源
  private async resolveSource(source: ContentWorkflow['source']): Promise<string[]> {
    switch (source.type) {
      case 'url':
        return source.urls || []
      
      case 'search':
        console.log('[MetaAgent] Search source not implemented yet')
        return []
      
      case 'rss':
        console.log('[MetaAgent] RSS source not implemented yet')
        return []
      
      default:
        return []
    }
  }

  // 获取工作流
  getWorkflow(id: string): ContentWorkflow | undefined {
    return this.workflows.get(id)
  }

  // 获取所有工作流
  getAllWorkflows(): ContentWorkflow[] {
    return Array.from(this.workflows.values())
  }

  // 获取工作流结果
  getWorkflowResult(id: string): WorkflowResult | undefined {
    return this.results.get(id)
  }

  // 删除工作流
  deleteWorkflow(id: string): void {
    scheduler.stop(`schedule_${id}`)
    this.workflows.delete(id)
    this.results.delete(id)
  }

  // 获取系统状态
  getStatus(): {
    workflows: number
    scheduled: number
    contentQueue: number
    completedJobs: number
  } {
    return {
      workflows: this.workflows.size,
      scheduled: scheduler.listTasks().length,
      contentQueue: this.contentAgent.getQueueStatus().queueLength,
      completedJobs: this.results.size,
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 启动离线托管
  startHosting(): void {
    console.log('[MetaAgent] Starting offline hosting mode')
    scheduler.startAll()
  }

  // 停止离线托管
  stopHosting(): void {
    console.log('[MetaAgent] Stopping offline hosting mode')
    scheduler.stopAll()
  }
}

export const createMetaAgent = (config: MetaAgentConfig) => new MetaAgent(config)
