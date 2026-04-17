/**
 * DuckDuckGo HTML 版搜索实现
 * 零成本，无需 API Key
 */

import type { SearchResult, SearchEngine } from './types'
import { proxyFetchText, stripHtml } from './utils'

/**
 * 解析 DuckDuckGo HTML 搜索结果
 * 优先用 DOMParser，降级用正则
 */
function parseResults(html: string): SearchResult[] {
  const results: SearchResult[] = []

  // 尝试用 DOMParser 解析（浏览器环境）
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const resultElements = doc.querySelectorAll('.result')

    resultElements.forEach(el => {
      const linkEl = el.querySelector('a.result__a')
      const urlEl = el.querySelector('a.result__url')
      const snippetEl = el.querySelector('a.result__snippet')

      if (!linkEl) return

      let url = linkEl.getAttribute('href') || ''
      url = decodeDuckDuckGoUrl(url)

      const title = linkEl.textContent?.trim() || ''
      const displayUrl = urlEl?.textContent?.trim() || ''
      const snippet = snippetEl?.textContent?.trim() || ''

      if (title && url && !isJunkUrl(url)) {
        results.push({ title, url, displayUrl, snippet })
      }
    })

    if (results.length > 0) return results
  } catch {
    // DOMParser 失败，继续用正则降级
  }

  // 正则降级解析
  const blockRegex = /<div[^>]*class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="result|<!--|<\/div>\s*$)/gi
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(html)) !== null) {
    const block = match[1]
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
    const urlMatch = block.match(/<a[^>]*class="result__url"[^>]*>([\s\S]*?)<\/a>/i)
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)

    if (titleMatch) {
      let url = decodeDuckDuckGoUrl(titleMatch[1].trim())
      const title = stripHtml(titleMatch[2])
      const displayUrl = urlMatch ? stripHtml(urlMatch[1]) : ''
      const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : ''

      if (title && url && !isJunkUrl(url)) {
        results.push({ title, url, displayUrl, snippet })
      }
    }
  }

  return results
}

/**
 * 解码 DuckDuckGo 重定向链接
 */
function decodeDuckDuckGoUrl(url: string): string {
  if (url.startsWith('/l/?')) {
    const uddg = new URLSearchParams(url.slice(3)).get('uddg')
    if (uddg) return decodeURIComponent(uddg)
  }
  if (url.startsWith('/')) {
    return 'https://duckduckgo.com' + url
  }
  return url
}

/**
 * 过滤无意义的 URL
 */
function isJunkUrl(url: string): boolean {
  return url.includes('duckduckgo.com/settings') ||
    url.includes('duckduckgo.com/params') ||
    url === ''
}

/**
 * DuckDuckGo 搜索引擎
 */
export const duckDuckGoEngine: SearchEngine = {
  name: 'duckduckgo',

  async search(query: string, maxResults: number): Promise<SearchResult[]> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=zh-cn`
    const html = await proxyFetchText(searchUrl, 15000, 1)
    const results = parseResults(html)
    return results.slice(0, maxResults)
  }
}
