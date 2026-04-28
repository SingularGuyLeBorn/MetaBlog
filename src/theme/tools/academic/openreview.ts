/**
 * OpenReview 学术工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { proxyFetch } from './other'

// ==================== 工具定义 ====================

export const searchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchOpenreview',
    description: '搜索 OpenReview 会议论文(ICLR, NeurIPS, ICML等)',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        venue: { type: 'string', description: '会议过滤，如 ICLR', default: '' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const fetchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetchOpenreview',
    description: '获取 OpenReview 论文详情',
    parameters: {
      type: 'object',
      properties: {
        forum_id: { type: 'string', description: 'OpenReview Forum ID' }
      },
      required: ['forum_id']
    }
  }
}

// ==================== 执行器 ====================

export const searchOpenReview: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, venue = '', limit = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: searchOpenreview(query="reinforcement learning")'
    )
  }

  try {
    const url = `https://api.openreview.net/notes/search?term=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`

    const response = await proxyFetch(url)

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'OpenReview 搜索失败',
        '请稍后重试'
      )
    }

    const data = await response.json()
    let notes = data.notes || []

    if (venue) {
      notes = notes.filter((n: any) =>
        (n.content?.venue?.value || '').toLowerCase().includes(venue.toLowerCase())
      )
    }

    if (!notes.length) {
      return createSuccessResult(
        [],
        `未找到与 "${query}" 相关的 OpenReview 论文`,
        'searchOpenreview',
        '尝试使用不同的关键词或移除会议过滤'
      )
    }

    const papers = notes.slice(0, limit).map((n: any) => ({
      title: n.content?.title?.value || n.content?.title || 'Untitled',
      authors: n.content?.authors?.value || n.content?.authors || [],
      venue: n.content?.venue?.value || 'Unknown',
      forum: n.forum || n.id
    }))

    return createSuccessResult(
      papers,
      `找到 ${notes.length} 篇论文`,
      'searchOpenreview',
      '使用 fetchOpenreview(forum_id="xxx") 获取详情'
    )
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return createErrorResult(
        'Request timeout',
        '请求超时',
        '请稍后重试'
      )
    }
    return createErrorResult(
      error.message,
      '搜索失败',
      '请检查网络连接'
    )
  }
}

export const fetchOpenReview: ToolExecutor = async (args): Promise<ToolResult> => {
  const { forum_id } = args

  if (!forum_id) {
    return createErrorResult(
      'Missing forum_id parameter',
      '请提供 Forum ID',
      '示例: fetchOpenreview(forum_id="xxxxxxxx")'
    )
  }

  try {
    const url = `https://api.openreview.net/notes?id=${forum_id}`

    const response = await proxyFetch(url)

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取论文详情失败',
        '请稍后重试'
      )
    }

    const data = await response.json()
    const note = data.notes?.[0]

    if (!note) {
      return createErrorResult(
        'Paper not found',
        `未找到论文: ${forum_id}`,
        '请检查 Forum ID 是否正确'
      )
    }

    const paperData = {
      title: note.content?.title?.value || note.content?.title || 'Untitled',
      authors: note.content?.authors?.value || note.content?.authors || [],
      abstract: note.content?.abstract?.value || note.content?.abstract || '',
      venue: note.content?.venue?.value || 'Unknown',
      forum: note.forum || note.id,
      url: `https://openreview.net/forum?id=${note.forum || note.id}`
    }

    return createSuccessResult(
      paperData,
      `成功获取论文: ${paperData.title}`,
      'fetchOpenreview'
    )
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return createErrorResult(
        'Request timeout',
        '请求超时',
        '请稍后重试'
      )
    }
    return createErrorResult(
      error.message,
      '获取论文详情失败',
      '请检查网络连接'
    )
  }
}
