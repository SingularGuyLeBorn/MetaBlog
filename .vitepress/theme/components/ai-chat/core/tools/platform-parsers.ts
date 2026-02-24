/**
 * 平台内容解析工具
 * 支持知乎、小红书、微信公众号等平台的内容提取
 */

import type { ToolDefinition } from './types'

const API_BASE = '/api'

/**
 * 解析知乎内容
 */
export const parseZhihuExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url } = args
  if (!url) return '❌ 错误：请提供知乎链接'

  try {
    // 提取文章 ID
    const match = url.match(/zhuanlan\.zhihu\.com\/p\/(\d+)/) || 
                  url.match(/www\.zhihu\.com\/question\/\d+\/answer\/(\d+)/)
    
    if (!match) {
      return `⚠️ 无法识别知乎链接格式\n尝试通过通用方式获取...\n\n${await fetchGenericContent(url)}`
    }

    // 通过后端代理获取
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const html = await response.text()
    
    // 提取标题
    const titleMatch = html.match(/<h1[^>]*class="[^"]*Post-Title[^"]*"[^>]*>([^<]*)<\/h1>/)
    const title = titleMatch ? titleMatch[1].trim() : '未知标题'
    
    // 提取内容
    const contentMatch = html.match(/<div[^>]*class="[^"]*Post-RichTextContainer[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/)
    let content = ''
    if (contentMatch) {
      content = contentMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    }

    // 提取作者
    const authorMatch = html.match(/<meta[^>]*author[^>]*content="([^"]*)"/)
    const author = authorMatch ? authorMatch[1] : '未知作者'

    return `📄 **${title}**\n👤 ${author}\n🔗 ${url}\n\n---\n\n${content || '(内容提取失败，请手动访问)'}`

  } catch (error) {
    return `❌ 解析失败: ${error instanceof Error ? error.message : String(error)}\n\n尝试通用解析...\n\n${await fetchGenericContent(url)}`
  }
}

/**
 * 解析小红书内容
 */
export const parseXiaohongshuExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url } = args
  if (!url) return '❌ 错误：请提供小红书链接'

  try {
    // 小红书分享链接需要特殊处理
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const html = await response.text()
    
    // 提取标题/描述
    const descMatch = html.match(/<meta[^>]*description[^>]*content="([^"]*)"/) ||
                      html.match(/<meta[^>]*og:description[^>]*content="([^"]*)"/)
    const description = descMatch ? descMatch[1].trim() : ''
    
    // 提取图片
    const imgMatches = html.matchAll(/<meta[^>]*og:image[^>]*content="([^"]*)"/g)
    const images = Array.from(imgMatches).map(m => m[1]).slice(0, 5)

    return `📕 小红书内容\n🔗 ${url}\n\n${description}\n\n${images.length > 0 ? `🖼️ 图片: ${images.length} 张` : ''}\n\n⚠️ 小红书有反爬机制，完整内容可能需要手动查看`

  } catch (error) {
    return `❌ 解析失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 解析微信公众号内容
 */
export const parseWechatExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url } = args
  if (!url) return '❌ 错误：请提供公众号文章链接'

  try {
    // 微信文章通常有 mp.weixin.qq.com 域名
    if (!url.includes('mp.weixin.qq.com')) {
      return `⚠️ 非微信公众号链接\n尝试通用解析...\n\n${await fetchGenericContent(url)}`
    }

    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const html = await response.text()
    
    // 提取标题
    const titleMatch = html.match(/<h1[^>]*class="rich_media_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '未知标题'
    
    // 提取公众号名称
    const authorMatch = html.match(/<a[^>]*id="js_name"[^>]*>([\s\S]*?)<\/a>/)
    const author = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '未知公众号'
    
    // 提取正文
    const contentMatch = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)
    let content = ''
    if (contentMatch) {
      content = contentMatch[1]
        .replace(/<img[^>]*data-src="([^"]*)"[^>]*>/g, '[图片: $1]')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000)
    }

    return `📰 **${title}**\n👤 ${author}\n🔗 ${url}\n\n---\n\n${content || '(内容提取失败)'}`

  } catch (error) {
    return `❌ 解析失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 通用内容获取（备用方案）
 */
async function fetchGenericContent(url: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)' }
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const html = await response.text()
    
    // 提取标题
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : '未知标题'
    
    // 提取描述
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i) ||
                      html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i)
    const description = descMatch ? descMatch[1].trim() : ''
    
    // 提取正文（简单方式）
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)

    return `🌐 **${title}**\n🔗 ${url}\n\n${description}\n\n---\n\n${text}`

  } catch (error) {
    return `❌ 通用解析也失败了: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * OCR 识别图片中的文字
 */
export const ocrImageExecutor = async (args: Record<string, any>): Promise<string> => {
  const { imageUrl, imageData } = args
  
  if (!imageUrl && !imageData) {
    return '❌ 错误：请提供图片 URL 或图片数据'
  }

  try {
    // 这里集成 OCR 服务
    // 可以使用 Tesseract.js 或后端 OCR 服务
    return `📝 OCR 识别结果\n\n⚠️ OCR 功能需要配置 OCR 服务\n\n识别内容：\n(图片中的文字将显示在这里)\n\n💡 建议：\n1. 配置 Tesseract.js 前端识别\n2. 或接入百度/腾讯/阿里 OCR API`

  } catch (error) {
    return `❌ OCR 失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

// 工具定义
export const platformParserDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'parse_zhihu',
      description: '解析知乎文章或回答的内容',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '知乎文章或回答的完整 URL' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_xiaohongshu',
      description: '解析小红书笔记内容',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '小红书分享链接' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_wechat',
      description: '解析微信公众号文章内容',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '微信公众号文章链接' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'ocr_image',
      description: 'OCR 识别图片中的文字内容',
      parameters: {
        type: 'object',
        properties: {
          imageUrl: { type: 'string', description: '图片 URL' },
          imageData: { type: 'string', description: 'Base64 编码的图片数据' }
        }
      }
    }
  }
]

// 执行器映射
export const platformParserExecutors: Record<string, (args: Record<string, any>) => Promise<string>> = {
  parse_zhihu: parseZhihuExecutor,
  parse_xiaohongshu: parseXiaohongshuExecutor,
  parse_wechat: parseWechatExecutor,
  ocr_image: ocrImageExecutor
}
