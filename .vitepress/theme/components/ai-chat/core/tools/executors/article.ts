/**
 * 文章相关工具执行器
 * 
 * 包括：获取文章内容、搜索文章、列出文章、创建文章、更新文章、删除文章
 */
import { addLog } from '../../services/logger'

/**
 * 获取文章内容
 */
export async function getArticleContent(args: Record<string, any>): Promise<string> {
  const path = args.path as string
  const maxLength = args.max_length as number | undefined
  
  try {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent('sections/' + path)}`)
    if (!response.ok) {
      return `错误：无法读取文章 ${path}`
    }
    
    let content = await response.text()
    // 清理 frontmatter
    content = content.replace(/^---[\s\S]*?---/, '').trim()
    
    // 强制限制内容长度，避免消息过长导致 API 请求失败
    // 默认 1500 字符，最大不超过 3000（防止请求体超过 8KB）
    const limit = Math.min(maxLength || 1500, 3000)
    if (content.length > limit) {
      content = content.substring(0, limit) + `\n\n...（内容已截断，共 ${content.length} 字符，显示前 ${limit} 字符）`
    }
    
    return content
  } catch (error) {
    return `错误：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 搜索文章
 */
export async function searchArticles(args: Record<string, any>): Promise<string> {
  const query = args.query as string
  const limit = args.limit as number | undefined
  
  try {
    const response = await fetch(`/api/articles/search?q=${encodeURIComponent(query)}&limit=${limit || 5}`)
    if (!response.ok) {
      return fallbackSearch(query, limit || 5)
    }
    
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) {
      return '未找到相关文章'
    }
    
    return result.data.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    ).join('\n')
  } catch (error) {
    return fallbackSearch(query, limit || 5)
  }
}

/**
 * 本地搜索回退（当API不可用时）
 */
async function fallbackSearch(query: string, limit: number): Promise<string> {
  try {
    const response = await fetch('/api/articles/list-all')
    if (!response.ok) return '搜索功能暂时不可用'
    
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) return '暂无文章数据'
    
    const lowerQuery = query.toLowerCase()
    const matches = result.data.filter((a: any) => 
      a.title?.toLowerCase().includes(lowerQuery) ||
      a.path?.toLowerCase().includes(lowerQuery)
    ).slice(0, limit)
    
    if (matches.length === 0) return `未找到与 "${query}" 相关的文章`
    
    return matches.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    ).join('\n')
  } catch {
    return '搜索功能暂时不可用'
  }
}

/**
 * 列出所有文章
 */
export async function listArticles(args: Record<string, any>): Promise<string> {
  const section = args.section as string | undefined
  const limit = args.limit as number | undefined
  
  try {
    const response = await fetch('/api/articles/list-all')
    if (!response.ok) return '无法获取文章列表'
    
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) return '暂无文章'
    
    let articles = result.data
    if (section) {
      articles = articles.filter((a: any) => a.section === section)
    }
    
    // 默认限制返回数量，避免消息过长
    const actualLimit = limit || 20
    articles = articles.slice(0, actualLimit)
    
    const lines = articles.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    )
    
    // 如果还有更多文章，添加提示
    if (result.data.length > actualLimit) {
      lines.push(`\n... 还有 ${result.data.length - actualLimit} 篇文章未显示`)
    }
    
    return lines.join('\n')
  } catch (error) {
    return `错误：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 创建新文章
 */
export async function createArticle(args: Record<string, any>): Promise<string> {
  const { title, path: articlePath, content = '' } = args
  
  addLog({
    level: 'info',
    category: 'tool',
    component: 'createArticle',
    message: `开始创建文章: ${title}`,
    data: { title, path: articlePath, contentLength: content.length }
  })
  
  try {
    const response = await fetch('/api/articles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, path: articlePath, content })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      addLog({
        level: 'error',
        category: 'tool',
        component: 'createArticle',
        message: `HTTP 错误: ${response.status}`,
        data: { status: response.status, error: errorText }
      })
      return `创建失败：HTTP ${response.status} - ${errorText}`
    }
    
    const result = await response.json()
    if (!result.success) {
      addLog({
        level: 'error',
        category: 'tool',
        component: 'createArticle',
        message: `创建文章失败: ${result.error}`,
        data: { title, path: articlePath, error: result.error }
      })
      return `创建失败：${result.error || '未知错误'}`
    }
    
    addLog({
      level: 'info',
      category: 'tool',
      component: 'createArticle',
      message: `文章创建成功: ${result.data?.path}`,
      data: { title, path: result.data?.path, fullPath: result.data?.fullPath }
    })
    
    return `✅ 文章创建成功！\n📄 标题：${title}\n📁 路径：${result.data?.path || articlePath}`
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const isNetworkError = error instanceof TypeError && errorMsg.includes('fetch')
    
    addLog({
      level: 'error',
      category: 'tool',
      component: 'createArticle',
      message: `创建文章异常: ${errorMsg}`,
      data: { 
        title, 
        path: articlePath, 
        error: errorMsg, 
        isNetworkError,
        stack: error instanceof Error ? error.stack : undefined 
      }
    })
    
    if (isNetworkError) {
      return `❌ 网络错误：无法连接到后端服务器\n\n可能原因：\n1. 后端服务未启动\n2. 网络连接中断\n3. 请求超时\n\n请检查：\n- 确保 VitePress 开发服务器正常运行\n- 检查浏览器控制台网络日志\n- 尝试刷新页面后重试`
    }
    
    return `❌ 创建失败：${errorMsg}`
  }
}

/**
 * 更新文章
 */
export async function updateArticle(args: Record<string, any>): Promise<string> {
  const { path: articlePath, content } = args
  
  try {
    const response = await fetch('/api/articles/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath, content })
    })
    
    const result = await response.json()
    if (!result.success) {
      return `更新失败：${result.error || '未知错误'}`
    }
    
    return `✅ 文章更新成功！\n📁 路径：${articlePath}\n📝 字数：${content.length}`
  } catch (error) {
    return `更新失败：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 删除文章
 */
export async function deleteArticle(args: Record<string, any>): Promise<string> {
  const { path: articlePath } = args
  
  try {
    const response = await fetch('/api/articles/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath })
    })
    
    const result = await response.json()
    if (!result.success) {
      return `删除失败：${result.error || '未知错误'}`
    }
    
    return `✅ 文章已删除：${articlePath}`
  } catch (error) {
    return `删除失败：${error instanceof Error ? error.message : String(error)}`
  }
}
