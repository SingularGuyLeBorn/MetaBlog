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

    <!-- Dropdown Menu -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div v-if="isOpen" class="control-dropdown-overlay" @click="close">
          <div class="control-dropdown" @click.stop>
            <!-- 装饰边角 -->
            <span class="corner corner-tl"></span>
            <span class="corner corner-tr"></span>
            <span class="corner corner-bl"></span>
            <span class="corner corner-br"></span>
            
            <div class="dropdown-header">
              <span class="header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="4" y="4" width="6" height="6" rx="1"/>
                  <rect x="14" y="4" width="6" height="6" rx="1"/>
                  <rect x="4" y="14" width="6" height="6" rx="1"/>
                  <rect x="14" y="14" width="6" height="6" rx="1"/>
                </svg>
              </span>
              <span class="header-title">控制中心</span>
              <span class="header-id">SYS-01</span>
            </div>
            
            <div class="dropdown-content">
              <!-- Agent Panel -->
              <button class="menu-item" @click="openPanel('dashboard')">
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
              <button class="menu-item" @click="openPanel('articles')">
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
              <button class="menu-item" @click="openPanel('logs')">
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

            <div class="dropdown-footer">
              <span class="footer-line"></span>
              <span class="footer-hint">点击展开相应面板</span>
              <span class="footer-line"></span>
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

/* ===== 下拉菜单 - 科幻面板风格 ===== */
.control-dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

.control-dropdown {
  position: fixed;
  top: calc(var(--vp-nav-height, 64px) + 8px);
  right: 16px;
  width: 300px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 16px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 0 30px rgba(59, 130, 246, 0.1);
  overflow: hidden;
  z-index: 9999;
  backdrop-filter: blur(20px);
  position: relative;
}

@media (min-width: 768px) {
  .control-dropdown {
    right: 24px;
  }
}

/* 装饰边角 */
.corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: #3b82f6;
  border-style: solid;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.corner-tl {
  top: 8px;
  left: 8px;
  border-width: 1px 0 0 1px;
}

.corner-tr {
  top: 8px;
  right: 8px;
  border-width: 1px 1px 0 0;
}

.corner-bl {
  bottom: 8px;
  left: 8px;
  border-width: 0 0 1px 1px;
}

.corner-br {
  bottom: 8px;
  right: 8px;
  border-width: 0 1px 1px 0;
}

.control-dropdown:hover .corner {
  opacity: 1;
  width: 12px;
  height: 12px;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);
  position: relative;
}

.header-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
}

.header-icon svg {
  width: 100%;
  height: 100%;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
  flex: 1;
}

.header-id {
  font-size: 10px;
  font-weight: 600;
  color: #3b82f6;
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  font-family: 'SF Mono', monospace;
}

.dropdown-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;
  overflow: hidden;
}

.menu-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.menu-item:hover {
  transform: translateX(4px);
}

.menu-item:hover::before {
  opacity: 1;
}

.menu-item:hover .item-icon {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%);
  transform: scale(1.05);
}

.menu-item:hover .item-arrow {
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

.dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(248, 250, 252, 0.5);
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
}

.footer-hint {
  font-size: 11px;
  color: var(--vp-c-text-3, #8c8c8c);
  white-space: nowrap;
}

/* ===== 动画效果 ===== */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
}

.dropdown-enter-from .control-dropdown,
.dropdown-leave-to .control-dropdown {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

.dropdown-enter-active .control-dropdown {
  animation: dropdownIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes dropdownIn {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 菜单项依次进入动画 */
.dropdown-enter-active .menu-item {
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}

.dropdown-enter-active .menu-item:nth-child(1) { animation-delay: 0.05s; }
.dropdown-enter-active .menu-item:nth-child(2) { animation-delay: 0.1s; }
.dropdown-enter-active .menu-item:nth-child(3) { animation-delay: 0.15s; }

@keyframes slideInRight {
  0% {
    opacity: 0;
    transform: translateX(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
