<template>
  <aside class="toc-sidebar">
    <div class="toc-wrapper">
      <!-- Header -->
      <div class="toc-header">
        <svg class="toc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="21" y1="10" x2="7" y2="10"/>
          <line x1="21" y1="6" x2="3" y2="6"/>
          <line x1="21" y1="14" x2="3" y2="14"/>
          <line x1="21" y1="18" x2="7" y2="18"/>
        </svg>
        <span class="toc-title">页面导航</span>
      </div>

      <!-- Navigation -->
      <nav v-if="localHeaders.length > 0" class="toc-nav" ref="navRef">
        <div 
          v-for="header in localHeaders" 
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h.01M15 12h.01M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z"/>
        </svg>
        <span>当前页面无目录</span>
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

// Use local copy of headers to ensure reactivity
const localHeaders = computed(() => props.headers || [])

const activeHash = ref('')
const navRef = ref<HTMLElement | null>(null)

// Flag to temporarily disable scrollspy during programmatic scroll
const isScrollingTo = ref(false)
let scrollTimeout: ReturnType<typeof setTimeout> | null = null

// Watch for header changes
watch(() => props.headers, (newHeaders) => {
  nextTick(() => {
    if (!isScrollingTo.value) {
      onScroll()
    }
  })
}, { immediate: true, deep: true })

// Smooth scroll with offset for fixed header
const scrollTo = (hash: string) => {
  const target = document.querySelector(decodeURIComponent(hash))
  if (target) {
    // Disable scrollspy during programmatic scroll
    isScrollingTo.value = true
    
    // Clear any existing timeout
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
    
    // Immediately set active hash
    activeHash.value = hash
    history.pushState(null, '', hash)
    
    // Re-enable scrollspy after scroll animation completes (smooth scroll ~300-500ms)
    scrollTimeout = setTimeout(() => {
      isScrollingTo.value = false
    }, 600)
    
    // Emit event for drawer close
    emit('item-click')
  }
}

// Scrollspy
const onScroll = () => {
  // Skip if we're in the middle of a programmatic scroll
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

// Calculate indentation based on header level
const getItemStyle = (header: Header) => {
  const basePadding = 12
  const levelIndent = (header.level - 2) * 12
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
  background: var(--vp-c-bg-alt, #fafafa);
}

.toc-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 0;
}

/* Header */
.toc-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 12px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
}

.toc-icon {
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-3, #8c8c8c);
}

.toc-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
}

/* Navigation */
.toc-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px;
}

.toc-item {
  position: relative;
  margin: 1px 0;
}

.toc-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  border-radius: 0 2px 2px 0;
  transition: background-color 200ms ease, border-color 200ms ease;
}

.toc-item.is-active::before {
  background: var(--vp-c-brand-1, #1677ff);
}

.toc-item a {
  display: block;
  padding: 5px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2, #595959);
  text-decoration: none;
  border-radius: 4px;
  transition: color 200ms ease, background-color 200ms ease;
  
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 3em;
}

.toc-item a:hover {
  color: var(--vp-c-text-1, #262626);
  background: var(--vp-c-bg-soft, #f0f0f0);
}

.toc-item.is-active a {
  color: var(--vp-c-brand-1, #1677ff);
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
  font-weight: 500;
}

/* Level styling */
.toc-item.is-level-2 > a {
  font-weight: 500;
  color: var(--vp-c-text-1, #262626);
}

.toc-item.is-level-3 > a {
  font-size: 12px;
}

.toc-item.is-level-4 > a,
.toc-item.is-level-5 > a,
.toc-item.is-level-6 > a {
  font-size: 12px;
  color: var(--vp-c-text-3, #8c8c8c);
}

/* Empty State */
.toc-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--vp-c-text-3, #8c8c8c);
  gap: 8px;
}

.toc-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

.toc-empty span {
  font-size: 13px;
}

/* Custom Scrollbar */
.toc-nav::-webkit-scrollbar {
  width: 4px;
}

.toc-nav::-webkit-scrollbar-track {
  background: transparent;
}

.toc-nav::-webkit-scrollbar-thumb {
  background: var(--vp-c-divider, #d9d9d9);
  border-radius: 2px;
}

.toc-nav::-webkit-scrollbar-thumb:hover {
  background: var(--vp-c-text-3, #bfbfbf);
}
</style>
