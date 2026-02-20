import { ref, computed } from 'vue'
import { useData } from 'vitepress'

interface SidebarNode {
  text: string
  link?: string
  items?: SidebarNode[]
  collapsed?: boolean
  id?: string
  isLeaf?: boolean
}

const dynamicSidebarCache = ref<Record<string, SidebarNode[]>>({})
const lastUpdate = ref(Date.now())

/**
 * 动态 Sidebar Hook
 * 实时获取文件系统结构，覆盖 VitePress 静态 Sidebar
 */
export function useDynamicSidebar() {
  const { site } = useData()
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 获取指定 section 的实时 sidebar 数据
   */
  async function refreshSidebar(section: string = 'posts'): Promise<SidebarNode[]> {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(`/api/sidebar?section=${section}&_t=${Date.now()}`)
      const result = await response.json()
      
      if (result.success) {
        dynamicSidebarCache.value[section] = result.data
        lastUpdate.value = Date.now()
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch sidebar')
      }
    } catch (e) {
      error.value = (e as Error).message
      console.error('[Sidebar] Failed to refresh:', e)
      // 返回缓存数据或空数组
      return dynamicSidebarCache.value[section] || []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取当前 section 的 sidebar
   */
  function getSidebar(section: string = 'posts'): SidebarNode[] {
    return dynamicSidebarCache.value[section] || []
  }

  /**
   * 清除缓存并重新获取
   */
  async function invalidateAndRefresh(section: string = 'posts'): Promise<SidebarNode[]> {
    delete dynamicSidebarCache.value[section]
    return refreshSidebar(section)
  }

  /**
   * 监听文件变动事件，自动刷新
   */
  function setupAutoRefresh() {
    // 事件处理器引用，用于后续清理
    const fileChangeHandler = (e: Event) => {
      const customEvent = e as CustomEvent
      const { section } = customEvent.detail || {}
      if (section) {
        refreshSidebar(section)
      } else {
        // 刷新所有已缓存的 section
        Object.keys(dynamicSidebarCache.value).forEach(sec => refreshSidebar(sec))
      }
    }
    
    // 监听自定义事件
    window.addEventListener('file-system-change', fileChangeHandler)

    // 定时刷新（开发模式下每 30 秒）
    let refreshTimer: ReturnType<typeof setInterval> | null = null
    if (import.meta.env.DEV) {
      refreshTimer = setInterval(() => {
        Object.keys(dynamicSidebarCache.value).forEach(sec => refreshSidebar(sec))
      }, 30000)
    }
    
    // 返回清理函数
    return () => {
      window.removeEventListener('file-system-change', fileChangeHandler)
      if (refreshTimer) {
        clearInterval(refreshTimer)
      }
    }
  }

  return {
    sidebar: computed(() => dynamicSidebarCache.value),
    lastUpdate,
    isLoading,
    error,
    refreshSidebar,
    getSidebar,
    invalidateAndRefresh,
    setupAutoRefresh
  }
}

/**
 * 触发文件系统变动事件
 */
export function notifyFileSystemChange(section?: string) {
  window.dispatchEvent(new CustomEvent('file-system-change', { 
    detail: { section, timestamp: Date.now() }
  }))
}
