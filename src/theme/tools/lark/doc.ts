import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { markdownToBlocks } from './markdown-to-blocks'

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

// ============ 定义 ============

export const feishuDocCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocCreate',
    description: '创建一个新的飞书文档(docx 格式)，返回文档 ID 和链接。支持创建后自动分享给指定用户。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文档标题' },
        folder_token: { type: 'string', description: '父文件夹 token(可选)' },
        owner_email: { type: 'string', description: '文档所有者的企业邮箱(可选)。传入后自动将该用户添加为协作者' },
        owner_mobile: { type: 'string', description: '文档所有者的手机号(可选)。与 owner_email 二选一即可' },
        enable_permission: { type: 'boolean', description: '是否自动分享权限给 owner_email/owner_mobile 指定的用户。默认 true', default: true },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token 创建文档。默认 false', default: false },
      },
      required: ['title'],
    },
  },
}

export const feishuDocReadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocRead',
    description: '读取飞书文档的纯文本内容。document_id 从飞书文档 URL 中获取：链接形如 https://xxx.feishu.cn/docx/AbCdEfGh → document_id = AbCdEfGh',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID，从飞书 URL 的 docx/ 后面获取' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token 读取。默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocMetaDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocMeta',
    description: '读取飞书文档的元数据(标题、所有者、创建时间等)。',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token。默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocSearch',
    description: '在飞书云空间中搜索文档，返回文档名称、链接、类型等信息。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        count: { type: 'number', description: '返回结果数量，默认 20，最大 50', default: 20 },
      },
      required: ['query'],
    },
  },
}

export const feishuDocBlocksDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocBlocks',
    description: '获取飞书文档的块(block)结构列表。常见 block_type：2=text, 3-11=heading1-9, 12=bullet, 13=ordered, 14=code, 15=quote, 17=todo, 22=divider, 27=image, 31=table',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID' },
        page_size: { type: 'number', description: '每页块数量，默认 500，最大 500', default: 500 },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token。默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocAppendDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocAppend',
    description: '在飞书文档末尾追加内容。content 参数支持 Markdown 语法，会自动解析为飞书 block 格式。超过 50 个块自动分批写入。\n\n⚠️ 重要：content 中包含数学公式(如 $...$)时，公式里的反斜杠在 JSON 参数中必须双重转义，例如 \\pi、\\theta、\\frac、\\cdot。未转义会导致参数解析失败。',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID' },
        content: { type: 'string', description: '纯文本内容，按换行自动分段(与 blocks 二选一)' },
        blocks: { type: 'array', description: '飞书块格式数组(与 content 二选一)', items: { type: 'object' } },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token。默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocUpdateBlockDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocUpdateBlock',
    description: '更新飞书文档中的指定块内容。需要先调用 feishuDocBlocks 获取 block_id。\n\n⚠️ 重要：text / heading 等字段中的 content 如果包含数学公式，反斜杠必须双重转义(如 \\pi、\\theta、\\frac)，否则 JSON 参数解析会失败。',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID' },
        block_id: { type: 'string', description: '块 ID' },
        block_type: { type: 'number', description: '块类型(2=text, 3=heading1, ... 14=code 等)' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token。默认 false', default: false },
      },
      required: ['document_id', 'block_id', 'block_type'],
    },
  },
}

export const feishuDocDeleteBlockDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocDeleteBlock',
    description: '删除飞书文档中的指定块。需要先调用 feishuDocBlocks 获取 block_id。',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID' },
        block_id: { type: 'string', description: '块 ID' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token。默认 false', default: false },
      },
      required: ['document_id', 'block_id'],
    },
  },
}

// ============ 执行器 ============

export const feishuDocCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { title, folder_token, owner_email, owner_mobile, enable_permission, use_user_token } = args
  try {
    const result = await larkApi('POST', '/doc/create', { title, folder_token, owner_email, owner_mobile, enable_permission }, undefined, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '创建文档失败', `错误码: ${result.code}`)
    const doc = result.data?.document
    return createSuccessResult(result.data, `文档创建成功！\n标题: ${doc?.title || title || '未命名'}\n文档ID: ${doc?.document_id}\nURL: https://feishu.cn/docx/${doc?.document_id}`, 'feishuDocCreate')
  } catch (error: any) {
    return createErrorResult(error.message, '创建文档请求失败')
  }
}

export const feishuDocRead = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, use_user_token } = args
  if (!document_id) return createErrorResult('Missing document_id', '缺少文档ID', 'document_id 可从飞书文档 URL 中获取，如 docx/xxx 中的 xxx')
  try {
    const result = await larkApi('GET', '/doc/read', undefined, { document_id }, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '读取文档失败', `错误码: ${result.code}`)
    const content = result.data?.content || ''
    return createSuccessResult(result.data, content, 'feishuDocRead')
  } catch (error: any) {
    return createErrorResult(error.message, '读取文档请求失败')
  }
}

export const feishuDocMeta = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, use_user_token } = args
  if (!document_id) return createErrorResult('Missing document_id', '缺少文档ID')
  try {
    const result = await larkApi('GET', '/doc/meta', undefined, { document_id }, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '读取文档元数据失败', `错误码: ${result.code}`)
    const doc = result.data?.document || result.data
    return createSuccessResult(result.data, `文档: ${doc?.title || '未命名'}\n所有者: ${doc?.owner_id || 'N/A'}\n创建时间: ${doc?.create_time || 'N/A'}`, 'feishuDocMeta')
  } catch (error: any) {
    return createErrorResult(error.message, '读取文档元数据请求失败')
  }
}

export const feishuDocSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query, count = 20 } = args
  if (!query) return createErrorResult('Missing query', '缺少搜索关键词')
  try {
    const result = await larkApi('POST', '/doc/search', { search_key: query, count })
    if (result.code !== 0) return createErrorResult(result.msg, '搜索文档失败', `错误码: ${result.code}`)
    const files = result.data?.files || []
    const formatted = files.map((f: any, i: number) => `${i + 1}. ${f.name} (${f.type})\n   URL: ${f.url}\n   Token: ${f.token}`).join('\n\n')
    return createSuccessResult(result.data, files.length > 0 ? formatted : '未找到匹配的文档', 'feishuDocSearch')
  } catch (error: any) {
    return createErrorResult(error.message, '搜索文档请求失败')
  }
}

export const feishuDocBlocks = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, page_size = 500, use_user_token } = args
  if (!document_id) return createErrorResult('Missing document_id', '缺少文档ID')
  try {
    const result = await larkApi('GET', '/doc/blocks', undefined, { document_id, page_size: String(page_size) }, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '获取文档块失败', `错误码: ${result.code}`)
    const items = result.data?.items || []
    const typeNames: Record<number, string> = {
      1: 'page', 2: 'text', 3: 'heading1', 4: 'heading2', 5: 'heading3',
      6: 'heading4', 7: 'heading5', 8: 'heading6', 9: 'heading7', 10: 'heading8',
      11: 'heading9', 12: 'bullet', 13: 'ordered', 14: 'code', 15: 'quote',
      17: 'todo', 22: 'divider', 27: 'image', 31: 'table', 32: 'table_cell',
    }
    const formatted = items.map((item: any) => {
      const typeName = typeNames[item.block_type] || `type_${item.block_type}`
      const text = extractTextFromBlock(item)
      return `- [${typeName}] block_id: ${item.block_id} | "${text}"`
    }).join('\n')
    return createSuccessResult(result.data, `文档块列表 (${items.length} 个):\n${formatted}`, 'feishuDocBlocks')
  } catch (error: any) {
    return createErrorResult(error.message, '获取文档块请求失败')
  }
}

export const feishuDocAppend = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, blocks, content, use_user_token } = args
  if (!document_id) return createErrorResult('Missing document_id', '缺少文档ID')

  const MAX_BLOCKS_PER_REQUEST = 50
  const MAX_CHARS_PER_BLOCK = 8000
  const QPS_DELAY_MS = 400

  let allBlocks = blocks
  if (!allBlocks && content) {
    allBlocks = markdownToBlocks(String(content))
    allBlocks = splitLongTextRuns(allBlocks, MAX_CHARS_PER_BLOCK)
  }

  if (!allBlocks || !Array.isArray(allBlocks) || allBlocks.length === 0) {
    return createErrorResult('Missing blocks or content', '缺少内容', '请提供 blocks 或 content')
  }

  const totalBlocks = allBlocks.length
  const totalBatches = Math.ceil(totalBlocks / MAX_BLOCKS_PER_REQUEST)
  let appendedCount = 0

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * MAX_BLOCKS_PER_REQUEST
    const batch = allBlocks.slice(start, start + MAX_BLOCKS_PER_REQUEST)
    try {
      if (batchIndex > 0) await new Promise(r => setTimeout(r, QPS_DELAY_MS))
      const result = await larkApi('POST', '/doc/append', { document_id, blocks: batch }, undefined, use_user_token)
      if (result.code !== 0) {
        const code = result.code
        let reason = result.msg || '未知错误'
        let suggestion = `错误码: ${code}`
        if (code === 1770033) { reason = '单个文本块内容超过 10000 字符限制'; suggestion = '请缩短单段文本长度' }
        else if (code === 1770034) { reason = '单次请求块数量超过 50 个限制'; suggestion = '请减少 blocks 数量' }
        else if (code === 99992402) { reason = '请求字段校验失败'; suggestion = '检查内容长度和块数' }
        else if (code === 1770029) { reason = '不支持创建该类型的块'; suggestion = '使用支持的 block_type' }
        return createErrorResult(reason, `追加内容失败：第 ${batchIndex + 1}/${totalBatches} 批写入出错(已写入 ${appendedCount}/${totalBlocks} 块)`, suggestion)
      }
      appendedCount += batch.length
    } catch (error: any) {
      return createErrorResult(error.message, `追加内容请求失败：第 ${batchIndex + 1}/${totalBatches} 批(已写入 ${appendedCount}/${totalBlocks} 块)`)
    }
  }

  return createSuccessResult({ appendedCount, totalBlocks, totalBatches }, `成功追加 ${appendedCount} 个内容块到文档 ${document_id}${totalBatches > 1 ? `(分 ${totalBatches} 批写入)` : ''}`, 'feishuDocAppend')
}

export const feishuDocUpdateBlock = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, block_id, block_type, use_user_token, ...contentData } = args
  if (!document_id || !block_id) return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 block_id')

  const textBlockFields = ['text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'heading7', 'heading8', 'heading9', 'bullet', 'ordered', 'code', 'quote']
  let payload: Record<string, any> = { document_id, block_id }

  for (const field of textBlockFields) {
    if (contentData[field]) {
      payload.update_text_elements = { elements: contentData[field].elements || [] }
      break
    }
  }
  if (!payload.update_text_elements) payload = { ...payload, ...contentData }

  try {
    const result = await larkApi('PATCH', '/doc/block', payload, undefined, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '更新块失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `块 ${block_id} 更新成功`, 'feishuDocUpdateBlock')
  } catch (error: any) {
    return createErrorResult(error.message, '更新块请求失败')
  }
}

export const feishuDocDeleteBlock = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, block_id, use_user_token } = args
  if (!document_id || !block_id) return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 block_id')
  try {
    const result = await larkApi('DELETE', '/doc/block', { document_id, block_id }, undefined, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '删除块失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `块 ${block_id} 删除成功`, 'feishuDocDeleteBlock')
  } catch (error: any) {
    return createErrorResult(error.message, '删除块请求失败')
  }
}

// ============ 辅助函数 ============

function extractTextFromBlock(block: any): string {
  const elements =
    block.text?.elements ||
    block.heading1?.elements || block.heading2?.elements || block.heading3?.elements ||
    block.heading4?.elements || block.heading5?.elements || block.heading6?.elements ||
    block.bullet?.elements || block.ordered?.elements || block.code?.elements ||
    block.quote?.elements || block.todo?.elements || []
  return elements.map((el: any) => el.text_run?.content || el.mention_doc?.url || '').join('')
}

function splitLongTextRuns(blocks: any[], maxChars: number): any[] {
  return blocks.map(block => {
    const blockType = Object.keys(block).find(k => k !== 'block_type')
    if (!blockType) return block
    const data = block[blockType]
    if (!data || !Array.isArray(data.elements)) return block
    const newElements: any[] = []
    for (const el of data.elements) {
      if (el.text_run && typeof el.text_run.content === 'string' && el.text_run.content.length > maxChars) {
        const chunks = chunkString(el.text_run.content, maxChars)
        for (const chunk of chunks) {
          newElements.push({ text_run: { content: chunk, text_element_style: el.text_run.text_element_style } })
        }
      } else {
        newElements.push(el)
      }
    }
    return { ...block, [blockType]: { ...data, elements: newElements } }
  })
}

function chunkString(str: string, maxLen: number): string[] {
  if (str.length <= maxLen) return [str]
  const chunks: string[] = []
  let remaining = str
  while (remaining.length > maxLen) {
    let breakAt = remaining.lastIndexOf('\n', maxLen)
    if (breakAt <= 0) breakAt = maxLen
    chunks.push(remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt)
  }
  if (remaining) chunks.push(remaining)
  return chunks
}
