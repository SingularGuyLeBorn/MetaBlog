/**
 * 平台解析工具执行器
 * 支持知乎、小红书、微信公众号等平台的内容提取
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api'

/**
 * 解析知乎内容
 */
export const parseZhihu: ToolExecutor = async (args): Promise<ToolResult> => {
  const { url } = args
  
  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供知乎链接',
      '示例: parse_zhihu(url="https://zhuanlan.zhihu.com/p/xxxx")'
    )
  }

  try {
    // 提取文章 ID
    const match = url.match(/zhuanlan\.zhihu\.com\/p\/(\d+)/) || 
                  url.match(/www\.zhihu\.com\/question\/\d+\/answer\/(\d+)/)
    
    if (!match) {
      return createErrorResult(
        'Invalid Zhihu URL format',
        '无法识别知乎链接格式',
        '请提供知乎专栏或回答链接'
      )
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

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取知乎内容失败',
        '请检查链接是否有效'
      )
    }
    
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

    return createSuccessResult(
      {
        title,
        author,
        url,
        content: content || '(内容提取失败，请手动访问)',
        platform: 'zhihu'
      },
      `成功解析知乎文章: ${title}`,
      'parse_zhihu'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '解析知乎内容失败',
      '请检查链接是否有效或稍后重试'
    )
  }
}

/**
 * 解析小红书内容
 */
export const parseXiaohongshu: ToolExecutor = async (args): Promise<ToolResult> => {
  const { url } = args
  
  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供小红书链接',
      '示例: parse_xiaohongshu(url="https://www.xiaohongshu.com/xxx")'
    )
  }

  try {
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

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取小红书内容失败',
        '请检查链接是否有效'
      )
    }
    
    const html = await response.text()
    
    // 提取标题/描述
    const descMatch = html.match(/<meta[^>]*description[^>]*content="([^"]*)"/) ||
                      html.match(/<meta[^>]*og:description[^>]*content="([^"]*)"/)
    const description = descMatch ? descMatch[1].trim() : ''
    
    // 提取图片
    const imgMatches = html.matchAll(/<meta[^>]*og:image[^>]*content="([^"]*)"/g)
    const images = Array.from(imgMatches).map(m => m[1]).slice(0, 5)

    return createSuccessResult(
      {
        description,
        url,
        images,
        imageCount: images.length,
        platform: 'xiaohongshu',
        note: '小红书有反爬机制，完整内容可能需要手动查看'
      },
      '成功解析小红书内容',
      'parse_xiaohongshu'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '解析小红书内容失败',
      '请检查链接是否有效或稍后重试'
    )
  }
}

/**
 * 解析微信公众号内容
 */
export const parseWechat: ToolExecutor = async (args): Promise<ToolResult> => {
  const { url } = args
  
  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供公众号文章链接',
      '示例: parse_wechat(url="https://mp.weixin.qq.com/s/xxx")'
    )
  }

  try {
    // 微信文章通常有 mp.weixin.qq.com 域名
    if (!url.includes('mp.weixin.qq.com')) {
      return createErrorResult(
        'Invalid WeChat URL',
        '非微信公众号链接',
        '请提供 mp.weixin.qq.com 域名的链接'
      )
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

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取公众号文章失败',
        '请检查链接是否有效'
      )
    }
    
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

    return createSuccessResult(
      {
        title,
        author,
        url,
        content: content || '(内容提取失败)',
        platform: 'wechat'
      },
      `成功解析公众号文章: ${title}`,
      'parse_wechat'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '解析公众号文章失败',
      '请检查链接是否有效或稍后重试'
    )
  }
}

/**
 * 通用平台链接解析（优先调用后端 /api/platform/parse）
 */
export const parsePlatformLink: ToolExecutor = async (args) => {
  const { url, extract_content = true, max_content_length = 5000, extract_images = false, extract_comments = false } = args

  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供要解析的链接 URL',
      '示例: parse_platform_link(url="https://example.com")'
    )
  }

  // 优先调用后端统一解析器
  try {
    const response = await fetch(`${API_BASE}/platform/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '平台解析服务请求失败',
        '请检查链接是否有效或稍后重试'
      )
    }

    const result = await response.json()
    if (!result.success) {
      return createErrorResult(result.error, '平台解析失败')
    }

    const data = result.data
    let content = data.content || ''
    if (content && max_content_length) {
      content = content.slice(0, max_content_length)
    }

    return createSuccessResult(
      {
        title: data.title,
        author: data.author,
        url: data.url,
        platform: data.platform,
        content: content || undefined,
        images: extract_images ? (data.images || []) : undefined,
        comments: extract_comments ? (data.comments || []) : undefined,
        metadata: data.metadata,
        method: data.method
      },
      `成功解析 [${data.platform}] ${data.title}`,
      'parse_platform_link'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '链接解析失败',
      '请检查链接是否有效或稍后重试'
    )
  }
}

/**
 * 解析抖音内容
 */
export const parseDouyin: ToolExecutor = async (args) => {
  const { url } = args
  if (!url) {
    return createErrorResult('Missing url', '请提供抖音链接')
  }
  return parsePlatformLink({ url, extract_content: true })
}

/**
 * 解析 B站内容
 */
export const parseBilibili: ToolExecutor = async (args) => {
  const { url } = args
  if (!url) {
    return createErrorResult('Missing url', '请提供B站链接')
  }
  return parsePlatformLink({ url, extract_content: true })
}

/**
 * 解析微博内容
 */
export const parseWeibo: ToolExecutor = async (args) => {
  const { url } = args
  if (!url) {
    return createErrorResult('Missing url', '请提供微博链接')
  }
  return parsePlatformLink({ url, extract_content: true })
}

/**
 * OCR 识别图片中的文字
 */
export const ocrImage: ToolExecutor = async (args): Promise<ToolResult> => {
  const { imageUrl, imageData } = args
  
  if (!imageUrl && !imageData) {
    return createErrorResult(
      'Missing image parameter',
      '请提供图片 URL 或图片数据',
      '示例: ocr_image(imageUrl="https://example.com/image.jpg")'
    )
  }

  // OCR 功能需要配置 OCR 服务
  return createErrorResult(
    'OCR service not configured',
    'OCR 功能尚未配置',
    '请配置 Tesseract.js 或接入百度/腾讯/阿里 OCR API'
  )
}

/**
 * 处理图片
 */
export const processImage: ToolExecutor = async (args) => {
  const { image_url, operation = 'describe', prompt } = args
  
  if (!image_url) {
    return createErrorResult(
      'Missing image_url parameter',
      '请提供图片 URL',
      '示例: process_image(image_url="https://example.com/image.jpg", operation="describe")'
    )
  }

  try {
    // 获取图片信息
    const response = await fetch(image_url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type') || 'unknown'
    const contentLength = response.headers.get('content-length')
    const size = contentLength ? `${(parseInt(contentLength) / 1024).toFixed(1)} KB` : '未知'

    switch (operation) {
      case 'ocr':
        return await ocrImage({ imageUrl: image_url })
        
      case 'describe':
      case 'analyze':
      default:
        return createSuccessResult(
          {
            format: contentType,
            size,
            url: image_url,
            note: '深度图像分析需要接入 Vision API（如 GPT-4V、Claude 3 Vision）',
            capabilities: [
              '获取图片元数据（格式、尺寸、大小）',
              'OCR 文字识别（使用 ocr 操作）',
              '图片 URL 可以直接在对话中显示'
            ]
          },
          `图片信息: ${contentType}`,
          'process_image',
          '如需深度分析，请配置 Vision API'
        )
    }
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '图片处理失败',
      '请检查图片 URL 是否有效'
    )
  }
}
