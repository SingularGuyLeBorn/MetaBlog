import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

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

export const feishuImSendDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuImSend',
    description: '发送飞书即时消息。支持单聊和群聊。',
    parameters: {
      type: 'object',
      properties: {
        receive_id: { type: 'string', description: '接收者 ID(open_id / user_id / chat_id / email)' },
        receive_id_type: { type: 'string', enum: ['open_id', 'user_id', 'union_id', 'email', 'chat_id'], description: '接收者 ID 类型', default: 'open_id' },
        msg_type: { type: 'string', enum: ['text', 'post', 'image', 'file', 'interactive'], description: '消息类型', default: 'text' },
        content: { type: 'string', description: '消息内容。text 类型直接传纯文本字符串即可' },
      },
      required: ['receive_id', 'content'],
    },
  },
}

export const feishuImSend = async (args: Record<string, any>): Promise<ToolResult> => {
  const { receive_id, receive_id_type = 'open_id', msg_type = 'text', content } = args
  if (!receive_id || !content) return createErrorResult('Missing parameters', '缺少参数', '需要 receive_id 和 content')
  try {
    const result = await larkApi('POST', '/im/send', { receive_id, receive_id_type, msg_type, content })
    if (result.code !== 0) return createErrorResult(result.msg, '发送消息失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `消息发送成功！message_id: ${result.data?.message_id}`, 'feishuImSend')
  } catch (error: any) {
    return createErrorResult(error.message, '发送消息请求失败')
  }
}
