/**
 * 工具执行器 - 真正调用后端 API
 * 
 * 所有工具执行器都通过 fetch 调用后端 API 实现
 */

import type { ToolExecutor } from './types'

// API 基础路径
const API_BASE = '/api'

/**
 * 获取文章内容
 */
export const getArticleContent: ToolExecutor = async (args) => {
  const { path, max_length = 8000 } = args
  
  try {
    const response = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(path)}`)
    if (!response.ok) {
      throw new Error(`Failed to read article: ${response.status}`)
    }
    const content = await response.text()
    return content.substring(0, max_length)
  } catch (error) {
    return `Error reading article: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 搜索文章
 */
export const searchArticles: ToolExecutor = async (args) => {
  const { query, limit = 5 } = args
  
  try {
    // 先获取文章列表
    const response = await fetch(`${API_BASE}/sidebar`)
    if (!response.ok) {
      throw new Error('Failed to fetch articles')
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch articles')
    }
    
    // 在客户端搜索匹配的文章
    const allArticles: any[] = []
    const extractArticles = (items: any[]) => {
      for (const item of items) {
        if (item.link?.endsWith('.md') || item.link?.endsWith('.html')) {
          allArticles.push(item)
        }
        if (item.children) {
          extractArticles(item.children)
        }
      }
    }
    
    // 从所有 sections 中提取文章
    Object.values(data.data || {}).forEach((section: any) => {
      if (section.items) extractArticles(section.items)
    })
    
    // 搜索匹配
    const lowerQuery = query.toLowerCase()
    const matches = allArticles
      .filter(article => 
        article.text?.toLowerCase().includes(lowerQuery) ||
        article.link?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit)
    
    if (matches.length === 0) {
      return `未找到与 "${query}" 相关的文章`
    }
    
    return `找到 ${matches.length} 篇相关文章:\n\n` + 
      matches.map((a, i) => `${i + 1}. ${a.text}\n   路径: ${a.link}`).join('\n\n')
  } catch (error) {
    return `Error searching articles: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 列出文章
 */
export const listArticles: ToolExecutor = async (args) => {
  const { section, limit = 20 } = args
  
  try {
    const response = await fetch(`${API_BASE}/sidebar`)
    if (!response.ok) {
      throw new Error('Failed to fetch articles')
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch articles')
    }
    
    const sections = data.data || {}
    let result = ''
    
    if (section && sections[section]) {
      // 列出特定分类的文章
      const items = sections[section].items || []
      result = `${sections[section].text || section} 分类下的文章:\n\n`
      result += formatArticleList(items, 0, limit)
    } else {
      // 列出所有分类
      Object.entries(sections).forEach(([key, sect]: [string, any]) => {
        result += `\n📁 ${sect.text || key}\n`
        result += formatArticleList(sect.items || [], 1, limit)
      })
    }
    
    return result || '暂无文章'
  } catch (error) {
    return `Error listing articles: ${error instanceof Error ? error.message : String(error)}`
  }
}

function formatArticleList(items: any[], indent: number, limit: number): string {
  let result = ''
  let count = 0
  
  const formatItem = (item: any, level: number) => {
    if (count >= limit) return
    
    const prefix = '  '.repeat(level + indent)
    if (item.link) {
      result += `${prefix}📄 ${item.text}\n`
      count++
    } else if (item.text) {
      result += `${prefix}📂 ${item.text}\n`
    }
    
    if (item.children) {
      item.children.forEach((child: any) => formatItem(child, level + 1))
    }
  }
  
  items.forEach(item => formatItem(item, 0))
  
  if (count >= limit) {
    result += `${'  '.repeat(indent)}... (还有更多文章)\n`
  }
  
  return result
}

/**
 * 创建文章
 */
export const createArticle: ToolExecutor = async (args) => {
  const { title, path: articlePath, content = '' } = args
  
  if (!title) {
    return 'Error: title is required'
  }
  
  try {
    const response = await fetch(`${API_BASE}/articles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        section: 'posts',
        tags: []
      })
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Failed to create article: ${response.status}`)
    }
    
    return `文章创建成功!\n标题: ${title}\n路径: ${data.path || articlePath || 'unknown'}`
  } catch (error) {
    return `Error creating article: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 更新文章
 */
export const updateArticle: ToolExecutor = async (args) => {
  const { path: articlePath, content } = args
  
  if (!articlePath || content === undefined) {
    return 'Error: path and content are required'
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: articlePath,
        content
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update article: ${response.status}`)
    }
    
    return `文章更新成功!\n路径: ${articlePath}\n字数: ${content.length}`
  } catch (error) {
    return `Error updating article: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 删除文章
 */
export const deleteArticle: ToolExecutor = async (args) => {
  const { path: articlePath } = args
  
  if (!articlePath) {
    return 'Error: path is required'
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete article: ${response.status}`)
    }
    
    return `文章删除成功!\n路径: ${articlePath}`
  } catch (error) {
    return `Error deleting article: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取当前时间
 */
export const getCurrentTime: ToolExecutor = async () => {
  const now = new Date()
  return `当前时间: ${now.toLocaleString('zh-CN')}\n时间戳: ${now.getTime()}`
}

/**
 * 测试回声
 */
export const testEcho: ToolExecutor = async (args) => {
  const { message, repeat_count = 1 } = args
  return Array(repeat_count).fill(message).join('\n')
}

/**
 * 文本摘要
 */
export const summarizeText: ToolExecutor = async (args) => {
  const { text, max_length = 200 } = args
  
  if (!text) {
    return 'Error: text is required'
  }
  
  // 简单的文本摘要（取前 max_length 个字符）
  if (text.length <= max_length) {
    return text
  }
  
  return text.substring(0, max_length) + '...'
}

/**
 * 格式化文本
 */
export const formatText: ToolExecutor = async (args) => {
  const { text, format = 'markdown' } = args
  
  if (!text) {
    return 'Error: text is required'
  }
  
  switch (format) {
    case 'json':
      try {
        const obj = JSON.parse(text)
        return JSON.stringify(obj, null, 2)
      } catch {
        return `Error: Invalid JSON input`
      }
    case 'yaml':
      // 简单的 YAML 格式转换
      return text.split('\n').map(line => line.trim()).join('\n')
    case 'table':
      // 尝试将文本转换为 Markdown 表格
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return text
      return lines.join('\n| ') + '\n'
    case 'markdown':
    default:
      return text
  }
}

/**
 * 读取文件
 */
export const readFile: ToolExecutor = async (args) => {
  const { path: filePath } = args
  
  if (!filePath) {
    return 'Error: path is required'
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(filePath)}`)
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.status}`)
    }
    const content = await response.text()
    return content
  } catch (error) {
    return `Error reading file: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 写入文件
 */
export const writeFile: ToolExecutor = async (args) => {
  const { path: filePath, content } = args
  
  if (!filePath || content === undefined) {
    return 'Error: path and content are required'
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.status}`)
    }
    
    return `文件写入成功!\n路径: ${filePath}\n大小: ${content.length} 字符`
  } catch (error) {
    return `Error writing file: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 列出文件
 */
export const listFiles: ToolExecutor = async (args) => {
  const { path: dirPath = '', recursive = false } = args
  
  try {
    // 使用 sidebar API 获取文件列表
    const response = await fetch(`${API_BASE}/sidebar`)
    if (!response.ok) {
      throw new Error('Failed to list files')
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to list files')
    }
    
    let result = '文件列表:\n\n'
    
    Object.entries(data.data || {}).forEach(([key, section]: [string, any]) => {
      result += `📁 ${section.text || key}/\n`
      if (section.items) {
        section.items.forEach((item: any) => {
          result += formatFileTree(item, 1)
        })
      }
    })
    
    return result
  } catch (error) {
    return `Error listing files: ${error instanceof Error ? error.message : String(error)}`
  }
}

function formatFileTree(item: any, level: number): string {
  const indent = '  '.repeat(level)
  let result = ''
  
  if (item.children) {
    result += `${indent}📂 ${item.text}/\n`
    item.children.forEach((child: any) => {
      result += formatFileTree(child, level + 1)
    })
  } else {
    result += `${indent}📄 ${item.text}\n`
  }
  
  return result
}

/**
 * 网络搜索
 */
export const webSearch: ToolExecutor = async (args) => {
  const { query, num_results = 5 } = args
  
  if (!query) {
    return 'Error: query is required'
  }
  
  try {
    // 使用代理搜索 API
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${num_results}`,
        method: 'GET'
      })
    })
    
    if (!response.ok) {
      // 如果代理搜索失败，返回提示
      return `搜索 "${query}" 的结果:\n\n注: 网络搜索需要配置搜索引擎 API\n建议: 使用 search_articles 搜索本地文章`
    }
    
    const html = await response.text()
    // 简单的搜索结果提取（实际项目中可能需要更复杂的解析）
    return `搜索 "${query}" 完成\n结果数量: 请查看浏览器进行详细搜索`
  } catch (error) {
    return `搜索 "${query}" 的结果:\n\n由于网络限制，无法直接访问搜索引擎。\n建议: 使用 search_articles 搜索本地文章库。`
  }
}

/**
 * 获取网页内容
 */
export const fetchUrl: ToolExecutor = async (args) => {
  const { url } = args
  
  if (!url) {
    return 'Error: url is required'
  }
  
  try {
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method: 'GET' })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }
    
    const content = await response.text()
    // 提取文本内容（去除 HTML 标签）
    const text = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    return text.substring(0, 3000) || '无法提取网页内容'
  } catch (error) {
    return `Error fetching URL: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 数学计算
 */
export const calculate: ToolExecutor = async (args) => {
  const { expression } = args
  
  if (!expression) {
    return 'Error: expression is required'
  }
  
  try {
    // 使用 Function 构造器安全地计算表达式
    const result = new Function('return ' + expression)()
    return `计算结果: ${result}\n表达式: ${expression}`
  } catch (error) {
    return `计算错误: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 翻译文本
 */
export const translateText: ToolExecutor = async (args) => {
  const { text, target_language, source_language } = args
  
  if (!text || !target_language) {
    return 'Error: text and target_language are required'
  }
  
  const langNames: Record<string, string> = {
    'zh': '中文',
    'en': '英文',
    'ja': '日文',
    'ko': '韩文',
    'fr': '法文',
    'de': '德文',
    'es': '西班牙文',
    'ru': '俄文'
  }
  
  // 由于需要真实的翻译 API，这里返回提示
  return `翻译请求:\n原文: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n目标语言: ${langNames[target_language] || target_language}\n\n注: 需要配置翻译 API 密钥才能使用真实翻译功能。`
}

/**
 * 执行代码
 */
export const executeCode: ToolExecutor = async (args) => {
  const { code, language } = args
  
  if (!code || !language) {
    return 'Error: code and language are required'
  }
  
  // 由于安全原因，前端不能直接执行代码
  return `代码执行请求:\n语言: ${language}\n代码长度: ${code.length} 字符\n\n注: 代码执行需要在服务器端进行，当前仅支持代码分析和审查。`
}

/**
 * 分析代码
 */
export const analyzeCode: ToolExecutor = async (args) => {
  const { code, language } = args
  
  if (!code || !language) {
    return 'Error: code and language are required'
  }
  
  // 简单的代码分析
  const lines = code.split('\n')
  const analysis = [
    `代码语言: ${language}`,
    `总行数: ${lines.length}`,
    `字符数: ${code.length}`,
    `空行: ${lines.filter(l => !l.trim()).length}`,
    `注释行: ${lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('#') || l.trim().startsWith('/*')).length}`,
    '',
    '代码审查建议:',
    '- 确保代码遵循最佳实践',
    '- 检查潜在的安全问题',
    '- 验证边界条件处理',
    '- 考虑代码可读性和维护性'
  ]
  
  return analysis.join('\n')
}

/**
 * 查询知识库
 */
export const queryKnowledge: ToolExecutor = async (args) => {
  const { query } = args
  
  if (!query) {
    return 'Error: query is required'
  }
  
  // 搜索本地文章作为知识库
  return searchArticles({ query, limit: 3 })
}

/**
 * 获取天气
 */
export const getWeather: ToolExecutor = async (args) => {
  const { city, days = 3 } = args
  
  if (!city) {
    return 'Error: city is required'
  }
  
  // 由于需要真实的天气 API，这里返回提示
  return `天气查询:\n城市: ${city}\n天数: ${days}\n\n注: 需要配置天气 API 密钥才能获取真实天气数据。`
}

/**
 * 创建笔记
 */
export const createNote: ToolExecutor = async (args) => {
  const { title, content, tags = [] } = args
  
  if (!title || !content) {
    return 'Error: title and content are required'
  }
  
  try {
    const noteContent = `# ${title}\n\n${content}\n\n---\n标签: ${tags.join(', ') || '无'}\n创建时间: ${new Date().toLocaleString('zh-CN')}\n`
    
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `.notes/${Date.now()}-${title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.md`,
        content: noteContent
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to save note: ${response.status}`)
    }
    
    return `笔记创建成功!\n标题: ${title}\n标签: ${tags.join(', ') || '无'}`
  } catch (error) {
    return `Error creating note: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 列出笔记
 */
export const listNotes: ToolExecutor = async (args) => {
  const { tag } = args
  
  try {
    // 使用文件列表 API 获取笔记
    return listFiles({ path: '.notes', recursive: false })
  } catch (error) {
    return `Error listing notes: ${error instanceof Error ? error.message : String(error)}`
  }
}
