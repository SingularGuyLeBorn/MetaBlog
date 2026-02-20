/**
 * Articles API Routes - 文章管理服务端路由
 * 提供文章列表、搜索、创建、发布等功能
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, extname, basename, dirname } from 'path'

const router = Router()
const DOCS_PATH = join(process.cwd(), 'docs')
const SECTIONS_PATH = join(DOCS_PATH, 'sections')

// 统一响应类型
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    count?: number
    page?: number
    total?: number
  }
}

// 文章元数据接口
interface ArticleMeta {
  path: string
  title: string
  description?: string
  tags: string[]
  date?: string
  updatedAt?: string
  wordCount: number
  isPublished: boolean
}

// Frontmatter 接口
interface FrontmatterData {
  title?: string
  description?: string
  date?: string
  updatedAt?: string
  tags?: string | string[]
  [key: string]: string | string[] | undefined
}

// 递归扫描文章
async function scanArticles(dir: string, basePath: string = ''): Promise<ArticleMeta[]> {
  const articles: ArticleMeta[] = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = join(basePath, entry.name)
      
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        // 递归扫描子目录
        const subArticles = await scanArticles(fullPath, relativePath)
        articles.push(...subArticles)
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
        // 读取 Markdown 文件
        try {
          const content = await fs.readFile(fullPath, 'utf-8')
          const meta = extractMeta(content, relativePath)
          articles.push(meta)
        } catch (e) {
          console.warn(`Failed to read article: ${fullPath}`)
        }
      }
    }
  } catch (e) {
    console.error(`Failed to scan directory: ${dir}`)
  }
  
  return articles
}

// 提取文章元数据
function extractMeta(content: string, relativePath: string): ArticleMeta {
  // 解析 frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const meta: FrontmatterData = {}
  
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    frontmatter.split('\n').forEach(line => {
      const match = line.match(/^(\w+):\s*(.+)$/)
      if (match) {
        const [, key, value] = match
        // 处理数组类型 (简化版)
        if (value.startsWith('[') && value.endsWith(']')) {
          meta[key] = value
            .slice(1, -1)
            .split(',')
            .map(v => v.trim().replace(/^["']|["']$/g, ''))
        } else {
          meta[key] = value.replace(/^["']|["']$/g, '')
        }
      }
    })
  }
  
  // 提取标题（第一个 # 开头的行）
  const titleMatch = content.match(/^#\s+(.+)$/m)
  const title = meta.title || titleMatch?.[1] || basename(relativePath, '.md')
  
  // 处理 tags
  let tags: string[] = []
  if (meta.tags) {
    if (Array.isArray(meta.tags)) {
      tags = meta.tags
    } else if (typeof meta.tags === 'string') {
      tags = meta.tags.split(',').map(t => t.trim())
    }
  }
  
  // 计算字数
  const wordCount = content.replace(/\s+/g, '').length
  
  return {
    path: relativePath.replace(/\\/g, '/'),
    title,
    description: meta.description,
    tags,
    date: meta.date,
    updatedAt: meta.updatedAt,
    wordCount,
    isPublished: !relativePath.includes('/drafts/')
  }
}

// ============================================
// API 路由
// ============================================

// 获取所有文章列表
router.get('/list', async (req, res) => {
  try {
    const articles = await scanArticles(SECTIONS_PATH)
    const response: ApiResponse<ArticleMeta[]> = {
      success: true,
      data: articles.sort((a, b) => {
        // 按更新日期排序
        const dateA = a.updatedAt || a.date || ''
        const dateB = b.updatedAt || b.date || ''
        return dateB.localeCompare(dateA)
      }),
      meta: { count: articles.length }
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list articles'
    }
    res.status(500).json(response)
  }
})

// 搜索文章
router.get('/search', async (req, res) => {
  const { q } = req.query
  if (!q || typeof q !== 'string') {
    const response: ApiResponse<ArticleMeta[]> = {
      success: true,
      data: []
    }
    return res.json(response)
  }
  
  try {
    const articles = await scanArticles(SECTIONS_PATH)
    const query = q.toLowerCase()
    
    const results = articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      (article.description?.toLowerCase().includes(query) ?? false) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    )
    
    const response: ApiResponse<ArticleMeta[]> = {
      success: true,
      data: results,
      meta: { count: results.length }
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to search articles'
    }
    res.status(500).json(response)
  }
})

// 获取文章详情
router.get('/detail', async (req, res) => {
  const { path: articlePath } = req.query
  if (!articlePath || typeof articlePath !== 'string') {
    const response: ApiResponse = {
      success: false,
      error: 'Path required'
    }
    return res.status(400).json(response)
  }
  
  try {
    const fullPath = join(SECTIONS_PATH, articlePath)
    const content = await fs.readFile(fullPath, 'utf-8')
    const meta = extractMeta(content, articlePath)
    
    interface ArticleDetail extends ArticleMeta {
      content: string
    }
    
    const response: ApiResponse<ArticleDetail> = {
      success: true,
      data: {
        ...meta,
        content
      }
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Article not found'
    }
    res.status(404).json(response)
  }
})

// 创建文章请求体接口
interface CreateArticleBody {
  title: string
  content?: string
  section?: string
  tags?: string[]
  isChildDoc?: boolean
  parentPath?: string
}

// 创建新文章
router.post('/create', async (req, res) => {
  const { 
    title, 
    content = '', 
    section = 'posts', 
    tags = [], 
    isChildDoc = false, 
    parentPath = '' 
  } = req.body as CreateArticleBody
  
  if (!title) {
    const response: ApiResponse = {
      success: false,
      error: 'Title required'
    }
    return res.status(400).json(response)
  }
  
  try {
    // 生成文件名 - 支持中文和特殊字符
    let slug = title.trim()
    
    // 如果是纯中文或混合内容，转换为拼音风格的 slug 或直接使用中文字符
    const isMostlyChinese = (str: string): boolean => {
      const chineseChars = str.match(/[\u4e00-\u9fa5]/g) || []
      return chineseChars.length / str.length > 0.5
    }
    
    if (isMostlyChinese(title)) {
      // 中文标题：使用中文字符作为文件名（保留前20个字符）
      slug = title
        .replace(/[\/\\:*?"<>|]/g, '') // 移除 Windows 不允许的文件名字符
        .replace(/\s+/g, '-')
        .substring(0, 20)
    } else {
      // 英文/混合标题：使用传统 slug 生成
      slug = title
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // 保留中文
        .replace(/\s+/g, '-')
        .substring(0, 50)
    }
    
    // 如果 slug 为空（标题全是特殊字符），使用时间戳
    if (!slug || slug === '-') {
      slug = `article-${Date.now()}`
    }
    
    const date = new Date().toISOString().split('T')[0]
    const filename = `${slug}.md`
    
    let filePath: string
    let resultPath: string
    
    if (isChildDoc && parentPath) {
      // 子文档创建模式：A/1.MD -> A/1.MD/1-SON.MD
      const parentFullPath = join(SECTIONS_PATH, parentPath.replace('.html', '.md'))
      const parentDir = dirname(parentFullPath)
      const parentName = basename(parentFullPath, '.md')
      
      // 新的子目录路径（和原文件同名）
      const newDirPath = join(parentDir, parentName)
      
      // 新文件路径
      filePath = join(newDirPath, filename)
      resultPath = `${section}/${parentName}/${filename}`
      
      // 检查原文件是否存在
      try {
        await fs.access(parentFullPath)
        
        // 1. 创建新目录
        await fs.mkdir(newDirPath, { recursive: true })
        
        // 2. 读取原文件内容
        const parentContent = await fs.readFile(parentFullPath, 'utf-8')
        
        // 3. 将原文件移动到新目录下（保持同名）
        const newParentPath = join(newDirPath, `${parentName}.md`)
        await fs.writeFile(newParentPath, parentContent, 'utf-8')
        
        // 4. 删除原文件
        await fs.unlink(parentFullPath)
      } catch (e) {
        // 原文件可能不存在，直接在新目录下创建
        await fs.mkdir(newDirPath, { recursive: true })
      }
    } else {
      // 普通创建模式
      const dirPath = join(SECTIONS_PATH, section)
      filePath = join(dirPath, filename)
      resultPath = `${section}/${filename}`
      
      // 确保目录存在
      await fs.mkdir(dirPath, { recursive: true })
    }
    
    // 构建 frontmatter
    const tagsYaml = tags.length > 0 
      ? `\ntags:\n${tags.map(t => `  - ${t}`).join('\n')}` 
      : ''
    
    const frontmatter = `---
title: ${title}
date: ${date}${tagsYaml}
---

${content}`
    
    // 写入文件
    await fs.writeFile(filePath, frontmatter, 'utf-8')
    
    interface CreateResult {
      path: string
      title: string
      date: string
    }
    
    const response: ApiResponse<CreateResult> = {
      success: true,
      data: {
        path: resultPath,
        title,
        date
      }
    }
    res.json(response)
  } catch (error) {
    console.error('Create article error:', error)
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create article'
    }
    res.status(500).json(response)
  }
})

// 更新文章请求体接口
interface UpdateArticleBody {
  path: string
  content: string
}

// 更新文章
router.put('/update', async (req, res) => {
  const { path: articlePath, content } = req.body as UpdateArticleBody
  
  if (!articlePath || !content) {
    const response: ApiResponse = {
      success: false,
      error: 'Path and content required'
    }
    return res.status(400).json(response)
  }
  
  try {
    const fullPath = join(SECTIONS_PATH, articlePath)
    await fs.writeFile(fullPath, content, 'utf-8')
    
    const response: ApiResponse = {
      success: true,
      data: { message: 'Article updated' }
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update article'
    }
    res.status(500).json(response)
  }
})

// 发布文章（移动到正式目录）
router.post('/publish', async (req, res) => {
  const { path: articlePath } = req.body as { path: string }
  
  if (!articlePath) {
    const response: ApiResponse = {
      success: false,
      error: 'Path required'
    }
    return res.status(400).json(response)
  }
  
  try {
    const sourcePath = join(SECTIONS_PATH, articlePath)
    const targetPath = articlePath.replace('/drafts/', '/posts/')
    const destPath = join(SECTIONS_PATH, targetPath)
    
    // 确保目标目录存在
    await fs.mkdir(dirname(destPath), { recursive: true })
    
    // 移动文件
    await fs.rename(sourcePath, destPath)
    
    interface PublishResult {
      newPath: string
    }
    
    const response: ApiResponse<PublishResult> = {
      success: true,
      data: { newPath: targetPath }
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to publish article'
    }
    res.status(500).json(response)
  }
})

export default router
