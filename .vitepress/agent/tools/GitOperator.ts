/**
 * GitOperator Tool - Git 版本控制操作
 * 支持人工/Agent 提交区分
 */
import * as gitApi from '../api/git'

export interface CommitOptions {
  path?: string
  message: string
  author?: {
    name: string
    email: string
  }
}

export interface AgentCommitParams {
  path: string
  taskId: string
  message: string
  metadata: {
    model: string
    tokens: number
    cost: number
    skill: string
  }
}

export interface Checkpoint {
  id: string
  taskId: string
  name: string
  commitHash: string
  createdAt: number
}

export class GitOperator {
  // ============================================
  // 状态查询
  // ============================================

  async status(): Promise<gitApi.GitStatus> {
    return gitApi.getStatus()
  }

  async log(options?: { maxCount?: number; path?: string }): Promise<gitApi.CommitInfo[]> {
    return gitApi.getLog(options)
  }

  async diff(from: string, to?: string): Promise<string> {
    return gitApi.getDiff(from, to)
  }

  // ============================================
  // 基本提交操作
  // ============================================

  async commit(options: CommitOptions): Promise<{ hash: string }> {
    // 先 stage
    if (options.path) {
      await this.stage(options.path)
    } else {
      await this.stage()
    }
    
    return gitApi.commit(options)
  }

  async stage(path?: string): Promise<void> {
    await fetch('/api/git/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    })
  }

  // ============================================
  // Agent 专用提交
  // ============================================

  async commitAsAgent(params: AgentCommitParams): Promise<{ hash: string }> {
    return gitApi.commitAsAgent(params)
  }

  async getAgentCommits(limit: number = 50): Promise<gitApi.CommitInfo[]> {
    return gitApi.getAgentCommits(limit)
  }

  isAgentCommit(message: string): boolean {
    return gitApi.isAgentCommit(message)
  }

  parseAgentMetadata(message: string): gitApi.CommitInfo['agentMetadata'] | undefined {
    return gitApi.parseAgentMetadata(message)
  }

  // ============================================
  // 分支操作
  // ============================================

  async getBranches(): Promise<{ current: string; all: string[] }> {
    return gitApi.getBranches()
  }

  async createBranch(name: string, from?: string): Promise<void> {
    return gitApi.createBranch(name, from)
  }

  async checkout(ref: string): Promise<void> {
    return gitApi.checkout(ref)
  }

  // ============================================
  // 撤销与重置
  // ============================================

  async reset(path?: string, hard?: boolean): Promise<void> {
    return gitApi.reset(path, hard)
  }

  async revertToCommit(hash: string): Promise<void> {
    return gitApi.revertToCommit(hash)
  }

  // ============================================
  // 检查点（断点续作）
  // ============================================

  async createCheckpoint(taskId: string, name: string): Promise<Checkpoint> {
    // 1. 提交当前更改
    const { hash } = await this.commit({
      message: `[checkpoint] ${name} for task ${taskId}`,
      author: {
        name: 'MetaUniverse Agent',
        email: 'agent@metablog.local'
      }
    })

    // 2. 创建检查点记录
    const checkpoint: Checkpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      name,
      commitHash: hash,
      createdAt: Date.now()
    }

    // 3. 保存检查点信息
    await this.saveCheckpointRecord(checkpoint)

    return checkpoint
  }

  async restoreCheckpoint(checkpointId: string): Promise<void> {
    const checkpoints = await this.listCheckpoints('')
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId)
    
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`)
    }

    await this.revertToCommit(checkpoint.commitHash)
  }

  async listCheckpoints(taskId?: string): Promise<Checkpoint[]> {
    try {
      const response = await fetch(`/api/git/checkpoints${taskId ? `?taskId=${taskId}` : ''}`)
      if (response.ok) {
        return response.json()
      }
    } catch (e) {
      console.warn('[GitOperator] Failed to list checkpoints:', e)
    }
    return []
  }

  private async saveCheckpointRecord(checkpoint: Checkpoint): Promise<void> {
    await fetch('/api/git/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkpoint)
    })
  }

  // ============================================
  // 统计信息
  // ============================================

  async getStats(): Promise<{
    totalCommits: number
    agentCommits: number
    humanCommits: number
    lastCommitAt: string
  }> {
    return gitApi.getStats()
  }

  // ============================================
  // 便捷方法
  // ============================================

  /**
   * 快速保存文件并提交（用于 Agent）
   */
  async quickSave(
    filePath: string,
    content: string,
    commitMessage: string,
    author?: { name: string; email: string }
  ): Promise<{ hash: string }> {
    // 1. 保存文件
    const { saveFile } = await import('../api/files')
    await saveFile(filePath, content)

    // 2. 提交
    return this.commit({
      path: filePath,
      message: commitMessage,
      author: author || {
        name: 'MetaUniverse Agent',
        email: 'agent@metablog.local'
      }
    })
  }

  /**
   * 获取文件的提交历史
   */
  async getFileHistory(filePath: string, maxCount: number = 20): Promise<gitApi.CommitInfo[]> {
    return this.log({ path: filePath, maxCount })
  }

  /**
   * 获取文件的最近修改者
   */
  async getLastModifier(filePath: string): Promise<{ name: string; email: string; date: string } | null> {
    const log = await this.getFileHistory(filePath, 1)
    if (log.length === 0) return null
    
    return {
      name: log[0].author.name,
      email: log[0].author.email,
      date: log[0].date
    }
  }
}

// 导出单例
let gitOperatorInstance: GitOperator | null = null

export function getGitOperator(): GitOperator {
  if (!gitOperatorInstance) {
    gitOperatorInstance = new GitOperator()
  }
  return gitOperatorInstance
}
