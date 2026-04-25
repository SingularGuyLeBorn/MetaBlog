/**
 * ============================================================================
 * 文章管理工具 — 读取操作
 * ============================================================================
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import {
  API_BASE,
  extractSection,
  validateNoTraversal,
  validateSectionPath,
  normalizeFilePath,
  handleApiResponse,
} from './utils'

/** 获取文章内容 */
export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'getArticleContent',
    description: '获取指定文章的内容。支持分段读取长文章。路径建议先通过 listArticles 或 searchArticles 获得。只能读取允许板块内的文章（posts、knowledge、resources）。',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章的相对路径，例如 "posts/my-article.md" 或 "knowledge/folder/index.md"' },
        max_length: { type: 'number', description: '最大返回字符数，默认 100000。文章很长时建议分段读取。', default: 100000 },
        start_line: { type: 'number', description: '起始行号（从1开始），用于分段读取长文章。配合 max_length 使用。' },
        end_line: { type: 'number', description: '结束行号，用于分段读取长文章。' }
      },
      required: ['path']
    }
  }
}

/** 获取文章内容 */
export const getArticleContent: ToolExecutor = async (args) => {
  const { path, max_length = 100000, start_line, end_line, include_metadata = false } = args

  if (!path) {
    return createErrorResult(
      'Missing path parameter',
      '请提供文章路径',
      '使用 listArticles 或 searchArticles 获取路径'
    )
  }

  // 检查是否传入了标题而非路径
  if (path.includes('：') || path.includes('，') || (path.length > 100 && !path.includes('/'))) {
    return createErrorResult(
      'Invalid path format',
      `"${path}" 看起来像是标题，不是路径`,
      '请先调用 searchArticles(query="文章标题") 获取正确路径'
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
        '请检查路径是否正确，或使用 searchArticles 搜索文章'
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
        `\n如需继续阅读，请调用 getArticleContent(path="${path}", start_line=${truncatedLines + 1}, max_length=${max_length})`
    }

    return createSuccessResult(
      content,
      `成功读取文章（${isTruncated ? '已截断，' : ''}${content.length} 字符）`,
      'getArticleContent'
    )
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '读取文章失败',
      '请检查网络连接或稍后重试'
    )
  }
}
