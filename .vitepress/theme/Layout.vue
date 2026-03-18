<script setup lang="ts">
import { ref, onMounted, computed, watch, provide, nextTick, defineAsyncComponent, onUnmounted } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData, useRoute, useRouter } from 'vitepress'
import GlobalSidebar from './components/layout/GlobalSidebar.vue'
import TocSidebar from './components/layout/TocSidebar.vue'
import TocFab from './components/layout/TocFab.vue'
import EditFab from './components/editor/EditFab.vue'
import Breadcrumb from './components/layout/Breadcrumb.vue'
import DocTitleBar from './components/ui/DocTitleBar.vue'
import StarRiverLayout from './components/StarRiverLayout.vue'

// 页面组件导入
import HomePage from './components/pages/HomePage.vue'
import AboutPage from './components/pages/AboutPage.vue'
import KnowledgePage from './components/pages/KnowledgePage.vue'
import PostsPage from './components/pages/PostsPage.vue'
import ResourcesPage from './components/pages/ResourcesPage.vue'
import ChatPage from './components/pages/ChatPage.vue'

import ControlCenter from './components/legacy/ControlCenter.vue'
import { AgentAdmin } from './components/ai-chat/modules/agent'
import LogDashboard from './components/ai-chat/modules/agent/admin/LogDashboard.vue'
import { useAppStore } from './stores/app'

const { Layout } = DefaultTheme
const { frontmatter, page } = useData()
const store = useAppStore()
const route = useRoute()
const router = useRouter()

// 路由拦截器：判断当前页面是否为需要纯 Vue 接管的全屏页面（仅列表页，不包括文章详情页）
const isPureVuePage = computed(() => {
  // 处理路径：移除 index.html 和 .html 后缀，然后标准化
  const p = route.path
    .replace(/\/index\.html$/, '/')
    .replace(/\.html$/, '')
    .replace(/\/$/, '') || '/'
  
  // 只匹配确切的列表页面，不匹配子页面（文章详情）
  if (p === '/' || p === '/index') return 'home'
  if (p === '/chat' || p.startsWith('/chat/')) return 'chat'
  if (p === '/sections/about' || p === '/sections/about/index') return 'about'
  if (p === '/sections/knowledge' || p === '/sections/knowledge/index') return 'knowledge'
  if (p === '/sections/posts' || p === '/sections/posts/index') return 'posts'
  if (p === '/sections/resources' || p === '/sections/resources/index') return 'resources'
  
  return false
})

// Control center panel state
const activePanel = ref<'dashboard' | 'articles' | 'logs' | null>(null)
const showAgentAdmin = ref(false)
const showLogDashboard = ref(false)

const handleControlOpen = (panel: 'dashboard' | 'articles' | 'logs') => {
  activePanel.value = panel
  
  // 打开 Agent 管理面板
  if (panel === 'dashboard') {
    showAgentAdmin.value = true
  } else if (panel === 'articles') {
    router.go('/sections/posts/')
  } else if (panel === 'logs') {
    showLogDashboard.value = true
  }
}

const handleAgentChange = (agent: any) => {
  console.log('Agent changed:', agent.name)
}

// Panel widths configuration
const LEFT_CONFIG = {
  minWidth: 260,
  maxWidth: 380,
  defaultWidth: 300,
  storageKey: 'metablog-sidebar-width'
}

const RIGHT_CONFIG = {
  minWidth: 220,
  maxWidth: 320,
  defaultWidth: 280,
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

// Check if current page should show sidebars (排除纯 Vue 页面)
const showLeftSidebar = computed(() => {
  // 纯 Vue 页面不显示侧边栏
  if (isPureVuePage.value) return false
  return route.path !== '/' && !route.path.match(/^\/?$/)
})

// FIX: Properly check for headers to show TOC
const clientHeaders = ref<any[]>([])

const showRightSidebar = computed(() => {
  // 编辑模式下不显示右侧大纲（编辑器有自己的内容结构）
  if (store.isEditing) return false
  const serverHeaders = page.value.headers || []
  const hasClientHeaders = clientHeaders.value.length > 0
  return serverHeaders.length > 0 || hasClientHeaders
})

// Provide merged headers to TocSidebar
const mergedHeaders = computed(() => {
  const serverHeaders = page.value.headers || []
  return serverHeaders.length > 0 ? serverHeaders : clientHeaders.value
})
provide('pageHeaders', mergedHeaders)

// Detect headers from DOM on client side
const detectHeadersFromDOM = () => {
  if (typeof document === 'undefined') return
  
  const headers: any[] = []
  const headerElements = document.querySelectorAll('.vp-doc h2, .vp-doc h3, .vp-doc h4')
  
  headerElements.forEach((el, index) => {
    const level = parseInt(el.tagName[1])
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
  document.body.classList.add('is-resizing')
}

const startResizeRight = (e: MouseEvent) => {
  isResizingRight.value = true
  startX.value = e.clientX
  startRightWidth.value = rightWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.body.classList.add('is-resizing')
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
    document.body.classList.remove('is-resizing')
    
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
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  
  nextTick(() => {
    detectHeadersFromDOM()
  })
})

// Watch for route changes
watch(() => route.path, () => {
  clientHeaders.value = []
  nextTick(() => {
    detectHeadersFromDOM()
  })
})

// Computed properties for v-bind in CSS
const leftMargin = computed(() => showLeftSidebar.value ? leftWidth.value + 'px' : '0')
const rightMargin = computed(() => showRightSidebar.value ? rightWidth.value + 'px' : '0')
const leftResizerPosition = computed(() => leftWidth.value + 'px')
const rightResizerPosition = computed(() => rightWidth.value + 'px')
</script>

<template>
  <StarRiverLayout>
    <div 
      class="metablog-layout" 
      :class="{ 
        'is-editing': store.isEditorOpen,
        'has-left-sidebar': showLeftSidebar && !isPureVuePage,
        'has-right-sidebar': showRightSidebar && !isPureVuePage,
        'is-resizing-left': isResizingLeft,
        'is-resizing-right': isResizingRight,
        'is-pure-vue-page': !!isPureVuePage
      }"
    >
      <!-- Three-Column Layout -->
      <div class="layout-container">
        <!-- Left Sidebar -->
        <aside 
          v-if="showLeftSidebar && !isPureVuePage"
          class="sidebar-left glass-panel"
          :style="{ width: leftWidth + 'px', minWidth: leftWidth + 'px' }"
        >
          <GlobalSidebar />
        </aside>

        <!-- Left Resizer -->
        <div 
          v-if="showLeftSidebar && !isPureVuePage"
          class="resizer left-resizer"
          @mousedown.prevent="startResizeLeft"
        >
          <div class="resizer-handle" />
        </div>

        <!-- Main Content Area -->
        <main class="main-content">
          <Layout :key="route.path">
            <!-- 导航栏增强 -->
            <template #nav-bar-content-after>
              <ControlCenter @open="handleControlOpen" />
            </template>
            
            <!-- 页面布局插槽 (layout: page) -->
            <template #page-top v-if="isPureVuePage">
              <!-- 纯 Vue 页面不需要额外装饰 -->
            </template>
            
            <!-- 文档布局插槽 (默认 layout: doc) -->
            <template #doc-before v-if="!isPureVuePage">
              <Breadcrumb />
              <DocTitleBar />
            </template>
            
            <template #doc-after>
              <!-- Empty slot to override default -->
            </template>
            
            <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
              <slot :name="name" v-bind="slotData || {}" />
            </template>
          </Layout>
        </main>

        <!-- Right Resizer -->
        <div 
          v-if="showRightSidebar && !isPureVuePage"
          class="resizer right-resizer"
          @mousedown.prevent="startResizeRight"
        >
          <div class="resizer-handle" />
        </div>

        <!-- Right Sidebar (TOC) -->
        <aside 
          v-if="showRightSidebar && !isPureVuePage"
          class="sidebar-right glass-panel"
          :style="{ width: rightWidth + 'px', minWidth: rightWidth + 'px' }"
        >
          <TocSidebar :headers="mergedHeaders" />
        </aside>
      </div>

      <!-- FABs -->
      <TocFab v-if="showRightSidebar && !isPureVuePage" :headers="mergedHeaders" />
      <EditFab />
      
      <!-- Panels -->
      <AgentAdmin 
        v-model:visible="showAgentAdmin"
        @agent-change="handleAgentChange"
      />
      <LogDashboard
        v-model:visible="showLogDashboard"
        @close="showLogDashboard = false"
      />
    </div>
  </StarRiverLayout>
</template>

<style>
/* 即使在纯 Vue 页面也要展示导航栏 */
.is-pure-vue-page .VPNav {
  display: block !important;
  z-index: 1000;
}

/* 确保主内容区域在纯 Vue 页面时不被侧边栏挤压 */
.is-pure-vue-page .main-content {
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding: 0 !important;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Star River Layout Styles
   ═══════════════════════════════════════════════════════════════════════════ */

.metablog-layout {
  --vp-layout-max-width: 100%;
  --vp-sidebar-width: 0;
  --vp-aside-width: 0;
  --vp-nav-height: 64px;
}

.layout-container {
  display: flex;
  width: 100%;
  min-height: calc(100vh - var(--vp-nav-height));
  padding-top: var(--vp-nav-height);
}

/* Left Sidebar - Glass Panel */
.sidebar-left {
  position: fixed;
  left: 0;
  top: var(--vp-nav-height);
  height: calc(100vh - var(--vp-nav-height));
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 100;
  border-right: 1px solid var(--sr-glass-border);
  border-radius: 0 !important;
}

/* Right Sidebar - Glass Panel */
.sidebar-right {
  position: fixed;
  right: 0;
  top: var(--vp-nav-height);
  height: calc(100vh - var(--vp-nav-height));
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 100;
  border-left: 1px solid var(--sr-glass-border);
  border-radius: 0 !important;
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: v-bind(leftMargin);
  margin-right: v-bind(rightMargin);
  min-width: 0;
  transition: margin-left 0.3s var(--sr-spring-gentle), 
              margin-right 0.3s var(--sr-spring-gentle);
}

/* Resizers */
.resizer {
  position: fixed;
  top: var(--vp-nav-height);
  height: calc(100vh - var(--vp-nav-height));
  width: 6px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 101;
  transition: background 0.3s ease;
}

.left-resizer {
  left: v-bind(leftResizerPosition);
}

.right-resizer {
  right: v-bind(rightResizerPosition);
}

.resizer:hover,
.metablog-layout.is-resizing-left .left-resizer,
.metablog-layout.is-resizing-right .right-resizer {
  background: rgba(196, 184, 212, 0.1);
}

.resizer-handle {
  width: 2px;
  height: 48px;
  background: var(--sr-glass-border);
  border-radius: 1px;
  transition: all 0.3s var(--sr-spring-bounce);
}

.resizer:hover .resizer-handle,
.metablog-layout.is-resizing-left .left-resizer .resizer-handle,
.metablog-layout.is-resizing-right .right-resizer .resizer-handle {
  background: var(--sr-morandi-purple);
  height: 72px;
  box-shadow: 0 0 12px rgba(196, 184, 212, 0.4);
}

/* Override VitePress default layout */
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

.metablog-layout .VPDoc .main {
  width: 100% !important;
  max-width: none !important;
  padding: 24px 32px !important;
  margin: 0 !important;
  float: none !important;
  box-sizing: border-box !important;
}

.metablog-layout .VPDoc .aside {
  display: none !important;
}

.metablog-layout .VPSidebar {
  display: none !important;
}

.metablog-layout .VPNav {
  z-index: 200;
  background: rgba(12, 12, 20, 0.8) !important;
  backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid var(--sr-glass-border) !important;
}

/* Panel Action Buttons */
.panel-action-btn {
  padding: 10px 20px;
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-md);
  background: var(--sr-glass-bg);
  color: var(--sr-text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s var(--sr-spring-bounce);
}

.panel-action-btn:hover {
  background: var(--sr-glass-bg-hover);
  border-color: var(--sr-glass-border-strong);
  transform: translateY(-2px);
}

.panel-action-btn:active {
  transform: scale(0.98);
}

.panel-action-btn.primary {
  background: linear-gradient(135deg, 
    rgba(196, 184, 212, 0.3) 0%,
    rgba(184, 200, 212, 0.2) 100%
  );
  border-color: rgba(196, 184, 212, 0.4);
  color: var(--sr-text-primary);
}

/* Responsive */
@media (max-width: 1280px) {
  .sidebar-left {
    transform: translateX(-100%);
    transition: transform 0.3s var(--sr-spring-gentle);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
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

@media (max-width: 768px) {
  .metablog-layout .VPDoc .main {
    padding: 16px 20px !important;
  }
  
  .main-content {
    min-width: 0;
    overflow-x: hidden;
  }
}

/* Chat Layout */
.chat-layout-integrated {
  --vp-layout-max-width: 100%;
}

.chat-layout-integrated .layout-container {
  padding-top: 0;
  min-height: calc(100vh - var(--vp-nav-height));
}

.chat-layout-integrated .main-content {
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding: 0 !important;
}

.chat-main-content {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
</style>
