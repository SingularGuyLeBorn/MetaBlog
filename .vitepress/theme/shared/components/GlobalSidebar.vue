<template>
  <aside class="global-sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="header-title">
        <span class="title-icon">✦</span>
        <span class="title-text">{{ sectionTitle }}</span>
      </div>
      <div class="header-actions">
        <button 
          class="action-btn magnetic-btn" 
          :title="isAllExpanded ? '全部折叠' : '全部展开'"
          @click="toggleAll"
        >
          <svg v-if="isAllExpanded" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="m6 9 6 6 6-6"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>
        <button 
          class="action-btn magnetic-btn" 
          title="定位当前"
          @click="locateCurrent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="sidebar-search">
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input 
          v-model="searchKey" 
          placeholder="搜索文档..." 
          class="search-input sr-input"
          type="text"
        />
        <button v-if="searchKey" class="search-clear" @click="searchKey = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
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
        <span class="no-results-icon">✧</span>
        <span>未找到匹配的文档</span>
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick, provide } from 'vue'
import { useRoute, useRouter } from 'vitepress'
import { useSidebar } from 'vitepress/theme'
import TreeNode from '../ui/TreeNode.vue'

const route = useRoute()
const router = useRouter()
const { sidebar } = useSidebar()

const STORAGE_KEY = 'sidebar-expanded-ids-v4'
const ALL_COLLAPSED_KEY = 'sidebar-all-collapsed'
const expandedIds = ref<Set<string>>(new Set())
const searchKey = ref('')
const treeRef = ref<HTMLElement | null>(null)
const dynamicSidebarData = ref<any[]>([])
const currentSection = ref('posts')

const extractSectionFromRoute = (path: string): string => {
  const match = path.match(/\/sections\/([^\/]+)/)
  if (match) return match[1]
  const parts = path.split('/').filter(Boolean)
  if (parts.length > 0 && ['posts', 'knowledge-base', 'resources'].includes(parts[0])) {
    return parts[0]
  }
  return 'posts'
}

const refreshSidebarData = async () => {
  try {
    const section = extractSectionFromRoute(route.path)
    currentSection.value = section
    const res = await fetch(`/api/sidebar?section=${section}&_t=${Date.now()}`)
    const result = await res.json()
    if (result.success && result.data) {
      dynamicSidebarData.value = result.data
    }
  } catch (e) {
    console.error('[Sidebar] Failed to refresh:', e)
  }
}

provide('refreshSidebar', refreshSidebarData)

const sidebarData = computed(() => {
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
  expandedIds.value.clear()
  saveState()
}

const locateCurrent = () => {
  autoExpandCurrentPath()
  nextTick(() => {
    const activeEl = treeRef.value?.querySelector('.is-active')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
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

const handleRefresh = async () => {
  dynamicSidebarData.value = []
  await refreshSidebarData()
  nextTick(() => {
    autoExpandCurrentPath()
  })
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
  refreshSidebarData()
  
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
    expandedIds.value.clear()
  } else {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        expandedIds.value = new Set(JSON.parse(saved))
      } catch (e) {
        expandedIds.value = new Set()
      }
    }
    nextTick(() => {
      autoExpandCurrentPath()
    })
  }
  
  nextTick(() => {
    locateCurrent()
  })
})

watch(() => route.path, (newPath, oldPath) => {
  const newSection = extractSectionFromRoute(newPath)
  const oldSection = oldPath ? extractSectionFromRoute(oldPath) : ''
  
  if (newSection !== oldSection && newSection !== currentSection.value) {
    dynamicSidebarData.value = []
    refreshSidebarData()
  }
  
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
  }
}
</script>

<style scoped>
.global-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
  font-family: var(--sr-font-primary);
}

/* Header - Minimalist */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sr-glass-border);
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 14px;
  color: var(--sr-accent-star);
  opacity: 0.8;
}

.title-text {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--sr-text-secondary);
  text-transform: uppercase;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-sm);
  background: transparent;
  color: var(--sr-text-muted);
  cursor: pointer;
  transition: all 0.2s var(--sr-spring-bounce);
}

.action-btn:hover {
  border-color: var(--sr-glass-border-strong);
  color: var(--sr-text-secondary);
  background: var(--sr-glass-bg);
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

/* Search */
.sidebar-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--sr-glass-border);
  flex-shrink: 0;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 14px;
  height: 14px;
  color: var(--sr-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 34px !important;
  font-size: 13px !important;
  background: var(--sr-glass-bg) !important;
  border: 1px solid var(--sr-glass-border) !important;
  border-radius: var(--sr-radius-md) !important;
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sr-text-muted);
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-clear:hover {
  color: var(--sr-text-secondary);
  background: var(--sr-glass-bg-hover);
}

.search-clear svg {
  width: 12px;
  height: 12px;
}

/* Navigation Tree */
.nav-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 8px;
  outline: none;
}

.nav-tree:focus {
  outline: none;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  gap: 12px;
  color: var(--sr-text-muted);
}

.no-results-icon {
  font-size: 32px;
  opacity: 0.5;
}

/* Flash highlight animation */
:global(.flash-highlight) {
  animation: flash 600ms ease;
}

@keyframes flash {
  0% { background-color: rgba(196, 184, 212, 0.15); }
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
  background: var(--sr-glass-border);
  border-radius: 2px;
}

.nav-tree::-webkit-scrollbar-thumb:hover {
  background: var(--sr-glass-border-strong);
}
</style>
