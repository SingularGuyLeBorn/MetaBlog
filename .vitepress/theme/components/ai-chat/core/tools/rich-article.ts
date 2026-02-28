/**
 * 富文本文章工具
 * 
 * 支持创建图文并茂、带超链接、代码块等的文章
 */

import type { ToolDefinition } from './types'

const API_BASE = '/api'

/**
 * 富文本文章结构
 */
export interface RichArticleContent {
  blocks: Array<{
    type: 'text' | 'heading' | 'image' | 'video' | 'link' | 'code' | 'quote' | 'list' | 'divider'
    content?: string
    url?: string
    alt?: string
    caption?: string
    language?: string
    items?: string[]
    level?: number
    link?: {
      url: string
      text: string
    }
  }>
  meta?: {
    title: string
    tags: string[]
    category: string
    author?: string
  }
}

/**
 * 创建富文本文章
 */
export const createRichArticleExecutor = async (args: Record<string, any>): Promise<string> => {
  const { 
    title, 
    path, 
    blocks,
    tags = [],
    category = '',
    author = 'AI助手'
  } = args

  if (!title || !path || !blocks || !Array.isArray(blocks)) {
    return '❌ 错误：请提供标题、路径和内容块数组'
  }

  try {
    // 生成Markdown内容
    let markdown = `---\n`
    markdown += `title: ${title}\n`
    markdown += `date: ${new Date().toISOString()}\n`
    if (tags.length > 0) {
      markdown += `tags:\n${tags.map((t: string) => `  - ${t}`).join('\n')}\n`
    }
    if (category) {
      markdown += `category: ${category}\n`
    }
    markdown += `author: ${author}\n`
    markdown += `---\n\n`
    
    // 添加标题
    markdown += `# ${title}\n\n`
    
    // 处理内容块
    for (const block of blocks) {
      switch (block.type) {
        case 'heading':
          const level = block.level || 2
          markdown += `${'#'.repeat(level)} ${block.content}\n\n`
          break
          
        case 'text':
          markdown += `${block.content}\n\n`
          break
          
        case 'image':
          markdown += `![${block.alt || ''}](${block.url})\n`
          if (block.caption) {
            markdown += `*${block.caption}*\n`
          }
          markdown += '\n'
          break
          
        case 'video':
          markdown += `<video controls src="${block.url}"></video>\n`
          if (block.caption) {
            markdown += `*${block.caption}*\n`
          }
          markdown += '\n'
          break
          
        case 'link':
          if (block.link) {
            markdown += `[${block.link.text}](${block.link.url})\n\n`
          }
          break
          
        case 'code':
          markdown += `\`\`\`${block.language || ''}\n${block.content}\n\`\`\`\n\n`
          break
          
        case 'quote':
          markdown += `> ${block.content}\n\n`
          break
          
        case 'list':
          if (block.items) {
            markdown += block.items.map((item: string) => `- ${item}`).join('\n')
            markdown += '\n\n'
          }
          break
          
        case 'divider':
          markdown += `---\n\n`
          break
      }
    }

    // 调用创建文章API
    const response = await fetch(`${API_BASE}/articles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        path,
        content: markdown,
        tags,
        category
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${error}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || '创建文章失败')
    }

    return `✅ 富文本文章创建成功！

📄 **${title}**
📝 内容块数: ${blocks.length}
🏷️ 标签: ${tags.join(', ') || '无'}
📁 路径: ${result.path || path}

文章预览：
${markdown.substring(0, 500)}...`

  } catch (error) {
    return `❌ 创建文章失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 批量插入图片到文章
 */
export const insertImagesExecutor = async (args: Record<string, any>): Promise<string> => {
  const { articlePath, images, layout = 'vertical' } = args

  if (!articlePath || !images || !Array.isArray(images)) {
    return '❌ 错误：请提供文章路径和图片数组'
  }

  try {
    // 先读取原文章
    const readResponse = await fetch(`${API_BASE}/articles/read?path=${encodeURIComponent(articlePath)}`)
    if (!readResponse.ok) {
      throw new Error('无法读取原文章')
    }
    
    const article = await readResponse.json()
    let content = article.content || ''

    // 生成图片Markdown
    let imageMarkdown = '\n\n'
    
    if (layout === 'grid' && images.length > 1) {
      // 网格布局
      imageMarkdown += '<div class="image-grid">\n\n'
      for (const img of images) {
        imageMarkdown += `![${img.alt || ''}](${img.url})\n`
      }
      imageMarkdown += '</div>\n\n'
    } else if (layout === 'carousel' && images.length > 1) {
      // 轮播布局（使用HTML）
      imageMarkdown += '<div class="image-carousel">\n\n'
      for (const img of images) {
        imageMarkdown += `<img src="${img.url}" alt="${img.alt || ''}" />\n`
      }
      imageMarkdown += '</div>\n\n'
    } else {
      // 垂直布局（默认）
      for (const img of images) {
        imageMarkdown += `![${img.alt || ''}](${img.url})\n`
        if (img.caption) {
          imageMarkdown += `*${img.caption}*\n`
        }
        imageMarkdown += '\n'
      }
    }

    // 追加到文章末尾
    content += imageMarkdown

    // 更新文章
    const updateResponse = await fetch(`${API_BASE}/articles/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: articlePath,
        content,
        mode: 'append'
      })
    })

    if (!updateResponse.ok) {
      throw new Error('更新文章失败')
    }

    return `✅ 成功插入 ${images.length} 张图片

布局模式: ${layout === 'grid' ? '网格' : layout === 'carousel' ? '轮播' : '垂直'}
文章路径: ${articlePath}`

  } catch (error) {
    return `❌ 插入图片失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 创建带超链接的引用文章
 */
export const createLinkedArticleExecutor = async (args: Record<string, any>): Promise<string> => {
  const {
    title,
    path,
    content,
    links,
    references,
    tags = [],
    category = ''
  } = args

  if (!title || !path || !content) {
    return '❌ 错误：请提供标题、路径和内容'
  }

  try {
    let markdown = `---\n`
    markdown += `title: ${title}\n`
    markdown += `date: ${new Date().toISOString()}\n`
    if (tags.length > 0) {
      markdown += `tags:\n${tags.map((t: string) => `  - ${t}`).join('\n')}\n`
    }
    if (category) {
      markdown += `category: ${category}\n`
    }
    markdown += `---\n\n`
    
    markdown += `# ${title}\n\n`
    
    // 主要内容
    markdown += `${content}\n\n`
    
    // 添加内联链接
    if (links && Array.isArray(links) && links.length > 0) {
      markdown += `## 相关链接\n\n`
      for (const link of links) {
        markdown += `- [${link.text}](${link.url})${link.description ? `: ${link.description}` : ''}\n`
      }
      markdown += '\n'
    }
    
    // 添加引用
    if (references && Array.isArray(references) && references.length > 0) {
      markdown += `## 参考资料\n\n`
      for (let i = 0; i < references.length; i++) {
        const ref = references[i]
        markdown += `[${i + 1}] [${ref.title}](${ref.url})${ref.author ? ` - ${ref.author}` : ''}\n`
      }
      markdown += '\n'
    }

    // 调用创建文章API
    const response = await fetch(`${API_BASE}/articles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        path,
        content: markdown,
        tags,
        category
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API Error: ${error}`)
    }

    const result = await response.json()

    return `✅ 链接文章创建成功！

📄 **${title}**
🔗 内链数量: ${links?.length || 0}
📚 引用数量: ${references?.length || 0}
🏷️ 标签: ${tags.join(', ') || '无'}
📁 路径: ${result.path || path}`

  } catch (error) {
    return `❌ 创建文章失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 格式化文章为富媒体风格
 */
export const formatRichMediaExecutor = async (args: Record<string, any>): Promise<string> => {
  const { articlePath, style = 'modern' } = args

  if (!articlePath) {
    return '❌ 错误：请提供文章路径'
  }

  try {
    // 读取原文章
    const readResponse = await fetch(`${API_BASE}/articles/read?path=${encodeURIComponent(articlePath)}`)
    if (!readResponse.ok) {
      throw new Error('无法读取原文章')
    }
    
    const article = await readResponse.json()
    let content = article.content || ''

    // 根据风格添加样式
    switch (style) {
      case 'modern':
        // 添加现代风格的CSS类
        content = content.replace(/^# /, '<div class="article-hero">\n\n# ')
        content = content.replace(/^(#{2,3}) /gm, '<div class="section-header">\n\n$1 ')
        content = content.replace(/\n\n/g, '\n</div>\n\n')
        break
        
      case 'magazine':
        // 杂志风格：首字下沉、图文混排
        content = content.replace(/^# (.+)$/m, '# $1\n\n<p class="drop-cap">')
        content = content.replace(/\n\n/, '</p>\n\n')
        content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="float-right">\n![$1]($2)\n</figure>')
        break
        
      case 'minimal':
        // 极简风格：大量留白
        content = content.replace(/^# /, '<div class="minimal-header">\n\n# ')
        content = content.replace(/\n#{2,}/g, '\n</div>\n\n<div class="minimal-section">\n\n$&')
        content += '\n</div>'
        break
    }

    // 更新文章
    const updateResponse = await fetch(`${API_BASE}/articles/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: articlePath,
        content,
        mode: 'replace'
      })
    })

    if (!updateResponse.ok) {
      throw new Error('更新文章失败')
    }

    return `✅ 文章格式化为 "${style}" 风格成功！

📄 文章路径: ${articlePath}
🎨 应用样式: ${style}

可用的CSS类：
${style === 'modern' ? '- article-hero (标题区)\n- section-header (章节标题)' : ''}
${style === 'magazine' ? '- drop-cap (首字下沉)\n- float-right (右浮动图片)' : ''}
${style === 'minimal' ? '- minimal-header (极简标题)\n- minimal-section (极简章节)' : ''}`

  } catch (error) {
    return `❌ 格式化失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

// 工具定义
export const richArticleDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'create_rich_article',
      description: `创建图文并茂的富文本文章。支持文本、图片、视频、代码块、引用、链接等多种内容块。

使用场景：
1. 用户要求创建包含图片的文章
2. 需要创建带超链接的教程文档
3. 创建包含代码示例的技术文章
4. 制作多媒体内容展示

内容块类型：
- text: 普通文本
- heading: 标题 (level: 2-6)
- image: 图片 (url, alt, caption)
- video: 视频 (url, caption)
- link: 链接 (link: {url, text})
- code: 代码块 (content, language)
- quote: 引用
- list: 列表 (items: 数组)
- divider: 分隔线`,
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '文章标题' },
          path: { type: 'string', description: '文章路径，如 "knowledge/my-article.md"' },
          blocks: {
            type: 'array',
            description: '内容块数组',
            items: {
              type: 'object',
              properties: {
                type: { 
                  type: 'string', 
                  enum: ['text', 'heading', 'image', 'video', 'link', 'code', 'quote', 'list', 'divider'],
                  description: '内容块类型'
                },
                content: { type: 'string', description: '文本/代码/引用内容' },
                url: { type: 'string', description: '图片/视频URL' },
                alt: { type: 'string', description: '图片替代文本' },
                caption: { type: 'string', description: '图片/视频说明' },
                language: { type: 'string', description: '代码语言' },
                level: { type: 'number', description: '标题级别 (2-6)', minimum: 2, maximum: 6 },
                items: { type: 'array', items: { type: 'string' }, description: '列表项' },
                link: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    text: { type: 'string' }
                  }
                }
              }
            }
          },
          tags: { type: 'array', items: { type: 'string' }, description: '文章标签' },
          category: { type: 'string', description: '文章分类' },
          author: { type: 'string', description: '作者，默认AI助手' }
        },
        required: ['title', 'path', 'blocks']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'insert_images',
      description: `向现有文章批量插入图片，支持多种布局方式。

使用场景：
1. 为已有文章添加配图
2. 创建图片集/相册
3. 制作图文教程

布局模式：
- vertical: 垂直排列（默认）
- grid: 网格布局
- carousel: 轮播布局`,
      parameters: {
        type: 'object',
        properties: {
          articlePath: { type: 'string', description: '文章路径' },
          images: {
            type: 'array',
            description: '图片数组',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string', description: '图片URL' },
                alt: { type: 'string', description: '替代文本' },
                caption: { type: 'string', description: '图片说明' }
              },
              required: ['url']
            }
          },
          layout: { 
            type: 'string', 
            enum: ['vertical', 'grid', 'carousel'],
            description: '图片布局方式',
            default: 'vertical'
          }
        },
        required: ['articlePath', 'images']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_linked_article',
      description: `创建带超链接和引用的文章。适合参考资料整理、资源汇总等。

使用场景：
1. 创建资源汇总文章
2. 制作参考资料列表
3. 创建带外链的博客文章
4. 制作推荐阅读列表`,
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '文章标题' },
          path: { type: 'string', description: '文章路径' },
          content: { type: 'string', description: '主要内容' },
          links: {
            type: 'array',
            description: '内联链接',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string', description: '链接文字' },
                url: { type: 'string', description: '链接URL' },
                description: { type: 'string', description: '链接描述' }
              },
              required: ['text', 'url']
            }
          },
          references: {
            type: 'array',
            description: '参考资料',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: '资料标题' },
                url: { type: 'string', description: '资料URL' },
                author: { type: 'string', description: '作者' }
              },
              required: ['title', 'url']
            }
          },
          tags: { type: 'array', items: { type: 'string' } },
          category: { type: 'string' }
        },
        required: ['title', 'path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'format_rich_media',
      description: `为文章应用富媒体样式模板。

使用场景：
1. 美化已有文章
2. 应用现代排版风格
3. 创建杂志风格文章
4. 制作极简风格内容

可用风格：
- modern: 现代风格（大标题、卡片式章节）
- magazine: 杂志风格（首字下沉、图文混排）
- minimal: 极简风格（大量留白）`,
      parameters: {
        type: 'object',
        properties: {
          articlePath: { type: 'string', description: '文章路径' },
          style: { 
            type: 'string', 
            enum: ['modern', 'magazine', 'minimal'],
            description: '样式风格',
            default: 'modern'
          }
        },
        required: ['articlePath']
      }
    }
  }
]

// 执行器映射
export const richArticleExecutors: Record<string, (args: Record<string, any>) => Promise<string>> = {
  create_rich_article: createRichArticleExecutor,
  insert_images: insertImagesExecutor,
  create_linked_article: createLinkedArticleExecutor,
  format_rich_media: formatRichMediaExecutor
}
