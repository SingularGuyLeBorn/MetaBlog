/**
 * =============================================================================
 * 语雀 (Yuque) 知识库操作
 * =============================================================================
 *
 * 包含知识库的增删改查及设置管理。
 * =============================================================================
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

/** 后端 API 基础路径 */
const API_BASE = '/api/yuque'

// =============================================================================
// 通用 API 调用封装
// =============================================================================

/**
 * 语雀错误码翻译
 * 将 HTTP 状态码和语雀错误码翻译为中文提示
 */
export function translateYuqueError(result: any): { message: string; suggestion: string } {
  const code = result?.code ?? result?.status
  const status = result?.status ?? 500

  // 语雀内部 Web API 常见错误码
  if (code === 401 || status === 401) {
    return { message: '语雀 Token 无效或已过期', suggestion: '请检查 .env 中的 YUQUE_TOKEN 是否正确' }
  }
  if (code === 403 || status === 403) {
    return { message: '没有权限访问该资源', suggestion: '请确认 Token 有对应知识库的读写权限' }
  }
  if (code === 404 || status === 404) {
    return { message: '资源不存在', suggestion: '请检查 repo_id / doc_slug / doc_id 是否正确' }
  }
  if (code === 429 || status === 429) {
    return { message: '请求过于频繁，触发限流', suggestion: '请稍后再试（建议间隔 1-2 秒）' }
  }
  if (code === 500 || status === 500) {
    return { message: '语雀服务器内部错误', suggestion: '请稍后重试，如持续报错请联系语雀支持' }
  }
  if (code === 502 || status === 502) {
    return { message: '语雀网关错误', suggestion: '语雀服务暂时不可用，请稍后重试' }
  }
  if (code === 503 || status === 503) {
    return { message: '语雀服务维护中', suggestion: '请稍后重试' }
  }

  return {
    message: result?.msg || result?.message || '语雀请求失败',
    suggestion: '请检查参数或稍后重试'
  }
}

/**
 * 调用语雀后端路由的通用函数
 *
 * @param method  HTTP 方法
 * @param path    API 路径（不含 /api/yuque 前缀）
 * @param body    请求体对象（POST/PUT 时使用）
 * @param query   URL 查询参数对象
 * @returns       后端返回的 JSON 数据
 */
export async function yuqueApi(method: string, path: string, body?: any, query?: Record<string, string>): Promise<any> {
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
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  // 注入 HTTP 状态码，便于错误翻译
  if (!data.status && !res.ok) {
    data.status = res.status
  }
  return data
}

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 工具：列出语雀知识库
 *
 * 返回当前登录用户拥有的所有知识库（Book/Repo）列表。
 * 每个知识库包含 id、name、slug、description 等信息。
 *
 * 【使用示例】
 *   yuqueRepoList()
 *
 * 【返回值】
 *   1. LLM知识库 (ID: 68025057, Slug: qah8x7)
 *      无描述
 *   2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
 *      课程笔记
 */
export const yuqueRepoListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoList',
    description: `列出语雀用户或团队的知识库（Repo/Book）列表。

返回知识库名称、ID、Slug、描述等信息。

使用示例：
- 列出个人知识库: yuqueRepoList()

返回示例：
1. LLM知识库 (ID: 68025057, Slug: qah8x7)
   无描述
2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
   课程笔记`,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
}

export const yuqueRepoCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoCreate',
    description: `创建语雀知识库（Book/Repo）。

使用示例：
- 创建普通知识库: yuqueRepoCreate(name="产品文档", slug="product-docs")
- 创建私密知识库: yuqueRepoCreate(name="内部资料", slug="internal", public=0)

创建成功后返回知识库信息，包含 id、slug 等字段。`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '知识库名称',
        },
        slug: {
          type: 'string',
          description: '知识库路径（URL 标识，如 "api-test"）',
        },
        description: {
          type: 'string',
          description: '知识库描述（可选）',
        },
        type: {
          type: 'string',
          enum: ['Book', 'Design'],
          description: '类型: Book=普通知识库, Design=设计知识库',
          default: 'Book',
        },
        public: {
          type: 'number',
          enum: [0, 1, 2],
          description: '可见性: 0=私密, 1=互联网公开, 2=空间成员公开',
          default: 0,
        },
      },
      required: ['name', 'slug'],
    },
  },
}

export const yuqueRepoUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoUpdate',
    description: '更新语雀知识库的名称、路径或描述。',
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID',
        },
        name: {
          type: 'string',
          description: '新名称（可选）',
        },
        slug: {
          type: 'string',
          description: '新路径（可选）',
        },
        description: {
          type: 'string',
          description: '新描述（可选）',
        },
      },
      required: ['repo_id'],
    },
  },
}

export const yuqueRepoDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoDelete',
    description: `删除语雀知识库。

【⚠️ 警告】删除操作不可逆！会同时删除知识库下的所有文档。`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID',
        },
      },
      required: ['repo_id'],
    },
  },
}

export const yuqueRepoGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoGet',
    description: '获取语雀知识库的详细信息。',
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID',
        },
      },
      required: ['repo_id'],
    },
  },
}

export const yuqueRepoSettingGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoSettingGet',
    description: '获取语雀知识库的设置信息（可见性、评论设置等）。',
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID',
        },
      },
      required: ['repo_id'],
    },
  },
}

export const yuqueRepoSettingUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoSettingUpdate',
    description: '更新语雀知识库的设置（可见性、评论设置等）。',
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID',
        },
        public: {
          type: 'number',
          enum: [0, 1, 2],
          description: '可见性: 0=私密, 1=互联网公开, 2=空间成员公开',
        },
        comment_status: {
          type: 'number',
          enum: [0, 1],
          description: '评论设置: 0=关闭, 1=开启',
        },
      },
      required: ['repo_id'],
    },
  },
}

export const yuqueRepoList = async (args: Record<string, any>): Promise<ToolResult> => {
  try {
    const result = await yuqueApi('GET', '/repos')

    // 检查是否有 data 字段（语雀 API 的响应结构）
    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取知识库失败', undefined, result.status || result.code)
    }

    const repos = result.data || []
    const formatted = repos.map((r: any, i: number) =>
      `${i + 1}. ${r.name} (ID: ${r.id}, Slug: ${r.slug})\n   ${r.description || '无描述'}`
    ).join('\n\n')

    return createSuccessResult(
      result.data,
      repos.length > 0 ? formatted : '未找到知识库',
      'yuqueRepoList'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueRepoCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { name, slug, description, type, public: publicVal } = args

  if (!name || !slug) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 name 和 slug')
  }

  try {
    const payload: any = { name, slug, type: type || 'Book', public: publicVal !== undefined ? publicVal : 0 }
    if (description !== undefined) payload.description = description

    const result = await yuqueApi('POST', '/repo/create', payload)

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '创建知识库失败', undefined, result.status || result.code)
    }

    const repo = result.data
    return createSuccessResult(
      result.data,
      `知识库创建成功！\n名称: ${repo.name}\nID: ${repo.id}\nSlug: ${repo.slug}\nURL: https://www.yuque.com/${repo.slug}`,
      'yuqueRepoCreate'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueRepoUpdate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, name, slug, description } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const payload: any = {}
    if (name !== undefined) payload.name = name
    if (slug !== undefined) payload.slug = slug
    if (description !== undefined) payload.description = description

    const result = await yuqueApi('PUT', '/repo/update', { repo_id, ...payload })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '更新知识库失败', undefined, result.status || result.code)
    }

    return createSuccessResult(result.data, '知识库更新成功', 'yuqueRepoUpdate')
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueRepoDelete = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const result = await yuqueApi('DELETE', '/repo/delete', { repo_id })

    if (result.data === undefined && (result.msg || result.message)) {
      return createErrorResult(result.msg || result.message, '删除知识库失败', undefined, result.status || result.code)
    }

    return createSuccessResult(result.data, `知识库 ${repo_id} 已删除`, 'yuqueRepoDelete')
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueRepoGet = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const result = await yuqueApi('GET', '/repo/get', undefined, { repo_id: String(repo_id) })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取知识库详情失败', undefined, result.status || result.code)
    }

    const repo = result.data
    return createSuccessResult(
      result.data,
      `知识库: ${repo.name}\n描述: ${repo.description || '无'}\nID: ${repo.id}\nSlug: ${repo.slug}`,
      'yuqueRepoGet'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueRepoSettingGet = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const result = await yuqueApi('GET', '/repo/setting/get', undefined, { repo_id: String(repo_id) })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取知识库设置失败', undefined, result.status || result.code)
    }

    const setting = result.data
    const publicText = setting.public === 0 ? '私密' : setting.public === 1 ? '互联网公开' : '空间成员公开'
    return createSuccessResult(
      result.data,
      `可见性: ${publicText}\n评论: ${setting.comment_status === 1 ? '开启' : '关闭'}`,
      'yuqueRepoSettingGet'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueRepoSettingUpdate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, public: publicVal, comment_status } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const payload: any = { repo_id }
    if (publicVal !== undefined) payload.public = publicVal
    if (comment_status !== undefined) payload.comment_status = comment_status

    const result = await yuqueApi('PUT', '/repo/setting/update', payload)

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '更新知识库设置失败', undefined, result.status || result.code)
    }

    return createSuccessResult(result.data, '知识库设置更新成功', 'yuqueRepoSettingUpdate')
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
