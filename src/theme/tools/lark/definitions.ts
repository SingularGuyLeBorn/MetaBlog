/**
 * 飞书 Open API 工具定义
 * Agent 可通过这些工具操作飞书文档、消息、用户
 */

import type { ToolDefinition } from '@/theme/tools/types'

// ============================================
// 文档操作
// ============================================

export const feishuDocInsertImageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_insert_image',
    description: `插入图片到飞书文档（自动完成三步法：创建空图片块 → 上传素材 → 绑定）。

支持两种方式（二选一）：
1. 网络图片: feishu_doc_insert_image(document_id="xxx", image_url="https://example.com/pic.png")
2. Base64 图片: feishu_doc_insert_image(document_id="xxx", image_base64="data:image/png;base64,...")

注意事项:
- image_url 优先于 image_base64
- 图片大小不得超过 20MB
- 可选 caption 参数添加图注`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '飞书文档 ID（docx 的 document_id）',
        },
        image_url: {
          type: 'string',
          description: '网络图片 URL，支持 http/https',
        },
        image_base64: {
          type: 'string',
          description: '图片的 base64 编码字符串，可包含 data:image/png;base64, 前缀',
        },
        file_name: {
          type: 'string',
          description: '图片文件名（含扩展名），如 demo.png',
        },
        caption: {
          type: 'string',
          description: '图片下方图注文字',
        },
      },
      required: ['document_id'],
    },
  },
}

export const feishuDocCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_create',
    description: `创建一个新的飞书文档（docx 格式），返回文档 ID 和链接。

使用示例：
- 创建空文档: feishu_doc_create(title="项目计划")
- 在指定文件夹创建: feishu_doc_create(title="周报", folder_token="Flxxx")
- 创建并自动分享给用户: feishu_doc_create(title="周报", owner_email="user@company.com")

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
        owner_email: {
          type: 'string',
          description: '文档所有者的企业邮箱（可选）。传入后自动将该用户添加为协作者',
        },
        owner_mobile: {
          type: 'string',
          description: '文档所有者的手机号（可选）。与 owner_email 二选一即可',
        },
        enable_permission: {
          type: 'boolean',
          description: '是否自动分享权限给 owner_email/owner_mobile 指定的用户。默认 true，传 false 可关闭',
          default: true,
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
10. 公式：使用 KaTeX 语法。行内 $E=mc^2$；块级 $$ 单独成块（前后空行）。注意：公式内容必须是 KaTeX 语法（参考 https://katex.org/docs/supported.html），不支持 MathJax 特有语法
11. 图片：![描述](URL)，图注用 > 图1: 描述
12. 段落行首严禁前导空格（会被识别为代码块）
13. 标点必须用英文半角 . , ( ) : ; " '，不要用中文全角
14. 不同内容块之间用一个空行分隔
15. 表格：支持标准 Markdown 表格语法 | 表头 | 表头 |，单元格内支持行内格式（粗体、斜体等）。大表格（超过50个单元格）请分多次调用

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
// 权限操作
// ============================================

export const feishuDocShareDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_share',
    description: `分享飞书文档权限给指定用户，让对方可以查看或编辑文档。

使用示例:
- 通过 open_id: feishu_doc_share(document_id="xxx", member_id="ou_xxx")
- 通过邮箱: feishu_doc_share(document_id="xxx", member_id="user@company.com", member_type="email")
- 通过手机号: feishu_doc_share(document_id="xxx", member_id="13800138000", member_type="phone")

权限级别:
- full_access: 可管理（最高权限，可编辑、分享、删除）
- edit: 可编辑
- view: 仅查看

member_type 说明:
- openid: 开放平台用户 ID（默认）
- userid: 用户自定义 ID
- unionid: 跨应用统一 ID
- email: 企业邮箱（无需查 ID，直接分享）
- phone: 手机号（后端自动查 open_id 后分享，需要 contact:user.id:readonly 权限）`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '飞书文档 ID',
        },
        member_id: {
          type: 'string',
          description: '用户标识（open_id / user_id / union_id / 邮箱 / 手机号）',
        },
        member_type: {
          type: 'string',
          enum: ['openid', 'userid', 'unionid', 'email', 'phone'],
          description: '用户标识类型',
          default: 'openid',
        },
        perm: {
          type: 'string',
          enum: ['full_access', 'edit', 'view'],
          description: '权限级别',
          default: 'full_access',
        },
      },
      required: ['document_id', 'member_id'],
    },
  },
}

export const feishuDocUnshareDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_doc_unshare',
    description: `取消飞书文档对指定用户的权限分享。

使用示例:
- feishu_doc_unshare(document_id="xxx", member_id="ou_xxx")
- feishu_doc_unshare(document_id="xxx", member_id="user@company.com", member_type="email")
- feishu_doc_unshare(document_id="xxx", member_id="13800138000", member_type="phone")`,
    parameters: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: '飞书文档 ID',
        },
        member_id: {
          type: 'string',
          description: '用户标识',
        },
        member_type: {
          type: 'string',
          enum: ['openid', 'userid', 'unionid', 'email', 'phone'],
          description: '用户标识类型',
          default: 'openid',
        },
      },
      required: ['document_id', 'member_id'],
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
    description: `搜索或查找飞书用户，获取用户的 open_id 等信息。

按类型查找（精确匹配，只需要 contact:user.id:readonly 权限）：
- 通过手机号: feishu_user_search(query="13800138000", type="phone")
- 通过邮箱: feishu_user_search(query="zhangsan@company.com", type="email")

按关键词搜索（姓名、部门等，需要 contact:contact.base:readonly 权限）：
- feishu_user_search(query="张三", type="keyword")

注意：如果应用未开通 contact:contact.base:readonly 权限，type="keyword" 会失败，此时应改用 phone 或 email 精确查找。`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '查询内容（手机号、邮箱、姓名等）',
        },
        type: {
          type: 'string',
          enum: ['phone', 'email', 'keyword'],
          description: '查询类型：phone=手机号, email=邮箱, keyword=姓名/部门关键词（默认 keyword）',
          default: 'keyword',
        },
      },
      required: ['query'],
    },
  },
}

// ============================================
// Wiki 知识库操作
// ============================================

export const feishuWikiSpaceCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_space_create',
    description: `创建飞书知识库空间（Wiki Space）。

使用示例：
- 创建知识库: feishu_wiki_space_create(name="产品文档库", description="存放产品相关文档")

创建成功后，可用 feishu_wiki_node_create 在知识库中挂载文档。`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '知识库名称',
        },
        description: {
          type: 'string',
          description: '知识库描述（可选）',
        },
      },
      required: ['name'],
    },
  },
}

export const feishuWikiSpaceListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_space_list',
    description: '列出当前用户可访问的飞书知识库空间列表。',
    parameters: {
      type: 'object',
      properties: {
        page_size: {
          type: 'number',
          description: '每页数量（1-50，默认 10）',
          default: 10,
        },
      },
      required: [],
    },
  },
}

export const feishuWikiSpaceGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_space_get',
    description: '获取飞书知识库空间的详细信息。',
    parameters: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: '知识库空间 ID',
        },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiSpaceUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_space_update',
    description: '更新飞书知识库空间的名称或描述。',
    parameters: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: '知识库空间 ID',
        },
        name: {
          type: 'string',
          description: '新名称（可选）',
        },
        description: {
          type: 'string',
          description: '新描述（可选）',
        },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiSpaceDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_space_delete',
    description: `删除飞书知识库空间。

【⚠️ 警告】删除操作不可逆！会同时删除知识库下的所有节点。`,
    parameters: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: '知识库空间 ID',
        },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiNodeCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_node_create',
    description: `在飞书知识库中创建节点（挂载文档）。

使用示例：
- 在知识库根节点创建文档: feishu_wiki_node_create(space_id="xxx", title="新文档")
- 在指定父节点下创建: feishu_wiki_node_create(space_id="xxx", parent_node_token="yyy", title="子文档")

创建成功后返回 node_token，可用于后续操作。`,
    parameters: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: '知识库空间 ID',
        },
        title: {
          type: 'string',
          description: '节点标题（创建 docx 时需要）',
        },
        parent_node_token: {
          type: 'string',
          description: '父节点 token（可选），不传则挂载到根节点',
        },
        obj_type: {
          type: 'string',
          enum: ['docx', 'sheet', 'bitable', 'mindnote'],
          description: '对象类型，默认 docx',
          default: 'docx',
        },
      },
      required: ['space_id', 'title'],
    },
  },
}

export const feishuWikiNodeListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_node_list',
    description: '列出飞书知识库中的节点（文档列表）。',
    parameters: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: '知识库空间 ID',
        },
        parent_node_token: {
          type: 'string',
          description: '父节点 token（可选），不传则获取根节点下的节点',
        },
        page_size: {
          type: 'number',
          description: '每页数量（默认 10）',
          default: 10,
        },
      },
      required: ['space_id'],
    },
  },
}

export const feishuWikiNodeDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishu_wiki_node_delete',
    description: `删除飞书知识库中的节点。

【⚠️ 警告】删除操作不可逆！`,
    parameters: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: '知识库空间 ID',
        },
        node_token: {
          type: 'string',
          description: '节点 token',
        },
      },
      required: ['space_id', 'node_token'],
    },
  },
}
