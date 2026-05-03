/**
 * ============================================================================
 * query 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/article
 */


import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import {
  ALLOWED_SECTIONS,
  API_BASE,
  extractSection,
  handleApiResponse,
} from './utils'

/**
 * 搜索文章的工具定义
 */
export const searchArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchArticles',
    description: '在博客中按关键词搜索文章,返回标题或内容匹配的文章列表. \n\n使用场景：当用户想找「某篇特定的文章」「有没有关于某个主题的内容」「我之前写的关于 XX 的文章在哪」时调用. 适合关键词模糊匹配,如果用户给出了文章标题或主题关键词但不确定具体位置,优先使用此工具. \n\n示例用法：searchArticles(query="Docker")\n\n注意事项：\n- 只搜索允许板块内的文章：posts(博客文章)、knowledge(知识库)、resources(资源)\n- query 支持标题和内容的关键词匹配\n- 返回结果包含文章路径,可用于后续调用 getArticleContent(path="文章路径") 读取完整内容\n- 如果搜索无结果,可尝试使用 listArticles 浏览目录结构\n- 搜索词尽量简洁,避免长句',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词,用于匹配文章标题或正文内容. 示例："Docker"、"React Hooks"、"深度学习". ' }
      },
      required: ['query']
    }
  }
}

/**
 * 列出文章的工具定义
 */
export const listArticlesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'listArticles',
    description: '按目录结构列出博客中的文章,浏览指定板块或文件夹下的所有文章. \n\n使用场景：当用户需要「看看博客有哪些文章」「列出知识库的所有内容」「浏览某个分类下的文章」时调用. 适合结构化浏览,而不是关键词搜索. 与 searchArticles 的区别：searchArticles 是关键词匹配,listArticles 是按目录层级枚举. \n\n示例用法：listArticles(section="knowledge", limit=20)\n\n注意事项：\n- 只列出允许板块内的内容：posts(博客文章)、knowledge(知识库)、resources(资源)\n- 可通过 section 参数限定板块,也可通过 folder_path 指定子文件夹\n- 返回结果包含文件路径,可用于后续调用 getArticleContent(path="文章路径")\n- 如果用户给出了模糊的主题但没有具体关键词,先 listArticles 浏览目录,再决定读取哪篇文章\n- limit 默认 50,如需查看全部可适当调大',
    parameters: {
      type: 'object',
      properties: {
        section: { type: 'string', description: '指定板块,必须是以下之一："posts"(博客文章)、"knowledge"(知识库)、"resources"(资源). 不指定则列出所有允许板块的内容. ' },
        folder_path: { type: 'string', description: '指定子文件夹路径,相对于 sections/ 目录. 示例："posts/2024"、"knowledge/frontend". 不指定则列出该板块根目录下的内容. ' },
        limit: { type: 'number', description: '最大返回数量,范围 1~200. 默认值：50. 如果内容较多可适当调大. ' }
      }
    }
  }
}

/**
 * 搜索文章
 *
 * 通过后端 API 按关键词搜索文章,支持标题和内容匹配. 
 *
 * @param args - 工具参数
 * @param args.query - 搜索关键词
 * @param args.section - 限定板块(可选)
 * @param args.limit - 返回数量上限(默认 5)
 * @returns 搜索结果或错误信息
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
        'searchArticles',
        '尝试使用不同的关键词,或创建新文章'
      )
    }

    return createSuccessResult(
      articles,
      `找到 ${articles.length} 篇相关文章`,
      'searchArticles',
      '使用 getArticleContent(path="文章路径") 读取内容'
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
 * 列出文章
 *
 * 浏览博客的目录结构,支持按板块或子文件夹筛选. 
 * 返回结果会过滤掉非内容文件和不在白名单板块内的条目. 
 *
 * @param args - 工具参数
 * @param args.section - 限定板块(可选)
 * @param args.folder_path - 子文件夹路径(可选)
 * @param args.limit - 返回数量上限(默认 50)
 * @returns 文件列表或错误信息
 */
export const listArticles: ToolExecutor = async (args) => {
  const { section, folder_path, limit = 50 } = args

  // 如果指定了 section,校验是否在白名单
  if (section && !ALLOWED_SECTIONS.includes(section)) {
    return createErrorResult(
      'Section not allowed',
      `板块 "${section}" 不在允许范围内. `,
      `可用板块：${ALLOWED_SECTIONS.join('、')}`
    )
  }

  try {
    // 构建路径：默认 sections,如果有 section 则 sections/section
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

    // 过滤掉非文章相关的文件(如 node_modules)
    let filteredItems = (result.data || []).filter((item: any) => {
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
      'listArticles',
      section ? `当前位置: sections/${section}/` : '当前位置: sections/'
    )
  } catch (error) {
    return createErrorResult(
      error instanceof Error ? error.message : String(error),
      '获取列表失败'
    )
  }
}
