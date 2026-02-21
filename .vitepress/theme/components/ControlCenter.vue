<template>
  <div class="control-center">
    <!-- Control Center Button -->
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
      <!-- 呼吸光晕效果 -->
      <span class="btn-glow"></span>
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
                  <span class="item-desc">管理、创建和编辑文章</span>
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
.control-center {
  position: relative;
}

/* ===== 按钮样式 - 无边框科幻风 ===== */
.control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
  color: var(--vp-c-text-1, #262626);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.control-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.control-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

.control-btn:hover::before {
  opacity: 1;
}

.control-btn.is-open {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
  color: #3b82f6;
}

.control-btn.is-open .btn-glow {
  opacity: 1;
}

.control-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.control-icon svg {
  width: 100%;
  height: 100%;
}

.control-label {
  display: none;
  position: relative;
  z-index: 1;
  font-weight: 600;
}

@media (min-width: 768px) {
  .control-label {
    display: inline;
  }
}

.control-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.control-btn.is-open .control-arrow {
  transform: rotate(180deg);
}

/* 呼吸光晕效果 */
.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #3b82f6 0%, #9333ea 100%);
  border-radius: 12px;
  opacity: 0;
  z-index: -1;
  filter: blur(8px);
  transition: opacity 0.3s ease;
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

/* ===== 右侧滑出面板 ===== */
.control-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 9998;
}

.control-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border-left: 1px solid rgba(59, 130, 246, 0.15);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 面板头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.03) 0%, rgba(147, 51, 234, 0.03) 100%);
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
  color: #3b82f6;
}

.title-icon svg {
  width: 100%;
  height: 100%;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.btn-close svg {
  width: 20px;
  height: 20px;
}

/* 面板内容 */
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
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;
  overflow: hidden;
}

.panel-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.panel-item:hover {
  transform: translateX(4px);
}

.panel-item:hover::before {
  opacity: 1;
}

.panel-item:hover .item-icon {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
  transform: scale(1.05);
}

.panel-item:hover .item-arrow {
  opacity: 1;
  transform: translateX(0);
}

.item-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
  border-radius: 10px;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  color: #3b82f6;
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
  position: relative;
  z-index: 1;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
}

.item-desc {
  font-size: 12px;
  color: var(--vp-c-text-3, #8c8c8c);
}

.item-arrow {
  width: 16px;
  height: 16px;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
  color: #3b82f6;
  position: relative;
  z-index: 1;
}

.item-arrow svg {
  width: 100%;
  height: 100%;
}

/* ===== 滑出动画 ===== */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
  animation: slideInPanel 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInPanel {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(0);
  }
}

/* 面板项依次进入动画 */
.slide-enter-active .panel-item {
  animation: slideInItem 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}

.slide-enter-active .panel-item:nth-child(1) { animation-delay: 0.08s; }
.slide-enter-active .panel-item:nth-child(2) { animation-delay: 0.16s; }
.slide-enter-active .panel-item:nth-child(3) { animation-delay: 0.24s; }

@keyframes slideInItem {
  0% {
    opacity: 0;
    transform: translateX(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
