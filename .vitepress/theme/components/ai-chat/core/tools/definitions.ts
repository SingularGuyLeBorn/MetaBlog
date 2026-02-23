/**
 * 工具定义
 * 
 * 所有工具的 schema 定义，用于告诉 AI 每个工具的用途和参数
 */
import type { ToolDefinition } from './types'

// ============ 文章相关工具定义 ============

export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的内容。仅在用户要求"查看某篇文章"、"读取某篇文章"或需要基于已有文章内容回答时使用。不要主动调用此工具。',
    parameters: {
      type: 'object',
      properties: { 
        path: { 
          type: 'string', 
          description: '文章路径，例如 "knowledge/getting-started.md"' 
        },
        max_length: {
          type: 'number',
          description: '最大返回字符数，默认8000，避免消息过长'
        }
      },
      required: ['path']
    }
  }
}

export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '根据关键词搜索文章',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: '搜索关键词，例如 "深度学习"' 
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认5条' 
        }
      },
      required: ['query']
    }
  }
}

export const listArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_articles',
    description: '列出文章列表，可按分类筛选。仅在用户询问"有哪些文章"、"文章列表"或需要查找特定文章时使用。不要主动调用此工具。',
    parameters: {
      type: 'object',
      properties: {
        section: { 
          type: 'string', 
          description: '可选：按分类筛选，例如 "knowledge"、"posts"' 
        },
        limit: { 
          type: 'number', 
          description: '返回结果数量限制，默认20，最大50' 
        }
      },
      required: []
    }
  }
}

export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_article',
    description: `创建一篇新文章。当用户明确要求创建文章、写博客、新建文档时使用。

重要提示：
- path 参数必须包含文件夹和文件名，格式为 "section/filename.md"
- 例如："knowledge/transformer-detailed.md" 会在 knowledge 文件夹下创建 transformer-detailed.md
- 如果用户没有指定 section，默认使用 "knowledge" 或 "posts"
- 标题应该简洁明了，反映文章主题
- 不要主动调用此工具，除非用户明确要求创建文章`,
    parameters: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: '文章标题，例如 "Transformer 详解"' 
        },
        path: { 
          type: 'string', 
          description: '文章完整路径，格式为 "section/filename.md"，例如 "knowledge/transformer-detailed.md"' 
        },
        content: { 
          type: 'string', 
          description: '文章内容（支持 Markdown），可以包含标题、段落、代码块等' 
        }
      },
      required: ['title', 'path']
    }
  }
}

export const updateArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_article',
    description: '更新/修改已有文章的内容。当用户要求编辑、修改、更新文章时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '文章路径，例如 "posts/existing-article.md"' 
        },
        content: { 
          type: 'string', 
          description: '新的文章内容（完整替换）' 
        }
      },
      required: ['path', 'content']
    }
  }
}

export const deleteArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'delete_article',
    description: '删除文章。当用户要求删除、移除文章时使用。此操作不可逆！',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '要删除的文章路径' 
        }
      },
      required: ['path']
    }
  }
}

// ============ 系统工具定义 ============

export const getCurrentTimeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: '获取当前系统时间。当用户询问"现在几点"、"当前时间"、"今天日期"等时间相关问题时，必须调用此工具获取准确时间。',
    parameters: { type: 'object', properties: {} }
  }
}

export const testEchoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'test_echo',
    description: '【测试专用】回声工具，验证工具调用是否正常工作。当用户说"测试工具"时使用。',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '要回显的消息' },
        repeat_count: { type: 'number', description: '重复次数' }
      },
      required: ['message']
    }
  }
}

// ============ 文本处理工具定义 ============

export const summarizeTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'summarize_text',
    description: '对给定文本生成简短摘要。当用户要求"总结"、"摘要"、"概括"或文本过长需要精简时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '需要摘要的原始文本'
        },
        max_length: {
          type: 'number',
          description: '摘要最大长度（字符数），默认200'
        }
      },
      required: ['text']
    }
  }
}

export const formatTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'format_text',
    description: '将文本格式化为指定格式（Markdown、JSON、YAML、表格等）。当用户需要格式化输出或示例时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '原始文本内容'
        },
        format: {
          type: 'string',
          description: '目标格式：markdown、json、yaml、table，默认markdown',
          enum: ['markdown', 'json', 'yaml', 'table']
        }
      },
      required: ['text']
    }
  }
}

// ============ 所有工具定义列表 ============

export const allToolDefinitions = [
  getArticleContentDef,
  searchArticlesDef,
  listArticlesDef,
  createArticleDef,
  updateArticleDef,
  deleteArticleDef,
  getCurrentTimeDef,
  testEchoDef,
  summarizeTextDef,
  formatTextDef
]
