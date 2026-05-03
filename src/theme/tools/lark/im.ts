/**
 * ============================================================================
 * im 模块
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
 * 发送飞书即时消息的工具定义
 */
export const feishuImSendDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuImSend',
    description: '【功能】向飞书用户或群聊发送即时消息. 【使用场景】需要主动通知某人、在群聊中发送信息、给用户发送处理结果时调用. 【示例】给用户发送"您的文档已生成",或在项目群发送日报. 【注意】1) receive_id 和 receive_id_type 必须对应;2) 发送给群聊时 receive_id_type 必须填 chat_id;3) 若不知道接收者 open_id,先用 feishuUserSearch 搜索. ',
    parameters: {
      type: 'object',
      properties: {
        receive_id: { type: 'string', description: '【格式】接收者标识. 单聊填用户 open_id / user_id / union_id / email;群聊填 chat_id. 【示例】"ou_xxxxxxxxxxxxxxxx"(用户 open_id)或 "oc_xxxxxxxxxxxxxxxx"(群 chat_id)' },
        receive_id_type: { type: 'string', enum: ['open_id', 'user_id', 'union_id', 'email', 'chat_id'], description: '【格式】接收者 ID 类型. open_id(用户唯一标识,推荐)、user_id(租户内用户 ID)、union_id(跨应用用户标识)、email(用户邮箱)、chat_id(群聊 ID). 【默认值】open_id', default: 'open_id' },
        msg_type: { type: 'string', enum: ['text', 'post', 'image', 'file', 'interactive'], description: '【格式】消息类型. text=纯文本(默认,content 直接传字符串);post=富文本(content 传 JSON);image=图片(content 传 image_key);file=文件(content 传 file_key);interactive=卡片消息(content 传卡片 JSON). 【默认值】text', default: 'text' },
        content: { type: 'string', description: '【格式】消息内容. msg_type=text 时传纯文本字符串(如"您好,任务已完成");msg_type=post/image/file/interactive 时传对应格式的 JSON 字符串. 【必填】' },
      },
      required: ['receive_id', 'content'],
    },
  },
}

/**
 * 发送飞书即时消息
 *
 * @param args - 包含 receive_id、receive_id_type、msg_type、content 参数
 * @returns 发送结果,包含 message_id
 */
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
