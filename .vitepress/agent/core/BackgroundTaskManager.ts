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
  private static readonly STORAGE_KEY = 'metablog_background_tasks'
  private static readonly MAX_HISTORY = 50
  
  private tasks: Map<string, BackgroundTask> = new Map()
  private runningTasks: Set<string> = new Set()
  private abortControllers: Map<string, AbortController> = new Map()
  private maxConcurrent: number = 2
  private logger = getStructuredLogger()
  
  // 监听器
  private listeners: Map<string, Set<(task: BackgroundTask) => void>> = new Map()
  private isProcessingQueue: boolean = false
  
  constructor() {
    this.loadTasks()
  }
  
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
    this.saveTasks()
    
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
    // 调度锁，防止并发调用导致同一任务被启动两次
    if (this.isProcessingQueue) return
    this.isProcessingQueue = true
    
    try {
      if (this.runningTasks.size >= this.maxConcurrent) {
        return
      }
      
      // 找到待执行的任务
      const pending = Array.from(this.tasks.values())
        .filter(t => t.status === 'pending')
        .sort((a, b) => a.createdAt - b.createdAt)
      
      for (const task of pending) {
        if (this.runningTasks.size >= this.maxConcurrent) break
        
        // 先标记为 running，再 fire-and-forget，防止重复启动
        task.status = 'running'
        task.startedAt = Date.now()
        this.runningTasks.add(task.id)
        this.executeTask(task.id)
      }
    } finally {
      this.isProcessingQueue = false
    }
  }
  
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return
    
    // 创建 AbortController 用于真正中断任务
    const controller = new AbortController()
    this.abortControllers.set(taskId, controller)
    
    // 状态已在 processQueue 中设置，此处只记录日志
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
      // 区分取消和真正的失败
      if (error instanceof Error && error.name === 'AbortError') {
        // 已在 cancelTask 中处理了状态
        this.logger.info('task.aborted', `Task ${taskId} was aborted`, { taskId })
      } else {
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
      }
    } finally {
      task.completedAt = Date.now()
      task.progress = 100
      this.runningTasks.delete(taskId)
      this.abortControllers.delete(taskId)
      this.saveTasks()
      
      // 继续处理队列
      this.processQueue()
    }
  }
  
  // ============================================
  // 具体任务实现
  // ============================================
  
  private async executeArxivDigest(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 10, '初始化工具...')
    
    const { WebSearchTool } = await import('../tools/WebSearch')
    const { getLLMManager } = await import('../llm')
    const { saveFile } = await import('../api/files')
    
    this.updateTaskProgress(task.id, 30, '搜索 Arxiv 最新论文...')
    const searcher = new WebSearchTool()
    const categories: string[] = task.params.categories || ['cs.AI']
    const query = categories.map(c => `cat:${c}`).join(' OR ')
    const maxPapers = task.params.maxPapers || 5
    
    const results = await searcher.searchArxiv(query, maxPapers)
    if (results.length === 0) {
      this.addTaskLog(task.id, 'warn', '未找到匹配的论文')
      return
    }
    
    this.updateTaskProgress(task.id, 60, '提取内容并生成摘要...')
    const llm = getLLMManager()
    const prompt = `你是一个专业的 AI 领域研究员。请为以下 ${results.length} 篇 Arxiv 论文生成一份Markdown格式的中文摘要简报。
结构要求：
1. 简要开场白介绍本次收录的内容概况。
2. 逐篇详细列出核心亮点（包括原文链接、一句话总结）。
请只输出符合格式的 Markdown 内容。

论文数据：
${JSON.stringify(results.map(r => ({ title: r.title, url: r.link, summary: r.snippet })), null, 2)}`

    const aiRes = await llm.chat({ messages: [{ role: 'user', content: prompt }] })
    
    this.updateTaskProgress(task.id, 80, '保存报告文件...')
    const dateStr = new Date().toISOString().split('T')[0]
    const basePath = task.params.targetPath || 'posts/ai-digest/'
    const filePath = `docs/sections/${basePath}arxiv-${dateStr}.md`
    
    let content = `---\ntitle: Arxiv AI 论文速递 (${dateStr})\ndate: ${dateStr}\ncategories: [AI, Papers]\n---\n\n# Arxiv AI 论文速递 (${dateStr})\n\n${aiRes.content}`
    
    try {
      await saveFile(filePath, content)
      this.addTaskLog(task.id, 'success', `成功聚合 ${results.length} 篇论文并保存到 ${filePath}`, { papers: results.map(r => ({ title: r.title, url: r.link })) })
    } catch (e) {
      this.addTaskLog(task.id, 'error', `保存文件失败: ${String(e)}`)
      throw e
    }
  }

  private async executeRSSAggregator(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 10, '初始化工具...')
    const { WebSearchTool } = await import('../tools/WebSearch')
    const { getLLMManager } = await import('../llm')
    const { saveFile } = await import('../api/files')
    
    const searcher = new WebSearchTool()
    const feeds: any[] = task.params.feeds || []
    const enabledFeeds = feeds.filter(f => f.enabled)
    
    if (enabledFeeds.length === 0) {
      this.addTaskLog(task.id, 'warn', '没有启用的 RSS 源')
      return
    }

    this.updateTaskProgress(task.id, 30, '抓取 RSS 源...')
    let feedContents = ''
    for (const feed of enabledFeeds) {
      try {
        const xml = await searcher.fetchContent(feed.url)
        feedContents += `\n>> 来源: ${feed.name}\n${xml.substring(0, 3000)}\n`
      } catch (e) {
        this.addTaskLog(task.id, 'warn', `无法抓取 ${feed.name}: ${String(e)}`)
      }
    }
    
    if (!feedContents) throw new Error('所有 RSS 源抓取失败')

    this.updateTaskProgress(task.id, 60, '利用 LLM 提取技术新闻...')
    const llm = getLLMManager()
    const keywords: string[] = task.params.keywords || ['AI', 'Tech']
    const prompt = `你是一个技术编辑。根据以下的 RSS 内容提取出与 ${keywords.join(', ')} 相关的最有价值的技术资讯。整理为Markdown新闻简报：
- 每条资讯有简明标题、来源链接、摘要。

RSS 源内容：
${feedContents}`

    const aiRes = await llm.chat({ messages: [{ role: 'user', content: prompt }] })
    
    this.updateTaskProgress(task.id, 80, '保存聚合文章...')
    const dateStr = new Date().toISOString().split('T')[0]
    const basePath = task.params.targetPath || 'posts/news/'
    const filePath = `docs/sections/${basePath}tech-news-${dateStr}.md`
    
    let content = `---\ntitle: 科技资讯简报 (${dateStr})\ndate: ${dateStr}\ncategories: [News, Tech]\n---\n\n# 科技资讯简报 (${dateStr})\n\n${aiRes.content}`
    
    try {
      await saveFile(filePath, content)
      this.addTaskLog(task.id, 'success', `成功聚合技术资讯并保存到 ${filePath}`)
    } catch (e) {
      this.addTaskLog(task.id, 'error', `保存文件失败: ${String(e)}`)
      throw e
    }
  }

  private async executeCodeDocs(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 10, '扫描代码文件...')
    const { listDirectory, readFile, saveFile } = await import('../api/files')
    const { getLLMManager } = await import('../llm')
    
    const sourcePath = task.params.sourcePath || './code/'
    const targetPath = task.params.targetPath || 'knowledge/code-docs/'
    
    let files
    try {
      files = await listDirectory(`docs/${sourcePath}`)
    } catch (e) {
      throw new Error(`无法读取目录 docs/${sourcePath}: ${String(e)}`)
    }

    const targetFiles = files.filter(f => f.type === 'file' && (f.name.endsWith('.ts') || f.name.endsWith('.js') || f.name.endsWith('.py')))
    if (targetFiles.length === 0) {
      this.addTaskLog(task.id, 'warn', '没有找到需要生成文档的代码文件')
      return
    }

    const llm = getLLMManager()
    let processed = 0
    
    for (const file of targetFiles) {
      if (this.abortControllers.get(task.id)?.signal.aborted) throw new Error('AbortError')
      
      this.updateTaskProgress(task.id, 40 + Math.floor((processed / targetFiles.length) * 40), `分析文件 ${file.name}...`)
      try {
        const fileContent = await readFile(file.path)
        const prompt = `为以下代码生成针对开发者的技术文档（Markdown）：\n文件名：${file.name}\n\n代码内容：\n\`\`\`\n${fileContent.substring(0, 5000)}\n\`\`\`\n\n描述此文件的职责、导出的主要函数及其参数说明。`

        const docRes = await llm.chat({ messages: [{ role: 'user', content: prompt }] })
        const outPath = `docs/sections/${targetPath}${file.name}.md`
        let fullDoc = `---\ntitle: ${file.name} 代码说明\n---\n\n${docRes.content}`
        
        await saveFile(outPath, fullDoc)
        processed++
      } catch (e) {
        this.addTaskLog(task.id, 'warn', `文件 ${file.name} 处理失败: ${String(e)}`)
      }
    }
    
    this.addTaskLog(task.id, 'success', `成功为 ${processed} 个文件生成了代码文档`)
  }

  private async executeContentCleanup(task: BackgroundTask): Promise<void> {
    this.updateTaskProgress(task.id, 30, '检查孤立链接...')
    const { listDirectory, readFile } = await import('../api/files')
    
    const sections = ['posts', 'knowledge', 'resources']
    let issueCount = 0
    
    for (const sec of sections) {
      try {
        const items = await listDirectory(`docs/sections/${sec}`)
        for (const item of items) {
          if (item.type === 'file' && item.name.endsWith('.md')) {
            const content = await readFile(item.path)
            if (content.includes('TODO:') || content.includes('[]()')) {
               issueCount++
               this.addTaskLog(task.id, 'warn', `找到待完善内容的文件`, { file: item.path })
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
    
    this.updateTaskProgress(task.id, 90, '生成报告...')
    this.addTaskLog(task.id, 'success', '内容检查完成', { potentialIssues: issueCount })
  }

  private async executeCustomTask(task: BackgroundTask): Promise<void> {
    const instruction = task.params.instruction || ''
    if (!instruction) throw new Error('未提供自定义任务指令')
    
    this.updateTaskProgress(task.id, 10, `执行: ${instruction}...`)
    
    const { getLLMManager } = await import('../llm')
    const llm = getLLMManager()
    const prompt = `您正在执行后台自动任务。用户的任务指令如下：\n---\n${instruction}\n---\n请立刻输出你处理后的结果代码或文本摘要。`
    
    this.updateTaskProgress(task.id, 50, `执行 LLM 生成...`)
    const res = await llm.chat({ messages: [{ role: 'user', content: prompt }] })
    
    this.updateTaskProgress(task.id, 90, `记录结果...`)
    this.addTaskLog(task.id, 'success', '自定义任务执行完成', { output: res.content.substring(0, 200) + '...' })
    
    if (task.result) {
      task.result.output = res.content
    }
  }
  
  // ============================================
  // 任务控制
  // ============================================
  
  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task || (task.status !== 'running' && task.status !== 'pending')) {
      return false
    }
    
    task.status = 'cancelled'
    task.completedAt = Date.now()
    this.runningTasks.delete(taskId)
    
    // 通过 AbortController 真正中断正在运行的异步操作
    const controller = this.abortControllers.get(taskId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(taskId)
    }
    
    this.logger.warn('task.cancelled', `Task ${taskId} cancelled`, { taskId })
    this.emit('taskCancelled', task)
    this.saveTasks()
    
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
    if (!task) return false
    if (task.status === 'running') {
      return false // 不能删除运行中的任务
    }
    
    this.tasks.delete(taskId)
    this.emit('taskDeleted', task)
    this.saveTasks()
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
  
  /**
   * 可中断的延迟 — 配合 AbortController 实现真正取消
   */
  private abortableDelay(ms: number, taskId: string): Promise<void> {
    const controller = this.abortControllers.get(taskId)
    if (!controller) return this.delay(ms)
    
    return new Promise((resolve, reject) => {
      if (controller.signal.aborted) {
        reject(new DOMException('Task cancelled', 'AbortError'))
        return
      }
      const timer = setTimeout(resolve, ms)
      controller.signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Task cancelled', 'AbortError'))
      }, { once: true })
    })
  }
  
  // ============================================
  // 任务持久化
  // ============================================
  
  /**
   * 保存任务状态到 localStorage
   * 只保存已终结的任务（completed/failed/cancelled）
   */
  private saveTasks(): void {
    try {
      if (typeof localStorage === 'undefined') return
      
      const terminalStates = ['completed', 'failed', 'cancelled']
      const tasksToSave = Array.from(this.tasks.values())
        .filter(t => terminalStates.includes(t.status))
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
        .slice(0, BackgroundTaskManager.MAX_HISTORY)
      
      localStorage.setItem(
        BackgroundTaskManager.STORAGE_KEY,
        JSON.stringify(tasksToSave)
      )
    } catch {
      // localStorage 不可用或已满，静默失败
    }
  }
  
  /**
   * 从 localStorage 恢复任务历史
   * running/pending 状态的任务不恢复（避免僵尸任务）
   */
  private loadTasks(): void {
    try {
      if (typeof localStorage === 'undefined') return
      
      const saved = localStorage.getItem(BackgroundTaskManager.STORAGE_KEY)
      if (!saved) return
      
      const tasks: BackgroundTask[] = JSON.parse(saved)
      for (const task of tasks) {
        this.tasks.set(task.id, task)
      }
      
      this.logger.info('tasks.loaded', `Loaded ${tasks.length} tasks from storage`)
    } catch {
      // 解析失败，重新开始
    }
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
