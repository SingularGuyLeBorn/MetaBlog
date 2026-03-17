/**
 * StorageAgent
 * 负责内容存储和文件管理
 */

import { FileOperatorTool, ArticleContent } from '../mcp-tools/file-operator'
import { SocialMediaContent } from '../mcp-tools/social-media-reader'
import { FetchedContent } from '../mcp-tools/url-fetcher'

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

export interface StorageResult {
  success: boolean
  taskId: string
  filePath?: string
  message: string
  gitCommit?: string
}

export interface StorageAgentConfig {
  basePath: string
  defaultSection?: string
  autoCommit?: boolean
  imageDir?: string
}

export class StorageAgent {
  name = 'StorageAgent'
  description = '存储管理 Agent'
  
  private fileOperator: FileOperatorTool
  private config: Required<StorageAgentConfig>

  constructor(config: StorageAgentConfig) {
    this.config = {
      defaultSection: 'posts',
      autoCommit: false,
      imageDir: 'images',
      ...config,
    }
    
    this.fileOperator = new FileOperatorTool(config.basePath)
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

  // 执行存储
  private async executeStore(task: StorageTask): Promise<StorageResult> {
    const { content, targetPath, section, options = {} } = task
    
    // 1. 确定目标路径
    const finalPath = targetPath || this.generatePath(content, section)
    
    // 2. 下载图片
    let localImages: string[] = []
    if (options.downloadImages && content.images.length > 0) {
      localImages = await this.downloadImages(content.images, finalPath)
    }
    
    // 3. 构建文章内容
    const article = this.buildArticle(content, localImages)
    
    // 4. 保存文件
    const saveResult = await this.fileOperator.saveArticle(finalPath, article)
    
    if (!saveResult.success) {
      return {
        success: false,
        taskId: task.id,
        message: saveResult.message,
      }
    }
    
    // 5. Git 提交（如果启用）
    let gitCommit: string | undefined
    if (options.autoCommit || this.config.autoCommit) {
      gitCommit = await this.commitChanges(finalPath, options.commitMessage)
    }
    
    return {
      success: true,
      taskId: task.id,
      filePath: finalPath,
      message: `Content stored to ${finalPath}`,
      gitCommit,
    }
  }

  // 下载图片
  private async downloadImages(imageUrls: string[], articlePath: string): Promise<string[]> {
    const imageDir = path.join(
      path.dirname(articlePath),
      this.config.imageDir
    )
    
    const downloaded: string[] = []
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const filename = `image_${String(i + 1).padStart(2, '0')}.jpg`
        const localPath = await this.fileOperator.downloadImage(
          imageUrls[i],
          imageDir,
          filename
        )
        downloaded.push(localPath)
      } catch (error) {
        console.error(`[StorageAgent] Failed to download image: ${imageUrls[i]}`, error)
      }
    }
    
    return downloaded
  }

  // 生成存储路径
  private generatePath(
    content: FetchedContent | SocialMediaContent,
    section?: string
  ): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    
    // 确定 section
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
    
    // 生成文件名
    const filename = this.fileOperator.generateFilename(content.title)
    
    return `docs/sections/${targetSection}/${year}/${month}/${filename}`
  }

  // 构建文章
  private buildArticle(
    content: FetchedContent | SocialMediaContent,
    localImages: string[]
  ): ArticleContent {
    // 构建 frontmatter
    const frontmatter: Record<string, any> = {
      description: this.generateDescription(content),
      source: content.originalUrl || content.url,
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
    
    // 处理内容中的图片引用
    let processedContent = content.content
    if (localImages.length > 0) {
      // 将远程图片链接替换为本地路径
      localImages.forEach((localPath, index) => {
        if (content.images[index]) {
          processedContent = processedContent.replace(
            content.images[index],
            `./${this.config.imageDir}/${path.basename(localPath)}`
          )
        }
      })
    }
    
    return {
      title: content.title,
      content: processedContent,
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

  // Git 提交
  private async commitChanges(filePath: string, message?: string): Promise<string> {
    const commitMsg = message || `feat: add content from agent - ${path.basename(filePath)}`
    
    try {
      await this.fileOperator.gitAdd([filePath])
      await this.fileOperator.gitCommit([filePath], commitMsg)
      await this.fileOperator.gitPush()
      
      return commitMsg
    } catch (error) {
      console.error('[StorageAgent] Git commit failed:', error)
      return ''
    }
  }

  // 检查文件是否存在
  async fileExists(path: string): Promise<boolean> {
    return this.fileOperator.fileExists(path)
  }

  // 列出目录
  async listDirectory(path: string): Promise<string[]> {
    return this.fileOperator.listDirectory(path)
  }
}

import path from 'path'

export const createStorageAgent = (config: StorageAgentConfig) => new StorageAgent(config)
