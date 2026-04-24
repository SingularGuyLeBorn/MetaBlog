import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

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
  return res.json()
}

export const feishuDocInsertImageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_insert_image',
    description: '插入图片到飞书文档（自动完成三步法：创建空图片块 → 上传素材 → 绑定）。支持网络图片 URL 或 Base64 编码。',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '飞书文档 ID' },
        image_url: { type: 'string', description: '网络图片 URL，支持 http/https' },
        image_base64: { type: 'string', description: '图片的 base64 编码字符串，可包含 data:image/png;base64, 前缀' },
        file_name: { type: 'string', description: '图片文件名（含扩展名），如 demo.png' },
        caption: { type: 'string', description: '图片下方图注文字' },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocInsertImage = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, image_url, image_base64, file_name, caption } = args
  if (!document_id) return createErrorResult('Missing document_id', '缺少文档 ID')
  if (!image_url && !image_base64) return createErrorResult('Missing image source', '缺少图片源', '需要 image_url 或 image_base64')
  try {
    const result = await larkApi('POST', '/doc/image/insert', { document_id, image_url, image_base64, file_name: file_name || 'image.png', caption })
    if (result.code !== 0) return createErrorResult(result.msg, '插入图片失败', `错误码: ${result.code}`)
    const blockId = result.data?.block_id
    const fileToken = result.data?.file_token
    return createSuccessResult(result.data, `图片插入成功！\nblock_id: ${blockId}\nfile_token: ${fileToken}${caption ? '\n图注: ' + caption : ''}`, 'feishu_doc_insert_image')
  } catch (error: any) {
    return createErrorResult(error.message, '插入图片请求失败')
  }
}
