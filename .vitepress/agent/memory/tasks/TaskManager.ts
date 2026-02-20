/**
 * TaskManager.ts - 任务历史管理
 * 
 * 负责任务历史的存储、查询、统�?
 * **已文件化**: 任务数据持久化到文件系统
 */
import type { TaskHistory } from '../../core/types'
import { createStorage } from '../FileStorage'

// 存储结构
interface TaskStorage {
  tasks: TaskHistory[]
  version: number
  lastUpdated: string
}

// 创建文件存储实例
const storage = createStorage<TaskStorage>({
  name: 'tasks',
  defaultData: {
    tasks: [],
    version: 1,
    lastUpdated: new Date().toISOString()
  }
})

/**
 * 任务管理�?
 */
export class TaskManager {
  private cacheLoaded: boolean = false
  private maxTasks: number = 1000 // 最大保留任务数

  /**
   * 初始化：从文件加载数�?
   */
  async initialize(): Promise<void> {
    if (this.cacheLoaded) return
    
    await storage.load()
    this.cacheLoaded = true
    
    const data = storage.getData()
    console.log(`[TaskManager] 初始化完成，加载 ${data.tasks.length} 个任务`)
  }

  /**
   * 从服务器加载（兼容旧接口�?
   */
  async loadFromServer(): Promise<void> {
    return this.initialize()
  }

  /**
   * 保存到文�?
   */
  private async persist(): Promise<void> {
    storage.updateData(data => {
      data.lastUpdated = new Date().toISOString()
      
      // 限制任务数量，保留最新的
      if (data.tasks.length > this.maxTasks) {
        data.tasks = data.tasks
          .sort((a, b) => b.completedAt - a.completedAt)
          .slice(0, this.maxTasks)
      }
    })
    await storage.save()
  }

  /**
   * 获取单个任务
   */
  async get(taskId: string): Promise<TaskHistory | null> {
    await this.initialize()
    const data = storage.getData()
    return data.tasks.find(t => t.id === taskId) || null
  }

  /**
   * 保存任务
   */
  async save(history: TaskHistory): Promise<void> {
    await this.initialize()
    
    storage.updateData(data => {
      // 检查是否已存在，存在则更新
      const index = data.tasks.findIndex(t => t.id === history.id)
      if (index >= 0) {
        data.tasks[index] = history
      } else {
        data.tasks.push(history)
      }
    })
    
    await this.persist()
    console.log(`[TaskManager] 保存任务: ${history.id}`)
  }

  /**
   * 列出任务
   */
  async list(limit: number = 100): Promise<TaskHistory[]> {
    await this.initialize()
    const data = storage.getData()
    
    return data.tasks
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit)
  }

  /**
   * 搜索任务
   */
  async search(query: string): Promise<{ content: string; source: string; score: number; metadata: any }[]> {
    await this.initialize()
    const data = storage.getData()
    const lowerQuery = query.toLowerCase()
    
    return data.tasks
      .filter(task => 
        task.description.toLowerCase().includes(lowerQuery) ||
        task.type.toLowerCase().includes(lowerQuery)
      )
      .map(task => ({
        content: task.description,
        source: `task:${task.id}`,
        score: 0.5,
        metadata: {
          title: `Task: ${task.id}`,
          type: task.type,
          result: task.result
        }
      }))
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    total: number
    success: number
    failure: number
    cancelled: number
    totalTokens: number
    totalCost: number
  }> {
    await this.initialize()
    const data = storage.getData()
    
    return data.tasks.reduce((stats, task) => {
      stats.total++
      stats[task.result]++
      stats.totalTokens += task.tokensUsed || 0
      stats.totalCost += task.cost || 0
      return stats
    }, {
      total: 0,
      success: 0,
      failure: 0,
      cancelled: 0,
      totalTokens: 0,
      totalCost: 0
    })
  }

  /**
   * 获取指定时间范围内的任务
   */
  async getByTimeRange(startTime: number, endTime: number): Promise<TaskHistory[]> {
    await this.initialize()
    const data = storage.getData()
    
    return data.tasks.filter(task =>
      task.completedAt >= startTime && task.completedAt <= endTime
    )
  }

  /**
   * 删除任务
   */
  async delete(taskId: string): Promise<void> {
    await this.initialize()
    
    storage.updateData(data => {
      data.tasks = data.tasks.filter(t => t.id !== taskId)
    })
    
    await this.persist()
    console.log(`[TaskManager] 删除任务: ${taskId}`)
  }

  /**
   * 清空所有任�?
   */
  async clear(): Promise<void> {
    await storage.clear()
    console.log('[TaskManager] 清空所有任�?)
  }

  /**
   * 导出所有任�?
   */
  async export(): Promise<string> {
    await this.initialize()
    const data = storage.getData()
    return JSON.stringify(data.tasks, null, 2)
  }

  /**
   * 导入任务
   */
  async import(jsonString: string): Promise<void> {
    const tasks = JSON.parse(jsonString) as TaskHistory[]
    
    storage.updateData(data => {
      // 合并导入的任务，避免重复
      const existingIds = new Set(data.tasks.map(t => t.id))
      for (const task of tasks) {
        if (!existingIds.has(task.id)) {
          data.tasks.push(task)
        }
      }
    })
    
    await this.persist()
    console.log(`[TaskManager] 导入 ${tasks.length} 个任务`)
  }
}

// 单例实例
let instance: TaskManager | null = null

export function getTaskManager(): TaskManager {
  if (!instance) {
    instance = new TaskManager()
  }
  return instance
}

export default TaskManager
