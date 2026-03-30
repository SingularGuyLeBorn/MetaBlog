/**
 * MCP Tool: File Operator
 * 文件操作和 Git 管理
 */

import { promises as fs } from 'fs'
import path from 'path'

export interface ArticleContent {
  title: string
  content: string
  frontmatter: Record<string, any>
  images?: { url: string; filename: string }[]
}

export interface FileOperationResult {
  success: boolean
  path: string
  message: string
}

export class FileOperatorTool {
  name = 'file-operator'
  description = '文件操作和 Git 管理'
  
  private basePath: string
  private git: any // simple-git 实例

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath
  }

  // 保存文章到指定路径
  async saveArticle(
    relativePath: string, 
    content: ArticleContent
  ): Promise<FileOperationResult> {
    try {
      const fullPath = path.join(this.basePath, relativePath)
      
      // 确保目录存在
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      
      // 构建 Markdown 内容
      const markdown = this.buildMarkdown(content)
      
      // 写入文件
      await fs.writeFile(fullPath, markdown, 'utf-8')
      
      return {
        success: true,
        path: fullPath,
        message: `Article saved to ${relativePath}`,
      }
    } catch (error) {
      return {
        success: false,
        path: relativePath,
        message: `Failed to save: ${error}`,
      }
    }
  }

  // 下载图片到本地
  async downloadImage(
    imageUrl: string, 
    saveDir: string,
    filename?: string
  ): Promise<string> {
    try {
      // 生成文件名
      const ext = path.extname(new URL(imageUrl).pathname) || '.jpg'
      const name = filename || `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
      
      // 确保目录存在
      const fullDir = path.join(this.basePath, saveDir)
      await fs.mkdir(fullDir, { recursive: true })
      
      const savePath = path.join(fullDir, name)
      
      // 下载图片
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const buffer = await response.arrayBuffer()
      await fs.writeFile(savePath, Buffer.from(buffer))
      
      return path.join(saveDir, name)
    } catch (error) {
      console.error('Image download failed:', error)
      throw error
    }
  }

  // 读取 Frontmatter
  async readFrontmatter(filePath: string): Promise<Record<string, any> | null> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
      if (!frontmatterMatch) return null
      
      // 简单的 YAML 解析
      const frontmatter: Record<string, any> = {}
      const lines = frontmatterMatch[1].split('\n')
      
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/)
        if (match) {
          const [, key, value] = match
          frontmatter[key] = value.replace(/^["']|["']$/g, '')
        }
      }
      
      return frontmatter
    } catch (error) {
      return null
    }
  }

  // 检查文件是否存在
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.basePath, filePath))
      return true
    } catch {
      return false
    }
  }

  // 列出目录内容
  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const fullPath = path.join(this.basePath, dirPath)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      return entries.map(e => e.name)
    } catch {
      return []
    }
  }

  // Git 操作 - 添加文件
  async gitAdd(files: string[]): Promise<void> {
    // 这里应该调用 simple-git
    console.log('Git add:', files)
  }

  // Git 操作 - 提交
  async gitCommit(files: string[], message: string): Promise<void> {
    // 这里应该调用 simple-git
    console.log('Git commit:', message, files)
  }

  // Git 操作 - 推送
  async gitPush(): Promise<void> {
    // 这里应该调用 simple-git
    console.log('Git push')
  }

  // 构建 Markdown 内容
  private buildMarkdown(article: ArticleContent): string {
    const { title, content, frontmatter } = article
    
    // 构建 frontmatter
    const fmLines = Object.entries({
      title,
      ...frontmatter,
      agentGenerated: true,
      agentGeneratedAt: new Date().toISOString(),
    }).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`
      }
      if (typeof value === 'string' && value.includes(':')) {
        return `${key}: "${value}"`
      }
      return `${key}: ${value}`
    })
    
    const fm = fmLines.join('\n')
    
    return `---\n${fm}\n---\n\n# ${title}\n\n${content}\n`
  }

  // 生成唯一的文件名
  generateFilename(title: string, date?: string): string {
    const dateStr = date || new Date().toISOString().split('T')[0]
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50)
    
    return `${dateStr}-${slug}.md`
  }

  // 获取文章的存储建议路径
  suggestPath(content: ArticleContent, platform?: string): string {
    const { title } = content
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    
    // 根据平台或内容类型选择目录
    let section = 'posts'
    if (platform === 'xiaohongshu' || platform === 'weibo') {
      section = 'social'
    } else if (platform === 'bilibili' || platform === 'douyin') {
      section = 'videos'
    } else if (platform === 'zhihu') {
      section = 'knowledge'
    }
    
    const filename = this.generateFilename(title)
    return `docs/sections/${section}/${year}/${month}/${filename}`
  }
}

export const createFileOperator = (basePath?: string) => new FileOperatorTool(basePath)
