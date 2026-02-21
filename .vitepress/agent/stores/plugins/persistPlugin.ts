/**
 * Persist Plugin - Pinia 持久化插件
 * 
 * 功能：
 * 1. 自动保存 Store 状态到 localStorage
 * 2. 页面刷新后恢复状态
 * 3. 支持自定义序列化/反序列化
 * 4. 防抖保存，避免频繁写入
 */
import type { PiniaPluginContext } from 'pinia'

export interface PersistOptions {
  /** localStorage key 前缀 */
  prefix?: string
  /** 需要持久化的字段（白名单） */
  include?: string[]
  /** 排除的字段（黑名单） */
  exclude?: string[]
  /** 序列化函数 */
  serialize?: (value: any) => string
  /** 反序列化函数 */
  deserialize?: (value: string) => any
  /** 防抖延迟（ms） */
  debounce?: number
  /** 是否压缩（简单压缩，删除空格） */
  compress?: boolean
}

interface PersistEntry {
  data: Record<string, any>
  timestamp: number
  version: number
}

const DEFAULT_OPTIONS: PersistOptions = {
  prefix: 'pinia:',
  debounce: 300,
  compress: false,
  serialize: JSON.stringify,
  deserialize: JSON.parse
}

export function createPersistPlugin(globalOptions: PersistOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...globalOptions }
  
  return ({ store }: PiniaPluginContext) => {
    // SSR 环境跳过
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return
    }
    
    // 从 Store 的 $persist 选项读取配置
    const storeOptions = (store.$state as any).$persist as PersistOptions | undefined
    const config = { ...options, ...storeOptions }
    
    const storageKey = `${config.prefix}${store.$id}`
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    
    // ═══════════════════════════════════════════════════════════════
    // 恢复状态
    // ═══════════════════════════════════════════════════════════════
    
    function restoreState() {
      try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return
        
        const entry: PersistEntry = config.deserialize!(raw)
        
        // 检查版本（用于未来数据迁移）
        if (entry.version && entry.version > 1) {
          console.warn(`[Persist] Store "${store.$id}" 数据版本较新，可能不兼容`)
        }
        
        // 合并状态（只恢复白名单字段）
        const stateToRestore = entry.data as Record<string, any>
        const filteredState: Record<string, any> = {}
        
        if (config.include) {
          // 白名单模式
          config.include.forEach(key => {
            if (key in stateToRestore) {
              filteredState[key] = stateToRestore[key]
            }
          })
        } else if (config.exclude) {
          // 黑名单模式
          Object.keys(stateToRestore).forEach(key => {
            if (!config.exclude!.includes(key)) {
              filteredState[key] = stateToRestore[key]
            }
          })
        } else {
          // 全部恢复
          Object.assign(filteredState, stateToRestore)
        }
        
        // 应用恢复的状态
        store.$patch(filteredState)
        
        console.log(`[Persist] 恢复 Store "${store.$id}" 状态（${new Date(entry.timestamp).toLocaleString()}）`)
      } catch (e) {
        console.error(`[Persist] 恢复 Store "${store.$id}" 失败:`, e)
        // 清除可能损坏的数据
        localStorage.removeItem(storageKey)
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 保存状态
    // ═══════════════════════════════════════════════════════════════
    
    function saveState() {
      try {
        let stateToSave: any = {}
        const rawState = store.$state
        
        // 过滤字段
        if (config.include) {
          config.include.forEach(key => {
            if (key in rawState) {
              stateToSave[key] = rawState[key]
            }
          })
        } else if (config.exclude) {
          Object.keys(rawState).forEach(key => {
            if (!config.exclude!.includes(key)) {
              stateToSave[key] = rawState[key]
            }
          })
        } else {
          stateToSave = { ...rawState }
        }
        
        // 移除内部字段
        delete stateToSave.$persist
        
        const entry: PersistEntry = {
          data: stateToSave,
          timestamp: Date.now(),
          version: 1
        }
        
        let serialized = config.serialize!(entry)
        
        // 简单压缩（可选）
        if (config.compress) {
          serialized = serialized.replace(/\s+/g, '')
        }
        
        localStorage.setItem(storageKey, serialized)
      } catch (e) {
        console.error(`[Persist] 保存 Store "${store.$id}" 失败:`, e)
        
        // 如果是 quota exceeded，尝试清理旧数据
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          cleanupOldData()
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 防抖保存
    // ═══════════════════════════════════════════════════════════════
    
    function debouncedSave() {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      debounceTimer = setTimeout(() => {
        saveState()
        debounceTimer = null
      }, config.debounce)
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 清理旧数据（当存储空间不足时）
    // ═══════════════════════════════════════════════════════════════
    
    function cleanupOldData() {
      console.warn('[Persist] 存储空间不足，尝试清理旧数据')
      
      const entries: { key: string; timestamp: number }[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(config.prefix!)) {
          try {
            const raw = localStorage.getItem(key)
            if (raw) {
              const entry: PersistEntry = config.deserialize!(raw)
              entries.push({ key, timestamp: entry.timestamp })
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
      
      // 按时间排序，删除最旧的 30%
      entries.sort((a, b) => a.timestamp - b.timestamp)
      const toDelete = Math.ceil(entries.length * 0.3)
      
      entries.slice(0, toDelete).forEach(({ key }) => {
        localStorage.removeItem(key)
        console.log(`[Persist] 删除旧数据: ${key}`)
      })
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 初始化
    // ═══════════════════════════════════════════════════════════════
    
    // 恢复状态
    restoreState()
    
    // 订阅状态变化
    store.$subscribe((mutation, state) => {
      // 忽略来自恢复的 mutation
      if ((mutation as any).storeId === 'persist-restore') return
      
      debouncedSave()
    })
    
    // 监听 beforeunload，强制保存
    window?.addEventListener('beforeunload', () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        saveState()
      }
    })
    
    // 暴露手动保存方法
    return {
      $persist: {
        save: saveState,
        restore: restoreState,
        clear: () => localStorage.removeItem(storageKey)
      }
    }
  }
}

// 默认导出
export default createPersistPlugin
