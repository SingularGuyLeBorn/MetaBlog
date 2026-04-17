/**
 * 网络搜索统一入口
 * 支持多搜索引擎，可扩展
 */

import type { SearchResult, SearchOptions } from './types'
import { duckDuckGoEngine } from './duckduckgo'
import { formatSearchResults } from './utils'

// 注册所有搜索引擎
const engines = new Map<string, typeof duckDuckGoEngine>()
engines.set('duckduckgo', duckDuckGoEngine)

// 默认搜索引擎
const DEFAULT_ENGINE = 'duckduckgo'

/**
 * 执行网络搜索
 */
export async function searchWeb(options: SearchOptions): Promise<{
  results: SearchResult[]
  total: number
  formatted: string
}> {
  const { query, num_results = 5, engine = DEFAULT_ENGINE } = options

  if (!query || query.trim() === '') {
    throw new Error('Missing query parameter')
  }

  const maxResults = Math.min(Math.max(num_results, 1), 20)
  const selectedEngine = engines.get(engine) || engines.get(DEFAULT_ENGINE)!

  const results = await selectedEngine.search(query.trim(), maxResults)

  if (results.length === 0) {
    throw new Error('No search results found')
  }

  // 这里 total 是返回的结果数（DuckDuckGo HTML 版不返回总数）
  const total = results.length
  const formatted = formatSearchResults(results, query, results.length, total)

  return { results, total, formatted }
}

/**
 * 获取可用搜索引擎列表
 */
export function getAvailableEngines(): string[] {
  return Array.from(engines.keys())
}

export type { SearchResult, SearchOptions }
