/**
 * MCP Tool: Browser Automation (AgentReach)
 * 
 * 让 Agent 拥有"眼睛"和"手"，能够：
 * - 打开真实浏览器访问社交媒体
 * - 模拟人类浏览行为（滚动、点击、停留）
 * - 截图分析页面内容
 * - 提取文字、图片、视频信息
 * 
 * 参考: agentreach - 给 Agent 装上眼睛刷小红书/B站
 */

export interface BrowserSession {
  id: string
  url: string
  platform: string
  status: 'idle' | 'browsing' | 'extracting' | 'error'
  startTime: string
  lastActivity: string
  screenshot?: string    // base64 截图
  cookies?: Record<string, string>
}

export interface BrowseOptions {
  url: string
  platform: 'xiaohongshu' | 'bilibili' | 'twitter' | 'zhihu' | 'weibo' | 'generic'
  actions?: BrowseAction[]
  extractContent?: boolean
  takeScreenshots?: boolean
  scrollCount?: number    // 滚动次数
  waitTime?: number       // 每页等待时间(ms)
}

export type BrowseAction = 
  | { type: 'click'; selector: string }
  | { type: 'scroll'; direction: 'down' | 'up'; amount: number }
  | { type: 'wait'; ms: number }
  | { type: 'type'; selector: string; text: string }
  | { type: 'screenshot' }

export interface ExtractedContent {
  title: string
  text: string
  author?: string
  authorAvatar?: string
  images: string[]
  videoUrl?: string
  stats?: {
    likes?: number
    comments?: number
    shares?: number
    views?: number
  }
  tags: string[]
  timestamp?: string
  url: string
}

export interface BrowserAutomationResult {
  success: boolean
  sessionId: string
  url: string
  platform: string
  content?: ExtractedContent
  screenshots: string[]    // base64 截图列表
  actions: BrowseAction[]
  duration: number         // 执行时长(ms)
  error?: string
}

/**
 * Browser Automation Tool
 * 
 * 架构说明：
 * - 浏览器端通过 WebSocket 连接到 Playwright Server
 * - 或者调用本地运行的 Playwright HTTP API
 * - 支持截图分析（Agent 的"视觉"）
 */
export class BrowserAutomationTool {
  name = 'browser-automation'
  description = '浏览器自动化 - 让 Agent 拥有眼睛和手'
  
  private sessions: Map<string, BrowserSession> = new Map()
  private API_BASE = 'http://localhost:3001'  // Playwright Server 地址
  private isServerAvailable = false

  constructor() {
    this.checkServerStatus()
  }

  /**
   * 检查 Playwright Server 是否可用
   */
  private async checkServerStatus(): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      this.isServerAvailable = response.ok
      console.log(`[BrowserAgent] Server status: ${this.isServerAvailable ? 'online' : 'offline'}`)
    } catch {
      this.isServerAvailable = false
      console.warn('[BrowserAgent] Playwright Server not available. Run: npx playwright-server start')
    }
  }

  /**
   * 执行浏览任务
   */
  async execute(options: BrowseOptions): Promise<BrowserAutomationResult> {
    const sessionId = `browser_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const startTime = Date.now()

    // 创建会话
    const session: BrowserSession = {
      id: sessionId,
      url: options.url,
      platform: options.platform,
      status: 'browsing',
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    }
    this.sessions.set(sessionId, session)

    try {
      if (!this.isServerAvailable) {
        await this.checkServerStatus()
        if (!this.isServerAvailable) {
          throw new Error('Playwright Server not available. Please start it first.')
        }
      }

      console.log(`[BrowserAgent] Starting session ${sessionId} for ${options.platform}: ${options.url}`)

      // 执行浏览流程
      const result = await this.runBrowseFlow(sessionId, options)
      
      session.status = 'idle'
      session.lastActivity = new Date().toISOString()

      return {
        success: true,
        sessionId,
        url: options.url,
        platform: options.platform,
        content: result.content,
        screenshots: result.screenshots,
        actions: result.actions,
        duration: Date.now() - startTime,
      }

    } catch (error) {
      session.status = 'error'
      session.lastActivity = new Date().toISOString()

      return {
        success: false,
        sessionId,
        url: options.url,
        platform: options.platform,
        screenshots: [],
        actions: [],
        duration: Date.now() - startTime,
        error: String(error),
      }
    }
  }

  /**
   * 运行浏览流程
   */
  private async runBrowseFlow(
    sessionId: string, 
    options: BrowseOptions
  ): Promise<{ content?: ExtractedContent; screenshots: string[]; actions: BrowseAction[] }> {
    
    const screenshots: string[] = []
    const actions: BrowseAction[] = []
    let content: ExtractedContent | undefined

    // 1. 打开页面
    await this.sendCommand('goto', { 
      sessionId, 
      url: options.url,
      waitUntil: 'networkidle'
    })
    
    actions.push({ type: 'wait', ms: 2000 })
    await this.wait(2000)

    // 2. 根据平台执行特定行为
    switch (options.platform) {
      case 'xiaohongshu':
        content = await this.browseXiaohongshu(sessionId, actions, screenshots, options)
        break
      case 'bilibili':
        content = await this.browseBilibili(sessionId, actions, screenshots, options)
        break
      case 'twitter':
        content = await this.browseTwitter(sessionId, actions, screenshots, options)
        break
      case 'zhihu':
        content = await this.browseZhihu(sessionId, actions, screenshots, options)
        break
      default:
        content = await this.browseGeneric(sessionId, actions, screenshots, options)
    }

    return { content, screenshots, actions }
  }

  /**
   * 小红书浏览策略
   */
  private async browseXiaohongshu(
    sessionId: string,
    actions: BrowseAction[],
    screenshots: string[],
    options: BrowseOptions
  ): Promise<ExtractedContent> {
    // 等待笔记内容加载
    await this.wait(3000)

    // 截图（Agent 的"眼睛"看到的内容）
    if (options.takeScreenshots) {
      const screenshot = await this.sendCommand('screenshot', { sessionId, fullPage: true })
      if (screenshot?.data) {
        screenshots.push(screenshot.data)
      }
    }

    // 滚动浏览评论
    const scrollCount = options.scrollCount || 3
    for (let i = 0; i < scrollCount; i++) {
      actions.push({ type: 'scroll', direction: 'down', amount: 800 })
      await this.sendCommand('scroll', { sessionId, direction: 'down', amount: 800 })
      await this.wait(options.waitTime || 1500)
    }

    // 提取内容
    const extracted = await this.sendCommand('extract', { 
      sessionId,
      selectors: {
        title: 'h1.title, .title',
        text: '.note-content, .content, .desc',
        author: '.author-name, .user-name',
        authorAvatar: '.author-avatar img, .user-avatar img',
        images: '.note-image img, .swiper-slide img',
        likes: '.like-count, .likes',
        comments: '.comment-count, .comments',
        tags: '.tag, .hash-tag'
      }
    })

    return {
      title: extracted?.title || '小红书笔记',
      text: extracted?.text || '',
      author: extracted?.author,
      authorAvatar: extracted?.authorAvatar,
      images: extracted?.images || [],
      stats: {
        likes: this.parseCount(extracted?.likes),
        comments: this.parseCount(extracted?.comments),
      },
      tags: extracted?.tags || [],
      url: options.url,
    }
  }

  /**
   * B站浏览策略
   */
  private async browseBilibili(
    sessionId: string,
    actions: BrowseAction[],
    screenshots: string[],
    options: BrowseOptions
  ): Promise<ExtractedContent> {
    // 等待视频页面加载
    await this.wait(3000)

    // 截图封面
    if (options.takeScreenshots) {
      const screenshot = await this.sendCommand('screenshot', { sessionId, fullPage: false })
      if (screenshot?.data) {
        screenshots.push(screenshot.data)
      }
    }

    // 滚动查看简介和评论
    actions.push({ type: 'scroll', direction: 'down', amount: 500 })
    await this.sendCommand('scroll', { sessionId, direction: 'down', amount: 500 })
    await this.wait(2000)

    // 提取内容
    const extracted = await this.sendCommand('extract', { 
      sessionId,
      selectors: {
        title: 'h1.video-title, .video-title',
        text: '.video-desc, .desc-info-text',
        author: '.up-name, .username',
        authorAvatar: '.up-avatar img, .face img',
        views: '.view, .view-count',
        likes: '.like, .like-count',
        comments: '.reply, .reply-count',
        tags: '.tag, .video-tag'
      }
    })

    return {
      title: extracted?.title || 'B站视频',
      text: extracted?.text || '',
      author: extracted?.author,
      authorAvatar: extracted?.authorAvatar,
      images: [],  // B站视频可能没有直接图片
      videoUrl: options.url,
      stats: {
        views: this.parseCount(extracted?.views),
        likes: this.parseCount(extracted?.likes),
        comments: this.parseCount(extracted?.comments),
      },
      tags: extracted?.tags || [],
      url: options.url,
    }
  }

  /**
   * Twitter 浏览策略
   */
  private async browseTwitter(
    sessionId: string,
    actions: BrowseAction[],
    screenshots: string[],
    options: BrowseOptions
  ): Promise<ExtractedContent> {
    await this.wait(3000)

    if (options.takeScreenshots) {
      const screenshot = await this.sendCommand('screenshot', { sessionId })
      if (screenshot?.data) screenshots.push(screenshot.data)
    }

    const extracted = await this.sendCommand('extract', { 
      sessionId,
      selectors: {
        text: '[data-testid="tweetText"]',
        author: '[data-testid="User-Name"] a',
        images: '[data-testid="tweetPhoto"] img',
        likes: '[data-testid="like"]',
        comments: '[data-testid="reply"]',
        shares: '[data-testid="retweet"]'
      }
    })

    return {
      title: 'Twitter Post',
      text: extracted?.text || '',
      author: extracted?.author,
      images: extracted?.images || [],
      stats: {
        likes: this.parseCount(extracted?.likes),
        comments: this.parseCount(extracted?.comments),
        shares: this.parseCount(extracted?.shares),
      },
      tags: [],
      url: options.url,
    }
  }

  /**
   * 知乎浏览策略
   */
  private async browseZhihu(
    sessionId: string,
    actions: BrowseAction[],
    screenshots: string[],
    options: BrowseOptions
  ): Promise<ExtractedContent> {
    await this.wait(3000)

    // 知乎需要滚动加载全文
    const scrollCount = options.scrollCount || 2
    for (let i = 0; i < scrollCount; i++) {
      actions.push({ type: 'scroll', direction: 'down', amount: 1000 })
      await this.sendCommand('scroll', { sessionId, direction: 'down', amount: 1000 })
      await this.wait(1500)
    }

    if (options.takeScreenshots) {
      const screenshot = await this.sendCommand('screenshot', { sessionId, fullPage: true })
      if (screenshot?.data) screenshots.push(screenshot.data)
    }

    const extracted = await this.sendCommand('extract', { 
      sessionId,
      selectors: {
        title: 'h1.QuestionHeader-title, h1',
        text: '.RichContent-inner, .Post-RichTextContainer',
        author: '.AuthorInfo-name',
        authorAvatar: '.AuthorInfo-avatar img',
        images: '.RichContent img',
        likes: '.VoteButton--up',
        comments: '.ContentItem-action button'
      }
    })

    return {
      title: extracted?.title || '知乎回答',
      text: extracted?.text || '',
      author: extracted?.author,
      authorAvatar: extracted?.authorAvatar,
      images: extracted?.images || [],
      stats: {
        likes: this.parseCount(extracted?.likes),
        comments: this.parseCount(extracted?.comments),
      },
      tags: [],
      url: options.url,
    }
  }

  /**
   * 通用浏览策略
   */
  private async browseGeneric(
    sessionId: string,
    actions: BrowseAction[],
    screenshots: string[],
    options: BrowseOptions
  ): Promise<ExtractedContent> {
    await this.wait(3000)

    if (options.takeScreenshots) {
      const screenshot = await this.sendCommand('screenshot', { sessionId, fullPage: true })
      if (screenshot?.data) screenshots.push(screenshot.data)
    }

    // 尝试提取常见内容
    const extracted = await this.sendCommand('extract', { 
      sessionId,
      selectors: {
        title: 'h1, .title, article h1',
        text: 'article, .content, main, .post-content',
        author: '.author, .byline',
        images: 'article img, .content img'
      }
    })

    return {
      title: extracted?.title || 'Web Page',
      text: extracted?.text || '',
      author: extracted?.author,
      images: extracted?.images || [],
      tags: [],
      url: options.url,
    }
  }

  /**
   * 发送命令到 Playwright Server
   */
  private async sendCommand(action: string, params: Record<string, any>): Promise<any> {
    try {
      const response = await fetch(`${this.API_BASE}/api/browser/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(30000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`[BrowserAgent] Command failed: ${action}`, error)
      throw error
    }
  }

  /**
   * 等待
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 解析数量字符串（如 "1.2万" -> 12000）
   */
  private parseCount(text: string | undefined): number | undefined {
    if (!text) return undefined
    
    const clean = text.replace(/,/g, '').trim()
    
    // 处理中文数字
    if (clean.includes('万')) {
      const num = parseFloat(clean.replace('万', ''))
      return Math.round(num * 10000)
    }
    if (clean.includes('千')) {
      const num = parseFloat(clean.replace('千', ''))
      return Math.round(num * 1000)
    }
    if (clean.includes('百万')) {
      const num = parseFloat(clean.replace('百万', ''))
      return Math.round(num * 1000000)
    }
    
    const num = parseInt(clean, 10)
    return isNaN(num) ? undefined : num
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): BrowserSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string): Promise<boolean> {
    try {
      await this.sendCommand('close', { sessionId })
      this.sessions.delete(sessionId)
      return true
    } catch {
      return false
    }
  }

  /**
   * 关闭所有会话
   */
  async closeAllSessions(): Promise<void> {
    const promises = Array.from(this.sessions.keys()).map(id => this.closeSession(id))
    await Promise.all(promises)
  }
}

// 创建默认实例
export const browserAutomation = new BrowserAutomationTool()
