<template>
  <div class="control-center">
    <!-- Control Center Button -->
    <button 
      class="control-btn"
      :class="{ 'is-open': isOpen }"
      @click="toggle"
      title="控制中心"
    >
      <span class="control-icon">🎛️</span>
      <span class="control-label">控制中心</span>
      <svg class="control-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div v-if="isOpen" class="control-dropdown-overlay" @click="close">
          <div class="control-dropdown" @click.stop>
            <div class="dropdown-header">
              <span class="header-icon">🎛️</span>
              <span class="header-title">控制中心</span>
            </div>
            
            <div class="dropdown-content">
              <!-- Agent Panel -->
              <button class="menu-item" @click="openPanel('dashboard')">
                <span class="item-icon">🤖</span>
                <div class="item-info">
                  <span class="item-title">Agent 面板</span>
                  <span class="item-desc">AI 助手与自动化任务</span>
                </div>
              </button>

              <!-- Article Manager -->
              <button class="menu-item" @click="openPanel('articles')">
                <span class="item-icon">📝</span>
                <div class="item-info">
                  <span class="item-title">文章管理</span>
                  <span class="item-desc">管理、创建和编辑文章</span>
                </div>
              </button>

              <!-- Log Viewer -->
              <button class="menu-item" @click="openPanel('logs')">
                <span class="item-icon">📋</span>
                <div class="item-info">
                  <span class="item-title">日志查看</span>
                  <span class="item-desc">系统日志与操作记录</span>
                </div>
              </button>
            </div>

            <div class="dropdown-footer">
              <span class="footer-hint">点击展开相应面板</span>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{
  open: [panel: 'dashboard' | 'articles' | 'logs']
}>()

const isOpen = ref(false)

const toggle = () => {
  isOpen.value = !isOpen.value
}

const close = () => {
  isOpen.value = false
}

const openPanel = (panel: 'dashboard' | 'articles' | 'logs') => {
  emit('open', panel)
  close()
}

// Close on escape key
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.control-center {
  position: relative;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider, #e8e8e8);
  border-radius: 8px;
  background: var(--vp-c-bg, #ffffff);
  color: var(--vp-c-text-1, #262626);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
  border-color: var(--vp-c-brand, #1677ff);
}

.control-btn.is-open {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
  border-color: var(--vp-c-brand, #1677ff);
  color: var(--vp-c-brand, #1677ff);
}

.control-icon {
  font-size: 16px;
}

.control-label {
  display: none;
}

@media (min-width: 768px) {
  .control-label {
    display: inline;
  }
}

.control-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.control-btn.is-open .control-arrow {
  transform: rotate(180deg);
}

/* Dropdown Overlay */
.control-dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

/* Dropdown Panel */
.control-dropdown {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 8px);
  right: 16px;
  width: 280px;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, #e8e8e8);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 9999;
}

@media (min-width: 768px) {
  .control-dropdown {
    right: 24px;
  }
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
  background: var(--vp-c-bg-soft, #f5f5f5);
}

.header-icon {
  font-size: 20px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
}

.dropdown-content {
  padding: 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;
  text-align: left;
}

.menu-item:hover {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
}

.item-icon {
  font-size: 22px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft, #f5f5f5);
  border-radius: 8px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1, #262626);
}

.item-desc {
  font-size: 12px;
  color: var(--vp-c-text-3, #8c8c8c);
}

.dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider, #e8e8e8);
  background: var(--vp-c-bg-soft, #f5f5f5);
  text-align: center;
}

.footer-hint {
  font-size: 12px;
  color: var(--vp-c-text-3, #8c8c8c);
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dropdown-enter-from .control-dropdown,
.dropdown-leave-to .control-dropdown {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
