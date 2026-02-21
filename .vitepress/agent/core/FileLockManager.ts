/**
 * FileLockManager - 前端文件锁管理器
 * 
 * 用于协调多个 Agent 任务之间的文件访问，防止并发冲突。
 * 与服务端的 FileLockManager 配合工作。
 * 
 * 特性：
 * - 内存级锁管理
 * - 锁超时自动释放（5分钟）
 * - 支持任务级锁批量释放
 */

export interface FileLock {
  filePath: string
  taskId: string
  acquiredAt: number
}

export class FileLockManager {
  private static instance: FileLockManager
  private locks = new Map<string, FileLock>()
  private taskLocks = new Map<string, Set<string>>() // taskId -> filePaths
  private readonly LOCK_TIMEOUT = 5 * 60 * 1000 // 5分钟超时
  private cleanupInterval: number | null = null

  static getInstance(): FileLockManager {
    if (!FileLockManager.instance) {
      FileLockManager.instance = new FileLockManager()
    }
    return FileLockManager.instance
  }

  private constructor() {
    this.startCleanupInterval()
  }

  /**
   * 启动定时清理
   */
  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return // SSR 环境跳过
    
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupExpiredLocks()
    }, 60000) // 每分钟清理一次
  }

  /**
   * 获取文件锁
   * @param filePath 文件路径
   * @param taskId 任务ID
   * @returns 是否获取成功
   */
  acquireLock(filePath: string, taskId: string): boolean {
    const normalizedPath = this.normalizePath(filePath)
    const existingLock = this.locks.get(normalizedPath)
    
    if (existingLock) {
      // 检查锁是否超时
      if (Date.now() - existingLock.acquiredAt > this.LOCK_TIMEOUT) {
        console.warn(`[FileLockManager] 锁超时，强制释放: ${normalizedPath}`)
        this.releaseLock(normalizedPath, existingLock.taskId)
      } else if (existingLock.taskId !== taskId) {
        // 锁被其他任务占用
        return false
      } else {
        // 同一任务重复获取锁，允许
        return true
      }
    }
    
    // 获取锁
    this.locks.set(normalizedPath, {
      filePath: normalizedPath,
      taskId,
      acquiredAt: Date.now()
    })
    
    // 记录任务关联的锁
    if (!this.taskLocks.has(taskId)) {
      this.taskLocks.set(taskId, new Set())
    }
    this.taskLocks.get(taskId)!.add(normalizedPath)
    
    console.log(`[FileLockManager] 获取锁成功: ${normalizedPath}, taskId: ${taskId}`)
    return true
  }

  /**
   * 释放文件锁
   * @param filePath 文件路径
   * @param taskId 任务ID（用于验证）
   * @returns 是否释放成功
   */
  releaseLock(filePath: string, taskId: string): boolean {
    const normalizedPath = this.normalizePath(filePath)
    const existingLock = this.locks.get(normalizedPath)
    
    if (!existingLock || existingLock.taskId !== taskId) {
      return false
    }
    
    this.locks.delete(normalizedPath)
    
    // 更新任务关联的锁
    const taskLockSet = this.taskLocks.get(taskId)
    if (taskLockSet) {
      taskLockSet.delete(normalizedPath)
      if (taskLockSet.size === 0) {
        this.taskLocks.delete(taskId)
      }
    }
    
    console.log(`[FileLockManager] 释放锁成功: ${normalizedPath}`)
    return true
  }

  /**
   * 释放任务关联的所有锁
   * @param taskId 任务ID
   * @returns 释放的锁数量
   */
  releaseTaskLocks(taskId: string): number {
    const taskLockSet = this.taskLocks.get(taskId)
    if (!taskLockSet) return 0
    
    let count = 0
    for (const filePath of taskLockSet) {
      const lock = this.locks.get(filePath)
      if (lock && lock.taskId === taskId) {
        this.locks.delete(filePath)
        count++
      }
    }
    
    this.taskLocks.delete(taskId)
    console.log(`[FileLockManager] 释放任务 ${taskId} 的所有锁 (${count} 个)`)
    return count
  }

  /**
   * 检查文件是否被锁定
   * @param filePath 文件路径
   * @returns 是否被锁定
   */
  isLocked(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath)
    const lock = this.locks.get(normalizedPath)
    
    if (!lock) return false
    
    // 检查是否超时
    if (Date.now() - lock.acquiredAt > this.LOCK_TIMEOUT) {
      this.releaseLock(normalizedPath, lock.taskId)
      return false
    }
    
    return true
  }

  /**
   * 获取锁定信息
   * @param filePath 文件路径
   * @returns 锁定信息或 null
   */
  getLockInfo(filePath: string): FileLock | null {
    const normalizedPath = this.normalizePath(filePath)
    const lock = this.locks.get(normalizedPath)
    
    if (!lock) return null
    
    // 检查是否超时
    if (Date.now() - lock.acquiredAt > this.LOCK_TIMEOUT) {
      this.releaseLock(normalizedPath, lock.taskId)
      return null
    }
    
    return { ...lock }
  }

  /**
   * 获取文件的锁定任务ID
   * @param filePath 文件路径
   * @returns 任务ID或 undefined
   */
  getLockTaskId(filePath: string): string | undefined {
    const info = this.getLockInfo(filePath)
    return info?.taskId
  }

  /**
   * 批量获取锁
   * @param filePaths 文件路径数组
   * @param taskId 任务ID
   * @returns 是否全部获取成功
   */
  acquireLocks(filePaths: string[], taskId: string): { success: boolean; failed: string[] } {
    const acquired: string[] = []
    const failed: string[] = []
    
    for (const path of filePaths) {
      if (this.acquireLock(path, taskId)) {
        acquired.push(path)
      } else {
        failed.push(path)
      }
    }
    
    // 如果有失败的，释放已经获取的锁
    if (failed.length > 0) {
      for (const path of acquired) {
        this.releaseLock(path, taskId)
      }
      return { success: false, failed }
    }
    
    return { success: true, failed: [] }
  }

  /**
   * 获取所有锁的列表
   */
  getAllLocks(): FileLock[] {
    this.cleanupExpiredLocks()
    return Array.from(this.locks.values()).map(lock => ({ ...lock }))
  }

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): number {
    const now = Date.now()
    let count = 0
    
    for (const [path, lock] of this.locks) {
      if (now - lock.acquiredAt > this.LOCK_TIMEOUT) {
        this.releaseLock(path, lock.taskId)
        count++
      }
    }
    
    if (count > 0) {
      console.log(`[FileLockManager] 清理 ${count} 个过期锁`)
    }
    
    return count
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.locks.clear()
    this.taskLocks.clear()
  }

  /**
   * 路径规范化
   */
  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/\/+/g, '/').toLowerCase()
  }
}

// 导出单例实例
export const fileLockManager = FileLockManager.getInstance()

// 默认导出
export default FileLockManager
