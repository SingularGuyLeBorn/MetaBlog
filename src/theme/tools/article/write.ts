/**
 * ============================================================================
 * write 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/article
 */


import { notifyFileSystemChange } from '@/theme/composables/useDynamicSidebar'
import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import {
  API_BASE,
  extractSection,
  handleApiResponse,
  normalizeFilePath,
  validateNoTraversal,
  validateSectionPath,
} from './utils'

/**
 * 创建文章的工具定义
 */
export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'createArticle',
    description: '创建一篇新文章. 只能在允许的板块内创建：posts(文章列表)、knowledge(知识库)、resources(公开资源). 创建时会自动为文章配备同名文件夹(folder/index.md),以预留资源文件夹并符合侧边栏渲染规范. ',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '文章标题(会自动转换为 URL 友好的英文 slug)' },
        content: { type: 'string', description: '文章内容(支持 Markdown)' },
        section: { type: 'string', description: '所属板块,必须是 "posts"、"knowledge" 或 "resources" 之一,默认 "posts"' },
        tags: { type: 'array', items: { type: 'string' }, description: '文章标签' },
        path: { type: 'string', description: '可选的自定义路径(相对于 sections/). 例如 "posts/attention/flash-attention" 会创建为 "posts/attention/flash-attention/index.md". 路径必须在允许的板块内. ' }
      },
      required: ['title']
    }
  }
}

/**
 * 更新文章的工具定义
 */
export const updateArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'updateArticle',
    description: '更新/覆盖已有文章的完整内容. 只能操作允许板块内的文章(posts、knowledge、resources). ',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章路径,如 "posts/my-article.md",必须在允许的板块内' },
        content: { type: 'string', description: '完整的 Markdown 内容(包含 frontmatter)' }
      },
      required: ['path', 'content']
    }
  }
}

/**
 * 删除文章的工具定义
 */
export const deleteArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'deleteArticle',
    description: '删除指定文章(操作不可逆,会同时清理缓存). 只能删除允许板块内的文章(posts、knowledge、resources). ',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文章路径,如 "posts/my-article.md",必须在允许的板块内' }
      },
      required: ['path']
    }
  }
}

/**
 * 创建文章
 *
 * 通过后端 Harness 创建新文章,自动处理叶子节点提升和文件夹创建. 
 * 创建成功后会触发侧边栏刷新. 
 *
 * @param args - 工具参数
 * @param args.title - 文章标题(必填)
 * @param args.path - 自定义路径(可选)
 * @param args.content - 文章内容(默认空)
 * @param args.tags - 文章标签(默认空数组)
 * @param args.section - 所属板块(默认 posts)
 * @returns 创建结果或错误信息
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
        ? `\n(自动提升叶子节点: ${data.promotedNodes.join(', ')})`
        : ''
      const autoIndex = data.notes && data.notes.length > 0
        ? `\n(${data.notes.join(';')})`
        : ''
      // 触发侧边栏刷新,保证新文章立即出现在导航中
      if (typeof window !== 'undefined') {
        notifyFileSystemChange(section)
      }
      return createSuccessResult(
        data,
        `文章 "${title}" 创建成功！\n路径: ${data.path || articlePath}${promoted}${autoIndex}`,
        'createArticle',
        '可以使用 getArticleContent 读取或 updateArticle 修改'
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
 *
 * 支持 replace(保留 frontmatter)、append、prepend 三种模式. 
 * 更新成功后会触发侧边栏刷新. 
 *
 * @param args - 工具参数
 * @param args.path - 文章路径(必填)
 * @param args.content - 新内容(必填)
 * @param args.mode - 更新模式：replace(默认)、append、prepend
 * @returns 更新结果或错误信息
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
    // 先读取原内容,用于 append/prepend 模式或保留 frontmatter
    const readResponse = await fetch(
      `${API_BASE}/files/read?path=${encodeURIComponent(normalizedPath)}`
    )

    if (readResponse.status === 404) {
      return createErrorResult(
        'File not found',
        `文章不存在: ${articlePath}`,
        '请检查路径,或使用 createArticle 创建新文章'
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
        // replace: 使用新内容,但保留原文件的 frontmatter(如果有的话)
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
        'updateArticle'
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
 * 删除文章(带安全确认提示)
 *
 * 删除操作需要 confirm=true 确认,支持先备份到回收站. 
 * 删除成功后会触发侧边栏刷新. 
 *
 * @param args - 工具参数
 * @param args.path - 文章路径(必填)
 * @param args.confirm - 是否确认删除(默认 false)
 * @param args.backup_first - 是否先备份到回收站(默认 true)
 * @returns 删除结果或错误信息
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

  // 危险操作提示(AI 应该在调用前询问用户)
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
        `文章已删除${backup_first ? '(已备份到回收站)' : ''}`,
        'deleteArticle'
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
