/**
 * 学术研究工具执行器
 * 所有 API 均为免费公开接口，无需认证
 */

import type { ToolExecutor } from '../types'

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
    
    const arxivId = idMatch ? idMatch[1].split('/').pop()?.replace('abs/', '').replace('v\d+', '') || '' : ''
    
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

export const searchArxiv: ToolExecutor = async (args) => {
  const { query, category = '', max_results = 10, sort_by = 'relevance' } = args
  
  if (!query) return '❌ 错误：query 是必填参数\n\n示例：search_arxiv(query="transformer")'
  
  const limit = Math.min(Math.max(1, max_results), 50)
  
  try {
    let searchQuery = encodeURIComponent(query)
    if (category) searchQuery = `cat:${category}+AND+${searchQuery}`
    
    const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=${limit}&sortBy=${sort_by}&sortOrder=descending`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/atom+xml' }
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const xmlText = await response.text()
    const papers = parseArxivXml(xmlText)
    
    if (papers.length === 0) return `🔍 未找到与 "${query}" 相关的论文`
    
    let result = `📚 ArXiv 搜索结果: "${query}" (${papers.length}篇)\n\n`
    papers.forEach((p, i) => {
      result += `${i + 1}. **${p.title}**\n`
      result += `   👤 ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' 等' : ''}\n`
      result += `   📅 ${formatDate(p.published)} · 🏷️ ${p.primaryCategory || 'N/A'}\n`
      result += `   📝 ${p.summary.slice(0, 150)}...\n`
      result += `   🔗 fetch_arxiv(paper_id="${p.id}")\n\n`
    })
    
    return result
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 搜索失败: ${error.message}`
  }
}

export const fetchArxiv: ToolExecutor = async (args) => {
  const { paper_id } = args
  if (!paper_id) return '❌ 错误：paper_id 是必填参数\n\n示例：fetch_arxiv(paper_id="2401.12345")'
  
  const cleanId = paper_id.toString().trim().toLowerCase().replace(/v\d+$/, '')
  
  try {
    const url = `https://export.arxiv.org/api/query?search_query=id:${cleanId}&start=0&max_results=1`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/atom+xml' }
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const xmlText = await response.text()
    const papers = parseArxivXml(xmlText)
    
    if (papers.length === 0) return `❌ 未找到论文: ${paper_id}`
    
    const p = papers[0]
    return `📄 **${p.title}**

👤 **作者**: ${p.authors.join(', ')}
📅 **发布**: ${formatDate(p.published)}
🏷️ **分类**: ${p.primaryCategory || 'N/A'}
🔗 **链接**: ${p.absUrl}
📥 **PDF**: ${p.pdfUrl}

📝 **摘要**:
${p.summary}`
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 获取失败: ${error.message}`
  }
}

// ==================== HuggingFace ====================

export const searchHuggingFace: ToolExecutor = async (args) => {
  const { query, task = '', limit = 10 } = args
  if (!query) return '❌ 错误：query 是必填参数\n\n示例：search_huggingface(query="bert")'
  
  try {
    let url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`
    if (task) url += `&filter=${task}`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const models = await response.json()
    if (!models?.length) return `🔍 未找到与 "${query}" 相关的模型`
    
    let result = `🤗 HuggingFace 搜索结果: "${query}" (${models.length}个)\n\n`
    models.slice(0, limit).forEach((m: any, i: number) => {
      const downloads = m.downloads > 1000000 ? `${(m.downloads/1000000).toFixed(1)}M` : 
                       m.downloads > 1000 ? `${(m.downloads/1000).toFixed(1)}K` : m.downloads
      result += `${i + 1}. **${m.id}**\n`
      result += `   📥 ${downloads} downloads · ❤️ ${m.likes || 0} likes\n`
      if (m.pipeline_tag) result += `   🏷️ ${m.pipeline_tag}\n`
      result += `   🔗 https://huggingface.co/${m.id}\n\n`
    })
    
    return result
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 搜索失败: ${error.message}`
  }
}

export const fetchHuggingFaceModel: ToolExecutor = async (args) => {
  const { model_id } = args
  if (!model_id) return '❌ 错误：model_id 是必填参数\n\n示例：fetch_huggingface_model(model_id="bert-base-chinese")'
  
  try {
    const url = `https://huggingface.co/api/models/${model_id}`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      if (response.status === 404) return `❌ 未找到模型: ${model_id}`
      throw new Error(`HTTP ${response.status}`)
    }
    
    const m = await response.json()
    const downloads = m.downloads > 1000000 ? `${(m.downloads/1000000).toFixed(1)}M` : 
                     m.downloads > 1000 ? `${(m.downloads/1000).toFixed(1)}K` : m.downloads
    
    return `🤗 **${m.id}**

👤 **作者**: ${m.author || 'Unknown'}
📥 **Downloads**: ${downloads}
❤️ **Likes**: ${m.likes || 0}
🏷️ **Task**: ${m.pipeline_tag || 'N/A'}
🔗 **链接**: https://huggingface.co/${m.id}

${m.cardData?.description ? `📝 **描述**:\n${m.cardData.description.slice(0, 500)}` : ''}`
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 获取失败: ${error.message}`
  }
}

// ==================== Papers With Code ====================

export const searchPapersWithCode: ToolExecutor = async (args) => {
  const { query, limit = 10 } = args
  if (!query) return '❌ 错误：query 是必填参数\n\n示例：search_paperswithcode(query="image classification")'
  
  try {
    const url = `https://paperswithcode.com/api/v1/search/?q=${encodeURIComponent(query)}&items_per_page=${Math.min(limit, 50)}`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const results = data.results?.filter((r: any) => r.type === 'paper') || []
    
    if (!results.length) return `🔍 未找到与 "${query}" 相关的论文`
    
    let output = `📊 Papers With Code: "${query}" (${results.length}篇)\n\n`
    results.slice(0, limit).forEach((item: any, i: number) => {
      const p = item._source
      output += `${i + 1}. **${p.title}**\n`
      if (p.authors?.length) output += `   👤 ${p.authors.slice(0, 3).join(', ')}\n`
      if (p.abstract) output += `   📝 ${p.abstract.slice(0, 150)}...\n`
      output += '\n'
    })
    
    return output
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 搜索失败: ${error.message}`
  }
}

// ==================== Semantic Scholar ====================

export const searchSemanticScholar: ToolExecutor = async (args) => {
  const { query, limit = 10 } = args
  if (!query) return '❌ 错误：query 是必填参数\n\n示例：search_semantic_scholar(query="deep learning")'
  
  try {
    const fields = 'title,authors,year,abstract,citationCount'
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=${fields}&limit=${Math.min(limit, 100)}`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const papers = data.data || []
    
    if (!papers.length) return `🔍 未找到与 "${query}" 相关的论文`
    
    let result = `🎓 Semantic Scholar: "${query}" (${papers.length}篇)\n\n`
    papers.forEach((p: any, i: number) => {
      result += `${i + 1}. **${p.title}**\n`
      if (p.authors?.length) {
        result += `   👤 ${p.authors.map((a: any) => a.name).slice(0, 3).join(', ')}\n`
      }
      if (p.year) {
        result += `   📅 ${p.year}`
        if (p.citationCount !== undefined) result += ` · 📚 ${p.citationCount} citations`
        result += '\n'
      }
      if (p.abstract) result += `   📝 ${p.abstract.slice(0, 150)}...\n`
      result += '\n'
    })
    
    return result
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 搜索失败: ${error.message}`
  }
}

// ==================== OpenReview ====================

export const searchOpenReview: ToolExecutor = async (args) => {
  const { query, venue = '', limit = 10 } = args
  if (!query) return '❌ 错误：query 是必填参数\n\n示例：search_openreview(query="reinforcement learning")'
  
  try {
    const url = `https://api.openreview.net/notes/search?term=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    let notes = data.notes || []
    
    if (venue) {
      notes = notes.filter((n: any) => 
        (n.content?.venue?.value || '').toLowerCase().includes(venue.toLowerCase())
      )
    }
    
    if (!notes.length) return `🔍 未找到与 "${query}" 相关的 OpenReview 论文`
    
    let result = `📚 OpenReview: "${query}" (${notes.length}篇)\n\n`
    notes.slice(0, limit).forEach((n: any, i: number) => {
      const title = n.content?.title?.value || n.content?.title || 'Untitled'
      const authors = n.content?.authors?.value || n.content?.authors || []
      const venue = n.content?.venue?.value || 'Unknown'
      
      result += `${i + 1}. **${title}**\n`
      if (authors.length) result += `   👤 ${authors.slice(0, 3).join(', ')}\n`
      result += `   🏛️ ${venue}\n\n`
    })
    
    return result
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 搜索失败: ${error.message}`
  }
}

export const fetchOpenReview: ToolExecutor = async (args) => {
  const { forum_id } = args
  if (!forum_id) return '❌ 错误：forum_id 是必填参数\n\n示例：fetch_openreview(forum_id="xxxxxxxx")'
  
  try {
    const url = `https://api.openreview.net/notes?id=${forum_id}`
    
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    const note = data.notes?.[0]
    
    if (!note) return `❌ 未找到论文: ${forum_id}`
    
    const title = note.content?.title?.value || note.content?.title || 'Untitled'
    const authors = note.content?.authors?.value || note.content?.authors || []
    const abstract = note.content?.abstract?.value || note.content?.abstract || ''
    const venue = note.content?.venue?.value || 'Unknown'
    
    return `📄 **${title}**

👤 **作者**: ${authors.join(', ')}
🏛️ **会议**: ${venue}
🔗 **链接**: https://openreview.net/forum?id=${note.forum || note.id}

📝 **摘要**:
${abstract || '无摘要'}`
  } catch (error: any) {
    if (error.name === 'AbortError') return '⏱️ 请求超时'
    return `❌ 获取失败: ${error.message}`
  }
}
