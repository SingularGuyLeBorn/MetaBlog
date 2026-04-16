/**
 * 文章管理工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_article',
    description: '创建一篇新文章。Harness 会自动检测路径上的叶子节点冲突，并在需要时将叶子文档提升为 folder-note 结构。支持传入嵌套路径（如 "posts/attention/flash-attention.md"），无需手动指定 isChildDoc。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文章标题（会自动转换为 URL 友好的英文 slug 作为文件名）' },
        content: { type: 'string', description: '文章内容（支持 Markdown）' },
        section: { type: 'string', description: '所属板块，例如 "posts", "knowledge", "resources" 等，默认 "posts"' },
        tags: { type: 'array', items: { type: 'string' }, description: '文章标签' },
        path: { type: 'string', description: '可选的自定义路径（相对于 sections/），例如 "posts/attention/flash-attention.md"。如果不传，则根据标题自动生成路径。' }
      },
      required: ['title']
    }
  }
}

export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的内容。路径建议先通过 list_articles 或 search_articles 获得。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章的相对路径，例如 "posts/my-article.md" 或 "knowledge/folder/index.md"' }
      },
      required: ['path']
    }
  }
}

export const updateArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_article',
    description: '更新/覆盖已有文章的完整内容。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章路径，如 "posts/my-article.md"' },
        content: { type: 'string', description: '完整的 Markdown 内容（包含 frontmatter）' }
      },
      required: ['path', 'content']
    }
  }
}

export const deleteArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'delete_article',
    description: '删除指定文章（操作不可逆，会同时清理缓存）。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章路径，如 "posts/my-article.md"' }
      },
      required: ['path']
    }
  }
}

export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '在博客中全局搜索文章。返回匹配的文章路径。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' }
      },
      required: ['query']
    }
  }
}

export const listArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_articles',
    description: '列出博客中的所有文章及其路径信息。',
    parameters: {
      type: 'object',
      properties: {}
    }
  }
}
