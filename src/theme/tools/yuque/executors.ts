/**
 * =============================================================================
 * 语雀 (Yuque) 内部 Web API 工具执行器
 * =============================================================================
 *
 * 【什么是执行器？】
 * 执行器是实际调用后端 API 的函数。Agent 决定调用某个工具后，
 * 系统会找到对应的执行器，传入参数，执行器负责：
 *   1. 构建 HTTP 请求
 *   2. 调用后端路由
 *   3. 解析响应
 *   4. 格式化结果返回给 Agent
 *
 * 【错误处理】
 * 所有执行器统一返回 ToolResult 类型：
 *   - 成功：createSuccessResult(data, message, toolName)
 *   - 失败：createErrorResult(detail, message, suggestion)
 *
 * 【后端路由】
 * 后端路由定义在 server/routes/yuque.ts 中，
 * 前端通过 /api/yuque/* 路径调用。
 * =============================================================================
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

/** 后端 API 基础路径 */
const API_BASE = '/api/yuque'

// =============================================================================
// 通用 API 调用封装
// =============================================================================

/**
 * 调用语雀后端路由的通用函数
 *
 * @param method  HTTP 方法
 * @param path    API 路径（不含 /api/yuque 前缀）
 * @param body    请求体对象（POST/PUT 时使用）
 * @param query   URL 查询参数对象
 * @returns       后端返回的 JSON 数据
 */
async function yuqueApi(method: string, path: string, body?: any, query?: Record<string, string>): Promise<any> {
  // 拼接完整 URL
  let url = `${API_BASE}${path}`
  if (query) {
    const params = new URLSearchParams(query)
    url += '?' + params.toString()
  }

  // 构建 fetch 选项
  const options: RequestInit = { method }
  if (body) {
    options.headers = { 'Content-Type': 'application/json' }
    options.body = JSON.stringify(body)
  }

  // 发送请求并解析 JSON
  const res = await fetch(url, options)
  return res.json()
}

// =============================================================================
// 知识库操作
// =============================================================================

/**
 * 执行器：列出语雀知识库
 *
 * 调用后端 GET /api/yuque/repos，返回知识库列表。
 * 每个知识库格式化为：序号. 名称 (ID: xxx, Slug: xxx)\n   描述
 */
export const yuqueRepoList = async (args: Record<string, any>): Promise<ToolResult> => {
  try {
    const result = await yuqueApi('GET', '/repos')

    // 检查是否有 data 字段（语雀 API 的响应结构）
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

/**
 * 执行器：获取知识库目录结构
 *
 * 调用后端 GET /api/yuque/toc?repo_id=xxx
 *
 * 【响应格式差异】
 * 内部 Web API 返回 { data: { toc: [...] } }，
 * 而 Open API v2 返回 { data: [...] }。
 * 本执行器兼容两种格式。
 */
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

    // 内部 Web API: { data: { toc: [...] } }
    // 兼容处理：如果 data 直接是数组也支持
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

// =============================================================================
// 文档操作
// =============================================================================

/**
 * 执行器：列出知识库文档
 *
 * 【实现说明】
 * 语雀内部 Web API 没有直接的 /repos/{id}/docs 端点，
 * 因此本执行器通过获取 TOC 并过滤出 type === 'DOC' 的条目来实现。
 *
 * 返回的 slug 字段在内部 API 中叫做 "url"。
 */
export const yuqueDocList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    // 通过 TOC 获取文档列表
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

/**
 * 执行器：读取文档内容
 *
 * 调用后端 GET /api/yuque/doc/read?repo_id=xxx&doc_slug=xxx
 *
 * 【字段映射】
 * 内部 Web API 的 content 字段是 Lake 格式 HTML，
 * 不是 Open API v2 的 body 字段。
 * 本执行器按优先级读取：content > body > body_asl
 */
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
    // 内部 Web API: content 是 Lake HTML，Open API v2: body 是 Markdown
    // 按优先级读取，确保能拿到内容
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

/**
 * 执行器：创建文档
 *
 * 调用后端 POST /api/yuque/doc/create
 *
 * 【内容格式处理】
 * 用户传入的 content 是 HTML 字符串，
 * 后端会自动包装为 <!doctype lake>... 格式。
 * 如果用户已经提供了 <!doctype lake> 前缀，不会重复包装。
 */
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
      const bodyStr = String(content)
      // 如果用户已经提供了 doctype 前缀，直接使用；否则包装
      payload.body = bodyStr.startsWith('<!doctype lake>') ? bodyStr : `<!doctype lake>${bodyStr}`
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

/**
 * 执行器：更新文档
 *
 * 调用后端 PUT /api/yuque/doc/update
 *
 * 【重要】doc_id 是数字 ID，不是 slug！
 */
export const yuqueDocUpdate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_id, title, content } = args

  if (!repo_id || !doc_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_id')
  }

  try {
    const payload: any = { repo_id: String(repo_id), format: 'lake' }
    if (title !== undefined) payload.title = String(title)
    if (content !== undefined) {
      const bodyStr = String(content)
      payload.body = bodyStr.startsWith('<!doctype lake>') ? bodyStr : `<!doctype lake>${bodyStr}`
    }

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

/**
 * 执行器：删除文档
 *
 * 调用后端 DELETE /api/yuque/doc/delete
 *
 * 【⚠️ 警告】删除操作不可逆！
 */
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

// =============================================================================
// 搜索操作（当前不可用）
// =============================================================================

/**
 * 执行器：搜索语雀
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有搜索端点，直接返回友好提示。
 */
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
