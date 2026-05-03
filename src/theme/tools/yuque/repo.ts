/**
 * ============================================================================
 * 语雀(Yuque)知识库操作工具集
 * ============================================================================
 *
 * 提供语雀知识库(Repo/Book)的增删改查及设置管理. 
 * 同时包含通用 API 封装 yuqueApi 和错误翻译函数 translateYuqueError,
 * 供本模块其他文件复用. 
 *
 * @module src/theme/tools/yuque/repo
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types';
import { createErrorResult, createSuccessResult } from '@/theme/tools/types';

/** 后端 API 基础路径 */
const API_BASE = '/api/yuque'

// =============================================================================
// 通用 API 调用封装
// =============================================================================

/**
 * 语雀错误码翻译
 *
 * 将 HTTP 状态码和语雀错误码翻译为中文提示,帮助用户快速定位问题. 
 *
 * @param result - 错误响应对象
 * @returns 包含 message(中文错误描述)和 suggestion(解决建议)的对象
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
    return { message: '请求过于频繁,触发限流', suggestion: '请稍后再试(建议间隔 1-2 秒)' }
  }
  if (code === 500 || status === 500) {
    return { message: '语雀服务器内部错误', suggestion: '请稍后重试,如持续报错请联系语雀支持' }
  }
  if (code === 502 || status === 502) {
    return { message: '语雀网关错误', suggestion: '语雀服务暂时不可用,请稍后重试' }
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
 * 负责构建请求 URL、处理查询参数、序列化请求体、解析响应. 
 * 对非 JSON 响应会抛出异常,并在响应中注入 HTTP 状态码供错误翻译使用. 
 *
 * @param method - HTTP 方法
 * @param path - API 路径(不含 /api/yuque 前缀)
 * @param body - 请求体对象(POST/PUT 时使用)
 * @param query - URL 查询参数对象
 * @returns 后端返回的 JSON 数据
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
  // 注入 HTTP 状态码,便于错误翻译
  if (!data.status && !res.ok) {
    data.status = res.status
  }
  return data
}

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 列出语雀知识库的工具定义
 *
 * 返回当前登录用户拥有的所有知识库(Book/Repo)列表. 
 * 每个知识库包含 id、name、slug、description 等信息. 
 *
 * 使用示例：
 *   yuqueRepoList()
 *
 * 返回值示例：
 *   1. LLM知识库 (ID: 68025057, Slug: qah8x7)
 *      无描述
 *   2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
 *      课程笔记
 */
export const yuqueRepoListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoList',
    description: `【功能】列出当前语雀用户拥有的所有知识库(Repo/Book)列表. 

【使用场景】
- 用户想查看自己有哪些语雀知识库时调用
- 所有语雀文档操作的第一步：先获取知识库列表,再从中选择目标知识库的 repo_id
- 不确定知识库 ID 时,先用本工具查询

【示例用法】
yuqueRepoList()
→ 返回:
1. LLM知识库 (ID: 68025057, Slug: qah8x7)
   无描述
2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
   课程笔记

【注意事项】
- 返回值中的 id 字段是知识库数字 ID(如 68025057),后续所有操作都需要此 ID
- 返回值中的 slug 是知识库 URL 标识`,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
}

/**
 * 创建语雀知识库的工具定义
 */
export const yuqueRepoCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoCreate',
    description: `【功能】创建新的语雀知识库(Book/Repo). 

【使用场景】
- 用户要求新建一个语雀知识库时调用
- 需要为文档归类创建新的知识库空间时调用

【示例用法】
# 创建普通知识库
yuqueRepoCreate(name="产品文档", slug="product-docs")
# 创建私密知识库
yuqueRepoCreate(name="内部资料", slug="internal", public=0)
# 创建设计知识库
yuqueRepoCreate(name="UI设计", slug="ui-design", type="Design")

【注意事项】
- slug 是知识库的 URL 路径标识,只能包含字母、数字、连字符,全局唯一
- name 是显示名称,可以重复
- 创建成功后返回值中包含 id(数字 ID),建议记录下来供后续使用`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '知识库显示名称,如 "产品文档"、"技术笔记"',
        },
        slug: {
          type: 'string',
          description: '知识库 URL 路径标识(slug),如 "product-docs"、"api-test". 只能包含字母、数字、连字符,全局唯一',
        },
        description: {
          type: 'string',
          description: '知识库描述(可选),如 "团队技术文档汇总"',
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

/**
 * 更新语雀知识库的工具定义
 */
export const yuqueRepoUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoUpdate',
    description: `【功能】更新语雀知识库的名称、slug 或描述. 

【使用场景】
- 用户要求修改知识库名称时调用
- 需要更改知识库 URL 路径(slug)时调用
- 补充或修改知识库描述时调用

【示例用法】
# 只修改名称
yuqueRepoUpdate(repo_id="68025057", name="新产品文档")
# 修改名称和描述
yuqueRepoUpdate(repo_id="68025057", name="产品文档", description="v2.0 文档")
# 修改 slug(会改变知识库 URL)
yuqueRepoUpdate(repo_id="68025057", slug="new-slug")

【注意事项】
- 修改 slug 会改变知识库的访问 URL,已有链接会失效
- 只需要传要修改的字段,未传的字段保持不变`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
        name: {
          type: 'string',
          description: '新名称(可选),如 "产品文档 v2"',
        },
        slug: {
          type: 'string',
          description: '新 slug/URL 路径标识(可选),如 "new-docs". 修改后知识库 URL 会改变',
        },
        description: {
          type: 'string',
          description: '新描述(可选),如 "2024年技术文档汇总"',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 删除语雀知识库的工具定义
 */
export const yuqueRepoDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoDelete',
    description: `【功能】删除语雀知识库及其下的所有文档. 

【使用场景】
- 用户明确要求删除某个知识库时调用
- 清理废弃知识库时调用

【⚠️ 警告】删除操作不可逆！会同时删除知识库下的所有文档,请确认后再执行！

【示例用法】
yuqueRepoDelete(repo_id="68025057")

【注意事项】
- 删除前建议先用 yuqueDocList 确认知识库下的文档,避免误删`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 获取语雀知识库详情的工具定义
 */
export const yuqueRepoGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoGet',
    description: `【功能】获取语雀知识库的详细信息. 

【使用场景】
- 需要查看某个知识库的完整信息时调用
- 确认知识库名称、描述、创建时间等元数据时调用
- 在操作前验证知识库是否存在时调用

【示例用法】
yuqueRepoGet(repo_id="68025057")
→ 返回知识库名称、描述、ID、Slug、创建时间等详细信息`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 获取语雀知识库设置的工具定义
 */
export const yuqueRepoSettingGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoSettingGet',
    description: `【功能】获取语雀知识库的设置信息,包括可见性、评论设置等. 

【使用场景】
- 需要查看知识库当前权限配置时调用
- 排查文档无法访问问题时,检查可见性设置
- 修改设置前先查看当前配置

【示例用法】
yuqueRepoSettingGet(repo_id="68025057")
→ 返回: 可见性: 私密 | 评论: 开启`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 更新语雀知识库设置的工具定义
 */
export const yuqueRepoSettingUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueRepoSettingUpdate',
    description: `【功能】更新语雀知识库的设置,包括可见性、评论开关等. 

【使用场景】
- 用户要求更改知识库权限时调用
- 将私密知识库改为公开,或反之
- 开启/关闭知识库评论功能时调用

【示例用法】
# 设为互联网公开
yuqueRepoSettingUpdate(repo_id="68025057", public=1)
# 关闭评论
yuqueRepoSettingUpdate(repo_id="68025057", comment_status=0)
# 同时修改多个设置
yuqueRepoSettingUpdate(repo_id="68025057", public=2, comment_status=1)

【注意事项】
- public=1(互联网公开)意味着任何人无需登录即可访问知识库下的文档
- 只需要传要修改的字段,未传的字段保持不变`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
        public: {
          type: 'number',
          enum: [0, 1, 2],
          description: '可见性设置(可选). 0=私密(仅自己可见),1=互联网公开(任何人可访问),2=空间成员公开(团队内可见)',
        },
        comment_status: {
          type: 'number',
          enum: [0, 1],
          description: '评论开关(可选). 0=关闭评论,1=开启评论',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 列出当前语雀用户的所有知识库
 *
 * @returns 知识库列表,每项包含名称、ID、Slug、描述
 */
export const yuqueRepoList = async (args: Record<string, any>): Promise<ToolResult> => {
  try {
    const result = await yuqueApi('GET', '/repos')

    // 检查是否有 data 字段(语雀 API 的响应结构)
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

/**
 * 创建新的语雀知识库
 *
 * @param args - 包含 name、slug、description、type、public 参数
 * @returns 创建结果,包含知识库的 id 和 slug
 */
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

/**
 * 更新语雀知识库信息
 *
 * @param args - 包含 repo_id、name、slug、description 参数
 * @returns 更新结果
 */
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

/**
 * 删除语雀知识库
 *
 * @param args - 包含 repo_id 参数
 * @returns 删除结果
 * @remarks 删除操作不可逆,会同时删除知识库下的所有文档
 */
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

/**
 * 获取语雀知识库详细信息
 *
 * @param args - 包含 repo_id 参数
 * @returns 知识库详情
 */
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

/**
 * 获取语雀知识库设置
 *
 * @param args - 包含 repo_id 参数
 * @returns 知识库设置(可见性、评论开关等)
 */
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

/**
 * 更新语雀知识库设置
 *
 * @param args - 包含 repo_id、public、comment_status 参数
 * @returns 更新结果
 */
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
