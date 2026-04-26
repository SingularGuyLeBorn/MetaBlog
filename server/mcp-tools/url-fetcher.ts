/**
 * MCP Tool: URL Fetcher
 * 从各种 URL 提取内容
 */

export interface FetchOptions {
  url: string
  type?: 'auto' | 'article' | 'video' | 'social'
  timeout?: number
}

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

export class URLFetcherTool {
  name = 'url-fetcher'
  description = '从 URL 提取网页内容'

  async execute(options: FetchOptions): Promise<FetchedContent> {
    const { url, type = 'auto' } = options

    // 根据 URL 自动判断类型
    const detectedType = type === 'auto' ? this.detectType(url) : type

    switch (detectedType) {
      case 'video':
        return this.fetchVideo(url)
      case 'social':
        return this.fetchSocial(url)
      case 'article':
      default:
        return this.fetchArticle(url)
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

  // 使用 Jina Reader API 提取文章内容
  private async fetchArticle(url: string): Promise<FetchedContent> {
    try {
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`
      const response = await fetch(jinaUrl)
      
      if (!response.ok) {
        const msg = response.status === 429
          ? "Jina Reader 请求过于频繁，请稍后重试"
          : response.status === 403
            ? "Jina Reader 拒绝访问，可能是目标网站被屏蔽"
            : response.status === 404
              ? "Jina Reader 无法获取该页面，请检查 URL 是否正确"
              : `Jina Reader 请求失败 (HTTP ${response.status})`;
        throw new Error(`Jina Reader ${response.status}: ${msg}。建议: 可尝试直接访问原 URL 或使用 /api/proxy/fetch 获取内容`)
      }

      const text = await response.text()
      
      // 解析 Jina 返回的格式
      const lines = text.split('\n')
      const title = lines[0]?.replace(/^Title:\s*/, '') || 'Untitled'
      const content = lines.slice(1).join('\n').trim()
      
      return {
        title,
        content,
        images: this.extractImages(content),
        tags: this.extractTags(content),
        platform: this.detectPlatform(url),
        url,
        fetchedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('URL Fetch failed:', error)
      throw error
    }
  }

  // 提取视频信息（使用 yt-dlp 逻辑）
  private async fetchVideo(url: string): Promise<FetchedContent> {
    // 这里应该调用 yt-dlp 或视频解析服务
    // 简化版本：返回基础信息
    
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

  // 社交媒体提取（调用专用服务）
  private async fetchSocial(url: string): Promise<FetchedContent> {
    // 检测平台并调用对应 MCP 服务
    const platform = this.detectPlatform(url)
    
    // 这里会调用 social-media-reader tool
    // 简化版本
    return {
      title: `Social Post: ${url}`,
      content: `[Social content from ${platform}]`,
      images: [],
      tags: [platform],
      platform,
      url,
      fetchedAt: new Date().toISOString(),
    }
  }

  private detectPlatform(url: string): string {
    if (/xiaohongshu|xhslink/.test(url)) return 'xiaohongshu'
    if (/bilibili|b23\.tv/.test(url)) return 'bilibili'
    if (/weibo/.test(url)) return 'weibo'
    if (/twitter|x\.com/.test(url)) return 'twitter'
    if (/zhihu/.test(url)) return 'zhihu'
    if (/douyin/.test(url)) return 'douyin'
    if (/youtube|youtu\.be/.test(url)) return 'youtube'
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
    // 简单的标签提取逻辑
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
