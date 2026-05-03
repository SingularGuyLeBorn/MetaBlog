/**
 * ============================================================================
 * 网络搜索工具
 * ============================================================================
 *
 * 直接调用后端 /api/search,由后端负责引擎选择和反爬处理. 
 * 支持指定搜索引擎(engine)和限制搜索站点(platform). 
 * 仅返回搜索结果列表(标题/链接/摘要),不获取网页全文. 
 * 如需读取完整内容,请使用 readArticle 工具. 
 *
 * @module src/theme/tools/network/web-search
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '../types'
import { createErrorResult, createSuccessResult } from '../types'

/** 搜索请求超时时间(毫秒) */
const SEARCH_TIMEOUT = 30_000
/** 默认搜索引擎 */
const DEFAULT_ENGINE = 'bing_crawler'

/**
 * 搜索结果项数据结构
 */
interface SearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * 根据 platform 参数构建最终搜索 query
 *
 * platform 使用 site: 语法限制搜索范围,如 site:zhihu.com
 *
 * @param query - 原始搜索关键词
 * @param platform - 限制站点域名(可选)
 * @returns 构建后的搜索 query
 */
function buildQuery(query: string, platform?: string): string {
  if (!platform || platform.trim() === '') return query.trim()
  const p = platform.trim()
  return `site:${p} ${query.trim()}`
}

/**
 * 将搜索结果格式化为 Markdown 表格
 *
 * @param results - 搜索结果数组
 * @param query - 搜索关键词(用于标题)
 * @returns Markdown 格式的搜索结果文本
 */
function formatAsMarkdown(results: SearchResult[], query: string): string {
  if (results.length === 0) return `搜索 "${query}" 未找到结果. `

  const lines = [
    `搜索 "${query}" 找到 ${results.length} 条结果：`,
    '',
    '| # | 标题 | 摘要 |',
    '|---|---|---|',
  ]

  results.forEach((r, i) => {
    const title = r.title.replace(/\|/g, '\\|').trim()
    const snippet = r.snippet.replace(/\|/g, '\\|').trim()
    lines.push(`| ${i + 1} | [${title}](${r.url}) | ${snippet} |`)
  })

  return lines.join('\n')
}

/**
 * 执行网络搜索请求
 *
 * 使用 AbortController 实现超时控制,避免请求挂死. 
 *
 * @param query - 搜索关键词
 * @param maxResults - 最大返回结果数
 * @param engine - 搜索引擎名称
 * @returns 搜索结果数组
 * @throws 搜索失败或超时时抛出异常
 */
async function doSearch(
  query: string,
  maxResults: number,
  engine: string = DEFAULT_ENGINE
): Promise<SearchResult[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT)

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        limit: maxResults,
        engine,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`搜索请求失败 (${response.status}): ${text || response.statusText}`)
    }

    const data = await response.json()
    return (data.data?.results || data.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.snippet || '',
    }))
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('搜索请求超时 (30s),请稍后重试或缩小搜索范围')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ==================== Tool Definition ====================

/**
 * 网络搜索工具定义
 */
export const webSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'webSearch',
    description:
      '执行网络搜索,获取最新信息. 只返回搜索结果列表(标题、链接、摘要),不获取网页全文. ' +
      '如需读取某条结果的完整内容,请使用 readArticle 工具传入 URL. ',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词或问题',
        },
        max_results: {
          type: 'number',
          description: '返回结果数量上限,默认 10,最大 100',
          default: 10,
        },
        engine: {
          type: 'string',
          description:
            '指定搜索引擎,默认 bing_crawler. 可选值：bing_crawler(Bing爬虫,免费国内可用)、' +
            'duckduckgo(免费,国内可能不通)、bing(需配置 API Key)等. ',
        },
        platform: {
          type: 'string',
          description:
            '限制搜索范围到指定网站,使用完整域名如 zhihu.com、stackoverflow.com. ' +
            '不传则全网搜索. ',
        },
      },
      required: ['query'],
    },
  },
}

// ==================== Tool Executor ====================

/**
 * 网络搜索执行器
 *
 * @param args - 包含 query、max_results、engine、platform 参数
 * @returns 搜索结果,格式化为 Markdown 表格
 */
export const webSearch: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, max_results = 10, engine, platform } = args

  if (!query || query.trim() === '') {
    return createErrorResult('MissingQuery', '搜索关键词不能为空', '请提供有效的搜索关键词')
  }

  const limit = Math.min(Math.max(max_results, 1), 100)
  const preferredEngine = (engine || DEFAULT_ENGINE).trim()
  const finalQuery = buildQuery(query, platform)

  try {
    const results = await doSearch(finalQuery, limit, preferredEngine)
    const formatted = formatAsMarkdown(results, finalQuery)

    return createSuccessResult(
      results,
      formatted,
      'webSearch',
      results.length > 0 ? '如需获取某条结果的完整内容,请使用 readArticle 工具' : undefined
    )
  } catch (err: any) {
    return createErrorResult(
      err.message || String(err),
      '网络搜索失败',
      '请检查关键词后重试,或稍后再次尝试'
    )
  }
}
