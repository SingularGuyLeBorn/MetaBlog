/**
 * Files API - 文件系统操作接口
 * 提供文件 CRUD 操作（支持软删除和恢复）
 */

export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: string
}

export interface FileContent {
  path: string
  content: string
  encoding: 'utf-8' | 'base64'
}

export interface TrashItem {
  id: string
  originalPath: string
  trashPath: string
  fileName: string
  deletedAt: string
  expiresAt: string
  size: number
}

export interface LockStatus {
  locked: boolean
  taskId?: string
  acquiredAt?: number
}

const API_BASE = '/api/files'

// ============================================
// 文件操作
// ============================================

/**
 * 读取文件内容
 */
export async function readFile(path: string): Promise<string> {
  const response = await fetch(`${API_BASE}/read?path=${encodeURIComponent(path)}`)
  if (!response.ok) {
    if (response.status === 404) throw new Error('File not found')
    throw new Error('Failed to read file')
  }
  return response.text()
}

/**
 * 保存文件（支持文件锁和 hash 校验）
 * 
 * @param overwrite 是否覆盖已存在的文件（默认 false，遇到 409 会抛出错误）
 */
export async function saveFile(
  path: string, 
  content: string, 
  taskId?: string,
  overwrite?: boolean
): Promise<{ path: string; hash: string }> {
  const response = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content, taskId, overwrite })
  })
  
  if (!response.ok) {
    if (response.status === 423) {
      throw new Error('File is locked by another task')
    }
    if (response.status === 409) {
      throw new Error('File already exists')
    }
    throw new Error('Failed to save file')
  }
  
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to save file')
  }
  return data.data
}

/**
 * 检查文件是否存在
 */
export async function checkFileExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/exists?path=${encodeURIComponent(path)}`)
    if (response.ok) {
      const data = await response.json()
      return data.data?.exists === true
    }
    return false
  } catch {
    return false
  }
}

/**
 * 删除文件（默认软删除，可选永久删除）
 * @param permanent 是否永久删除，默认为 false（软删除）
 */
export async function deleteFile(path: string, permanent: boolean = false): Promise<{ trashId?: string; expiresAt?: string }> {
  const response = await fetch(`${API_BASE}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, permanent })
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete file')
  }
  
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete file')
  }
  return data.data || {}
}

/**
 * 从回收站恢复文件
 */
export async function restoreFile(trashId: string): Promise<{ restoredPath: string; renamed: boolean }> {
  const response = await fetch(`${API_BASE}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trashId })
  })
  
  if (!response.ok) {
    throw new Error('Failed to restore file')
  }
  
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to restore file')
  }
  return data.data
}

/**
 * 移动文件
 */
export async function moveFile(from: string, to: string): Promise<void> {
  const response = await fetch(`${API_BASE}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to })
  })
  if (!response.ok) throw new Error('Failed to move file')
}

/**
 * 重命名文件
 */
export async function renameFile(path: string, newName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, newName })
  })
  if (!response.ok) throw new Error('Failed to rename file')
}

// ============================================
// 回收站操作
// ============================================

/**
 * 列出回收站中的文件
 */
export async function listTrash(): Promise<TrashItem[]> {
  const response = await fetch(`${API_BASE}/trash`)
  if (!response.ok) throw new Error('Failed to list trash')
  
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to list trash')
  return data.data
}

/**
 * 清空回收站（永久删除所有过期文件）
 * 注意：此操作由服务端定时任务自动执行，前端通常不需要调用
 */
export async function cleanupTrash(): Promise<void> {
  // 清理操作由服务端定时执行，前端可触发一次清理
  const response = await fetch(`${API_BASE}/trash/cleanup`, {
    method: 'POST'
  })
  if (!response.ok) throw new Error('Failed to cleanup trash')
}

// ============================================
// 目录操作
// ============================================

/**
 * 列出目录内容
 */
export async function listDirectory(path: string = ''): Promise<FileInfo[]> {
  const response = await fetch(`${API_BASE}/list?path=${encodeURIComponent(path)}`)
  if (!response.ok) throw new Error('Failed to list directory')
  return response.json()
}

/**
 * 创建目录
 */
export async function createDirectory(path: string): Promise<void> {
  const response = await fetch(`${API_BASE}/mkdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  if (!response.ok) throw new Error('Failed to create directory')
}

/**
 * 删除目录
 */
export async function deleteDirectory(path: string, recursive: boolean = false): Promise<void> {
  const response = await fetch(`${API_BASE}/rmdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, recursive })
  })
  if (!response.ok) throw new Error('Failed to delete directory')
}

// ============================================
// 搜索与批量操作
// ============================================

/**
 * 搜索文件
 */
export async function searchFiles(query: string, path: string = ''): Promise<FileInfo[]> {
  const params = new URLSearchParams({ q: query, path })
  const response = await fetch(`${API_BASE}/search?${params}`)
  if (!response.ok) throw new Error('Failed to search files')
  return response.json()
}

/**
 * 批量保存文件
 */
export async function batchSave(files: { path: string; content: string }[]): Promise<{ path: string; success: boolean; error?: string }[]> {
  const response = await fetch(`${API_BASE}/batch-save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files })
  })
  if (!response.ok) throw new Error('Failed to batch save')
  
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to batch save')
  return data.data.results
}

// ============================================
// 文件锁操作
// ============================================

/**
 * 获取文件锁状态
 */
export async function getLockStatus(path: string): Promise<LockStatus> {
  const response = await fetch(`${API_BASE}/lock-status?path=${encodeURIComponent(path)}`)
  if (!response.ok) throw new Error('Failed to get lock status')
  
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to get lock status')
  return data.data
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

/**
 * 获取不带扩展名的文件名
 */
export function getFileNameWithoutExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

/**
 * 生成 URL 友好的 slug
 */
export async function slugifyAsync(text: string): Promise<string> {
  try {
    const res = await fetch('/api/utils/slugify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (res.ok) {
      const data = await res.json()
      if (data.slug) return data.slug
    }
  } catch (e) {}
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

/**
 * 生成文件名
 */
export async function generateFileNameAsync(title: string, date?: Date): Promise<string> {
  const dateStr = date ? date.toISOString().split('T')[0] + '-' : ''
  return `${dateStr}${await slugifyAsync(title)}.md`
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化日期
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 计算回收站项剩余天数
 */
export function getTrashRemainingDays(expiresAt: string): number {
  const expires = new Date(expiresAt).getTime()
  const now = Date.now()
  const diff = expires - now
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
