/**
 * WebSearch Tool - 网络搜索工具 (修复版)
 * 
 * 修复:
 * - 使用 fast-xml-parser 替代正则解析 XML
 * - 添加完善的错误处理
 * - 添加请求重试机制
 */

import { getStructuredLogger } from '../runtime/StructuredLogger'
import { XMLParser } from 'fast-xml-parser'

export interface SearchOptions {
  sources?: ('google' | 'arxiv' | 'github' | 'wiki')[]
  maxResults?: number
  timeRange?: 'day' | 'week' | 'month' | 'year'
  recencyBias?: number
}

export interface SearchResult {
  title: string
  link: string
  snippet: string
  source: 'google' | 'arxiv' | 'github' | 'wiki' | 'other'
  credibility: number
  publishedDate?: string
  isAIGenerated?: boolean  // 标识为 LLM 模拟结果
}

export interface Paper {
  id: string
  title: string
  authors: string[]
  summary: string
  published: string
  link: string
  pdfLink?: string
}

interface ArxivEntry {
  id: string
  title: string
  summary: string
  published: string
  author?: Array<{ name: string }> | { name: string }
  link?: Array<{ $: { href: string; rel?: string; title?: string } }> | { $: { href: string; rel?: string; title?: string } }
}

export class WebSearchTool {
  private serpApiKey: string | null = null
  private useSimulation: boolean = false
  private logger = getStructuredLogger()
  private xmlParser: XMLParser

  constructor(config?: { serpApiKey?: string; useSimulation?: boolean }) {
    this.serpApiKey = config?.serpApiKey || null
    this.useSimulation = config?.useSimulation ?? !this.serpApiKey
    
    // 初始化 XML 解析器
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '$',
      textNodeName: '_',
      parseAttributeValue: false,
      trimValues: true
    })
  }

  // ============================================
  // 通用搜索
  // ============================================

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { sources = ['google'], maxResults = 5 } = options
    
    this.logger.info('websearch.start', `Starting web search for query: ${query}`, { 
      query, 
      sources, 
      maxResults,
      mode: this.useSimulation ? 'simulation' : 'api'
    })
    
    if (this.useSimulation) {
      return this.simulateSearch(query, maxResults)
    }

    const results: SearchResult[] = []
    const errors: Array<{ source: string; error: string }> = []

    for (const source of sources) {
      try {
        let sourceResults: SearchResult[] = []
        
        switch (source) {
          case 'google':
            if (this.serpApiKey) {
              sourceResults = await this.searchViaSerpAPI(query, maxResults)
            }
            break
          case 'arxiv':
            sourceResults = await this.searchArxiv(query, maxResults)
            break
          case 'github':
            sourceResults = await this.searchGitHub(query, maxResults)
            break
        }
        
        results.push(...sourceResults)
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.logger.warn('websearch.source-failed', `${source} search failed`, { 
          source, 
          error: errorMsg 
        })
        errors.push({ source, error: errorMsg })
      }
    }

    // 如果所有来源都失败，降级到模拟搜索
    if (results.length === 0 && errors.length > 0) {
      this.logger.warn('websearch.all-sources-failed', 'All search sources failed, falling back to simulation')
      return this.simulateSearch(query, maxResults)
    }

    // 去重并排序
    const unique = this.deduplicate(results)
    return unique
      .sort((a, b) => b.credibility - a.credibility)
      .slice(0, maxResults)
  }

  // ============================================
  // 特定站点搜索
  // ============================================

  async searchArxiv(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query)
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`
    
    this.logger.debug('websearch.arxiv', `Fetching from Arxiv: ${url}`)
    
    try {
      const response = await this.fetchWithRetry(url, { timeout: 15000, retries: 2 })
      const xml = await response.text()
      
      // 使用 fast-xml-parser 解析
      const papers = this.parseArxivXML(xml)
      
      this.logger.info('websearch.arxiv-success', `Found ${papers.length} papers from Arxiv`)
      
      return papers.map(p => ({
        title: p.title,
        link: p.link,
        snippet: p.summary.slice(0, 300) + (p.summary.length > 300 ? '...' : ''),
        source: 'arxiv',
        credibility: 0.95,
        publishedDate: p.published
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('websearch.arxiv-failed', `Arxiv search failed: ${errorMsg}`)
      throw error
    }
  }

  async searchGitHub(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.github.com/search/repositories?q=${encodedQuery}&sort=stars&order=desc&per_page=${maxResults}`
    
    this.logger.debug('websearch.github', `Fetching from GitHub: ${url}`)
    
    try {
      const response = await this.fetchWithRetry(url, { 
        timeout: 10000, 
        retries: 2,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MetaUniverse-Agent'
        }
      })
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('GitHub API rate limit exceeded')
        }
        throw new Error(`GitHub API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      this.logger.info('websearch.github-success', `Found ${data.items?.length || 0} repositories from GitHub`)
      
      return (data.items || []).map((item: any) => ({
        title: item.full_name,
        link: item.html_url,
        snippet: item.description || '',
        source: 'github',
        credibility: this.calculateGitHubCredibility(item),
        publishedDate: item.created_at
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('websearch.github-failed', `GitHub search failed: ${errorMsg}`)
      throw error
    }
  }

  // ============================================
  // 网页抓取
  // ============================================

  async fetchContent(url: string, options?: { 
    timeout?: number
    retries?: number 
  }): Promise<string> {
    const { timeout = 10000, retries = 2 } = options || {}
    
    this.logger.debug('websearch.fetch', `Fetching content from ${url}`, { url, timeout, retries })
    
    try {
      // 通过 BFF 代理抓取（避免 CORS）
      const response = await this.fetchWithRetry('/api/proxy/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout,
        retries
      })
      
      if (!response.ok) {
        const status = response.status
        let errorMsg = `HTTP ${status}`
        
        switch (status) {
          case 403:
            errorMsg = '访问被拒绝（403）- 该网站禁止爬虫访问'
            break
          case 404:
            errorMsg = '页面不存在（404）'
            break
          case 429:
            errorMsg = '请求过于频繁（429）- 请稍后再试'
            break
          case 500:
          case 502:
          case 503:
            errorMsg = '服务器错误 - 目标网站暂时不可用'
            break
        }
        
        throw new Error(errorMsg)
      }
      
      const content = await response.text()
      this.logger.debug('websearch.fetch-success', `Successfully fetched ${content.length} bytes from ${url}`)
      
      return content
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('websearch.fetch-error', `Failed to fetch content from ${url}`, { error: errorMsg })
      throw error
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private async fetchWithRetry(
    url: string, 
    options: RequestInit & { timeout?: number; retries?: number } = {}
  ): Promise<Response> {
    const { timeout = 10000, retries = 2, ...fetchOptions } = options
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // 指数退避，最大5秒
        this.logger.debug('websearch.retry', `Retry attempt ${attempt}/${retries} after ${delay}ms`, { url, attempt })
        await new Promise(r => setTimeout(r, delay))
      }
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        // 某些状态码不需要重试
        if (!response.ok) {
          if (response.status === 403 || response.status === 404) {
            // 权限错误或不存在，直接抛出不重试
            return response
          }
        }
        
        return response
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // 如果是超时错误，继续重试
        if (lastError.name === 'AbortError') {
          this.logger.warn('websearch.timeout', `Request timeout (attempt ${attempt + 1}/${retries + 1})`, { url })
          continue
        }
        
        // 其他错误也继续重试
        continue
      }
    }
    
    throw lastError || new Error('All retry attempts failed')
  }

  private async searchViaSerpAPI(query: string, maxResults: number): Promise<SearchResult[]> {
    if (!this.serpApiKey) {
      throw new Error('SerpAPI key not configured')
    }

    const params = new URLSearchParams({
      api_key: this.serpApiKey,
      q: query,
      engine: 'google',
      num: maxResults.toString()
    })

    this.logger.debug('websearch.serpapi', `Searching via SerpAPI: ${query}`)

    try {
      const response = await this.fetchWithRetry(
        `https://serpapi.com/search?${params}`,
        { timeout: 15000, retries: 2 }
      )
      
      if (!response.ok) {
        throw new Error(`SerpAPI error: ${response.status}`)
      }

      const data = await response.json()
      
      this.logger.info('websearch.serpapi-success', `Found ${data.organic_results?.length || 0} results from SerpAPI`)
      
      return (data.organic_results || []).map((r: any) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
        source: 'google',
        credibility: this.calculateGoogleCredibility(r),
        publishedDate: r.date
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('websearch.serpapi-failed', `SerpAPI search failed: ${errorMsg}`)
      throw error
    }
  }

  private async simulateSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    this.logger.info('websearch.simulation', `Using LLM simulation for query: ${query}`)
    
    const { getLLMManager } = await import('../llm')
    
    try {
      const llm = getLLMManager()
      // P1 修复：不再要求生成伪造链接，而是返回知识摘要
      const prompt = `基于你的知识，提供关于"${query}"的信息摘要。
请返回 JSON 数组格式，每个结果包含 title, snippet, credibility (0-1)。
注意：不要生成虚假的链接(link字段)，系统将自动处理。
最多返回 ${maxResults} 条结果。

示例格式:
[
  {
    "title": "相关知识点标题",
    "snippet": "详细的知识摘要内容...",
    "credibility": 0.7
  }
]`

      const response = await llm.chat({
        messages: [{ role: 'user', content: prompt }]
      })

      // 尝试解析 JSON
      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0])
        // P1 修复：添加标记，不生成幻觉 URL
        const processedResults = results.map((r: any) => ({
          title: r.title || `关于「${query}」的知识摘要`,
          link: '',  // 空链接，避免幻觉 URL
          snippet: r.snippet || r.description || '',
          source: 'other',
          credibility: (r.credibility || 0.5) * 0.7,  // 降低置信度（AI生成）
          isAIGenerated: true,  // 明确标注来源
          publishedDate: new Date().toISOString()
        }))
        this.logger.info('websearch.simulation-success', `Generated ${processedResults.length} simulated results`)
        return processedResults
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      this.logger.error('websearch.simulation-failed', `Simulation failed: ${errorMsg}`)
    }

    // P1 修复：即使失败也返回一个带标记的兜底结果，而不是空数组
    return [{
      title: `关于「${query}」的AI知识摘要`,
      link: '',
      snippet: '由于网络搜索不可用，此内容基于AI内部知识生成。建议验证关键信息。',
      source: 'other',
      credibility: 0.5,
      isAIGenerated: true,
      publishedDate: new Date().toISOString()
    }]
  }

  private parseArxivXML(xml: string): Paper[] {
    try {
      const parsed = this.xmlParser.parse(xml)
      
      if (!parsed.feed || !parsed.feed.entry) {
        this.logger.warn('websearch.arxiv-parse', 'No entries found in Arxiv response')
        return []
      }
      
      const entries: ArxivEntry[] = Array.isArray(parsed.feed.entry) 
        ? parsed.feed.entry 
        : [parsed.feed.entry]
      
      return entries.map((entry: ArxivEntry) => {
        // 处理作者 (可能是数组或对象)
        let authors: string[] = []
        if (entry.author) {
          if (Array.isArray(entry.author)) {
            authors = entry.author.map(a => a.name)
          } else {
            authors = [entry.author.name]
          }
        }
        
        // 处理链接 (可能是数组或对象)
        let link = entry.id || ''
        let pdfLink: string | undefined
        
        if (entry.link) {
          if (Array.isArray(entry.link)) {
            const mainLink = entry.link.find(l => !l.$.rel || l.$.rel === 'alternate')
            const pdfLinkObj = entry.link.find(l => l.$.title === 'pdf')
            
            if (mainLink) link = mainLink.$.href
            if (pdfLinkObj) pdfLink = pdfLinkObj.$.href
          } else {
            link = entry.link.$.href
          }
        }
        
        return {
          id: entry.id?.split('/').pop() || entry.id || '',
          title: this.cleanText(entry.title || ''),
          authors,
          summary: this.cleanText(entry.summary || ''),
          published: entry.published || '',
          link,
          pdfLink
        }
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('websearch.arxiv-parse-error', `Failed to parse Arxiv XML: ${errorMsg}`)
      throw new Error(`XML parse error: ${errorMsg}`)
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
  }

  private calculateGoogleCredibility(result: any): number {
    let score = 0.7
    
    try {
      // 域名可信度
      const domain = new URL(result.link).hostname
      const trustedDomains = [
        'edu',
        'gov', 
        'arxiv.org', 
        'github.com', 
        'medium.com',
        'stackoverflow.com',
        'wikipedia.org',
        'developer.mozilla.org',
        'docs.microsoft.com'
      ]
      
      if (trustedDomains.some(d => domain.includes(d))) {
        score += 0.2
      }
      
      // 检查是否是知名技术站点
      const techSites = ['dev.to', 'hashnode.dev', 'towardsdatascience.com']
      if (techSites.some(s => domain.includes(s))) {
        score += 0.1
      }

      // 日期新鲜度
      if (result.date) {
        const date = new Date(result.date)
        const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
        if (daysAgo < 30) score += 0.1
        else if (daysAgo > 365) score -= 0.1
      }
    } catch {
      // URL 解析失败，保持默认分数
    }

    return Math.max(0, Math.min(score, 1))
  }

  private calculateGitHubCredibility(item: any): number {
    let score = 0.7
    
    // Star 数量
    if (item.stargazers_count > 10000) score += 0.2
    else if (item.stargazers_count > 1000) score += 0.1
    else if (item.stargazers_count < 10) score -= 0.1
    
    // 是否有文档
    if (item.has_wiki || item.has_pages) score += 0.05
    
    // 最近更新
    if (item.updated_at) {
      const lastUpdate = new Date(item.updated_at)
      const daysAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysAgo < 30) score += 0.05
      else if (daysAgo > 180) score -= 0.05
    }
    
    // 是否有 License
    if (item.license) score += 0.05

    return Math.max(0, Math.min(score, 1))
  }

  private deduplicate(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>()
    
    for (const result of results) {
      const normalizedUrl = result.link.replace(/^https?:\/\//, '').replace(/\/$/, '')
      
      if (!seen.has(normalizedUrl)) {
        seen.set(normalizedUrl, result)
      } else {
        // 如果已存在，保留可信度更高的
        const existing = seen.get(normalizedUrl)!
        if (result.credibility > existing.credibility) {
          seen.set(normalizedUrl, result)
        }
      }
    }
    
    return Array.from(seen.values())
  }
}

// 导出单例
let webSearchInstance: WebSearchTool | null = null

export function getWebSearchTool(): WebSearchTool {
  if (!webSearchInstance) {
    webSearchInstance = new WebSearchTool({
      serpApiKey: process.env.VITE_SERP_API_KEY,
      useSimulation: !process.env.VITE_SERP_API_KEY
    })
  }
  return webSearchInstance
}

export function createWebSearchTool(config?: { serpApiKey?: string; useSimulation?: boolean }): WebSearchTool {
  webSearchInstance = new WebSearchTool(config)
  return webSearchInstance
}
