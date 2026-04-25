/**
 * 共享网络工具及其他学术工具（Papers With Code、Semantic Scholar）
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

// ==================== 速率限制与缓存 ====================
// ArXiv 官方 ToU: 每 3 秒最多 1 个请求，且单连接
// https://info.arxiv.org/help/api/tou.html
const lastFetchTime: Record<string, number> = {}
const MIN_INTERVAL_MS = 3000

async function rateLimitDelay(url: string) {
  try {
    const host = new URL(url).hostname
    const now = Date.now()
    const last = lastFetchTime[host] || 0
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - last))
    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait))
    }
    lastFetchTime[host] = Date.now()
  } catch {
    // ignore invalid url
  }
}

interface CacheEntry {
  text: string
  ts: number
}
const responseCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 分钟缓存

function getCacheKey(url: string, headers?: Record<string, string>) {
  return `${url}::${JSON.stringify(headers || {})}`
}

function getCachedResponse(url: string, headers?: Record<string, string>): Response | null {
  const key = getCacheKey(url, headers)
  const entry = responseCache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/xml; charset=utf-8' }),
      text: async () => entry.text,
      json: async () => JSON.parse(entry.text),
    } as Response
  }
  responseCache.delete(key)
  return null
}

function setCachedResponse(url: string, text: string, headers?: Record<string, string>) {
  const key = getCacheKey(url, headers)
  responseCache.set(key, { text, ts: Date.now() })
}

// 通过后端代理转发请求，避免浏览器 CORS 限制
export async function proxyFetch(url: string, headers?: Record<string, string>, timeout = 15000): Promise<Response> {
  // ArXiv 域名优先走缓存
  const isArxiv = url.includes('export.arxiv.org') || url.includes('arxiv.org')
  if (isArxiv) {
    const cached = getCachedResponse(url, headers)
    if (cached) return cached
  }

  await rateLimitDelay(url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch('/api/proxy/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeout, headers, retries: 2 }),
      signal: controller.signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => 'Proxy error')
      throw new Error(`Proxy HTTP ${res.status}: ${text}`)
    }
    // 构造一个 Response-like 对象，兼容原有代码
    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()
    if (isArxiv) {
      setCachedResponse(url, text, headers)
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': contentType }),
      text: async () => text,
      json: async () => JSON.parse(text),
    } as Response
  } finally {
    clearTimeout(timer)
  }
}

// ==================== Papers With Code ====================

export const searchPapersWithCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_paperswithcode',
    description: '搜索 Papers With Code，获取带开源代码实现的论文',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const searchPapersWithCode: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, limit = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: search_paperswithcode(query="image classification")'
    )
  }

  try {
    const url = `https://paperswithcode.com/api/v1/search/?q=${encodeURIComponent(query)}&items_per_page=${Math.min(limit, 50)}`

    const response = await proxyFetch(url)

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'Papers With Code 搜索失败',
        '请稍后重试'
      )
    }

    const data = await response.json()
    const results = data.results?.filter((r: any) => r.type === 'paper') || []

    if (!results.length) {
      return createSuccessResult(
        [],
        `未找到与 "${query}" 相关的论文`,
        'search_paperswithcode',
        '尝试使用不同的关键词'
      )
    }

    const papers = results.slice(0, limit).map((item: any) => {
      const p = item._source
      return {
        title: p.title,
        authors: p.authors || [],
        abstract: p.abstract || ''
      }
    })

    return createSuccessResult(
      papers,
      `找到 ${results.length} 篇带代码实现的论文`,
      'search_paperswithcode'
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

// ==================== Semantic Scholar ====================

export const searchSemanticScholarDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_semantic_scholar',
    description: '搜索 Semantic Scholar 学术数据库，获取引用数等信息',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const searchSemanticScholar: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, limit = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: search_semantic_scholar(query="deep learning")'
    )
  }

  try {
    const fields = 'title,authors,year,abstract,citationCount'
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=${Math.min(limit, 100)}`

    const response = await proxyFetch(url)

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'Semantic Scholar 搜索失败',
        '请稍后重试'
      )
    }

    const data = await response.json()
    const papers = data.data || []

    if (!papers.length) {
      return createSuccessResult(
        [],
        `未找到与 "${query}" 相关的论文`,
        'search_semantic_scholar',
        '尝试使用不同的关键词'
      )
    }

    const formattedPapers = papers.map((p: any) => ({
      title: p.title,
      authors: p.authors?.map((a: any) => a.name) || [],
      year: p.year,
      citationCount: p.citationCount,
      abstract: p.abstract || ''
    }))

    return createSuccessResult(
      formattedPapers,
      `找到 ${papers.length} 篇论文`,
      'search_semantic_scholar'
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
