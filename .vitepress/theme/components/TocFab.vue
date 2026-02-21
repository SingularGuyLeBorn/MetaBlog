<template>
  <div class="toc-fab-container">
    <!-- Floating Action Button for Tablet/Mobile -->
    <button
      v-if="showFab"
      class="toc-fab"
      :class="{ 'is-active': isDrawerOpen }"
      @click="toggleDrawer"
      aria-label="打开页面导航"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="21" y1="10" x2="7" y2="10"/>
        <line x1="21" y1="6" x2="3" y2="6"/>
        <line x1="21" y1="14" x2="3" y2="14"/>
        <line x1="21" y1="18" x2="7" y2="18"/>
      </svg>
    </button>

    <!-- Mobile/Tablet Drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isDrawerOpen" class="toc-drawer-overlay" @click="closeDrawer">
          <div class="toc-drawer" @click.stop>
            <div class="toc-drawer-header">
              <span class="toc-drawer-title">页面导航</span>
              <button class="toc-drawer-close" @click="closeDrawer" aria-label="关闭">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6 6 18"/>
                  <path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
            <div class="toc-drawer-content">
              <TocSidebar :headers="headers" @item-click="closeDrawer" />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import TocSidebar from './TocSidebar.vue'

interface Header {
  level: number
  title: string
  slug: string
}

const props = defineProps<{
  headers: Header[]
}>()

const showFab = ref(false)
const isDrawerOpen = ref(false)
let mediaQuery: MediaQueryList | null = null

const checkBreakpoint = () => {
  // Show FAB when screen is between 768px and 1280px (tablet) or below 768px (mobile)
  showFab.value = window.innerWidth <= 1280
}

const toggleDrawer = () => {
  isDrawerOpen.value = !isDrawerOpen.value
  // Prevent body scroll when drawer is open
  document.body.style.overflow = isDrawerOpen.value ? 'hidden' : ''
}

const closeDrawer = () => {
  isDrawerOpen.value = false
  document.body.style.overflow = ''
}

// Handle keyboard events
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isDrawerOpen.value) {
    closeDrawer()
  }
}

onMounted(() => {
  checkBreakpoint()
  window.addEventListener('resize', checkBreakpoint)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkBreakpoint)
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Floating Action Button */
.toc-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--vp-c-brand, #1677ff);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 200ms ease, box-shadow 200ms ease, background-color 200ms ease;
  z-index: 150;
}

.toc-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  background: var(--vp-c-brand-light, #4096ff);
}

.toc-fab.is-active {
  transform: rotate(90deg);
}

.toc-fab svg {
  width: 20px;
  height: 20px;
}

/* Drawer Overlay */
.toc-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  justify-content: flex-end;
}

/* Drawer Panel */
.toc-drawer {
  width: min(320px, 85vw);
  height: 100%;
  background: var(--vp-c-bg, #ffffff);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.toc-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
}

.toc-drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
}

.toc-drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2, #595959);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 200ms ease;
}

.toc-drawer-close:hover {
  background: var(--vp-c-bg-soft, #f5f5f5);
  color: var(--vp-c-text-1, #262626);
}

.toc-drawer-close svg {
  width: 18px;
  height: 18px;
}

.toc-drawer-content {
  flex: 1;
  overflow: hidden;
}

/* Drawer Transition */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 200ms ease;
}

.drawer-enter-active .toc-drawer,
.drawer-leave-active .toc-drawer {
  transition: transform 200ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .toc-drawer,
.drawer-leave-to .toc-drawer {
  transform: translateX(100%);
}

/* For mobile: bottom sheet style */
@media (max-width: 768px) {
  .toc-drawer-overlay {
    align-items: flex-end;
  }
  
  .toc-drawer {
    width: 100%;
    height: 70vh;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
  }
  
  .drawer-enter-from .toc-drawer,
  .drawer-leave-to .toc-drawer {
    transform: translateY(100%);
  }
}
</style>
