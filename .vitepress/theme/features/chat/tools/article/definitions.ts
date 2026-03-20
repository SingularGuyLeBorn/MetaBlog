/**
 * 文章管理工具定义
 */

import type { ToolDefinition } from '../types'

export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_article',
    description: '创建一篇新文章。支持标题、内容、标签、分类和状态。',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文章标题' },
        content: { type: 'string', description: '文章内容（支持 Markdown）' },
        summary: { type: 'string', description: '文章摘要（可选）' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签', default: [] },
        category: { type: 'string', description: '分类', default: 'general' },
        status: { type: 'string', enum: ['draft', 'published'], default: 'draft' }
      },
      required: ['title', 'content']
    }
  }
}

export const getArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_article',
    description: '获取指定文章的完整内容。',
    parameters: {
      type: 'object',
      properties: {
        article_id: { type: 'string', description: '文章 ID' }
      },
      required: ['article_id']
    }
  }
}

export const updateArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'update_article',
    description: '更新现有文章。可更新标题、内容、摘要、标签、分类、状态。',
    parameters: {
      type: 'object',
      properties: {
        article_id: { type: 'string', description: '文章 ID' },
        title: { type: 'string', description: '新标题（可选）' },
        content: { type: 'string', description: '新内容（可选）' },
        summary: { type: 'string', description: '新摘要（可选）' },
        tags: { type: 'array', items: { type: 'string' }, description: '新标签（可选）' },
        category: { type: 'string', description: '新分类（可选）' },
        status: { type: 'string', enum: ['draft', 'published'], description: '新状态（可选）' }
      },
      required: ['article_id']
    }
  }
}

export const deleteArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'delete_article',
    description: '删除指定文章。此操作不可恢复！',
    parameters: {
      type: 'object',
      properties: {
        article_id: { type: 'string', description: '文章 ID' }
      },
      required: ['article_id']
    }
  }
}

export const listArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_articles',
    description: '列出所有文章，支持按分类、标签、状态过滤。',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: '按分类过滤', default: '' },
        tag: { type: 'string', description: '按标签过滤', default: '' },
        status: { type: 'string', enum: ['draft', 'published'], description: '按状态过滤', default: '' },
        limit: { type: 'number', description: '数量限制', default: 50 }
      }
    }
  }
}

export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_articles',
    description: '搜索文章，在标题、内容、标签中查找。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'number', description: '数量限制', default: 20 }
      },
      required: ['query']
    }
  }
}
