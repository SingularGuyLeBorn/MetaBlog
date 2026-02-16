<script setup lang="ts">
import { ref, onMounted, computed, watch, provide, nextTick } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData, useRoute } from 'vitepress'
import GlobalSidebar from './components/GlobalSidebar.vue'
import TocSidebar from './components/TocSidebar.vue'
import TocFab from './components/TocFab.vue'
import EditFab from './components/EditFab.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import { useAppStore } from './stores/app'

const { Layout } = DefaultTheme
const { frontmatter, page } = useData()
const store = useAppStore()
const route = useRoute()

// Agent refs
const aiChatOrb = ref()

// Panel widths configuration
const LEFT_CONFIG = {
  minWidth: 240,
  maxWidth: 400,
  defaultWidth: 280,
  storageKey: 'metablog-sidebar-width'
}

const RIGHT_CONFIG = {
  minWidth: 200,
  maxWidth: 320,
  defaultWidth: 260,
  storageKey: 'metablog-toc-width'
}

const leftWidth = ref(LEFT_CONFIG.defaultWidth)
const rightWidth = ref(RIGHT_CONFIG.defaultWidth)

// Resizing state
const isResizingLeft = ref(false)
const isResizingRight = ref(false)
const startX = ref(0)
const startLeftWidth = ref(0)
const startRightWidth = ref(0)

// Check if current page should show sidebars
const showLeftSidebar = computed(() => {
  // Show on all pages except home
  return route.path !== '/' && !route.path.match(/^\/?$/)
})

// FIX: Properly check for headers to show TOC
// Use both server-provided headers and client-side detection
const clientHeaders = ref<any[]>([])

const showRightSidebar = computed(() => {
  // Check server-provided headers first
  const serverHeaders = page.value.headers || []
  // Also check client-detected headers
  const hasClientHeaders = clientHeaders.value.length > 0
  return serverHeaders.length > 0 || hasClientHeaders
})

// Provide merged headers to TocSidebar
const mergedHeaders = computed(() => {
  const serverHeaders = page.value.headers || []
  // Prefer server headers, fallback to client headers
  return serverHeaders.length > 0 ? serverHeaders : clientHeaders.value
})
provide('pageHeaders', mergedHeaders)

// Detect headers from DOM on client side
const detectHeadersFromDOM = () => {
  if (typeof document === 'undefined') return
  
  const headers: any[] = []
  const headerElements = document.querySelectorAll('.vp-doc h2, .vp-doc h3, .vp-doc h4')
  
  headerElements.forEach((el, index) => {
    const level = parseInt(el.tagName[1]) // h2 -> 2, h3 -> 3, etc.
    const title = el.textContent?.replace(/#$/, '').trim() || ''
    const slug = el.id || `heading-${index}`
    
    if (title && level >= 2 && level <= 4) {
      headers.push({ level, title, slug })
    }
  })
  
  clientHeaders.value = headers
}

// Start resizing handlers
const startResizeLeft = (e: MouseEvent) => {
  isResizingLeft.value = true
  startX.value = e.clientX
  startLeftWidth.value = leftWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.body.classList.add('is-dragging')
}

const startResizeRight = (e: MouseEvent) => {
  isResizingRight.value = true
  startX.value = e.clientX
  startRightWidth.value = rightWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.body.classList.add('is-dragging')
}

// Mouse move handler
const handleMouseMove = (e: MouseEvent) => {
  if (!isResizingLeft.value && !isResizingRight.value) return
  
  const deltaX = e.clientX - startX.value
  
  if (isResizingLeft.value) {
    const newWidth = Math.max(LEFT_CONFIG.minWidth, Math.min(LEFT_CONFIG.maxWidth, startLeftWidth.value + deltaX))
    leftWidth.value = newWidth
  }
  
  if (isResizingRight.value) {
    const newWidth = Math.max(RIGHT_CONFIG.minWidth, Math.min(RIGHT_CONFIG.maxWidth, startRightWidth.value - deltaX))
    rightWidth.value = newWidth
  }
}

// Stop resizing
const stopResize = () => {
  if (isResizingLeft.value || isResizingRight.value) {
    isResizingLeft.value = false
    isResizingRight.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.body.classList.remove('is-dragging')
    
    // Save to localStorage
    localStorage.setItem(LEFT_CONFIG.storageKey, leftWidth.value.toString())
    localStorage.setItem(RIGHT_CONFIG.storageKey, rightWidth.value.toString())
  }
}

// Load saved widths
onMounted(() => {
  const savedLeft = localStorage.getItem(LEFT_CONFIG.storageKey)
  const savedRight = localStorage.getItem(RIGHT_CONFIG.storageKey)
  
  if (savedLeft) {
    const width = parseInt(savedLeft, 10)
    if (width >= LEFT_CONFIG.minWidth && width <= LEFT_CONFIG.maxWidth) {
      leftWidth.value = width
    }
  }
  
  if (savedRight) {
    const width = parseInt(savedRight, 10)
    if (width >= RIGHT_CONFIG.minWidth && width <= RIGHT_CONFIG.maxWidth) {
      rightWidth.value = width
    }
  }
  
  // Add global event listeners
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  
  // Detect headers from DOM after initial render
  nextTick(() => {
    detectHeadersFromDOM()
  })
})

// Watch for route changes to update sidebar visibility and re-detect headers
watch(() => route.path, () => {
  // Reset client headers on route change
  clientHeaders.value = []
  // Re-detect after DOM updates
  nextTick(() => {
    detectHeadersFromDOM()
  })
})
</script>

<template>
  <div class="metablog-layout" :class="{ 
    'is-editing': store.isEditorOpen,
    'has-left-sidebar': showLeftSidebar,
    'has-right-sidebar': showRightSidebar,
    'is-resizing-left': isResizingLeft,
    'is-resizing-right': isResizingRight
  }">
    <!-- Custom Three-Column Layout -->
    <div class="layout-container">
      <!-- Left Sidebar -->
      <aside 
        v-if="showLeftSidebar"
        class="sidebar-left"
        :style="{ width: leftWidth + 'px', minWidth: leftWidth + 'px' }"
      >
        <GlobalSidebar />
      </aside>

      <!-- Left Resizer -->
      <div 
        v-if="showLeftSidebar"
        class="resizer left-resizer"
        @mousedown.prevent="startResizeLeft"
      >
        <div class="resizer-handle" />
      </div>

      <!-- Main Content Area -->
      <main class="main-content">
        <Layout>
          <template #doc-before>
            <Breadcrumb />
          </template>
          
          <template #doc-after>
            <!-- Empty slot to override default -->
          </template>
          
          <!-- Pass through other slots -->
          <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
          </template>
        </Layout>
      </main>

      <!-- Right Resizer -->
      <div 
        v-if="showRightSidebar"
        class="resizer right-resizer"
        @mousedown.prevent="startResizeRight"
      >
        <div class="resizer-handle" />
      </div>

      <!-- Right Sidebar (TOC) - Desktop only -->
      <aside 
        v-if="showRightSidebar"
        class="sidebar-right"
        :style="{ width: rightWidth + 'px', minWidth: rightWidth + 'px' }"
      >
        <TocSidebar :headers="mergedHeaders" />
      </aside>
    </div>

    <!-- FAB for Tablet/Mobile TOC -->
    <TocFab 
      v-if="showRightSidebar" 
      :headers="mergedHeaders" 
    />
    
    <!-- Edit FAB -->
    <EditFab />
    
    <!-- AI Chat Orb (Global Agent Interface) -->
    <AIChatOrb ref="aiChatOrb" />
  </div>
</template>

<style>
/* Reset VitePress default layout constraints */
.metablog-layout {
  --vp-layout-max-width: 100%;
  --vp-sidebar-width: 0;
  --vp-aside-width: 0;
}

/* Main layout container - FULL WIDTH */
.layout-container {
  display: flex;
  width: 100%;
  min-height: calc(100vh - var(--vp-nav-height, 64px));
  padding-top: var(--vp-nav-height, 64px);
}

/* Left Sidebar - fixed width */
.sidebar-left {
  position: fixed;
  left: 0;
  top: var(--vp-nav-height, 64px);
  height: calc(100vh - var(--vp-nav-height, 64px));
  overflow: hidden;
  background: var(--vp-c-bg-alt, #fafafa);
  border-right: 1px solid var(--vp-c-divider, #e8e8e8);
  z-index: 100;
}

/* Right Sidebar - fixed width */
.sidebar-right {
  position: fixed;
  right: 0;
  top: var(--vp-nav-height, 64px);
  height: calc(100vh - var(--vp-nav-height, 64px));
  overflow: hidden;
  background: var(--vp-c-bg-alt, #fafafa);
  border-left: 1px solid var(--vp-c-divider, #e8e8e8);
  z-index: 100;
}

/* Main Content - takes remaining space with proper margins */
.main-content {
  flex: 1;
  margin-left: v-bind('showLeftSidebar ? leftWidth + "px" : "0"');
  margin-right: v-bind('showRightSidebar ? rightWidth + "px" : "0"');
  min-width: 0;
  background: var(--vp-c-bg, #ffffff);
  transition: margin-left 200ms ease, margin-right 200ms ease;
}

/* Resizers */
.resizer {
  position: fixed;
  top: var(--vp-nav-height, 64px);
  height: calc(100vh - var(--vp-nav-height, 64px));
  width: 4px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 101;
  transition: background 0.2s;
}

.left-resizer {
  left: v-bind('leftWidth + "px"');
}

.right-resizer {
  right: v-bind('rightWidth + "px"');
}

.resizer:hover,
.metablog-layout.is-resizing-left .left-resizer,
.metablog-layout.is-resizing-right .right-resizer {
  background: var(--vp-c-brand, #1677ff);
}

.resizer-handle {
  width: 2px;
  height: 48px;
  background: var(--vp-c-divider, #d9d9d9);
  border-radius: 1px;
  transition: background-color 200ms ease;
}

.resizer:hover .resizer-handle,
.metablog-layout.is-resizing-left .left-resizer .resizer-handle,
.metablog-layout.is-resizing-right .right-resizer .resizer-handle {
  background: var(--vp-c-brand, #1677ff);
}

/* Override VitePress default layout styles - REDUCE PADDING */
.metablog-layout .VPContent {
  padding: 0 !important;
}

.metablog-layout .VPDoc {
  padding: 0 !important;
  margin: 0 !important;
  width: 100% !important;
  max-width: none !important;
}

.metablog-layout .VPDoc .container {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}

/* MAIN CONTENT PADDING - DYNAMIC WIDTH BASED ON VIEWPORT */
.metablog-layout .VPDoc .content-container {
  max-width: none !important;
  width: 100% !important;
}

.metablog-layout .VPDoc .main {
  /* Dynamic width: use almost full available space */
  width: 100% !important;
  max-width: none !important;
  padding: 16px 24px !important;
  margin: 0 !important;
  float: none !important;
  box-sizing: border-box !important;
}

/* Hide VitePress default aside - we use our own */
.metablog-layout .VPDoc .aside {
  display: none !important;
}

/* Hide VitePress default sidebar */
.metablog-layout .VPSidebar {
  display: none !important;
}

/* Ensure navbar stays on top */
.metablog-layout .VPNav {
  z-index: 200;
}

/* Inline Editing Mode */
body.inline-editing {
  /* Layout adjustments for inline editor */
}

body.inline-editing .VPNav {
  z-index: 1000;
}

/* Responsive Design */
@media (max-width: 1280px) {
  .sidebar-left {
    transform: translateX(-100%);
    transition: transform 200ms ease;
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.1);
  }
  
  .metablog-layout.has-left-sidebar .sidebar-left {
    transform: translateX(0);
  }
  
  .resizer,
  .sidebar-right {
    display: none !important;
  }
  
  .main-content {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
}

/* Desktop optimization */
@media (min-width: 1280px) {
  .toc-fab-container {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .metablog-layout .VPDoc .main {
    padding: 12px 16px !important;
  }
  
  /* Ensure content doesn't overflow on mobile */
  .main-content {
    min-width: 0;
    overflow-x: hidden;
  }
}
</style>
