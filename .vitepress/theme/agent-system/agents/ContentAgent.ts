/**
 * ContentAgent
 * 负责从各种来源提取内容
 */

import { urlFetcher, FetchedContent } from '../mcp-tools/url-fetcher'
import { socialMediaReader, SocialMediaContent } from '../mcp-tools/social-media-reader'
import { browserAutomation, BrowserAutomationResult, BrowseOptions } from '../mcp-tools/browser-automation'

export interface ContentTask {
  id: string
  url: string
  platform?: string
  priority?: 'high' | 'normal' | 'low'
  callback?: (result: ContentResult) => void
}

export interface ContentResult {
  success: boolean
  taskId: string
  url: string
  content?: FetchedContent | SocialMediaContent
  error?: string
  processedAt: string
}

export interface ContentAgentConfig {
  maxConcurrent?: number
  retryAttempts?: number
  retryDelay?: number
  defaultPriority?: 'high' | 'normal' | 'low'
  // Browser Automation 配置
  useBrowser?: boolean       // 是否使用浏览器自动化
  demoMode?: boolean         // 演示模式（返回模拟数据）
  takeScreenshots?: boolean  // 是否截图
  scrollCount?: number       // 滚动次数
}

export class ContentAgent {
  name = 'ContentAgent'
  description = '内容提取 Agent'
  
  private config: Required<ContentAgentConfig>
  private queue: ContentTask[] = []
  private processing: Set<string> = new Set()
  private results: Map<string, ContentResult> = new Map()

  constructor(config: ContentAgentConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 3,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000,
      defaultPriority: config.defaultPriority || 'normal',
      useBrowser: config.useBrowser || false,
      demoMode: config.demoMode || true,  // 默认演示模式
      takeScreenshots: config.takeScreenshots || false,
      scrollCount: config.scrollCount || 3,
    }
  }

  // 添加提取任务
  async addTask(task: Omit<ContentTask, 'id'>): Promise<string> {
    const id = `content_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    const fullTask: ContentTask = {
      ...task,
      id,
      priority: task.priority || this.config.defaultPriority,
    }
    
    this.queue.push(fullTask)
    this.sortQueue()
    
    // 尝试处理队列
    this.processQueue()
    
    return id
  }

  // 批量添加任务
  async addTasks(tasks: Omit<ContentTask, 'id'>[]): Promise<string[]> {
    return Promise.all(tasks.map(task => this.addTask(task)))
  }

  // 获取任务结果
  getResult(taskId: string): ContentResult | undefined {
    return this.results.get(taskId)
  }

  // 获取所有结果
  getAllResults(): ContentResult[] {
    return Array.from(this.results.values())
  }

  // 获取队列状态
  getStatus(): {
    queueLength: number
    processing: number
    completed: number
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      completed: this.results.size,
    }
  }

  // 处理队列
  private async processQueue(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrent) {
      return
    }

    const task = this.queue.shift()
    if (!task) return

    this.processing.add(task.id)

    try {
      const result = await this.executeTask(task)
      this.results.set(task.id, result)
      
      if (task.callback) {
        task.callback(result)
      }
    } catch (error) {
      const failedResult: ContentResult = {
        success: false,
        taskId: task.id,
        url: task.url,
        error: String(error),
        processedAt: new Date().toISOString(),
      }
      this.results.set(task.id, failedResult)
      
      if (task.callback) {
        task.callback(failedResult)
      }
    } finally {
      this.processing.delete(task.id)
      // 继续处理队列
      this.processQueue()
    }
  }

  // 执行单个任务
  private async executeTask(task: ContentTask): Promise<ContentResult> {
    console.log(`[ContentAgent] Processing: ${task.url}`)

    let attempts = 0
    let lastError: Error | null = null

    while (attempts < this.config.retryAttempts) {
      try {
        const content = await this.fetchContent(task.url, task.platform)
        
        return {
          success: true,
          taskId: task.id,
          url: task.url,
          content,
          processedAt: new Date().toISOString(),
        }
      } catch (error) {
        lastError = error as Error
        attempts++
        
        if (attempts < this.config.retryAttempts) {
          console.log(`[ContentAgent] Retry ${attempts}/${this.config.retryAttempts} for ${task.url}`)
          await this.delay(this.config.retryDelay)
        }
      }
    }

    throw lastError || new Error('Failed to fetch content')
  }

  // 获取内容
  private async fetchContent(url: string, platform?: string): Promise<FetchedContent | SocialMediaContent> {
    // 检测是否为社交媒体
    const isSocial = socialMediaReader.isSupported(url)
    
    if (isSocial && platform) {
      // 使用社交媒体读取器
      return socialMediaReader.execute({
        platform: platform as any,
        url,
      })
    }
    
    // 使用通用 URL 提取器
    return urlFetcher.execute({ url, type: 'auto' })
  }

  // 按优先级排序队列
  private sortQueue(): void {
    const priorityMap = { high: 0, normal: 1, low: 2 }
    this.queue.sort((a, b) => {
      const pA = priorityMap[a.priority || 'normal']
      const pB = priorityMap[b.priority || 'normal']
      return pA - pB
    })
  }

  // 延迟
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 清空队列
  clearQueue(): void {
    this.queue = []
  }

  // 清空结果
  clearResults(): void {
    this.results.clear()
  }

  // 取消任务
  cancelTask(taskId: string): boolean {
    const index = this.queue.findIndex(t => t.id === taskId)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }
}

// 创建默认实例
export const createContentAgent = (config?: ContentAgentConfig) => new ContentAgent(config)
