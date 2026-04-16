/**
 * 学术研究工具执行器
 * 所有 API 均为免费公开接口，无需认证
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

// 通过后端代理转发请求，避免浏览器 CORS 限制
async function proxyFetch(url: string, headers?: Record<string, string>, timeout = 15000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch('/api/proxy/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeout, headers }),
      signal: controller.signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => 'Proxy error')
      throw new Error(`Proxy HTTP ${res.status}: ${text}`)
    }
    // 构造一个 Response-like 对象，兼容原有代码
    const contentType = res.headers.get('content-type') || ''
    const text = await res.text()
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

// ==================== ArXiv ====================

export interface ArxivPaper {
  id: string
  title: string
  authors: string[]
  summary: string
  published: string
  pdfUrl: string
  absUrl: string
  primaryCategory: string
}

function cleanXmlText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s+/g, '\n')
    .trim()
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    })
  } catch { return dateStr }
}

function parseArxivXml(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = []
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1]
    const idMatch = entry.match(/<id>(.*?)<\/id>/)
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/)
    const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/)
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/)
    
    const authors: string[] = []
    const authorRegex = /<author>\s*<name>(.*?)<\/name>\s*<\/author>/g
    let authorMatch
    while ((authorMatch = authorRegex.exec(entry)) !== null) {
      authors.push(authorMatch[1].trim())
    }
    
    const categories: string[] = []
    const catRegex = /<category term="(.*?)"/g
    let catMatch
    while ((catMatch = catRegex.exec(entry)) !== null) {
      categories.push(catMatch[1])
    }
    
    const arxivId = idMatch ? idMatch[1].split('/').pop()?.replace('abs/', '').replace(/v\d+$/, '') || '' : ''
    
    if (arxivId && titleMatch) {
      papers.push({
        id: arxivId,
        title: cleanXmlText(titleMatch[1]),
        authors,
        summary: cleanXmlText(summaryMatch ? summaryMatch[1] : ''),
        published: publishedMatch ? publishedMatch[1] : '',
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        absUrl: `https://arxiv.org/abs/${arxivId}`,
        primaryCategory: categories[0] || ''
      })
    }
  }
  
  return papers
}

export const searchArxiv: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, category = '', max_results = 10, sort_by = 'relevance' } = args
  
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: search_arxiv(query="transformer")'
    )
  }
  
  const limit = Math.min(Math.max(1, max_results), 50)
  
  try {
    let searchQuery = encodeURIComponent(query)
    if (category) searchQuery = `cat:${category}+AND+${searchQuery}`
    
    const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=${limit}&sortBy=${sort_by}&sortOrder=descending`
    
    const response = await proxyFetch(url, { 'Accept': 'application/atom+xml' })
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'ArXiv 搜索失败',
        '请稍后重试或检查网络连接'
      )
    }
    
    const xmlText = await response.text()
    const papers = parseArxivXml(xmlText)
    
    if (papers.length === 0) {
      return createSuccessResult(
        [],
        `未找到与 "${query}" 相关的论文`,
        'search_arxiv',
        '尝试使用不同的关键词或放宽搜索条件'
      )
    }
    
    // 格式化输出
    let formattedResult = `📚 ArXiv 搜索结果: "${query}" (${papers.length}篇)\n\n`
    papers.forEach((p, i) => {
      formattedResult += `${i + 1}. **${p.title}**\n`
      formattedResult += `   👤 ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' 等' : ''}\n`
      formattedResult += `   📅 ${formatDate(p.published)} · 🏷️ ${p.primaryCategory || 'N/A'}\n`
      formattedResult += `   📝 ${p.summary.slice(0, 150)}...\n`
      formattedResult += `   🔗 fetch_arxiv(paper_id="${p.id}")\n\n`
    })
    
    return createSuccessResult(
      papers,
      `找到 ${papers.length} 篇相关论文`,
      'search_arxiv',
      '使用 fetch_arxiv(paper_id="xxx") 获取论文详情'
    )
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return createErrorResult(
        'Request timeout',
        '请求超时',
        'ArXiv 服务响应较慢，请稍后重试'
      )
    }
    return createErrorResult(
      error.message,
      '搜索失败',
      '请检查网络连接或稍后重试'
    )
  }
}

export const fetchArxiv: ToolExecutor = async (args): Promise<ToolResult> => {
  const { paper_id } = args
  
  if (!paper_id) {
    return createErrorResult(
      'Missing paper_id parameter',
      '请提供论文 ID',
      '示例: fetch_arxiv(paper_id="2401.12345")'
    )
  }
  
  const cleanId = paper_id.toString().trim().toLowerCase().replace(/v\d+$/, '')
  
  try {
    const url = `https://export.arxiv.org/api/query?search_query=id:${cleanId}&start=0&max_results=1`
    
    const response = await proxyFetch(url, { 'Accept': 'application/atom+xml' })
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取论文详情失败',
        '请稍后重试'
      )
    }
    
    const xmlText = await response.text()
    const papers = parseArxivXml(xmlText)
    
    if (papers.length === 0) {
      return createErrorResult(
        'Paper not found',
        `未找到论文: ${paper_id}`,
        '请检查论文 ID 是否正确'
      )
    }
    
    const p = papers[0]
    const formattedResult = `📄 **${p.title}**

👤 **作者**: ${p.authors.join(', ')}
📅 **发布**: ${formatDate(p.published)}
🏷️ **分类**: ${p.primaryCategory || 'N/A'}
🔗 **链接**: ${p.absUrl}
📥 **PDF**: ${p.pdfUrl}

📝 **摘要**:
${p.summary}`
    
    return createSuccessResult(
      p,
      `成功获取论文: ${p.title}`,
      'fetch_arxiv'
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

// ==================== HuggingFace ====================

export const searchHuggingFace: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, task = '', limit = 10 } = args
  
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: search_huggingface(query="bert")'
    )
  }
  
  try {
    let url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`
    if (task) url += `&filter=${task}`
    
    const response = await proxyFetch(url)
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'HuggingFace 搜索失败',
        '请稍后重试'
      )
    }
    
    const models = await response.json()
    
    if (!models?.length) {
      return createSuccessResult(
        [],
        `未找到与 "${query}" 相关的模型`,
        'search_huggingface',
        '尝试使用不同的关键词'
      )
    }
    
    const formattedModels = models.slice(0, limit).map((m: any) => ({
      id: m.id,
      downloads: m.downloads,
      likes: m.likes || 0,
      pipeline_tag: m.pipeline_tag,
      url: `https://huggingface.co/${m.id}`
    }))
    
    return createSuccessResult(
      formattedModels,
      `找到 ${models.length} 个相关模型`,
      'search_huggingface',
      '使用 fetch_huggingface_model(model_id="xxx") 获取模型详情'
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

export const fetchHuggingFaceModel: ToolExecutor = async (args): Promise<ToolResult> => {
  const { model_id } = args
  
  if (!model_id) {
    return createErrorResult(
      'Missing model_id parameter',
      '请提供模型 ID',
      '示例: fetch_huggingface_model(model_id="bert-base-chinese")'
    )
  }
  
  try {
    const url = `https://huggingface.co/api/models/${model_id}`
    
    const response = await proxyFetch(url)
    
    if (response.status === 404) {
      return createErrorResult(
        'Model not found',
        `未找到模型: ${model_id}`,
        '请检查模型 ID 是否正确'
      )
    }
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取模型详情失败',
        '请稍后重试'
      )
    }
    
    const m = await response.json()
    
    const modelData = {
      id: m.id,
      author: m.author || 'Unknown',
      downloads: m.downloads,
      likes: m.likes || 0,
      pipeline_tag: m.pipeline_tag,
      url: `https://huggingface.co/${m.id}`,
      description: m.cardData?.description || ''
    }
    
    return createSuccessResult(
      modelData,
      `成功获取模型: ${m.id}`,
      'fetch_huggingface_model'
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
      '获取模型详情失败',
      '请检查网络连接'
    )
  }
}

// ==================== Papers With Code ====================

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

// ==================== OpenReview ====================

export const searchOpenReview: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, venue = '', limit = 10 } = args
  
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: search_openreview(query="reinforcement learning")'
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
        'search_openreview',
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
      'search_openreview',
      '使用 fetch_openreview(forum_id="xxx") 获取详情'
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
      '示例: fetch_openreview(forum_id="xxxxxxxx")'
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
      'fetch_openreview'
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
