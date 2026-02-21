/**
 * Files API Routes - 文件系统操作服务端路由
 * 
 * 安全特性：
 * 1. 路径安全检查 - 防止目录遍历攻击
 * 2. 软删除机制 - 删除的文件移至 .trash，保留 30 天
 * 3. 文件写入校验 - 写入后验证文件 hash
 * 4. 并发锁保护 - 防止多场景同时编辑同一文件
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, dirname, basename, normalize, relative, extname } from 'path'
import { createHash } from 'crypto'

const router = Router()

// 基础路径
const DOCS_PATH = join(process.cwd(), 'docs')
const TRASH_PATH = join(DOCS_PATH, '.trash')

// 统一响应类型
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// 文件项接口
interface FileItem {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  modifiedAt: string
}

// Trash 项接口
interface TrashItem {
  id: string
  originalPath: string
  trashPath: string
  fileName: string
  deletedAt: string
  expiresAt: string
  size: number
}

// 文件锁管理器 - 防止并发冲突
class FileLockManager {
  private locks = new Map<string, { taskId: string; acquiredAt: number }>()
  private readonly LOCK_TIMEOUT = 5 * 60 * 1000 // 5分钟超时

  /**
   * 获取文件锁
   */
  acquireLock(filePath: string, taskId: string): boolean {
    const normalizedPath = normalize(filePath)
    const existingLock = this.locks.get(normalizedPath)
    
    if (existingLock) {
      // 检查锁是否超时
      if (Date.now() - existingLock.acquiredAt > this.LOCK_TIMEOUT) {
        console.warn(`[FileLock] 锁超时，强制释放: ${normalizedPath}`)
        this.locks.delete(normalizedPath)
      } else {
        return false // 锁被占用
      }
    }
    
    this.locks.set(normalizedPath, { taskId, acquiredAt: Date.now() })
    console.log(`[FileLock] 获取锁成功: ${normalizedPath}, taskId: ${taskId}`)
    return true
  }

  /**
   * 释放文件锁
   */
  releaseLock(filePath: string, taskId: string): boolean {
    const normalizedPath = normalize(filePath)
    const existingLock = this.locks.get(normalizedPath)
    
    if (!existingLock || existingLock.taskId !== taskId) {
      return false
    }
    
    this.locks.delete(normalizedPath)
    console.log(`[FileLock] 释放锁成功: ${normalizedPath}`)
    return true
  }

  /**
   * 检查文件是否被锁定
   */
  isLocked(filePath: string): boolean {
    const normalizedPath = normalize(filePath)
    const existingLock = this.locks.get(normalizedPath)
    
    if (!existingLock) return false
    
    // 检查是否超时
    if (Date.now() - existingLock.acquiredAt > this.LOCK_TIMEOUT) {
      this.locks.delete(normalizedPath)
      return false
    }
    
    return true
  }

  /**
   * 获取锁信息
   */
  getLockInfo(filePath: string): { taskId: string; acquiredAt: number } | null {
    const normalizedPath = normalize(filePath)
    return this.locks.get(normalizedPath) || null
  }
}

// 全局锁管理器实例
export const fileLockManager = new FileLockManager()

// 路径安全检查 - 防止目录遍历攻击
function sanitizePath(userPath: string): string {
  // 1. 检查路径长度
  if (userPath.length > 4000) {
    throw new Error('Path too long: maximum 4000 characters')
  }
  
  // 2. 移除 null 字节
  const cleaned = userPath.replace(/\0/g, '')
  
  // 3. 解析并规范化路径
  const resolved = normalize(join(DOCS_PATH, cleaned.replace(/^[\/\\]+/, '')))
  
  // 4. 确保在 docs 目录内
  const rel = relative(DOCS_PATH, resolved)
  if (rel.startsWith('..') || rel === '..') {
    throw new Error('Access denied: Path traversal detected')
  }
  
  return resolved
}

// 生成文件 hash
async function computeFileHash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath)
  return createHash('sha256').update(content).digest('hex')
}

// 计算内容 hash
function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex')
}

// ============================================
// Trash 管理
// ============================================

/**
 * 加载 trash 索引
 */
async function loadTrashIndex(): Promise<TrashItem[]> {
  try {
    const indexPath = join(TRASH_PATH, 'index.json')
    const content = await fs.readFile(indexPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

/**
 * 保存 trash 索引
 */
async function saveTrashIndex(index: TrashItem[]): Promise<void> {
  const indexPath = join(TRASH_PATH, 'index.json')
  await fs.mkdir(dirname(indexPath), { recursive: true })
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
}

/**
 * 生成 trash 项 ID
 */
function generateTrashId(): string {
  return `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 清理过期 trash（保留 30 天）
 */
export async function cleanupExpiredTrash(): Promise<{ deleted: number; errors: string[] }> {
  const result = { deleted: 0, errors: [] as string[] }
  
  try {
    const index = await loadTrashIndex()
    const now = new Date().toISOString()
    
    const remaining: TrashItem[] = []
    
    for (const item of index) {
      if (item.expiresAt < now) {
        // 过期，永久删除
        try {
          await fs.unlink(item.trashPath)
          result.deleted++
          console.log(`[Trash] 永久删除过期文件: ${item.originalPath}`)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          result.errors.push(`Failed to delete ${item.originalPath}: ${errorMsg}`)
        }
      } else {
        remaining.push(item)
      }
    }
    
    await saveTrashIndex(remaining)
    console.log(`[Trash] 清理完成: 删除 ${result.deleted} 个过期文件`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(`Cleanup failed: ${errorMsg}`)
  }
  
  return result
}

// 启动时执行一次清理
cleanupExpiredTrash().catch(console.error)

// ============================================
// 文件操作
// ============================================

// 读取文件
router.get('/read', async (req, res) => {
  try {
    const { path } = req.query
    if (!path || typeof path !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Path required'
      }
      return res.status(400).json(response)
    }
    
    const filePath = sanitizePath(path)
    
    // 安全检查：确保在 docs 目录内
    if (!filePath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    const content = await fs.readFile(filePath, 'utf-8')
    res.send(content)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') {
      const response: ApiResponse = {
        success: false,
        error: 'File not found'
      }
      return res.status(404).json(response)
    }
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to read file'
    }
    res.status(500).json(response)
  }
})

// 保存文件请求体接口
interface SaveFileBody {
  path: string
  content: string
  taskId?: string
  overwrite?: boolean  // P1-2: 显式设置为 true 才允许覆盖已存在的文件
}

// 保存文件
router.post('/save', async (req, res) => {
  const { path: filePath, content, taskId, overwrite } = req.body as SaveFileBody
  const targetPath = filePath ? sanitizePath(filePath) : ''
  const lockTaskId = taskId || 'manual-user'
  let lockAcquired = false
  
  try {
    if (!filePath) {
      const response: ApiResponse = {
        success: false,
        error: 'Path required'
      }
      return res.status(400).json(response)
    }
    
    // 安全检查
    if (!targetPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    // N2 修复：获取文件锁（所有写入都获取锁，用户手动保存使用 'manual-user' 标识）
    if (!fileLockManager.acquireLock(targetPath, lockTaskId)) {
      const lockInfo = fileLockManager.getLockInfo(targetPath)
      const response: ApiResponse = {
        success: false,
        error: `File is locked by another task: ${lockInfo?.taskId || 'unknown'}`
      }
      return res.status(423).json(response)
    }
    lockAcquired = true
    
    // P1-2 修复：写入前检查文件是否存在
    let fileExists = false
    try {
      await fs.access(targetPath)
      fileExists = true
    } catch {
      // 文件不存在，正常写入
    }
    
    // 如果文件已存在且未显式设置 overwrite=true，返回冲突错误
    if (fileExists && overwrite !== true) {
      const response: ApiResponse<{ exists: boolean; path: string }> = {
        success: false,
        error: 'File already exists. Set overwrite=true to overwrite.',
        data: { exists: true, path: filePath }
      }
      return res.status(409).json(response)
    }
    
    // 计算写入前 hash（如果文件存在）
    const expectedHash = computeContentHash(content)
    
    // 确保目录存在
    await fs.mkdir(dirname(targetPath), { recursive: true })
    
    // 写入文件
    await fs.writeFile(targetPath, content, 'utf-8')
    
    // 验证写入成功：读取文件并比较 hash
    const actualHash = await computeFileHash(targetPath)
    if (actualHash !== expectedHash) {
      // Hash 不匹配，可能写入失败或文件损坏
      console.error(`[FileSave] Hash mismatch for ${filePath}: expected ${expectedHash}, got ${actualHash}`)
      
      // 尝试清理可能损坏的文件
      try {
        await fs.unlink(targetPath)
      } catch {
        // 忽略清理错误
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'File verification failed: hash mismatch'
      }
      return res.status(500).json(response)
    }
    
    console.log(`[FileSave] 保存成功: ${filePath}, hash: ${actualHash}`)
    
    const response: ApiResponse<{ path: string; hash: string }> = {
      success: true,
      data: { path: filePath, hash: actualHash }
    }
    res.json(response)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[FileSave] 保存失败: ${filePath}, error: ${errorMsg}`)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to save file'
    }
    res.status(500).json(response)
  } finally {
    // N2 修复：释放文件锁
    if (lockAcquired) {
      fileLockManager.releaseLock(targetPath, lockTaskId)
    }
  }
})

// 删除文件请求体接口
interface DeleteFileBody {
  path: string
  permanent?: boolean
}

// 删除文件（软删除）
router.post('/delete', async (req, res) => {
  try {
    const { path: filePath, permanent = false } = req.body as DeleteFileBody
    if (!filePath) {
      const response: ApiResponse = {
        success: false,
        error: 'Path required'
      }
      return res.status(400).json(response)
    }
    
    const targetPath = sanitizePath(filePath)
    
    if (!targetPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    // 禁止删除 .trash 目录本身
    if (targetPath === normalize(TRASH_PATH)) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot delete trash directory'
      }
      return res.status(403).json(response)
    }
    
    if (permanent) {
      // 永久删除
      await fs.unlink(targetPath)
      console.log(`[FileDelete] 永久删除: ${filePath}`)
      
      const response: ApiResponse = {
        success: true
      }
      return res.json(response)
    }
    
    // 软删除：移动到 trash
    const trashId = generateTrashId()
    const fileName = basename(targetPath)
    const trashFileName = `${trashId}_${fileName}`
    const trashFilePath = join(TRASH_PATH, trashFileName)
    
    // 确保 trash 目录存在
    await fs.mkdir(TRASH_PATH, { recursive: true })
    
    // 移动文件到 trash
    await fs.rename(targetPath, trashFilePath)
    
    // 更新索引
    const index = await loadTrashIndex()
    const stat = await fs.stat(trashFilePath)
    
    // 计算过期时间（30 天后）
    const deletedAt = new Date()
    const expiresAt = new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    index.push({
      id: trashId,
      originalPath: filePath,
      trashPath: trashFilePath,
      fileName: fileName,
      deletedAt: deletedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      size: stat.size
    })
    
    await saveTrashIndex(index)
    
    console.log(`[FileDelete] 软删除: ${filePath} -> .trash/${trashFileName}, 过期时间: ${expiresAt.toISOString()}`)
    
    const response: ApiResponse<{ trashId: string; expiresAt: string }> = {
      success: true,
      data: {
        trashId,
        expiresAt: expiresAt.toISOString()
      }
    }
    res.json(response)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[FileDelete] 删除失败: ${errorMsg}`)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete file'
    }
    res.status(500).json(response)
  }
})

// 恢复文件请求体接口
interface RestoreFileBody {
  trashId: string
}

// 从 trash 恢复文件
router.post('/restore', async (req, res) => {
  try {
    const { trashId } = req.body as RestoreFileBody
    if (!trashId) {
      const response: ApiResponse = {
        success: false,
        error: 'Trash ID required'
      }
      return res.status(400).json(response)
    }
    
    const index = await loadTrashIndex()
    const item = index.find(i => i.id === trashId)
    
    if (!item) {
      const response: ApiResponse = {
        success: false,
        error: 'File not found in trash'
      }
      return res.status(404).json(response)
    }
    
    // 检查原始路径是否已被占用
    const originalPath = sanitizePath(item.originalPath)
    try {
      await fs.access(originalPath)
      // 文件存在，需要重命名
      const dir = dirname(originalPath)
      const ext = extname(item.fileName)
      const name = basename(item.fileName, ext)
      const timestamp = Date.now()
      const newFileName = `${name}_restored_${timestamp}${ext}`
      const newPath = join(dir, newFileName)
      
      await fs.mkdir(dir, { recursive: true })
      await fs.rename(item.trashPath, newPath)
      
      // 更新索引，移除已恢复项
      const newIndex = index.filter(i => i.id !== trashId)
      await saveTrashIndex(newIndex)
      
      console.log(`[FileRestore] 恢复到新路径: ${item.originalPath} -> ${newPath}`)
      
      const response: ApiResponse<{ restoredPath: string; renamed: boolean }> = {
        success: true,
        data: { restoredPath: newPath.replace(DOCS_PATH, '').replace(/\\/g, '/').replace(/^\//, ''), renamed: true }
      }
      return res.json(response)
    } catch {
      // 原始路径不存在，直接恢复
      await fs.mkdir(dirname(originalPath), { recursive: true })
      await fs.rename(item.trashPath, originalPath)
      
      // 更新索引，移除已恢复项
      const newIndex = index.filter(i => i.id !== trashId)
      await saveTrashIndex(newIndex)
      
      console.log(`[FileRestore] 恢复到原始路径: ${item.originalPath}`)
      
      const response: ApiResponse<{ restoredPath: string; renamed: boolean }> = {
        success: true,
        data: { restoredPath: item.originalPath, renamed: false }
      }
      return res.json(response)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[FileRestore] 恢复失败: ${errorMsg}`)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to restore file'
    }
    res.status(500).json(response)
  }
})

// 列出 trash 中的文件
router.get('/trash', async (req, res) => {
  try {
    const index = await loadTrashIndex()
    
    // 按删除时间倒序排列
    const sorted = index.sort((a, b) => 
      new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    )
    
    const response: ApiResponse<TrashItem[]> = {
      success: true,
      data: sorted
    }
    res.json(response)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[TrashList] 获取失败: ${errorMsg}`)
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list trash'
    }
    res.status(500).json(response)
  }
})

// 移动文件请求体接口
interface MoveFileBody {
  from: string
  to: string
}

// 移动文件
router.post('/move', async (req, res) => {
  try {
    const { from, to } = req.body as MoveFileBody
    if (!from || !to) {
      const response: ApiResponse = {
        success: false,
        error: 'From and to paths required'
      }
      return res.status(400).json(response)
    }
    
    const fromPath = sanitizePath(from)
    const toPath = sanitizePath(to)
    
    if (!fromPath.startsWith(normalize(DOCS_PATH)) || !toPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    await fs.mkdir(dirname(toPath), { recursive: true })
    await fs.rename(fromPath, toPath)
    
    const response: ApiResponse = {
      success: true
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to move file'
    }
    res.status(500).json(response)
  }
})

// 重命名文件请求体接口
interface RenameFileBody {
  path: string
  newName: string
}

// 重命名文件
router.post('/rename', async (req, res) => {
  try {
    const { path: filePath, newName } = req.body as RenameFileBody
    if (!filePath || !newName) {
      const response: ApiResponse = {
        success: false,
        error: 'Path and newName required'
      }
      return res.status(400).json(response)
    }
    
    const targetPath = sanitizePath(filePath)
    const newPath = join(dirname(targetPath), newName)
    
    if (!targetPath.startsWith(normalize(DOCS_PATH)) || !newPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    await fs.rename(targetPath, newPath)
    
    const response: ApiResponse = {
      success: true
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to rename file'
    }
    res.status(500).json(response)
  }
})

// ============================================
// 目录操作
// ============================================

// 列出目录
router.get('/list', async (req, res) => {
  try {
    const { path: dirPath = '' } = req.query
    if (typeof dirPath !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid path'
      }
      return res.status(400).json(response)
    }
    
    const targetPath = sanitizePath(dirPath)
    
    if (!targetPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    const items = await fs.readdir(targetPath, { withFileTypes: true })
    
    const result: FileItem[] = await Promise.all(
      items
        // 隐藏 .trash 目录
        .filter(item => item.name !== '.trash')
        .map(async (item) => {
          const fullPath = join(targetPath, item.name)
          const stat = await fs.stat(fullPath)
          
          return {
            name: item.name,
            path: join(dirPath, item.name).replace(/\\/g, '/'),
            type: item.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            modifiedAt: stat.mtime.toISOString()
          }
        })
    )
    
    const response: ApiResponse<FileItem[]> = {
      success: true,
      data: result
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list directory'
    }
    res.status(500).json(response)
  }
})

// 创建目录请求体接口
interface CreateDirBody {
  path: string
}

// 创建目录
router.post('/mkdir', async (req, res) => {
  try {
    const { path: dirPath } = req.body as CreateDirBody
    if (!dirPath) {
      const response: ApiResponse = {
        success: false,
        error: 'Path required'
      }
      return res.status(400).json(response)
    }
    
    const targetPath = sanitizePath(dirPath)
    
    if (!targetPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    await fs.mkdir(targetPath, { recursive: true })
    
    const response: ApiResponse = {
      success: true
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create directory'
    }
    res.status(500).json(response)
  }
})

// 删除目录请求体接口
interface DeleteDirBody {
  path: string
  recursive?: boolean
}

// 删除目录
router.post('/rmdir', async (req, res) => {
  try {
    const { path: dirPath, recursive = false } = req.body as DeleteDirBody
    if (!dirPath) {
      const response: ApiResponse = {
        success: false,
        error: 'Path required'
      }
      return res.status(400).json(response)
    }
    
    const targetPath = sanitizePath(dirPath)
    
    if (!targetPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    // 禁止删除 .trash 目录
    if (targetPath === normalize(TRASH_PATH)) {
      const response: ApiResponse = {
        success: false,
        error: 'Cannot delete trash directory'
      }
      return res.status(403).json(response)
    }
    
    await fs.rm(targetPath, { recursive: true })
    
    const response: ApiResponse = {
      success: true
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete directory'
    }
    res.status(500).json(response)
  }
})

// ============================================
// 搜索与批量操作
// ============================================

// 搜索目录函数（定义在路由外部）
async function searchDirectory(
  dir: string, 
  baseDir: string, 
  query: string, 
  results: FileItem[]
): Promise<void> {
  const items = await fs.readdir(dir, { withFileTypes: true })
  
  for (const item of items) {
    const fullPath = join(dir, item.name)
    const relativePath = fullPath.replace(baseDir, '').replace(/\\/g, '/')
    
    // 跳过 .trash 目录
    if (item.name === '.trash') continue
    
    if (item.isDirectory()) {
      await searchDirectory(fullPath, baseDir, query, results)
    } else if (item.name.toLowerCase().includes(query.toLowerCase())) {
      const stat = await fs.stat(fullPath)
      results.push({
        name: item.name,
        path: relativePath,
        type: 'file',
        size: stat.size,
        modifiedAt: stat.mtime.toISOString()
      })
    }
  }
}

// 搜索文件
router.get('/search', async (req, res) => {
  try {
    const { q, path: searchPath = '' } = req.query
    if (!q || typeof q !== 'string') {
      const response: ApiResponse<FileItem[]> = {
        success: true,
        data: []
      }
      return res.json(response)
    }
    
    if (typeof searchPath !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid path'
      }
      return res.status(400).json(response)
    }
    
    const targetPath = sanitizePath(searchPath)
    
    if (!targetPath.startsWith(normalize(DOCS_PATH))) {
      const response: ApiResponse = {
        success: false,
        error: 'Access denied'
      }
      return res.status(403).json(response)
    }
    
    const results: FileItem[] = []
    await searchDirectory(targetPath, DOCS_PATH, q, results)
    
    const response: ApiResponse<FileItem[]> = {
      success: true,
      data: results
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to search files'
    }
    res.status(500).json(response)
  }
})

// 批量保存请求体接口
interface BatchFile {
  path: string
  content: string
}

interface BatchSaveBody {
  files: BatchFile[]
}

interface BatchSaveResult {
  path: string
  success: boolean
  error?: string
}

// 批量保存
router.post('/batch-save', async (req, res) => {
  try {
    const { files } = req.body as BatchSaveBody
    if (!Array.isArray(files)) {
      const response: ApiResponse = {
        success: false,
        error: 'Files array required'
      }
      return res.status(400).json(response)
    }
    
    const results: BatchSaveResult[] = await Promise.all(
      files.map(async (file) => {
        try {
          const targetPath = sanitizePath(file.path)
          
          if (!targetPath.startsWith(normalize(DOCS_PATH))) {
            return { path: file.path, success: false, error: 'Access denied' }
          }
          
          // 计算 hash
          const expectedHash = computeContentHash(file.content)
          
          await fs.mkdir(dirname(targetPath), { recursive: true })
          await fs.writeFile(targetPath, file.content, 'utf-8')
          
          // 验证
          const actualHash = await computeFileHash(targetPath)
          if (actualHash !== expectedHash) {
            await fs.unlink(targetPath)
            return { path: file.path, success: false, error: 'Hash verification failed' }
          }
          
          return { path: file.path, success: true }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          return { path: file.path, success: false, error: errorMsg }
        }
      })
    )
    
    const response: ApiResponse<{ results: BatchSaveResult[] }> = {
      success: true,
      data: { results }
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to batch save'
    }
    res.status(500).json(response)
  }
})

// 获取文件锁状态
router.get('/lock-status', (req, res) => {
  try {
    const { path: filePath } = req.query
    if (!filePath || typeof filePath !== 'string') {
      const response: ApiResponse = {
        success: false,
        error: 'Path required'
      }
      return res.status(400).json(response)
    }
    
    const isLocked = fileLockManager.isLocked(filePath)
    const lockInfo = fileLockManager.getLockInfo(filePath)
    
    const response: ApiResponse<{ locked: boolean; taskId?: string; acquiredAt?: number }> = {
      success: true,
      data: {
        locked: isLocked,
        taskId: lockInfo?.taskId,
        acquiredAt: lockInfo?.acquiredAt
      }
    }
    res.json(response)
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get lock status'
    }
    res.status(500).json(response)
  }
})

export default router
