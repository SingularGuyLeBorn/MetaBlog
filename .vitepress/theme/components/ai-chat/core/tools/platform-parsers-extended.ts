/**
 * 扩展平台内容解析工具
 * 支持B站、抖音、CSDN、掘金、微博、Twitter等平台的内容提取
 */

import type { ToolDefinition } from './types'

const API_BASE = '/api'

/**
 * 解析B站视频内容
 */
export const parseBilibiliExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url, include_danmaku = false } = args
  if (!url) return '❌ 错误：请提供B站视频链接'

  try {
    // 提取BV号或av号
    const bvMatch = url.match(/bv([a-zA-Z0-9]+)/i) || url.match(/BV([a-zA-Z0-9]+)/)
    const avMatch = url.match(/av(\d+)/i)
    
    if (!bvMatch && !avMatch) {
      return `⚠️ 无法识别B站链接格式\n\n支持的格式：\n- https://www.bilibili.com/video/BVxxxxx\n- https://b23.tv/xxxxx`
    }

    const videoId = bvMatch ? bvMatch[1] : avMatch[1]
    const idType = bvMatch ? 'BV' : 'av'

    // 通过后端代理获取
    const response = await fetch(`${API_BASE}/proxy/bilibili`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        video_id: videoId,
        id_type: idType,
        include_danmaku
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }
    
    const data = await response.json()
    
    let result = `📺 **${data.title || '未知标题'}**\n`
    result += `👤 UP主: ${data.owner?.name || '未知'}\n`
    result += `▶️ 播放量: ${data.stat?.view || 0} | `
    result += `👍 点赞: ${data.stat?.like || 0} | `
    result += `💬 评论: ${data.stat?.reply || 0}\n`
    result += `🔗 ${url}\n\n`
    
    if (data.desc) {
      result += `---\n\n📄 简介:\n${data.desc.substring(0, 1000)}\n\n`
    }
    
    if (data.pic) {
      result += `🖼️ 封面: ${data.pic}\n`
    }
    
    if (include_danmaku && data.danmaku) {
      result += `\n💭 热门弹幕:\n${data.danmaku.slice(0, 10).join('\n')}`
    }

    return result

  } catch (error) {
    return `❌ B站解析失败: ${error instanceof Error ? error.message : String(error)}\n\n尝试通用解析...\n\n${await fetchGenericContent(url)}`
  }
}

/**
 * 解析抖音视频内容
 */
export const parseDouyinExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url } = args
  if (!url) return '❌ 错误：请提供抖音视频链接'

  try {
    // 提取视频ID
    const videoMatch = url.match(/video\/(\d+)/) || 
                       url.match(/douyin\.com\/(\w+)/) ||
                       url.match(/v\.douyin\.com\/(\w+)/)
    
    if (!videoMatch) {
      return `⚠️ 无法识别抖音链接格式\n\n支持的格式：\n- https://www.douyin.com/video/xxxxx\n- https://v.douyin.com/xxxxx`
    }

    // 通过后端代理获取
    const response = await fetch(`${API_BASE}/proxy/douyin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })

    if (!response.ok) {
      // 抖音有严格的反爬，使用通用解析
      return await fetchGenericContent(url, {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      })
    }
    
    const data = await response.json()
    
    let result = `🎵 **${data.title || '抖音视频'}**\n`
    result += `👤 作者: ${data.author?.nickname || '未知'}\n`
    result += `❤️ 点赞: ${data.statistics?.digg_count || 0} | `
    result += `💬 评论: ${data.statistics?.comment_count || 0} | `
    result += `↗️ 分享: ${data.statistics?.share_count || 0}\n`
    result += `🔗 ${url}\n\n`
    
    if (data.desc) {
      result += `---\n\n📄 描述:\n${data.desc.substring(0, 1000)}`
    }

    return result

  } catch (error) {
    return `❌ 抖音解析失败: ${error instanceof Error ? error.message : String(error)}\n\n注意：抖音有严格的反爬机制，建议手动复制内容。`
  }
}

/**
 * 解析CSDN博客内容
 */
export const parseCSDNExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url } = args
  if (!url) return '❌ 错误：请提供CSDN文章链接'

  try {
    if (!url.includes('csdn.net') && !url.includes('blog.csdn.net')) {
      return `⚠️ 非CSDN链接\n\n尝试通用解析...\n\n${await fetchGenericContent(url)}`
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
    const titleMatch = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                      html.match(/<h1[^>]*id="articleContentId"[^>]*>([\s\S]*?)<\/h1>/i)
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '未知标题'
    
    // 提取作者
    const authorMatch = html.match(/<a[^>]*class="[^"]*username[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                       html.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    const author = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, '').trim() : '未知作者'
    
    // 提取阅读数、点赞数
    const readMatch = html.match(/阅读数?\s*[：:]\s*(\d+)/i) ||
                     html.match(/<span[^>]*class="[^"]*read[^"]*"[^>]*>(\d+)<\/span>/i)
    const reads = readMatch ? readMatch[1] : '未知'
    
    // 提取正文
    const contentMatch = html.match(/<article[^>]*id="article_content"[^>]*>([\s\S]*?)<\/article>/i) ||
                        html.match(/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
    let content = ''
    if (contentMatch) {
      content = contentMatch[1]
        .replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '\n[图片: $1]\n')
        .replace(/<pre[^>]*>[\s\S]*?<\/pre>/g, '\n[代码块]\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    }

    return `📄 **${title}**\n👤 ${author} | 👁️ 阅读: ${reads}\n🔗 ${url}\n\n---\n\n${content || '(内容提取失败)'}\n\n⚠️ 注意：CSDN有反爬机制，部分内容可能需要登录查看`

  } catch (error) {
    return `❌ CSDN解析失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 解析掘金文章内容
 */
export const parseJuejinExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url } = args
  if (!url) return '❌ 错误：请提供掘金文章链接'

  try {
    // 提取文章ID
    const articleMatch = url.match(/post\/(\d+)/) || url.match(/article\/(\d+)/)
    
    if (!articleMatch || (!url.includes('juejin.cn') && !url.includes('juejin.im'))) {
      return `⚠️ 无法识别掘金链接格式\n\n尝试通用解析...\n\n${await fetchGenericContent(url)}`
    }

    const articleId = articleMatch[1]

    // 掘金有公开API
    const apiResponse = await fetch(`https://api.juejin.cn/content_api/v1/article/detail?article_id=${articleId}`)
    
    if (!apiResponse.ok) {
      // API失败，尝试网页解析
      return await fetchGenericContent(url)
    }
    
    const apiData = await apiResponse.json()
    
    if (!apiData.data) {
      throw new Error('API返回数据为空')
    }
    
    const article = apiData.data.article_info
    const author = apiData.data.author_user_info
    
    let result = `📄 **${article.title || '未知标题'}**\n`
    result += `👤 ${author.user_name || '未知作者'}\n`
    result += `👍 点赞: ${article.digg_count || 0} | `
    result += `👁️ 阅读: ${article.view_count || 0} | `
    result += `💬 评论: ${article.comment_count || 0}\n`
    result += `🔗 ${url}\n\n---\n\n`
    
    if (article.brief_content) {
      result += `📋 摘要:\n${article.brief_content}\n\n`
    }
    
    if (article.mark_content) {
      // 提取纯文本（掘金API返回的是markdown）
      const plainText = article.mark_content
        .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
        .replace(/\[.*?\]\(.*?\)/g, '$1')
        .replace(/```[\s\S]*?```/g, '\n[代码块]\n')
        .replace(/#+ /g, '')
        .replace(/\*\*/g, '')
        .trim()
        .slice(0, 3000)
      
      result += `📝 内容:\n${plainText}`
    }

    return result

  } catch (error) {
    return `❌ 掘金解析失败: ${error instanceof Error ? error.message : String(error)}\n\n尝试通用解析...\n\n${await fetchGenericContent(url)}`
  }
}

/**
 * 解析微博内容
 */
export const parseWeiboExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url } = args
  if (!url) return '❌ 错误：请提供微博链接'

  try {
    // 提取微博ID
    const weiboMatch = url.match(/weibo\.com\/(\d+)\/(\w+)/) ||
                      url.match(/weibo\.cn\/detail\/(\d+)/) ||
                      url.match(/weibo\.com\/(\w+)/)
    
    if (!weiboMatch && !url.includes('weibo.com') && !url.includes('weibo.cn')) {
      return `⚠️ 无法识别微博链接格式`
    }

    // 微博有严格的反爬，使用通用解析
    const html = await fetchGenericContent(url, {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
    })
    
    return `📱 微博内容\n🔗 ${url}\n\n${html}\n\n⚠️ 注意：微博有严格的反爬机制，建议手动复制内容。`

  } catch (error) {
    return `❌ 微博解析失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 解析Twitter/X内容
 */
export const parseTwitterExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url, include_replies = false } = args
  if (!url) return '❌ 错误：请提供Twitter/X链接'

  try {
    // 提取推文ID
    const tweetMatch = url.match(/twitter\.com\/\w+\/status\/(\d+)/) ||
                      url.match(/x\.com\/\w+\/status\/(\d+)/)
    
    if (!tweetMatch) {
      return `⚠️ 无法识别Twitter/X链接格式\n\n支持的格式：\n- https://twitter.com/username/status/xxxxx\n- https://x.com/username/status/xxxxx`
    }

    const tweetId = tweetMatch[1]

    // Twitter有严格的反爬，需要使用Nitter等镜像站或API
    // 尝试使用nitter.net（如果可用）
    try {
      const nitterUrl = `https://nitter.net/i/web/status/${tweetId}`
      const response = await fetch(`${API_BASE}/proxy/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: nitterUrl,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
      })

      if (response.ok) {
        const html = await response.text()
        
        // 提取推文内容
        const contentMatch = html.match(/<div[^>]*class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                            html.match(/<div[^>]*class="main-tweet"[^>]*>([\s\S]*?)<\/div>/i)
        
        if (contentMatch) {
          const content = contentMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 1000)
          
          const authorMatch = html.match(/<a[^>]*class="username"[^>]*>@(\w+)<\/a>/i)
          const author = authorMatch ? authorMatch[1] : '未知'
          
          const timeMatch = html.match(/<span[^>]*class="tweet-date"[^>]*>([\s\S]*?)<\/span>/i)
          const time = timeMatch ? timeMatch[1].replace(/<[^>]+>/g, '').trim() : '未知时间'
          
          return `🐦 **@${author}**\n📅 ${time}\n🔗 ${url}\n\n---\n\n${content}\n\n⚠️ 通过Nitter解析，内容可能不完整`
        }
      }
    } catch {
      // Nitter失败，使用备用方案
    }

    // 使用通用解析
    return await fetchGenericContent(url)

  } catch (error) {
    return `❌ Twitter/X解析失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

/**
 * 解析YouTube视频内容
 */
export const parseYoutubeExecutor = async (args: Record<string, any>): Promise<string> => {
  const { url, include_transcript = false } = args
  if (!url) return '❌ 错误：请提供YouTube视频链接'

  try {
    // 提取视频ID
    const videoMatch = url.match(/v=([a-zA-Z0-9_-]{11})/) ||
                      url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
                      url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
    
    if (!videoMatch) {
      return `⚠️ 无法识别YouTube链接格式\n\n支持的格式：\n- https://www.youtube.com/watch?v=xxxxx\n- https://youtu.be/xxxxx`
    }

    const videoId = videoMatch[1]

    // 使用oEmbed API获取基本信息（无需API Key）
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    )
    
    if (!oembedResponse.ok) {
      throw new Error('oEmbed API失败')
    }
    
    const oembedData = await oembedResponse.json()
    
    let result = `📺 **${oembedData.title || '未知标题'}**\n`
    result += `👤 作者: ${oembedData.author_name || '未知'}\n`
    result += `🔗 ${url}\n`
    if (oembedData.thumbnail_url) {
      result += `🖼️ 封面: ${oembedData.thumbnail_url}\n`
    }
    
    if (include_transcript) {
      result += `\n⚠️ 字幕获取需要额外的字幕API支持\n`
    }
    
    result += `\n💡 提示：使用 MCP YouTube Server 可以获取更详细的信息（播放列表、字幕等）`

    return result

  } catch (error) {
    return `❌ YouTube解析失败: ${error instanceof Error ? error.message : String(error)}\n\n尝试通用解析...\n\n${await fetchGenericContent(url)}`
  }
}

/**
 * 批量解析多个链接
 */
export const parseMultipleLinksExecutor = async (args: Record<string, any>): Promise<string> => {
  const { urls, extract_content = true } = args
  
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return '❌ 错误：请提供要解析的链接数组'
  }

  if (urls.length > 10) {
    return '❌ 错误：一次最多解析10个链接'
  }

  const results: string[] = []
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    results.push(`\n--- 链接 ${i + 1}/${urls.length} ---\n`)
    
    // 根据URL自动选择解析器
    const platform = detectPlatform(url)
    
    try {
      switch (platform) {
        case 'zhihu':
          const { parseZhihuExecutor } = await import('./platform-parsers')
          results.push(await parseZhihuExecutor({ url }))
          break
        case 'xiaohongshu':
          const { parseXiaohongshuExecutor } = await import('./platform-parsers')
          results.push(await parseXiaohongshuExecutor({ url }))
          break
        case 'wechat':
          const { parseWechatExecutor } = await import('./platform-parsers')
          results.push(await parseWechatExecutor({ url }))
          break
        case 'bilibili':
          results.push(await parseBilibiliExecutor({ url }))
          break
        case 'douyin':
          results.push(await parseDouyinExecutor({ url }))
          break
        case 'csdn':
          results.push(await parseCSDNExecutor({ url }))
          break
        case 'juejin':
          results.push(await parseJuejinExecutor({ url }))
          break
        case 'weibo':
          results.push(await parseWeiboExecutor({ url }))
          break
        case 'twitter':
          results.push(await parseTwitterExecutor({ url }))
          break
        case 'youtube':
          results.push(await parseYoutubeExecutor({ url }))
          break
        default:
          results.push(await fetchGenericContent(url))
      }
    } catch (error) {
      results.push(`❌ 解析失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return `📊 批量解析结果（共 ${urls.length} 个链接）\n${results.join('\n')}`
}

// ============ 工具定义 ============

export const extendedPlatformParserDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'parse_bilibili',
      description: `解析B站（哔哩哔哩）视频内容，提取标题、UP主、播放量、简介等信息。

使用场景：
1. 用户分享B站视频链接
2. 提取视频元数据（标题、作者、播放量等）
3. 获取视频简介和封面

支持的链接格式：
- https://www.bilibili.com/video/BVxxxxx
- https://b23.tv/xxxxx
- https://www.bilibili.com/video/avxxxxx`,
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'B站视频链接' 
          },
          include_danmaku: {
            type: 'boolean',
            description: '是否提取热门弹幕，默认false',
            default: false
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_douyin',
      description: `解析抖音视频内容，提取标题、作者、点赞数、描述等信息。

使用场景：
1. 用户分享抖音视频链接
2. 提取视频元数据

支持的链接格式：
- https://www.douyin.com/video/xxxxx
- https://v.douyin.com/xxxxx`,
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: '抖音视频链接' 
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_csdn',
      description: `解析CSDN博客文章内容，提取标题、作者、阅读数、正文等。

使用场景：
1. 用户分享CSDN技术文章
2. 提取代码和技术内容
3. 获取文章元数据

支持的链接格式：
- https://blog.csdn.net/xxxxx/article/details/xxxxx
- https://xxxxx.csdn.net/xxxxx`,
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'CSDN文章链接' 
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_juejin',
      description: `解析掘金（Juejin）文章内容，提取标题、作者、阅读数、正文等。

使用场景：
1. 用户分享掘金技术文章
2. 提取技术内容和学习资料

支持的链接格式：
- https://juejin.cn/post/xxxxx
- https://juejin.im/post/xxxxx`,
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: '掘金文章链接' 
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_weibo',
      description: `解析微博内容，提取正文、作者、发布时间等。

使用场景：
1. 用户分享微博链接
2. 获取热点话题内容

支持的链接格式：
- https://weibo.com/xxxxx/xxxxx
- https://weibo.cn/detail/xxxxx`,
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: '微博链接' 
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_twitter',
      description: `解析Twitter/X推文内容，提取正文、作者、时间等。

使用场景：
1. 用户分享Twitter/X链接
2. 获取国际社交媒体内容

支持的链接格式：
- https://twitter.com/username/status/xxxxx
- https://x.com/username/status/xxxxx`,
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'Twitter/X链接' 
          },
          include_replies: {
            type: 'boolean',
            description: '是否包含回复，默认false',
            default: false
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_youtube',
      description: `解析YouTube视频内容，提取标题、作者、封面等。

使用场景：
1. 用户分享YouTube视频链接
2. 获取视频元数据

支持的链接格式：
- https://www.youtube.com/watch?v=xxxxx
- https://youtu.be/xxxxx`,
      parameters: {
        type: 'object',
        properties: {
          url: { 
            type: 'string', 
            description: 'YouTube视频链接' 
          },
          include_transcript: {
            type: 'boolean',
            description: '是否尝试获取字幕，默认false',
            default: false
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'parse_multiple_links',
      description: `批量解析多个平台链接。自动识别平台类型并使用对应的解析器。

支持的平台：知乎、小红书、微信公众号、B站、抖音、CSDN、掘金、微博、Twitter/X、YouTube、GitHub等。

使用场景：
1. 用户一次分享多个链接
2. 批量提取内容摘要
3. 整理收藏夹内容

限制：一次最多解析10个链接`,
      parameters: {
        type: 'object',
        properties: {
          urls: { 
            type: 'array',
            items: { type: 'string' },
            description: '链接数组' 
          },
          extract_content: {
            type: 'boolean',
            description: '是否提取完整内容，默认true',
            default: true
          }
        },
        required: ['urls']
      }
    }
  }
]

// ============ 辅助函数 ============

/**
 * 检测平台类型
 */
function detectPlatform(url: string): string {
  if (url.includes('zhihu.com')) return 'zhihu'
  if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) return 'xiaohongshu'
  if (url.includes('mp.weixin.qq.com')) return 'wechat'
  if (url.includes('bilibili.com') || url.includes('b23.tv')) return 'bilibili'
  if (url.includes('douyin.com') || url.includes('iesdouyin.com')) return 'douyin'
  if (url.includes('csdn.net')) return 'csdn'
  if (url.includes('juejin.cn') || url.includes('juejin.im')) return 'juejin'
  if (url.includes('weibo.com') || url.includes('weibo.cn')) return 'weibo'
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter'
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('github.com')) return 'github'
  if (url.includes('stackoverflow.com')) return 'stackoverflow'
  if (url.includes('arxiv.org')) return 'arxiv'
  return 'unknown'
}

/**
 * 通用内容获取（增强版）
 */
async function fetchGenericContent(url: string, options?: { userAgent?: string }): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url,
        headers: { 
          'User-Agent': options?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const html = await response.text()
    
    // 提取标题
    const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/i) ||
                      html.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : '未知标题'
    
    // 提取描述
    const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/i) ||
                     html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i)
    const description = descMatch ? descMatch[1].trim() : ''
    
    // 提取图片
    const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i)
    const image = imageMatch ? imageMatch[1] : ''
    
    // 提取站点名称
    const siteMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]*)"/i)
    const site = siteMatch ? siteMatch[1] : '未知来源'

    let result = `🌐 **${title}**\n`
    result += `🏠 ${site}\n`
    result += `🔗 ${url}\n`
    if (image) {
      result += `🖼️ 封面: ${image}\n`
    }
    if (description) {
      result += `\n---\n\n${description}`
    }

    return result

  } catch (error) {
    return `❌ 通用解析失败: ${error instanceof Error ? error.message : String(error)}`
  }
}

// 执行器映射
export const extendedPlatformParserExecutors: Record<string, (args: Record<string, any>) => Promise<string>> = {
  parse_bilibili: parseBilibiliExecutor,
  parse_douyin: parseDouyinExecutor,
  parse_csdn: parseCSDNExecutor,
  parse_juejin: parseJuejinExecutor,
  parse_weibo: parseWeiboExecutor,
  parse_twitter: parseTwitterExecutor,
  parse_youtube: parseYoutubeExecutor,
  parse_multiple_links: parseMultipleLinksExecutor
}
