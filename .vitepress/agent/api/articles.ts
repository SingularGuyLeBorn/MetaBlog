/**
 * Articles API Client - 文章管理前端接口
 */

const API_BASE = '/api/articles'

export interface ArticleMeta {
  path: string
  title: string
  description?: string
  tags?: string[]
  date?: string
  updatedAt?: string
  wordCount?: number
  isPublished: boolean
}

export interface ArticleDetail extends ArticleMeta {
  content: string
}

// 获取文章列表
export async function listArticles(): Promise<ArticleMeta[]> {
  const response = await fetch(`${API_BASE}/list`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

// 搜索文章
export async function searchArticles(query: string): Promise<ArticleMeta[]> {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

// 获取文章详情
export async function getArticle(path: string): Promise<ArticleDetail> {
  const response = await fetch(`${API_BASE}/detail?path=${encodeURIComponent(path)}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

// 创建新文章
export async function createArticle(params: {
  title: string
  content?: string
  section?: string
  tags?: string[]
}): Promise<{ path: string; title: string; date: string }> {
  const response = await fetch(`${API_BASE}/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

// 更新文章
export async function updateArticle(path: string, content: string): Promise<void> {
  const response = await fetch(`${API_BASE}/update`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
}

// 发布文章
export async function publishArticle(path: string): Promise<{ newPath: string }> {
  const response = await fetch(`${API_BASE}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}
