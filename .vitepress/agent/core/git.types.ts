/**
 * Git 类型定义 - 前后端共享
 * 避免前端代码直接 import 服务端模块
 */

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
  current?: string
  modified: string[]
  staged: string[]
  untracked: string[]
  ahead: number
  behind: number
  isClean: boolean
}

export interface GitLogEntry {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

export interface Checkpoint {
  id: string
  taskId: string
  name: string
  commitHash: string
  createdAt: number
}
