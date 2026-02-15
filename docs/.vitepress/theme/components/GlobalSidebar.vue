<template>
  <div class="global-sidebar">
    <!-- Search Box -->
    <div class="sidebar-search">
      <input 
        v-model="searchKey" 
        placeholder="搜索知识库..." 
        class="search-input"
        type="text"
      />
    </div>

    <!-- Tree Navigation -->
    <div class="nav-tree">
      <div 
        v-for="(item, index) in filteredSidebar" 
        :key="item.link || item.text"
        class="nav-section"
        :class="{ 'is-active': isActivePath(item.link) }"
      >
        <!-- Section Header (Level 0) -->
        <div 
          class="section-header"
          @click="toggleSection(index)"
        >
          <span class="toggle-icon">{{ isExpanded(index) ? '▼' : '▶' }}</span>
          <a 
            :href="item.link" 
            class="section-title"
            @click.stop="navigate(item.link)"
          >
            {{ item.text }}
          </a>
        </div>

        <!-- Recursive Children -->
        <TreeNode
          v-if="isExpanded(index) && item.items"
          :items="item.items"
          :level="1"
          :active-path="route.path"
          @navigate="navigate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, useData } from 'vitepress'
import { useSidebar } from 'vitepress/theme'
import TreeNode from './TreeNode.vue'

const route = useRoute()
const router = useRouter()
const { sidebar } = useSidebar()

// Persistence logic
const STORAGE_KEY = 'sidebar-expanded-sections'
const expandedSections = ref(new Set<number>())
const searchKey = ref('')

const sidebarData = computed(() => {
    return sidebar.value || []
})

const isExpanded = (index: number | string) => expandedSections.value.has(Number(index))

const toggleSection = (index: number | string) => {
  const idx = Number(index)
  if (expandedSections.value.has(idx)) {
    expandedSections.value.delete(idx)
  } else {
    expandedSections.value.add(idx)
  }
  saveState()
}

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedSections.value]))
}

const isActivePath = (link?: string) => {
  if (!link) return false
  return route.path === link || route.path.startsWith(link)
}

const navigate = (link?: string) => {
  if (link) router.go(link)
}

const autoExpand = () => {
    sidebarData.value.forEach((section: any, idx: number) => {
        if (isActivePath(section.link)) {
            expandedSections.value.add(idx)
        }
    })
}

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
        expandedSections.value = new Set(JSON.parse(saved))
    } catch(e) {
        expandedSections.value = new Set([0]) // Fallback to expanding knowledge
    }
  } else {
    expandedSections.value.add(0)
  }
  autoExpand()
})

watch(() => route.path, autoExpand)

const filteredSidebar = computed(() => {
  if (!searchKey.value) return sidebarData.value
  
  const query = searchKey.value.toLowerCase()
  
  const filterNode = (node: any): any | null => {
    const textMatches = node.text.toLowerCase().includes(query)
    if (node.items) {
      const children = node.items.map(filterNode).filter(Boolean)
      if (children.length > 0 || textMatches) {
        return { ...node, items: children, collapsed: false }
      }
    }
    return textMatches ? node : null
  }
  
  return sidebarData.value.map(filterNode).filter(Boolean)
})
</script>

<style scoped>
.global-sidebar {
  padding: 1.5rem 1rem;
}

.sidebar-search {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
}

.search-input:focus {
  border-color: var(--vp-c-brand);
  outline: none;
}

.nav-section {
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.section-header:hover {
  background: var(--vp-c-bg-soft);
}

.is-active > .section-header {
  background: var(--vp-c-bg-soft);
}

.toggle-icon {
  font-size: 0.7rem;
  width: 16px;
  margin-right: 8px;
  color: var(--vp-c-text-3);
}

.section-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  flex: 1;
}

.section-title:hover {
  color: var(--vp-c-brand);
}

.is-active .section-title {
    color: var(--vp-c-brand);
}
</style>
