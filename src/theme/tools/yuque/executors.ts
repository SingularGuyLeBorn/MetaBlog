/**
 * 语雀 (Yuque) Open API 工具执行器
 * 直接调用后端 REST API，无需语雀 SDK
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api/yuque'

/** 通用 fetch 封装 */
async function yuqueApi(method: string, path: string, body?: any, query?: Record<string, string>): Promise<any> {
  let url = `${API_BASE}${path}`
  if (query) {
    const params = new URLSearchParams(query)
    url += '?' + params.toString()
  }

  const options: RequestInit = { method }
  if (body) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)
  return res.json()
}

// ============================================
// 知识库操作
// ============================================

/** 列出语雀知识库 */
export const yuqueRepoList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { login, type = 'user' } = args

  if (!login) {
    return createErrorResult('Missing login', '缺少 login 参数', '请提供用户或团队的登录名')
  }

  try {
    const endpoint = type === 'group' ? `/groups/${login}/repos` : `/users/${login}/repos`
    const result = await yuqueApi('GET', endpoint)

    if (!result.data) {
      return createErrorResult(result.msg || '请求失败', '获取知识库失败')
    }

    const repos = result.data || []
    const formatted = repos.map((r: any, i: number) =>
      `${i + 1}. ${r.name} (ID: ${r.id}, Type: ${r.type})\n   Slug: ${r.slug}\n   ${r.description || '无描述'}`
    ).join('\n\n')

    return createSuccessResult(
      result.data,
      repos.length > 0 ? formatted : '未找到知识库',
      'yuque_repo_list'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '获取知识库请求失败')
  }
}

/** 获取知识库目录结构 */
export const yuqueTocGet = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const result = await yuqueApi('GET', `/repos/${repo_id}/toc`)

    if (!result.data) {
      return createErrorResult(result.msg || '请求失败', '获取目录失败')
    }

    const toc = result.data || []
    const formatted = toc.map((item: any) => {
      const indent = '  '.repeat(item.depth || 0)
      const icon = item.type === 'DOC' ? '📄' : item.type === 'TITLE' ? '📁' : '🔗'
      return `${indent}${icon} ${item.title}${item.slug ? ` (slug: ${item.slug})` : ''}`
    }).join('\n')

    return createSuccessResult(
      result.data,
      `目录结构 (${toc.length} 项):\n${formatted}`,
      'yuque_toc_get'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '获取目录请求失败')
  }
}

// ============================================
// 文档操作
// ============================================

/** 列出知识库文档 */
export const yuqueDocList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const result = await yuqueApi('GET', `/repos/${repo_id}/docs`)

    if (!result.data) {
      return createErrorResult(result.msg || '请求失败', '获取文档列表失败')
    }

    const docs = result.data || []
    const formatted = docs.map((d: any, i: number) =>
      `${i + 1}. ${d.title} (ID: ${d.id}, Slug: ${d.slug})\n   更新: ${d.updated_at?.slice(0, 10) || 'N/A'}`
    ).join('\n\n')

    return createSuccessResult(
      result.data,
      docs.length > 0 ? formatted : '知识库中暂无文档',
      'yuque_doc_list'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '获取文档列表请求失败')
  }
}

/** 读取文档内容 */
export const yuqueDocRead = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_id } = args

  if (!repo_id || !doc_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_id')
  }

  try {
    const result = await yuqueApi('GET', `/repos/${repo_id}/docs/${doc_id}`)

    if (!result.data) {
      return createErrorResult(result.msg || '请求失败', '读取文档失败')
    }

    const doc = result.data
    const body = doc.body || ''

    return createSuccessResult(
      result.data,
      `标题: ${doc.title}\n格式: ${doc.format}\n更新: ${doc.updated_at || 'N/A'}\n\n---\n\n${body.slice(0, 10000)}`,
      'yuque_doc_read'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '读取文档请求失败')
  }
}

/** 创建文档 */
export const yuqueDocCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, title, content, slug, public: isPublic } = args

  if (!repo_id || !title) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 title')
  }

  try {
    const payload: any = { title: String(title), format: 'markdown' }
    if (content !== undefined) payload.body = String(content)
    if (slug) payload.slug = String(slug)
    if (isPublic !== undefined) payload.public = Number(isPublic)

    const result = await yuqueApi('POST', `/repos/${repo_id}/docs`, payload)

    if (!result.data) {
      return createErrorResult(result.msg || '请求失败', '创建文档失败')
    }

    const doc = result.data
    return createSuccessResult(
      result.data,
      `文档创建成功！\n标题: ${doc.title}\nID: ${doc.id}\nSlug: ${doc.slug}\nURL: https://www.yuque.com/${doc.book?.slug || repo_id}/${doc.slug}`,
      'yuque_doc_create'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '创建文档请求失败')
  }
}

/** 更新文档 */
export const yuqueDocUpdate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_id, title, content } = args

  if (!repo_id || !doc_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_id')
  }

  try {
    const payload: any = { format: 'markdown' }
    if (title !== undefined) payload.title = String(title)
    if (content !== undefined) payload.body = String(content)

    const result = await yuqueApi('PUT', `/repos/${repo_id}/docs/${doc_id}`, payload)

    if (!result.data) {
      return createErrorResult(result.msg || '请求失败', '更新文档失败')
    }

    const doc = result.data
    return createSuccessResult(
      result.data,
      `文档更新成功！\n标题: ${doc.title}\nID: ${doc.id}\n更新于: ${doc.updated_at || 'N/A'}`,
      'yuque_doc_update'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '更新文档请求失败')
  }
}

/** 删除文档 */
export const yuqueDocDelete = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_id } = args

  if (!repo_id || !doc_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_id')
  }

  try {
    const result = await yuqueApi('DELETE', `/repos/${repo_id}/docs/${doc_id}`)

    if (result.data === undefined && result.msg) {
      return createErrorResult(result.msg, '删除文档失败')
    }

    return createSuccessResult(
      result.data,
      `文档 ${doc_id} 删除成功`,
      'yuque_doc_delete'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '删除文档请求失败')
  }
}

// ============================================
// 搜索操作
// ============================================

/** 搜索语雀 */
export const yuqueSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query, type = 'doc' } = args

  if (!query) {
    return createErrorResult('Missing query', '缺少搜索关键词')
  }

  try {
    const result = await yuqueApi('GET', '/search', undefined, {
      q: String(query),
      type: String(type),
    })

    if (!result.data) {
      return createErrorResult(result.msg || '请求失败', '搜索失败')
    }

    const items = result.data || []
    const formatted = items.map((item: any, i: number) => {
      if (type === 'repo') {
        return `${i + 1}. ${item.name} (Slug: ${item.slug})\n   ${item.description || '无描述'}`
      }
      return `${i + 1}. ${item.title} (Slug: ${item.slug})\n   知识库: ${item.book?.name || 'N/A'}\n   摘要: ${item.summary?.slice(0, 100) || 'N/A'}`
    }).join('\n\n')

    return createSuccessResult(
      result.data,
      items.length > 0 ? formatted : '未找到匹配结果',
      'yuque_search'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '搜索请求失败')
  }
}
