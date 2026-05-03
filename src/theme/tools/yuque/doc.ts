/**
 * ============================================================================
 * 语雀(Yuque)文档操作工具集
 * ============================================================================
 *
 * 提供语雀知识库中文档的列表、读取、创建、更新和删除操作. 
 * 所有操作通过后端 /api/yuque 代理调用语雀内部 Web API. 
 *
 * 关键概念：
 * - repo_id: 知识库数字 ID(如 "68025057")
 * - doc_slug: 文档 URL 路径名(如 "abc123")
 * - doc_id: 文档数字 ID(如 "266422684"),更新/删除时必须使用
 *
 * @module src/theme/tools/yuque/doc
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { translateYuqueError, yuqueApi } from './repo'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 列出语雀知识库中文档的工具定义
 *
 * 语雀内部 Web API 没有直接的文档列表端点,
 * 本工具通过获取 TOC 并过滤出 DOC 类型条目来实现. 
 *
 * 与 yuqueTocGet 的区别：
 * - yuqueTocGet：返回完整目录(含 TITLE 和 DOC)
 * - yuqueDocList：只返回 DOC 类型的文档
 */
export const yuqueDocListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocList',
    description: `【功能】列出语雀知识库中的所有文档(仅包含 DOC 类型,不包含目录分组项). 

【使用场景】
- 用户想查看某个知识库下有哪些文档时调用
- 在读取/更新/删除文档前,先获取文档列表以确认目标文档的 slug
- 与 yuqueTocGet 的区别：本工具只返回文档列表,不返回目录层级结构

【示例用法】
yuqueDocList(repo_id="68025057")
→ 返回:
1. 文档标题1 (Slug: abc123)
2. 文档标题2 (Slug: def456)

【注意事项】
- 如需查看完整目录结构(含文件夹层级),请使用 yuqueTocGet
- 返回的 slug(字段名为 url)用于后续 yuqueDocRead 调用`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057". 可从 yuqueRepoList 返回值中获取',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 读取语雀文档的工具定义
 *
 * 返回文档的完整详情,包括标题、内容、格式等. 
 *
 * 【重要】内容格式是 Lake HTML,不是纯 Markdown
 * Lake 是语雀自研的富文本格式,基于 HTML 但包含自定义标签. 
 * 前端会直接展示原始 Lake HTML,Agent 可以阅读其中的文本内容. 
 *
 * 返回值中的关键字段：
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
    description: `【功能】读取语雀文档的完整内容,包括标题、正文、格式、创建/更新时间等. 

【使用场景】
- 用户想查看某篇文档的具体内容时调用
- 在更新或删除文档前,必须先调用本工具获取 doc_id(数字 ID)
- 通过 yuqueDocList 或 yuqueTocGet 获取 doc_slug 后再调用本工具

【示例用法】
yuqueDocRead(repo_id="68025057", doc_slug="abc123")

【注意事项】
- 返回的 content 是 Lake HTML 格式(语雀自研富文本格式),不是纯 Markdown
- 返回结果中的 id 字段是文档数字 ID(如 266422684),后续 yuqueDocUpdate / yuqueDocDelete 必须使用此 ID,不能用 slug
- doc_slug 是文档 URL 路径名,可从 yuqueTocGet 或 yuqueDocList 的返回值中获取(字段名为 url)`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
        doc_slug: {
          type: 'string',
          description: '文档 slug(URL 路径名),如 "abc123". 从 yuqueTocGet 或 yuqueDocList 返回值中获取,对应字段名为 url',
        },
      },
      required: ['repo_id', 'doc_slug'],
    },
  },
}

/**
 * 创建语雀文档的工具定义
 *
 * 在指定知识库中创建新文档. 
 *
 * 内容格式：
 * content 参数支持 HTML 标签,系统会自动包装为 Lake 格式. 
 * 例如传入 "<h1>标题</h1><p>正文</p>" 会被包装为：
 * "<!doctype lake><h1>标题</h1><p>正文</p>"
 *
 * 注意：创建后文档不会自动出现在知识库目录中,
 * 如需加入目录请后续调用语雀网页版手动调整. 
 *
 * 返回值包含新文档的 id 和 slug,建议记录下来供后续使用. 
 */
export const yuqueDocCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocCreate',
    description: `【功能】在语雀知识库中创建新文档. 

【使用场景】
- 用户要求新建一篇语雀文档时调用
- 需要将内容写入语雀知识库时调用

【内容格式选择】
- format="markdown" (推荐): 直接传标准 Markdown,语雀服务端自动渲染. 支持 $公式$、$$公式块$$、表格、代码块、图片等. 
- format="lake" (默认): 系统会自动将 content 转换为语雀 Lake HTML. 
- format="html": 直接上传 HTML,不做转换. 

【图片插入流程】
1. 先调用 yuqueImageUpload(image_base64="...") 上传图片,获取返回的 url
2. 在 content 中用 Markdown 图片语法引用: ![描述](https://cdn.nlark.com/yuque/0/...)

【⚠️ 公式转义警告】
Python 字符串中 \\f 会被当作 form feed 吃掉！LaTeX 公式中 \\frac、\\pm、\\sqrt 等必须写成双反斜杠或使用原始字符串 r"..."
示例: content=r"$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$"

【⚠️ 重要】创建后文档不会自动出现在知识库目录 TOC 中,如需加入目录请后续在语雀网页版手动调整. 

【示例用法】
# Markdown 格式(推荐,公式/表格/代码块/图片都能正确渲染)
yuqueDocCreate(repo_id="68025057", title="项目文档", content="# 标题\\n\\n正文", format="markdown")

# 带图片的文档
yuqueDocCreate(repo_id="68025057", title="带图片的文档", content="# 标题\\n\\n![图1](https://cdn.nlark.com/yuque/0/...)", format="markdown")

# 私密文档
yuqueDocCreate(repo_id="68025057", title="内部笔记", content="...", public=0)`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
        title: {
          type: 'string',
          description: '文档标题,如 "项目文档"',
        },
        content: {
          type: 'string',
          description: '文档正文内容. format="markdown" 时传标准 Markdown 语法;format="lake" 时传普通文本或 HTML',
        },
        format: {
          type: 'string',
          enum: ['lake', 'markdown', 'html'],
          description: '内容格式: markdown=直接上传Markdown(推荐), lake=自动转Lake HTML(默认), html=直接上传HTML',
          default: 'lake',
        },
        slug: {
          type: 'string',
          description: '自定义文档 URL slug(可选),如 "project-doc". 不指定则语雀自动生成',
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
 * 更新语雀文档的工具定义
 *
 * 更新已有文档的标题或内容. 
 *
 * 重要：doc_id 是数字 ID,不是 slug！
 * 更新前必须先调用 yuqueDocRead 获取 doc_id. 
 *
 * 示例工作流：
 *   1. yuqueDocRead(repo_id="68025057", doc_slug="abc123")
 *      → 获取 doc_id(如 266422684)
 *   2. yuqueDocUpdate(repo_id="68025057", doc_id="266422684", title="新标题", content="<h1>新内容</h1>")
 */
export const yuqueDocUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocUpdate',
    description: `【功能】更新语雀已有文档的标题或内容. 

【使用场景】
- 用户要求修改某篇语雀文档时调用
- 需要修正文档中的错误内容时调用

【重要】doc_id 是数字 ID,不是 slug！
更新前必须先调用 yuqueDocRead(repo_id, doc_slug) 获取 doc_id. 

【⚠️ 更新行为说明】
- 语雀 update_doc 是【全量替换】,不是追加！
- 如果只传 title 不传 content：只改标题,保留原有内容 ✅
- 如果传了 content：整个文档内容会被替换为新的 content

【局部替换(推荐)】
使用 replace_text 参数实现"只改一句话",后端会自动读取当前内容 → 替换指定文本 → 提交更新：
yuqueDocUpdate(
  repo_id="68025057",
  doc_id="266422684",
  replace_text={ "old": "原文本B", "new": "修改后的B'" }
)

【示例用法】
# 只更新标题(保留内容)
yuqueDocUpdate(repo_id="68025057", doc_id="266422684", title="新标题")

# 全量替换内容(Markdown 格式)
yuqueDocUpdate(repo_id="68025057", doc_id="266422684", title="新标题", content="# 新标题\\n\\n新内容", format="markdown")

# 局部替换一句话
yuqueDocUpdate(repo_id="68025057", doc_id="266422684", replace_text={"old": "错误句子", "new": "正确句子"})`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
        doc_id: {
          type: 'string',
          description: '文档数字 ID,如 "266422684". 必须从 yuqueDocRead 返回值中获取,注意不是 slug！',
        },
        title: {
          type: 'string',
          description: '新标题(可选). 只传 title 不传 content 时,仅修改标题,原有内容保留',
        },
        content: {
          type: 'string',
          description: '新正文内容(可选). 如果传入会【全量替换】原有内容,不是追加. 建议配合 format="markdown" 使用',
        },
        format: {
          type: 'string',
          enum: ['lake', 'markdown', 'html'],
          description: '内容格式: markdown=直接上传Markdown(推荐), lake=自动转Lake HTML(默认), html=直接上传HTML',
          default: 'lake',
        },
        replace_text: {
          type: 'object',
          description: '局部替换配置(可选). 传入对象 { old: "原文本", new: "新文本" } 实现精准替换,无需手动读取整篇文档再拼接. 与 content 参数互斥,不要同时传入',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

/**
 * 删除语雀文档的工具定义
 *
 * 删除知识库中的指定文档. 
 *
 * 重要：doc_id 是数字 ID,不是 slug！
 * 删除前必须先调用 yuqueDocRead 获取 doc_id. 
 *
 * 警告：删除操作不可逆,请确认后再执行！
 */
export const yuqueDocDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueDocDelete',
    description: `【功能】删除语雀知识库中的指定文档. 

【使用场景】
- 用户明确要求删除某篇语雀文档时调用
- 清理过期或重复文档时调用

【重要】doc_id 是数字 ID,不是 slug！
删除前必须先调用 yuqueDocRead(repo_id, doc_slug) 获取 doc_id. 

【⚠️ 警告】删除操作不可逆,删除后文档无法恢复,请确认后再执行！

【示例用法】
# 第一步：获取 doc_id
yuqueDocRead(repo_id="68025057", doc_slug="abc123")
# 第二步：执行删除
yuqueDocDelete(repo_id="68025057", doc_id="266422684")`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057"',
        },
        doc_id: {
          type: 'string',
          description: '文档数字 ID,如 "266422684". 必须从 yuqueDocRead 返回值中获取,注意不是 slug！',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

/**
 * 列出语雀知识库中的文档
 *
 * 通过 TOC 接口获取并过滤出 DOC 类型条目. 
 *
 * @param args - 包含 repo_id 参数
 * @returns 文档列表,每项包含标题和 slug
 */
export const yuqueDocList = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
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

/**
 * 读取语雀文档内容
 *
 * 内部 Web API 返回 content(Lake HTML),Open API v2 返回 body(Markdown). 
 * 按优先级读取,确保能拿到内容. 
 *
 * @param args - 包含 repo_id、doc_slug 参数
 * @returns 文档详情,包含标题、内容、格式等
 */
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
    // 内部 Web API: content 是 Lake HTML,Open API v2: body 是 Markdown
    // 按优先级读取,确保能拿到内容
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

/**
 * 在语雀知识库中创建新文档
 *
 * @param args - 包含 repo_id、title、content、format、public 参数
 * @returns 创建结果,包含新文档的 id 和 slug
 */
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
    // 直接传递 content,由后端根据 format 决定如何处理
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

/**
 * 更新语雀已有文档
 *
 * 语雀 update_doc 是全量替换,不是追加. 
 * 支持通过 replace_text 实现局部替换,无需手动读取整篇文档. 
 *
 * @param args - 包含 repo_id、doc_id、title、content、format、replace_text 参数
 * @returns 更新结果
 */
export const yuqueDocUpdate = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id, doc_id, title, content, format, replace_text } = args

  if (!repo_id || !doc_id) {
    return createErrorResult('Missing parameters', '缺少参数', '需要 repo_id 和 doc_id')
  }

  try {
    const payload: any = { repo_id: String(repo_id), doc_id: String(doc_id), format: format || 'lake' }
    if (title !== undefined) payload.title = String(title)
    // 直接传递 content,由后端根据 format 决定如何处理
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

/**
 * 删除语雀知识库中的指定文档
 *
 * @param args - 包含 repo_id、doc_id 参数
 * @returns 删除结果
 * @remarks 删除操作不可逆
 */
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
