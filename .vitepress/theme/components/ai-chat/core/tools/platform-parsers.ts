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
  },
  {
    type: 'function',
    function: {
      name: 'parse_platform_link',
      description: `解析各平台链接，提取内容摘要、标题、作者等信息。

支持的平台：
- 社交媒体：Twitter/X、微博、小红书、抖音
- 视频平台：YouTube、Bilibili、抖音
- 技术社区：GitHub、知乎、CSDN、掘金、StackOverflow
- 新闻资讯：公众号、今日头条、知乎专栏
- 电商平台：淘宝、京东、拼多多
- 其他：任何有公开元数据的网页链接

使用场景：
1. 用户分享链接要求总结内容
2. 提取文章/视频的关键信息
3. 获取链接的标题、作者、发布时间等元数据
4. 分析链接内容并给出摘要`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '要解析的平台链接 URL' },
          extract_content: { type: 'boolean', description: '是否提取完整内容', default: true },
          max_content_length: { type: 'number', description: '提取内容的最大长度', default: 5000 }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'process_image',
      description: `处理用户上传的图片。分析图片内容、提取文字、生成描述等。

使用场景：
1. 用户上传图片并要求分析
2. 提取图片中的文字（OCR）
3. 描述图片内容
4. 识别图片中的物体、场景、人物等

注意：
- 支持多种图片格式：PNG、JPG、GIF、WebP 等
- 图片大小有限制，超大图片会被压缩
- 可以要求特定的分析角度`,
      parameters: {
        type: 'object',
        properties: {
          image_url: { type: 'string', description: '图片的 URL 或 base64 编码数据' },
          operation: { type: 'string', enum: ['describe', 'ocr', 'analyze'], description: '处理方式', default: 'describe' },
          prompt: { type: 'string', description: '额外的处理提示' }
        },
        required: ['image_url']
      }
    }
  }
]

/**
 * 通用平台链接解析（支持所有平台）
 */
export const parsePlatformLinkExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url, extract_content = true, max_content_length = 5000 } = args
  
  if (!url) {
    return '❌ 错误：请提供要解析的链接 URL'
  }

  try {
    // 识别平台类型
    const platform = detectPlatform(url)
    
    // 根据平台选择特定解析器
    if (platform === 'zhihu') {
      return await parseZhihuExecutor({ url })
    }
    if (platform === 'xiaohongshu') {
      return await parseXiaohongshuExecutor({ url })
    }
    if (platform === 'wechat') {
      return await parseWechatExecutor({ url })
    }
    
    // 通用解析
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
    
    // 提取 Open Graph 元数据
    const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i) ||
                      html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : '未知标题'
    
    const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) ||
                     html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i)
    const description = descMatch ? descMatch[1].trim() : ''
    
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i)
    const image = imageMatch ? imageMatch[1] : ''
    
    const authorMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/i) ||
                       html.match(/<meta[^>]*name="author"[^>]*content="([^"]*)"/i)
    const author = authorMatch ? authorMatch[1] : platform || '未知来源'

    // 提取正文内容（如果启用）
    let content = ''
    if (extract_content) {
      // 移除 script 和 style
      let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      // 取前 N 个字符
      content = text.slice(0, max_content_length)
      if (text.length > max_content_length) {
        content += '\n\n...(内容已截断)'
      }
    }

    let result = `📎 **${title}**\n`
    result += `👤 ${author}\n`
    result += `🔗 ${url}\n`
    if (image) {
      result += `🖼️ 封面: ${image}\n`
    }
    result += `\n---\n\n`
    if (description) {
      result += `${description}\n\n`
    }
    if (content) {
      result += `${content}`
    }
    
    return result

  } catch (error) {
    return `❌ 链接解析失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 检测平台类型
 */
function detectPlatform(url: string): string {
  if (url.includes('zhihu.com')) return 'zhihu'
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu'
  if (url.includes('mp.weixin.qq.com')) return 'wechat'
  if (url.includes('github.com')) return 'github'
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('weibo.com') || url.includes('weibo.cn')) return 'weibo'
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin'
  if (url.includes('csdn.net')) return 'csdn'
  if (url.includes('juejin.cn')) return 'juejin'
  if (url.includes('stackoverflow.com')) return 'stackoverflow'
  if (url.includes('arxiv.org')) return 'arxiv'
  return 'unknown'
}

/**
 * 处理图片（分析、OCR、描述）
 */
export const processImageExecutor = async (args: Record<string, any>): Promise<string> => {
  const { image_url, operation = 'describe', prompt } = args
  
  if (!image_url) {
    return '❌ 错误：请提供图片 URL'
  }

  try {
    // 首先尝试获取图片信息
    const response = await fetch(image_url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type') || 'unknown'
    const contentLength = response.headers.get('content-length')
    const size = contentLength ? `${(parseInt(contentLength) / 1024).toFixed(1)} KB` : '未知'

    let result = `🖼️ 图片信息\n`
    result += `📐 格式: ${contentType}\n`
    result += `📦 大小: ${size}\n`
    result += `🔗 URL: ${image_url}\n\n`

    // 根据操作类型处理
    switch (operation) {
      case 'ocr':
        const ocrResult = await ocrImageExecutor({ imageUrl: image_url })
        result += `📝 OCR 识别结果:\n${ocrResult}`
        break
        
      case 'describe':
      case 'analyze':
        result += `💡 图片分析:\n\n`
        if (prompt) {
          result += `用户要求: ${prompt}\n\n`
        }
        result += `这是一张 ${contentType} 格式的图片。`
        result += `\n\n⚠️ 注意：深度图像分析需要接入 Vision API（如 GPT-4V、Claude 3 Vision）`
        result += `\n\n💡 当前能力：`
        result += `\n- 获取图片元数据（格式、尺寸、大小）`
        result += `\n- OCR 文字识别（使用 ocr 操作）`
        result += `\n- 图片 URL 可以直接在对话中显示`
        break
        
      default:
        result += `❓ 未知操作: ${operation}`
    }

    return result

  } catch (error) {
    return `❌ 图片处理失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

// 执行器映射
export const platformParserExecutors: Record<string, (args: Record<string, any>) => Promise<string>> = {
  parse_zhihu: parseZhihuExecutor,
  parse_xiaohongshu: parseXiaohongshuExecutor,
  parse_wechat: parseWechatExecutor,
  ocr_image: ocrImageExecutor,
  parse_platform_link: parsePlatformLinkExecutor,
  process_image: processImageExecutor
}
