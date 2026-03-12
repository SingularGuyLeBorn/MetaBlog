<template>
  <aside class="toc-sidebar">
    <div class="toc-wrapper">
      <!-- Header -->
      <div class="toc-header">
        <span class="header-icon">◈</span>
        <span class="header-title">目录</span>
      </div>

      <!-- Navigation -->
      <nav v-if="localHeaders.length > 0" class="toc-nav" ref="navRef">
        <div 
          v-for="(header, index) in localHeaders" 
          :key="header.slug"
          class="toc-item"
          :class="{ 
            'is-active': activeHash === '#' + header.slug,
            [`is-level-${header.level}`]: true
          }"
          :style="getItemStyle(header)"
        >
          <a 
            :href="'#' + header.slug" 
            :title="header.title"
            @click.prevent="scrollTo('#' + header.slug)"
          >
            {{ header.title }}
          </a>
        </div>
      </nav>

      <!-- Empty State -->
      <div v-else class="toc-empty">
        <span class="empty-icon">◉</span>
        <span>暂无目录</span>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'

interface Header {
  level: number
  title: string
  slug: string
}

const props = defineProps<{
  headers?: Header[]
}>()

const emit = defineEmits(['item-click'])

const localHeaders = computed(() => props.headers || [])
const activeHash = ref('')
const navRef = ref<HTMLElement | null>(null)
const isScrollingTo = ref(false)
let scrollTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.headers, (newHeaders) => {
  nextTick(() => {
    if (!isScrollingTo.value) {
      onScroll()
    }
  })
}, { immediate: true, deep: true })

const scrollTo = (hash: string) => {
  const target = document.querySelector(decodeURIComponent(hash))
  if (target) {
    isScrollingTo.value = true
    
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    
    const headerOffset = 80
    const elementPosition = target.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
    
    activeHash.value = hash
    history.pushState(null, '', hash)
    
    scrollTimeout = setTimeout(() => {
      isScrollingTo.value = false
    }, 600)
    
    emit('item-click')
  }
}

const onScroll = () => {
  if (isScrollingTo.value) return
  if (localHeaders.value.length === 0) return
  
  const scrollY = window.scrollY
  const offset = 100
  
  let currentHash = ''
  for (const header of localHeaders.value) {
    const el = document.querySelector(decodeURIComponent('#' + header.slug))
    if (el) {
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY - offset
      if (top <= scrollY) {
        currentHash = '#' + header.slug
      }
    }
  }
  
  if (currentHash && currentHash !== activeHash.value) {
    activeHash.value = currentHash
  }
}

const getItemStyle = (header: Header) => {
  const basePadding = 12
  const levelIndent = (header.level - 2) * 10
  return {
    paddingLeft: (basePadding + levelIndent) + 'px'
  }
}

let rafId: number | null = null
const throttledScroll = () => {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    onScroll()
    rafId = null
  })
}

onMounted(() => {
  window.addEventListener('scroll', throttledScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', throttledScroll)
  if (rafId) cancelAnimationFrame(rafId)
  if (scrollTimeout) clearTimeout(scrollTimeout)
})
</script>

<style scoped>
.toc-sidebar {
  height: 100%;
  background: transparent;
}

.toc-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 0;
}

/* Header - Minimalist */
.toc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--sr-glass-border);
}

.header-icon {
  font-size: 12px;
  color: var(--sr-morandi-purple);
  opacity: 0.8;
}

.header-title {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--sr-text-muted);
  text-transform: uppercase;
}

/* Navigation */
.toc-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 12px;
}

.toc-item {
  position: relative;
  margin: 2px 0;
  border-radius: var(--sr-radius-sm);
  transition: background 0.2s ease;
}

.toc-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 0;
  background: var(--sr-morandi-purple);
  border-radius: 0 2px 2px 0;
  transition: height 0.2s var(--sr-spring-bounce);
}

.toc-item.is-active::before {
  height: 60%;
}

.toc-item a {
  display: block;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--sr-text-muted);
  text-decoration: none;
  border-radius: var(--sr-radius-sm);
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-item a:hover {
  color: var(--sr-text-secondary);
  background: var(--sr-glass-bg);
}

.toc-item.is-active a {
  color: var(--sr-text-primary);
  background: var(--sr-glass-bg-hover);
  font-weight: 500;
}

/* Level styling */
.toc-item.is-level-2 > a {
  font-weight: 500;
  color: var(--sr-text-secondary);
}

.toc-item.is-level-3 > a {
  font-size: 11px;
}

.toc-item.is-level-4 > a,
.toc-item.is-level-5 > a,
.toc-item.is-level-6 > a {
  font-size: 11px;
  color: var(--sr-text-tertiary);
}

/* Empty State */
.toc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--sr-text-muted);
  gap: 12px;
}

.empty-icon {
  font-size: 28px;
  opacity: 0.4;
}

/* Custom Scrollbar */
.toc-nav::-webkit-scrollbar {
  width: 4px;
}

.toc-nav::-webkit-scrollbar-track {
  background: transparent;
}

.toc-nav::-webkit-scrollbar-thumb {
  background: var(--sr-glass-border);
  border-radius: 2px;
}

.toc-nav::-webkit-scrollbar-thumb:hover {
  background: var(--sr-glass-border-strong);
}
</style>
