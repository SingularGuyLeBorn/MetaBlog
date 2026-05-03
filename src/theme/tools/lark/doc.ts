/**
 * ============================================================================
 * doc 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/lark
 */


/**
 * ============================================================================
 * 飞书文档(docx)操作工具集
 * ============================================================================
 *
 * 提供飞书文档的创建、读取、搜索、块操作、内容追加等功能. 
 * 所有操作通过后端 /api/lark 代理调用飞书 Open API,支持 tenant_access_token
 * 和 user_access_token 两种鉴权模式. 
 *
 * @module src/theme/tools/lark/doc
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { markdownToBlocks, markdownToBlocksWithDiagnostics } from './markdown-to-blocks'

/** 飞书 API 代理基础路径 */
const API_BASE = '/api/lark'

/**
 * 从飞书文档链接中提取 document_id
 *
 * 飞书文档链接格式多样,本函数统一提取 docx/docs/wiki 后的标识. 
 * 如果输入已经是纯 document_id(不含斜杠),则直接返回. 
 *
 * @param input - 文档链接或 document_id
 * @returns 提取后的 document_id
 *
 * @example
 * ```typescript
 * extractDocumentId('https://xxx.feishu.cn/docx/AbCdEfGh') // 'AbCdEfGh'
 * extractDocumentId('AbCdEfGh') // 'AbCdEfGh'
 * ```
 */
function extractDocumentId(input: string): string {
  if (!input) return ''
  const trimmed = input.trim()
  if (!trimmed.includes('/')) return trimmed
  const match = trimmed.match(/\/(?:docx|docs|wiki)\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : trimmed
}

/**
 * 调用飞书后端 API 的通用封装
 *
 * 负责构建请求 URL、处理查询参数、序列化请求体、解析响应. 
 * 对非 JSON 响应会抛出异常,便于上层统一错误处理. 
 *
 * @param method - HTTP 方法(GET/POST/PUT/PATCH/DELETE)
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

// ============ 工具定义 ============

/**
 * 创建飞书文档的工具定义
 */
export const feishuDocCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocCreate',
    description: '【功能】创建一个新的飞书文档(docx 格式). 【使用场景】用户要求"新建文档"、"创建一个docx"时调用. 【示例】创建标题为"周报"的飞书文档. 【注意】1) 默认使用 tenant_access_token 创建(应用级文档),创建后需手动分享权限;2) 传 use_user_token=true 时使用用户 token 创建,创建者自动拥有 owner 权限,无需额外分享;3) 若文档需要迁入 Wiki 知识库,必须传 use_user_token=true,否则迁入会失败;4) 支持创建后自动分享给指定用户. ',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文档标题' },
        folder_token: { type: 'string', description: '父文件夹 token(可选)' },
        owner_email: { type: 'string', description: '文档所有者的企业邮箱(可选). 传入后自动将该用户添加为协作者' },
        owner_mobile: { type: 'string', description: '文档所有者的手机号(可选). 与 owner_email 二选一即可' },
        enable_permission: { type: 'boolean', description: '是否自动分享权限给 owner_email/owner_mobile 指定的用户. 默认 true', default: true },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token 创建文档. 默认 false', default: false },
      },
      required: ['title'],
    },
  },
}

/**
 * 读取飞书文档的工具定义
 */
export const feishuDocReadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocRead',
    description: '读取飞书文档的纯文本内容. 支持传入完整飞书文档链接,会自动提取 document_id. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID 或完整飞书文档链接. 支持格式：https://xxx.feishu.cn/docx/AbCdEfGh、https://xxx.feishu.cn/docs/AbCdEfGh' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token 读取. 默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

/**
 * 读取飞书文档元数据的工具定义
 */
export const feishuDocMetaDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocMeta',
    description: '读取飞书文档的元数据(标题、所有者、创建时间等). 支持传入完整飞书文档链接. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID 或完整飞书文档链接' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token. 默认 true. 重要：追加 Wiki 知识库内创建的文档(feishuWikiNodeCreate)时,必须传 true 或保持默认,因为此类文档只能用 user_access_token 写入;追加普通文档(feishuDocCreate)时可传 false 使用 tenant token. ', default: true },
      },
      required: ['document_id'],
    },
  },
}

/**
 * 搜索飞书文档的工具定义
 */
export const feishuDocSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocSearch',
    description: '在飞书云空间中搜索文档,返回文档名称、链接、类型等信息. ',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        count: { type: 'number', description: '返回结果数量,默认 20,最大 50', default: 20 },
      },
      required: ['query'],
    },
  },
}

/**
 * 获取飞书文档块结构的工具定义
 */
export const feishuDocBlocksDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocBlocks',
    description: '获取飞书文档的块(block)结构列表. 支持传入完整飞书文档链接. 常见 block_type：2=text, 3-11=heading1-9, 12=bullet, 13=ordered, 14=code, 15=quote, 17=todo, 22=divider, 27=image, 31=table',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID 或完整飞书文档链接' },
        page_size: { type: 'number', description: '每页块数量,默认 500,最大 500', default: 500 },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token. 默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

/**
 * 追加内容到飞书文档的工具定义
 */
export const feishuDocAppendDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocAppend',
    description: '在飞书文档末尾追加内容. 支持传入完整飞书文档链接. content 参数支持 Markdown 语法,会自动解析为飞书 block 格式. 超过 50 个块自动分批写入. \n\n【document_id 获取方式】\n- 用 feishuWikiNodeCreate 创建的 Wiki 节点：document_id = 返回的 obj_token\n- 用 feishuDocCreate 创建的文档：document_id = 返回的 document.document_id\n- 也可以直接传入完整飞书文档链接(如 https://feishu.cn/docx/AbCdEfGh)\n\n【Markdown 格式强制规范】\n- 段落必须顶格写,行首严禁出现空格\n- 无序列表统一用 `- `(减号+空格),禁止用 `*` 或 `+`\n- 加粗用 `**重点**`,星号必须紧贴文本,内侧禁止空格\n- 代码块必须用 fenced code block(```python),禁止用缩进代码块\n- 图片用 `![描述](URL)`,禁止用 HTML <img>\n- 表格用标准 Markdown 表格语法\n\n【数学公式规范】\n- 行内公式用 `$...$`,块级公式用 `$$...$$`\n- 使用标准 LaTeX 语法(如 `\\pi`、`\\theta`、`\\frac`)\n- 绝对禁止将公式写成纯文本(如 `J(theta) = E[...]`)\n- 绝对禁止在 JSON 参数中双重转义(如 `\\\\pi`)\n\n⚠️ 格式错误会导致渲染异常或内容丢失. 链接路径错误会导致 404 页面无法加载. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID 或完整飞书文档链接' },
        content: { type: 'string', description: 'Markdown 格式内容. 按换行自动分段. 支持公式、表格、代码块、图片等(与 blocks 二选一)' },
        blocks: { type: 'array', description: '飞书块格式数组(与 content 二选一). 优先使用 content,blocks 仅在需要精确控制块类型时使用', items: { type: 'object' } },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token. 默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

/**
 * 更新飞书文档指定块的工具定义
 */
export const feishuDocUpdateBlockDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocUpdateBlock',
    description: '更新飞书文档中的指定块内容. 支持传入完整飞书文档链接. 需要先调用 feishuDocBlocks 获取 block_id. \n\n【内容格式规范】\n- text / heading 等字段中的 content 如果包含数学公式,必须使用标准 LaTeX 语法(如 `\\pi`、`\\theta`、`\\frac`)并用 `$...$` 或 `$$...$$` 包裹\n- 绝对禁止将公式写成纯文本\n- 绝对禁止在 JSON 参数中双重转义(如 `\\\\pi`)\n- 段落顶格写,行首严禁空格;无序列表用 `- `;加粗用 `**重点**`(星号紧贴文本)',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID 或完整飞书文档链接' },
        block_id: { type: 'string', description: '块 ID' },
        block_type: { type: 'number', description: '块类型(2=text, 3=heading1, ... 14=code 等)' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token. 默认 false', default: false },
      },
      required: ['document_id', 'block_id', 'block_type'],
    },
  },
}

/**
 * 删除飞书文档指定块的工具定义
 */
export const feishuDocDeleteBlockDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocDeleteBlock',
    description: '删除飞书文档中的指定块. 支持传入完整飞书文档链接. 需要先调用 feishuDocBlocks 获取 block_id. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID 或完整飞书文档链接' },
        block_id: { type: 'string', description: '块 ID' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token. 默认 false', default: false },
      },
      required: ['document_id', 'block_id'],
    },
  },
}

/**
 * 清空飞书文档内容的工具定义
 */
export const feishuDocClearDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuDocClear',
    description: '【⚠️ 危险操作】清空飞书文档中的所有内容块(保留文档本身). 删除后无法恢复！调用前必须向用户确认. 支持传入完整飞书文档链接. ',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: '文档 ID 或完整飞书文档链接' },
        use_user_token: { type: 'boolean', description: '是否使用 user_access_token. 默认 false', default: false },
      },
      required: ['document_id'],
    },
  },
}

// ============ 执行器 ============

/**
 * 创建飞书文档
 *
 * @param args - 包含 title、folder_token、owner_email 等参数
 * @returns 创建结果,包含文档 ID 和链接
 */
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

/**
 * 读取飞书文档纯文本内容
 *
 * @param args - 包含 document_id、use_user_token 参数
 * @returns 文档内容文本
 */
export const feishuDocRead = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, use_user_token } = args
  const docId = extractDocumentId(document_id)
  if (!docId) return createErrorResult('Missing document_id', '缺少文档ID', '请传入飞书文档链接(如 https://xxx.feishu.cn/docx/AbCdEfGh)或直接传入 document_id')
  try {
    const result = await larkApi('GET', '/doc/read', undefined, { document_id: docId }, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '读取文档失败', `错误码: ${result.code}`)
    const content = result.data?.content || ''
    return createSuccessResult(result.data, content, 'feishuDocRead')
  } catch (error: any) {
    return createErrorResult(error.message, '读取文档请求失败')
  }
}

/**
 * 读取飞书文档元数据
 *
 * @param args - 包含 document_id、use_user_token 参数
 * @returns 文档元数据(标题、所有者、创建时间等)
 */
export const feishuDocMeta = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, use_user_token } = args
  const docId = extractDocumentId(document_id)
  if (!docId) return createErrorResult('Missing document_id', '缺少文档ID', '请传入飞书文档链接或直接传入 document_id')
  try {
    const result = await larkApi('GET', '/doc/meta', undefined, { document_id: docId }, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '读取文档元数据失败', `错误码: ${result.code}`)
    const doc = result.data?.document || result.data
    return createSuccessResult(result.data, `文档: ${doc?.title || '未命名'}\n所有者: ${doc?.owner_id || 'N/A'}\n创建时间: ${doc?.create_time || 'N/A'}`, 'feishuDocMeta')
  } catch (error: any) {
    return createErrorResult(error.message, '读取文档元数据请求失败')
  }
}

/**
 * 在飞书云空间中搜索文档
 *
 * @param args - 包含 query、count 参数
 * @returns 搜索结果列表
 */
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

/**
 * 获取飞书文档的块结构列表
 *
 * @param args - 包含 document_id、page_size、use_user_token 参数
 * @returns 块列表及类型映射
 */
export const feishuDocBlocks = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, page_size = 500, use_user_token } = args
  const docId = extractDocumentId(document_id)
  if (!docId) return createErrorResult('Missing document_id', '缺少文档ID', '请传入飞书文档链接或直接传入 document_id')
  try {
    const result = await larkApi('GET', '/doc/blocks', undefined, { document_id: docId, page_size: String(page_size) }, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '获取文档块失败', `错误码: ${result.code}`)
    const items = result.data?.items || []
    /** 飞书 block_type 到可读名称的映射表 */
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

/**
 * 向飞书文档末尾追加内容
 *
 * 飞书 API 限制单次最多 50 个块、单个文本块最多 10000 字符,
 * 因此本执行器会自动分批写入,并在批次间加入延迟避免 QPS 超限. 
 *
 * @param args - 包含 document_id、blocks、content、use_user_token 参数
 * @returns 追加结果,包含实际写入块数和批次信息
 */
export const feishuDocAppend = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, blocks, content, use_user_token } = args
  const docId = extractDocumentId(document_id)
  if (!docId) return createErrorResult('Missing document_id', '缺少文档ID', '请传入飞书文档链接或直接传入 document_id')

  /** 飞书 API 单次请求最大块数限制 */
  const MAX_BLOCKS_PER_REQUEST = 50
  /** 单个文本块最大字符数安全阈值(低于 API 硬限制 10000) */
  const MAX_CHARS_PER_BLOCK = 8000
  /** 批次间延迟,避免触发 QPS 限流 */
  const QPS_DELAY_MS = 400

  let allBlocks = blocks
  let conversionDiagnostics: any = null
  if (!allBlocks && content) {
    const conversion = markdownToBlocksWithDiagnostics(String(content))
    allBlocks = conversion.blocks
    conversionDiagnostics = conversion
    allBlocks = splitLongTextRuns(allBlocks, MAX_CHARS_PER_BLOCK)
  }

  if (!allBlocks || !Array.isArray(allBlocks) || allBlocks.length === 0) {
    let errorMsg = 'Markdown 转换结果为空，未生成任何可写入的 block'
    let suggestion = '请检查 content 内容是否为空或只包含不可见字符'
    if (conversionDiagnostics) {
      const d = conversionDiagnostics
      const parts: string[] = []
      if (d.warnings && d.warnings.length > 0) {
        parts.push(`转换警告(${d.warnings.length} 条): ${d.warnings.slice(0, 5).join('; ')}`)
      }
      if (d.stats) {
        parts.push(`输入长度 ${d.stats.inputLength} 字符，生成 ${d.stats.outputBlockCount} 个 block，过滤掉 ${d.stats.emptyBlockCount} 个空 block`)
      }
      if (d.unrecognizedFormats && d.unrecognizedFormats.length > 0) {
        const u = d.unrecognizedFormats[0]
        parts.push(`无法识别的格式: 第 ${u.lineNumber} 行 "${u.content}" — ${u.reason}`)
      }
      if (parts.length > 0) {
        errorMsg = parts.join(' | ')
        suggestion = '请检查 Markdown 语法：1) 段落顶格写，行首不要有空格；2) 列表用 "- " 开头；3) 标题用 "# " 后接空格；4) 避免使用 HTML 标签'
      }
    }
    return createErrorResult(errorMsg, '缺少可写入的内容', suggestion)
  }

  const totalBlocks = allBlocks.length
  const totalBatches = Math.ceil(totalBlocks / MAX_BLOCKS_PER_REQUEST)
  let appendedCount = 0

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * MAX_BLOCKS_PER_REQUEST
    const batch = allBlocks.slice(start, start + MAX_BLOCKS_PER_REQUEST)
    try {
      if (batchIndex > 0) await new Promise(r => setTimeout(r, QPS_DELAY_MS))
      const result = await larkApi('POST', '/doc/append', { document_id: docId, blocks: batch }, undefined, use_user_token)
      if (result.code !== 0) {
        const code = result.code
        let reason = result.msg || '未知错误'
        let suggestion = `错误码: ${code}`
        // 保留 result.msg（已包含后端翻译的精确字段信息），只覆盖 suggestion
        if (code === 1770033) { suggestion = '请缩短单段文本长度，或拆分内容到多个段落' }
        else if (code === 1770034) { suggestion = '请减少单次请求的 blocks 数量，feishuDocAppend 会自动分批' }
        else if (code === 99992402) { suggestion = '检查内容长度、块数和字段格式是否符合飞书 API 要求' }
        else if (code === 1770029) { suggestion = '使用支持的 block_type（2=text, 3-11=heading1-9, 12=bullet, 13=ordered, 14=code, 15=quote, 17=todo, 22=divider, 27=image, 31=table, 32=table_cell）' }
        return createErrorResult(reason, `追加内容失败：第 ${batchIndex + 1}/${totalBatches} 批写入出错(已写入 ${appendedCount}/${totalBlocks} 块)`, suggestion)
      }
      appendedCount += batch.length
    } catch (error: any) {
      return createErrorResult(error.message, `追加内容请求失败：第 ${batchIndex + 1}/${totalBatches} 批(已写入 ${appendedCount}/${totalBlocks} 块)`)
    }
  }

  return createSuccessResult({ appendedCount, totalBlocks, totalBatches }, `成功追加 ${appendedCount} 个内容块到文档 ${docId}${totalBatches > 1 ? `(分 ${totalBatches} 批写入)` : ''}`, 'feishuDocAppend')
}

/**
 * 更新飞书文档中的指定块
 *
 * @param args - 包含 document_id、block_id、block_type 及内容参数
 * @returns 更新结果
 */
export const feishuDocUpdateBlock = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, block_id, block_type, use_user_token, ...contentData } = args
  const docId = extractDocumentId(document_id)
  if (!docId || !block_id) return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 block_id')

  /** 支持文本更新的 block 字段列表 */
  const textBlockFields = ['text', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'heading7', 'heading8', 'heading9', 'bullet', 'ordered', 'code', 'quote']
  let payload: Record<string, any> = { document_id: docId, block_id }

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

/**
 * 删除飞书文档中的指定块
 *
 * @param args - 包含 document_id、block_id、use_user_token 参数
 * @returns 删除结果
 */
export const feishuDocDeleteBlock = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, block_id, use_user_token } = args
  const docId = extractDocumentId(document_id)
  if (!docId || !block_id) return createErrorResult('Missing parameters', '缺少参数', '需要 document_id 和 block_id')
  try {
    const result = await larkApi('DELETE', '/doc/block', { document_id: docId, block_id }, undefined, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '删除块失败', `错误码: ${result.code}`)
    return createSuccessResult(result.data, `块 ${block_id} 删除成功`, 'feishuDocDeleteBlock')
  } catch (error: any) {
    return createErrorResult(error.message, '删除块请求失败')
  }
}

/**
 * 清空飞书文档中的所有内容
 *
 * @param args - 包含 document_id、use_user_token 参数
 * @returns 清空结果
 */
export const feishuDocClear = async (args: Record<string, any>): Promise<ToolResult> => {
  const { document_id, use_user_token } = args
  const docId = extractDocumentId(document_id)
  if (!docId) return createErrorResult('Missing document_id', '缺少文档ID', '请传入飞书文档链接或直接传入 document_id')
  try {
    const result = await larkApi('POST', '/doc/clear', { document_id: docId }, undefined, use_user_token)
    if (result.code !== 0) return createErrorResult(result.msg, '清空文档失败', `错误码: ${result.code}`)
    const deleted = result.data?.deleted || 0
    return createSuccessResult(result.data, `文档已清空,共删除 ${deleted} 个内容块`, 'feishuDocClear')
  } catch (error: any) {
    return createErrorResult(error.message, '清空文档请求失败')
  }
}

// ============ 辅助函数 ============

/**
 * 从飞书 block 中提取纯文本内容
 *
 * 遍历 block 中所有可能的文本元素(text_run)和文档引用(mention_doc). 
 *
 * @param block - 飞书文档块对象
 * @returns 拼接后的纯文本字符串
 */
function extractTextFromBlock(block: any): string {
  const elements =
    block.text?.elements ||
    block.heading1?.elements || block.heading2?.elements || block.heading3?.elements ||
    block.heading4?.elements || block.heading5?.elements || block.heading6?.elements ||
    block.bullet?.elements || block.ordered?.elements || block.code?.elements ||
    block.quote?.elements || block.todo?.elements || []
  return elements.map((el: any) => el.text_run?.content || el.mention_doc?.url || '').join('')
}

/**
 * 将超过长度限制的文本块拆分为多个小碎片
 *
 * 飞书对单个 text_run 有字符数限制,提前拆分可避免 API 报错. 
 *
 * @param blocks - 飞书块数组
 * @param maxChars - 单个 text_run 的最大字符数
 * @returns 拆分后的块数组
 */
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

/**
 * 按指定长度拆分字符串,优先在换行处切断
 *
 * 优先在换行符处分割,保持文本可读性;如果没有换行符则在 maxLen 处硬切. 
 *
 * @param str - 要拆分的字符串
 * @param maxLen - 每段最大长度
 * @returns 拆分后的字符串数组
 */
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
