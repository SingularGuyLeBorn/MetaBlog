/**
 * ============================================================================
 * user 模块
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
 * @returns 后端返回的 JSON 数据
 */
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

/**
 * 搜索飞书用户的工具定义
 */
export const feishuUserSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuUserSearch',
    description: '【功能】在飞书组织架构中搜索用户,获取用户的 open_id、姓名、邮箱等信息. 【使用场景】需要给某人发消息但不知道 open_id、需要查找团队成员信息、需要将文档分享给特定用户时调用. 【示例】按姓名搜索"张三"获取其 open_id;按邮箱精确匹配"zhangsan@company.com". 【参数说明】query: 查询关键词(必填). type=phone 时填手机号(如"13800138000");type=email 时填邮箱(如"zhangsan@company.com");type=keyword 时填姓名或部门关键词(如"张三"). type: 查询类型(可选,默认 keyword). 可选值：phone(手机号精确匹配)、email(邮箱精确匹配)、keyword(姓名/部门关键词模糊搜索). 【返回值】用户列表,包含 name(姓名)、email(邮箱)、open_id(用户唯一标识). 【注意】1) 按手机号或邮箱精确匹配最准确;2) 按 keyword 搜索可能返回多个结果;3) 获取到的 open_id 可用于 feishuImSend 或 feishuDocShare. ',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '【格式】查询关键词. type=phone 时填手机号(如"13800138000");type=email 时填邮箱(如"zhangsan@company.com");type=keyword 时填姓名、部门名等关键词(如"张三"). 【必填】' },
        type: { type: 'string', enum: ['phone', 'email', 'keyword'], description: '【格式】查询类型. phone(按手机号精确匹配)、email(按邮箱精确匹配)、keyword(按姓名/部门关键词模糊搜索,默认). 【默认值】keyword', default: 'keyword' },
      },
      required: ['query'],
    },
  },
}

/**
 * 搜索飞书用户
 *
 * @param args - 包含 query、type 参数
 * @returns 用户列表,包含姓名、邮箱、open_id 等信息
 */
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
