/**
 * 社交平台工具定义与执行器
 * 支持知乎、小红书、微信公众号等平台的内容提取
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { parsePlatformLink } from './generic'

const API_BASE = '/api'

export const parseZhihuDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parseZhihu',
    description: '解析知乎文章或回答的内容，提取标题、作者、正文等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '知乎文章或回答的完整 URL，如 https://zhuanlan.zhihu.com/p/xxxx'
        }
      },
      required: ['url']
    }
  }
}

export const parseXiaohongshuDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parseXiaohongshu',
    description: '解析小红书笔记内容，提取描述、图片等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '小红书分享链接'
        }
      },
      required: ['url']
    }
  }
}

export const parseWechatDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parseWechat',
    description: '解析微信公众号文章内容，提取标题、公众号名称、正文等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '微信公众号文章链接，如 https://mp.weixin.qq.com/s/xxx'
        }
      },
      required: ['url']
    }
  }
}

export const parseDouyinDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parseDouyin',
    description: '解析抖音视频链接，提取标题、描述、封面图等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '抖音视频分享链接' }
      },
      required: ['url']
    }
  }
}

export const parseBilibiliDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parseBilibili',
    description: '解析 B站视频链接，提取标题、UP主、描述、封面图等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'B站视频链接，如 https://www.bilibili.com/video/BVxxx' }
      },
      required: ['url']
    }
  }
}

export const parseWeiboDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'parseWeibo',
    description: '解析微博链接，提取标题、作者、正文、图片等信息。',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '微博链接' }
      },
      required: ['url']
    }
  }
}

/**
 * 解析知乎内容
 */
export const parseZhihu: ToolExecutor = async (args): Promise<ToolResult> => {
  const { url } = args
  
  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供知乎链接',
      '示例: parseZhihu(url="https://zhuanlan.zhihu.com/p/xxxx")'
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
        headers:{
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
      'parseZhihu'
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
      '示例: parseXiaohongshu(url="https://www.xiaohongshu.com/xxx")'
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
      'parseXiaohongshu'
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
      '示例: parseWechat(url="https://mp.weixin.qq.com/s/xxx")'
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
      'parseWechat'
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
