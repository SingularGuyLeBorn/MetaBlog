/**
 * 文章管理工具定义
 *
 * ⚠️ 安全边界：AI 只能操作以下板块的文章：
 * - posts（文章列表）
 * - knowledge（知识库）
 * - resources（公开资源）
 *
 * 以下板块不允许 AI 操作：about（关于我）、ai-research（未开放）。
 * 所有路径必须以 sections/{板块}/ 开头，不允许使用 ../ 等 traversal。
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_article',
    description: '创建一篇新文章。只能在允许的板块内创建：posts（文章列表）、knowledge（知识库）、resources（公开资源）。创建时会自动为文章配备同名文件夹（folder/index.md），以预留资源文件夹并符合侧边栏渲染规范。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文章标题（会自动转换为 URL 友好的英文 slug）' },
        content: { type: 'string', description: '文章内容（支持 Markdown）' },
        section: { type: 'string', description: '所属板块，必须是 "posts"、"knowledge" 或 "resources" 之一，默认 "posts"' },
        tags: { type: 'array', items: { type: 'string' }, description: '文章标签' },
        path: { type: 'string', description: '可选的自定义路径（相对于 sections/）。例如 "posts/attention/flash-attention" 会创建为 "posts/attention/flash-attention/index.md"。路径必须在允许的板块内。' }
      },
      required: ['title']
    }
  }
}

export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的内容。路径建议先通过 list_articles 或 search_articles 获得。只能读取允许板块内的文章（posts、knowledge、resources）。',
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
    description: '更新/覆盖已有文章的完整内容。只能操作允许板块内的文章（posts、knowledge、resources）。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章路径，如 "posts/my-article.md"，必须在允许的板块内' },
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
    description: '删除指定文章（操作不可逆，会同时清理缓存）。只能删除允许板块内的文章（posts、knowledge、resources）。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章路径，如 "posts/my-article.md"，必须在允许的板块内' }
      },
      required: ['path']
    }
  }
}

export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '在博客中搜索文章。只搜索允许板块内的文章（posts、knowledge、resources）。',
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
    description: '列出博客中的文章及其路径信息。只列出允许板块内的文章（posts、knowledge、resources）。',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', description: '指定板块，必须是 "posts"、"knowledge" 或 "resources" 之一' },
        folder_path: { type: 'string', description: '指定子文件夹路径（相对 sections/）' },
        limit: { type: 'number', description: '最大返回数量，默认 50' }
      }
    }
  }
}
