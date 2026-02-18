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
    
    <!-- Agent Mode Actions -->
    <div class="sidebar-agent-actions">
      <button 
        class="agent-action-btn"
        :class="{ active: showDashboard }"
        @click="toggleDashboard"
      >
        <span class="action-icon">🤖</span>
        <span class="action-label">Agent 面板</span>
      </button>
      <button 
        class="agent-action-btn"
        :class="{ active: showArticleManager }"
        @click="toggleArticleManager"
      >
        <span class="action-icon">📝</span>
        <span class="action-label">文章管理</span>
      </button>
      <button 
        class="agent-action-btn"
        :class="{ active: showLogViewer }"
        @click="toggleLogViewer"
      >
        <span class="action-icon">📋</span>
        <span class="action-label">日志查看</span>
      </button>
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
      v-if="!showArticleManager && !showLogViewer && !showDashboard"
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
        />
      </template>
    </div>
    
    <!-- Dashboard Panel -->
    <div v-else-if="showDashboard" class="article-manager-panel">
      <div class="panel-header">
        <button class="btn-back" @click="showDashboard = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          返回导航
        </button>
      </div>
      <AgentDashboard />
    </div>
    
    <!-- Article Manager Panel -->
    <div v-else-if="showArticleManager" class="article-manager-panel">
      <div class="panel-header">
        <button class="btn-back" @click="showArticleManager = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          返回导航
        </button>
      </div>
      <ArticleManager />
    </div>
    
    <!-- Log Viewer Panel -->
    <div v-else-if="showLogViewer" class="article-manager-panel">
      <div class="panel-header">
        <button class="btn-back" @click="showLogViewer = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          返回导航
        </button>
      </div>
      <LogViewer />
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter, useData } from 'vitepress'
import { useSidebar } from 'vitepress/theme'
import TreeNode from './TreeNode.vue'
import ArticleManager from './agent/ArticleManager.vue'
import LogViewer from './agent/LogViewer.vue'
import AgentDashboard from './agent/AgentDashboard.vue'

const route = useRoute()
const router = useRouter()
const { sidebar } = useSidebar()

const STORAGE_KEY = 'sidebar-expanded-ids-v4'
const ALL_COLLAPSED_KEY = 'sidebar-all-collapsed'
const expandedIds = ref<Set<string>>(new Set())
const searchKey = ref('')
const treeRef = ref<HTMLElement | null>(null)
const showArticleManager = ref(false)
const showLogViewer = ref(false)
const showDashboard = ref(false)

const sidebarData = computed(() => sidebar.value || [])

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

const toggleDashboard = () => {
  showDashboard.value = !showDashboard.value
  if (showDashboard.value) {
    showArticleManager.value = false
    showLogViewer.value = false
  }
}

const toggleArticleManager = () => {
  showArticleManager.value = !showArticleManager.value
  if (showArticleManager.value) {
    showDashboard.value = false
    showLogViewer.value = false
  }
}

const toggleLogViewer = () => {
  showLogViewer.value = !showLogViewer.value
  if (showLogViewer.value) {
    showDashboard.value = false
    showArticleManager.value = false
  }
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
    autoExpandCurrentPath()
  }
  
  // Auto locate current on mount（延迟执行，确保 DOM 更新）
  nextTick(() => {
    locateCurrent()
  })
})

watch(() => route.path, () => {
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

/* Agent Actions */
.sidebar-agent-actions {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
  background: var(--vp-c-bg, #ffffff);
  flex-shrink: 0;
}

.agent-action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider, #e8e8e8);
  border-radius: 8px;
  background: var(--vp-c-bg-soft, #f5f5f5);
  color: var(--vp-c-text-1, #262626);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.agent-action-btn:hover {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
  border-color: var(--vp-c-brand, #1677ff);
}

.agent-action-btn.active {
  background: var(--vp-c-brand, #1677ff);
  color: white;
  border-color: var(--vp-c-brand, #1677ff);
}

.action-icon {
  font-size: 16px;
}

.action-label {
  flex: 1;
}

/* Article Manager Panel */
.article-manager-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 12px;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
  background: var(--vp-c-bg, #ffffff);
  flex-shrink: 0;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2, #595959);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: var(--vp-c-bg-soft, #f5f5f5);
  color: var(--vp-c-text-1, #262626);
}

.btn-back svg {
  width: 14px;
  height: 14px;
}
</style>
