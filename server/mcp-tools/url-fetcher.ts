/**
 * ============================================================================
 * MCP 工具模块 - url-fetcher
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/mcp-tools
 */


export interface FetchOptions {
  url: string
  type?: 'auto' | 'article' | 'video' | 'social'
  timeout?: number
  options?: { maxAnswers?: number }
}

/**
 * FetchedContent 接口定义
 *
 */
export interface FetchedContent {
  title: string
  content: string
  author?: string
  publishDate?: string
  images: string[]
  tags: string[]
  platform: string
  url: string
  fetchedAt: string
}

/**
 * URLFetcherTool 类
 *
 */
export class URLFetcherTool {
  name = 'url-fetcher'
  description = '从 URL 提取网页内容'

  async execute(options: FetchOptions): Promise<FetchedContent> {
    const { url, type = 'auto', options: parseOptions } = options

    const detectedType = type === 'auto' ? this.detectType(url) : type

    switch (detectedType) {
      case 'video':
        return this.fetchVideo(url)
      case 'social':
        return this.fetchSocial(url, parseOptions)
      case 'article':
      default:
        return this.fetchArticle(url, parseOptions)
    }
  }

  /**
   * 统一走 platform-parser 获取内容
   */
  private async fetchWithPlatformParser(url: string, timeout = 30000, options?: { maxAnswers?: number }): Promise<FetchedContent | null> {
    try {
      const response = await fetch('http://localhost:3000/api/platform/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, timeout, options })
      })
      if (!response.ok) return null

      const data = await response.json()
      if (!data.success || !data.data?.content) return null

      const { title, author, content, images, method, platform } = data.data
      return {
        title: title || 'Untitled',
        content,
        author,
        images: images || [],
        tags: this.extractTags(content),
        platform: platform || this.detectPlatform(url),
        url,
        fetchedAt: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  private async fetchArticle(url: string, parseOptions?: { maxAnswers?: number }): Promise<FetchedContent> {
    const platform = this.detectPlatform(url)

    // 统一走 platform-parser(后端自动选择Fetcher + Parser)
    const result = await this.fetchWithPlatformParser(url, 30000, parseOptions)
    if (result) return result

    // 兜底：返回占位
    console.error('URL Fetch failed:', url)
    return {
      title: '获取失败',
      content: `[无法获取 ${platform} 内容,请检查链接或稍后重试]`,
      images: [],
      tags: [platform],
      platform,
      url,
      fetchedAt: new Date().toISOString(),
    }
  }

  private async fetchVideo(url: string): Promise<FetchedContent> {
    return {
      title: `Video: ${url}`,
      content: `[Video content from ${url}]`,
      images: [],
      tags: ['video'],
      platform: this.detectPlatform(url),
      url,
      fetchedAt: new Date().toISOString(),
    }
  }

  private async fetchSocial(url: string, parseOptions?: { maxAnswers?: number }): Promise<FetchedContent> {
    const result = await this.fetchWithPlatformParser(url, 30000, parseOptions)
    if (result) return result

    const platform = this.detectPlatform(url)
    return {
      title: `${platform} 内容提取中`,
      content: `[无法获取 ${platform} 内容,请检查链接或稍后重试]`,
      images: [],
      tags: [platform],
      platform,
      url,
      fetchedAt: new Date().toISOString(),
    }
  }

  private detectType(url: string): 'article' | 'video' | 'social' {
    const videoPatterns = [
      /youtube\.com|youtu\.be/,
      /bilibili\.com|b23\.tv/,
      /douyin\.com/,
      /tiktok\.com/,
    ]

    const socialPatterns = [
      /xiaohongshu\.com|xhslink\.com/,
      /weibo\.com/,
      /twitter\.com|x\.com/,
      /zhihu\.com/,
    ]

    if (videoPatterns.some(p => p.test(url))) return 'video'
    if (socialPatterns.some(p => p.test(url))) return 'social'
    return 'article'
  }

  private detectPlatform(url: string): string {
    if (/xiaohongshu|xhslink/.test(url)) return 'xiaohongshu'
    if (/bilibili|b23\.tv/.test(url)) return 'bilibili'
    if (/weibo/.test(url)) return 'weibo'
    if (/twitter|x\.com/.test(url)) return 'twitter'
    if (/zhihu/.test(url)) return 'zhihu'
    if (/douyin/.test(url)) return 'douyin'
    if (/youtube|youtu\.be/.test(url)) return 'youtube'
    if (/juejin\.cn/.test(url)) return 'juejin'
    if (/csdn\.net/.test(url)) return 'csdn'
    if (/cnblogs\.com/.test(url)) return 'cnblogs'
    if (/jianshu\.com/.test(url)) return 'jianshu'
    if (/infoq\.cn/.test(url)) return 'infoq'
    if (/segmentfault\.com/.test(url)) return 'segmentfault'
    if (/oschina\.net/.test(url)) return 'oschina'
    return 'web'
  }

  private extractImages(content: string): string[] {
    const imgRegex = /!\[.*?\]\((.*?)\)/g
    const images: string[] = []
    let match
    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[1])
    }
    return images
  }

  private extractTags(content: string): string[] {
    const tagRegex = /#(\w+)/g
    const tags: string[] = []
    let match
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1])
    }
    return tags
  }
}

// 导出单例
export const urlFetcher = new URLFetcherTool()
