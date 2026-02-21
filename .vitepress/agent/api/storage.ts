/**
 * Storage API - 本地存储管理
 * 
 * 提供统一的 localStorage/IndexedDB 封装
 * 支持：
 * - 命名空间隔离
 * - 过期时间
 * - 压缩存储
 * - 批量操作
 */

export interface StorageOptions {
  /** 命名空间前缀 */
  namespace?: string
  /** 默认过期时间（ms） */
  defaultTTL?: number
  /** 是否压缩 */
  compress?: boolean
  /** 存储引擎 */
  engine?: 'localStorage' | 'indexedDB'
}

interface StorageItem<T> {
  value: T
  expires?: number
  createdAt: number
}

const DEFAULT_OPTIONS: StorageOptions = {
  namespace: 'app:',
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7天
  compress: false,
  engine: 'localStorage'
}

class StorageManager {
  private options: StorageOptions
  
  constructor(options: StorageOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 基础操作
  // ═══════════════════════════════════════════════════════════════
  
  get<T>(key: string): T | null {
    const fullKey = this.getFullKey(key)
    
    try {
      const raw = localStorage.getItem(fullKey)
      if (!raw) return null
      
      const item: StorageItem<T> = JSON.parse(raw)
      
      // 检查过期
      if (item.expires && Date.now() > item.expires) {
        this.remove(key)
        return null
      }
      
      return item.value
    } catch (e) {
      console.error(`[Storage] 读取失败: ${key}`, e)
      return null
    }
  }
  
  set<T>(key: string, value: T, ttl?: number): boolean {
    const fullKey = this.getFullKey(key)
    
    try {
      const item: StorageItem<T> = {
        value,
        createdAt: Date.now(),
        expires: ttl !== undefined 
          ? (ttl === 0 ? undefined : Date.now() + ttl)
          : (this.options.defaultTTL 
              ? Date.now() + this.options.defaultTTL 
              : undefined)
      }
      
      localStorage.setItem(fullKey, JSON.stringify(item))
      return true
    } catch (e) {
      console.error(`[Storage] 写入失败: ${key}`, e)
      
      // 空间不足时清理
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.cleanup()
        // 重试一次
        try {
          localStorage.setItem(fullKey, JSON.stringify({ value, createdAt: Date.now() }))
          return true
        } catch {
          return false
        }
      }
      
      return false
    }
  }
  
  remove(key: string): void {
    const fullKey = this.getFullKey(key)
    localStorage.removeItem(fullKey)
  }
  
  has(key: string): boolean {
    return this.get(key) !== null
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 批量操作
  // ═══════════════════════════════════════════════════════════════
  
  getMany<T>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {}
    keys.forEach(key => {
      result[key] = this.get<T>(key)
    })
    return result
  }
  
  setMany<T>(data: Record<string, T>, ttl?: number): boolean {
    try {
      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value, ttl)
      })
      return true
    } catch {
      return false
    }
  }
  
  removeMany(keys: string[]): void {
    keys.forEach(key => this.remove(key))
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 查询操作
  // ═══════════════════════════════════════════════════════════════
  
  keys(): string[] {
    const prefix = this.options.namespace!
    const keys: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i)
      if (fullKey?.startsWith(prefix)) {
        keys.push(fullKey.slice(prefix.length))
      }
    }
    
    return keys
  }
  
  clear(): void {
    const prefix = this.options.namespace!
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
  
  size(): number {
    return this.keys().length
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 过期清理
  // ═══════════════════════════════════════════════════════════════
  
  cleanup(): number {
    const prefix = this.options.namespace!
    let cleaned = 0
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const fullKey = localStorage.key(i)
      if (!fullKey?.startsWith(prefix)) continue
      
      try {
        const raw = localStorage.getItem(fullKey)
        if (!raw) continue
        
        const item: StorageItem<any> = JSON.parse(raw)
        
        if (item.expires && Date.now() > item.expires) {
          localStorage.removeItem(fullKey)
          cleaned++
        }
      } catch {
        // 解析失败的数据也删除
        localStorage.removeItem(fullKey)
        cleaned++
      }
    }
    
    return cleaned
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 工具方法
  // ═══════════════════════════════════════════════════════════════
  
  private getFullKey(key: string): string {
    return `${this.options.namespace}${key}`
  }
  
  /**
   * 获取存储占用大小（字节）
   */
  getSize(): number {
    const prefix = this.options.namespace!
    let size = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) {
        size += key.length + (localStorage.getItem(key)?.length || 0)
      }
    }
    
    return size * 2 // UTF-16 编码，每个字符 2 字节
  }
  
  /**
   * 创建子命名空间
   */
  createNamespace(subNamespace: string): StorageManager {
    return new StorageManager({
      ...this.options,
      namespace: `${this.options.namespace}${subNamespace}:`
    })
  }
}

// ═══════════════════════════════════════════════════════════════
// 预定义的存储实例
// ═══════════════════════════════════════════════════════════════

/** 默认存储 */
export const storage = new StorageManager()

/** 会话存储（长期） */
export const sessionStorage = new StorageManager({ 
  namespace: 'chat:sessions:' 
})

/** 草稿存储（短期） */
export const draftStorage = new StorageManager({ 
  namespace: 'chat:drafts:',
  defaultTTL: 24 * 60 * 60 * 1000 // 1天
})

/** 缓存存储（超短期） */
export const cacheStorage = new StorageManager({ 
  namespace: 'chat:cache:',
  defaultTTL: 5 * 60 * 1000 // 5分钟
})

// 默认导出
export default StorageManager
