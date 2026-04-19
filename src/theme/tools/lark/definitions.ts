/**
 * 飞书 Open API 工具定义
 * Agent 可通过这些工具操作飞书文档、消息、用户
 */

import type { ToolDefinition } from '@/theme/tools/types'

// ============================================
// 文档操作
// ============================================

export const feishuDocCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_create',
    description: `创建一个新的飞书文档（docx 格式），返回文档 ID 和链接。

使用示例：
- 创建空文档: feishu_doc_create(title="项目计划")
- 在指定文件夹创建: feishu_doc_create(title="周报", folder_token="Flxxx")

文档创建后，建议立即用 feishu_doc_append 写入内容。`,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '文档标题',
        },
        folder_token: {
          type: 'string',
          description: '父文件夹 token（可选），不填则创建在应用云空间根目录',
        },
      },
      required: ['title'],
    },
  },
}

export const feishuDocReadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_read',
    description: `读取飞书文档的纯文本内容。

document_id 从飞书文档 URL 中获取：
- 链接形如 https://xxx.feishu.cn/docx/AbCdEfGh → document_id = AbCdEfGh

返回文档的全部纯文本，适合让 AI 分析、总结或提取信息。`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '文档 ID，从飞书 URL 的 docx/ 后面获取',
        },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_search',
    description: '在飞书云空间中搜索文档，返回文档名称、链接、类型等信息。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
        count: {
          type: 'number',
          description: '返回结果数量，默认 20，最大 50',
          default: 20,
        },
      },
      required: ['query'],
    },
  },
}

export const feishuDocBlocksDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_blocks',
    description: `获取飞书文档的块（block）结构列表。每个文档由多个块组成，块是文档的最小编辑单元。

返回每个块的 block_id、block_type 和文本内容。Agent 可以用此信息：
1. 了解文档结构（标题、段落、列表等）
2. 获取特定块的 block_id，用于后续更新或删除

常见 block_type：
- 2: text（普通文本）
- 3-11: heading1-heading9（标题）
- 12: bullet（无序列表）
- 13: ordered（有序列表）
- 14: code（代码块）
- 15: quote（引用）
- 17: todo（待办）
- 22: divider（分割线）`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '文档 ID',
        },
        page_size: {
          type: 'number',
          description: '每页块数量，默认 500，最大 500',
          default: 500,
        },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocAppendDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_append',
    description: `在飞书文档末尾追加内容。content 参数支持 Markdown 语法，系统会自动将其解析为飞书文档的 block 格式（标题、列表、代码块、粗体、引用等）。

⚠️ 飞书 API 限制：
- 单个请求最多追加 50 个块
- 单个文本块内容最多 10000 字符
- 调用频率限制 3 QPS

> 系统会自动分批处理：超过 50 个块自动分多批写入，不会丢内容。

**content 参数 Markdown 格式规范（必须严格遵守）：**

1. 标题：用 ## 二级标题 或 ### 三级标题，# 后必须有空格。不要用一级标题。
2. 无序列表：统一用 - 内容（减号+空格），不要用 * 或 +
3. 有序列表：用 1. 内容（数字+点+空格）
4. 粗体：**文本**，** 必须紧密包裹文本，内侧严禁空格/标点。正确：**重点**；错误：** 重点 ** / **（重点）** / **"重点"**
5. 斜体：*文本*
6. 行内代码：\`代码\`
7. 代码块：用 \`\`\` 包裹，首行标注语言如 \`\`\`python
8. 引用：> 引用内容
9. 分割线：---（前后必须有空行）
10. 公式：行内 $E=mc^2$，块级 $$ 单独成块且顶格（前方无空格）
11. 图片：![描述](URL)，图注用 > 图1: 描述
12. 段落行首严禁前导空格（会被识别为代码块）
13. 标点必须用英文半角 . , ( ) : ; " '，不要用中文全角
14. 不同内容块之间用一个空行分隔
15. ⚠️ Markdown 表格不被支持。如需表格，请使用 blocks 参数传入

示例: feishu_doc_append(document_id="xxx", content="## 标题\\n\\n- 列表项1\\n- 列表项2\\n\\n正文段落。")

**方式二：传 blocks 数组（高级）**
直接传入飞书块格式，可创建标题、列表、代码块等。需注意块数量不超过 50。
示例:
feishu_doc_append(document_id="xxx", blocks=[
  { "block_type": 3, "heading1": { "elements": [{ "text_run": { "content": "章节标题" } }] } },
  { "block_type": 2, "text": { "elements": [{ "text_run": { "content": "正文内容" } }] } },
  { "block_type": 14, "code": { "elements": [{ "text_run": { "content": "console.log('hello')" } }] } }
])`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '文档 ID',
        },
        content: {
          type: 'string',
          description: '纯文本内容，按换行自动分段（与 blocks 二选一）',
        },
        blocks: {
          type: 'array',
          description: '飞书块格式数组（与 content 二选一）。每个块需包含 block_type 和对应类型的内容',
          items: { type: 'object' },
        },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocUpdateBlockDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_update_block',
    description: `更新飞书文档中的指定块内容。

需要先调用 feishu_doc_blocks 获取 block_id，然后修改。

示例：将某段文本改为新内容
feishu_doc_update_block(
  document_id="xxx",
  block_id="block_xxx",
  block_type=2,
  text={ "elements": [{ "text_run": { "content": "新文本内容" } }] }
)

更新标题:
feishu_doc_update_block(
  document_id="xxx",
  block_id="block_xxx",
  block_type=3,
  heading1={ "elements": [{ "text_run": { "content": "新标题" } }] }
)`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '文档 ID',
        },
        block_id: {
          type: 'string',
          description: '块 ID，从 feishu_doc_blocks 结果中获取',
        },
        block_type: {
          type: 'number',
          description: '块类型（2=text, 3=heading1, 4=heading2, ... 14=code 等）',
        },
      },
      required: ['document_id', 'block_id', 'block_type'],
      // 额外属性允许传入 text/heading1/code 等内容
    },
  },
}

export const feishuDocDeleteBlockDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_delete_block',
    description: `删除飞书文档中的指定块。

需要先调用 feishu_doc_blocks 获取 block_id。

示例: feishu_doc_delete_block(document_id="xxx", block_id="block_xxx")`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '文档 ID',
        },
        block_id: {
          type: 'string',
          description: '块 ID',
        },
      },
      required: ['document_id', 'block_id'],
    },
  },
}

// ============================================
// 消息操作
// ============================================

export const feishuImSendDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_im_send',
    description: '发送飞书即时消息。支持单聊和群聊。',
    parameters: {
      type: 'object',
      properties: {
        receive_id: {
          type: 'string',
          description: '接收者 ID（open_id / user_id / chat_id / email）',
        },
        receive_id_type: {
          type: 'string',
          enum: ['open_id', 'user_id', 'union_id', 'email', 'chat_id'],
          description: '接收者 ID 类型',
          default: 'open_id',
        },
        msg_type: {
          type: 'string',
          enum: ['text', 'post', 'image', 'file', 'interactive'],
          description: '消息类型',
          default: 'text',
        },
        content: {
          type: 'string',
          description: '消息内容。text 类型直接传纯文本字符串即可',
        },
      },
      required: ['receive_id', 'content'],
    },
  },
}

// ============================================
// 用户操作
// ============================================

export const feishuUserSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_user_search',
    description: `搜索或查找飞书用户。

通过邮箱查找（精确匹配）:
feishu_user_search(email="zhangsan@company.com")

通过关键词搜索（姓名、部门等）:
feishu_user_search(query="张三")`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词（姓名、部门等）',
        },
        email: {
          type: 'string',
          description: '用户邮箱（精确查找）',
        },
      },
      required: [],
    },
  },
}
