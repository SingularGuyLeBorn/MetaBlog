/**
 * 文章管理工具 - CRUD 操作
 */

import type { ToolExecutor } from '../types'

const ARTICLE_STORAGE_KEY = 'ai_chat_articles'

export interface Article {
  id: string
  title: string
  content: string
  summary?: string
  tags: string[]
  category: string
  createdAt: number
  updatedAt: number
  status: 'draft' | 'published'
}

function getArticles(): Article[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const data = localStorage.getItem(ARTICLE_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (e) {
    console.error('[ArticleTools] Failed to load:', e)
    return []
  }
}

function saveArticles(articles: Article[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ARTICLE_STORAGE_KEY, JSON.stringify(articles))
  } catch (e) {
    console.error('[ArticleTools] Failed to save:', e)
  }
}

function generateId(): string {
  return `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function formatDate(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  } catch {
    return String(timestamp)
  }
}

/**
 * 创建文章
 */
export const createArticle: ToolExecutor = async (args) => {
  const { title, content, summary = '', tags = [], category = 'general', status = 'draft' } = args
  
  if (!title || !content) {
    return `❌ 错误：title 和 content 是必填参数

示例：create_article(title="我的文章", content="内容...", tags=["AI"])`
  }
  
  try {
    const articles = getArticles()
    
    const newArticle: Article = {
      id: generateId(),
      title: title.trim(),
      content: content.trim(),
      summary: summary.trim() || content.trim().slice(0, 200) + '...',
      tags: Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()),
      category: category || 'general',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: status === 'published' ? 'published' : 'draft'
    }
    
    articles.unshift(newArticle)
    saveArticles(articles)
    
    return `✅ 文章创建成功！

📄 **${newArticle.title}**
🏷️ 分类: ${newArticle.category}
🏷️ 标签: ${newArticle.tags.join(', ') || '无'}
📊 状态: ${newArticle.status === 'published' ? '已发布' : '草稿'}
🆔 ID: ${newArticle.id}

💡 查看: get_article(article_id="${newArticle.id}")`
  } catch (error) {
    return `❌ 创建失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取文章
 */
export const getArticle: ToolExecutor = async (args) => {
  const { article_id } = args
  
  if (!article_id) {
    return `❌ 错误：article_id 是必填参数

示例：get_article(article_id="article_xxx")`
  }
  
  try {
    const articles = getArticles()
    const article = articles.find(a => a.id === article_id)
    
    if (!article) {
      return `❌ 未找到文章: ${article_id}\n\n使用 list_articles() 查看所有文章。`
    }
    
    return `📄 **${article.title}**

🏷️ 分类: ${article.category}
🏷️ 标签: ${article.tags.join(', ') || '无'}
📊 状态: ${article.status === 'published' ? '已发布' : '草稿'}
📅 创建: ${formatDate(article.createdAt)}
📝 更新: ${formatDate(article.updatedAt)}
🆔 ID: ${article.id}

---

${article.content}

---

💡 更新: update_article(article_id="${article.id}", content="新内容")`
  } catch (error) {
    return `❌ 获取失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 更新文章
 */
export const updateArticle: ToolExecutor = async (args) => {
  const { article_id, title, content, summary, tags, category, status } = args
  
  if (!article_id) {
    return `❌ 错误：article_id 是必填参数

示例：update_article(article_id="xxx", title="新标题")`
  }
  
  try {
    const articles = getArticles()
    const index = articles.findIndex(a => a.id === article_id)
    
    if (index === -1) {
      return `❌ 未找到文章: ${article_id}`
    }
    
    const article = articles[index]
    
    if (title !== undefined) article.title = title.trim()
    if (content !== undefined) article.content = content.trim()
    if (summary !== undefined) article.summary = summary.trim()
    if (tags !== undefined) {
      article.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())
    }
    if (category !== undefined) article.category = category
    if (status !== undefined) article.status = status === 'published' ? 'published' : 'draft'
    
    article.updatedAt = Date.now()
    saveArticles(articles)
    
    return `✅ 文章更新成功！

📄 **${article.title}**
🏷️ 分类: ${article.category}
🏷️ 标签: ${article.tags.join(', ') || '无'}
📊 状态: ${article.status === 'published' ? '已发布' : '草稿'}
📝 更新时间: ${formatDate(article.updatedAt)}`
  } catch (error) {
    return `❌ 更新失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 删除文章
 */
export const deleteArticle: ToolExecutor = async (args) => {
  const { article_id } = args
  
  if (!article_id) {
    return `❌ 错误：article_id 是必填参数

示例：delete_article(article_id="article_xxx")`
  }
  
  try {
    const articles = getArticles()
    const index = articles.findIndex(a => a.id === article_id)
    
    if (index === -1) {
      return `❌ 未找到文章: ${article_id}`
    }
    
    const article = articles[index]
    articles.splice(index, 1)
    saveArticles(articles)
    
    return `✅ 文章已删除！

📄 **${article.title}**
🆔 ID: ${article.id}`
  } catch (error) {
    return `❌ 删除失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 列出文章
 */
export const listArticles: ToolExecutor = async (args) => {
  const { category = '', tag = '', status = '', limit = 50 } = args
  
  try {
    let articles = getArticles()
    
    if (category) articles = articles.filter(a => a.category === category)
    if (tag) articles = articles.filter(a => a.tags.includes(tag))
    if (status) articles = articles.filter(a => a.status === status)
    
    articles = articles.slice(0, limit)
    
    if (articles.length === 0) {
      return `📭 暂无文章\n\n使用 create_article(title="标题", content="内容") 创建第一篇文章！`
    }
    
    let result = `📚 文章列表 (${articles.length} 篇)\n\n`
    
    articles.forEach((article, i) => {
      result += `${i + 1}. **${article.title}**\n`
      result += `   🏷️ ${article.category} · ${article.tags.slice(0, 3).join(', ') || '无标签'}\n`
      result += `   📊 ${article.status === 'published' ? '已发布' : '草稿'} · 📅 ${formatDate(article.createdAt)}\n`
      result += `   💡 get_article(article_id="${article.id}")\n\n`
    })
    
    return result
  } catch (error) {
    return `❌ 获取失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 搜索文章
 */
export const searchArticles: ToolExecutor = async (args) => {
  const { query, limit = 20 } = args
  
  if (!query) {
    return `❌ 错误：query 是必填参数

示例：search_articles(query="AI")`
  }
  
  try {
    const articles = getArticles()
    const searchTerm = query.toLowerCase()
    
    const results = articles.filter(a => 
      a.title.toLowerCase().includes(searchTerm) ||
      a.content.toLowerCase().includes(searchTerm) ||
      a.tags.some(t => t.toLowerCase().includes(searchTerm))
    ).slice(0, limit)
    
    if (results.length === 0) {
      return `🔍 未找到包含 "${query}" 的文章`
    }
    
    let output = `🔍 搜索结果: "${query}" (${results.length} 篇)\n\n`
    
    results.forEach((article, i) => {
      output += `${i + 1}. **${article.title}**\n`
      output += `   🏷️ ${article.category} · ${article.tags.join(', ') || '无标签'}\n`
      output += `   💡 get_article(article_id="${article.id}")\n\n`
    })
    
    return output
  } catch (error) {
    return `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`
  }
}
