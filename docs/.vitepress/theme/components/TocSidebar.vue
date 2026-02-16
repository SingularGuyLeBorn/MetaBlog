<template>
  <aside class="toc-sidebar">
    <div class="toc-content">
      <div v-if="headers.length > 0" class="toc-header">目录</div>
      <nav v-if="headers.length > 0" class="toc-nav">
        <ul>
          <li 
            v-for="header in headers" 
            :key="header.slug"
            :class="{ 'active': activeHash === '#' + header.slug }"
            class="toc-item"
            :style="{ paddingLeft: (header.level - 2) * 12 + 'px' }"
          >
            <a :href="'#' + header.slug" :title="header.title" @click.prevent="scrollTo('#' + header.slug)">
              {{ header.title }}
            </a>
          </li>
        </ul>
      </nav>
      <div v-else class="toc-empty">
        <span style="font-size: 13px; color: var(--vp-c-text-3);">当前页面无目录</span>
        <!-- Debug info -->
        <!-- <div style="font-size: 10px; margin-top: 10px; color: red;">Headers count: {{ headers.length }}</div> -->
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useData } from 'vitepress'
import { ref, watch, onMounted, onUnmounted } from 'vue'

const { page } = useData()
const headers = ref<any[]>([])
const activeHash = ref('')

// Update headers when page changes
watch(() => page.value.headers, (newHeaders) => {
  console.log('TocSidebar headers:', newHeaders)
  headers.value = newHeaders || []
}, { immediate: true })

// Smooth scroll
const scrollTo = (hash: string) => {
  const target = document.querySelector(decodeURIComponent(hash))
  if (target) {
    const offset = 80 // Header height + padding
    const top = target.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: 'smooth' })
    activeHash.value = hash
    history.pushState(null, '', hash)
  }
}

// Scrollspy
const onScroll = () => {
  const scrollY = window.scrollY
  const offset = 100
  
  // Find the last header that is above the current scroll position
  for (let i = headers.value.length - 1; i >= 0; i--) {
    const header = headers.value[i]
    const el = document.querySelector(decodeURIComponent('#' + header.slug))
    if (el && el.getBoundingClientRect().top + window.scrollY - offset <= scrollY) {
      activeHash.value = '#' + header.slug
      return
    }
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.toc-sidebar {
  width: 100%;
  height: 100%;
  padding: 1.5rem 1rem;
  overflow-y: auto;
}

.toc-header {
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--vp-c-text-1);
}

.toc-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  margin-bottom: 4px;
  line-height: 1.5;
}

.toc-item a {
  display: block;
  font-size: 13px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-left: 2px solid transparent;
  padding: 4px 12px;
  transition: all 0.2s;
  
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-item a:hover {
  color: var(--vp-c-text-1);
  background: rgba(0,0,0,0.02);
  border-radius: 0 4px 4px 0;
}

.toc-item.active a {
  color: var(--vp-c-brand);
  border-left-color: var(--vp-c-brand);
  background: rgba(var(--vp-c-brand-rgb), 0.05);
  font-weight: 500;
  padding-left: 12px; /* Keep strict alignment */
  border-radius: 0 4px 4px 0;
}
</style>
