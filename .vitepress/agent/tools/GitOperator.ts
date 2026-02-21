/**
 * GitOperator - 前端 Git 操作封装
 * 
 * **N1 修复**: 前端 Git 操作通过 HTTP API 调用服务端 GitOperator
 * 避免前端直接使用 simple-git，消除跨进程 git 锁冲突
 */

import type { GitCommitOptions, GitStatus, Checkpoint } from '../core/git.types'

// 基础 Git 操作 API
export async function commit(options: GitCommitOptions): Promise<{ success: boolean; hash?: string; error?: string }> {
  const response = await fetch('/api/git/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  })
  
  if (!response.ok) {
    return { success: false, error: await response.text() }
  }
  
  const data = await response.json()
  return data
}

export async function getStatus(): Promise<GitStatus> {
  const response = await fetch('/api/git/status')
  if (!response.ok) {
    throw new Error('Failed to get git status')
  }
  return response.json()
}

export async function getLog(maxCount?: number): Promise<any[]> {
  const url = maxCount ? `/api/git/log?maxCount=${maxCount}` : '/api/git/log'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to get git log')
  }
  return response.json()
}

// 检查点操作
export async function createCheckpoint(taskId: string, name: string): Promise<Checkpoint> {
  const response = await fetch('/api/git/checkpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, name })
  })
  
  if (!response.ok) {
    throw new Error('Failed to create checkpoint')
  }
  
  return response.json()
}

export async function listCheckpoints(taskId?: string): Promise<Checkpoint[]> {
  const url = taskId ? `/api/git/checkpoints?taskId=${taskId}` : '/api/git/checkpoints'
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to list checkpoints')
  }
  return response.json()
}

// 向后兼容的类封装
export class GitOperator {
  async commit(options: GitCommitOptions): Promise<{ success: boolean; hash?: string; error?: string }> {
    return commit(options)
  }
  
  async getStatus(): Promise<GitStatus> {
    return getStatus()
  }
  
  async getLog(maxCount?: number): Promise<any[]> {
    return getLog(maxCount)
  }
}

// 单例实例
let instance: GitOperator | null = null

export function getGitOperator(): GitOperator {
  if (!instance) {
    instance = new GitOperator()
  }
  return instance
}

// 默认导出
export default GitOperator
