/**
 * ArXiv 学术工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { proxyFetch } from './other'

// ==================== ArXiv 类型与辅助函数 ====================

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

// ==================== 工具定义 ====================

export const searchArxivDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchArxiv',
    description: '搜索 ArXiv 学术论文。支持关键词、分类过滤。常用分类：cs.AI(AI), cs.CL(NLP), cs.CV(计算机视觉), cs.LG(机器学习)。注意：ArXiv 免费 API 有速率限制(约每 3 秒 1 次)，请尽量把相关主题用 OR 合并到一次查询中，避免连续发起多次搜索。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，可用 OR 合并多个主题，如 "transformer OR attention"' },
        category: { type: 'string', description: '分类过滤，如 cs.AI', default: '' },
        max_results: { type: 'number', description: '返回数量(1-50)', default: 5 },
        sort_by: { type: 'string', enum: ['relevance', 'lastUpdatedDate', 'submittedDate'], default: 'relevance' }
      },
      required: ['query']
    }
  }
}

export const fetchArxivDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetchArxiv',
    description: '获取 ArXiv 论文详情，包括完整摘要、作者、PDF链接。支持一次获取多篇论文以减少 API 调用次数。',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'ArXiv 论文 ID，如 2401.12345。与 paper_ids 二选一或同时使用。' },
        paper_ids: { type: 'array', items: { type: 'string' }, description: '多个 ArXiv 论文 ID 数组，如 ["2401.12345","2402.67890"]' }
      },
      anyOf: [
        { required: ['paper_id'] },
        { required: ['paper_ids'] }
      ]
    }
  }
}

// ==================== 执行器 ====================

export const searchArxiv: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, category = '', max_results = 5, sort_by = 'relevance' } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: searchArxiv(query="transformer")'
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
        'searchArxiv',
        '尝试使用不同的关键词或放宽搜索条件'
      )
    }

    // 格式化输出(给人类/AI 看)
    let formattedResult = `📚 ArXiv 搜索结果: "${query}" (${papers.length}篇)\n\n`
    papers.forEach((p, i) => {
      formattedResult += `${i + 1}. **${p.title}**\n`
      formattedResult += `   👤 ${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' 等' : ''}\n`
      formattedResult += `   📅 ${formatDate(p.published)} · 🏷️ ${p.primaryCategory || 'N/A'}\n`
      formattedResult += `   📝 ${p.summary}\n`
      formattedResult += `   🔗 fetchArxiv(paper_id="${p.id}")\n\n`
    })

    // 精简 data，去掉长摘要，避免 JSON.stringify 后体积过大导致 UI 卡顿
    const slimPapers = papers.map(p => ({
      id: p.id,
      title: p.title,
      authors: p.authors.slice(0, 5),
      published: p.published,
      primaryCategory: p.primaryCategory,
      pdfUrl: p.pdfUrl,
      absUrl: p.absUrl,
      summaryPreview: p.summary
    }))

    return createSuccessResult(
      slimPapers,
      formattedResult,
      'searchArxiv',
      '使用 fetchArxiv(paper_id="xxx") 获取论文详情'
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
  const rawIds: string[] = []
  if (args.paper_ids && Array.isArray(args.paper_ids) && args.paper_ids.length > 0) {
    rawIds.push(...args.paper_ids)
  } else if (args.paper_id) {
    rawIds.push(args.paper_id)
  }

  if (rawIds.length === 0) {
    return createErrorResult(
      'Missing paper_id or paper_ids parameter',
      '请提供论文 ID',
      '示例: fetchArxiv(paper_id="2401.12345") 或 fetchArxiv(paper_ids=["2401.12345","2402.67890"])'
    )
  }

  const cleanIds = rawIds
    .map(id => id.toString().trim().toLowerCase().replace(/v\d+$/, ''))
    .filter(Boolean)

  try {
    // 使用 id_list 批量查询，一次请求获取多篇论文
    const idList = cleanIds.join(',')
    const url = `https://export.arxiv.org/api/query?id_list=${idList}&start=0&max_results=${cleanIds.length}`

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
        `未找到论文: ${cleanIds.join(', ')}`,
        '请检查论文 ID 是否正确'
      )
    }

    // 格式化多篇论文
    let formattedResult = ''
    if (papers.length === 1) {
      const p = papers[0]
      formattedResult = `📄 **${p.title}**

👤 **作者**: ${p.authors.join(', ')}
📅 **发布**: ${formatDate(p.published)}
🏷️ **分类**: ${p.primaryCategory || 'N/A'}
🔗 **链接**: ${p.absUrl}
📥 **PDF**: ${p.pdfUrl}

📝 **摘要**:
${p.summary}`
    } else {
      formattedResult = `📚 共获取 ${papers.length} 篇论文\n\n`
      papers.forEach((p, i) => {
        formattedResult += `--- 论文 ${i + 1} ---\n`
        formattedResult += `📄 **${p.title}**\n`
        formattedResult += `👤 **作者**: ${p.authors.join(', ')}\n`
        formattedResult += `📅 **发布**: ${formatDate(p.published)}\n`
        formattedResult += `🏷️ **分类**: ${p.primaryCategory || 'N/A'}\n`
        formattedResult += `🔗 **链接**: ${p.absUrl}\n`
        formattedResult += `📥 **PDF**: ${p.pdfUrl}\n`
        formattedResult += `📝 **摘要**:\n${p.summary}\n\n`
      })
    }

    return createSuccessResult(
      papers.length === 1 ? papers[0] : papers,
      formattedResult,
      'fetchArxiv'
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
