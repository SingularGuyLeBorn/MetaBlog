<template>
  <div class="control-center">
    <!-- Control Center Button — Star River neumorphic -->
    <button 
      class="control-btn"
      :class="{ 'is-open': isOpen }"
      @click="toggle"
      title="控制中心"
    >
      <span class="control-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="4" y="4" width="6" height="6" rx="1"/>
          <rect x="14" y="4" width="6" height="6" rx="1"/>
          <rect x="4" y="14" width="6" height="6" rx="1"/>
          <rect x="14" y="14" width="6" height="6" rx="1"/>
        </svg>
      </span>
      <span class="control-label">控制中心</span>
      <svg class="control-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- 右侧滑出面板 -->
    <Teleport to="body">
      <Transition name="slide">
        <div v-if="isOpen" class="control-panel-overlay" @click="close">
          <div class="control-panel" @click.stop>
            <!-- 面板头部 -->
            <div class="panel-header">
              <div class="panel-title">
                <span class="title-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="4" y="4" width="6" height="6" rx="1"/>
                    <rect x="14" y="4" width="6" height="6" rx="1"/>
                    <rect x="4" y="14" width="6" height="6" rx="1"/>
                    <rect x="14" y="14" width="6" height="6" rx="1"/>
                  </svg>
                </span>
                <span class="title-text">控制中心</span>
              </div>
              <button class="btn-close" @click="close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <!-- 面板内容 -->
            <div class="panel-content">
              <!-- Agent Panel -->
              <button class="panel-item" @click="openPanel('dashboard')">
                <span class="item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m4.22-10.22l4.24-4.24M6.34 6.34L2.1 2.1m17.9 9.9h-6m-6 0H1.9"/>
                  </svg>
                </span>
                <div class="item-info">
                  <span class="item-title">Agent 面板</span>
                  <span class="item-desc">AI 助手与自动化任务</span>
                </div>
                <span class="item-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
              </button>

              <!-- Article Manager -->
              <button class="panel-item" @click="openPanel('articles')">
                <span class="item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </span>
                <div class="item-info">
                  <span class="item-title">文章管理</span>
                  <span class="item-title">管理、创建和编辑文章</span>
                </div>
                <span class="item-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
              </button>

              <!-- Log Viewer -->
              <button class="panel-item" @click="openPanel('logs')">
                <span class="item-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="8" y1="13" x2="16" y2="13"/>
                    <line x1="8" y1="17" x2="16" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                </span>
                <div class="item-info">
                  <span class="item-title">日志查看</span>
                  <span class="item-desc">系统日志与操作记录</span>
                </div>
                <span class="item-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
              </button>
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
/* ═══════════════════════════════════════════════════════════════
   Control Center — Star River Style
   ═══════════════════════════════════════════════════════════════ */

.control-center {
  position: relative;
}

/* Button — Neumorphic Morandi */
.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  border-radius: var(--sr-radius-md, 10px);
  background: var(--sr-bg-elevated, #f5f0eb);
  color: var(--sr-text-secondary, var(--sr-text-muted, #94a3b8));
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
  font-family: var(--sr-font-primary, 'Inter', sans-serif);
  box-shadow:
    3px 3px 6px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.06)),
    -3px -3px 6px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.8));
}

.control-btn:hover {
  transform: translateY(-1px);
  color: var(--sr-accent-star, #b8a090);
  box-shadow:
    4px 4px 10px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.08)),
    -4px -4px 10px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.9));
}

.control-btn:active {
  transform: translateY(0);
  box-shadow:
    inset 2px 2px 4px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.08)),
    inset -2px -2px 4px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.6));
}

.control-btn.is-open {
  color: var(--sr-accent-star, #b8a090);
  box-shadow:
    inset 2px 2px 4px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.06)),
    inset -2px -2px 4px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.6));
}

.control-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-icon svg {
  width: 100%;
  height: 100%;
}

.control-label {
  display: none;
  font-weight: 500;
}

@media (min-width: 768px) {
  .control-label {
    display: inline;
  }
}

.control-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.control-btn.is-open .control-arrow {
  transform: rotate(180deg);
}

/* Slide-out Panel — Glass */
.control-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(4px);
  z-index: 9998;
}

.control-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.08);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Panel Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sr-accent-star, #b8a090);
}

.title-icon svg {
  width: 100%;
  height: 100%;
}

.title-text {
  font-family: var(--sr-font-primary, 'Inter', sans-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  letter-spacing: -0.02em;
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-bg-elevated, #f5f0eb);
  border: none;
  border-radius: var(--sr-radius-sm, 8px);
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    2px 2px 4px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.06)),
    -2px -2px 4px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.8));
}

.btn-close:hover {
  color: var(--sr-accent-star, #b8a090);
  transform: scale(1.06);
}

.btn-close:active {
  box-shadow:
    inset 2px 2px 4px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.08)),
    inset -2px -2px 4px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.6));
  transform: scale(0.96);
}

.btn-close svg {
  width: 18px;
  height: 18px;
}

/* Panel Content */
.panel-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.panel-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: var(--sr-radius-md, 12px);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-align: left;
}

.panel-item:hover {
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.5));
  border-color: var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  transform: translateX(4px);
}

.panel-item:hover .item-icon {
  transform: scale(1.08);
  background: var(--sr-glass-bg-hover, rgba(255, 255, 255, 0.7));
}

.panel-item:hover .item-arrow {
  opacity: 1;
  transform: translateX(0);
}

.item-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-bg-secondary, rgba(0, 0, 0, 0.02));
  border-radius: var(--sr-radius-sm, 10px);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  color: var(--sr-accent-star, #b8a090);
  flex-shrink: 0;
}

.item-icon svg {
  width: 20px;
  height: 20px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.item-title {
  font-family: var(--sr-font-primary, 'Inter', sans-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.item-desc {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.item-arrow {
  width: 16px;
  height: 16px;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  color: var(--sr-accent-star, #b8a090);
}

.item-arrow svg {
  width: 100%;
  height: 100%;
}

/* Slide Animation */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.slide-enter-from .control-panel,
.slide-leave-to .control-panel {
  transform: translateX(100%);
}

.slide-enter-active .control-panel {
  animation: slideInPanel 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideInPanel {
  0% { transform: translateX(100%); }
  100% { transform: translateX(0); }
}

/* Panel items stagger */
.slide-enter-active .panel-item {
  animation: slideInItem 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
}

.slide-enter-active .panel-item:nth-child(1) { animation-delay: 0.08s; }
.slide-enter-active .panel-item:nth-child(2) { animation-delay: 0.16s; }
.slide-enter-active .panel-item:nth-child(3) { animation-delay: 0.24s; }

@keyframes slideInItem {
  0% { opacity: 0; transform: translateX(20px); }
  100% { opacity: 1; transform: translateX(0); }
}
</style>
