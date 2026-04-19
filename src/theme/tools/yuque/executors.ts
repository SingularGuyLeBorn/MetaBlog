/**
 * 语雀 (Yuque) 内部 Web API 工具执行器
 * 使用 Cookie 认证调用语雀内部 Web API，无需 Personal Access Token
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
  try {
    const result = await yuqueApi('GET', '/repos')

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取知识库失败')
    }

    const repos = result.data || []
    const formatted = repos.map((r: any, i: number) =>
      `${i + 1}. ${r.name} (ID: ${r.id}, Slug: ${r.slug})\n   ${r.description || '无描述'}`
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
    const result = await yuqueApi('GET', '/toc', undefined, { repo_id })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取目录失败')
    }

    // 内部 Web API 返回 { data: { toc: [...] } }
    const toc = result.data?.toc || result.data || []
    const formatted = toc.map((item: any) => {
      const indent = '  '.repeat(item.depth || 0)
      const icon = item.type === 'DOC' ? '📄' : item.type === 'TITLE' ? '📁' : '🔗'
      return `${indent}${icon} ${item.title}${item.url ? ` (slug: ${item.url})` : ''}`
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

/** 列出知识库文档（通过 TOC 获取） */
export const yuqueDocList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    // 内部 Web API 没有直接的 docs 列表端点，通过 TOC 过滤出 DOC 类型
    const result = await yuqueApi('GET', '/toc', undefined, { repo_id })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取文档列表失败')
    }

    const toc = result.data?.toc || result.data || []
    const docs = toc.filter((item: any) => item.type === 'DOC')

    const formatted = docs.map((d: any, i: number) =>
      `${i + 1}. ${d.title} (Slug: ${d.url})`
    ).join('\n\n')

    return createSuccessResult(
      docs,
      docs.length > 0 ? formatted : '知识库中暂无文档',
      'yuque_doc_list'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '获取文档列表请求失败')
  }
}

/** 读取文档内容 */
export const yuqueDocRead = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_slug } = args

  if (!repo_id || !doc_slug) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_slug')
  }

  try {
    const result = await yuqueApi('GET', '/doc/read', undefined, { repo_id, doc_slug })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '读取文档失败')
    }

    const doc = result.data
    // 内部 Web API 的 content 字段是 Lake 格式 HTML
    const content = doc.content || doc.body || doc.body_asl || ''

    return createSuccessResult(
      result.data,
      `标题: ${doc.title}\n格式: ${doc.format || 'lake'}\n更新: ${doc.updated_at || 'N/A'}\n\n---\n\n${content.slice(0, 10000)}`,
      'yuque_doc_read'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '读取文档请求失败')
  }
}

/** 创建文档 */
export const yuqueDocCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, title, content, public: isPublic } = args

  if (!repo_id || !title) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 title')
  }

  try {
    const payload: any = {
      repo_id: String(repo_id),
      title: String(title),
      format: 'lake',
    }
    // 如果提供了 content，包装为 Lake 格式
    if (content !== undefined) {
      payload.body = `<!doctype lake>${String(content)}`
    }
    if (isPublic !== undefined) payload.public = Number(isPublic)

    const result = await yuqueApi('POST', '/doc/create', payload)

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '创建文档失败')
    }

    const doc = result.data
    return createSuccessResult(
      result.data,
      `文档创建成功！\n标题: ${doc.title}\nID: ${doc.id}\nSlug: ${doc.slug}\nURL: https://www.yuque.com/${repo_id}/${doc.slug}`,
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
    const payload: any = { repo_id: String(repo_id), format: 'lake' }
    if (title !== undefined) payload.title = String(title)
    if (content !== undefined) payload.body = `<!doctype lake>${String(content)}`

    const result = await yuqueApi('PUT', '/doc/update', payload)

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '更新文档失败')
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
    const result = await yuqueApi('DELETE', '/doc/delete', { repo_id, doc_id })

    if (result.data === undefined && (result.msg || result.message)) {
      return createErrorResult(result.msg || result.message, '删除文档失败')
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

/** 搜索语雀（内部 Web API 不支持搜索，返回提示） */
export const yuqueSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query, type = 'doc' } = args

  if (!query) {
    return createErrorResult('Missing query', '缺少搜索关键词')
  }

  return createErrorResult(
    '语雀内部 Web API 不支持搜索功能',
    '搜索不可用',
    '请使用 yuque_repo_list 获取知识库列表，然后用 yuque_toc_get 浏览目录'
  )
}
