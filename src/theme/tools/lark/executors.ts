/**
 * 飞书 Open API 工具执行器
 * 直接调用后端 REST API，无需 lark-cli
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { markdownToBlocks } from './markdown-to-blocks'

const API_BASE = '/api/lark'

/** 通用 fetch 封装 */
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
  return res.json()
}

// ============================================
// 文档操作
// ============================================

/** 创建飞书文档 */
export const feishuDocCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { title, folder_token, owner_email, owner_mobile, enable_permission } = args

  try {
    const result = await larkApi('POST', '/doc/create', { title, folder_token, owner_email, owner_mobile, enable_permission })
    if (result.code !== 0) {
      return createErrorResult(result.msg, '创建文档失败', `错误码: ${result.code}`)
    }

    const doc = result.data?.document
    return createSuccessResult(
      result.data,
      `文档创建成功！\n标题: ${doc?.title || title || '未命名'}\n文档ID: ${doc?.document_id}\nURL: https://feishu.cn/docx/${doc?.document_id}`,
      'feishu_doc_create'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '创建文档请求失败')
  }
}

/** 读取飞书文档纯文本 */
export const feishuDocRead = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id } = args

  if (!document_id) {
    return createErrorResult('Missing document_id', '缺少文档ID', 'document_id 可从飞书文档 URL 中获取，如 docx/xxx 中的 xxx')
  }

  try {
    const result = await larkApi('GET', '/doc/read', undefined, { document_id })
    if (result.code !== 0) {
      return createErrorResult(result.msg, '读取文档失败', `错误码: ${result.code}`)
    }

    const content = result.data?.content || ''
    return createSuccessResult(
      result.data,
      content.slice(0, 10000),
      'feishu_doc_read'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '读取文档请求失败')
  }
}

/** 搜索飞书文档 */
export const feishuDocSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query, count = 20 } = args

  if (!query) {
    return createErrorResult('Missing query', '缺少搜索关键词')
  }

  try {
    const result = await larkApi('POST', '/doc/search', { search_key: query, count })
    if (result.code !== 0) {
      return createErrorResult(result.msg, '搜索文档失败', `错误码: ${result.code}`)
    }

    const files = result.data?.files || []
    const formatted = files.map((f: any, i: number) =>
      `${i + 1}. ${f.name} (${f.type})\n   URL: ${f.url}\n   Token: ${f.token}`
    ).join('\n\n')

    return createSuccessResult(
      result.data,
      files.length > 0 ? formatted : '未找到匹配的文档',
      'feishu_doc_search'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '搜索文档请求失败')
  }
}

/** 获取文档块结构 */
export const feishuDocBlocks = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, page_size = 500 } = args

  if (!document_id) {
    return createErrorResult('Missing document_id', '缺少文档ID')
  }

  try {
    const result = await larkApi('GET', '/doc/blocks', undefined, { document_id, page_size: String(page_size) })
    if (result.code !== 0) {
      return createErrorResult(result.msg, '获取文档块失败', `错误码: ${result.code}`)
    }

    const items = result.data?.items || []
    const formatted = items.map((item: any) => {
      const typeNames: Record<number, string> = {
        1: 'page', 2: 'text', 3: 'heading1', 4: 'heading2', 5: 'heading3',
        6: 'heading4', 7: 'heading5', 8: 'heading6', 9: 'heading7', 10: 'heading8',
        11: 'heading9', 12: 'bullet', 13: 'ordered', 14: 'code', 15: 'quote',
        17: 'todo', 22: 'divider', 27: 'image', 31: 'table', 32: 'table_cell',
      }
      const typeName = typeNames[item.block_type] || `type_${item.block_type}`
      const text = extractTextFromBlock(item)
      return `- [${typeName}] block_id: ${item.block_id} | "${text.slice(0, 80)}"`
    }).join('\n')

    return createSuccessResult(
      result.data,
      `文档块列表 (${items.length} 个):\n${formatted}`,
      'feishu_doc_blocks'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '获取文档块请求失败')
  }
}

/** 从块中提取文本 */
function extractTextFromBlock(block: any): string {
  const elements =
    block.text?.elements ||
    block.heading1?.elements ||
    block.heading2?.elements ||
    block.heading3?.elements ||
    block.heading4?.elements ||
    block.heading5?.elements ||
    block.heading6?.elements ||
    block.bullet?.elements ||
    block.ordered?.elements ||
    block.code?.elements ||
    block.quote?.elements ||
    block.todo?.elements ||
    []

  return elements
    .map((el: any) => el.text_run?.content || el.mention_doc?.url || '')
    .join('')
}

/** 在文档末尾追加内容块 */
export const feishuDocAppend = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, blocks, content } = args

  if (!document_id) {
    return createErrorResult('Missing document_id', '缺少文档ID')
  }

  // 飞书 API 限制常量
  const MAX_BLOCKS_PER_REQUEST = 50
  const MAX_CHARS_PER_BLOCK = 8000
  const QPS_DELAY_MS = 400  // 飞书限制 3 QPS，批次之间间隔 400ms

  // 将 content 字符串转换为 blocks（Markdown 解析 + 超长 text_run 拆分）
  let allBlocks = blocks

  if (!allBlocks && content) {
    // 1. Markdown → 飞书 blocks
    allBlocks = markdownToBlocks(String(content))
    // 2. 拆分超长 text_run（飞书限制单个 text_run 最多 10000 字符，留 8000 余量）
    allBlocks = splitLongTextRuns(allBlocks, MAX_CHARS_PER_BLOCK)
  }

  if (!allBlocks || !Array.isArray(allBlocks) || allBlocks.length === 0) {
    return createErrorResult('Missing blocks or content', '缺少内容', '请提供 blocks（飞书块格式数组）或 content（字符串，自动分段）')
  }

  // 分批写入：每批最多 50 个块，批次之间加延时避免 QPS 超限
  const totalBlocks = allBlocks.length
  const totalBatches = Math.ceil(totalBlocks / MAX_BLOCKS_PER_REQUEST)
  let appendedCount = 0

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * MAX_BLOCKS_PER_REQUEST
    const batch = allBlocks.slice(start, start + MAX_BLOCKS_PER_REQUEST)

    try {
      // 除第一批外，每批之间加延时
      if (batchIndex > 0) {
        await new Promise(r => setTimeout(r, QPS_DELAY_MS))
      }

      const result = await larkApi('POST', '/doc/append', { document_id, blocks: batch })

      if (result.code !== 0) {
        const code = result.code
        let reason = result.msg || '未知错误'
        let suggestion = `错误码: ${code}`

        if (code === 1770033) {
          reason = '单个文本块内容超过 10000 字符限制'
          suggestion = '请缩短单段文本长度，或拆分为多个小段落'
        } else if (code === 1770034) {
          reason = '单次请求块数量超过 50 个限制'
          suggestion = '请减少 blocks 数量，分多次调用 feishu_doc_append'
        } else if (code === 99992402) {
          reason = '请求字段校验失败（通常是内容过长或块数过多）'
          suggestion = '请检查：1) 单次块数不超过 50 个 2) 单个 text_run 内容不超过 10000 字符'
        } else if (code === 1770029) {
          reason = '不支持创建该类型的块'
          suggestion = '请使用支持的 block_type（2=text, 3=heading1, 14=code 等）'
        } else if (String(code).includes('frequency') || String(code).includes('rate') || code === -1) {
          reason = '调用频率超限（飞书 API 限制 3 QPS）'
          suggestion = '请稍后重试，避免短时间内多次调用'
        }

        return createErrorResult(
          reason,
          `追加内容失败：第 ${batchIndex + 1}/${totalBatches} 批写入出错（已写入 ${appendedCount}/${totalBlocks} 块）`,
          suggestion
        )
      }

      appendedCount += batch.length
    } catch (error: any) {
      return createErrorResult(
        error.message,
        `追加内容请求失败：第 ${batchIndex + 1}/${totalBatches} 批（已写入 ${appendedCount}/${totalBlocks} 块）`
      )
    }
  }

  return createSuccessResult(
    { appendedCount, totalBlocks, totalBatches },
    `成功追加 ${appendedCount} 个内容块到文档 ${document_id}${totalBatches > 1 ? `（分 ${totalBatches} 批写入）` : ''}`,
    'feishu_doc_append'
  )
}

/** 更新文档块 */
export const feishuDocUpdateBlock = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, block_id, block_type, ...contentData } = args

  if (!document_id || !block_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 block_id')
  }

  // 把 Agent 友好的 text/heading1/... 字段转换为飞书 API 要求的 update_text_elements
  const textBlockFields = ['text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'heading7', 'heading8', 'heading9', 'bullet', 'ordered', 'code', 'quote', 'todo']
  let payload: Record<string, any> = { document_id, block_id }

  for (const field of textBlockFields) {
    if (contentData[field]) {
      payload.update_text_elements = {
        elements: contentData[field].elements || []
      }
      break
    }
  }

  // 如果 Agent 直接传了 update_text_elements 或其他字段，透传
  if (!payload.update_text_elements) {
    payload = { ...payload, ...contentData }
  }

  try {
    const result = await larkApi('PATCH', '/doc/block', payload)
    if (result.code !== 0) {
      return createErrorResult(result.msg, '更新块失败', `错误码: ${result.code}`)
    }

    return createSuccessResult(
      result.data,
      `块 ${block_id} 更新成功`,
      'feishu_doc_update_block'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '更新块请求失败')
  }
}

/** 删除文档块 */
export const feishuDocDeleteBlock = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, block_id } = args

  if (!document_id || !block_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 block_id')
  }

  try {
    // 后端会自动查索引并调用 batch_delete
    const result = await larkApi('DELETE', '/doc/block', { document_id, block_id })
    if (result.code !== 0) {
      return createErrorResult(result.msg, '删除块失败', `错误码: ${result.code}`)
    }

    return createSuccessResult(
      result.data,
      `块 ${block_id} 删除成功`,
      'feishu_doc_delete_block'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '删除块请求失败')
  }
}

// ============================================
// 图片操作
// ============================================

/** 插入图片到飞书文档（三步法封装：创建空块 → 上传素材 → PATCH 绑定） */
export const feishuDocInsertImage = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, image_url, image_base64, file_name, caption } = args

  if (!document_id) {
    return createErrorResult('Missing document_id', '缺少文档 ID')
  }
  if (!image_url && !image_base64) {
    return createErrorResult('Missing image source', '缺少图片源', '需要 image_url（网络图片链接）或 image_base64（base64 编码）')
  }

  try {
    const result = await larkApi('POST', '/doc/image/insert', {
      document_id,
      image_url,
      image_base64,
      file_name: file_name || 'image.png',
      caption,
    })

    if (result.code !== 0) {
      return createErrorResult(result.msg, '插入图片失败', `错误码: ${result.code}`)
    }

    const blockId = result.data?.block_id
    const fileToken = result.data?.file_token
    return createSuccessResult(
      result.data,
      `图片插入成功！\nblock_id: ${blockId}\nfile_token: ${fileToken}${caption ? '\n图注: ' + caption : ''}`,
      'feishu_doc_insert_image'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '插入图片请求失败')
  }
}

// ============================================
// 权限操作
// ============================================

/** 分享飞书文档权限 */
export const feishuDocShare = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, member_id, member_type, perm } = args

  if (!document_id || !member_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 member_id')
  }

  try {
    const result = await larkApi('POST', '/doc/share', {
      document_id,
      member_id,
      member_type: member_type || 'openid',
      perm: perm || 'full_access',
    })

    if (result.code !== 0) {
      return createErrorResult(result.msg, '分享权限失败', `错误码: ${result.code}`)
    }

    return createSuccessResult(
      result.data,
      `文档权限分享成功！\n文档: ${document_id}\n用户: ${member_id}\n权限: ${perm || 'full_access'}`,
      'feishu_doc_share'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '分享权限请求失败')
  }
}

/** 取消飞书文档权限 */
export const feishuDocUnshare = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, member_id, member_type } = args

  if (!document_id || !member_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 member_id')
  }

  try {
    const result = await larkApi('DELETE', '/doc/share', {
      document_id,
      member_id,
      member_type: member_type || 'openid',
    })

    if (result.code !== 0) {
      return createErrorResult(result.msg, '取消权限失败', `错误码: ${result.code}`)
    }

    return createSuccessResult(
      result.data,
      `文档权限已取消！\n文档: ${document_id}\n用户: ${member_id}`,
      'feishu_doc_unshare'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '取消权限请求失败')
  }
}

// ============================================
// 消息操作
// ============================================

/** 发送飞书消息 */
export const feishuImSend = async (args: Record<string, any>): Promise<ToolResult> => {
  const { receive_id, receive_id_type = 'open_id', msg_type = 'text', content } = args

  if (!receive_id || !content) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 receive_id 和 content')
  }

  try {
    const result = await larkApi('POST', '/im/send', { receive_id, receive_id_type, msg_type, content })
    if (result.code !== 0) {
      return createErrorResult(result.msg, '发送消息失败', `错误码: ${result.code}`)
    }

    return createSuccessResult(
      result.data,
      `消息发送成功！message_id: ${result.data?.message_id}`,
      'feishu_im_send'
    )
  } catch (error: any) {
    return createErrorResult(error.message, '发送消息请求失败')
  }
}

// ============================================
// 用户操作
// ============================================

/** 搜索/查找飞书用户 */
export const feishuUserSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query, type } = args

  if (!query) {
    return createErrorResult('Missing query', '缺少 query 参数', '请提供 query（查询内容）和 type（查询类型: phone/email/keyword）')
  }

  try {
    const result = await larkApi('POST', '/user/search', { query, type: type || 'keyword' })
    if (result.code !== 0) {
      return createErrorResult(result.msg, '查找用户失败', `错误码: ${result.code}`)
    }

    const users = result.data?.user_list || result.data?.user_ids || []
    const formatted = Array.isArray(users) && users.length > 0
      ? users.map((u: any, i: number) => {
          const info = u.user_id ? u : u.user
          return `${i + 1}. ${info?.name || '未知'} (${info?.email || info?.mobile || ''})\n   open_id: ${info?.open_id || info?.user_id || ''}`
        }).join('\n\n')
      : '未找到用户'

    return createSuccessResult(result.data, formatted, 'feishu_user_search')
  } catch (error: any) {
    return createErrorResult(error.message, '查找用户请求失败')
  }
}

// ============================================
// Markdown → Blocks 辅助函数
// ============================================

/** 遍历所有 blocks，拆分超长 text_run（飞书限制单个 text_run ≤10000 字符） */
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
          newElements.push({
            text_run: {
              content: chunk,
              text_element_style: el.text_run.text_element_style,
            },
          })
        }
      } else {
        newElements.push(el)
      }
    }

    return {
      ...block,
      [blockType]: {
        ...data,
        elements: newElements,
      },
    }
  })
}

/** 将字符串按最大长度拆分，优先在换行处断开 */
function chunkString(str: string, maxLen: number): string[] {
  if (str.length <= maxLen) return [str]
  const chunks: string[] = []
  let remaining = str
  while (remaining.length > maxLen) {
    // 尝试在换行处断开
    let breakAt = remaining.lastIndexOf('\n', maxLen)
    if (breakAt <= 0) breakAt = maxLen
    chunks.push(remaining.slice(0, breakAt))
    remaining = remaining.slice(breakAt)
  }
  if (remaining) chunks.push(remaining)
  return chunks
}
