/**
 * ============================================================================
 * other 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/academic
 */


/**
 * ============================================================================
 * 共享网络工具及其他学术工具
 * ============================================================================
 *
 * 提供代理请求、速率限制、响应缓存等共享基础设施,
 * 以及 Papers With Code 和 Semantic Scholar 的搜索功能. 
 *
 * @module src/theme/tools/academic/other
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

// ==================== 速率限制与缓存 ====================

/**
 * 各 API 的速率限制配置(毫秒)
 *
 * 宁可保守一点,避免触发限流. ArXiv 官方要求每 3 秒最多 1 个请求,
 * 其他 API 没有明确说明,但学术 API 通常比较严格. 
 */
const RATE_LIMITS: Record<string, number> = {
  // ArXiv 官方 ToU: 每 3 秒最多 1 个请求
  // https://info.arxiv.org/help/api/tou.html
  'export.arxiv.org': 3500,
  'arxiv.org': 3500,
  // Semantic Scholar: 官方建议每秒不超过 1 次,保守设置 2 秒
  'api.semanticscholar.org': 2000,
  // Papers With Code: 没有官方说明,保守设置 2 秒
  'paperswithcode.com': 2000,
  // HuggingFace: 相对宽松,但也不要太频繁
  'huggingface.co': 1500,
  // 通用兜底
  'default': 2000,
}

/** 记录每个域名上次请求的时间戳 */
const lastFetchTime: Record<string, number> = {}

/**
 * 根据速率限制计算并执行延迟等待
 *
 * @param url - 请求 URL
 */
async function rateLimitDelay(url: string) {
  try {
    const host = new URL(url).hostname
    const limit = RATE_LIMITS[host] || RATE_LIMITS['default']
    const now = Date.now()
    const last = lastFetchTime[host] || 0
    const wait = Math.max(0, limit - (now - last))
    if (wait > 0) {
      console.log(`[RateLimit] ${host} 等待 ${wait}ms`)
      await new Promise(r => setTimeout(r, wait))
    }
    lastFetchTime[host] = Date.now()
  } catch {
    // ignore invalid url
  }
}

/** 缓存条目结构 */
interface CacheEntry {
  /** 缓存的响应文本 */
  text: string
  /** 缓存时间戳 */
  ts: number
}

/** 响应缓存 Map,按 URL + headers 组合键存储 */
const responseCache = new Map<string, CacheEntry>()

/** 缓存有效期：5 分钟 */
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * 生成缓存键
 *
 * @param url - 请求 URL
 * @param headers - 请求头
 * @returns 组合缓存键
 */
function getCacheKey(url: string, headers?: Record<string, string>) {
  return `${url}::${JSON.stringify(headers || {})}`
}

/**
 * 获取缓存的响应
 *
 * @param url - 请求 URL
 * @param headers - 请求头
 * @returns 模拟的 Response 对象,或 null(缓存未命中或已过期)
 */
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

/**
 * 将响应存入缓存
 *
 * @param url - 请求 URL
 * @param text - 响应文本
 * @param headers - 请求头
 */
function setCachedResponse(url: string, text: string, headers?: Record<string, string>) {
  const key = getCacheKey(url, headers)
  responseCache.set(key, { text, ts: Date.now() })
}

/**
 * 通过后端代理转发请求
 *
 * 浏览器环境存在 CORS 限制,无法直接访问外部学术 API. 
 * 因此通过 `/api/proxy/fetch` 后端代理转发,同时在前端实现：
 * - 速率限制(按域名控制请求间隔)
 * - 429 自动重试(指数退避 + 随机抖动)
 * - 响应缓存(仅对 ArXiv 启用,减少重复请求)
 *
 * @param url - 目标 URL
 * @param headers - 自定义请求头
 * @param timeout - 超时时间(毫秒,默认 15000)
 * @returns 模拟的 Response 对象
 * @throws 超过最大重试次数时抛出错误
 */
export async function proxyFetch(
  url: string,
  headers?: Record<string, string>,
  timeout = 15000
): Promise<Response> {
  const isArxiv = url.includes('export.arxiv.org') || url.includes('arxiv.org')

  // ArXiv 域名优先走缓存(ArXiv 内容基本不会变化,缓存收益高)
  if (isArxiv) {
    const cached = getCachedResponse(url, headers)
    if (cached) return cached
  }

  // 限流 + 429 重试
  const maxRetries = 3
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await rateLimitDelay(url)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    try {
      const res = await fetch('/api/proxy/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, timeout, headers, retries: 0 }), // 代理层不重试,前端自己控制
        signal: controller.signal,
      })

      clearTimeout(timer)

      // 如果是 429,等待后重试(指数退避 + 随机抖动防止惊群)
      if (res.status === 429) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 8000)
        console.warn(`[proxyFetch] 429 on ${new URL(url).hostname}, retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      if (!res.ok) {
        const text = await res.text().catch(() => 'Proxy error')
        throw new Error(`Proxy HTTP ${res.status}: ${text}`)
      }

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
    } catch (error: any) {
      clearTimeout(timer)
      lastError = error

      // 如果是 429 相关的错误消息,也重试
      if (error.message?.includes('429') && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 8000)
        console.warn(`[proxyFetch] 429 detected on ${new URL(url).hostname}, retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }

      throw error
    }
  }

  throw lastError || new Error(`Max retries exceeded for ${url}`)
}

// ==================== Papers With Code ====================

/**
 * 搜索 Papers With Code 的工具定义
 */
export const searchPapersWithCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchPaperswithcode',
    description: '搜索 Papers With Code 数据库,查找带有开源代码实现的学术论文. \n\n使用场景：当用户需要找「可复现」的论文时使用,即论文作者已经公开了代码仓库. 非常适合需要快速上手实验、跑 baseline 或复现结果的场景. 例如用户问「找一下图像分类领域有代码的经典论文」「YOLO 系列的论文和代码」「最近有没有带代码的多模态学习论文」. \n\n示例用法：searchPaperswithcode(query="image classification", limit=10)\n\n注意事项：\n- 返回结果同时包含论文标题、作者和摘要,以及对应的代码仓库链接\n- 并非所有论文都有代码,但 Papers With Code 的数据库只收录有代码实现的论文\n- 搜索词用英文效果更佳\n- 结果中可能包含预印本和已发表论文',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词. 建议使用英文术语. 示例："image classification"、"object detection"、"transformer"、"reinforcement learning"' },
        limit: { type: 'number', description: '返回结果的最大数量,范围 1~50. 默认值：10. ', default: 10 }
      },
      required: ['query']
    }
  }
}

/**
 * 搜索 Papers With Code 论文
 *
 * Papers With Code 只收录带有开源代码实现的论文,
 * 适合需要快速复现实验结果的场景. 
 *
 * @param args - 工具参数
 * @param args.query - 搜索关键词
 * @param args.limit - 返回数量上限(默认 10)
 * @returns 搜索结果或错误信息
 */
export const searchPapersWithCode: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, limit = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: searchPaperswithcode(query="image classification")'
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
        'searchPaperswithcode',
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
      'searchPaperswithcode'
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

/**
 * 搜索 Semantic Scholar 的工具定义
 */
export const searchSemanticScholarDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchSemanticScholar',
    description: '搜索 Semantic Scholar 学术数据库,获取论文的引用数、发表年份等元数据. \n\n使用场景：当用户需要评估论文影响力、查找高被引文献、或按引用量筛选论文时使用. 例如用户问「深度学习领域被引用最多的论文有哪些」「找一下近五年引用量高的 Transformer 相关论文」「这篇论文的引用量是多少」. 也适合快速了解一个领域的核心文献. \n\n示例用法：searchSemanticScholar(query="deep learning", limit=10)\n\n注意事项：\n- 返回结果包含每篇论文的标题、作者、发表年份、摘要和引用次数\n- 引用数由 Semantic Scholar 计算,与 Google Scholar 数字可能不同\n- 搜索词用英文效果更佳\n- 该 API 有速率限制,连续调用可能触发限流,建议控制调用频率',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词. 建议使用英文术语. 示例："deep learning"、"natural language processing"、"computer vision"、"attention mechanism"' },
        limit: { type: 'number', description: '返回结果的最大数量,范围 1~100. 默认值：10. ', default: 10 }
      },
      required: ['query']
    }
  }
}

/**
 * 搜索 Semantic Scholar 论文
 *
 * Semantic Scholar 提供论文的引用数等影响力指标,
 * 适合评估论文影响力或查找领域核心文献. 
 *
 * @param args - 工具参数
 * @param args.query - 搜索关键词
 * @param args.limit - 返回数量上限(默认 10)
 * @returns 搜索结果或错误信息
 */
export const searchSemanticScholar: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, limit = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: searchSemanticScholar(query="deep learning")'
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
        'searchSemanticScholar',
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
      'searchSemanticScholar'
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
