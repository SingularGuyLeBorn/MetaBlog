/**
 * 文章管理工具执行器（后端API版）
 * 
 * 统一返回格式，提供用户友好的错误信息
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { notifyFileSystemChange } from '@/theme/composables/useDynamicSidebar'

const API_BASE = '/api'

// ========== AI 文章操作安全边界 ==========
const ALLOWED_SECTIONS = ['posts', 'knowledge', 'resources']
const BLOCKED_SECTIONS = ['about', 'ai-research']

/**
 * 从文件路径中提取板块名
 * e.g. "sections/posts/my-article.md" -> "posts"
 */
function extractSection(filePath: string): string | null {
  const normalized = filePath.replace(/^sections\//, '').replace(/^\//, '')
  const firstSlash = normalized.indexOf('/')
  return firstSlash > 0 ? normalized.substring(0, firstSlash) : normalized
}

/**
 * 校验板块是否在白名单内
 */
function validateSectionPath(filePath: string): { valid: boolean; error?: string } {
  const section = extractSection(filePath)
  if (!section) return { valid: false, error: '无法从路径中识别板块' }
  if (ALLOWED_SECTIONS.includes(section)) return { valid: true }
  if (BLOCKED_SECTIONS.includes(section)) {
    return {
      valid: false,
      error: `板块 "${section}" 不允许AI操作。AI只能管理以下板块：${ALLOWED_SECTIONS.join('、')}`
    }
  }
  return {
    valid: false,
    error: `板块 "${section}" 不存在。可用板块：${ALLOWED_SECTIONS.join('、')}`
  }
}

/**
 * 校验路径是否包含目录遍历（..）
 */
function validateNoTraversal(filePath: string): { valid: boolean; error?: string } {
  if (filePath.includes('..')) {
    return { valid: false, error: '路径中不允许使用 ".."' }
  }
  return { valid: true }
}
// ========================================

/**
 * 标准化错误处理
 */
async function handleApiResponse(response: Response, action: string): Promise<ToolResult> {
  if (!response.ok) {
    const errorText = await response.text()
    return createErrorResult(
      `HTTP ${response.status}: ${errorText}`,
      `${action}失败（${response.status}）`,
      response.status === 404 ? '文件不存在，请检查路径' : '请稍后重试'
    )
  }
  
  try {
    const data = await response.json()
    if (data.success === false) {
      return createErrorResult(
        data.error || 'Unknown error',
        `${action}失败`,
        '请检查参数后重试'
      )
    }
    return createSuccessResult(data.data || data, `${action}成功`, action)
  } catch (e) {
    // 非JSON响应（如read返回纯文本）
    const text = await response.text()
    return createSuccessResult(text, `${action}成功`, action)
  }
}

/**
 * 将URL路径转换为文件路径
 */
function normalizeFilePath(inputPath: string): string {
  if (!inputPath) return ''
  
  let path = inputPath
  
  if (path.startsWith('/')) {
    path = path.slice(1)
  }
  
  if (path.endsWith('/')) {
    path = path + 'index.md'
  } else if (!path.endsWith('.md')) {
    // 新文件使用 index 模式：folder/index.md
    // 如果 AI 明确传了 .md 后缀，保持原样（兼容旧 folder-note 文件）
    path = path + '/index.md'
  }
  
  if (!path.startsWith('sections/')) {
    path = 'sections/' + path
  }
  
  return path
}

/**
 * 获取文章内容
 */
export const getArticleContent: ToolExecutor = async (args) => {
  const { path, max_length = 8000, start_line, end_line, include_metadata = false } = args
  
  if (!path) {
    return createErrorResult(
      'Missing path parameter',
      '请提供文章路径',
      '使用 list_articles 或 search_articles 获取路径'
    )
  }
  
  // 检查是否传入了标题而非路径
  if (path.includes('：') || path.includes('，') || (path.length > 100 && !path.includes('/'))) {
    return createErrorResult(
      'Invalid path format',
      `"${path}" 看起来像是标题，不是路径`,
      '请先调用 search_articles(query="文章标题") 获取正确路径'
    )
  }
  
  const normalizedPath = normalizeFilePath(path)
  
  // 安全边界校验
  const traversalCheck = validateNoTraversal(normalizedPath)
  if (!traversalCheck.valid) {
    return createErrorResult('Invalid path', traversalCheck.error)
  }
  const sectionCheck = validateSectionPath(normalizedPath)
  if (!sectionCheck.valid) {
    return createErrorResult('Section not allowed', sectionCheck.error)
  }
  
  try {
    const response = await fetch(
      `${API_BASE}/files/read?path=${encodeURIComponent(normalizedPath)}`
    )
    
    if (response.status === 404) {
      return createErrorResult(
        'File not found',
        `文章不存在: ${path}`,
        '请检查路径是否正确，或使用 search_articles 搜索文章'
      )
    }
    
    const result = await handleApiResponse(response, '读取文章')
    
    if (!result.success) return result
    
    let content = result.data as string
    const totalLines = content.split('\n').length
    
    // 按行号截取
    if (start_line || end_line) {
      const lines = content.split('\n')
      const startIdx = Math.max(0, (start_line || 1) - 1)
      const endIdx = end_line ? Math.min(lines.length, end_line) : lines.length
      content = lines.slice(startIdx, endIdx).join('\n')
    }
    
    // 长度限制 — 截断时告诉 AI 怎么续读
    const isTruncated = content.length > max_length
    if (isTruncated) {
      const truncatedContent = content.substring(0, max_length)
      // 估算截断位置对应的行号
      const truncatedLines = truncatedContent.split('\n').length
      content = truncatedContent + 
        `\n\n---` +
        `\n[内容已截断] 本文共 ${totalLines} 行，当前显示前 ${truncatedLines} 行（约 ${max_length} 字符）。` +
        `\n如需继续阅读，请调用 get_article_content(path="${path}", start_line=${truncatedLines + 1}, max_length=${max_length})`
    }
    
    return createSuccessResult(
      content,
      `成功读取文章（${isTruncated ? '已截断，' : ''}${content.length} 字符）`,
      'get_article_content'
    )
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '读取文章失败',
      '请检查网络连接或稍后重试'
    )
  }
}

/**
 * 搜索文章
 */
export const searchArticles: ToolExecutor = async (args) => {
  const { query, section, limit = 5 } = args
  
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '例如: "React", "深度学习", "Docker"'
    )
  }
  
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (section) params.append('section', section)
    
    const response = await fetch(`${API_BASE}/articles/search?${params}`)
    const result = await handleApiResponse(response, '搜索文章')
    
    if (!result.success) return result
    
    const articles = result.data || []
    if (articles.length === 0) {
      return createSuccessResult(
        [],
        `未找到包含 "${query}" 的文章`,
        'search_articles',
        '尝试使用不同的关键词，或创建新文章'
      )
    }
    
    return createSuccessResult(
      articles,
      `找到 ${articles.length} 篇相关文章`,
      'search_articles',
      '使用 get_article_content(path="文章路径") 读取内容'
    )
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '搜索失败',
      '请稍后重试'
    )
  }
}

/**
 * 列出文章 - 只列出 sections/ 目录下的内容（文章相关）
 */
export const listArticles: ToolExecutor = async (args) => {
  const { section, folder_path, limit = 50 } = args
  
  // 如果指定了 section，校验是否在白名单
  if (section && !ALLOWED_SECTIONS.includes(section)) {
    return createErrorResult(
      'Section not allowed',
      `板块 "${section}" 不在允许范围内。`,
      `可用板块：${ALLOWED_SECTIONS.join('、')}`
    )
  }
  
  try {
    // 构建路径：默认 sections，如果有 section 则 sections/section
    let targetPath = 'sections'
    if (section) {
      targetPath = `sections/${section}`
    } else if (folder_path) {
      targetPath = folder_path
    }
    
    const params = new URLSearchParams()
    params.append('path', targetPath)
    params.append('limit', String(limit))
    
    const response = await fetch(`${API_BASE}/files/list?${params}`)
    const result = await handleApiResponse(response, '列出文章')
    
    if (!result.success) return result
    
    // 过滤掉非文章相关的文件（如 node_modules）
    let filteredItems = (result.data || []).filter((item: any) => {
      // 排除常见的非内容目录和文件
      const excludePatterns = [
        'node_modules', '.git', '.vitepress', '.data', '.skills',
        'package.json', 'package-lock.json', 'node_modules'
      ]
      return !excludePatterns.some(pattern => 
        item.name.includes(pattern) || item.path.includes(pattern)
      )
    })
    
    // 额外过滤：只保留白名单板块内的内容
    filteredItems = filteredItems.filter((item: any) => {
      const itemSection = extractSection(item.path || '')
      return !itemSection || ALLOWED_SECTIONS.includes(itemSection)
    })
    
    return createSuccessResult(
      filteredItems,
      `找到 ${filteredItems.length} 个条目`,
      'list_articles',
      section ? `当前位置: sections/${section}/` : '当前位置: sections/'
    )
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '获取列表失败'
    )
  }
}

/**
 * 创建文章 - 通过后端 Harness，自动处理叶子节点提升
 */
export const createArticle: ToolExecutor = async (args) => {
  const { title, path: articlePath, content = '', tags = [], section = 'posts' } = args

  if (!title) {
    return createErrorResult(
      'Missing title',
      '请提供文章标题',
      '例如: "Vue 3 入门指南"'
    )
  }

  // 安全边界：校验板块
  const sectionToCheck = articlePath ? extractSection(articlePath) : section
  if (sectionToCheck) {
    const sectionCheck = validateSectionPath(`sections/${sectionToCheck}/`)
    if (!sectionCheck.valid) {
      return createErrorResult('Section not allowed', sectionCheck.error)
    }
  }

  try {
    const response = await fetch(`${API_BASE}/articles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        section,
        tags,
        path: articlePath
      })
    })

    const result = await handleApiResponse(response, '创建文章')

    if (result.success) {
      const data = result.data || {}
      const promoted = data.promotedNodes && data.promotedNodes.length > 0
        ? `\n（自动提升叶子节点: ${data.promotedNodes.join(', ')}）`
        : ''
      const autoIndex = data.notes && data.notes.length > 0
        ? `\n（${data.notes.join('；')}）`
        : ''
      // 触发侧边栏刷新
      if (typeof window !== 'undefined') {
        notifyFileSystemChange(section)
      }
      return createSuccessResult(
        data,
        `文章 "${title}" 创建成功！\n路径: ${data.path || articlePath}${promoted}${autoIndex}`,
        'create_article',
        '可以使用 get_article_content 读取或 update_article 修改'
      )
    }

    return result
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '创建文章失败'
    )
  }
}

/**
 * 更新文章
 */
export const updateArticle: ToolExecutor = async (args) => {
  const { path: articlePath, content, mode = 'replace' } = args
  
  if (!articlePath || !content) {
    return createErrorResult(
      'Missing required parameters',
      '请提供文章路径和新内容'
    )
  }
  
  const normalizedPath = normalizeFilePath(articlePath)
  
  // 安全边界校验
  const traversalCheck = validateNoTraversal(normalizedPath)
  if (!traversalCheck.valid) {
    return createErrorResult('Invalid path', traversalCheck.error)
  }
  const sectionCheck = validateSectionPath(normalizedPath)
  if (!sectionCheck.valid) {
    return createErrorResult('Section not allowed', sectionCheck.error)
  }
  
  try {
    // 先读取原内容
    const readResponse = await fetch(
      `${API_BASE}/files/read?path=${encodeURIComponent(normalizedPath)}`
    )
    
    if (readResponse.status === 404) {
      return createErrorResult(
        'File not found',
        `文章不存在: ${articlePath}`,
        '请检查路径，或使用 create_article 创建新文章'
      )
    }
    
    const oldContent = await readResponse.text()
    let newContent = content
    
    // 根据模式处理内容
    switch (mode) {
      case 'append':
        newContent = oldContent + '\n\n' + content
        break
      case 'prepend':
        newContent = content + '\n\n' + oldContent
        break
      default:
        // replace: 使用新内容（保留frontmatter）
        const fmMatch = oldContent.match(/^---\n[\s\S]*?\n---\n/)
        if (fmMatch) {
          newContent = fmMatch[0] + content
        }
    }
    
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: normalizeFilePath(articlePath),
        content: newContent
      })
    })
    
    const result = await handleApiResponse(response, '更新文章')
    
    if (result.success) {
      const section = extractSection(normalizedPath)
      if (typeof window !== 'undefined' && section) {
        notifyFileSystemChange(section)
      }
      return createSuccessResult(
        { path: articlePath, mode },
        `文章更新成功！`,
        'update_article'
      )
    }
    
    return result
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '更新文章失败'
    )
  }
}

/**
 * 删除文章（带安全确认提示）
 */
export const deleteArticle: ToolExecutor = async (args) => {
  const { path: articlePath, confirm = false, backup_first = true } = args
  
  if (!articlePath) {
    return createErrorResult(
      'Missing path parameter',
      '请提供要删除的文章路径'
    )
  }
  
  const normalizedPath = normalizeFilePath(articlePath)
  
  // 安全边界校验
  const traversalCheck = validateNoTraversal(normalizedPath)
  if (!traversalCheck.valid) {
    return createErrorResult('Invalid path', traversalCheck.error)
  }
  const sectionCheck = validateSectionPath(normalizedPath)
  if (!sectionCheck.valid) {
    return createErrorResult('Section not allowed', sectionCheck.error)
  }
  
  // 危险操作提示（AI应该在调用前询问用户）
  if (!confirm) {
    return createErrorResult(
      'Confirmation required',
      `即将删除文章: ${articlePath}`,
      '请确认是否继续？设置 confirm=true 确认删除'
    )
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: normalizedPath,
        permanent: !backup_first
      })
    })
    
    const result = await handleApiResponse(response, '删除文章')
    
    if (result.success) {
      const section = extractSection(normalizedPath)
      if (typeof window !== 'undefined' && section) {
        notifyFileSystemChange(section)
      }
      return createSuccessResult(
        { path: articlePath },
        `文章已删除${backup_first ? '（已备份到回收站）' : ''}`,
        'delete_article'
      )
    }
    
    return result
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '删除文章失败'
    )
  }
}
