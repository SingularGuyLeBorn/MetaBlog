import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

const API_BASE = '/api/lark'

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
  return data
}

export const feishuDocShareDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocShare',
    description: '分享飞书文档权限给指定用户。支持 open_id、邮箱、手机号。权限级别: full_access / edit / view。',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '飞书文档 ID' },
        member_id: { type: 'string', description: '用户标识(open_id / user_id / union_id / 邮箱 / 手机号)' },
        member_type: { type: 'string', enum: ['openid', 'userid', 'unionid', 'email', 'phone'], description: '用户标识类型', default: 'openid' },
        perm: { type: 'string', enum: ['full_access', 'edit', 'view'], description: '权限级别', default: 'full_access' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token。默认 false', default: false },
      },
      required: ['document_id', 'member_id'],
    },
  },
}

export const feishuDocUnshareDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocUnshare',
    description: '取消飞书文档对指定用户的权限分享。',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '飞书文档 ID' },
        member_id: { type: 'string', description: '用户标识' },
        member_type: { type: 'string', enum: ['openid', 'userid', 'unionid', 'email', 'phone'], description: '用户标识类型', default: 'openid' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token。默认 false', default: false },
      },
      required: ['document_id', 'member_id'],
    },
  },
}

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
