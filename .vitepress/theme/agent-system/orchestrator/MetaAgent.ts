/**
 * MetaAgent
 * 高级编排和调度 Agent
 */

import { ContentAgent, ContentTask, ContentResult } from '../agents/ContentAgent'
import { StorageAgent, StorageTask, StorageResult } from '../agents/StorageAgent'
import { scheduler, CronPresets } from '../mcp-tools/scheduler'

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
    
    // 如果启用定时调度
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
      // 1. 获取内容源
      const urls = await this.resolveSource(workflow.source)
      result.summary.total = urls.length

      // 2. 提取内容
      const contentTasks = urls.map(url => ({
        url,
        priority: 'normal' as const,
        callback: (contentResult: ContentResult) => {
          result.tasks.content.push(contentResult)
        },
      }))

      const taskIds = await this.contentAgent.addTasks(contentTasks)
      
      // 等待所有内容提取完成
      await this.waitForContentTasks(taskIds)

      // 3. 过滤内容
      const validContents = result.tasks.content.filter(r => 
        r.success && this.applyFilter(r.content!, workflow.filter)
      )

      // 4. 存储内容
      for (const contentResult of validContents) {
        const storageResult = await this.storageAgent.store({
          content: contentResult.content!,
          section: workflow.target.section,
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
      }

    } catch (error) {
      console.error(`[MetaAgent] Workflow failed: ${workflowId}`, error)
    }

    // 保存结果
    this.results.set(workflowId, result)
    
    console.log(`[MetaAgent] Workflow completed: ${workflow.name}`, result.summary)
    
    return result
  }

  // 处理 URL 命令（用户发送链接）
  async handleUrlCommand(
    url: string,
    options: {
      section?: string
      platform?: string
      autoPublish?: boolean
    } = {}
  ): Promise<{ content: ContentResult; storage: StorageResult }> {
    console.log(`[MetaAgent] Handling URL: ${url}`)

    // 1. 提取内容
    const contentTaskId = await this.contentAgent.addTask({
      url,
      platform: options.platform,
      priority: 'high',
    })

    // 等待提取完成
    let contentResult: ContentResult | undefined
    while (!contentResult) {
      await this.delay(500)
      contentResult = this.contentAgent.getResult(contentTaskId)
    }

    if (!contentResult.success) {
      throw new Error(`Content extraction failed: ${contentResult.error}`)
    }

    // 2. 存储内容
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
      name: `Workflow: ${this.workflows.get(workflowId)?.name}`,
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
        // 这里应该调用搜索 API
        console.log('[MetaAgent] Search source not implemented yet')
        return []
      
      case 'rss':
        // 这里应该解析 RSS
        console.log('[MetaAgent] RSS source not implemented yet')
        return []
      
      default:
        return []
    }
  }

  // 应用过滤器
  private applyFilter(
    content: any,
    filter?: ContentWorkflow['filter']
  ): boolean {
    if (!filter) return true

    // 长度过滤
    if (filter.minLength && content.content.length < filter.minLength) {
      return false
    }

    // 关键词过滤
    if (filter.keywords && filter.keywords.length > 0) {
      const hasKeyword = filter.keywords.some(kw => 
        content.content.includes(kw) || content.title.includes(kw)
      )
      if (!hasKeyword) return false
    }

    // 排除关键词
    if (filter.excludeKeywords && filter.excludeKeywords.length > 0) {
      const hasExclude = filter.excludeKeywords.some(kw => 
        content.content.includes(kw) || content.title.includes(kw)
      )
      if (hasExclude) return false
    }

    return true
  }

  // 等待内容任务完成
  private async waitForContentTasks(taskIds: string[]): Promise<void> {
    const checkInterval = 500
    const maxWait = 60000 // 60秒超时
    let waited = 0

    while (waited < maxWait) {
      const allComplete = taskIds.every(id => 
        this.contentAgent.getResult(id) !== undefined
      )
      
      if (allComplete) break
      
      await this.delay(checkInterval)
      waited += checkInterval
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
      contentQueue: this.contentAgent.getStatus().queueLength,
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
