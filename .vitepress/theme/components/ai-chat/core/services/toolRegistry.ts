/**
 * 工具注册表 - 管理所有可用的 Function Call 工具
 */
import type { ToolDefinition, ToolExecutor, RegisteredTool } from '../types/tools'

// ==================== 工具实现 ====================

/**
 * 获取文章内容的工具
 */
async function getArticleContent(args: Record<string, any>): Promise<string> {
  const path = args.path as string
  try {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent('sections/' + path)}`)
    if (!response.ok) {
      return `错误：无法读取文章 ${path}`
    }
    const content = await response.text()
    // 清理 frontmatter
    return content.replace(/^---[\s\S]*?---/, '').trim()
  } catch (error) {
    return `错误：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 搜索文章的工具
 */
async function searchArticles(args: Record<string, any>): Promise<string> {
  const query = args.query as string
  const limit = args.limit as number | undefined
  try {
    const response = await fetch(`/api/articles/search?q=${encodeURIComponent(args.query)}&limit=${args.limit || 5}`)
    if (!response.ok) {
      // 回退到本地搜索
      return fallbackSearch(query, limit || 5)
    }
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) {
      return '未找到相关文章'
    }
    return result.data.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    ).join('\n')
  } catch (error) {
    return fallbackSearch(args.query, args.limit || 5)
  }
}

/**
 * 本地搜索回退
 */
async function fallbackSearch(query: string, limit: number): Promise<string> {
  try {
    const response = await fetch('/api/articles/list-all')
    if (!response.ok) return '搜索功能暂时不可用'
    
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) return '暂无文章数据'
    
    const lowerQuery = query.toLowerCase()
    const matches = result.data.filter((a: any) => 
      a.title?.toLowerCase().includes(lowerQuery) ||
      a.path?.toLowerCase().includes(lowerQuery)
    ).slice(0, limit)
    
    if (matches.length === 0) return `未找到与 "${query}" 相关的文章`
    
    return matches.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    ).join('\n')
  } catch {
    return '搜索功能暂时不可用'
  }
}

/**
 * 列出所有可用文章
 */
async function listArticles(args: Record<string, any>): Promise<string> {
  const section = args.section as string | undefined
  const limit = args.limit as number | undefined
  try {
    const response = await fetch('/api/articles/list-all')
    if (!response.ok) return '无法获取文章列表'
    
    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) return '暂无文章'
    
    let articles = result.data
    if (section) {
      articles = articles.filter((a: any) => a.section === section)
    }
    if (limit) {
      articles = articles.slice(0, limit)
    }
    
    return articles.map((a: any, i: number) => 
      `${i + 1}. ${a.title} (${a.path})`
    ).join('\n')
  } catch (error) {
    return `错误：${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取当前时间
 */
function getCurrentTime(): string {
  return new Date().toISOString()
}

// ==================== 工具定义 ====================

const tools: RegisteredTool[] = [
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_article_content',
        description: '获取指定路径的文章完整内容',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '文章路径，例如 "getting-started.md"'
            }
          },
          required: ['path']
        } as any
      }
    },
    executor: getArticleContent
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'search_articles',
        description: '根据关键词搜索文章',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词'
            },
            limit: {
              type: 'number',
              description: '返回结果数量限制，默认5条'
            }
          },
          required: ['query']
        } as any
      }
    },
    executor: searchArticles
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'list_articles',
        description: '列出所有可用文章',
        parameters: {
          type: 'object',
          properties: {
            section: {
              type: 'string',
              description: '可选：按分类筛选文章'
            },
            limit: {
              type: 'number',
              description: '返回结果数量限制'
            }
          },
          required: []
        } as any
      }
    },
    executor: listArticles
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_current_time',
        description: '获取当前时间',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        } as any
      }
    },
    executor: getCurrentTime
  }
]

// ==================== 工具注册表 API ====================

export const toolRegistry = {
  /**
   * 获取所有工具定义（用于 API 请求）
   */
  getDefinitions(): ToolDefinition[] {
    return tools.map(t => t.definition)
  },

  /**
   * 执行指定工具
   */
  async execute(name: string, args: Record<string, any>): Promise<string> {
    const tool = tools.find(t => t.definition.function.name === name)
    if (!tool) {
      throw new Error(`工具 ${name} 未找到`)
    }
    return await tool.executor(args)
  },

  /**
   * 注册新工具
   */
  register(tool: RegisteredTool): void {
    const existingIndex = tools.findIndex(t => 
      t.definition.function.name === tool.definition.function.name
    )
    if (existingIndex >= 0) {
      tools[existingIndex] = tool
    } else {
      tools.push(tool)
    }
  },

  /**
   * 获取工具列表
   */
  listTools(): Array<{ name: string; description: string }> {
    return tools.map(t => ({
      name: t.definition.function.name,
      description: t.definition.function.description
    }))
  }
}
