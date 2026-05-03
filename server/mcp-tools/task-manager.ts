/**
 * ============================================================================
 * MCP 工具模块 - task-manager
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/mcp-tools
 */


import type {
  Task,
  TaskCreateParams,
  TaskLog,
  TaskQueryOptions,
  TaskStats,
  TaskStep,
  TaskTemplate,
  TaskType,
  TaskUpdateParams
} from '../../src/theme/types/task'

import * as fs from 'fs'
import * as path from 'path'

// 数据目录
const DATA_DIR = path.join(process.cwd(), '.data')
const TASKS_DIR = path.join(DATA_DIR, 'tasks')
const TASKS_INDEX_FILE = path.join(TASKS_DIR, 'index.json')
const TASKS_LOGS_DIR = path.join(DATA_DIR, 'logs', 'tasks')

// 确保目录存在
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// 初始化目录
ensureDir(TASKS_DIR)
ensureDir(TASKS_LOGS_DIR)

// 内置任务模板
export const BUILTIN_TEMPLATES: TaskTemplate[] = [
  {
    id: 'content_fetch',
    name: '内容获取',
    description: '从URL获取内容',
    type: 'content_fetch',
    category: 'content',
    icon: '📥',
    defaultPriority: 'normal',
    defaultConfig: { maxRetries: 3, timeout: 30000, retryDelay: 1000 },
    paramsSchema: [
      { name: 'URL', key: 'url', type: 'string', required: true, description: '要获取的URL' },
      { name: '平台', key: 'platform', type: 'string', required: false, description: '内容平台' }
    ]
  },
  {
    id: 'article_generate',
    name: '文章生成',
    description: '基于内容生成文章',
    type: 'article_generate',
    category: 'content',
    icon: '✍️',
    defaultPriority: 'high',
    defaultConfig: { maxRetries: 2, timeout: 120000, retryDelay: 2000 },
    paramsSchema: [
      { name: '标题', key: 'title', type: 'string', required: true },
      { name: '内容', key: 'content', type: 'string', required: true },
      { name: '章节', key: 'section', type: 'string', required: false, default: 'posts' }
    ]
  },
  {
    id: 'article_publish',
    name: '文章发布',
    description: '发布文章到指定章节',
    type: 'article_publish',
    category: 'content',
    icon: '🚀',
    defaultPriority: 'normal',
    defaultConfig: { maxRetries: 2, timeout: 30000, retryDelay: 1000 },
    paramsSchema: [
      { name: '文件路径', key: 'filePath', type: 'string', required: true },
      { name: '目标章节', key: 'targetSection', type: 'string', required: true }
    ]
  },
  {
    id: 'skill_execute',
    name: '技能执行',
    description: '执行指定技能',
    type: 'skill_execute',
    category: 'agent',
    icon: '🎯',
    defaultPriority: 'normal',
    defaultConfig: { maxRetries: 1, timeout: 60000, retryDelay: 1000 },
    paramsSchema: [
      { name: '技能ID', key: 'skillId', type: 'string', required: true },
      { name: '输入', key: 'input', type: 'string', required: true },
      { name: 'Agent ID', key: 'agentId', type: 'string', required: false }
    ]
  },
  {
    id: 'file_sync',
    name: '文件同步',
    description: '同步文件到存储',
    type: 'file_sync',
    category: 'system',
    icon: '📁',
    defaultPriority: 'low',
    defaultConfig: { maxRetries: 3, timeout: 60000, retryDelay: 2000 },
    paramsSchema: [
      { name: '源路径', key: 'sourcePath', type: 'string', required: true },
      { name: '目标路径', key: 'targetPath', type: 'string', required: true }
    ]
  },
  {
    id: 'git_sync',
    name: 'Git同步',
    description: '同步到Git仓库',
    type: 'git_sync',
    category: 'system',
    icon: '🔄',
    defaultPriority: 'low',
    defaultConfig: { maxRetries: 2, timeout: 60000, retryDelay: 5000 },
    paramsSchema: [
      { name: '提交信息', key: 'message', type: 'string', required: true },
      { name: '文件', key: 'files', type: 'array', required: false }
    ]
  },
  {
    id: 'backup',
    name: '数据备份',
    description: '备份重要数据',
    type: 'backup',
    category: 'maintenance',
    icon: '💾',
    defaultPriority: 'low',
    defaultConfig: { maxRetries: 2, timeout: 300000, retryDelay: 10000 },
    paramsSchema: [
      { name: '备份类型', key: 'backupType', type: 'string', required: false, default: 'full' }
    ]
  },
  {
    id: 'custom',
    name: '自定义任务',
    description: '自定义任务类型',
    type: 'custom',
    category: 'custom',
    icon: '⚙️',
    defaultPriority: 'normal',
    defaultConfig: { maxRetries: 1, timeout: 60000, retryDelay: 1000 },
    paramsSchema: [
      { name: '命令', key: 'command', type: 'string', required: true },
      { name: '参数', key: 'args', type: 'array', required: false }
    ]
  }
]

// 任务管理器类
class TaskManager {
  private tasks: Map<string, Task> = new Map()
  private runningTasks: Map<string, AbortController> = new Map()
  private logs: TaskLog[] = []
  private initialized = false

  constructor() {
    this.loadTasks()
  }

  // 加载任务索引
  private loadTasks() {
    try {
      if (fs.existsSync(TASKS_INDEX_FILE)) {
        const data = JSON.parse(fs.readFileSync(TASKS_INDEX_FILE, 'utf-8'))
        if (data.tasks && Array.isArray(data.tasks)) {
          for (const task of data.tasks) {
            this.tasks.set(task.id, task)
          }
        }
      }
      this.initialized = true
    } catch (error) {
      console.error('[TaskManager] Failed to load tasks:', error)
    }
  }

  // 保存任务索引
  private saveTasks() {
    try {
      const data = {
        tasks: Array.from(this.tasks.values()),
        updatedAt: Date.now()
      }
      fs.writeFileSync(TASKS_INDEX_FILE, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[TaskManager] Failed to save tasks:', error)
    }
  }

  // 生成唯一ID
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  // 添加日志
  private addLog(log: Omit<TaskLog, 'id'>) {
    const entry: TaskLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }
    this.logs.push(entry)

    // 保存到文件
    try {
      const date = new Date().toISOString().split('T')[0]
      const logFile = path.join(TASKS_LOGS_DIR, `${date}.jsonl`)
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.error('[TaskManager] Failed to save log:', error)
    }
  }

  // 创建任务
  createTask(params: TaskCreateParams): Task {
    const template = BUILTIN_TEMPLATES.find(t => t.id === params.type)

    const now = Date.now()
    const task: Task = {
      id: this.generateId(),
      name: params.name,
      description: params.description || '',
      type: params.type,
      status: 'pending',
      priority: params.priority || template?.defaultPriority || 'normal',
      params: params.params || {},
      config: {
        maxRetries: params.config?.maxRetries ?? template?.defaultConfig.maxRetries ?? 3,
        timeout: params.config?.timeout ?? template?.defaultConfig.timeout ?? 60000,
        retryDelay: params.config?.retryDelay ?? template?.defaultConfig.retryDelay ?? 1000
      },
      progress: {
        current: 0,
        total: 100,
        percentage: 0
      },
      steps: [],
      stats: {
        createdAt: now,
        retryCount: 0
      },
      metadata: {
        createdBy: params.metadata?.createdBy || 'system',
        agentId: params.metadata?.agentId,
        sessionId: params.metadata?.sessionId,
        parentTaskId: params.metadata?.parentTaskId,
        tags: params.metadata?.tags || []
      }
    }

    this.tasks.set(task.id, task)
    this.saveTasks()

    this.addLog({
      taskId: task.id,
      timestamp: now,
      level: 'info',
      message: `Task created: ${task.name}`,
      data: { type: task.type, priority: task.priority }
    })

    return task
  }

  // 批量创建任务
  createBatchTasks(tasks: TaskCreateParams[]): Task[] {
    return tasks.map(params => this.createTask(params))
  }

  // 获取任务
  getTask(id: string): Task | undefined {
    return this.tasks.get(id)
  }

  // 查询任务
  queryTasks(options: TaskQueryOptions = {}): { tasks: Task[]; total: number } {
    let tasks = Array.from(this.tasks.values())

    // 应用过滤条件
    if (options.status && options.status.length > 0) {
      tasks = tasks.filter(t => options.status!.includes(t.status))
    }
    if (options.type && options.type.length > 0) {
      tasks = tasks.filter(t => options.type!.includes(t.type))
    }
    if (options.priority && options.priority.length > 0) {
      tasks = tasks.filter(t => options.priority!.includes(t.priority))
    }
    if (options.agentId) {
      tasks = tasks.filter(t => t.metadata.agentId === options.agentId)
    }
    if (options.createdBy) {
      tasks = tasks.filter(t => t.metadata.createdBy === options.createdBy)
    }
    if (options.tags && options.tags.length > 0) {
      tasks = tasks.filter(t => options.tags!.some(tag => t.metadata.tags.includes(tag)))
    }
    if (options.startTime) {
      tasks = tasks.filter(t => t.stats.createdAt >= options.startTime!)
    }
    if (options.endTime) {
      tasks = tasks.filter(t => t.stats.createdAt <= options.endTime!)
    }

    // 排序：先按优先级,再按创建时间
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 }
    tasks.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pDiff !== 0) return pDiff
      return b.stats.createdAt - a.stats.createdAt
    })

    const total = tasks.length

    // 分页
    const offset = options.offset || 0
    const limit = options.limit || 50
    tasks = tasks.slice(offset, offset + limit)

    return { tasks, total }
  }

  // 更新任务
  updateTask(id: string, updates: TaskUpdateParams): Task | null {
    const task = this.tasks.get(id)
    if (!task) return null

    // 只能更新pending状态的任务
    if (task.status !== 'pending') {
      throw new Error('Can only update pending tasks')
    }

    if (updates.name !== undefined) task.name = updates.name
    if (updates.description !== undefined) task.description = updates.description
    if (updates.priority !== undefined) task.priority = updates.priority
    if (updates.params !== undefined) task.params = { ...task.params, ...updates.params }
    if (updates.config !== undefined) task.config = { ...task.config, ...updates.config }
    if (updates.metadata !== undefined) task.metadata = { ...task.metadata, ...updates.metadata }

    this.saveTasks()

    this.addLog({
      taskId: task.id,
      timestamp: Date.now(),
      level: 'info',
      message: `Task updated: ${task.name}`
    })

    return task
  }

  // 删除任务
  deleteTask(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    // 如果任务正在运行,先取消
    if (task.status === 'running') {
      this.cancelTask(id)
    }

    this.tasks.delete(id)
    this.saveTasks()

    this.addLog({
      taskId: id,
      timestamp: Date.now(),
      level: 'info',
      message: `Task deleted: ${task.name}`
    })

    return true
  }

  // 取消任务
  cancelTask(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task) return false

    if (task.status === 'running') {
      const controller = this.runningTasks.get(id)
      if (controller) {
        controller.abort()
        this.runningTasks.delete(id)
      }
    }

    if (task.status === 'pending' || task.status === 'running') {
      task.status = 'cancelled'
      task.stats.completedAt = Date.now()
      if (task.stats.startedAt) {
        task.stats.duration = Date.now() - task.stats.startedAt
      }
      this.saveTasks()

      this.addLog({
        taskId: id,
        timestamp: Date.now(),
        level: 'info',
        message: `Task cancelled: ${task.name}`
      })
    }

    return true
  }

  // 重试任务
  retryTask(id: string): Task | null {
    const task = this.tasks.get(id)
    if (!task) return null

    if (task.status !== 'failed' && task.status !== 'cancelled') {
      throw new Error('Can only retry failed or cancelled tasks')
    }

    task.status = 'pending'
    task.stats.retryCount++
    task.stats.startedAt = undefined
    task.stats.completedAt = undefined
    task.stats.duration = undefined
    task.progress = { current: 0, total: 100, percentage: 0 }
    task.steps = []
    task.result = undefined

    this.saveTasks()

    this.addLog({
      taskId: id,
      timestamp: Date.now(),
      level: 'info',
      message: `Task retried: ${task.name}`,
      data: { retryCount: task.stats.retryCount }
    })

    return task
  }

  // 获取统计
  getStats(): TaskStats {
    const tasks = Array.from(this.tasks.values())
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length
    }
  }

  // 获取模板列表
  getTemplates(): TaskTemplate[] {
    return BUILTIN_TEMPLATES
  }

  // 获取任务日志
  getTaskLogs(taskId: string, limit: number = 100): TaskLog[] {
    return this.logs
      .filter(l => l.taskId === taskId)
      .slice(-limit)
  }

  // 执行任务(简化版,实际应调用相应的处理器)
  async executeTask(id: string): Promise<Task | null> {
    const task = this.tasks.get(id)
    if (!task || task.status !== 'pending') return null

    task.status = 'running'
    task.stats.startedAt = Date.now()
    this.saveTasks()

    const controller = new AbortController()
    this.runningTasks.set(id, controller)

    this.addLog({
      taskId: id,
      timestamp: Date.now(),
      level: 'info',
      message: `Task started: ${task.name}`
    })

    // 设置超时
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, task.config.timeout)

    try {
      // 这里应该调用具体的任务处理器
      // 简化实现：根据任务类型模拟执行
      const result = await this.executeTaskHandler(task, controller.signal)

      task.status = 'completed'
      task.result = { success: true, data: result }
      task.progress = { current: 100, total: 100, percentage: 100 }

      this.addLog({
        taskId: id,
        timestamp: Date.now(),
        level: 'info',
        message: `Task completed: ${task.name}`
      })
    } catch (error: any) {
      if (error.name === 'AbortError') {
        task.status = 'cancelled'
        task.result = { success: false, error: 'Task timeout or cancelled' }

        this.addLog({
          taskId: id,
          timestamp: Date.now(),
          level: 'warn',
          message: `Task cancelled/timeout: ${task.name}`
        })
      } else {
        task.status = 'failed'
        task.result = { success: false, error: error.message }

        this.addLog({
          taskId: id,
          timestamp: Date.now(),
          level: 'error',
          message: `Task failed: ${task.name}`,
          data: { error: error.message }
        })

        // 自动重试
        if (task.stats.retryCount < task.config.maxRetries) {
          setTimeout(() => this.retryTask(id), task.config.retryDelay)
        }
      }
    } finally {
      clearTimeout(timeoutId)
      this.runningTasks.delete(id)
      task.stats.completedAt = Date.now()
      if (task.stats.startedAt) {
        task.stats.duration = task.stats.completedAt - task.stats.startedAt
      }
      this.saveTasks()
    }

    return task
  }

  // 任务执行处理器(简化版)
  private async executeTaskHandler(task: Task, signal: AbortSignal): Promise<any> {
    // 模拟任务执行步骤
    const steps = this.getTaskSteps(task.type)
    task.steps = steps

    for (let i = 0; i < steps.length; i++) {
      if (signal.aborted) {
        throw new Error('Task aborted')
      }

      const step = steps[i]
      step.status = 'running'
      step.startTime = Date.now()

      // 更新进度
      task.progress.current = Math.floor((i / steps.length) * 100)
      task.progress.percentage = task.progress.current
      this.saveTasks()

      // 模拟执行时间
      await new Promise(resolve => setTimeout(resolve, 500))

      step.status = 'completed'
      step.endTime = Date.now()

      this.addLog({
        taskId: task.id,
        timestamp: Date.now(),
        level: 'debug',
        message: `Step completed: ${step.name}`
      })
    }

    return { executed: true, type: task.type, params: task.params }
  }

  // 获取任务步骤
  private getTaskSteps(type: TaskType): TaskStep[] {
    const stepDefinitions: Record<TaskType, string[]> = {
      content_fetch: ['验证URL', '获取内容', '解析内容', '保存结果'],
      content_process: ['读取内容', '处理内容', '生成输出', '保存结果'],
      article_generate: ['分析需求', '生成大纲', '撰写内容', '格式化输出'],
      article_publish: ['验证文章', '选择目标', '发布文章', '更新索引'],
      skill_execute: ['加载技能', '准备上下文', '执行技能', '处理结果'],
      agent_chat: ['准备对话', '调用Agent', '处理响应', '保存消息'],
      file_sync: ['扫描文件', '比较差异', '同步文件', '验证结果'],
      git_sync: ['检查状态', '添加文件', '提交更改', '推送分支'],
      backup: ['扫描数据', '压缩备份', '上传存储', '验证备份'],
      custom: ['准备环境', '执行命令', '处理输出', '清理环境']
    }

    const names = stepDefinitions[type] || ['执行任务']
    return names.map((name, index) => ({
      id: `step_${index}`,
      name,
      status: 'pending' as const
    }))
  }

  // 清理旧任务
  cleanup(olderThanDays: number = 7): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    let count = 0

    for (const [id, task] of this.tasks) {
      if (task.stats.completedAt && task.stats.completedAt < cutoff) {
        this.tasks.delete(id)
        count++
      }
    }

    if (count > 0) {
      this.saveTasks()
    }

    return count
  }
}

// 单例实例
let taskManager: TaskManager | null = null

/**
 * 获取TaskManager
 *
 * @returns 返回值(TaskManager)
 */
export function getTaskManager(): TaskManager {
  if (!taskManager) {
    taskManager = new TaskManager()
  }
  return taskManager
}

export { TaskManager }

