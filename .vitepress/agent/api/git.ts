/**
 * Git API - Git 操作接口
 * 提供版本控制操作，支持人工/Agent 提交区分
 */

export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
}

export interface CommitInfo {
  hash: string
  shortHash: string
  author: {
    name: string
    email: string
  }
  date: string
  message: string
  isAgent: boolean
  agentMetadata?: {
    taskId: string
    model: string
    tokens: number
    cost: number
    skill: string
  }
}

export interface CommitOptions {
  path?: string
  message: string
  author?: {
    name: string
    email: string
  }
}

export interface AgentCommitOptions {
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

const API_BASE = '/api/git'

// ============================================
// 状态与信息
// ============================================

export async function getStatus(): Promise<GitStatus> {
  const response = await fetch(`${API_BASE}/status`)
  if (!response.ok) throw new Error('Failed to get git status')
  return response.json()
}

export async function getLog(options?: { 
  maxCount?: number; 
  path?: string;
  author?: string;
}): Promise<CommitInfo[]> {
  const params = new URLSearchParams()
  if (options?.maxCount) params.set('maxCount', options.maxCount.toString())
  if (options?.path) params.set('path', options.path)
  if (options?.author) params.set('author', options.author)
  
  const response = await fetch(`${API_BASE}/log?${params}`)
  if (!response.ok) throw new Error('Failed to get git log')
  return response.json()
}

export async function getDiff(from: string, to?: string): Promise<string> {
  const params = new URLSearchParams({ from })
  if (to) params.set('to', to)
  
  const response = await fetch(`${API_BASE}/diff?${params}`)
  if (!response.ok) throw new Error('Failed to get diff')
  return response.text()
}

// ============================================
// 提交操作
// ============================================

export async function commit(options: CommitOptions): Promise<{ hash: string }> {
  const response = await fetch(`${API_BASE}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  })
  if (!response.ok) throw new Error('Failed to commit')
  return response.json()
}

export async function commitAsAgent(options: AgentCommitOptions): Promise<{ hash: string }> {
  // 构建 Agent 专用的提交信息
  const agentMessage = `[agent:${options.taskId}] ${options.message}

Agent-Model: ${options.metadata.model}
Agent-Tokens: ${options.metadata.tokens}
Agent-Cost: $${options.metadata.cost.toFixed(4)}
Agent-Skill: ${options.metadata.skill}`

  return commit({
    path: options.path,
    message: agentMessage,
    author: {
      name: 'MetaUniverse Agent',
      email: 'agent@metablog.local'
    }
  })
}

export async function stage(path?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  if (!response.ok) throw new Error('Failed to stage')
}

// ============================================
// 分支操作
// ============================================

export async function getBranches(): Promise<{ current: string; all: string[] }> {
  const response = await fetch(`${API_BASE}/branches`)
  if (!response.ok) throw new Error('Failed to get branches')
  return response.json()
}

export async function createBranch(name: string, from?: string): Promise<void> {
  const response = await fetch(`${API_BASE}/branch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, from })
  })
  if (!response.ok) throw new Error('Failed to create branch')
}

export async function checkout(ref: string): Promise<void> {
  const response = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref })
  })
  if (!response.ok) throw new Error('Failed to checkout')
}

// ============================================
// 撤销与重置
// ============================================

export async function reset(path?: string, hard?: boolean): Promise<void> {
  const response = await fetch(`${API_BASE}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, hard })
  })
  if (!response.ok) throw new Error('Failed to reset')
}

export async function revertToCommit(hash: string): Promise<void> {
  const response = await fetch(`${API_BASE}/revert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash })
  })
  if (!response.ok) throw new Error('Failed to revert')
}

// ============================================
// 检查点（断点续作）
// ============================================

export interface Checkpoint {
  id: string
  taskId: string
  name: string
  commitHash: string
  createdAt: number
}

export async function createCheckpoint(taskId: string, name: string): Promise<Checkpoint> {
  const response = await fetch(`${API_BASE}/checkpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, name })
  })
  if (!response.ok) throw new Error('Failed to create checkpoint')
  return response.json()
}

export async function restoreCheckpoint(checkpointId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/checkpoint/${checkpointId}/restore`, {
    method: 'POST'
  })
  if (!response.ok) throw new Error('Failed to restore checkpoint')
}

export async function listCheckpoints(taskId: string): Promise<Checkpoint[]> {
  const response = await fetch(`${API_BASE}/checkpoints?taskId=${taskId}`)
  if (!response.ok) throw new Error('Failed to list checkpoints')
  return response.json()
}

// ============================================
// 统计与历史
// ============================================

export async function getStats(): Promise<{
  totalCommits: number
  agentCommits: number
  humanCommits: number
  lastCommitAt: string
}> {
  const response = await fetch(`${API_BASE}/stats`)
  if (!response.ok) throw new Error('Failed to get stats')
  return response.json()
}

export async function getAgentCommits(limit: number = 50): Promise<CommitInfo[]> {
  return getLog({ author: 'MetaUniverse Agent', maxCount: limit })
}

// ============================================
// 辅助函数
// ============================================

export function parseAgentMetadata(message: string): CommitInfo['agentMetadata'] | undefined {
  if (!message.startsWith('[agent:')) return undefined
  
  const taskId = message.match(/\[agent:([^\]]+)\]/)?.[1] ?? ''
  const model = message.match(/Agent-Model: (.+)/)?.[1] ?? ''
  const tokens = parseInt(message.match(/Agent-Tokens: (\d+)/)?.[1] ?? '0')
  const cost = parseFloat(message.match(/Agent-Cost: \$([\d.]+)/)?.[1] ?? '0')
  const skill = message.match(/Agent-Skill: (.+)/)?.[1] ?? ''
  
  return { taskId, model, tokens, cost, skill }
}

export function isAgentCommit(message: string): boolean {
  return message.startsWith('[agent:')
}

export function formatCommitMessage(
  type: 'content' | 'agent',
  message: string,
  options?: { taskId?: string; skill?: string }
): string {
  if (type === 'agent' && options?.taskId) {
    return `[agent:${options.taskId}] ${message}`
  }
  return `content: ${message}`
}
