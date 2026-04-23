/**
 * 从工具执行结果中提取可点击的实体链接
 *
 * 支持的工具类型：
 * - 飞书文档/表格/知识库
 * - GitHub Repo / Issue / PR
 * - 语雀文档
 * - 通用 URL（自动检测）
 */

export interface EntityLink {
  url: string
  title?: string
  type: 'feishu' | 'github' | 'yuque' | 'web' | 'file'
  icon: string
}

/** URL 正则 */
const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`[\]]+/gi

/** 已知工具类型的 URL 字段映射 */
const TOOL_URL_FIELDS: Record<string, string[]> = {
  // 飞书
  feishu_doc_create: ['url', 'docUrl', 'link', 'web_url', 'document_id'],
  feishu_share_doc: ['url', 'docUrl'],
  feishu_doc_append: ['url', 'docUrl'],
  // GitHub
  github_create_repo: ['html_url', 'url'],
  github_create_issue: ['html_url', 'url'],
  github_create_pull_request: ['html_url', 'url'],
  // 语雀
  yuque_create_doc: ['url', 'webUrl', 'slug_url'],
}

/**
 * 从工具结果中提取实体链接
 */
export function extractEntityLinks(toolName: string, result: any): EntityLink[] {
  const links: EntityLink[] = []
  if (!result) return links

  // 1. 按工具类型提取已知字段
  const knownFields = TOOL_URL_FIELDS[toolName] || []
  for (const field of knownFields) {
    const val = getNestedValue(result, field)
    if (typeof val === 'string') {
      // 飞书特殊处理：document_id 需要拼接成 URL
      if (field === 'document_id' && toolName.includes('feishu')) {
        links.push(createEntityLink(`https://feishu.cn/docx/${val}`, toolName, result))
      } else if (isValidUrl(val)) {
        links.push(createEntityLink(val, toolName, result))
      }
    }
  }

  // 2. 扫描 message 字段中的 URL（很多工具把链接放在 message 字符串里）
  if (result.message && typeof result.message === 'string') {
    const msgLinks = extractUrlsFromText(result.message)
    for (const url of msgLinks) {
      links.push(createEntityLink(url, toolName, result))
    }
  }

  // 3. 通用 URL 扫描（递归遍历 JSON）
  if (links.length === 0) {
    scanUrlsRecursive(result, links, toolName)
  }

  // 去重
  const seen = new Set<string>()
  return links.filter(link => {
    if (seen.has(link.url)) return false
    seen.add(link.url)
    return true
  })
}

/** 从文本中提取 URL */
function extractUrlsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX)
  return matches ? matches.filter(isValidUrl) : []
}

/**
 * 从工具记录列表中提取所有实体链接
 */
export function extractAllEntityLinks(toolRecords: any[]): EntityLink[] {
  const all: EntityLink[] = []
  for (const record of toolRecords) {
    if (record?.result?.success && record.result.data) {
      const links = extractEntityLinks(record.name, record.result.data)
      all.push(...links)
    } else if (record?.result?.success && typeof record.result === 'object') {
      const links = extractEntityLinks(record.name, record.result)
      all.push(...links)
    }
  }
  // 去重
  const seen = new Set<string>()
  return all.filter(link => {
    if (seen.has(link.url)) return false
    seen.add(link.url)
    return true
  })
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
  // 优先从上下文提取名称
  const candidates = [
    context?.name,
    context?.title,
    context?.doc_name,
    context?.repo_name,
    context?.full_name,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }

  // 从 URL 路径提取最后一段作为标题
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
        if (isValidUrl(url)) {
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
