/**
 * 学术研究工具执行器
 * 包含：ArXiv、OpenReview、HuggingFace、PapersWithCode、Semantic Scholar
 * 所有工具均使用免费公开 API，无需认证
 */

import type { ToolExecutor } from '../types'

// ==================== ArXiv 工具 ====================

export interface ArxivPaper {
  id: string
  title: string
  authors: string[]
  summary: string
  published: string
  updated: string
  categories: string[]
  pdfUrl: string
  absUrl: string
  primaryCategory: string
}

/**
 * 搜索 ArXiv 论文
 */
export const searchArxiv: ToolExecutor = async (args) => {
  const { query, category = '', max_results = 10, sort_by = 'relevance' } = args
  
  if (!query) {
    return `❌ 错误：query 是必填参数

示例：search_arxiv(query="transformer attention mechanism", max_results=5)`
  }
  
  const limit = Math.min(Math.max(1, max_results), 50)
  
  try {
    // 构建搜索查询
    let searchQuery = `all:${encodeURIComponent(query)}`
    if (category) {
      searchQuery = `cat:${category}+AND+${searchQuery}`
    }
    
    // 使用 HTTPS
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=${limit}&sortBy=${sort_by}&sortOrder=descending`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    
    const response = await fetch(arxivUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/atom+xml',
        'User-Agent': 'AI-Chat-Client/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`ArXiv API 错误: ${response.status}`)
    }
    
    const xmlText = await response.text()
    const papers = parseArxivXml(xmlText)
    
    if (papers.length === 0) {
      return `🔍 未找到与 "${query}" 相关的论文

建议：
- 尝试使用更通用的关键词
- 检查拼写是否正确
- 尝试不同的分类`}
    }
    
    let result = `📚 ArXiv 搜索结果: "${query}"\n`
    result += `找到 ${papers.length} 篇论文\n\n`
    
    papers.forEach((paper, i) => {
      result += `${i + 1}. **${paper.title}**\n`
      result += `   👤 ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' 等' : ''}\n`
      result += `   📅 ${formatDate(paper.published)} · 🏷️ ${paper.primaryCategory}\n`
      
      const summary = paper.summary.replace(/\s+/g, ' ').slice(0, 200)
      result += `   📝 ${summary}${paper.summary.length > 200 ? '...' : ''}\n`
      result += `   🔗 查看详情: fetch_arxiv(paper_id="${paper.id}")\n\n`
    })
    
    result += `💡 提示:\n`
    result += `- 使用 fetch_arxiv(paper_id="xxx") 获取完整信息\n`
    result += `- 常用分类: cs.AI (AI), cs.CL (NLP), cs.CV (CV), cs.LG (ML)`
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取 ArXiv 论文详情
 */
export const fetchArxiv: ToolExecutor = async (args) => {
  const { paper_id } = args
  
  if (!paper_id) {
    return `❌ 错误：paper_id 是必填参数

示例：fetch_arxiv(paper_id="2401.12345")`
  }
  
  const cleanId = paper_id.toString().trim().toLowerCase().replace(/v\d+$/, '')
  
  try {
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=id:${cleanId}&start=0&max_results=1`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(arxivUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/atom+xml',
        'User-Agent': 'AI-Chat-Client/1.0'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`ArXiv API 错误: ${response.status}`)
    }
    
    const xmlText = await response.text()
    const papers = parseArxivXml(xmlText)
    
    if (papers.length === 0) {
      return `❌ 未找到论文: ${paper_id}\n\n请检查论文 ID 是否正确。`
    }
    
    const paper = papers[0]
    
    let result = `📄 **${paper.title}**\n\n`
    result += `👤 **作者**: ${paper.authors.join(', ')}\n`
    result += `📅 **发布**: ${formatDate(paper.published)}\n`
    result += `🏷️ **分类**: ${paper.categories.join(', ')}\n`
    result += `🔗 **链接**: ${paper.absUrl}\n`
    result += `📥 **PDF**: ${paper.pdfUrl}\n\n`
    result += `📝 **摘要**:\n${paper.summary}\n\n`
    result += `💡 你可以使用 fetch_url(url="${paper.pdfUrl}") 获取 PDF 内容`
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 获取失败: ${error instanceof Error ? error.message : String(error)}`
  }
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
    
    const arxivId = idMatch ? idMatch[1].split('/').pop()?.replace('abs/', '') || '' : ''
    
    if (arxivId && titleMatch) {
      papers.push({
        id: arxivId,
        title: cleanXmlText(titleMatch[1]),
        authors,
        summary: cleanXmlText(summaryMatch ? summaryMatch[1] : ''),
        published: publishedMatch ? publishedMatch[1] : '',
        updated: '',
        categories,
        pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
        absUrl: `https://arxiv.org/abs/${arxivId}`,
        primaryCategory: categories[0] || ''
      })
    }
  }
  
  return papers
}

// ==================== OpenReview 工具 ====================

export interface OpenReviewPaper {
  id: string
  title: string
  authors: string[]
  abstract: string
  venue: string
  year: number
  pdfUrl?: string
  forumUrl: string
}

/**
 * 搜索 OpenReview 论文
 */
export const searchOpenReview: ToolExecutor = async (args) => {
  const { query, venue = '', limit = 10 } = args
  
  if (!query) {
    return `❌ 错误：query 是必填参数

示例：search_openreview(query="reinforcement learning", venue="ICLR")`
  }
  
  try {
    const searchUrl = `https://api.openreview.net/notes/search?term=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`OpenReview API 错误: ${response.status}`)
    }
    
    const data = await response.json()
    let papers = (data.notes || []).map(parseOpenReviewNote)
    
    if (venue) {
      papers = papers.filter((p: any) => 
        p.venue.toLowerCase().includes(venue.toLowerCase())
      )
    }
    
    if (papers.length === 0) {
      return `🔍 未找到与 "${query}" 相关的 OpenReview 论文`
    }
    
    let result = `📚 OpenReview 搜索结果: "${query}"\n找到 ${papers.length} 篇论文\n\n`
    
    papers.slice(0, limit).forEach((paper: any, i: number) => {
      result += `${i + 1}. **${paper.title}**\n`
      result += `   👤 ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' 等' : ''}\n`
      result += `   🏛️ ${paper.venue} ${paper.year || ''}\n`
      if (paper.abstract) {
        result += `   📝 ${paper.abstract.replace(/\s+/g, ' ').slice(0, 150)}...\n`
      }
      result += `   🔗 ${paper.forumUrl}\n\n`
    })
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取 OpenReview 论文详情
 */
export const fetchOpenReview: ToolExecutor = async (args) => {
  const { forum_id } = args
  
  if (!forum_id) {
    return `❌ 错误：forum_id 是必填参数

示例：fetch_openreview(forum_id="xxxxxxxx")`
  }
  
  try {
    const apiUrl = `https://api.openreview.net/notes?id=${forum_id}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`OpenReview API 错误: ${response.status}`)
    }
    
    const data = await response.json()
    const notes = data.notes || []
    
    if (notes.length === 0) {
      return `❌ 未找到论文: ${forum_id}`
    }
    
    const paper = parseOpenReviewNote(notes[0])
    
    let result = `📄 **${paper.title}**\n\n`
    result += `👤 **作者**: ${paper.authors.join(', ')}\n`
    result += `🏛️ **会议/期刊**: ${paper.venue} ${paper.year || ''}\n`
    result += `🔗 **链接**: ${paper.forumUrl}\n`
    if (paper.pdfUrl) result += `📥 **PDF**: ${paper.pdfUrl}\n`
    result += `\n📝 **摘要**:\n${paper.abstract}\n`
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 获取失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

function parseOpenReviewNote(note: any) {
  const content = note.content || {}
  return {
    id: note.id || '',
    title: content.title?.value || content.title || 'Untitled',
    authors: content.authors?.value || content.authors || [],
    abstract: content.abstract?.value || content.abstract || '',
    venue: content.venue?.value || content.venue || note.invitation?.split('/')[0] || 'Unknown',
    year: content.year?.value || content.year || new Date(note.tcdate || Date.now()).getFullYear(),
    pdfUrl: note.content?.pdf?.value ? `https://openreview.net/pdf?id=${note.id}` : undefined,
    forumUrl: `https://openreview.net/forum?id=${note.forum || note.id}`
  }
}

// ==================== HuggingFace 工具 ====================

export interface HuggingFaceModel {
  id: string
  author: string
  downloads: number
  likes: number
  tags: string[]
  pipeline_tag: string
  description: string
  url: string
}

/**
 * 搜索 HuggingFace 模型
 */
export const searchHuggingFace: ToolExecutor = async (args) => {
  const { query, task = '', sort = 'downloads', limit = 10 } = args
  
  if (!query) {
    return `❌ 错误：query 是必填参数

示例：search_huggingface(query="bert", task="text-classification")`
  }
  
  try {
    let searchUrl = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}&sort=${sort}`
    if (task) searchUrl += `&filter=${task}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HuggingFace API 错误: ${response.status}`)
    }
    
    const models = await response.json()
    
    if (!models || models.length === 0) {
      return `🔍 未找到与 "${query}" 相关的模型`
    }
    
    let result = `🤗 HuggingFace 模型搜索: "${query}"\n找到 ${models.length} 个模型\n\n`
    
    models.slice(0, limit).forEach((model: any, i: number) => {
      result += `${i + 1}. **${model.id}**\n`
      result += `   👤 ${model.author || 'Unknown'}\n`
      result += `   📥 ${formatNumber(model.downloads || 0)} downloads · ❤️ ${model.likes || 0} likes\n`
      if (model.pipeline_tag) result += `   🏷️ Task: ${model.pipeline_tag}\n`
      result += `   🔗 https://huggingface.co/${model.id}\n\n`
    })
    
    result += `💡 使用 fetch_huggingface_model(model_id="xxx") 获取详细信息`
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取 HuggingFace 模型详情
 */
export const fetchHuggingFaceModel: ToolExecutor = async (args) => {
  const { model_id } = args
  
  if (!model_id) {
    return `❌ 错误：model_id 是必填参数

示例：fetch_huggingface_model(model_id="bert-base-chinese")`
  }
  
  try {
    const apiUrl = `https://huggingface.co/api/models/${model_id}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      if (response.status === 404) return `❌ 未找到模型: ${model_id}`
      throw new Error(`HuggingFace API 错误: ${response.status}`)
    }
    
    const model = await response.json()
    
    let result = `🤗 **${model.id}**\n\n`
    result += `👤 **作者**: ${model.author || 'Unknown'}\n`
    result += `📥 **Downloads**: ${formatNumber(model.downloads || 0)}\n`
    result += `❤️ **Likes**: ${model.likes || 0}\n`
    if (model.pipeline_tag) result += `🏷️ **Task**: ${model.pipeline_tag}\n`
    if (model.tags?.length) result += `🏷️ **Tags**: ${model.tags.join(', ')}\n`
    result += `🔗 **链接**: https://huggingface.co/${model.id}\n\n`
    
    if (model.cardData?.description) {
      result += `📝 **描述**:\n${model.cardData.description}\n\n`
    }
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 获取失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ==================== Papers With Code 工具 ====================

/**
 * 搜索 Papers With Code
 */
export const searchPapersWithCode: ToolExecutor = async (args) => {
  const { query, limit = 10 } = args
  
  if (!query) {
    return `❌ 错误：query 是必填参数

示例：search_paperswithcode(query="image classification")`
  }
  
  try {
    const searchUrl = `https://paperswithcode.com/api/v1/search/?q=${encodeURIComponent(query)}&items_per_page=${Math.min(limit, 50)}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Papers With Code API 错误: ${response.status}`)
    }
    
    const data = await response.json()
    const results = data.results || []
    
    if (results.length === 0) {
      return `🔍 未找到与 "${query}" 相关的论文`
    }
    
    let output = `📊 Papers With Code 搜索: "${query}"\n找到 ${results.length} 个结果\n\n`
    
    results.forEach((item: any, i: number) => {
      if (item.type === 'paper') {
        const paper = item._source
        output += `${i + 1}. **${paper.title}**\n`
        output += `   👤 ${paper.authors?.slice(0, 3).join(', ') || 'Unknown'}\n`
        if (paper.abstract) {
          output += `   📝 ${paper.abstract.slice(0, 200)}...\n`
        }
        if (paper.url) output += `   🔗 ${paper.url}\n`
        output += '\n'
      }
    })
    
    return output
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ==================== Semantic Scholar 工具 ====================

/**
 * 搜索 Semantic Scholar
 */
export const searchSemanticScholar: ToolExecutor = async (args) => {
  const { query, limit = 10 } = args
  
  if (!query) {
    return `❌ 错误：query 是必填参数

示例：search_semantic_scholar(query="deep learning", limit=5)`
  }
  
  try {
    const fields = 'title,authors,year,abstract,citationCount,externalIds'
    const searchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=${Math.min(limit, 100)}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)
    
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Semantic Scholar API 错误: ${response.status}`)
    }
    
    const data = await response.json()
    const papers = data.data || []
    
    if (papers.length === 0) {
      return `🔍 未找到与 "${query}" 相关的论文`
    }
    
    let result = `🎓 Semantic Scholar 搜索: "${query}"\n总计: ${data.total || papers.length} 篇 · 显示前 ${papers.length} 篇\n\n`
    
    papers.forEach((paper: any, i: number) => {
      result += `${i + 1}. **${paper.title}**\n`
      
      if (paper.authors?.length) {
        const authorNames = paper.authors.map((a: any) => a.name).slice(0, 3).join(', ')
        result += `   👤 ${authorNames}${paper.authors.length > 3 ? ' 等' : ''}\n`
      }
      
      if (paper.year) {
        result += `   📅 ${paper.year}`
        if (paper.citationCount !== undefined) {
          result += ` · 📚 ${paper.citationCount} citations`
        }
        result += '\n'
      }
      
      if (paper.abstract) {
        result += `   📝 ${paper.abstract.replace(/\s+/g, ' ').slice(0, 180)}...\n`
      }
      
      if (paper.paperId) {
        result += `   🔗 https://www.semanticscholar.org/paper/${paper.paperId}\n`
      }
      
      result += '\n'
    })
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return '⏱️ 请求超时，请稍后重试'
    }
    return `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

// ==================== 辅助函数 ====================

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
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
