import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api/lark'

async function larkApi(method: string, path: string, body?: any, query?: Record<string, string>): Promise<any> {
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
  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  if (!data.code && !res.ok) data.code = res.status
  return data
}

export const feishuUserSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuUserSearch',
    description: '搜索或查找飞书用户，获取用户的 open_id 等信息。按手机号/邮箱精确匹配只需要 contact:user.id:readonly 权限；按关键词搜索需要 contact:contact.base:readonly 权限。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '查询内容（手机号、邮箱、姓名等）' },
        type: { type: 'string', enum: ['phone', 'email', 'keyword'], description: '查询类型：phone=手机号, email=邮箱, keyword=姓名/部门关键词（默认 keyword）', default: 'keyword' },
      },
      required: ['query'],
    },
  },
}

export const feishuUserSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query, type } = args
  if (!query) return createErrorResult('Missing query', '缺少 query 参数', '请提供 query 和 type')
  try {
    const result = await larkApi('POST', '/user/search', { query, type: type || 'keyword' })
    if (result.code !== 0) return createErrorResult(result.msg, '查找用户失败', `错误码: ${result.code}`)
    const users = result.data?.user_list || result.data?.user_ids || []
    const formatted = Array.isArray(users) && users.length > 0
      ? users.map((u: any, i: number) => {
          const info = u.user_id ? u : u.user
          return `${i + 1}. ${info?.name || '未知'} (${info?.email || info?.mobile || ''})\n   open_id: ${info?.open_id || info?.user_id || ''}`
        }).join('\n\n')
      : '未找到用户'
    return createSuccessResult(result.data, formatted, 'feishuUserSearch')
  } catch (error: any) {
    return createErrorResult(error.message, '查找用户请求失败')
  }
}
