/**
 * ============================================================================
 * image 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/lark
 */


/**
 * ============================================================================
 * 飞书文档图片插入工具
 * ============================================================================
 *
 * 提供向飞书文档中插入图片的能力,支持网络图片 URL 和 Base64 编码图片. 
 * 后端自动完成"创建空图片块 → 上传素材 → 绑定"三步流程. 
 *
 * @module src/theme/tools/lark/image
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
  return data
}

/**
 * 向飞书文档插入图片的工具定义
 */
export const feishuDocInsertImageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocInsertImage',
    description: '【功能】向飞书文档中插入图片,自动完成"创建空图片块 → 上传素材 → 绑定"三步流程. 【使用场景】需要在飞书文档里配图、插入截图、添加示意图时调用. 【示例】将网络图片 https://example.com/chart.png 插入到文档末尾,或把 Base64 编码的截图插入报告中. 【注意】1) image_url 和 image_base64 二选一必填;2) 网络图片必须可被公网访问. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '【格式】飞书文档 ID(docx 类型). 【示例】"doxcnxxxxxxxxxxxxxxxxx"' },
        image_url: { type: 'string', description: '【格式】网络图片 URL,必须以 http:// 或 https:// 开头. 与 image_base64 二选一. 【示例】"https://example.com/image.png"' },
        image_base64: { type: 'string', description: '【格式】图片的 Base64 编码字符串. 可包含 data:image/png;base64, 前缀,也可纯编码. 与 image_url 二选一. 【示例】"data:image/png;base64,iVBORw0KGgo..."' },
        file_name: { type: 'string', description: '【格式】图片文件名(含扩展名),用于上传时标识文件类型. 【默认值】image.png. 【示例】"screenshot.png"、"chart.jpg"' },
        caption: { type: 'string', description: '【格式】图片下方图注文字(可选). 【示例】"图1：2025年Q1销售数据趋势"' },
      },
      required: ['document_id'],
    },
  },
}

/**
 * 向飞书文档插入图片
 *
 * @param args - 包含 document_id、image_url、image_base64、file_name、caption 参数
 * @returns 插入结果,包含 block_id 和 file_token
 */
export const feishuDocInsertImage = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, image_url, image_base64, file_name, caption } = args
  if (!document_id) return createErrorResult('Missing document_id', '缺少文档 ID')
  if (!image_url && !image_base64) return createErrorResult('Missing image source', '缺少图片源', '需要 image_url 或 image_base64')
  try {
    const result = await larkApi('POST', '/doc/image/insert', { document_id, image_url, image_base64, file_name: file_name || 'image.png', caption })
    if (result.code !== 0) return createErrorResult(result.msg, '插入图片失败', `错误码: ${result.code}`)
    const blockId = result.data?.block_id
    const fileToken = result.data?.file_token
    return createSuccessResult(result.data, `图片插入成功！\nblock_id: ${blockId}\nfile_token: ${fileToken}${caption ? '\n图注: ' + caption : ''}`, 'feishuDocInsertImage')
  } catch (error: any) {
    return createErrorResult(error.message, '插入图片请求失败')
  }
}
