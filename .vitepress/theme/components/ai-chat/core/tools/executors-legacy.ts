/**
 * 工具执行器 - 真正调用后端 API
 * 
 * 所有工具执行器都通过 fetch 调用后端 API 实现
 */

import type { ToolExecutor } from './types'

// API 基础路径
const API_BASE = '/api'

/**
 * 将 URL 路径转换为文件路径
 * 例如：/sections/knowledge/rl-math-principle/ -> sections/knowledge/rl-math-principle/index.md
 * 例如：/sections/posts/article -> sections/posts/article.md
 */
function normalizeFilePath(inputPath: string): string {
  if (!inputPath) return ''
  
  let path = inputPath
  
  // 移除开头的 /
  if (path.startsWith('/')) {
    path = path.slice(1)
  }
  
  // 如果以 / 结尾，是文件夹，需要添加 index.md
  if (path.endsWith('/')) {
    path = path + 'index.md'
  }
  
  // 如果不以 .md 结尾，添加 .md
  if (!path.endsWith('.md')) {
    path = path + '.md'
  }
  
  // 如果没有 sections/ 前缀，添加它
  if (!path.startsWith('sections/')) {
    path = 'sections/' + path
  }
  
  return path
}

/**
 * 提取 frontmatter 元数据
 */
function extractFrontmatter(content: string): { metadata: Record<string, any>; body: string } {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!fmMatch) return { metadata: {}, body: content }
  
  const metadata: Record<string, any> = {}
  const fmContent = fmMatch[1]
  
  // 简单解析 YAML frontmatter
  fmContent.split('\n').forEach((line: string) => {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      let value = line.slice(colonIdx + 1).trim()
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      metadata[key] = value
    }
  })
  
  return { metadata, body: content.slice(fmMatch[0].length) }
}

/**
 * 获取文章内容 - 增强版
 * 支持：路径格式自动转换、行范围读取、元数据提取
 */
export const getArticleContent: ToolExecutor = async (args) => {
  const { path, max_length = 8000, start_line, end_line, include_metadata = false } = args
  
  // 验证 path 参数
  if (!path) {
    return `❌ 错误：缺少 path 参数

使用说明：
1. 必须先调用 list_articles 或 search_articles 获取文章路径
2. path 可以是 URL 格式（如 "/sections/knowledge/rl-math-principle/"）或文件路径（如 "sections/posts/article.md"）
3. 不能传入文章标题`
  }
  
  // 检查 path 是否可能是标题（包含中文标点或过长）
  if (path.includes('：') || path.includes('，') || path.includes('。') || (path.length > 100 && !path.includes('/'))) {
    return `❌ 错误：传入的 path 看起来像是文章标题，而不是文件路径

传入值: "${path}"

正确用法：
1. 先调用 search_articles(query="你要找的内容") 搜索文章
2. 从搜索结果中获取 path（如 "/sections/knowledge/deep-learning/"）
3. 再调用 get_article_content(path="/sections/knowledge/deep-learning/")`
  }
  
  // 验证行号参数
  if (start_line !== undefined && (!Number.isInteger(start_line) || start_line < 1)) {
    return `❌ 错误：start_line 必须是大于等于 1 的整数`
  }
  if (end_line !== undefined && (!Number.isInteger(end_line) || end_line < 1)) {
    return `❌ 错误：end_line 必须是大于等于 1 的整数`
  }
  if (start_line && end_line && start_line > end_line) {
    return `❌ 错误：start_line (${start_line}) 不能大于 end_line (${end_line})`
  }
  
  // 转换路径格式
  const normalizedPath = normalizeFilePath(path)
  
  try {
    const response = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(normalizedPath)}`)
    if (!response.ok) {
      if (response.status === 404) {
        return `❌ 文件未找到

尝试读取: "${normalizedPath}"
原始路径: "${path}"

可能原因：
1. 路径不正确
2. 文件不存在

解决方法：
1. 调用 list_articles() 查看所有文章
2. 或调用 search_articles(query="关键词") 搜索文章
3. 使用搜索结果中的路径格式，例如：
   - /sections/knowledge/folder-name/ （文件夹）
   - /sections/posts/article-name （文件）`
      }
      return `❌ HTTP 错误: ${response.status}\n\n请求 URL: ${response.url}\n建议：检查网络连接或稍后重试`
    }
    
    let content = await response.text()
    
    // 提取元数据（如果需要）
    let metadata: Record<string, any> = {}
    if (include_metadata) {
      const result = extractFrontmatter(content)
      metadata = result.metadata
      content = result.body
    }
    
    // 按行号截取
    const lines = content.split('\n')
    const totalLines = lines.length
    
    let startIdx = 0
    let endIdx = lines.length
    
    if (start_line !== undefined) {
      startIdx = Math.max(0, start_line - 1)
    }
    if (end_line !== undefined) {
      endIdx = Math.min(lines.length, end_line)
    }
    
    if (start_line || end_line) {
      content = lines.slice(startIdx, endIdx).join('\n')
    }
    
    // 长度限制
    let result = content
    const isTruncated = content.length > max_length
    if (isTruncated) {
      result = content.substring(0, max_length) + '\n\n... [内容已截断，总长度 ' + content.length + ' 字符]'
    }
    
    // 添加行号信息
    const lineInfo = start_line || end_line 
      ? `\n[显示第 ${startIdx + 1}-${endIdx} 行，共 ${totalLines} 行]`
      : `\n[共 ${totalLines} 行]`
    
    // 添加元数据信息
    let metaInfo = ''
    if (include_metadata && Object.keys(metadata).length > 0) {
      metaInfo = '\n📋 元数据:\n' + Object.entries(metadata)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n') + '\n'
    }
    
    return result + lineInfo + metaInfo
  } catch (error) {
    return `❌ 读取失败: ${error instanceof Error ? error.message : String(error)}

路径: ${normalizedPath}`
  }
}

/**
 * 搜索文章 - 增强版
 * 支持：分类筛选、包含/排除文件夹、结果排序
 */
export const searchArticles: ToolExecutor = async (args) => {
  const { query, section, limit = 5, include_folders = true } = args
  
  // 参数验证
  if (!query || typeof query !== 'string') {
    return `❌ 错误：请提供搜索关键词

示例：
- search_articles(query="Docker")
- search_articles(query="深度学习", limit=3)
- search_articles(query="算法", section="knowledge", limit=10)`
  }
  
  // 限制最大结果数
  const actualLimit = Math.min(Math.max(1, limit), 20)
  
  try {
    // 获取所有 section 的数据或指定 section
    const sectionsToSearch = section ? [section] : ['knowledge', 'posts', 'about']
    let allItems: any[] = []
    
    for (const sec of sectionsToSearch) {
      try {
        const response = await fetch(`${API_BASE}/sidebar?section=${encodeURIComponent(sec)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            allItems = allItems.concat(data.data)
          }
        }
      } catch (e) {
        // 忽略单个 section 的错误
      }
    }
    
    if (allItems.length === 0) {
      return `📭 没有找到任何文章

建议：
1. 确认 knowledge base 中有文章
2. 尝试调用 list_articles() 查看所有文章`
    }
    
    // 在客户端搜索匹配的文章
    const allEntries: any[] = []
    const extractEntries = (items: any[], parentPath: string = '') => {
      for (const item of items) {
        // 收集文件
        if (item.link && (item.link.endsWith('.md') || item.link.endsWith('.html') || item.link.endsWith('/'))) {
          allEntries.push({
            ...item,
            fullPath: parentPath + (item.text || '')
          })
        }
        // 如果选择包含文件夹，也收集文件夹
        if (include_folders && item.items && item.collapsed !== undefined) {
          allEntries.push({
            text: item.text,
            link: item.link,
            isFolder: true,
            fullPath: parentPath + (item.text || '')
          })
        }
        // 递归处理子项
        if (item.items) {
          extractEntries(item.items, parentPath + (item.text || '') + ' > ')
        }
      }
    }
    
    allItems.forEach((section: any) => {
      if (section.items) extractEntries(section.items)
    })
    
    // 搜索匹配（标题、路径）
    const lowerQuery = query.toLowerCase()
    const keywords = lowerQuery.split(/\s+/).filter(k => k.length > 0)
    
    const matches = allEntries
      .filter(entry => {
        const text = (entry.text || '').toLowerCase()
        const link = (entry.link || '').toLowerCase()
        const fullPath = (entry.fullPath || '').toLowerCase()
        
        // 支持多关键词匹配（AND 逻辑）
        return keywords.every(keyword => 
          text.includes(keyword) || 
          link.includes(keyword) || 
          fullPath.includes(keyword)
        )
      })
      .slice(0, actualLimit)
    
    if (matches.length === 0) {
      return `🔍 未找到与 "${query}" 相关的文章

建议：
1. 尝试简化关键词，如搜索 "Docker" 而不是 "Docker容器化部署"
2. 尝试相关词汇，如用 "container" 代替 "容器"
3. 调用 list_articles(section="${section || 'knowledge'}") 浏览该分类
4. 检查关键词拼写`
    }
    
    // 格式化结果
    const folderCount = matches.filter(m => m.isFolder).length
    const fileCount = matches.length - folderCount
    
    return `🔍 找到 ${matches.length} 个结果（${fileCount} 个文件${folderCount > 0 ? `, ${folderCount} 个文件夹` : ''}）:

` + 
      matches.map((a, i) => {
        const icon = a.isFolder ? '📁' : '📄'
        const type = a.isFolder ? '文件夹' : '文件'
        return `${i + 1}. ${icon} ${a.text}
   类型: ${type}
   路径: "${a.link}"`
      }).join('\n\n') +
      `

💡 使用示例：
- 读取文件: get_article_content(path="${matches.find(m => !m.isFolder)?.link || matches[0]?.link}")
- 浏览文件夹: list_articles(folder_path="${matches.find(m => m.isFolder)?.link || '/sections/knowledge/'}")`
  } catch (error) {
    return `❌ 搜索失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 列出文章 - 增强版
 * 支持：分类筛选、文件夹浏览、递归展开、排序
 */
export const listArticles: ToolExecutor = async (args) => {
  const { section, folder_path, limit = 20, recursive = false, sort_by = 'category' } = args
  
  // 验证参数
  const actualLimit = Math.min(Math.max(1, limit), 100)
  
  try {
    // 如果指定了 folder_path，需要先转换并列出该文件夹
    if (folder_path) {
      // 尝试从 folder_path 提取 section
      const folderSection = folder_path.split('/')[1] // /sections/xxx/ -> xxx
      if (folderSection) {
        const response = await fetch(`${API_BASE}/sidebar?section=${encodeURIComponent(folderSection)}`)
        if (response.ok) {
          const data = await response.json()
          // 递归查找文件夹
          const findFolder = (items: any[], targetPath: string): any[] | null => {
            for (const item of items) {
              if (item.link === targetPath || item.link === targetPath + '/') {
                return item.items || []
              }
              if (item.items) {
                const found = findFolder(item.items, targetPath)
                if (found) return found
              }
            }
            return null
          }
          
          if (data.success && data.data) {
            const items = findFolder(data.data, folder_path)
            if (items) {
              let result = `📁 ${folder_path} 下的内容:\n\n`
              result += formatArticleList(items, 0, actualLimit, recursive)
              result += `\n\n💡 提示：使用 get_article_content(path="${folder_path}") 读取文件夹索引`
              return result
            }
          }
        }
      }
      return `❌ 未找到文件夹: ${folder_path}\n\n建议：使用 list_articles(section="${section || 'knowledge'}") 查看可用的文件夹`
    }
    
    // 获取文章列表
    const response = await fetch(`${API_BASE}/sidebar`)
    if (!response.ok) {
      return `❌ 无法获取文章列表: HTTP ${response.status}\n\n建议：\n1. 检查网络连接\n2. 稍后重试\n3. 查看服务器日志获取详细信息`
    }
    
    const data = await response.json()
    if (!data.success) {
      return `❌ 获取文章列表失败: ${data.error || '未知错误'}\n\n建议：联系管理员查看服务器状态`
    }
    
    const sections = data.data || {}
    
    if (Object.keys(sections).length === 0) {
      return '📭 暂无文章\n\n提示：使用 create_article 创建新文章'
    }
    
    // 构建结果
    let result = '📚 文章列表:\n'
    let totalCount = 0
    
    if (section && sections[section]) {
      // 列出特定分类的文章
      const items = sections[section].items || []
      result = `📁 ${sections[section].text || section} 分类下的文章:\n\n`
      const formatted = formatArticleList(items, 0, actualLimit, recursive)
      result += formatted
      
      // 统计数量
      const countItems = (items: any[]): number => {
        return items.reduce((acc, item) => {
          let count = item.link ? 1 : 0
          if (item.items) count += countItems(item.items)
          return acc + count
        }, 0)
      }
      totalCount = countItems(items)
    } else {
      // 列出所有分类
      Object.entries(sections).forEach(([key, sect]: [string, any]) => {
        result += `\n📁 ${sect.text || key}\n`
        const formatted = formatArticleList(sect.items || [], 1, Math.floor(actualLimit / Object.keys(sections).length), recursive)
        result += formatted
      })
    }
    
    result += `\n\n📊 统计：显示 ${Math.min(actualLimit, totalCount)} 个条目`
    result += '\n\n💡 使用示例：'
    result += '\n- 读取文章: get_article_content(path="/sections/knowledge/article/")'
    result += '\n- 浏览子文件夹: list_articles(folder_path="/sections/knowledge/subfolder/")'
    result += '\n- 递归展开: list_articles(recursive=true, limit=50)'
    return result
  } catch (error) {
    return `❌ 获取文章列表失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

function formatArticleList(items: any[], indent: number, limit: number, recursive: boolean = false): string {
  let result = ''
  let count = 0
  
  const formatItem = (item: any, level: number) => {
    if (count >= limit) return
    
    const prefix = '  '.repeat(level + indent)
    
    if (item.link) {
      // 判断是文件夹还是文件
      const isFolder = item.link.endsWith('/')
      const icon = isFolder ? '📁' : '📄'
      const type = isFolder ? '文件夹' : '文件'
      
      result += `${prefix}${icon} ${item.text}\n${prefix}   路径: "${item.link}"\n`
      count++
      
      // 递归处理子项
      if (recursive && item.items && item.items.length > 0) {
        item.items.forEach((child: any) => formatItem(child, level + 1))
      }
    } else if (item.text && item.items) {
      // 有子项但没有 link 的文件夹
      result += `${prefix}📂 ${item.text}/\n`
      if (recursive || count < limit) {
        item.items.forEach((child: any) => formatItem(child, level + 1))
      }
    }
  }
  
  items.forEach(item => formatItem(item, 0))
  
  if (count >= limit && items.some((i: any) => i.link || i.items)) {
    result += `${'  '.repeat(indent)}... (还有更多内容，使用 limit 参数查看更多)\n`
  }
  
  return result
}

/**
 * 构建 frontmatter
 */
function buildFrontmatter(metadata: Record<string, any>): string {
  if (Object.keys(metadata).length === 0) return ''
  
  const lines = ['---']
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`)
      value.forEach(v => lines.push(`  - ${v}`))
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`${key}: ${value}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  lines.push('---\n')
  return lines.join('\n')
}

/**
 * 创建文章 - 增强版
 * 支持：自动创建文件夹、添加元数据、模板内容
 */
export const createArticle: ToolExecutor = async (args) => {
  const { 
    title, 
    path: articlePath, 
    content = '', 
    tags = [], 
    category,
    author,
    create_parent_folders = true,
    overwrite = false
  } = args
  
  // 参数验证
  if (!title) {
    return `❌ 错误：title 是必填参数\n\n示例：create_article(title="我的第一篇文章", path="posts/hello.md")`
  }
  
  if (!articlePath) {
    return `❌ 错误：path 是必填参数\n\n示例：create_article(title="文章标题", path="knowledge/folder/article.md")`
  }
  
  // 清理和规范化路径
  let normalizedPath = articlePath
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1)
  }
  if (!normalizedPath.endsWith('.md')) {
    normalizedPath += '.md'
  }
  if (!normalizedPath.startsWith('sections/')) {
    normalizedPath = 'sections/' + normalizedPath
  }
  
  // 检查是否包含非法字符
  if (/[<>"|?*]/.test(normalizedPath)) {
    return `❌ 错误：路径包含非法字符\n\n路径不能包含以下字符: < > " | ? *`
  }
  
  try {
    // 构建元数据
    const metadata: Record<string, any> = {
      title,
      date: new Date().toISOString().split('T')[0]
    }
    
    if (tags && tags.length > 0) {
      metadata.tags = tags
    }
    if (category) {
      metadata.category = category
    }
    if (author) {
      metadata.author = author
    }
    
    // 构建完整内容
    const frontmatter = buildFrontmatter(metadata)
    const templateContent = content || `# ${title}\n\n在这里开始写作...\n`
    const fullContent = frontmatter + templateContent
    
    // 调用 API 创建文件
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: normalizedPath,
        content: fullContent,
        createParentFolders: create_parent_folders,
        overwrite: overwrite
      })
    })
    
    if (!response.ok) {
      if (response.status === 409) {
        return `❌ 文件已存在: ${normalizedPath}\n\n如需覆盖，请设置 overwrite=true\n或选择其他路径`
      }
      return `❌ HTTP 错误: ${response.status}\n\n请求 URL: ${response.url}\n建议：检查网络连接或稍后重试`
    }
    
    // 构建返回信息
    let result = `✅ 文章创建成功!\n\n`
    result += `📄 标题: ${title}\n`
    result += `📁 路径: ${normalizedPath}\n`
    
    if (tags.length > 0) {
      result += `🏷️ 标签: ${tags.join(', ')}\n`
    }
    if (category) {
      result += `📂 分类: ${category}\n`
    }
    
    result += `\n💡 后续操作：`
    result += `\n- 读取: get_article_content(path="/${normalizedPath.replace('.md', '')}")`
    result += `\n- 更新: update_article(path="/${normalizedPath.replace('.md', '')}", content="新内容")`
    
    return result
  } catch (error) {
    return `❌ 创建失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 更新文章 - 增强版
 * 支持：完整替换、追加、插入、dry_run 预览
 */
export const updateArticle: ToolExecutor = async (args) => {
  const { 
    path: articlePath, 
    content, 
    mode = 'replace',
    position,
    after_section,
    preserve_frontmatter = true,
    dry_run = false
  } = args
  
  // 参数验证
  if (!articlePath) {
    return `❌ 错误：path 是必填参数\n\n示例：update_article(path="/sections/posts/article", content="新内容")`
  }
  
  if (content === undefined) {
    return `❌ 错误：content 是必填参数`
  }
  
  // 验证 mode 参数
  const validModes = ['replace', 'append', 'prepend', 'insert']
  if (!validModes.includes(mode)) {
    return `❌ 错误：mode 必须是以下之一: ${validModes.join(', ')}`
  }
  
  // 转换路径格式
  const normalizedPath = normalizeFilePath(articlePath)
  
  try {
    // 如果不是 replace 模式，需要先读取原文件
    let finalContent = content
    let existingContent = ''
    let existingFrontmatter = ''
    
    if (mode !== 'replace' || preserve_frontmatter) {
      try {
        const readResponse = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(normalizedPath)}`)
        if (readResponse.ok) {
          existingContent = await readResponse.text()
          
          // 提取 frontmatter
          const fmMatch = existingContent.match(/^---\n([\s\S]*?)\n---\n/)
          if (fmMatch) {
            existingFrontmatter = fmMatch[0]
            if (preserve_frontmatter && mode === 'replace') {
              // 保留 frontmatter，只替换 body
              const bodyContent = existingContent.slice(fmMatch[0].length)
              finalContent = existingFrontmatter + content
            }
          }
        }
      } catch (e) {
        // 文件不存在，如果是追加/插入模式则报错
        if (mode !== 'replace') {
          return `❌ 文件不存在，无法执行 ${mode} 操作\n\n路径: ${normalizedPath}\n\n如需创建新文件，请使用 create_article`
        }
      }
    }
    
    // 根据 mode 处理内容
    if (mode === 'append') {
      finalContent = existingContent + '\n\n' + content
    } else if (mode === 'prepend') {
      // 如果保留 frontmatter，需要在 frontmatter 后插入
      if (existingFrontmatter && preserve_frontmatter) {
        finalContent = existingFrontmatter + content + '\n\n' + existingContent.slice(existingFrontmatter.length)
      } else {
        finalContent = content + '\n\n' + existingContent
      }
    } else if (mode === 'insert') {
      if (after_section) {
        // 在指定章节后插入
        const sectionRegex = new RegExp(`(${after_section}.*?\\n)`, 'i')
        const match = existingContent.match(sectionRegex)
        if (match) {
          const insertPos = match.index! + match[0].length
          finalContent = existingContent.slice(0, insertPos) + '\n' + content + '\n' + existingContent.slice(insertPos)
        } else {
          return `❌ 未找到指定章节: "${after_section}"\n\n将在文章末尾追加内容\n\n可用章节标题：\n${existingContent.match(/^#+\s+.+$/gm)?.join('\n') || '（未找到章节标题）'}`
        }
      } else if (position !== undefined) {
        // 在指定位置插入
        const insertPos = Math.max(0, Math.min(position, existingContent.length))
        finalContent = existingContent.slice(0, insertPos) + content + existingContent.slice(insertPos)
      } else {
        return `❌ insert 模式需要指定 position 或 after_section 参数`
      }
    }
    
    // dry_run 模式：返回预览
    if (dry_run) {
      const previewLength = Math.min(500, finalContent.length)
      return `🔍 更新预览 (dry_run=true)\n\n路径: ${normalizedPath}\n模式: ${mode}\n\n新内容预览 (前 ${previewLength} 字符):\n---\n${finalContent.slice(0, previewLength)}${finalContent.length > previewLength ? '...' : ''}\n---\n\n总字数: ${finalContent.length}\n\n💡 确认无误后，设置 dry_run=false 执行实际更新`
    }
    
    // 执行更新
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: normalizedPath,
        content: finalContent
      })
    })
    
    if (!response.ok) {
      return `❌ HTTP 错误: ${response.status}\n\n请求 URL: ${response.url}\n建议：检查网络连接或稍后重试`
    }
    
    // 构建返回信息
    let result = `✅ 文章更新成功!\n\n`
    result += `📄 路径: ${normalizedPath}\n`
    result += `📝 模式: ${mode}\n`
    result += `📊 新字数: ${finalContent.length}\n`
    
    if (mode !== 'replace') {
      result += `📈 原字数: ${existingContent.length} (+${finalContent.length - existingContent.length})\n`
    }
    
    return result
  } catch (error) {
    return `❌ 更新失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 删除文章 - 增强版
 * 支持：安全确认、备份、删除空父文件夹
 */
export const deleteArticle: ToolExecutor = async (args) => {
  const { path: articlePath, confirm = false, delete_empty_parent = false, backup_first = false } = args
  
  // 参数验证
  if (!articlePath) {
    return `❌ 错误：缺少 path 参数

示例：
- delete_article(path="/sections/posts/old-article", confirm=true)
- delete_article(path="/sections/knowledge/folder/", confirm=true, backup_first=true)`
  }
  
  // 安全检查
  if (!confirm) {
    return `⚠️ 安全确认提示

即将删除: ${articlePath}

此操作不可逆！如需继续，请设置 confirm=true

建议操作：
1. 先读取文章确认内容: get_article_content(path="${articlePath}")
2. 如需备份: delete_article(path="${articlePath}", confirm=true, backup_first=true)
3. 确认删除: delete_article(path="${articlePath}", confirm=true)`
  }
  
  // 转换路径格式
  const normalizedPath = normalizeFilePath(articlePath)
  
  // 防止删除整个 sections 目录
  const pathParts = normalizedPath.split('/').filter(p => p)
  if (pathParts.length < 2) {
    return `❌ 错误：不允许删除根目录或一级目录\n\n路径: ${normalizedPath}\n\n只能删除具体文章或子文件夹`
  }
  
  try {
    // 先读取内容用于备份
    let backupContent = ''
    if (backup_first) {
      try {
        const readResponse = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(normalizedPath)}`)
        if (readResponse.ok) {
          backupContent = await readResponse.text()
        }
      } catch (e) {
        // 忽略读取错误
      }
    }
    
    // 执行删除
    const response = await fetch(`${API_BASE}/files/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        path: normalizedPath,
        deleteEmptyParent: delete_empty_parent
      })
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return `❌ 文件不存在: ${normalizedPath}\n\n请检查路径是否正确`
      }
      return `❌ HTTP 错误: ${response.status}\n\n请求 URL: ${response.url}\n建议：检查网络连接或稍后重试`
    }
    
    // 如果有备份内容，保存到备份目录
    if (backup_first && backupContent) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = `.trash/${pathParts.join('/')}.${timestamp}.bak`
      try {
        await fetch(`${API_BASE}/files/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: backupPath,
            content: backupContent,
            createParentFolders: true
          })
        })
      } catch (e) {
        // 备份失败不影响删除结果
      }
    }
    
    // 构建返回信息
    let result = `✅ 删除成功!\n\n`
    result += `📄 路径: ${normalizedPath}\n`
    
    if (backup_first) {
      result += `💾 已备份到: .trash/ 目录\n`
    }
    if (delete_empty_parent) {
      result += `🗑️ 已清理空父文件夹\n`
    }
    
    result += `\n⚠️ 如需恢复，请从备份目录手动恢复或使用版本控制`
    
    return result
  } catch (error) {
    return `❌ 删除失败: ${error instanceof Error ? error.message : String(error)}`
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
      return text.split('\n').map((line: string) => line.trim()).join('\n')
    case 'table':
      // 尝试将文本转换为 Markdown 表格
      const lines = text.split('\n').filter((l: string) => l.trim())
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
    return `❌ 错误：请提供文件路径

示例：
- read_file(path="sections/posts/article.md")
- read_file(path="docs/guide.md")`
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(filePath)}`)
    if (!response.ok) {
      if (response.status === 404) {
        return `❌ 文件未找到: "${filePath}"

建议：
1. 使用 list_files 查看可用文件
2. 使用 search_articles 搜索文件`
      }
      return `❌ HTTP 错误: ${response.status}\n\n请求 URL: ${response.url}\n建议：检查网络连接或稍后重试`
    }
    const content = await response.text()
    return content
  } catch (error) {
    return `❌ 读取文件失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 写入文件
 */
export const writeFile: ToolExecutor = async (args) => {
  const { path: filePath, content } = args
  
  if (!filePath) {
    return `❌ 错误：请提供文件路径`
  }
  if (content === undefined) {
    return `❌ 错误：请提供文件内容`
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content })
    })
    
    if (!response.ok) {
      return `❌ HTTP 错误: ${response.status}\n\n请求 URL: ${response.url}\n建议：检查网络连接或稍后重试`
    }
    
    return `✅ 文件写入成功!
📄 路径: ${filePath}
📊 大小: ${content.length} 字符`
  } catch (error) {
    return `❌ 写入文件失败: ${error instanceof Error ? error.message : String(error)}`
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
      return `❌ 无法获取文件列表: HTTP ${response.status}\n\n建议：检查网络连接或稍后重试`
    }
    
    const data = await response.json()
    if (!data.success) {
      return `❌ 获取文件列表失败: ${data.error || '未知错误'}\n\n建议：联系管理员查看服务器状态`
    }
    
    const sections = data.data || {}
    if (Object.keys(sections).length === 0) {
      return '📭 暂无文件\n\n提示：使用 write_file 创建新文件'
    }
    
    let result = '📁 文件列表:\n\n'
    
    Object.entries(sections).forEach(([key, section]: [string, any]) => {
      result += `📂 ${section.text || key}/\n`
      if (section.items) {
        section.items.forEach((item: any) => {
          result += formatFileTree(item, 1)
        })
      }
    })
    
    return result
  } catch (error) {
    return `❌ 获取文件列表失败: ${error instanceof Error ? error.message : String(error)}`
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
/**
 * 获取 URL 内容 - 增强版
 * 支持：自定义 HTTP 方法、请求头、请求体、超时控制
 */
export const fetchUrl: ToolExecutor = async (args) => {
  const { 
    url, 
    method = 'GET', 
    headers = {}, 
    body,
    timeout = 10000,
    max_length = 15000 
  } = args
  
  if (!url) {
    return `❌ 错误：url 是必填参数

示例：
- fetch_url(url="https://api.github.com/users/octocat")
- fetch_url(url="https://example.com/api", method="POST", headers={"Authorization":"Bearer token"})`
  }
  
  // 验证 URL 格式
  try {
    new URL(url)
  } catch {
    return `❌ 错误：无效的 URL 格式 "${url}"`
  }
  
  // 验证 HTTP 方法
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  const httpMethod = method.toUpperCase()
  if (!validMethods.includes(httpMethod)) {
    return `❌ 错误：method 必须是以下之一: ${validMethods.join(', ')}`
  }
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const fetchOptions: RequestInit = {
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: controller.signal
    }
    
    if (body && ['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }
    
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method: httpMethod,
        headers: fetchOptions.headers,
        body: fetchOptions.body,
        timeout
      })
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      // 尝试解析详细的错误信息
      let errorDetail = ''
      try {
        const errorJson = await response.json()
        errorDetail = errorJson.error || errorJson.message || ''
      } catch {
        errorDetail = await response.text()
      }
      
      if (response.status === 404) {
        return `❌ 资源未找到 (404)\n\nURL: ${url}`
      }
      if (response.status === 401 || response.status === 403) {
        return `❌ 访问被拒绝 (${response.status})\n\nURL: ${url}\n\n可能需要身份验证或权限不足`
      }
      if (response.status === 504 || response.status === 502) {
        return `❌ 网关错误 (${response.status})\n\nURL: ${url}\n\n${errorDetail}\n\n排查建议:\n1. 检查目标网站是否可访问\n2. 尝试增加 timeout 参数（默认 10 秒）\n3. 检查本地网络连接\n4. 某些网站可能有反爬虫机制`
      }
      return `❌ HTTP 错误: ${response.status}\n详细信息: ${errorDetail || '未知错误'}\n\n建议：\n1. 检查请求参数\n2. 确认服务是否正常\n3. 稍后重试`
    }
    
    const contentType = response.headers.get('content-type') || ''
    const rawContent = await response.text()
    
    // 根据内容类型处理
    let processedContent = rawContent
    let contentInfo = ''
    
    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(rawContent)
        processedContent = JSON.stringify(jsonData, null, 2)
        contentInfo = `📦 格式: JSON\n`
      } catch {
        contentInfo = `⚠️ 格式: 声称是 JSON 但解析失败\n`
      }
    } else if (contentType.includes('text/html')) {
      // 提取文本内容（去除 HTML 标签）
      processedContent = rawContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      contentInfo = `🌐 格式: HTML (已提取文本)\n`
    } else if (contentType.includes('text/')) {
      contentInfo = `📝 格式: 纯文本\n`
    } else {
      contentInfo = `📄 格式: ${contentType || '未知'}\n`
    }
    
    // 截断内容
    const isTruncated = processedContent.length > max_length
    const displayContent = isTruncated 
      ? processedContent.substring(0, max_length) + '\n\n... [内容已截断]'
      : processedContent
    
    let result = `✅ 请求成功\n\n`
    result += `🔗 URL: ${url}\n`
    result += `📮 方法: ${httpMethod}\n`
    result += `📊 大小: ${rawContent.length.toLocaleString()} 字符\n`
    result += contentInfo
    result += `\n📝 内容:\n\n\`\`\`\n${displayContent}\n\`\`\``
    
    if (isTruncated) {
      result += `\n\n💡 提示：内容已截断，原始大小 ${rawContent.length.toLocaleString()} 字符`
    }
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return `❌ 请求超时 (${timeout}ms)\n\nURL: ${url}\n\n建议：增加 timeout 参数或使用更简单的请求`
    }
    return `❌ 请求失败: ${error instanceof Error ? error.message : String(error)}`
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
    `空行: ${lines.filter((l: string) => !l.trim()).length}`,
    `注释行: ${lines.filter((l: string) => l.trim().startsWith('//') || l.trim().startsWith('#') || l.trim().startsWith('/*')).length}`,
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
      return `❌ 保存笔记失败: HTTP ${response.status}\n\n建议：\n1. 检查网络连接\n2. 稍后重试`
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

// ============================================
// GitHub 工具执行器
// ============================================

const GITHUB_API_BASE = 'https://api.github.com'

/**
 * GitHub API 请求封装
 */
async function githubRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MetaBlog-AI-Chat',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    if (response.status === 404) {
      return `❌ GitHub API: 资源未找到 (404)\n\n可能原因：\n1. 仓库不存在\n2. 路径错误\n3. 需要身份验证\n\n建议：\n- 检查 owner 和 repo 参数\n- 确认仓库是否公开`
    }
    if (response.status === 403) {
      return `❌ GitHub API: 速率限制 (403)\n\nGitHub 对未认证的 API 请求有限制（每小时 60 次）。\n\n建议：\n1. 稍等几分钟后再试\n2. 使用 GitHub Token 进行认证\n3. 减少请求频率`
    }
      return `❌ GitHub API 错误: ${response.status}\n\n建议：\n1. 检查网络连接\n2. 确认 GitHub 服务状态\n3. 稍后重试`
  }
  
  return response.json()
}

/**
 * 获取 GitHub 仓库信息
 */
export const githubGetRepo: ToolExecutor = async (args) => {
  const { owner, repo, include_readme = true } = args
  
  if (!owner || !repo) {
    return `❌ 错误：owner 和 repo 都是必填参数

示例：github_get_repo(owner="facebook", repo="react")`
  }
  
  try {
    // 获取仓库基本信息
    const repoData = await githubRequest(`/repos/${owner}/${repo}`)
    
    let result = `📦 ${repoData.full_name}\n\n`
    result += `${repoData.description || '暂无描述'}\n\n`
    result += `⭐ Stars: ${repoData.stargazers_count.toLocaleString()}\n`
    result += `🍴 Forks: ${repoData.forks_count.toLocaleString()}\n`
    result += `👁️ Watchers: ${repoData.watchers_count.toLocaleString()}\n`
    result += `🐛 Open Issues: ${repoData.open_issues_count.toLocaleString()}\n\n`
    
    if (repoData.language) {
      result += `💻 主要语言: ${repoData.language}\n`
    }
    
    result += `📅 创建时间: ${new Date(repoData.created_at).toLocaleDateString('zh-CN')}\n`
    result += `🔄 最后更新: ${new Date(repoData.updated_at).toLocaleDateString('zh-CN')}\n\n`
    
    result += `🔗 链接:\n`
    result += `- 主页: ${repoData.html_url}\n`
    if (repoData.homepage) {
      result += `- 网站: ${repoData.homepage}\n`
    }
    
    // 获取 README 内容摘要
    if (include_readme) {
      try {
        const readmeData = await githubRequest(`/repos/${owner}/${repo}/readme`)
        if (readmeData.content) {
          const readmeContent = atob(readmeData.content)
          const readmePreview = readmeContent.slice(0, 500)
          result += `\n📝 README 预览:\n${readmePreview}${readmeContent.length > 500 ? '...' : ''}\n`
        }
      } catch (e) {
        result += `\n⚠️ 无法获取 README\n`
      }
    }
    
    result += `\n💡 其他操作:\n`
    result += `- 查看文件: github_list_repo_contents(owner="${owner}", repo="${repo}", path="")\n`
    result += `- 查看提交: github_get_commit_history(owner="${owner}", repo="${repo}")\n`
    result += `- 查看 Issues: github_get_issues(owner="${owner}", repo="${repo}")`
    
    return result
  } catch (error) {
    return `❌ 获取仓库信息失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 列出 GitHub 仓库内容
 */
export const githubListRepoContents: ToolExecutor = async (args) => {
  const { owner, repo, path = '', ref } = args
  
  if (!owner || !repo) {
    return `❌ 错误：owner 和 repo 都是必填参数`
  }
  
  try {
    let endpoint = `/repos/${owner}/${repo}/contents/${path}`
    if (ref) {
      endpoint += `?ref=${encodeURIComponent(ref)}`
    }
    
    const contents = await githubRequest(endpoint)
    
    if (!Array.isArray(contents)) {
      // 单个文件
      return `📄 文件: ${contents.name}\n\n`
        + `路径: ${contents.path}\n`
        + `大小: ${contents.size} bytes\n`
        + `类型: ${contents.type}\n`
        + `\n💡 获取内容: github_get_file_content(owner="${owner}", repo="${repo}", path="${contents.path}")`
    }
    
    // 目录列表
    let result = `📁 ${owner}/${repo}/${path || ''}\n\n`
    
    // 分离文件夹和文件
    const dirs = contents.filter((item: any) => item.type === 'dir')
    const files = contents.filter((item: any) => item.type === 'file')
    
    if (dirs.length > 0) {
      result += `📂 文件夹 (${dirs.length}):\n`
      dirs.forEach((dir: any) => {
        result += `  📁 ${dir.name}/\n`
      })
      result += `\n`
    }
    
    if (files.length > 0) {
      result += `📄 文件 (${files.length}):\n`
      files.slice(0, 20).forEach((file: any) => {
        const size = file.size < 1024 ? `${file.size}B` : 
                     file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)}KB` :
                     `${(file.size / (1024 * 1024)).toFixed(1)}MB`
        result += `  📄 ${file.name} (${size})\n`
      })
      if (files.length > 20) {
        result += `  ... 还有 ${files.length - 20} 个文件\n`
      }
    }
    
    result += `\n💡 使用示例:\n`
    if (dirs.length > 0) {
      result += `- 进入文件夹: github_list_repo_contents(owner="${owner}", repo="${repo}", path="${dirs[0].name}")\n`
    }
    if (files.length > 0) {
      result += `- 查看文件: github_get_file_content(owner="${owner}", repo="${repo}", path="${files[0].path}")`
    }
    
    return result
  } catch (error) {
    return `❌ 获取仓库内容失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取 GitHub 文件内容
 */
export const githubGetFileContent: ToolExecutor = async (args) => {
  const { owner, repo, path, ref, max_length = 10000 } = args
  
  if (!owner || !repo || !path) {
    return `❌ 错误：owner、repo 和 path 都是必填参数

示例：github_get_file_content(owner="facebook", repo="react", path="README.md")`
  }
  
  try {
    let endpoint = `/repos/${owner}/${repo}/contents/${path}`
    if (ref) {
      endpoint += `?ref=${encodeURIComponent(ref)}`
    }
    
    const fileData = await githubRequest(endpoint)
    
    if (fileData.type !== 'file') {
      return `❌ ${path} 不是一个文件，请使用 github_list_repo_contents 查看目录内容`
    }
    
    // 解码 base64 内容
    const content = atob(fileData.content)
    
    let result = `📄 ${fileData.name}\n`
    result += `路径: ${fileData.path}\n`
    result += `大小: ${fileData.size} bytes\n`
    result += `编码: ${fileData.encoding}\n\n`
    
    // 添加内容
    const displayContent = content.length > max_length 
      ? content.slice(0, max_length) + `\n\n... [内容已截断，共 ${content.length} 字符]`
      : content
    
    result += `📝 内容:\n\n\`\`\`\n${displayContent}\n\`\`\``
    
    return result
  } catch (error) {
    return `❌ 获取文件内容失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 在 GitHub 上搜索代码
 */
export const githubSearchCode: ToolExecutor = async (args) => {
  const { query, language, limit = 5 } = args
  
  if (!query) {
    return `❌ 错误：query 是必填参数

示例：github_search_code(query="useEffect hook", language="typescript")`
  }
  
  try {
    let searchQuery = query
    if (language) {
      searchQuery += ` language:${language}`
    }
    
    const perPage = Math.min(Math.max(1, limit), 10)
    const data = await githubRequest(`/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${perPage}`)
    
    if (data.total_count === 0) {
      return `🔍 未找到与 "${query}" 相关的代码\n\n建议：\n1. 尝试简化搜索词\n2. 检查拼写是否正确\n3. 尝试不同的关键词组合`
    }
    
    let result = `🔍 找到 ${data.total_count} 个结果，显示前 ${data.items.length} 个:\n\n`
    
    data.items.forEach((item: any, index: number) => {
      result += `${index + 1}. 📄 ${item.name}\n`
      result += `   仓库: ${item.repository.full_name}\n`
      result += `   路径: ${item.path}\n`
      result += `   链接: ${item.html_url}\n`
      if (item.text_matches && item.text_matches[0]) {
        const snippet = item.text_matches[0].fragment.slice(0, 150)
        result += `   片段: ${snippet}${item.text_matches[0].fragment.length > 150 ? '...' : ''}\n`
      }
      result += `\n`
    })
    
    result += `💡 查看完整代码:\n`
    result += `- 使用 github_get_file_content(owner="...", repo="...", path="...")`
    
    return result
  } catch (error) {
    return `❌ 搜索代码失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取 GitHub 提交历史
 */
export const githubGetCommitHistory: ToolExecutor = async (args) => {
  const { owner, repo, path, per_page = 10 } = args
  
  if (!owner || !repo) {
    return `❌ 错误：owner 和 repo 都是必填参数`
  }
  
  try {
    let endpoint = `/repos/${owner}/${repo}/commits?per_page=${Math.min(per_page, 30)}`
    if (path) {
      endpoint += `&path=${encodeURIComponent(path)}`
    }
    
    const commits = await githubRequest(endpoint)
    
    let result = `📜 ${owner}/${repo} 的最近提交:\n\n`
    
    commits.forEach((commit: any, index: number) => {
      const message = commit.commit.message.split('\n')[0] // 只取第一行
      const shortSha = commit.sha.slice(0, 7)
      const date = new Date(commit.commit.committer.date).toLocaleDateString('zh-CN')
      const author = commit.commit.author.name
      
      result += `${index + 1}. \`${shortSha}\` ${message}\n`
      result += `   👤 ${author} · 📅 ${date}\n`
      if (commit.commit.message.includes('\n')) {
        const details = commit.commit.message.split('\n').slice(1).filter((l: string) => l.trim()).join(', ')
        if (details) {
          result += `   📝 ${details.slice(0, 100)}${details.length > 100 ? '...' : ''}\n`
        }
      }
      result += `\n`
    })
    
    result += `🔗 查看详情: https://github.com/${owner}/${repo}/commits`
    
    return result
  } catch (error) {
    return `❌ 获取提交历史失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 获取 GitHub Issues
 */
export const githubGetIssues: ToolExecutor = async (args) => {
  const { owner, repo, state = 'open', per_page = 10 } = args
  
  if (!owner || !repo) {
    return `❌ 错误：owner 和 repo 都是必填参数`
  }
  
  try {
    const endpoint = `/repos/${owner}/${repo}/issues?state=${state}&per_page=${Math.min(per_page, 30)}`
    const issues = await githubRequest(endpoint)
    
    // 过滤掉 Pull Requests
    const pureIssues = issues.filter((item: any) => !item.pull_request)
    
    if (pureIssues.length === 0) {
      return `📭 ${owner}/${repo} 没有${state === 'open' ? '开放的' : state === 'closed' ? '已关闭的' : ''} Issues`
    }
    
    const stateEmoji = state === 'open' ? '🟢' : state === 'closed' ? '🔴' : '⚪'
    let result = `${stateEmoji} ${owner}/${repo} 的 Issues (${pureIssues.length}):\n\n`
    
    pureIssues.forEach((issue: any, index: number) => {
      const labels = issue.labels.map((l: any) => l.name).join(', ')
      const date = new Date(issue.created_at).toLocaleDateString('zh-CN')
      
      result += `${index + 1}. #${issue.number} ${issue.title}\n`
      if (labels) {
        result += `   🏷️ ${labels}\n`
      }
      result += `   👤 ${issue.user.login} · 📅 ${date}\n`
      result += `   💬 ${issue.comments} 条评论 · 🔗 ${issue.html_url}\n\n`
    })
    
    if (state === 'open') {
      result += `💡 查看已关闭的 Issues: github_get_issues(owner="${owner}", repo="${repo}", state="closed")`
    }
    
    return result
  } catch (error) {
    return `❌ 获取 Issues 失败: ${error instanceof Error ? error.message : String(error)}`
  }
}


/**
 * ============================================
 * ArXiv 工具
 * ============================================
 */

/**
 * 获取 ArXiv 论文信息
 */
export const fetchArxiv: ToolExecutor = async (args) => {
  const { paper_id, include_abstract = true, include_pdf = true } = args
  
  if (!paper_id) {
    return `❌ 错误：paper_id 是必填参数

示例：fetch_arxiv(paper_id="2401.12345")`
  }
  
  // 清理 paper_id（移除版本号）
  const cleanId = paper_id.toString().trim().toLowerCase().replace(/v\d+$/, '')
  
  try {
    // 使用 ArXiv API 获取论文信息
    const arxivUrl = `http://export.arxiv.org/api/query?search_query=id:${cleanId}&start=0&max_results=1`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(arxivUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/atom+xml'
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return `❌ ArXiv API 返回错误: ${response.status}\n\n建议：\n1. 检查网络连接\n2. 确认论文 ID 是否正确\n3. 稍后重试`
    }
    
    const xmlText = await response.text()
    
    // 解析 XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    
    // 检查是否有条目
    const entry = xmlDoc.querySelector('entry')
    if (!entry) {
      return `❌ 未找到论文: ${paper_id}\n\n请检查论文 ID 是否正确。`
    }
    
    // 提取信息
    const title = entry.querySelector('title')?.textContent?.trim() || '未知标题'
    const summary = entry.querySelector('summary')?.textContent?.trim() || ''
    const published = entry.querySelector('published')?.textContent || ''
    const updated = entry.querySelector('updated')?.textContent || ''
    
    // 作者列表
    const authors: string[] = []
    entry.querySelectorAll('author name').forEach(author => {
      const name = author.textContent?.trim()
      if (name) authors.push(name)
    })
    
    // 分类
    const categories: string[] = []
    entry.querySelectorAll('category').forEach(cat => {
      const term = cat.getAttribute('term')
      if (term) categories.push(term)
    })
    
    // 链接
    const links = entry.querySelectorAll('link')
    let pdfUrl = ''
    let absUrl = ''
    links.forEach(link => {
      const type = link.getAttribute('type')
      const href = link.getAttribute('href')
      const title = link.getAttribute('title')
      if (type === 'application/pdf' || title === 'pdf') {
        pdfUrl = href || ''
      }
      if (!type && href?.includes('/abs/')) {
        absUrl = href || ''
      }
    })
    
    // 构建结果
    let result = `📄 ArXiv 论文: ${paper_id}\n\n`
    result += `📝 标题: ${title}\n\n`
    
    if (authors.length > 0) {
      result += `👥 作者: ${authors.join(', ')}\n`
    }
    
    if (categories.length > 0) {
      result += `🏷️ 分类: ${categories.join(', ')}\n`
    }
    
    if (published) {
      const pubDate = new Date(published).toLocaleDateString('zh-CN')
      result += `📅 发布: ${pubDate}\n`
    }
    
    result += `\n`
    
    if (include_abstract && summary) {
      const abstract = summary.replace(/\s+/g, ' ')
      result += `📖 摘要:\n${abstract}\n\n`
    }
    
    if (include_pdf) {
      result += `🔗 链接:\n`
      if (absUrl) result += `- 论文页面: ${absUrl}\n`
      if (pdfUrl) result += `- PDF 下载: ${pdfUrl}\n`
    }
    
    result += `\n💡 提示: 你可以通过以下方式获取更多论文信息：\n`
    result += `- 搜索相关论文: 使用 web_search(query="arxiv ${categories[0] || 'machine learning'}")\n`
    result += `- 获取 PDF 内容: 使用 fetch_url(url="${pdfUrl}")`
    
    return result
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return `❌ 请求超时: 无法连接到 ArXiv API\n\n请检查网络连接，或稍后再试。`
    }
    return `❌ 获取 ArXiv 论文失败: ${error instanceof Error ? error.message : String(error)}\n\n可能原因：\n1. 论文 ID 不存在\n2. 网络连接问题\n3. ArXiv 服务暂时不可用`
  }
}

/**
 * ============================================
 * Knowledge Base 工具
 * ============================================
 */

interface KnowledgeDocument {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface KnowledgeBase {
  id: string
  name: string
  description: string
  documents: KnowledgeDocument[]
  createdAt: string
  updatedAt: string
}

// 内存中的知识库存储（实际应用中应该使用后端存储）
const knowledgeBaseStore: Map<string, KnowledgeBase> = new Map()

/**
 * 列出所有知识库
 */
export const kbList: ToolExecutor = async (_args) => {
  try {
    const bases = Array.from(knowledgeBaseStore.values())
    
    if (bases.length === 0) {
      return `📚 知识库列表\n\n当前没有知识库。\n\n💡 创建一个: kb_create(name="my_kb", description="我的知识库")`
    }
    
    let result = `📚 知识库列表 (${bases.length}个):\n\n`
    
    bases.forEach((kb, index) => {
      const docCount = kb.documents.length
      result += `${index + 1}. ${kb.name}\n`
      result += `   📝 ${kb.description || '无描述'}\n`
      result += `   📄 ${docCount} 个文档\n`
      result += `   🕒 创建于 ${new Date(kb.createdAt).toLocaleDateString('zh-CN')}\n\n`
    })
    
    result += `💡 操作提示:\n`
    result += `- 查询知识库: kb_query(knowledge_base_name="${bases[0]?.name}", query="关键词")\n`
    result += `- 删除知识库: kb_delete(name="${bases[0]?.name}")`
    
    return result
  } catch (error) {
    return `❌ 获取知识库列表失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 创建知识库
 */
export const kbCreate: ToolExecutor = async (args) => {
  const { name, description = '' } = args
  
  if (!name) {
    return `❌ 错误：name 是必填参数

示例：kb_create(name="my_kb", description="我的知识库")`
  }
  
  // 验证名称格式
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return `❌ 错误：知识库名称只能包含字母、数字、下划线和连字符

示例：my_kb, knowledge-base, docs2024`
  }
  
  try {
    if (knowledgeBaseStore.has(name)) {
      return `❌ 知识库 "${name}" 已存在\n\n💡 使用其他名称或先删除现有知识库。`
    }
    
    const newKb: KnowledgeBase = {
      id: crypto.randomUUID(),
      name,
      description,
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    knowledgeBaseStore.set(name, newKb)
    
    let result = `✅ 知识库创建成功\n\n`
    result += `📚 名称: ${name}\n`
    result += `📝 描述: ${description || '无'}\n`
    result += `🆔 ID: ${newKb.id}\n\n`
    result += `💡 下一步:\n`
    result += `- 添加文档: kb_document_add(knowledge_base_name="${name}", title="文档标题", content="内容...")\n`
    result += `- 查询知识: kb_query(knowledge_base_name="${name}", query="关键词")`
    
    return result
  } catch (error) {
    return `❌ 创建知识库失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 删除知识库
 */
export const kbDelete: ToolExecutor = async (args) => {
  const { name } = args
  
  if (!name) {
    return `❌ 错误：name 是必填参数

示例：kb_delete(name="my_kb")`
  }
  
  try {
    if (!knowledgeBaseStore.has(name)) {
      return `❌ 知识库 "${name}" 不存在\n\n💡 查看所有知识库: kb_list()`
    }
    
    knowledgeBaseStore.delete(name)
    
    return `✅ 知识库 "${name}" 已删除\n\n💡 查看剩余知识库: kb_list()`
  } catch (error) {
    return `❌ 删除知识库失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 查询知识库
 */
export const kbQuery: ToolExecutor = async (args) => {
  const { knowledge_base_name, query, limit = 5 } = args
  
  if (!knowledge_base_name || !query) {
    return `❌ 错误：knowledge_base_name 和 query 都是必填参数

示例：kb_query(knowledge_base_name="my_kb", query="机器学习", limit=5)`
  }
  
  try {
    const kb = knowledgeBaseStore.get(knowledge_base_name)
    if (!kb) {
      return `❌ 知识库 "${knowledge_base_name}" 不存在\n\n💡 查看所有知识库: kb_list()`
    }
    
    if (kb.documents.length === 0) {
      return `📚 知识库 "${knowledge_base_name}" 是空的\n\n💡 添加文档: kb_document_add(knowledge_base_name="${knowledge_base_name}", title="文档标题", content="内容...")`
    }
    
    // 简单的关键词匹配搜索
    const queryLower = query.toLowerCase()
    const results = kb.documents
      .map(doc => {
        const titleScore = doc.title.toLowerCase().includes(queryLower) ? 2 : 0
        const contentScore = doc.content.toLowerCase().includes(queryLower) ? 1 : 0
        const tagScore = doc.tags.some(tag => tag.toLowerCase().includes(queryLower)) ? 1.5 : 0
        return {
          doc,
          score: titleScore + contentScore + tagScore
        }
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    
    if (results.length === 0) {
      return `🔍 在 "${knowledge_base_name}" 中未找到与 "${query}" 相关的内容\n\n💡 建议：\n1. 尝试不同的关键词\n2. 检查知识库中是否有相关文档: kb_list_documents(knowledge_base_name="${knowledge_base_name}")`
    }
    
    let result = `🔍 查询结果 (${results.length}条):\n\n`
    result += `知识库: ${knowledge_base_name}\n`
    result += `查询: "${query}"\n\n`
    
    results.forEach((r, index) => {
      const doc = r.doc
      const preview = doc.content.slice(0, 200).replace(/\n/g, ' ')
      const relevance = Math.min(100, Math.round(r.score / 4.5 * 100))
      
      result += `${index + 1}. ${doc.title} (相关度: ${relevance}%)\n`
      if (doc.tags.length > 0) {
        result += `   🏷️ ${doc.tags.join(', ')}\n`
      }
      result += `   📝 ${preview}${doc.content.length > 200 ? '...' : ''}\n\n`
    })
    
    return result
  } catch (error) {
    return `❌ 查询知识库失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 添加文档到知识库
 */
export const kbDocumentAdd: ToolExecutor = async (args) => {
  const { knowledge_base_name, title, content, tags = [] } = args
  
  if (!knowledge_base_name || !title || !content) {
    return `❌ 错误：knowledge_base_name、title 和 content 都是必填参数

示例：kb_document_add(knowledge_base_name="my_kb", title="文档标题", content="文档内容...", tags=["标签1", "标签2"])`
  }
  
  try {
    const kb = knowledgeBaseStore.get(knowledge_base_name)
    if (!kb) {
      return `❌ 知识库 "${knowledge_base_name}" 不存在\n\n💡 先创建知识库: kb_create(name="${knowledge_base_name}", description="描述")`
    }
    
    // 处理 tags
    let processedTags: string[] = []
    if (typeof tags === 'string') {
      processedTags = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
    } else if (Array.isArray(tags)) {
      processedTags = tags.map(t => String(t).trim()).filter(Boolean)
    }
    
    const newDoc: KnowledgeDocument = {
      id: crypto.randomUUID(),
      title: title.toString(),
      content: content.toString(),
      tags: processedTags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    kb.documents.push(newDoc)
    kb.updatedAt = new Date().toISOString()
    
    let result = `✅ 文档添加成功\n\n`
    result += `📄 标题: ${title}\n`
    result += `📚 知识库: ${knowledge_base_name}\n`
    result += `🏷️ 标签: ${processedTags.join(', ') || '无'}\n`
    result += `📝 内容长度: ${content.toString().length} 字符\n`
    result += `🆔 文档 ID: ${newDoc.id}\n\n`
    result += `💡 下一步:\n`
    result += `- 查询知识: kb_query(knowledge_base_name="${knowledge_base_name}", query="关键词")\n`
    result += `- 删除文档: kb_document_delete(knowledge_base_name="${knowledge_base_name}", document_id="${newDoc.id}")`
    
    return result
  } catch (error) {
    return `❌ 添加文档失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 从知识库删除文档
 */
export const kbDocumentDelete: ToolExecutor = async (args) => {
  const { knowledge_base_name, document_id } = args
  
  if (!knowledge_base_name || !document_id) {
    return `❌ 错误：knowledge_base_name 和 document_id 都是必填参数

示例：kb_document_delete(knowledge_base_name="my_kb", document_id="doc-uuid")`
  }
  
  try {
    const kb = knowledgeBaseStore.get(knowledge_base_name)
    if (!kb) {
      return `❌ 知识库 "${knowledge_base_name}" 不存在\n\n💡 查看所有知识库: kb_list()`
    }
    
    const docIndex = kb.documents.findIndex(d => d.id === document_id)
    if (docIndex === -1) {
      return `❌ 文档不存在\n\n💡 查看知识库中的文档: kb_list_documents(knowledge_base_name="${knowledge_base_name}")`
    }
    
    const deletedDoc = kb.documents[docIndex]
    kb.documents.splice(docIndex, 1)
    kb.updatedAt = new Date().toISOString()
    
    return `✅ 文档已删除\n\n📄 ${deletedDoc.title}\n🆔 ${document_id}\n\n💡 知识库 "${knowledge_base_name}" 现有 ${kb.documents.length} 个文档`
  } catch (error) {
    return `❌ 删除文档失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 列出知识库中的所有文档
 */
export const kbListDocuments: ToolExecutor = async (args) => {
  const { knowledge_base_name } = args
  
  if (!knowledge_base_name) {
    return `❌ 错误：knowledge_base_name 是必填参数

示例：kb_list_documents(knowledge_base_name="my_kb")`
  }
  
  try {
    const kb = knowledgeBaseStore.get(knowledge_base_name)
    if (!kb) {
      return `❌ 知识库 "${knowledge_base_name}" 不存在\n\n💡 查看所有知识库: kb_list()`
    }
    
    if (kb.documents.length === 0) {
      return `📚 知识库 "${knowledge_base_name}" 中没有文档\n\n💡 添加文档: kb_document_add(knowledge_base_name="${knowledge_base_name}", title="文档标题", content="内容...")`
    }
    
    let result = `📄 "${knowledge_base_name}" 中的文档 (${kb.documents.length}个):\n\n`
    
    kb.documents.forEach((doc, index) => {
      result += `${index + 1}. ${doc.title}\n`
      result += `   🆔 ${doc.id}\n`
      if (doc.tags.length > 0) {
        result += `   🏷️ ${doc.tags.join(', ')}\n`
      }
      result += `   📝 ${doc.content.length} 字符\n`
      result += `   🕒 ${new Date(doc.updatedAt).toLocaleDateString('zh-CN')}\n\n`
    })
    
    result += `💡 操作:\n`
    result += `- 添加文档: kb_document_add(knowledge_base_name="${knowledge_base_name}", ...)\n`
    result += `- 查询知识: kb_query(knowledge_base_name="${knowledge_base_name}", query="关键词")`
    
    return result
  } catch (error) {
    return `❌ 获取文档列表失败: ${error instanceof Error ? error.message : String(error)}`
  }
}
