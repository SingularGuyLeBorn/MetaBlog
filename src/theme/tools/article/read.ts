/**
 * ============================================================================
 * read 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/article
 */


import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import {
  API_BASE,
  handleApiResponse,
  normalizeFilePath,
  validateNoTraversal,
  validateSectionPath
} from './utils'

/**
 * 获取文章内容的工具定义
 */
export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'getArticleContent',
    description: '读取博客中指定文章的完整内容,支持分段读取长文章. \n\n使用场景：当用户需要「读一下这篇文章」「给我这篇文章的内容」「帮我总结一下这篇博客」「提取这篇文章的某一段」时调用. 必须先通过 listArticles 或 searchArticles 获取正确的文章路径,不可直接使用文章标题作为 path. \n\n示例用法：\n- 读取全文：getArticleContent(path="posts/my-article.md")\n- 分段读取：getArticleContent(path="knowledge/folder/index.md", start_line=1, end_line=50)\n- 限制长度：getArticleContent(path="resources/guide.md", max_length=50000)\n\n注意事项：\n- 只能读取允许板块内的文章：posts(博客文章)、knowledge(知识库)、resources(资源)\n- path 必须是相对路径(如 "posts/my-article.md"),禁止绝对路径和路径穿越\n- 不要直接将用户提供的文章标题作为 path,标题不是路径！必须先 searchArticles 或 listArticles 获取路径\n- 长文章建议分段读取：先用 start_line + end_line 读取前一部分,再逐步往后读\n- 如果内容超过 max_length,返回结果会被截断并在末尾提示如何续读\n- 支持 Markdown 格式的文章读取',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章的相对路径,格式为 "板块/文章路径". 示例："posts/my-article.md"、"knowledge/frontend/react-hooks.md"、"resources/deployment/docker-guide.md". 必须通过 listArticles 或 searchArticles 获取,不可使用文章标题. ' },
        max_length: { type: 'number', description: '最大返回字符数,用于防止长文章占用过多上下文. 默认值：100000. 如果内容超过此值,返回结果会被截断并在末尾附带领取剩余内容的提示. ', default: 100000 },
        start_line: { type: 'number', description: '起始行号(从1开始),用于分段读取长文章. 与 end_line 配合使用. 示例：start_line=1 表示从第1行开始读取. 不指定则从第1行开始. ' },
        end_line: { type: 'number', description: '结束行号,用于分段读取长文章. 与 start_line 配合使用. 示例：end_line=50 表示读取到第50行. 不指定则读到文章末尾或 max_length 限制处. ' }
      },
      required: ['path']
    }
  }
}

/**
 * 获取文章内容
 *
 * 读取指定文章的完整内容,支持按行号分段和长度限制. 
 * 会先做安全校验(路径穿越、板块白名单),防止访问敏感文件. 
 *
 * @param args - 工具参数
 * @param args.path - 文章相对路径
 * @param args.max_length - 最大返回字符数(默认 100000)
 * @param args.start_line - 起始行号(可选)
 * @param args.end_line - 结束行号(可选)
 * @param args.include_metadata - 是否包含元数据(可选)
 * @returns 文章内容或错误信息
 */
export const getArticleContent: ToolExecutor = async (args) => {
  const { path, max_length = 100000, start_line, end_line, include_metadata = false } = args

  if (!path) {
    return createErrorResult(
      'Missing path parameter',
      '请提供文章路径',
      '使用 listArticles 或 searchArticles 获取路径'
    )
  }

  // 检查是否传入了标题而非路径(标题通常包含中文标点和较长字符)
  if (path.includes('：') || path.includes(',') || (path.length > 100 && !path.includes('/'))) {
    return createErrorResult(
      'Invalid path format',
      `"${path}" 看起来像是标题,不是路径`,
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
        '请检查路径是否正确,或使用 searchArticles 搜索文章'
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
        `\n[内容已截断] 本文共 ${totalLines} 行,当前显示前 ${truncatedLines} 行(约 ${max_length} 字符). ` +
        `\n如需继续阅读,请调用 getArticleContent(path="${path}", start_line=${truncatedLines + 1}, max_length=${max_length})`
    }

    return createSuccessResult(
      content,
      `成功读取文章(${isTruncated ? '已截断,' : ''}${content.length} 字符)`,
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
