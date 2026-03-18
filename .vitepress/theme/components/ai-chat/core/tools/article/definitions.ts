/**
 * 文章管理工具定义
 * 供 AI 使用的工具 Schema 定义
 */

import type { ToolDefinition } from '../types'

/**
 * 创建文章
 */
export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_article',
    description: `创建一篇新文章。

使用场景：
- 用户要求记录笔记或想法
- 用户要求创建文档
- 用户要求保存对话内容
- 用户要求撰写文章`,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '文章标题'
        },
        content: {
          type: 'string',
          description: '文章内容（支持 Markdown）'
        },
        summary: {
          type: 'string',
          description: '文章摘要（可选，默认自动生成）'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '文章标签，如 ["AI", "笔记"]',
          default: []
        },
        category: {
          type: 'string',
          description: '文章分类',
          default: 'general'
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: '文章状态',
          default: 'draft'
        }
      },
      required: ['title', 'content']
    }
  }
}

/**
 * 获取文章内容
 */
export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的完整内容。',
    parameters: {
      type: 'object',
      properties: {
        article_id: {
          type: 'string',
          description: '文章 ID'
        }
      },
      required: ['article_id']
    }
  }
}

/**
 * 更新文章
 */
export const updateArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_article',
    description: `更新现有文章。

使用场景：
- 用户要求修改文章内容
- 用户要求更新标题或标签
- 用户要求发布草稿`,
    parameters: {
      type: 'object',
      properties: {
        article_id: {
          type: 'string',
          description: '文章 ID'
        },
        title: {
          type: 'string',
          description: '新标题（可选）'
        },
        content: {
          type: 'string',
          description: '新内容（可选）'
        },
        summary: {
          type: 'string',
          description: '新摘要（可选）'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '新标签（可选）'
        },
        category: {
          type: 'string',
          description: '新分类（可选）'
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: '新状态（可选）'
        }
      },
      required: ['article_id']
    }
  }
}

/**
 * 删除文章
 */
export const deleteArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'delete_article',
    description: '删除指定文章。此操作不可恢复！',
    parameters: {
      type: 'object',
      properties: {
        article_id: {
          type: 'string',
          description: '文章 ID'
        }
      },
      required: ['article_id']
    }
  }
}

/**
 * 列出文章
 */
export const listArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_articles',
    description: `列出所有文章，支持按分类、标签、状态过滤。

使用场景：
- 用户要求查看所有文章
- 用户要求查看特定分类的文章
- 用户要求查看草稿或已发布文章`,
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: '按分类过滤（可选）',
          default: ''
        },
        tag: {
          type: 'string',
          description: '按标签过滤（可选）',
          default: ''
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: '按状态过滤（可选）',
          default: ''
        },
        limit: {
          type: 'number',
          description: '返回数量限制',
          default: 50
        }
      }
    }
  }
}

/**
 * 搜索文章
 */
export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '搜索文章，在标题、内容、标签和分类中查找匹配项。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        limit: {
          type: 'number',
          description: '返回数量限制',
          default: 20
        }
      },
      required: ['query']
    }
  }
}

// ==================== 导出 ====================

export const articleToolDefinitions = {
  create_article: createArticleDef,
  get_article_content: getArticleContentDef,
  update_article: updateArticleDef,
  delete_article: deleteArticleDef,
  list_articles: listArticlesDef,
  search_articles: searchArticlesDef
}

export const articleToolNames = Object.keys(articleToolDefinitions)
