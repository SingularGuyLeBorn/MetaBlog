/**
 * 语雀 (Yuque) Open API 工具定义
 * Agent 可通过这些工具操作语雀知识库和文档
 */

import type { ToolDefinition } from '@/theme/tools/types'

// ============================================
// 知识库操作
// ============================================

export const yuqueRepoListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_repo_list',
    description: `列出语雀用户或团队的知识库（Repo/Book）列表。

使用示例：
- 列出个人知识库: yuque_repo_list(login="username")
- 列出团队知识库: yuque_repo_list(login="teamname", type="group")

返回知识库名称、ID、类型、描述等信息。`,
    parameters: {
      type: 'object',
      properties: {
        login: {
          type: 'string',
          description: '用户或团队的登录名（从语雀 URL 中获取，如 yuque.com/username）',
        },
        type: {
          type: 'string',
          enum: ['user', 'group'],
          description: '类型：user=个人，group=团队',
          default: 'user',
        },
      },
      required: ['login'],
    },
  },
}

export const yuqueTocGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_toc_get',
    description: `获取语雀知识库的目录结构（TOC）。

返回知识库中所有文档的层级关系，包括文档标题、slug、ID 等。
可用于了解知识库的组织结构。`,
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

// ============================================
// 文档操作
// ============================================

export const yuqueDocListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_list',
    description: `列出语雀知识库中的文档列表。

返回文档标题、slug、ID、创建时间、更新时间等基本信息。`,
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

export const yuqueDocReadDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_read',
    description: `读取语雀文档的完整内容。

返回文档的标题、正文（Markdown/HTML/Lake 格式）、创建时间、更新时间等。

repo_id 和 doc_id 可从 yuque_doc_list 结果中获取。`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_id: {
          type: 'string',
          description: '文档 ID',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

export const yuqueDocCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_create',
    description: `在语雀知识库中创建新文档。

content 参数支持 Markdown 语法，系统会自动以 markdown 格式创建。

⚠️ 创建后文档不会自动出现在知识库目录中，如需加入目录请后续调用 yuque_toc_update。

示例:
yuque_doc_create(repo_id="12345", title="项目文档", content="# 标题\\n\\n正文内容")

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
          description: '文档正文（Markdown 格式）',
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

export const yuqueDocUpdateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_update',
    description: `更新语雀文档的标题或内容。

示例:
yuque_doc_update(repo_id="12345", doc_id="67890", title="新标题", content="# 新内容")

可以只更新标题、只更新内容，或同时更新两者。`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_id: {
          type: 'string',
          description: '文档 ID',
        },
        title: {
          type: 'string',
          description: '新标题（可选）',
        },
        content: {
          type: 'string',
          description: '新正文（Markdown 格式，可选）',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

export const yuqueDocDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_doc_delete',
    description: `删除语雀知识库中的指定文档。

示例: yuque_doc_delete(repo_id="12345", doc_id="67890")`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID',
        },
        doc_id: {
          type: 'string',
          description: '文档 ID',
        },
      },
      required: ['repo_id', 'doc_id'],
    },
  },
}

// ============================================
// 搜索操作
// ============================================

export const yuqueSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_search',
    description: `在语雀中搜索文档或知识库。

示例:
- 搜索文档: yuque_search(query="项目计划", type="doc")
- 搜索知识库: yuque_search(query="技术文档", type="repo")`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，最大 200 字符',
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
