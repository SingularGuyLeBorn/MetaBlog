/**
 * WebSearch Tool - 网络搜索工具
 * 支持多源搜索：SerpAPI、Arxiv、模拟搜索
 */
import { getStructuredLogger } from '../runtime/StructuredLogger'

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

export class WebSearchTool {
  private serpApiKey: string | null = null
  private useSimulation: boolean = false
  private logger = getStructuredLogger()

  constructor(config?: { serpApiKey?: string; useSimulation?: boolean }) {
    this.serpApiKey = config?.serpApiKey || null
    this.useSimulation = config?.useSimulation ?? !this.serpApiKey
  }

  // ============================================
  // 通用搜索
  // ============================================

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const { sources = ['google'], maxResults = 5 } = options
    
    this.logger.info('websearch.start', `Starting web search for query: ${query}`, { query, sources, maxResults })
    
    if (this.useSimulation) {
      return this.simulateSearch(query, maxResults)
    }

    const results: SearchResult[] = []

    for (const source of sources) {
      try {
        switch (source) {
          case 'google':
            if (this.serpApiKey) {
              results.push(...await this.searchViaSerpAPI(query, maxResults))
            }
            break
          case 'arxiv':
            results.push(...await this.searchArxiv(query, maxResults))
            break
          case 'github':
            results.push(...await this.searchGitHub(query, maxResults))
            break
        }
      } catch (e) {
        this.logger.warn('websearch.error', `${source} search failed: ${String(e)}`, { source, error: String(e) })
      }
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
    
    const response = await fetch(url)
    const xml = await response.text()
    
    // 简单解析 XML（实际应使用 XML 解析器）
    const papers = this.parseArxivXML(xml)
    
    return papers.map(p => ({
      title: p.title,
      link: p.link,
      snippet: p.summary.slice(0, 300) + '...',
      source: 'arxiv',
      credibility: 0.95,
      publishedDate: p.published
    }))
  }

  async searchGitHub(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.github.com/search/repositories?q=${encodedQuery}&sort=stars&order=desc&per_page=${maxResults}`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error('GitHub API failed')
    
    const data = await response.json()
    
    return data.items.map((item: any) => ({
      title: item.full_name,
      link: item.html_url,
      snippet: item.description || '',
      source: 'github',
      credibility: this.calculateGitHubCredibility(item),
      publishedDate: item.created_at
    }))
  }

  // ============================================
  // 网页抓取
  // ============================================

  async fetchContent(url: string): Promise<string> {
    // 通过 BFF 代理抓取（避免 CORS）
    this.logger.debug('websearch.fetch', `Fetching content from ${url}`)
    const response = await fetch('/api/proxy/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
    
    if (!response.ok) {
      this.logger.error('websearch.fetch.error', `Failed to fetch content from ${url}`)
      throw new Error('Failed to fetch content')
    }
    return response.text()
  }

  // ============================================
  // 私有方法
  // ============================================

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

    const response = await fetch(`https://serpapi.com/search?${params}`)
    if (!response.ok) throw new Error('SerpAPI request failed')

    const data = await response.json()
    
    return (data.organic_results || []).map((r: any) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      source: 'google',
      credibility: this.calculateGoogleCredibility(r),
      publishedDate: r.date
    }))
  }

  private async simulateSearch(query: string, maxResults: number): Promise<SearchResult[]> {
    // 使用 LLM 模拟搜索结果
    const { getLLMManager } = await import('../llm')
    
    try {
      const llm = getLLMManager()
      const prompt = `作为搜索助手，基于你的知识提供关于"${query}"的搜索结果。
请返回 JSON 数组格式，每个结果包含 title, link, snippet, source, credibility (0-1)。
最多返回 ${maxResults} 条结果。`

      const response = await llm.chat({
        messages: [{ role: 'user', content: prompt }]
      })

      // 尝试解析 JSON
      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      this.logger.warn('websearch.simulation.error', `Simulation failed: ${String(e)}`, { error: String(e) })
    }

    // 返回空结果
    return []
  }

  private parseArxivXML(xml: string): Paper[] {
    const papers: Paper[] = []
    const entryRegex = /<entry>[\s\S]*?<\/entry>/g
    let match

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[0]
      
      const id = this.extractXMLValue(entry, 'id') || ''
      const title = this.extractXMLValue(entry, 'title') || ''
      const summary = this.extractXMLValue(entry, 'summary') || ''
      const published = this.extractXMLValue(entry, 'published') || ''
      
      // 提取作者
      const authors: string[] = []
      const authorRegex = /<name>([^<]+)<\/name>/g
      let authorMatch
      while ((authorMatch = authorRegex.exec(entry)) !== null) {
        authors.push(authorMatch[1])
      }

      papers.push({
        id: id.split('/').pop() || id,
        title: title.replace(/\s+/g, ' ').trim(),
        authors,
        summary: summary.replace(/\s+/g, ' ').trim(),
        published,
        link: id
      })
    }

    return papers
  }

  private extractXMLValue(xml: string, tag: string): string | null {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1].trim() : null
  }

  private calculateGoogleCredibility(result: any): number {
    let score = 0.7
    
    // 域名可信度
    const domain = new URL(result.link).hostname
    const trustedDomains = ['edu', 'gov', 'arxiv.org', 'github.com', 'medium.com']
    if (trustedDomains.some(d => domain.includes(d))) {
      score += 0.2
    }

    // 日期新鲜度
    if (result.date) {
      const date = new Date(result.date)
      const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
      if (daysAgo < 30) score += 0.1
    }

    return Math.min(score, 1)
  }

  private calculateGitHubCredibility(item: any): number {
    let score = 0.7
    
    // Star 数量
    if (item.stargazers_count > 10000) score += 0.2
    else if (item.stargazers_count > 1000) score += 0.1
    
    // 是否有文档
    if (item.has_wiki || item.has_pages) score += 0.05
    
    // 最近更新
    const lastUpdate = new Date(item.updated_at)
    const daysAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysAgo < 30) score += 0.05

    return Math.min(score, 1)
  }

  private deduplicate(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>()
    return results.filter(r => {
      const key = r.link
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}

// 导出单例
let webSearchInstance: WebSearchTool | null = null

export function getWebSearchTool(): WebSearchTool {
  if (!webSearchInstance) {
    webSearchInstance = new WebSearchTool({
      serpApiKey: import.meta.env.VITE_SERP_API_KEY,
      useSimulation: !import.meta.env.VITE_SERP_API_KEY
    })
  }
  return webSearchInstance
}
