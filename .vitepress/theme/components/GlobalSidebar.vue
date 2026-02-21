<template>
  <aside class="global-sidebar">
    <!-- Toolbar -->
    <div class="sidebar-toolbar">
      <div class="toolbar-title">{{ sectionTitle }}</div>
      <div class="toolbar-actions">
        <button 
          class="toolbar-btn" 
          :title="isAllExpanded ? '全部折叠 (Ctrl+Shift+E)' : '全部展开 (Ctrl+Shift+E)'"
          @click="toggleAll"
        >
          <!-- 展开状态显示 ChevronDown ⏷ 提示可折叠，折叠状态显示 ChevronRight ⏵ 提示可展开 -->
          <svg v-if="isAllExpanded" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m6 9 6 6 6-6"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
        <button 
          class="toolbar-btn" 
          title="定位当前文档 (Alt+L)"
          @click="locateCurrent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="sidebar-search">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input 
          v-model="searchKey" 
          placeholder="搜索文档..." 
          class="search-input"
          type="text"
        />
        <button v-if="searchKey" class="search-clear" @click="searchKey = ''">×</button>
      </div>
    </div>

    <!-- Tree Navigation -->
    <div 
      class="nav-tree" 
      ref="treeRef"
      tabindex="0"
      @keydown="handleTreeKeydown"
    >
      <div v-if="filteredSidebar.length === 0" class="no-results">
        未找到匹配的文档
      </div>
      
      <template v-for="(item, index) in filteredSidebar" :key="item.id || item.link || index">
        <TreeNode
          :item="item"
          :level="0"
          :active-path="route.path"
          :expanded-ids="expandedIds"
          @navigate="navigate"
          @toggle="toggleExpand"
          @refresh="handleRefresh"
        />
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide, readonly } from 'vue'
import { useRoute, useRouter, useData } from 'vitepress'
import { useSidebar } from 'vitepress/theme'
import TreeNode from './TreeNode.vue'
import { eventBus } from '../../agent/core/EventBus'

const route = useRoute()
const router = useRouter()
const { sidebar } = useSidebar()

const STORAGE_KEY = 'sidebar-expanded-ids-v4'
const ALL_COLLAPSED_KEY = 'sidebar-all-collapsed'
const expandedIds = ref<Set<string>>(new Set())
const searchKey = ref('')
const treeRef = ref<HTMLElement | null>(null)

// 动态侧边栏数据 - 支持从 API 刷新
const dynamicSidebarData = ref<any[]>([])
const isLoading = ref(false)
const currentSection = ref('posts')

// 从路由路径提取当前 section
const extractSectionFromRoute = (path: string): string => {
  // 路径格式: /sections/xxx/... 或 /xxx/...
  const match = path.match(/\/sections\/([^\/]+)/)
  if (match) return match[1]
  // 尝试从路径开头提取
  const parts = path.split('/').filter(Boolean)
  if (parts.length > 0 && ['posts', 'knowledge-base', 'resources'].includes(parts[0])) {
    return parts[0]
  }
  return 'posts' // 默认
}

// 从 API 获取最新侧边栏数据
const refreshSidebarData = async () => {
  isLoading.value = true
  try {
    const section = extractSectionFromRoute(route.path)
    currentSection.value = section
    const res = await fetch(`/api/sidebar?section=${section}&_t=${Date.now()}`)
    const result = await res.json()
    if (result.success && result.data) {
      dynamicSidebarData.value = result.data
      console.log('[Sidebar] Data refreshed from API, section:', section)
    }
  } catch (e) {
    console.error('[Sidebar] Failed to refresh:', e)
  } finally {
    isLoading.value = false
  }
}

// 提供刷新函数给子组件
provide('refreshSidebar', refreshSidebarData)

// 合并静态和动态数据 - 优先使用动态数据
const sidebarData = computed(() => {
  // 如果动态数据已加载，使用动态数据；否则使用静态数据
  return dynamicSidebarData.value.length > 0 ? dynamicSidebarData.value : (sidebar.value || [])
})

const sectionTitle = computed(() => {
  if (sidebarData.value.length > 0 && sidebarData.value[0].text) {
    return sidebarData.value[0].text
  }
  return '文档'
})

const isAllExpanded = computed(() => {
  const checkExpanded = (items: any[]): boolean => {
    for (const item of items) {
      if (item.items?.length) {
        const itemId = item.id || item.link
        if (itemId && !expandedIds.value.has(itemId)) return false
        if (!checkExpanded(item.items)) return false
      }
    }
    return true
  }
  return checkExpanded(sidebarData.value)
})

const toggleAll = () => {
  if (isAllExpanded.value) {
    collapseAll()
    saveAllCollapsedState(true)
  } else {
    expandAll()
    saveAllCollapsedState(false)
  }
}

const expandAll = () => {
  const collectIds = (items: any[]) => {
    for (const item of items) {
      const itemId = item.id || item.link
      if (itemId && item.items?.length) {
        expandedIds.value.add(itemId)
        collectIds(item.items)
      }
    }
  }
  collectIds(sidebarData.value)
  saveState()
}

const collapseAll = () => {
  // 彻底折叠所有节点（包括当前选中的）
  expandedIds.value.clear()
  saveState()
}

const locateCurrent = () => {
  // 先展开当前路径以找到 active 元素
  autoExpandCurrentPath()
  
  nextTick(() => {
    const activeEl = treeRef.value?.querySelector('.is-active')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 600ms flash animation
      activeEl.classList.add('flash-highlight')
      setTimeout(() => {
        activeEl.classList.remove('flash-highlight')
      }, 600)
    }
  })
}

const toggleExpand = (id: string) => {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
  saveState()
}

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds.value]))
}

const saveAllCollapsedState = (isAllCollapsed: boolean) => {
  localStorage.setItem(ALL_COLLAPSED_KEY, JSON.stringify(isAllCollapsed))
}

const navigate = (link?: string) => {
  if (link) router.go(link)
}

// 刷新侧边栏 - 从 API 重新获取数据，无需整页刷新
const handleRefresh = async () => {
  // 显示刷新提示
  const toast = document.createElement('div')
  toast.className = 'refresh-toast'
  toast.textContent = '更新目录...'
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: var(--vp-c-brand, #1677ff);
    color: white;
    border-radius: 6px;
    font-size: 13px;
    z-index: 10000;
    animation: fadeIn 0.2s ease;
  `
  document.body.appendChild(toast)
  
  // 清空动态数据强制重新加载
  dynamicSidebarData.value = []
  
  // 从 API 刷新数据
  await refreshSidebarData()
  
  // 刷新后自动展开当前路径（处理叶子文档变文件夹的情况）
  nextTick(() => {
    autoExpandCurrentPath()
  })
  
  // 移除提示
  setTimeout(() => {
    toast.remove()
  }, 800)
}

const autoExpandCurrentPath = () => {
  const findPath = (items: any[], parentIds: string[] = []): boolean => {
    for (const item of items) {
      const itemId = item.id || item.link
      const currentPath = [...parentIds, itemId].filter(Boolean)
      
      const isActive = route.path === item.link || 
                      (item.link && item.link !== '/' && route.path.startsWith(item.link + '/'))
      
      if (isActive) {
        currentPath.forEach(id => expandedIds.value.add(id))
        return true
      }
      
      if (item.items?.length) {
        const found = findPath(item.items, currentPath)
        if (found) return true
      }
    }
    return false
  }
  
  findPath(sidebarData.value)
}

onMounted(() => {
  // 初始加载动态侧边栏数据
  refreshSidebarData()
  
  // Load all-collapsed state first
  const allCollapsed = localStorage.getItem(ALL_COLLAPSED_KEY)
  let isAllCollapsed = false
  
  if (allCollapsed) {
    try {
      isAllCollapsed = JSON.parse(allCollapsed)
    } catch (e) {
      isAllCollapsed = false
    }
  }
  
  if (isAllCollapsed) {
    // 用户之前选择了全部折叠，保持折叠状态（彻底折叠，包括当前选中项）
    expandedIds.value.clear()
  } else {
    // 加载展开的节点状态
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        expandedIds.value = new Set(JSON.parse(saved))
      } catch (e) {
        expandedIds.value = new Set()
      }
    }
    // 展开当前路径（为了 UX，让用户知道当前位置）
    // 使用 nextTick 确保动态数据已加载
    nextTick(() => {
      autoExpandCurrentPath()
    })
  }
  
  // Auto locate current on mount（延迟执行，确保 DOM 更新）
  nextTick(() => {
    locateCurrent()
  })
})

watch(() => route.path, (newPath, oldPath) => {
  // 检查 section 是否变化
  const newSection = extractSectionFromRoute(newPath)
  const oldSection = oldPath ? extractSectionFromRoute(oldPath) : ''
  
  // 如果 section 变化了，清空动态数据并重新加载
  if (newSection !== oldSection && newSection !== currentSection.value) {
    console.log('[Sidebar] Section changed from', oldSection, 'to', newSection)
    dynamicSidebarData.value = [] // 清空旧数据避免闪烁
    refreshSidebarData()
  }
  
  // 路由切换时，如果不是全部折叠状态，则自动展开当前路径
  const allCollapsed = localStorage.getItem(ALL_COLLAPSED_KEY)
  let isAllCollapsed = false
  if (allCollapsed) {
    try {
      isAllCollapsed = JSON.parse(allCollapsed)
    } catch (e) {
      isAllCollapsed = false
    }
  }
  
  if (!isAllCollapsed) {
    nextTick(() => {
      autoExpandCurrentPath()
    })
  }
})

const filteredSidebar = computed(() => {
  if (!searchKey.value) return sidebarData.value
  
  const query = searchKey.value.toLowerCase()
  
  const filterNode = (node: any): any | null => {
    const textMatches = node.text?.toLowerCase().includes(query)
    
    if (node.items?.length) {
      const children = node.items.map(filterNode).filter(Boolean)
      if (children.length > 0 || textMatches) {
        if (node.id) expandedIds.value.add(node.id)
        return { ...node, items: children }
      }
    }
    
    return textMatches ? node : null
  }
  
  return sidebarData.value.map(filterNode).filter(Boolean)
})

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.altKey && e.key === 'l') {
      e.preventDefault()
      locateCurrent()
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault()
      toggleAll()
    }
  }
  document.addEventListener('keydown', handleKeydown)
})

// Agent 系统事件监听 - 展开指定路径并刷新侧边栏
let unsubscribeExpand: (() => void) | null = null
let unsubscribeRefresh: (() => void) | null = null

onMounted(() => {
  // 监听侧边栏展开事件（Agent 创建文章后自动展开目录）
  unsubscribeExpand = eventBus.on('sidebar:expand', (data) => {
    const filePath = data.path
    
    // 找到包含该文件的所有父目录并展开
    const findAndExpandPath = (items: any[], parentIds: string[] = []): boolean => {
      for (const item of items) {
        const itemId = item.id || item.link
        const currentPath = [...parentIds, itemId].filter(Boolean)
        
        // 检查是否是目标文件或其父目录
        const isTargetFile = item.link && filePath.includes(item.link.replace(/\.html$/, '.md'))
        const isParentOfTarget = item.items?.some((child: any) => {
          const childPath = child.link || child.id
          return childPath && filePath.includes(childPath.replace(/\.html$/, '.md'))
        })
        
        if (isTargetFile || isParentOfTarget) {
          // 展开所有父目录
          currentPath.forEach(id => expandedIds.value.add(id))
          saveState()
          
          // 如果找到目标文件，滚动到视图
          if (isTargetFile) {
            nextTick(() => {
              locateCurrent()
            })
          }
          return true
        }
        
        if (item.items?.length) {
          const found = findAndExpandPath(item.items, currentPath)
          if (found) return true
        }
      }
      return false
    }
    
    findAndExpandPath(sidebarData.value)
  })
  
  // 监听侧边栏刷新事件（Agent 创建文章后刷新目录）
  unsubscribeRefresh = eventBus.on('sidebar:refresh', (data) => {
    const section = data.section
    const currentSectionName = extractSectionFromRoute(route.path)
    
    // 只有当当前显示的栏目与 Agent 创建的文章栏目一致时才刷新
    if (section === currentSectionName || section === 'unknown') {
      console.log('[Sidebar] Refreshing due to agent task completion, section:', section)
      refreshSidebarData()
    }
  })
})

onUnmounted(() => {
  unsubscribeExpand?.()
  unsubscribeRefresh?.()
})

// Tree keyboard navigation
const focusedIndex = ref(-1)

const getFocusableElements = (): HTMLElement[] => {
  if (!treeRef.value) return []
  return Array.from(treeRef.value.querySelectorAll('.node-row[tabindex="-1"]')) as HTMLElement[]
}

const handleTreeKeydown = (e: KeyboardEvent) => {
  const focusableElements = getFocusableElements()
  if (focusableElements.length === 0) return
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      focusedIndex.value = Math.min(focusedIndex.value + 1, focusableElements.length - 1)
      focusableElements[focusedIndex.value]?.focus()
      break
    case 'ArrowUp':
      e.preventDefault()
      focusedIndex.value = Math.max(focusedIndex.value - 1, 0)
      focusableElements[focusedIndex.value]?.focus()
      break
    case 'Enter':
      e.preventDefault()
      if (focusedIndex.value >= 0) {
        const el = focusableElements[focusedIndex.value]
        el?.click()
      }
      break
    case 'Escape':
      // Close mobile drawer if open
      const overlay = document.querySelector('.sidebar-overlay.is-open')
      if (overlay) {
        overlay.classList.remove('is-open')
      }
      break
  }
}
</script>

<style scoped>
.global-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vp-c-bg-alt, #fafafa);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* Toolbar */
.sidebar-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
  background: var(--vp-c-bg-soft, #f5f5f5);
  flex-shrink: 0;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.toolbar-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2, #595959);
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease;
}

.toolbar-btn:hover {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
  color: var(--vp-c-brand, #1677ff);
}

.toolbar-btn svg {
  width: 16px;
  height: 16px;
}

/* Search */
.sidebar-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
  background: var(--vp-c-bg, #ffffff);
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  width: 14px;
  height: 14px;
  color: var(--vp-c-text-3, #8c8c8c);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 28px 7px 32px;
  font-size: 13px;
  line-height: 20px;
  color: var(--vp-c-text-1, #262626);
  background: var(--vp-c-bg-soft, #f5f5f5);
  border: 1px solid transparent;
  border-radius: 6px;
  outline: none;
  transition: background-color 200ms ease, border-color 200ms ease;
}

.search-input::placeholder {
  color: var(--vp-c-text-3, #8c8c8c);
}

.search-input:hover {
  background: var(--vp-c-divider, #e8e8e8);
}

.search-input:focus {
  background: var(--vp-c-bg, #ffffff);
  border-color: var(--vp-c-brand, #1677ff);
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--vp-c-text-3, #8c8c8c);
  background: var(--vp-c-divider, #d9d9d9);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease;
}

.search-clear:hover {
  background: var(--vp-c-text-3, #bfbfbf);
  color: var(--vp-c-bg, #ffffff);
}

/* Navigation Tree */
.nav-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 12px;
  outline: none;
}

.nav-tree:focus {
  outline: 2px solid var(--vp-c-brand-soft, rgba(22, 119, 255, 0.2));
  outline-offset: -2px;
}

.no-results {
  padding: 40px 20px;
  text-align: center;
  color: var(--vp-c-text-3, #8c8c8c);
  font-size: 13px;
}

/* Flash highlight animation - 600ms */
:global(.flash-highlight) {
  animation: flash 600ms ease;
}

@keyframes flash {
  0% { background-color: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.15)); }
  100% { background-color: transparent; }
}

/* Custom Scrollbar */
.nav-tree::-webkit-scrollbar {
  width: 4px;
}

.nav-tree::-webkit-scrollbar-track {
  background: transparent;
}

.nav-tree::-webkit-scrollbar-thumb {
  background: var(--vp-c-divider, #d9d9d9);
  border-radius: 2px;
}

.nav-tree::-webkit-scrollbar-thumb:hover {
  background: var(--vp-c-text-3, #bfbfbf);
}
</style>
