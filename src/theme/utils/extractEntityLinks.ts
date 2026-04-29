/**
 * 从工具执行结果中提取可点击的实体链接
 *
 * 设计原则：工具执行成功后，系统立即从结果中捕捉 URL 并渲染为卡片，
 * 不依赖 AI 在回复文本中提及链接。
 *
 * 支持：飞书文档、GitHub Repo/Issue/PR、语雀文档、通用 URL 扫描
 */

export interface EntityLink {
  url: string
  title?: string
  type: 'feishu' | 'github' | 'yuque' | 'web' | 'file'
  icon: string
}

/** URL 正则 */
const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`[\]]+/gi

/** 已知工具类型的 URL 字段映射(支持嵌套路径，如 document.document_id) */
const TOOL_URL_FIELDS: Record<string, string[]> = {
  // 飞书
  feishuDocCreate: ['url', 'docUrl', 'link', 'web_url', 'document.document_id'],
  feishuDocShare: ['url', 'docUrl'],
  feishuDocAppend: ['url', 'docUrl'],
  // GitHub
  githubCreateRepo: ['html_url', 'url'],
  githubCreateIssue: ['html_url', 'url'],
  githubCreatePullRequest: ['html_url', 'url'],
  githubGetRepo: ['html_url', 'url'],
  // 语雀
  yuqueDocCreate: ['url', 'webUrl', 'slug_url'],
}

/**
 * 从单个 ToolResult 中提取实体链接
 *
 * 扫描顺序：
 * 1. 已知字段(从 data 中按路径提取)
 * 2. message 文本中的 URL
 * 3. data 全量递归 URL 扫描(兜底)
 */
export function extractEntityLinks(toolName: string, toolResult: any): EntityLink[] {
  const links: EntityLink[] = []
  if (!toolResult) return links

  const data = toolResult.data
  const message = toolResult.message

  // 1. 按工具类型从 data 中提取已知字段
  // 只有 TOOL_URL_FIELDS 中明确配置的工具才会提取，避免查询类工具返回的
  // 描述文本中碰巧包含示例 URL 被误渲染为卡片
  const knownFields = TOOL_URL_FIELDS[toolName]
  if (knownFields) {
    for (const fieldPath of knownFields) {
      const val = getNestedValue(data, fieldPath)
      if (typeof val !== 'string') continue

      // 飞书特殊处理：document.document_id 拼接成 URL
      if (fieldPath === 'document.document_id' && toolName.includes('feishu')) {
        links.push(createEntityLink(`https://feishu.cn/docx/${val}`, toolName, data))
      } else if (isValidUrl(val)) {
        links.push(createEntityLink(val, toolName, data))
      }
    }
  }

  // 2. 从 message 文本中提取 URL(仅限已知工具类型，避免查询类工具误渲染)
  // webSearch 等工具的 message 中包含搜索结果 URL，不应渲染为实体卡片
  if (knownFields && typeof message === 'string') {
    const msgLinks = extractUrlsFromText(message)
    for (const url of msgLinks) {
      links.push(createEntityLink(url, toolName, data))
    }
  }

  // 去重
  return deduplicateLinks(links)
}

/**
 * 从工具记录列表中提取所有实体链接
 */
export function extractAllEntityLinks(toolRecords: any[]): EntityLink[] {
  const all: EntityLink[] = []
  for (const record of toolRecords) {
    const result = record?.result
    if (!result || typeof result !== 'object') continue
    if (!result.success) continue

    const links = extractEntityLinks(record.name || record.toolName || '', result)
    all.push(...links)
  }
  return deduplicateLinks(all)
}

/** 从单个工具记录中提取链接 */
export function extractLinksFromRecord(record: any): EntityLink[] {
  if (!record?.result?.success) return []
  return extractEntityLinks(record.name || record.toolName || '', record.result)
}

// ═══════════════════════════════════════════════════════════════
// 内部辅助
// ═══════════════════════════════════════════════════════════════

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function isValidUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://')
}

function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX)
  return matches ? matches.filter(isValidUrl).filter((u) => !isPlaceholderUrl(u)) : []
}

/**
 * 判断 URL 是否为示例/占位符，避免将工具 description 中的示例链接
 * 误渲染为实体卡片。
 *
 * 常见占位符模式：
 * - 示例域名：xxx.feishu.cn、example.com、localhost
 * - 路径占位符：/p/xxxx、/s/xxx、BVxxx、/users/octocat
 * - 截断示例：以 ... 结尾或包含 /...
 */
function isPlaceholderUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (lower.includes('xxx.') || lower.includes('example.') || lower.includes('localhost')) return true
  if (/\/(p|id)\/xxxx\b/.test(url)) return true
  if (/\/s\/xxx\b/.test(url)) return true
  if (/\/BVxxx\b/.test(url)) return true
  if (/\/users\/octocat\b/.test(url)) return true
  if (url.endsWith('...')) return true
  if (url.includes('/...')) return true
  return false
}

function deduplicateLinks(links: EntityLink[]): EntityLink[] {
  const seen = new Set<string>()
  return links.filter(link => {
    if (seen.has(link.url)) return false
    seen.add(link.url)
    return true
  })
}

function createEntityLink(url: string, toolName: string, context: any): EntityLink {
  const type = detectType(url, toolName)
  return {
    url,
    title: extractTitle(context, type, url),
    type,
    icon: getIcon(type),
  }
}

function detectType(url: string, toolName: string): EntityLink['type'] {
  if (url.includes('feishu.cn') || url.includes('larksuite.com') || toolName.includes('feishu')) {
    return 'feishu'
  }
  if (url.includes('github.com') || toolName.includes('github')) {
    return 'github'
  }
  if (url.includes('yuque.com') || toolName.includes('yuque')) {
    return 'yuque'
  }
  return 'web'
}

function getIcon(type: EntityLink['type']): string {
  switch (type) {
    case 'feishu': return '📋'
    case 'github': return '⚡'
    case 'yuque': return '📖'
    case 'file': return '📎'
    default: return '🔗'
  }
}

function extractTitle(context: any, type: EntityLink['type'], url: string): string {
  const candidates = [
    context?.title,
    context?.name,
    context?.doc_name,
    context?.repo_name,
    context?.full_name,
    context?.document?.title,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }

  try {
    const pathname = new URL(url).pathname
    const lastSegment = pathname.split('/').filter(Boolean).pop()
    if (lastSegment) {
      if (type === 'github') {
        const parts = pathname.split('/').filter(Boolean)
        if (parts.length >= 2) return `${parts[0]}/${parts[1]}`
      }
      return decodeURIComponent(lastSegment)
    }
  } catch {
    // ignore
  }

  return url
}

function scanUrlsRecursive(value: any, links: EntityLink[], toolName: string, depth = 0) {
  if (depth > 5) return
  if (typeof value === 'string') {
    const matches = value.match(URL_REGEX)
    if (matches) {
      for (const url of matches) {
        if (isValidUrl(url) && !isPlaceholderUrl(url)) {
          links.push(createEntityLink(url, toolName, {}))
        }
      }
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      scanUrlsRecursive(item, links, toolName, depth + 1)
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const v of Object.values(value)) {
      scanUrlsRecursive(v, links, toolName, depth + 1)
    }
  }
}
