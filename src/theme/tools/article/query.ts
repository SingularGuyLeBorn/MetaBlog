/**
 * ============================================================================
 * 文章管理工具 — 查询操作(搜索 / 列表)
 * ============================================================================
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import {
  ALLOWED_SECTIONS,
  API_BASE,
  extractSection,
  handleApiResponse,
} from './utils'

/** 搜索文章 */
export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchArticles',
    description: '在博客中搜索文章。只搜索允许板块内的文章(posts、knowledge、resources)。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' }
      },
      required: ['query']
    }
  }
}

/** 列出文章 */
export const listArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'listArticles',
    description: '列出博客中的文章及其路径信息。只列出允许板块内的文章(posts、knowledge、resources)。',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', description: '指定板块，必须是 "posts"、"knowledge" 或 "resources" 之一' },
        folder_path: { type: 'string', description: '指定子文件夹路径(相对 sections/)' },
        limit: { type: 'number', description: '最大返回数量，默认 50' }
      }
    }
  }
}

/** 搜索文章 */
export const searchArticles: ToolExecutor = async (args) => {
  const { query, section, limit = 5 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '例如: "React", "深度学习", "Docker"'
    )
  }

  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (section) params.append('section', section)

    const response = await fetch(`${API_BASE}/articles/search?${params}`)
    const result = await handleApiResponse(response, '搜索文章')

    if (!result.success) return result

    const articles = result.data || []
    if (articles.length === 0) {
      return createSuccessResult(
        [],
        `未找到包含 "${query}" 的文章`,
        'searchArticles',
        '尝试使用不同的关键词，或创建新文章'
      )
    }

    return createSuccessResult(
      articles,
      `找到 ${articles.length} 篇相关文章`,
      'searchArticles',
      '使用 getArticleContent(path="文章路径") 读取内容'
    )
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '搜索失败',
      '请稍后重试'
    )
  }
}

/** 列出文章 — 只列出 sections/ 目录下的内容(文章相关) */
export const listArticles: ToolExecutor = async (args) => {
  const { section, folder_path, limit = 50 } = args

  // 如果指定了 section，校验是否在白名单
  if (section && !ALLOWED_SECTIONS.includes(section)) {
    return createErrorResult(
      'Section not allowed',
      `板块 "${section}" 不在允许范围内。`,
      `可用板块：${ALLOWED_SECTIONS.join('、')}`
    )
  }

  try {
    // 构建路径：默认 sections，如果有 section 则 sections/section
    let targetPath = 'sections'
    if (section) {
      targetPath = `sections/${section}`
    } else if (folder_path) {
      targetPath = folder_path
    }

    const params = new URLSearchParams()
    params.append('path', targetPath)
    params.append('limit', String(limit))

    const response = await fetch(`${API_BASE}/files/list?${params}`)
    const result = await handleApiResponse(response, '列出文章')

    if (!result.success) return result

    // 过滤掉非文章相关的文件(如 node_modules)
    let filteredItems = (result.data || []).filter((item: any) => {
      // 排除常见的非内容目录和文件
      const excludePatterns = [
        'node_modules', '.git', '.vitepress', '.data', '.skills',
        'package.json', 'package-lock.json', 'node_modules'
      ]
      return !excludePatterns.some(pattern =>
        item.name.includes(pattern) || item.path.includes(pattern)
      )
    })

    // 额外过滤：只保留白名单板块内的内容
    filteredItems = filteredItems.filter((item: any) => {
      const itemSection = extractSection(item.path || '')
      return !itemSection || ALLOWED_SECTIONS.includes(itemSection)
    })

    return createSuccessResult(
      filteredItems,
      `找到 ${filteredItems.length} 个条目`,
      'listArticles',
      section ? `当前位置: sections/${section}/` : '当前位置: sections/'
    )
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '获取列表失败'
    )
  }
}
