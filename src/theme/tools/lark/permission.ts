/**
 * ============================================================================
 * permission 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/lark
 */


import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/** 飞书 API 代理基础路径 */
const API_BASE = '/api/lark'

/**
 * 调用飞书后端 API 的通用封装
 *
 * @param method - HTTP 方法
 * @param path - API 路径(不含 /api/lark 前缀)
 * @param body - 请求体对象(可选)
 * @param query - URL 查询参数对象(可选)
 * @param useUserToken - 是否使用 user_access_token(可选)
 * @returns 后端返回的 JSON 数据
 */
async function larkApi(method: string, path: string, body?: any, query?: Record<string, string>, useUserToken?: boolean): Promise<any> {
  let url = `${API_BASE}${path}`
  if (useUserToken !== undefined && method === 'GET') {
    query = query || {}
    query.use_user_token = useUserToken ? '1' : '0'
  }
  if (query) {
    const params = new URLSearchParams(query)
    url += '?' + params.toString()
  }
  const options: RequestInit = { method }
  if (body) {
    options.headers = { 'Content-Type': 'application/json' }
    if (useUserToken !== undefined) body.use_user_token = useUserToken
    options.body = JSON.stringify(body)
  }
  const res = await fetch(url, options)
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.code && !res.ok) data.code = res.status
  // 后端 translateLarkError 已经把 details 精确拼接到 msg 中了，
  // 前端不需要再追加，避免信息重复/冗长。
  return data
}

/**
 * 分享飞书文档权限的工具定义
 */
export const feishuDocShareDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocShare',
    description: '【功能】将飞书文档的访问权限分享给指定用户. 【使用场景】用户要求"把文档发给我"、"给某某开编辑权限"、"共享文档给团队成员"时调用. 【示例】给 open_id 为 ou_xxx 的用户赋予 edit 权限;给邮箱 user@company.com 赋予 view 权限. 【注意】1) 若不知道用户 open_id,先用 feishuUserSearch 搜索;2) 文档必须是当前应用或当前用户创建的,否则可能无权限分享;3) full_access 包含管理权限,需谨慎授予. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '【格式】飞书文档 ID(docx 类型). 【示例】"doxcnxxxxxxxxxxxxxxxxx"' },
        member_id: { type: 'string', description: '【格式】被分享者的标识. 根据 member_type 的值填写对应格式的 ID. 【示例】(openid 时)"ou_xxxxxxxxxxxxxxxx"' },
        member_type: { type: 'string', enum: ['openid', 'userid', 'unionid', 'email', 'phone'], description: '【格式】被分享者标识类型. openid(用户 open_id,默认)、userid(租户内用户 ID)、unionid(跨应用用户标识)、email(用户邮箱)、phone(用户手机号). 【默认值】openid', default: 'openid' },
        perm: { type: 'string', enum: ['full_access', 'edit', 'view'], description: '【格式】权限级别. full_access(可管理,含编辑和分享权限)、edit(可编辑)、view(仅查看). 【默认值】full_access', default: 'full_access' },
        use_user_token: { type: 'boolean', description: '【格式】是否使用 user_access_token 而非 tenant_access_token. 当文档由用户个人创建(非应用创建)时,必须设为 true 才有权限分享. 【默认值】false', default: false },
      },
      required: ['document_id', 'member_id'],
    },
  },
}

/**
 * 取消飞书文档权限分享的工具定义
 */
export const feishuDocUnshareDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocUnshare',
    description: '【功能】取消飞书文档对指定用户的权限分享(撤回访问权限). 【使用场景】用户要求"撤销某人的文档权限"、"不要再让某某看到文档"、"收回编辑权限"时调用. 【示例】收回用户 ou_xxx 对某文档的查看权限. 【注意】1) 取消分享后该用户将无法再访问文档;2) 如果文档是由用户个人创建的,use_user_token 需要设为 true. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '【格式】飞书文档 ID(docx 类型). 【示例】"doxcnxxxxxxxxxxxxxxxxx"' },
        member_id: { type: 'string', description: '【格式】被撤销权限者的标识. 根据 member_type 的值填写对应格式的 ID. 【示例】(openid 时)"ou_xxxxxxxxxxxxxxxx"' },
        member_type: { type: 'string', enum: ['openid', 'userid', 'unionid', 'email', 'phone'], description: '【格式】被撤销权限者标识类型. openid(默认)、userid、unionid、email、phone. 【默认值】openid', default: 'openid' },
        use_user_token: { type: 'boolean', description: '【格式】是否使用 user_access_token. 当文档由用户个人创建时,必须设为 true. 【默认值】false', default: false },
      },
      required: ['document_id', 'member_id'],
    },
  },
}

/**
 * 分享飞书文档权限给指定用户
 *
 * @param args - 包含 document_id、member_id、member_type、perm、use_user_token 参数
 * @returns 分享结果
 */
export const feishuDocShare = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, member_id, member_type, perm, use_user_token } = args
  if (!document_id || !member_id) return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 member_id')
  try {
    const result = await larkApi('POST', '/doc/share', { document_id, member_id, member_type: member_type || 'openid', perm: perm || 'full_access' }, undefined, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '分享权限失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `文档权限分享成功！\n文档: ${document_id}\n用户: ${member_id}\n权限: ${perm || 'full_access'}`, 'feishuDocShare')
  } catch (error: any) {
    return createErrorResult(error.message, '分享权限请求失败')
  }
}

/**
 * 取消飞书文档对指定用户的权限分享
 *
 * @param args - 包含 document_id、member_id、member_type、use_user_token 参数
 * @returns 取消分享结果
 */
export const feishuDocUnshare = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, member_id, member_type, use_user_token } = args
  if (!document_id || !member_id) return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 member_id')
  try {
    const result = await larkApi('DELETE', '/doc/share', { document_id, member_id, member_type: member_type || 'openid' }, undefined, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '取消权限失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `文档权限已取消！\n文档: ${document_id}\n用户: ${member_id}`, 'feishuDocUnshare')
  } catch (error: any) {
    return createErrorResult(error.message, '取消权限请求失败')
  }
}
