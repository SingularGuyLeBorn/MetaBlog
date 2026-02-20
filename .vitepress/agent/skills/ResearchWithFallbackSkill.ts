/**
 * ResearchWithFallbackSkill - 带优雅降级的研究技能
 * 
 * 边界情况处理：
 * 1. @引用文章不存在 -> 记录警告，继续处理其他引用
 * 2. 网络抓取失败（403/timeout） -> 返回空结果或模拟数据
 * 3. 所有来源都失败 -> 使用本地知识库或生成基础内容
 */

import type { Skill, SkillContext, SkillResult } from '../core/types'
import { getLLMManager, type LLMMessage } from '../llm'
import { getStructuredLogger } from '../runtime/StructuredLogger'

// ============================================
// Types
// ============================================

interface ReferenceResult {
  type: 'local' | 'web'
  source: string
  title: string
  content: string
  exists: boolean
  error?: string
  fallback?: boolean
}

interface ResearchContext {
  localReferences: ReferenceResult[]
  webContent: ReferenceResult[]
  failedReferences: Array<{ source: string; reason: string }>
}

// ============================================
// 辅助函数
// ============================================

const logger = getStructuredLogger()

/**
 * 解析用户输入中的引用
 * @本地文章.md 或 https://example.com/article
 */
function parseReferences(input: string): Array<{ type: 'local' | 'web'; path: string }> {
  const references: Array<{ type: 'local' | 'web'; path: string }> = []
  
  // 匹配 @引用格式：@文章名 或 @路径/文章.md
  const localRefRegex = /@([\w\-/.]+(?:\.md)?)/g
  let match
  while ((match = localRefRegex.exec(input)) !== null) {
    references.push({
      type: 'local',
      path: match[1].endsWith('.md') ? match[1] : `${match[1]}.md`
    })
  }
  
  // 匹配 URL
  const urlRegex = /(https?:\/\/[^\s]+)/g
  while ((match = urlRegex.exec(input)) !== null) {
    references.push({
      type: 'web',
      path: match[1]
    })
  }
  
  return references
}

/**
 * 获取本地文章（带降级处理）
 */
async function fetchLocalArticle(
  path: string,
  ctx: SkillContext
): Promise<ReferenceResult> {
  const cleanPath = path.replace(/^\//, '').replace(/\.html$/, '.md')
  
  logger.debug('Fetching local article', { path: cleanPath, taskId: ctx.taskId })
  
  try {
    // 尝试多种路径变体
    const pathVariations = [
      cleanPath,
      `sections/posts/${cleanPath}`,
      `sections/knowledge/${cleanPath}`,
      `docs/${cleanPath}`
    ]
    
    for (const tryPath of pathVariations) {
      try {
        const response = await fetch(`/api/files/read?path=${encodeURIComponent(tryPath)}`)
        if (response.ok) {
          const content = await response.text()
          return {
            type: 'local',
            source: tryPath,
            title: extractTitle(content) || tryPath,
            content: content.slice(0, 5000), // 限制内容长度
            exists: true
          }
        }
      } catch (e) {
        // 继续尝试下一个路径
      }
    }
    
    // 所有路径都失败
    logger.warn('Local article not found, using fallback', { 
      path: cleanPath, 
      taskId: ctx.taskId 
    })
    
    return {
      type: 'local',
      source: cleanPath,
      title: cleanPath.split('/').pop() || cleanPath,
      content: '',
      exists: false,
      fallback: true,
      error: `文章 "${cleanPath}" 不存在或无法访问`
    }
    
  } catch (error) {
    logger.error('Error fetching local article', { 
      path: cleanPath, 
      error: String(error),
      taskId: ctx.taskId 
    })
    
    return {
      type: 'local',
      source: cleanPath,
      title: cleanPath.split('/').pop() || cleanPath,
      content: '',
      exists: false,
      fallback: true,
      error: `获取文章失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 抓取网络内容（带降级处理）
 */
async function fetchWebContent(
  url: string,
  timeout: number = 10000
): Promise<ReferenceResult> {
  logger.debug('Fetching web content', { url })
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    // 通过 BFF 代理抓取
    const response = await fetch('/api/proxy/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const status = response.status
      let errorMsg = `HTTP ${status}`
      
      if (status === 403) {
        errorMsg = '访问被拒绝（403）- 该网站禁止爬虫访问'
      } else if (status === 404) {
        errorMsg = '页面不存在（404）'
      } else if (status === 429) {
        errorMsg = '请求过于频繁（429）- 请稍后再试'
      } else if (status >= 500) {
        errorMsg = '服务器错误 - 目标网站暂时不可用'
      }
      
      throw new Error(errorMsg)
    }
    
    const content = await response.text()
    
    // 简单的 HTML 到文本转换
    const textContent = htmlToText(content).slice(0, 8000)
    
    return {
      type: 'web',
      source: url,
      title: extractTitleFromHTML(content) || url,
      content: textContent,
      exists: true
    }
    
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    const errorMsg = isTimeout 
      ? '请求超时 - 网站响应时间过长'
      : error instanceof Error ? error.message : String(error)
    
    logger.warn('Web fetch failed, using fallback', { 
      url, 
      error: errorMsg,
      isTimeout 
    })
    
    return {
      type: 'web',
      source: url,
      title: url,
      content: '',
      exists: false,
      fallback: true,
      error: errorMsg
    }
  }
}

/**
 * HTML 转文本（简化版）
 */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 从 HTML 提取标题
 */
function extractTitleFromHTML(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() : null
}

/**
 * 从 Markdown 提取标题
 */
function extractTitle(content: string): string | null {
  // 从 frontmatter
  const fmMatch = content.match(/^title:\s*(.+)$/m)
  if (fmMatch) return fmMatch[1].trim().replace(/^["']|["']$/g, '')
  
  // 从 H1
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match) return h1Match[1].trim()
  
  return null
}

/**
 * 生成研究提示词（根据可用上下文自适应）
 */
function generateResearchPrompt(
  topic: string,
  context: ResearchContext
): LLMMessage[] {
  const hasLocalContent = context.localReferences.some(r => r.exists)
  const hasWebContent = context.webContent.some(r => r.exists)
  const hasAnyContent = hasLocalContent || hasWebContent
  
  let contextSection = ''
  
  if (hasAnyContent) {
    contextSection = '\n\n## 参考资料\n'
    
    // 本地文章
    context.localReferences.forEach(ref => {
      if (ref.exists) {
        contextSection += `\n### ${ref.title}\n${ref.content.slice(0, 1500)}\n`
      }
    })
    
    // 网络内容
    context.webContent.forEach(ref => {
      if (ref.exists) {
        contextSection += `\n### ${ref.title} (${ref.source})\n${ref.content.slice(0, 1500)}\n`
      }
    })
  }
  
  // 失败提示
  const failures = [...context.failedReferences]
  context.localReferences.filter(r => !r.exists).forEach(r => {
    failures.push({ source: r.source, reason: r.error || '不存在' })
  })
  context.webContent.filter(r => !r.exists).forEach(r => {
    failures.push({ source: r.source, reason: r.error || '无法访问' })
  })
  
  let failureSection = ''
  if (failures.length > 0) {
    failureSection = '\n\n## 注意\n以下参考资料无法获取，将在知识范围内尽力回答：\n'
    failures.forEach(f => {
      failureSection += `- ${f.source}: ${f.reason}\n`
    })
  }
  
  return [
    {
      role: 'system',
      content: `你是一个专业的研究助手。基于提供的资料（如果有）回答问题。如果资料不足，基于你的知识给出最佳回答，并说明信息来源限制。`
    },
    {
      role: 'user',
      content: `主题：${topic}${contextSection}${failureSection}\n\n请基于以上信息，生成一份全面的研究报告。如果参考资料不足，请基于你的知识补充，并明确标注哪些是资料内容，哪些是你的推理。`
    }
  ]
}

// ============================================
// Skill: ResearchWithFallback
// ============================================

export const ResearchWithFallbackSkill: Skill = {
  name: 'ResearchWithFallback',
  description: '基于本地文章和网络资源进行研究，支持优雅降级',
  intentPattern: /(?:研究|调研|分析|基于|参考).{0,10}(?:@|https?:\/\/|文章|资料)/i,
  requiredParams: ['topic'],
  optionalParams: ['references', 'depth'],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { topic, rawInput = '' } = params
    
    logger.info('Starting research with fallback', { 
      topic, 
      taskId: ctx.taskId 
    })
    
    // 1. 解析引用
    const references = parseReferences(rawInput)
    
    if (references.length === 0) {
      // 没有引用，退化为普通问答
      logger.info('No references found, falling back to general QA', { taskId: ctx.taskId })
      
      const llm = getLLMManager()
      const response = await llm.chat({
        messages: [
          {
            role: 'system',
            content: '你是一个知识渊博的助手。'
          },
          {
            role: 'user',
            content: topic
          }
        ]
      })
      
      return {
        success: true,
        data: {
          message: response.content,
          sources: [],
          fallback: true,
          note: '未检测到具体引用，基于通用知识回答'
        },
        tokensUsed: response.usage.totalTokens,
        cost: response.cost
      }
    }
    
    // 2. 并行获取所有引用（带降级）
    const context: ResearchContext = {
      localReferences: [],
      webContent: [],
      failedReferences: []
    }
    
    ctx.logger.info(`Fetching ${references.length} references`, { taskId: ctx.taskId })
    
    const fetchPromises = references.map(async ref => {
      if (ref.type === 'local') {
        const result = await fetchLocalArticle(ref.path, ctx)
        context.localReferences.push(result)
        
        if (!result.exists) {
          context.failedReferences.push({
            source: ref.path,
            reason: result.error || '不存在'
          })
        }
      } else {
        const result = await fetchWebContent(ref.path, 10000)
        context.webContent.push(result)
        
        if (!result.exists) {
          context.failedReferences.push({
            source: ref.path,
            reason: result.error || '无法访问'
          })
        }
      }
    })
    
    await Promise.all(fetchPromises)
    
    // 3. 记录获取结果
    const successCount = context.localReferences.filter(r => r.exists).length +
                        context.webContent.filter(r => r.exists).length
    const failCount = context.failedReferences.length
    
    logger.info('Reference fetch completed', {
      total: references.length,
      success: successCount,
      failed: failCount,
      taskId: ctx.taskId
    })
    
    // 4. 生成研究内容
    const messages = generateResearchPrompt(topic, context)
    
    const llm = getLLMManager()
    const response = await llm.chat({ messages })
    
    // 5. 构建结果
    const resultData: any = {
      message: response.content,
      sources: [
        ...context.localReferences.filter(r => r.exists).map(r => ({
          type: 'local',
          title: r.title,
          path: r.source
        })),
        ...context.webContent.filter(r => r.exists).map(r => ({
          type: 'web',
          title: r.title,
          url: r.source
        }))
      ],
      failedSources: context.failedReferences.map(f => ({
        source: f.source,
        reason: f.reason
      }))
    }
    
    // 如果有失败，添加降级提示
    if (failCount > 0) {
      resultData.fallback = true
      resultData.note = `${failCount} 个引用无法获取，已基于可用信息回答`
    }
    
    return {
      success: true,
      data: resultData,
      tokensUsed: response.usage.totalTokens,
      cost: response.cost
    }
  }
}

// ============================================
// Skill: FetchContentWithRetry
// ============================================

export const FetchContentWithRetrySkill: Skill = {
  name: 'FetchContentWithRetry',
  description: '抓取网络内容，支持重试和降级',
  intentPattern: /(?:抓取|获取|读取).{0,5}(?:网页|URL|链接|https)/i,
  requiredParams: ['url'],
  optionalParams: ['timeout', 'retries'],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { url, timeout = 10000, retries = 2 } = params
    
    logger.info('Fetching content with retry', { url, timeout, retries, taskId: ctx.taskId })
    
    let lastError: string = ''
    
    // 重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${retries}`, { url, taskId: ctx.taskId })
        await new Promise(r => setTimeout(r, 1000 * attempt)) // 指数退避
      }
      
      const result = await fetchWebContent(url, timeout)
      
      if (result.exists) {
        return {
          success: true,
          data: {
            title: result.title,
            content: result.content,
            url: result.source,
            attempts: attempt + 1
          },
          tokensUsed: 0,
          cost: 0
        }
      }
      
      lastError = result.error || 'Unknown error'
      
      // 某些错误不需要重试
      if (result.error?.includes('403') || result.error?.includes('404')) {
        break
      }
    }
    
    // 所有尝试都失败，优雅降级
    logger.warn('All fetch attempts failed, returning fallback', { 
      url, 
      error: lastError,
      taskId: ctx.taskId 
    })
    
    return {
      success: true, // 返回成功但标记为降级
      data: {
        title: url,
        content: `无法抓取该网页内容：${lastError}\n\n建议：\n1. 检查 URL 是否正确\n2. 该网站可能禁止爬虫访问\n3. 尝试手动复制关键内容`,
        url,
        error: lastError,
        fallback: true
      },
      tokensUsed: 0,
      cost: 0
    }
  }
}

// 导出所有降级技能
export const fallbackSkills = [
  ResearchWithFallbackSkill,
  FetchContentWithRetrySkill
]
