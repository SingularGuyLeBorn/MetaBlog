/**
 * ============================================================================
 * 组件逻辑 - ContentAgent
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/components
 */


import type { FetchedContent, SocialMediaContent } from '@/theme/types/agent'

/**
 * ContentTask 接口定义
 *
 */
export interface ContentTask {
  id: string
  url: string
  platform?: string
  priority?: 'high' | 'normal' | 'low'
  callback?: (result: ContentResult) => void
}

/**
 * ContentResult 接口定义
 *
 */
export interface ContentResult {
  success: boolean
  taskId: string
  url: string
  content?: FetchedContent | SocialMediaContent
  error?: string
  processedAt: string
}

/**
 * ContentAgentConfig 接口定义
 *
 */
export interface ContentAgentConfig {
  maxConcurrent?: number
  retryAttempts?: number
  retryDelay?: number
}

// API call helper
async function callContentAPI(action: string, data: any): Promise<any> {
  const response = await fetch('/api/agent/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data })
  })
  if (!response.ok) {
    throw new Error(`Content API error: ${response.statusText}`)
  }
  return response.json()
}

/**
 * ContentAgent 类
 *
 */
export class ContentAgent {
  name = 'ContentAgent'
  description = '内容获取 Agent'

  private config: Required<ContentAgentConfig>
  private taskQueue: ContentTask[] = []
  private activeTasks = 0

  constructor(config: ContentAgentConfig = {}) {
    this.config = {
      maxConcurrent: 3,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    }
  }

  // 获取内容
  async fetch(url: string, options?: { platform?: string }): Promise<ContentResult> {
    const task: ContentTask = {
      id: `content_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      url,
      platform: options?.platform,
      priority: 'normal',
    }

    return this.processTask(task)
  }

  // 批量获取
  async fetchBatch(urls: string[], options?: { platform?: string }): Promise<ContentResult[]> {
    return Promise.all(urls.map(url => this.fetch(url, options)))
  }

  // 处理任务 - 通过 API 调用
  private async processTask(task: ContentTask): Promise<ContentResult> {
    try {
      const result = await callContentAPI('fetch', {
        url: task.url,
        platform: task.platform
      })

      return {
        success: true,
        taskId: task.id,
        url: task.url,
        content: result.content,
        processedAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        url: task.url,
        error: String(error),
        processedAt: new Date().toISOString(),
      }
    }
  }

  // 添加任务到队列
  addTask(task: Omit<ContentTask, 'id'>): string {
    const id = `content_${Date.now()}_${Math.random().toString(36).slice(2)}`
    this.taskQueue.push({ ...task, id })
    return id
  }

  // 获取队列状态
  getQueueStatus() {
    return {
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks,
      maxConcurrent: this.config.maxConcurrent,
    }
  }
}

/**
 * 创建ContentAgent
 *
 * @param config - 参数
 * @returns 返回值
 */
export const createContentAgent = (config?: ContentAgentConfig) => new ContentAgent(config)
