/**
 * Files API - 文件系统操作接口
 * 提供文件 CRUD 操作
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

const API_BASE = '/api/files'

// ============================================
// 文件操作
// ============================================

export async function readFile(path: string): Promise<string> {
  const response = await fetch(`${API_BASE}/read?path=${encodeURIComponent(path)}`)
  if (!response.ok) {
    if (response.status === 404) throw new Error('File not found')
    throw new Error('Failed to read file')
  }
  return response.text()
}

export async function saveFile(path: string, content: string): Promise<void> {
  const response = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content })
  })
  if (!response.ok) throw new Error('Failed to save file')
}

export async function deleteFile(path: string): Promise<void> {
  const response = await fetch(`${API_BASE}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  if (!response.ok) throw new Error('Failed to delete file')
}

export async function moveFile(from: string, to: string): Promise<void> {
  const response = await fetch(`${API_BASE}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to })
  })
  if (!response.ok) throw new Error('Failed to move file')
}

export async function renameFile(path: string, newName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, newName })
  })
  if (!response.ok) throw new Error('Failed to rename file')
}

// ============================================
// 目录操作
// ============================================

export async function listDirectory(path: string = ''): Promise<FileInfo[]> {
  const response = await fetch(`${API_BASE}/list?path=${encodeURIComponent(path)}`)
  if (!response.ok) throw new Error('Failed to list directory')
  return response.json()
}

export async function createDirectory(path: string): Promise<void> {
  const response = await fetch(`${API_BASE}/mkdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  })
  if (!response.ok) throw new Error('Failed to create directory')
}

export async function deleteDirectory(path: string, recursive: boolean = false): Promise<void> {
  const response = await fetch(`${API_BASE}/rmdir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, recursive })
  })
  if (!response.ok) throw new Error('Failed to delete directory')
}

// ============================================
// 批量操作
// ============================================

export async function searchFiles(query: string, path: string = ''): Promise<FileInfo[]> {
  const params = new URLSearchParams({ q: query, path })
  const response = await fetch(`${API_BASE}/search?${params}`)
  if (!response.ok) throw new Error('Failed to search files')
  return response.json()
}

export async function batchSave(files: { path: string; content: string }[]): Promise<void> {
  const response = await fetch(`${API_BASE}/batch-save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files })
  })
  if (!response.ok) throw new Error('Failed to batch save')
}

// ============================================
// 辅助函数
// ============================================

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

export function getFileNameWithoutExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.slice(0, lastDot) : filename
}

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

export async function generateFileNameAsync(title: string, date?: Date): Promise<string> {
  const dateStr = date ? date.toISOString().split('T')[0] + '-' : ''
  return `${dateStr}${await slugifyAsync(title)}.md`
}
