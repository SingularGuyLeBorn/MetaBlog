/**
 * 搜索通用工具
 */

import type { SearchResult } from './types'

const API_BASE = '/api'

/**
 * 通过后端代理获取 URL 内容
 */
export async function proxyFetchText(url: string, timeout = 15000, retries = 1): Promise<string> {
  const response = await fetch(`${API_BASE}/proxy/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, timeout, retries })
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.text()
}

/**
 * 格式化搜索结果为字符串
 */
export function formatSearchResults(results: SearchResult[], query: string, shown: number, total: number): string {
  const formatted = results.map((r, i) =>
    `[${i + 1}] ${r.title}\nURL: ${r.url}${r.displayUrl ? ` (${r.displayUrl})` : ''}\n${r.snippet ? r.snippet : ''}`
  ).join('\n\n')

  return `搜索 "${query}" 找到 ${total} 条结果(显示前 ${shown} 条)：\n\n${formatted}`
}

/**
 * 从 HTML 中提取文本(去除标签)
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
