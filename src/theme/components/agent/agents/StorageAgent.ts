/**
 * ============================================================================
 * 组件逻辑 - StorageAgent
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/components
 */


import type { ArticleContent, FetchedContent, SocialMediaContent } from '@/theme/types/agent'

/**
 * StorageTask 接口定义
 *
 */
export interface StorageTask {
  id: string
  content: FetchedContent | SocialMediaContent
  targetPath?: string
  section?: 'posts' | 'resources' | 'knowledge' | 'social' | 'videos'
  options?: {
    downloadImages?: boolean
    autoCommit?: boolean
    commitMessage?: string
  }
}

/**
 * StorageResult 接口定义
 *
 */
export interface StorageResult {
  success: boolean
  taskId: string
  filePath?: string
  message: string
  gitCommit?: string
}

/**
 * StorageAgentConfig 接口定义
 *
 */
export interface StorageAgentConfig {
  basePath: string
  defaultSection?: string
  autoCommit?: boolean
  imageDir?: string
}

// API call helper
async function callStorageAPI(action: string, data: any): Promise<any> {
  const response = await fetch('/api/agent/storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data })
  })
  if (!response.ok) {
    throw new Error(`Storage API error: ${response.statusText}`)
  }
  return response.json()
}

/**
 * StorageAgent 类
 *
 */
export class StorageAgent {
  name = 'StorageAgent'
  description = '存储管理 Agent'

  private config: Required<StorageAgentConfig>

  constructor(config: StorageAgentConfig) {
    this.config = {
      defaultSection: 'posts',
      autoCommit: false,
      imageDir: 'images',
      ...config,
    }
  }

  // 存储内容
  async store(task: Omit<StorageTask, 'id'>): Promise<StorageResult> {
    const id = `storage_${Date.now()}_${Math.random().toString(36).slice(2)}`

    try {
      const fullTask: StorageTask = { ...task, id }
      return await this.executeStore(fullTask)
    } catch (error) {
      return {
        success: false,
        taskId: id,
        message: `Storage failed: ${error}`,
      }
    }
  }

  // 批量存储
  async storeBatch(tasks: Omit<StorageTask, 'id'>[]): Promise<StorageResult[]> {
    return Promise.all(tasks.map(task => this.store(task)))
  }

  // 执行存储 - 通过 API 调用服务器端
  private async executeStore(task: StorageTask): Promise<StorageResult> {
    const article = this.buildArticle(task.content, [])

    return callStorageAPI('saveArticle', {
      path: task.targetPath || this.generatePath(task.content, task.section),
      article,
      options: task.options
    })
  }

  // 生成存储路径
  private generatePath(
    content: FetchedContent | SocialMediaContent,
    section?: string
  ): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')

    let targetSection = section || this.config.defaultSection

    // 根据平台自动判断 section
    if (!section && 'platform' in content) {
      const platformMap: Record<string, string> = {
        xiaohongshu: 'social',
        weibo: 'social',
        bilibili: 'videos',
        douyin: 'videos',
        youtube: 'videos',
        zhihu: 'knowledge',
        twitter: 'social',
      }
      targetSection = platformMap[content.platform] || this.config.defaultSection
    }

    // 生成文件名 (简单版本)
    const filename = content.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50) + '.md'

    return `docs/sections/${targetSection}/${year}/${month}/${filename}`
  }

  // 类型守卫
  private isSocialMediaContent(content: FetchedContent | SocialMediaContent): content is SocialMediaContent {
    return 'originalUrl' in content
  }

  // 构建文章
  private buildArticle(
    content: FetchedContent | SocialMediaContent,
    localImages: string[]
  ): ArticleContent {
    const sourceUrl = this.isSocialMediaContent(content) ? content.originalUrl : content.url

    const frontmatter: Record<string, any> = {
      title: content.title,
      description: this.generateDescription(content),
      source: sourceUrl,
      platform: 'platform' in content ? content.platform : 'web',
      author: content.author || 'Unknown',
      crawlDate: new Date().toISOString(),
      tags: content.tags || [],
      status: 'draft',
    }

    if ('publishDate' in content && content.publishDate) {
      frontmatter.publishDate = content.publishDate
    }

    if ('likes' in content) {
      frontmatter.socialStats = {
        likes: content.likes,
        comments: content.comments,
        shares: content.shares || 0,
      }
    }

    return {
      title: content.title,
      content: content.content,
      frontmatter,
      images: localImages.map((path, index) => ({
        url: content.images[index] || '',
        filename: path,
      })),
    }
  }

  // 生成描述
  private generateDescription(content: FetchedContent | SocialMediaContent): string {
    const text = content.content
    const cleanText = text.replace(/[#*\[\]()]/g, '').slice(0, 150)
    return cleanText + (text.length > 150 ? '...' : '')
  }

  // 检查文件是否存在
  async fileExists(path: string): Promise<boolean> {
    const result = await callStorageAPI('fileExists', { path })
    return result.exists
  }

  // 列出目录
  async listDirectory(path: string): Promise<string[]> {
    return callStorageAPI('listDirectory', { path })
  }
}

/**
 * 创建StorageAgent
 *
 * @param config - 参数(StorageAgentConfig)
 * @returns 返回值
 */
export const createStorageAgent = (config: StorageAgentConfig) => new StorageAgent(config)
