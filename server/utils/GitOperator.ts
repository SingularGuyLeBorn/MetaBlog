/**
 * GitOperator - Git 操作封装（带并发锁保护）
 * 
 * **P0-2 修复**: 解决 simple-git 并发导致的 .git/index.lock 竞争问题
 * **N1 修复**: 统一服务端所有 Git 操作入口
 * 
 * 特性：
 * - 全局 Mutex 串行队列（所有 git 操作排队执行）
 * - Debounce 防抖合并连续提交
 * - 详细的错误处理和日志
 * - 支持 Agent 标记提交
 */

import { simpleGit, SimpleGit } from 'simple-git'
import { Mutex } from 'async-mutex'
import { join } from 'path'

export interface GitCommitOptions {
  message: string
  author?: { name: string; email: string }
  files?: string | string[]
  metadata?: {
    taskId?: string
    skill?: string
    tokens?: number
    cost?: number
    model?: string
  }
}

export interface GitStatus {
  modified: string[]
  staged: string[]
  untracked: string[]
  ahead: number
  behind: number
  isClean: boolean
}

/**
 * Git 操作类
 * 
 * 单例模式，全系统共用一个实例以确保锁的正确性
 */
export class GitOperator {
  private static instance: GitOperator
  private git: SimpleGit
  private mutex: Mutex
  private repoPath: string
  private lastCommitTime: number = 0
  private readonly DEBOUNCE_MS = 2000 // 2秒防抖

  private constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath
    this.git = simpleGit(repoPath, {
      binary: 'git',
      maxConcurrentProcesses: 1, // 限制 simple-git 内部并发
    })
    this.mutex = new Mutex()
  }

  static getInstance(repoPath?: string): GitOperator {
    if (!GitOperator.instance) {
      GitOperator.instance = new GitOperator(repoPath)
    }
    return GitOperator.instance
  }

  // ============================================
  // 核心 Git 操作（带锁保护）
  // ============================================

  /**
   * 提交文件（带 Mutex 锁和 Debounce）
   * 
   * P0-2 修复：所有 git 操作通过 mutex 排队执行
   * P0-2 加强：有界重试（最多重试1次）
   */
  async commit(
    options: GitCommitOptions,
    retryCount: number = 0
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    return this.mutex.runExclusive(async () => {
      try {
        // Debounce 检查：如果上次提交在 2 秒内，等待
        const now = Date.now()
        if (now - this.lastCommitTime < this.DEBOUNCE_MS) {
          const waitMs = this.DEBOUNCE_MS - (now - this.lastCommitTime)
          console.log(`[GitOperator] Debounce: 等待 ${waitMs}ms`)
          await this.delay(waitMs)
        }

        // 构建提交信息
        const fullMessage = this.buildCommitMessage(options)
        
        // 配置作者（如果是 Agent 提交）
        if (options.metadata) {
          await this.git.addConfig('user.name', 'MetaUniverse Agent', false, 'local')
          await this.git.addConfig('user.email', 'agent@metablog.local', false, 'local')
        }

        // 添加文件
        if (options.files) {
          await this.git.add(options.files)
        } else {
          await this.git.add('.')
        }

        // 检查是否有变更要提交
        const status = await this.git.status()
        if (status.staged.length === 0) {
          console.log('[GitOperator] 没有变更需要提交')
          return { success: true, hash: 'no-changes' }
        }

        // 执行提交
        const result = await this.git.commit(fullMessage, {
          '--author': options.author ? `${options.author.name} <${options.author.email}>` : undefined
        })

        this.lastCommitTime = Date.now()
        
        console.log(`[GitOperator] 提交成功: ${result.commit}`)
        return { 
          success: true, 
          hash: result.commit 
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        // 检查是否是 lock 错误，且有重试次数
        if (retryCount < 1 && (errorMsg.includes('index.lock') || errorMsg.includes('Another git process'))) {
          console.error(`[GitOperator] Git lock 错误，1秒后重试... (${retryCount + 1}/2)`)
          await this.delay(1000)
          // 递归重试，但限制次数
          return this.commit(options, retryCount + 1)
        }
        
        console.error('[GitOperator] 提交失败:', errorMsg)
        return { success: false, error: errorMsg }
      }
    })
  }

  /**
   * Agent 标记提交
   */
  async commitAsAgent(
    filePath: string, 
    options: Omit<GitCommitOptions, 'files'> & { taskId: string }
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    return this.commit({
      message: options.message || `[agent] ${filePath}`,
      files: filePath,
      author: { name: 'MetaUniverse Agent', email: 'agent@metablog.local' },
      metadata: {
        taskId: options.taskId,
        skill: options.metadata?.skill,
        tokens: options.metadata?.tokens,
        cost: options.metadata?.cost,
        model: options.metadata?.model
      }
    })
  }

  /**
   * 获取仓库状态
   */
  async getStatus(): Promise<GitStatus> {
    return this.mutex.runExclusive(async () => {
      const status = await this.git.status()
      return {
        modified: status.modified,
        staged: status.staged,
        untracked: status.not_added,
        ahead: status.ahead,
        behind: status.behind,
        isClean: status.isClean()
      }
    })
  }

  /**
   * 获取提交日志
   */
  async getLog(maxCount: number = 50, file?: string): Promise<any[]> {
    return this.mutex.runExclusive(async () => {
      const options: any = { maxCount }
      if (file) options.file = file
      
      const log = await this.git.log(options)
      return log.all.map(commit => {
        const isAgent = commit.message.startsWith('[agent:') || commit.author_name === 'MetaUniverse Agent'
        return {
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 7),
          author: {
            name: commit.author_name,
            email: commit.author_email
          },
          date: commit.date,
          message: isAgent ? commit.message.split('\n')[0] : commit.message,
          isAgent
        }
      })
    })
  }

  /**
   * 获取 Diff
   */
  async getDiff(from: string, to?: string): Promise<string> {
    return this.mutex.runExclusive(async () => {
      if (to) {
        return this.git.diff([from, to])
      } else {
        return this.git.show([from, '--format=', '--patch'])
      }
    })
  }

  /**
   * 添加文件到暂存区
   */
  async add(files?: string | string[]): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (files) {
        await this.git.add(files)
      } else {
        await this.git.add('.')
      }
    })
  }

  /**
   * 拉取最新代码（带 rebase）
   * 
   * P1-6 修复：使用 rebase 避免 non-fast-forward
   */
  async pull(): Promise<{ success: boolean; error?: string }> {
    return this.mutex.runExclusive(async () => {
      try {
        await this.git.pull(['--rebase'])
        console.log('[GitOperator] Pull 成功')
        return { success: true }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('[GitOperator] Pull 失败:', errorMsg)
        return { success: false, error: errorMsg }
      }
    })
  }

  /**
   * 推送代码
   */
  async push(): Promise<{ success: boolean; error?: string }> {
    return this.mutex.runExclusive(async () => {
      try {
        await this.git.push()
        console.log('[GitOperator] Push 成功')
        return { success: true }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        // 检查是否是 non-fast-forward 错误
        if (errorMsg.includes('non-fast-forward') || errorMsg.includes('rejected')) {
          console.error('[GitOperator] Push 被拒绝，尝试先 pull --rebase')
          const pullResult = await this.pull()
          if (!pullResult.success) {
            return { success: false, error: `Pull 失败: ${pullResult.error}` }
          }
          // 重试 push
          await this.git.push()
          return { success: true }
        }
        
        return { success: false, error: errorMsg }
      }
    })
  }

  /**
   * 获取分支列表
   */
  async getBranches(): Promise<{ current: string; all: string[] }> {
    return this.mutex.runExclusive(async () => {
      const summary = await this.git.branch()
      return {
        current: summary.current,
        all: summary.all
      }
    })
  }

  /**
   * 创建分支
   */
  async createBranch(name: string, from?: string): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (from) {
        await this.git.checkoutBranch(name, from)
      } else {
        await this.git.checkoutLocalBranch(name)
      }
    })
  }

  /**
   * 切换分支
   */
  async checkout(ref: string): Promise<void> {
    return this.mutex.runExclusive(async () => {
      await this.git.checkout(ref)
    })
  }

  /**
   * Reset
   */
  async reset(path?: string, hard: boolean = false): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (path) {
        await this.git.reset(['HEAD', path])
      } else if (hard) {
        await this.git.reset(['--hard', 'HEAD'])
      } else {
        await this.git.reset(['--soft', 'HEAD~1'])
      }
    })
  }

  /**
   * Revert
   */
  async revert(hash: string): Promise<void> {
    return this.mutex.runExclusive(async () => {
      await this.git.revert(hash, { '--no-edit': null })
    })
  }

  /**
   * 获取提交历史
   */
  async getHistory(maxCount: number = 10): Promise<Array<{
    hash: string
    message: string
    author: string
    date: string
    isAgent: boolean
  }>> {
    return this.mutex.runExclusive(async () => {
      const log = await this.git.log({ maxCount })
      return log.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        isAgent: commit.author_name === 'MetaUniverse Agent' || commit.message.includes('[agent]')
      }))
    })
  }

  /**
   * 检查是否是干净的仓库
   */
  async isClean(): Promise<boolean> {
    const status = await this.getStatus()
    return status.isClean
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalCommits: number
    agentCommits: number
    humanCommits: number
    lastCommitAt?: string
  }> {
    return this.mutex.runExclusive(async () => {
      const log = await this.git.log()
      const agentCommits = log.all.filter(c => 
        c.message.startsWith('[agent:') || c.author_name === 'MetaUniverse Agent'
      )
      return {
        totalCommits: log.total,
        agentCommits: agentCommits.length,
        humanCommits: log.total - agentCommits.length,
        lastCommitAt: log.latest?.date
      }
    })
  }

  // ============================================
  // 私有方法
  // ============================================

  private buildCommitMessage(options: GitCommitOptions): string {
    let message = options.message

    // 添加元数据
    if (options.metadata) {
      const metaParts: string[] = []
      if (options.metadata.taskId) metaParts.push(`task:${options.metadata.taskId}`)
      if (options.metadata.skill) metaParts.push(`skill:${options.metadata.skill}`)
      if (options.metadata.tokens) metaParts.push(`tokens:${options.metadata.tokens}`)
      if (options.metadata.cost) metaParts.push(`cost:$${options.metadata.cost.toFixed(4)}`)
      
      if (metaParts.length > 0) {
        message += `\n\n[agent-meta]\n${metaParts.join('\n')}`
      }
    }

    return message
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例
export const gitOperator = GitOperator.getInstance()

export default GitOperator
