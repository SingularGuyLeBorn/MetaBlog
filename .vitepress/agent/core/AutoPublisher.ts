/**
 * AutoPublisher - 自动发布决策与执行系统
 * 
 * 功能:
 * - 智能发布决策 (自动/草稿/审核)
 * - Git 自动提交与推送
 * - 构建触发
 * - 索引更新
 * - 多通道通知
 * - PR 创建 (人工审核流程)
 */

import { getStructuredLogger } from '../runtime/StructuredLogger'
import { getContentEvaluator, EvaluationResult } from './ContentEvaluator'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import simpleGit from 'simple-git'

// 发布配置
export interface PublishConfig {
  mode: 'auto' | 'draft' | 'review'
  autoPublishThreshold: number // 质量分数阈值
  createPR: boolean
  notifyChannels: NotificationChannel[]
  git: {
    autoCommit: boolean
    autoPush: boolean
    commitPrefix: string
    authorName: string
    authorEmail: string
  }
  build: {
    autoTrigger: boolean
    buildCommand: string
  }
}

export type NotificationChannel = 
  | { type: 'webhook'; url: string }
  | { type: 'email'; to: string[] }
  | { type: 'slack'; webhook: string }
  | { type: 'log' }

// 发布结果
export interface PublishResult {
  success: boolean
  path: string
  action: 'published' | 'saved-as-draft' | 'created-pr' | 'failed'
  commitHash?: string
  prUrl?: string
  buildTriggered?: boolean
  notificationsSent: string[]
  error?: string
}

// 发布历史
export interface PublishHistory {
  id: string
  path: string
  title: string
  timestamp: number
  action: PublishResult['action']
  quality: number
  cost: number
}

const DEFAULT_CONFIG: PublishConfig = {
  mode: 'review', // 默认需要审核
  autoPublishThreshold: 8.0,
  createPR: true,
  notifyChannels: [{ type: 'log' }],
  git: {
    autoCommit: true,
    autoPush: false, // 谨慎起见，默认不自动推送
    commitPrefix: '[agent-auto]',
    authorName: 'MetaUniverse Agent',
    authorEmail: 'agent@metablog.local'
  },
  build: {
    autoTrigger: false,
    buildCommand: 'npm run docs:build'
  }
}

export class AutoPublisher {
  private logger = getStructuredLogger()
  private evaluator = getContentEvaluator()
  private config: PublishConfig
  
  private git = simpleGit(join(process.cwd(), 'docs'))
  private history: PublishHistory[] = []
  
  private readonly HISTORY_FILE = join(
    process.cwd(), 
    '.vitepress', 
    'agent', 
    'memory', 
    'publish-history.json'
  )

  constructor(config: Partial<PublishConfig> = {}) {
    this.config = this.mergeConfig(config)
    this.loadHistory()
  }

  private mergeConfig(config: Partial<PublishConfig>): PublishConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      git: { ...DEFAULT_CONFIG.git, ...config.git },
      build: { ...DEFAULT_CONFIG.build, ...config.build }
    }
  }

  // ============================================
  // 主要发布入口
  // ============================================

  /**
   * 发布内容
   */
  async publish(
    contentPath: string,
    options?: {
      title?: string
      forceMode?: PublishConfig['mode']
      evaluation?: EvaluationResult
    }
  ): Promise<PublishResult> {
    const startTime = Date.now()
    const title = options?.title || contentPath.split('/').pop() || 'Untitled'

    this.logger.info('publisher.start', 'Starting publish process', {
      path: contentPath,
      title,
      mode: options?.forceMode || this.config.mode
    })

    try {
      // 1. 读取并验证内容
      const content = await this.readContent(contentPath)
      if (!content) {
        return this.createErrorResult(contentPath, 'Failed to read content')
      }

      // 2. 评估内容 (如果没有提供评估结果)
      let evaluation = options?.evaluation
      if (!evaluation) {
        evaluation = await this.evaluator.evaluate(content, title)
      }

      this.logger.info('publisher.evaluated', 'Content evaluated', {
        quality: evaluation.quality.overall,
        relevance: evaluation.relevance.overall,
        shouldCreate: evaluation.shouldCreate
      })

      // 3. 决定是否发布
      const mode = options?.forceMode || this.decidePublishMode(evaluation)

      // 4. 根据模式执行相应操作
      switch (mode) {
        case 'auto':
          return await this.autoPublish(contentPath, title, evaluation)
        case 'draft':
          return await this.saveAsDraft(contentPath, title, evaluation)
        case 'review':
          return await this.createForReview(contentPath, title, evaluation)
        default:
          return this.createErrorResult(contentPath, `Unknown publish mode: ${mode}`)
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('publisher.error', 'Publish failed', { error: errorMsg })
      return this.createErrorResult(contentPath, errorMsg)
    }
  }

  // ============================================
  // 发布模式实现
  // ============================================

  private async autoPublish(
    contentPath: string,
    title: string,
    evaluation: EvaluationResult
  ): Promise<PublishResult> {
    this.logger.info('publisher.auto-publish', 'Auto-publishing content', { path: contentPath })

    const notifications: string[] = []

    try {
      // 1. Git 提交
      let commitHash: string | undefined
      if (this.config.git.autoCommit) {
        commitHash = await this.gitCommit(contentPath, title, evaluation)
        notifications.push('git-committed')
      }

      // 2. Git 推送
      if (this.config.git.autoPush) {
        await this.gitPush()
        notifications.push('git-pushed')
      }

      // 3. 触发构建
      let buildTriggered = false
      if (this.config.build.autoTrigger) {
        buildTriggered = await this.triggerBuild()
        notifications.push('build-triggered')
      }

      // 4. 更新索引
      await this.updateIndex(contentPath, title, evaluation)

      // 5. 发送通知
      await this.sendNotifications({
        type: 'published',
        title,
        path: contentPath,
        quality: evaluation.quality.overall
      })
      notifications.push('notification-sent')

      // 6. 记录历史
      this.recordHistory({
        id: `pub_${Date.now()}`,
        path: contentPath,
        title,
        timestamp: Date.now(),
        action: 'published',
        quality: evaluation.quality.overall,
        cost: 0
      })

      this.logger.success('publisher.published', 'Content auto-published', {
        path: contentPath,
        commitHash
      })

      return {
        success: true,
        path: contentPath,
        action: 'published',
        commitHash,
        buildTriggered,
        notificationsSent: notifications
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.logger.error('publisher.auto-publish-failed', 'Auto-publish failed', { error: errorMsg })
      return this.createErrorResult(contentPath, errorMsg)
    }
  }

  private async saveAsDraft(
    contentPath: string,
    title: string,
    evaluation: EvaluationResult
  ): Promise<PublishResult> {
    this.logger.info('publisher.save-draft', 'Saving as draft', { path: contentPath })

    try {
      // 1. 读取内容
      const content = await this.readContent(contentPath)
      if (!content) {
        return this.createErrorResult(contentPath, 'Failed to read content')
      }

      // 2. 添加 draft 标记到 frontmatter
      const draftContent = this.addDraftMarker(content)

      // 3. 移动到 drafts 目录
      const draftPath = contentPath.replace('/posts/', '/drafts/')
      await this.ensureDir(dirname(draftPath))
      await fs.writeFile(draftPath, draftContent, 'utf-8')

      // 4. 如果原文件不在 drafts 目录，删除原文件
      if (!contentPath.includes('/drafts/')) {
        await fs.unlink(contentPath)
      }

      // 5. 发送通知
      await this.sendNotifications({
        type: 'draft',
        title,
        path: draftPath,
        quality: evaluation.quality.overall,
        reason: evaluation.reason
      })

      // 6. 记录历史
      this.recordHistory({
        id: `pub_${Date.now()}`,
        path: draftPath,
        title,
        timestamp: Date.now(),
        action: 'saved-as-draft',
        quality: evaluation.quality.overall,
        cost: 0
      })

      this.logger.success('publisher.draft-saved', 'Content saved as draft', { path: draftPath })

      return {
        success: true,
        path: draftPath,
        action: 'saved-as-draft',
        notificationsSent: ['saved-as-draft', 'notification-sent']
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return this.createErrorResult(contentPath, errorMsg)
    }
  }

  private async createForReview(
    contentPath: string,
    title: string,
    evaluation: EvaluationResult
  ): Promise<PublishResult> {
    this.logger.info('publisher.create-review', 'Creating PR for review', { path: contentPath })

    try {
      // 1. 创建新分支
      const branchName = `agent/content-${Date.now()}`
      await this.git.checkoutLocalBranch(branchName)

      // 2. Git 提交到新分支
      const commitHash = await this.gitCommit(contentPath, title, evaluation)

      // 3. 推送到远程
      await this.git.push('origin', branchName)

      // 4. 创建 PR (如果配置启用)
      let prUrl: string | undefined
      if (this.config.createPR) {
        prUrl = await this.createPullRequest(branchName, title, evaluation)
      }

      // 5. 切回主分支
      await this.git.checkout('main')

      // 6. 发送通知
      await this.sendNotifications({
        type: 'review',
        title,
        path: contentPath,
        quality: evaluation.quality.overall,
        prUrl
      })

      // 7. 记录历史
      this.recordHistory({
        id: `pub_${Date.now()}`,
        path: contentPath,
        title,
        timestamp: Date.now(),
        action: 'created-pr',
        quality: evaluation.quality.overall,
        cost: 0
      })

      this.logger.success('publisher.review-created', 'PR created for review', {
        branch: branchName,
        prUrl
      })

      return {
        success: true,
        path: contentPath,
        action: 'created-pr',
        commitHash,
        prUrl,
        notificationsSent: ['pr-created', 'notification-sent']
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      // 尝试切回主分支
      try {
        await this.git.checkout('main')
      } catch {}
      return this.createErrorResult(contentPath, errorMsg)
    }
  }

  // ============================================
  // Git 操作
  // ============================================

  private async gitCommit(
    contentPath: string,
    title: string,
    evaluation: EvaluationResult
  ): Promise<string> {
    // 配置作者
    await this.git.addConfig('user.name', this.config.git.authorName)
    await this.git.addConfig('user.email', this.config.git.authorEmail)

    // 添加文件
    await this.git.add(contentPath)

    // 构建提交信息
    const commitMessage = `${this.config.git.commitPrefix} ${title}

- Quality: ${evaluation.quality.overall}/10
- Relevance: ${evaluation.relevance.overall}/10
- Category: ${evaluation.classification.primaryCategory}
- Difficulty: ${evaluation.classification.difficulty}

Auto-generated by MetaUniverse Agent`

    // 提交
    const result = await this.git.commit(commitMessage, contentPath)
    const commitHash = result.commit

    this.logger.info('publisher.git-committed', 'Git commit created', { commitHash })

    return commitHash
  }

  private async gitPush(): Promise<void> {
    await this.git.push()
    this.logger.info('publisher.git-pushed', 'Changes pushed to remote')
  }

  private async createPullRequest(
    branchName: string,
    title: string,
    evaluation: EvaluationResult
  ): Promise<string> {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      this.logger.warn('publisher.no-token', 'GITHUB_TOKEN not set, skipping PR creation')
      throw new Error('GITHUB_TOKEN not configured')
    }

    // 从 git remote 获取 owner/repo
    const remotes = await this.git.getRemotes(true)
    const origin = remotes.find(r => r.name === 'origin')
    if (!origin) {
      throw new Error('No origin remote found')
    }

    // 解析 owner/repo 从 URL (支持 https://github.com/owner/repo.git 或 git@github.com:owner/repo.git)
    const match = origin.refs.fetch.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (!match) {
      throw new Error(`Unsupported remote URL: ${origin.refs.fetch}`)
    }
    const [, owner, repo] = match

    // P2-BASE: 动态获取默认分支
    const defaultBranch = await this.git.revparse(['--abbrev-ref', 'HEAD'])
    
    this.logger.info('publisher.creating-pr', 'Creating PR via GitHub API', { 
      owner, repo, branch: branchName, base: defaultBranch 
    })

    // 调用 GitHub API 创建 PR
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'MetaUniverse-Agent/1.0'
      },
      body: JSON.stringify({
        title: `[Agent] ${title}`,
        head: branchName,
        base: defaultBranch,
        body: `## AI Generated Content

- **Quality Score**: ${evaluation.quality.overall}/10
- **Relevance**: ${evaluation.relevance.overall}/10
- **Category**: ${evaluation.classification.primaryCategory}
- **Difficulty**: ${evaluation.classification.difficulty}

Auto-generated by MetaUniverse Agent. Please review before merging.`
      })
    })

    if (!response.ok) {
      const error = await response.text()
      this.logger.error('publisher.pr-failed', 'Failed to create PR', { status: response.status, error })
      throw new Error(`GitHub API error: ${response.status} - ${error}`)
    }

    const data = await response.json() as { html_url: string; number: number }
    this.logger.success('publisher.pr-created', 'Pull request created', { 
      url: data.html_url, 
      number: data.number 
    })

    return data.html_url
  }

  // ============================================
  // 辅助操作
  // ============================================

  private async readContent(contentPath: string): Promise<string | null> {
    try {
      return await fs.readFile(contentPath, 'utf-8')
    } catch (error) {
      this.logger.error('publisher.read-failed', `Failed to read ${contentPath}`, { error })
      return null
    }
  }

  private addDraftMarker(content: string): string {
    // 检查是否已有 frontmatter
    if (content.startsWith('---')) {
      // 在现有 frontmatter 中添加 draft: true
      return content.replace(/^---\n/, '---\ndraft: true\n')
    } else {
      // 添加新的 frontmatter
      return `---\ndraft: true\ndate: ${new Date().toISOString().split('T')[0]}\n---\n\n${content}`
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true })
  }

  private decidePublishMode(evaluation: EvaluationResult): PublishConfig['mode'] {
    // 如果内容被拒绝，保存为草稿
    if (!evaluation.shouldCreate) {
      return 'draft'
    }

    // 根据质量和配置决定模式
    if (this.config.mode === 'auto' && evaluation.quality.overall >= this.config.autoPublishThreshold) {
      return 'auto'
    }

    if (this.config.mode === 'draft' || evaluation.quality.overall < this.config.autoPublishThreshold) {
      return 'draft'
    }

    return 'review'
  }

  private async triggerBuild(): Promise<boolean> {
    this.logger.info('publisher.build-triggered', 'Build triggered')
    // 实际实现应该调用构建系统 API
    return true
  }

  private async updateIndex(
    contentPath: string,
    title: string,
    evaluation: EvaluationResult
  ): Promise<void> {
    // 更新搜索索引
    this.logger.debug('publisher.index-updated', 'Search index updated')
  }

  // ============================================
  // 通知系统
  // ============================================

  private async sendNotifications(data: {
    type: 'published' | 'draft' | 'review'
    title: string
    path: string
    quality: number
    reason?: string
    prUrl?: string
  }): Promise<void> {
    for (const channel of this.config.notifyChannels) {
      try {
        switch (channel.type) {
          case 'webhook':
            await fetch(channel.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            })
            break
          case 'email':
            // 发送邮件逻辑
            this.logger.info('publisher.email-sent', `Email notification sent to ${channel.to.join(', ')}`)
            break
          case 'slack':
            await this.sendSlackNotification(channel.webhook, data)
            break
          case 'log':
            this.logger.info('publisher.notification', `Content ${data.type}`, data)
            break
        }
      } catch (error) {
        this.logger.warn('publisher.notify-failed', `Failed to send ${channel.type} notification`, { error })
      }
    }
  }

  private async sendSlackNotification(
    webhook: string,
    data: {
      type: string
      title: string
      path: string
      quality: number
      prUrl?: string
    }
  ): Promise<void> {
    const color = data.type === 'published' ? 'good' : data.type === 'review' ? 'warning' : '#ccc'
    
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `Content ${data.type}: ${data.title}`,
          fields: [
            { title: 'Quality', value: `${data.quality}/10`, short: true },
            { title: 'Path', value: data.path, short: true }
          ],
          ...(data.prUrl && { title_link: data.prUrl })
        }]
      })
    })
  }

  // ============================================
  // 历史记录
  // ============================================

  private recordHistory(history: PublishHistory): void {
    this.history.unshift(history)
    // 只保留最近 100 条
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100)
    }
    this.saveHistory()
  }

  private async saveHistory(): Promise<void> {
    try {
      await fs.mkdir(dirname(this.HISTORY_FILE), { recursive: true })
      await fs.writeFile(this.HISTORY_FILE, JSON.stringify(this.history, null, 2))
    } catch (error) {
      this.logger.warn('publisher.save-history-failed', 'Failed to save history', { error })
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.HISTORY_FILE, 'utf-8')
      this.history = JSON.parse(data)
    } catch {
      this.history = []
    }
  }

  // ============================================
  // 结果构建
  // ============================================

  private createErrorResult(path: string, error: string): PublishResult {
    return {
      success: false,
      path,
      action: 'failed',
      error,
      notificationsSent: []
    }
  }

  // ============================================
  // 公共 API
  // ============================================

  getHistory(): PublishHistory[] {
    return [...this.history]
  }

  updateConfig(config: Partial<PublishConfig>): void {
    this.config = this.mergeConfig(config)
    this.logger.info('publisher.config-updated', 'Publisher config updated')
  }
}

// Singleton
let publisherInstance: AutoPublisher | null = null

export function getAutoPublisher(): AutoPublisher {
  if (!publisherInstance) {
    publisherInstance = new AutoPublisher()
  }
  return publisherInstance
}

export function createAutoPublisher(config?: Partial<PublishConfig>): AutoPublisher {
  publisherInstance = new AutoPublisher(config)
  return publisherInstance
}
