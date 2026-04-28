/**
 * =============================================================================
 * 语雀 (Yuque) 文档操作
 * =============================================================================
 *
 * 包含文档的列表、读取、创建、更新和删除。
 * =============================================================================
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { translateYuqueError, yuqueApi } from './repo'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 工具：列出知识库中的文档
 *
 * 【实现方式】
 * 语雀内部 Web API 没有直接的文档列表端点，
 * 本工具通过获取 TOC 并过滤出 DOC 类型条目来实现。
 *
 * 【与 yuqueTocGet 的区别】
 *   - yuqueTocGet：返回完整目录(含 TITLE 和 DOC)
 *   - yuqueDocList：只返回 DOC 类型的文档
 */
export const yuqueDocListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocList',
    description: `列出语雀知识库中的文档列表(只包含文档，不包含目录项)。

返回文档标题、slug、创建时间、更新时间等基本信息。

使用示例:
yuqueDocList(repo_id="68025057")

返回示例:
1. 文档标题1 (Slug: abc123)
2. 文档标题2 (Slug: def456)`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 工具：读取文档内容
 *
 * 返回文档的完整详情，包括标题、内容、格式等。
 *
 * 【重要】内容格式是 Lake HTML，不是纯 Markdown
 * Lake 是语雀自研的富文本格式，基于 HTML 但包含自定义标签。
 * 前端会直接展示原始 Lake HTML，Agent 可以阅读其中的文本内容。
 *
 * 【返回值中的关键字段】
 *   - title: 文档标题
 *   - content: 文档内容(Lake HTML 格式)
 *   - id: 文档数字 ID(更新/删除时需要)
 *   - slug: 文档 URL 标识
 *   - format: 格式(通常为 "lake")
 */
export const yuqueDocReadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocRead',
    description: `读取语雀文档的完整内容。

返回文档的标题、正文(Lake HTML 格式)、创建时间、更新时间等。

【重要】repo_id 和 doc_slug 可从 yuqueTocGet 或 yuqueDocList 结果中获取。

返回结果中包含 doc_id(数字 ID)，这是后续更新或删除文档的必需参数。

使用示例:
yuqueDocRead(repo_id="68025057", doc_slug="abc123")`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_slug: {
          type: 'string',
          description: '文档 Slug(从 TOC 结果中获取，字段名为 url)',
        },
      },
      required: ['repo_id', 'doc_slug'],
    },
  },
}

/**
 * 工具：创建文档
 *
 * 在指定知识库中创建新文档。
 *
 * 【内容格式】
 * content 参数支持 HTML 标签，系统会自动包装为 Lake 格式。
 * 例如传入 "<h1>标题</h1><p>正文</p>" 会被包装为：
 * "<!doctype lake><h1>标题</h1><p>正文</p>"
 *
 * 【注意】创建后文档不会自动出现在知识库目录中，
 * 如需加入目录请后续调用语雀网页版手动调整。
 *
 * 【返回值】
 *   包含新文档的 id 和 slug，建议记录下来供后续使用。
 */
export const yuqueDocCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocCreate',
    description: `在语雀知识库中创建新文档。

【内容格式选择】
- format="markdown" (推荐): 直接传标准 Markdown，语雀服务端自动渲染。支持 $公式$、$$公式块$$、表格、代码块、图片等。
- format="lake" (默认): 系统会自动将 content 转换为语雀 Lake HTML。

【图片插入】
1. 先调用 yuqueImageUpload(image_base64="...") 上传图片，获取返回的 url
2. 在 content 中用 Markdown 图片语法引用: ![描述](https://cdn.nlark.com/yuque/0/...)

【⚠️ 公式转义警告】
Python 字符串中 \f 会被当作 form feed 吃掉！LaTeX 公式中 \frac、\pm、\sqrt 等必须写成双反斜杠或使用原始字符串 r"..."
示例: content=r"$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$"

⚠️ 创建后文档不会自动出现在知识库目录中，如需加入目录请后续在语雀网页版手动调整。

示例:
# Markdown 格式(推荐，公式/表格/代码块/图片都能正确渲染)
yuqueDocCreate(repo_id="68025057", title="项目文档", content="# 标题\n\n正文", format="markdown")

# 带图片的文档
yuqueDocCreate(repo_id="68025057", title="带图片的文档", content="# 标题\n\n![图1](https://cdn.nlark.com/yuque/0/...)", format="markdown")

支持参数:
- public: 0=私密, 1=互联网公开, 2=空间成员公开`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        title: {
          type: 'string',
          description: '文档标题',
        },
        content: {
          type: 'string',
          description: '文档正文内容',
        },
        format: {
          type: 'string',
          enum: ['lake', 'markdown', 'html'],
          description: '内容格式: markdown=直接上传Markdown(推荐), lake=自动转Lake HTML(默认), html=直接上传HTML',
          default: 'lake',
        },
        slug: {
          type: 'string',
          description: '自定义文档 URL slug(可选)',
        },
        public: {
          type: 'number',
          enum: [0, 1, 2],
          description: '可见性: 0=私密, 1=互联网公开, 2=空间成员公开',
        },
      },
      required: ['repo_id', 'title'],
    },
  },
}

/**
 * 工具：更新文档
 *
 * 更新已有文档的标题或内容。
 *
 * 【重要】doc_id 是数字 ID，不是 slug！
 * 更新前必须先调用 yuqueDocRead 获取 doc_id。
 *
 * 【示例工作流】
 *   1. yuqueDocRead(repo_id="68025057", doc_slug="abc123")
 *      → 获取 doc_id(如 266422684)
 *   2. yuqueDocUpdate(repo_id="68025057", doc_id="266422684", title="新标题", content="<h1>新内容</h1>")
 */
export const yuqueDocUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocUpdate',
    description: `更新语雀文档的标题或内容。

【重要】doc_id 是数字 ID，不是 slug！
更新前必须先调用 yuqueDocRead 获取 doc_id。

【内容格式选择】
- format="markdown" (推荐): 直接传标准 Markdown，语雀服务端自动渲染。
- format="lake" (默认): 系统会自动将 content 转换为语雀 Lake HTML。

【⚠️ 更新行为说明】
- 语雀 update_doc 是【全量替换】，不是追加！
- 如果只传 title 不传 content：只改标题，保留原有内容 ✅
- 如果传了 content：整个文档内容会被替换为新的 content

【局部替换(推荐)】
使用 replace_text 参数实现"只改一句话"：
yuqueDocUpdate(
  repo_id="68025057",
  doc_id="266422684",
  replace_text={ "old": "原文本B", "new": "修改后的B'" }
)
后端会自动：读取当前内容 → 替换指定文本 → 提交更新。

示例:
# 只更新标题(保留内容)
yuqueDocUpdate(repo_id="68025057", doc_id="266422684", title="新标题")

# 全量替换内容
yuqueDocUpdate(repo_id="68025057", doc_id="266422684", title="新标题", content="# 新标题\n\n新内容", format="markdown")

# 局部替换一句话
yuqueDocUpdate(repo_id="68025057", doc_id="266422684", replace_text={"old": "错误句子", "new": "正确句子"})`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_id: {
          type: 'string',
          description: '文档数字 ID(从 yuqueDocRead 结果中获取，不是 slug！)',
        },
        title: {
          type: 'string',
          description: '新标题(可选，只传 title 时不影响内容)',
        },
        content: {
          type: 'string',
          description: '新正文(可选，如果传入会全量替换原有内容)',
        },
        format: {
          type: 'string',
          enum: ['lake', 'markdown', 'html'],
          description: '内容格式: markdown=直接上传Markdown(推荐), lake=自动转Lake HTML(默认), html=直接上传HTML',
          default: 'lake',
        },
        replace_text: {
          type: 'object',
          description: '局部替换(可选)。传入 { old: "原文本", new: "新文本" } 实现只改一句话，不需要自己读取拼接',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

/**
 * 工具：删除文档
 *
 * 删除知识库中的指定文档。
 *
 * 【重要】doc_id 是数字 ID，不是 slug！
 * 删除前必须先调用 yuqueDocRead 获取 doc_id。
 *
 * 【⚠️ 警告】删除操作不可逆，请确认后再执行！
 */
export const yuqueDocDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocDelete',
    description: `删除语雀知识库中的指定文档。

【重要】doc_id 是数字 ID，不是 slug！
删除前必须先调用 yuqueDocRead 获取 doc_id。

【⚠️ 警告】删除操作不可逆，请确认后再执行！

示例:
yuqueDocRead(repo_id="68025057", doc_slug="abc123")  → 获取 doc_id
yuqueDocDelete(repo_id="68025057", doc_id="266422684")`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_id: {
          type: 'string',
          description: '文档数字 ID(从 yuqueDocRead 结果中获取，不是 slug！)',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

export const yuqueDocList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    // 通过 TOC 获取文档列表
    const result = await yuqueApi('GET', '/toc', undefined, { repo_id })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取文档列表失败', undefined, result.status || result.code)
    }

    const toc = result.data?.toc || result.data || []
    const docs = toc.filter((item: any) => item.type === 'DOC')

    const formatted = docs.map((d: any, i: number) =>
      `${i + 1}. ${d.title} (Slug: ${d.url})`
    ).join('\n\n')

    return createSuccessResult(
      docs,
      docs.length > 0 ? formatted : '知识库中暂无文档',
      'yuqueDocList'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueDocRead = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_slug } = args

  if (!repo_id || !doc_slug) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_slug')
  }

  try {
    const result = await yuqueApi('GET', '/doc/read', undefined, { repo_id, doc_slug })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '读取文档失败', undefined, result.status || result.code)
    }

    const doc = result.data
    // 内部 Web API: content 是 Lake HTML，Open API v2: body 是 Markdown
    // 按优先级读取，确保能拿到内容
    const content = doc.content || doc.body || doc.body_asl || ''

    return createSuccessResult(
      result.data,
      `标题: ${doc.title}\n格式: ${doc.format || 'lake'}\n更新: ${doc.updated_at || 'N/A'}\n\n---\n\n${content}`,
      'yuqueDocRead'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueDocCreate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, title, content, format, public: isPublic } = args

  if (!repo_id || !title) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 title')
  }

  try {
    const payload: any = {
      repo_id: String(repo_id),
      title: String(title),
      format: format || 'lake',
    }
    // 直接传递 content，由后端根据 format 决定如何处理
    if (content !== undefined) payload.content = String(content)
    if (isPublic !== undefined) payload.public = Number(isPublic)

    const result = await yuqueApi('POST', '/doc/create', payload)

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '创建文档失败', undefined, result.status || result.code)
    }

    const doc = result.data
    return createSuccessResult(
      result.data,
      `文档创建成功！\n标题: ${doc.title}\nID: ${doc.id}\nSlug: ${doc.slug}\nURL: https://www.yuque.com/${repo_id}/${doc.slug}`,
      'yuqueDocCreate'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueDocUpdate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_id, title, content, format, replace_text } = args

  if (!repo_id || !doc_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_id')
  }

  try {
    const payload: any = { repo_id: String(repo_id), doc_id: String(doc_id), format: format || 'lake' }
    if (title !== undefined) payload.title = String(title)
    // 直接传递 content，由后端根据 format 决定如何处理
    if (content !== undefined) payload.content = String(content)
    // 局部替换参数
    if (replace_text !== undefined) payload.replace_text = replace_text

    const result = await yuqueApi('PUT', '/doc/update', payload)

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '更新文档失败', undefined, result.status || result.code)
    }

    const doc = result.data
    return createSuccessResult(
      result.data,
      `文档更新成功！\n标题: ${doc.title}\nID: ${doc.id}\n更新于: ${doc.updated_at || 'N/A'}`,
      'yuqueDocUpdate'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

export const yuqueDocDelete = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_id } = args

  if (!repo_id || !doc_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_id')
  }

  try {
    const result = await yuqueApi('DELETE', '/doc/delete', { repo_id, doc_id })

    if (result.data === undefined && (result.msg || result.message)) {
      return createErrorResult(result.msg || result.message, '删除文档失败', undefined, result.status || result.code)
    }

    return createSuccessResult(
      result.data,
      `文档 ${doc_id} 删除成功`,
      'yuqueDocDelete'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
