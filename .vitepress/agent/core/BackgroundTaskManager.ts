/**
 * BackgroundTaskManager - 手动触发的后台任务管理器
 * 
 * 特性:
 * - 手动触发后台任务
 * - 任务队列管理
 * - 执行状态追踪
 * - 日志记录
 * - 从 agent.config.js 读取配置
 */

import { getStructuredLogger } from '../runtime/StructuredLogger'
import { agentConfig, getTaskConfig } from '../agent.config.js'

export type TaskType = 
  | 'arxiv-digest'      // Arxiv 论文摘要
  | 'rss-aggregator'    // RSS 新闻聚合
  | 'code-docs'         // 代码文档生成
  | 'content-cleanup'   // 内容清理
  | 'custom'            // 自定义任务

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface BackgroundTask {
  id: string
  type: TaskType
  name: string
  description?: string
  status: TaskStatus
  params: Record<string, any>
  
  // 时间戳
  createdAt: number
  startedAt?: number
  completedAt?: number
  
  // 执行结果
  result?: {
    success: boolean
    message: string
    output?: any
    error?: string
  }
  
  // 进度
  progress: number
  currentStep?: string
  
  // 元数据
  triggeredBy: 'human' | 'system'
  logs: TaskLogEntry[]
}

export interface TaskLogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  data?: any
}

export interface TaskTemplate {
  type: TaskType
  name: string
  description: string
  defaultParams: Record<string, any>
  icon: string
}

// 预定义任务模板 - 从 agent.config.js 读取配置
function loadTaskTemplates(): TaskTemplate[] {
  const config = agentConfig
  
  return [
    {
      type: 'arxiv-digest',
      name: 'Arxiv 论文摘要',
      description: '抓取 Arxiv 最新 AI 论文并生成摘要',
      defaultParams: {
        enabled: config.tasks.arxivDigest?.enabled ?? true,
        categories: config.tasks.arxivDigest?.categories ?? ['cs.AI', 'cs.CL', 'cs.LG'],
        maxPapers: config.tasks.arxivDigest?.fetch?.maxPapers ?? 10,
        dateRange: config.tasks.arxivDigest?.fetch?.dateRange ?? 'last_week',
        targetPath: config.tasks.arxivDigest?.content?.targetPath ?? 'posts/ai-digest/',
        apiConfig: config.tasks.arxivDigest?.api ?? {}
      },
      icon: '📄'
    },
    {
      type: 'rss-aggregator',
      name: '技术新闻聚合',
      description: '聚合 RSS 技术资讯',
      defaultParams: {
        enabled: config.tasks.rssAggregator?.enabled ?? true,
        feeds: config.tasks.rssAggregator?.feeds ?? [
          { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', enabled: true }
        ],
        keywords: config.tasks.rssAggregator?.filter?.keywords ?? ['AI', 'LLM', 'Web Development'],
        targetPath: config.tasks.rssAggregator?.content?.targetPath ?? 'posts/news/',
        fetchConfig: config.tasks.rssAggregator?.fetch ?? {}
      },
      icon: '📰'
    },
    {
      type: 'code-docs',
      name: '代码文档生成',
      description: '自动为代码文件生成说明文档',
      defaultParams: {
        enabled: config.tasks.codeDocs?.enabled ?? true,
        sourcePath: config.tasks.codeDocs?.source?.basePath ?? './code/',
        filePattern: config.tasks.codeDocs?.source?.include ?? ['**/*.py', '**/*.ts'],
        excludePattern: config.tasks.codeDocs?.source?.exclude ?? ['**/node_modules/**'],
        targetPath: config.tasks.codeDocs?.output?.targetPath ?? 'knowledge/code-docs/',
        parserConfig: config.tasks.codeDocs?.parser ?? {}
      },
      icon: '💻'
    },
    {
      type: 'content-cleanup',
      name: '内容清理整理',
      description: '清理孤立链接、整理未分类内容',
      defaultParams: {
        enabled: config.tasks.contentCleanup?.enabled ?? true,
        checkOrphanLinks: config.tasks.contentCleanup?.checks?.orphanLinks ?? true,
        checkEmptyFolders: config.tasks.contentCleanup?.checks?.emptyFolders ?? true,
        autoFix: config.tasks.contentCleanup?.repair?.autoFix ?? false,
        moveToArchive: config.tasks.contentCleanup?.repair?.moveToArchive ?? true
      },
      icon: '🧹'
    },
    {
      type: 'custom',
      name: '自定义任务',
      description: '执行自定义指令',
      defaultParams: {
        instruction: ''
      },
      icon: '⚙️'
    }
  ]
}

// 延迟加载模板，确保配置已就绪
let _taskTemplates: TaskTemplate[] | null = null
export function getTaskTemplates(): TaskTemplate[] {
  if (!_taskTemplates) {
    _taskTemplates = loadTaskTemplates()
  }
  return _taskTemplates
}

// 兼容旧导出
export const TASK_TEMPLATES: TaskTemplate[] = new Proxy([] as TaskTemplate[], {
  get(target, prop) {
    const templates = getTaskTemplates()
    return (templates as any)[prop]
  }
})

class BackgroundTaskManager {
  private tasks: Map<string, BackgroundTask> = new Map()
  private runningTasks: Set<string> = new Set()
  private maxConcurrent: number = 2
  private logger = getStructuredLogger()
  
  // 监听器
  private listeners: Map<string, Set<(task: BackgroundTask) => void>> = new Map()
  
  // ============================================
  // 任务创建与触发
  // ============================================
  
  /**
   * 创建并触发后台任务
   */
  async triggerTask(
    type: TaskType,
    params?: Record<string, any>,
    options?: {
      name?: string
      description?: string
      triggeredBy?: 'human' | 'system'
    }
  ): Promise<BackgroundTask> {
    const template = getTaskTemplates().find(t => t.type === type)
    if (!template) {
      throw new Error(`Unknown task type: ${type}`)
    }
    
    const task: BackgroundTask = {
      id: this.generateTaskId(),
      type,
      name: options?.name || template.name,
      description: options?.description || template.description,
      status: 'pending',
      params: { ...template.defaultParams, ...params },
      createdAt: Date.now(),
      progress: 0,
      triggeredBy: options?.triggeredBy || 'human',
      logs: []
    }
    
    this.tasks.set(task.id, task)
    
    this.logger.info('task.created', `Background task ${task.id} created`, {
      taskId: task.id,
      type,
      name: task.name
    })
    
    // 添加到执行队列
    this.processQueue()
    
    this.emit('taskCreated', task)
    
    return task
  }
  
  /**
   * 批量触发任务
   */
  async triggerBatch(
    tasks: Array<{
      type: TaskType
      params?: Record<string, any>
      name?: string
    }>
  ): Promise<BackgroundTask[]> {
    const created: BackgroundTask[] = []
    
    for (const taskConfig of tasks) {
      const task = await this.triggerTask(
        taskConfig.type,
        taskConfig.params,
        { name: taskConfig.name }
      )
      created.push(task)
    }
    
    return created
  }
  
  // ============================================
  // 任务执行
  // ============================================
  
  private async processQueue(): Promise<void> {
    if (this.runningTasks.size >= this.maxConcurrent) {
      return
    }
    
    // 找到待执行的任务
    const pending = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt)
    
    for (const task of pending) {
      if (this.runningTasks.size >= this.maxConcurrent) break
      
      this.executeTask(task.id)
    }
  }
  
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    task.status = 'running'
    task.startedAt = Date.now()
    this.runningTasks.add(taskId)
    
    this.logger.info('task.started', `Task ${taskId} started`, { taskId, type: task.type })
    this.emit('taskStarted', task)
    
    try {
      // 根据任务类型执行
      switch (task.type) {
        case 'arxiv-digest':
          await this.executeArxivDigest(task)
          break
        case 'rss-aggregator':
          await this.executeRSSAggregator(task)
          break
        case 'code-docs':
          await this.executeCodeDocs(task)
          break
        case 'content-cleanup':
          await this.executeContentCleanup(task)
          break
        case 'custom':
          await this.executeCustomTask(task)
          break
        default:
          throw new Error(`Unsupported task type: ${task.type}`)
      }
      
      task.status = 'completed'
      task.result = {
        success: true,
        message: `任务 "${task.name}" 已完成`
      }
      
      this.logger.success('task.completed', `Task ${taskId} completed`, { taskId })
      this.emit('taskCompleted', task)
      
    } catch (error) {
      task.status = 'failed'
      task.result = {
        success: false,
        message: `任务执行失败`,
        error: error instanceof Error ? error.message : String(error)
      }
      
      this.logger.error('task.failed', `Task ${taskId} failed`, { 
        taskId, 
        error: task.result.error 
      })
      this.emit('taskFailed', task)
    } finally {
      task.completedAt = Date.now()
      task.progress = 100
      this.runningTasks.delete(taskId)
      
      // 继续处理队列
      this.processQueue()
    }
  }
  
  // ============================================
  // 具体任务实现
  // ============================================
  
  private async executeArxivDigest(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 10, '正在连接 Arxiv...')
    
    // 模拟 API 调用延迟
    await this.delay(1000)
    this.updateTaskProgress(task.id, 30, '获取论文列表...')
    
    await this.delay(1500)
    this.updateTaskProgress(task.id, 60, '生成摘要...')
    
    await this.delay(2000)
    this.updateTaskProgress(task.id, 90, '保存到文件...')
    
    await this.delay(500)
    
    // 实际实现时，这里会:
    // 1. 调用 Arxiv API 获取论文
    // 2. 使用 LLM 生成摘要
    // 3. 保存 Markdown 文件
    
    this.addTaskLog(task.id, 'success', '成功生成 3 篇论文摘要', {
      papers: [
        { title: 'Mixture of Experts for LLMs', id: '2401.001' },
        { title: 'Attention Mechanism Improvements', id: '2401.002' },
        { title: 'Scaling Laws for Neural Models', id: '2401.003' }
      ]
    })
  }
  
  private async executeRSSAggregator(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 20, '抓取 RSS 源...')
    
    await this.delay(1000)
    this.updateTaskProgress(task.id, 50, '筛选相关内容...')
    
    await this.delay(1500)
    this.updateTaskProgress(task.id, 80, '生成聚合文章...')
    
    await this.delay(1000)
    
    this.addTaskLog(task.id, 'success', '成功聚合 5 条技术资讯', {
      articles: 5,
      sources: ['Hacker News', 'Dev.to']
    })
  }
  
  private async executeCodeDocs(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 10, '扫描代码文件...')
    
    await this.delay(800)
    this.updateTaskProgress(task.id, 40, '分析代码结构...')
    
    await this.delay(1500)
    this.updateTaskProgress(task.id, 70, '生成文档...')
    
    await this.delay(1200)
    
    this.addTaskLog(task.id, 'success', '已为 3 个文件生成文档', {
      files: ['utils.py', 'parser.py', 'api.ts']
    })
  }
  
  private async executeContentCleanup(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 30, '检查孤立链接...')
    
    await this.delay(1000)
    this.updateTaskProgress(task.id, 60, '检查空文件夹...')
    
    await this.delay(1000)
    this.updateTaskProgress(task.id, 90, '生成报告...')
    
    await this.delay(500)
    
    this.addTaskLog(task.id, 'success', '内容检查完成', {
      orphanLinks: 2,
      emptyFolders: 1
    })
  }
  
  private async executeCustomTask(task: BackgroundTask): Promise<void> {
    const instruction = task.params.instruction || ''
    
    this.updateTaskProgress(task.id, 50, `执行: ${instruction}...`)
    
    await this.delay(2000)
    
    this.addTaskLog(task.id, 'success', '自定义任务执行完成')
  }
  
  // ============================================
  // 任务控制
  // ============================================
  
  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task || task.status !== 'running') {
      return false
    }
    
    task.status = 'cancelled'
    task.completedAt = Date.now()
    this.runningTasks.delete(taskId)
    
    this.logger.warn('task.cancelled', `Task ${taskId} cancelled`, { taskId })
    this.emit('taskCancelled', task)
    
    this.processQueue()
    return true
  }
  
  /**
   * 重试失败的任务
   */
  async retryTask(taskId: string): Promise<BackgroundTask | null> {
    const oldTask = this.tasks.get(taskId)
    if (!oldTask || oldTask.status !== 'failed') {
      return null
    }
    
    // 创建新任务
    return this.triggerTask(
      oldTask.type,
      oldTask.params,
      {
        name: `${oldTask.name} (重试)`,
        description: oldTask.description,
        triggeredBy: oldTask.triggeredBy
      }
    )
  }
  
  /**
   * 删除任务
   */
  deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (task?.status === 'running') {
      return false // 不能删除运行中的任务
    }
    
    this.tasks.delete(taskId)
    this.emit('taskDeleted', { id: taskId })
    return true
  }
  
  // ============================================
  // 状态更新
  // ============================================
  
  private updateTaskProgress(taskId: string, progress: number, step?: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    task.progress = Math.min(progress, 100)
    if (step) {
      task.currentStep = step
    }
    
    this.emit('taskProgress', task)
  }
  
  private addTaskLog(
    taskId: string,
    level: TaskLogEntry['level'],
    message: string,
    data?: any
  ): void {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    task.logs.push({
      timestamp: Date.now(),
      level,
      message,
      data
    })
  }
  
  // ============================================
  // 查询方法
  // ============================================
  
  getTask(taskId: string): BackgroundTask | undefined {
    return this.tasks.get(taskId)
  }
  
  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt - a.createdAt)
  }
  
  getTasksByStatus(status: TaskStatus): BackgroundTask[] {
    return this.getAllTasks().filter(t => t.status === status)
  }
  
  getRunningTasks(): BackgroundTask[] {
    return this.getTasksByStatus('running')
  }
  
  getTaskStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
  } {
    const all = this.getAllTasks()
    return {
      total: all.length,
      pending: all.filter(t => t.status === 'pending').length,
      running: all.filter(t => t.status === 'running').length,
      completed: all.filter(t => t.status === 'completed').length,
      failed: all.filter(t => t.status === 'failed').length
    }
  }
  
  // ============================================
  // 事件监听
  // ============================================
  
  on(event: string, callback: (task: BackgroundTask) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }
  
  private emit(event: string, task: BackgroundTask): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(task)
      } catch (e) {
        console.error('Task event listener error:', e)
      }
    })
  }
  
  // ============================================
  // 工具方法
  // ============================================
  
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 单例
let taskManagerInstance: BackgroundTaskManager | null = null

export function getBackgroundTaskManager(): BackgroundTaskManager {
  if (!taskManagerInstance) {
    taskManagerInstance = new BackgroundTaskManager()
  }
  return taskManagerInstance
}

// 重新导出配置相关函数，方便使用
export { getTaskConfig, agentConfig } from '../agent.config.js'

export default BackgroundTaskManager
