/**
 * =============================================================================
 * 语雀 (Yuque) Open API 工具定义
 * =============================================================================
 *
 * 【什么是工具定义？】
 * 工具定义是 JSON Schema 格式的描述，告诉 AI Agent：
 *   - 这个工具叫什么名字
 *   - 它能做什么
 *   - 需要什么参数
 *   - 参数的类型和约束
 *
 * AI 根据这些定义来决定什么时候调用哪个工具，以及传什么参数。
 *
 * 【语雀工具的特殊之处】
 * 语雀使用「内部 Web API」，不是官方的 Open API v2。
 * 这意味着：
 *   ✅ 完全免费，不需要超级会员
 *   ❌ 搜索功能不可用（内部 API 没有搜索端点）
 *   ❌ 内容格式是 Lake HTML，不是纯 Markdown
 *
 * 【概念对照表】
 *   repo_id   → 知识库的数字 ID（如 68025057）
 *   doc_slug  → 文档的 URL 标识（如 "buslgogeucwcim33"）
 *   doc_id    → 文档的数字 ID（如 266422684），更新/删除必需
 *
 * 【典型工作流】
 *   1. yuque_repo_list() → 获取 repo_id
 *   2. yuque_toc_get(repo_id) → 获取 doc_slug
 *   3. yuque_doc_read(repo_id, doc_slug) → 读取内容（同时获取 doc_id）
 *   4. yuque_doc_update(repo_id, doc_id, ...) → 更新
 *   5. yuque_doc_delete(repo_id, doc_id) → 删除
 * =============================================================================
 */

import type { ToolDefinition } from '@/theme/tools/types'

// =============================================================================
// 知识库操作
// =============================================================================

/**
 * 工具：列出语雀知识库
 *
 * 返回当前登录用户拥有的所有知识库（Book/Repo）列表。
 * 每个知识库包含 id、name、slug、description 等信息。
 *
 * 【使用示例】
 *   yuque_repo_list()
 *
 * 【返回值】
 *   1. LLM知识库 (ID: 68025057, Slug: qah8x7)
 *      无描述
 *   2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
 *      课程笔记
 */
export const yuqueRepoListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_repo_list',
    description: `列出语雀用户或团队的知识库（Repo/Book）列表。

返回知识库名称、ID、Slug、描述等信息。

使用示例：
- 列出个人知识库: yuque_repo_list()

返回示例：
1. LLM知识库 (ID: 68025057, Slug: qah8x7)
   无描述
2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
   课程笔记`,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
}

/**
 * 工具：获取知识库目录结构
 *
 * 返回知识库的 TOC（Table of Contents），包含两类条目：
 *   - TITLE：目录项（文件夹）
 *   - DOC：文档项（实际文档）
 *
 * 目录是层级结构，通过 depth 字段表示层级深度。
 *
 * 【使用示例】
 *   yuque_toc_get(repo_id="68025057")
 */
export const yuqueTocGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_toc_get',
    description: `获取语雀知识库的目录结构（TOC）。

返回知识库中所有文档的层级关系，包括：
- TITLE: 目录/分组项
- DOC: 实际文档项

每个条目包含 title、slug（字段名为 url）、depth 层级等。

使用示例:
yuque_toc_get(repo_id="68025057")

返回示例:
📁 第一章 (slug: xxx)
  📄 1.1 概述 (slug: abc123)
  📄 1.2 详细说明 (slug: def456)
📁 第二章
  📄 2.1 总结 (slug: ghi789)`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID（从 yuque_repo_list 结果中获取）',
        },
      },
      required: ['repo_id'],
    },
  },
}

// =============================================================================
// 图片操作
// =============================================================================

/**
 * 工具：上传图片到语雀 CDN
 *
 * 将图片上传到语雀的图床（cdn.nlark.com），返回可直接在文档中引用的 URL。
 * 上传后可在 yuque_doc_create / yuque_doc_update 的 content 中用 Markdown 图片语法引用：
 *   ![描述](https://cdn.nlark.com/...)
 *
 * 【使用示例】
 *   yuque_image_upload(image_base64="data:image/png;base64,iVBORw0KGgo...", file_name="chart.png")
 *   → 返回 { url: "https://cdn.nlark.com/yuque/0/...", filekey: "..." }
 */
export const yuqueImageUploadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_image_upload',
    description: `上传图片到语雀 CDN，获取可在文档中直接使用的图片 URL。

使用流程:
1. 调用 yuque_image_upload(image_base64="...", file_name="demo.png")
2. 获取返回的 url（如 https://cdn.nlark.com/yuque/0/...）
3. 在 yuque_doc_create / yuque_doc_update 的 content 中用 Markdown 引用:
   ![图片描述](https://cdn.nlark.com/...)

注意事项:
- image_base64 必须是完整的 base64 字符串，可带 data:image/...;base64, 前缀
- 支持格式: png, jpg, jpeg, gif, webp, svg
- 图片会自动上传到语雀 CDN（cdn.nlark.com），公网可访问`,
    parameters: {
      type: 'object',
      properties: {
        image_base64: {
          type: 'string',
          description: '图片的 base64 编码字符串，可包含 data:image/png;base64, 前缀',
        },
        file_name: {
          type: 'string',
          description: '图片文件名（含扩展名），如 demo.png',
        },
      },
      required: ['image_base64'],
    },
  },
}

// =============================================================================
// 文档操作
// =============================================================================

/**
 * 工具：列出知识库中的文档
 *
 * 【实现方式】
 * 语雀内部 Web API 没有直接的文档列表端点，
 * 本工具通过获取 TOC 并过滤出 DOC 类型条目来实现。
 *
 * 【与 yuque_toc_get 的区别】
 *   - yuque_toc_get：返回完整目录（含 TITLE 和 DOC）
 *   - yuque_doc_list：只返回 DOC 类型的文档
 */
export const yuqueDocListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_list',
    description: `列出语雀知识库中的文档列表（只包含文档，不包含目录项）。

返回文档标题、slug、创建时间、更新时间等基本信息。

使用示例:
yuque_doc_list(repo_id="68025057")

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
 *   - content: 文档内容（Lake HTML 格式）
 *   - id: 文档数字 ID（更新/删除时需要）
 *   - slug: 文档 URL 标识
 *   - format: 格式（通常为 "lake"）
 */
export const yuqueDocReadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_read',
    description: `读取语雀文档的完整内容。

返回文档的标题、正文（Lake HTML 格式）、创建时间、更新时间等。

【重要】repo_id 和 doc_slug 可从 yuque_toc_get 或 yuque_doc_list 结果中获取。

返回结果中包含 doc_id（数字 ID），这是后续更新或删除文档的必需参数。

使用示例:
yuque_doc_read(repo_id="68025057", doc_slug="abc123")`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_slug: {
          type: 'string',
          description: '文档 Slug（从 TOC 结果中获取，字段名为 url）',
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
    name: 'yuque_doc_create',
    description: `在语雀知识库中创建新文档。

【内容格式选择】
- format="markdown" (推荐): 直接传标准 Markdown，语雀服务端自动渲染。支持 $公式$、$$公式块$$、表格、代码块、图片等。
- format="lake" (默认): 系统会自动将 content 转换为语雀 Lake HTML。

【图片插入】
1. 先调用 yuque_image_upload(image_base64="...") 上传图片，获取返回的 url
2. 在 content 中用 Markdown 图片语法引用: ![描述](https://cdn.nlark.com/yuque/0/...)

【⚠️ 公式转义警告】
Python 字符串中 \f 会被当作 form feed 吃掉！LaTeX 公式中 \frac、\pm、\sqrt 等必须写成双反斜杠或使用原始字符串 r"..."
示例: content=r"$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$"

⚠️ 创建后文档不会自动出现在知识库目录中，如需加入目录请后续在语雀网页版手动调整。

示例:
# Markdown 格式（推荐，公式/表格/代码块/图片都能正确渲染）
yuque_doc_create(repo_id="68025057", title="项目文档", content="# 标题\n\n正文", format="markdown")

# 带图片的文档
yuque_doc_create(repo_id="68025057", title="带图片的文档", content="# 标题\n\n![图1](https://cdn.nlark.com/yuque/0/...)", format="markdown")

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
          description: '自定义文档 URL slug（可选）',
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
 * 更新前必须先调用 yuque_doc_read 获取 doc_id。
 *
 * 【示例工作流】
 *   1. yuque_doc_read(repo_id="68025057", doc_slug="abc123")
 *      → 获取 doc_id（如 266422684）
 *   2. yuque_doc_update(repo_id="68025057", doc_id="266422684", title="新标题", content="<h1>新内容</h1>")
 */
export const yuqueDocUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_update',
    description: `更新语雀文档的标题或内容。

【重要】doc_id 是数字 ID，不是 slug！
更新前必须先调用 yuque_doc_read 获取 doc_id。

【内容格式选择】
- format="markdown" (推荐): 直接传标准 Markdown，语雀服务端自动渲染。
- format="lake" (默认): 系统会自动将 content 转换为语雀 Lake HTML。

【⚠️ 更新行为说明】
- 语雀 update_doc 是【全量替换】，不是追加！
- 如果只传 title 不传 content：只改标题，保留原有内容 ✅
- 如果传了 content：整个文档内容会被替换为新的 content

【局部替换（推荐）】
使用 replace_text 参数实现"只改一句话"：
yuque_doc_update(
  repo_id="68025057",
  doc_id="266422684",
  replace_text={ "old": "原文本B", "new": "修改后的B'" }
)
后端会自动：读取当前内容 → 替换指定文本 → 提交更新。

示例:
# 只更新标题（保留内容）
yuque_doc_update(repo_id="68025057", doc_id="266422684", title="新标题")

# 全量替换内容
yuque_doc_update(repo_id="68025057", doc_id="266422684", title="新标题", content="# 新标题\n\n新内容", format="markdown")

# 局部替换一句话
yuque_doc_update(repo_id="68025057", doc_id="266422684", replace_text={"old": "错误句子", "new": "正确句子"})`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_id: {
          type: 'string',
          description: '文档数字 ID（从 yuque_doc_read 结果中获取，不是 slug！）',
        },
        title: {
          type: 'string',
          description: '新标题（可选，只传 title 时不影响内容）',
        },
        content: {
          type: 'string',
          description: '新正文（可选，如果传入会全量替换原有内容）',
        },
        format: {
          type: 'string',
          enum: ['lake', 'markdown', 'html'],
          description: '内容格式: markdown=直接上传Markdown(推荐), lake=自动转Lake HTML(默认), html=直接上传HTML',
          default: 'lake',
        },
        replace_text: {
          type: 'object',
          description: '局部替换（可选）。传入 { old: "原文本", new: "新文本" } 实现只改一句话，不需要自己读取拼接',
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
 * 删除前必须先调用 yuque_doc_read 获取 doc_id。
 *
 * 【⚠️ 警告】删除操作不可逆，请确认后再执行！
 */
export const yuqueDocDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_delete',
    description: `删除语雀知识库中的指定文档。

【重要】doc_id 是数字 ID，不是 slug！
删除前必须先调用 yuque_doc_read 获取 doc_id。

【⚠️ 警告】删除操作不可逆，请确认后再执行！

示例:
yuque_doc_read(repo_id="68025057", doc_slug="abc123")  → 获取 doc_id
yuque_doc_delete(repo_id="68025057", doc_id="266422684")`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_id: {
          type: 'string',
          description: '文档数字 ID（从 yuque_doc_read 结果中获取，不是 slug！）',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

// =============================================================================
// 搜索操作
// =============================================================================

/**
 * 工具：搜索语雀
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有提供搜索端点。
 * 如需查找文档，请使用 yuque_repo_list + yuque_toc_get 浏览目录。
 */
export const yuqueSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_search',
    description: `【⚠️ 当前不可用】在语雀中搜索文档或知识库。

语雀内部 Web API 不支持搜索功能。
如需查找文档，请使用 yuque_repo_list 获取知识库列表，
然后用 yuque_toc_get 浏览目录。`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
        type: {
          type: 'string',
          enum: ['doc', 'repo'],
          description: '搜索类型: doc=文档, repo=知识库',
          default: 'doc',
        },
      },
      required: ['query'],
    },
  },
}
