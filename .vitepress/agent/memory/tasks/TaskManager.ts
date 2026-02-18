/**
 * TaskManager.ts - 任务历史管理
 * 负责任务状态的保存、查询、恢复
 */
import type { TaskHistory, IntentType } from '../../core/types'
import { 
  getAllTasks, 
  getTask as getTaskApi, 
  saveTask as saveTaskApi 
} from '../../api/memory'

// 内存缓存
const taskCache = new Map<string, TaskHistory>()

/**
 * 任务管理器
 */
export class TaskManager {
  /**
   * 从服务器加载任务历史
   */
  async loadFromServer(): Promise<void> {
    try {
      const tasks = await getAllTasks()
      for (const t of tasks) {
        taskCache.set(t.id, t)
      }
      console.log(`[TaskManager] Loaded ${tasks.length} tasks`)
    } catch (e) {
      console.warn('[TaskManager] Failed to load from server:', e)
    }
  }

  /**
   * 获取任务历史
   */
  async get(taskId: string): Promise<TaskHistory | null> {
    const cached = taskCache.get(taskId)
    if (cached) return cached
    
    try {
      const task = await getTaskApi(taskId)
      if (task) {
        taskCache.set(taskId, task)
        return task
      }
    } catch (e) {
      console.error('[TaskManager] Failed to get task:', e)
    }
    return null
  }

  /**
   * 保存任务历史
   */
  async save(task: TaskHistory): Promise<void> {
    taskCache.set(task.id, task)
    await saveTaskApi(task)
  }

  /**
   * 创建新任务
   */
  async create(description: string, intentType: IntentType): Promise<TaskHistory> {
    const task: TaskHistory = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: intentType,
      description,
      steps: [],
      result: 'success',
      tokensUsed: 0,
      cost: 0,
      startedAt: Date.now(),
      completedAt: Date.now()
    }
    await this.save(task)
    return task
  }

  /**
   * 列出任务历史（按时间倒序）
   */
  async list(limit: number = 50): Promise<TaskHistory[]> {
    return Array.from(taskCache.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
  }

  /**
   * 搜索任务
   */
  async search(query: string): Promise<TaskHistory[]> {
    const keywords = query.toLowerCase().split(/\s+/)
    return Array.from(taskCache.values()).filter(task => {
      const text = (task.description + ' ' + JSON.stringify(task.steps)).toLowerCase()
      return keywords.some(kw => text.includes(kw))
    })
  }

  /**
   * 获取 Agent 任务历史
   */
  /**
   * 获取 Agent 任务历史
   * @todo 将在任务浏览器中启用
   */
  async getAgentHistories(): Promise<TaskHistory[]> {
    return (await this.list())
      .filter(t => t.id.startsWith('agent_') || t.id.startsWith('task_'))
  }

  /**
   * 删除任务
   */
  async delete(taskId: string): Promise<void> {
    taskCache.delete(taskId)
  }
}

// 导出单例
let instance: TaskManager | null = null
export function getTaskManager(): TaskManager {
  if (!instance) {
    instance = new TaskManager()
  }
  return instance
}

// 类型导出
export type { TaskHistory } from '../../core/types'
