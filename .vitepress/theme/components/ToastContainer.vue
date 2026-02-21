<template>
  <Teleport to="body">
    <div class="toast-container" :class="position">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="[toast.type, { 'has-action': toast.action }]"
          @click="handleClick(toast)"
        >
          <div class="toast-icon">
            {{ getIcon(toast.type) }}
          </div>
          <div class="toast-content">
            <div class="toast-title">{{ toast.title }}</div>
            <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
            <div v-if="toast.action" class="toast-action">
              {{ toast.actionText || '查看' }}
            </div>
          </div>
          <button class="toast-close" @click.stop="removeToast(toast.id)">
            ×
          </button>
          <div class="toast-progress" :style="{ animationDuration: `${toast.duration}ms` }"></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { eventBus } from '../../agent/core/EventBus'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration: number
  action?: () => void
  actionText?: string
}

const props = withDefaults(defineProps<{
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}>(), {
  position: 'top-right'
})

const toasts = ref<Toast[]>([])
let unsubscribe: (() => void) | null = null

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  return icons[type] || '•'
}

function addToast(toast: Omit<Toast, 'id'>): string {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const newToast = { ...toast, id }
  toasts.value.push(newToast)

  // 自动移除
  if (toast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, toast.duration)
  }

  return id
}

function removeToast(id: string) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

function handleClick(toast: Toast) {
  if (toast.action) {
    toast.action()
    removeToast(toast.id)
  }
}

// 监听全局 Toast 事件
onMounted(() => {
  const handlers: (() => void)[] = []
  
  // 监听通用 Toast 事件
  handlers.push(eventBus.on('toast:show', (data) => {
    addToast({
      type: data.type,
      title: data.title,
      message: data.message,
      duration: data.duration || 5000,
      action: data.action,
      actionText: data.actionText
    })
  }))
  
  // 监听 Agent 任务完成事件
  handlers.push(eventBus.on('agent:taskCompleted', (data) => {
    // 触发侧边栏展开事件
    eventBus.emit('sidebar:expand', { path: data.path })
    eventBus.emit('sidebar:refresh', { section: data.section })
    
    // 显示成功 Toast
    addToast({
      type: 'success',
      title: 'Agent 已完成写作',
      message: `${data.title}`,
      duration: 5000,
      action: () => {
        // 点击跳转到文章
        // 将文件路径转换为 URL 路径
        // docs/sections/posts/article.md -> /sections/posts/article.html
        const urlPath = data.path
          .replace(/^docs/, '')
          .replace(/\.md$/, '.html')
        window.location.href = urlPath.startsWith('/') ? urlPath : '/' + urlPath
      },
      actionText: '查看文章'
    })
  }))
  
  // 监听 Agent 任务失败事件
  handlers.push(eventBus.on('agent:taskFailed', (data) => {
    addToast({
      type: 'error',
      title: 'Agent 任务失败',
      message: data.error,
      duration: 8000
    })
  }))
  
  // 合并所有取消订阅函数
  unsubscribe = () => {
    handlers.forEach(fn => fn())
  }
})

onUnmounted(() => {
  unsubscribe?.()
})

// 导出方法供外部调用
defineExpose({
  addToast,
  removeToast
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  pointer-events: none;
}

.toast-container.top-right {
  top: 0;
  right: 0;
}

.toast-container.top-left {
  top: 0;
  left: 0;
}

.toast-container.bottom-right {
  bottom: 0;
  right: 0;
  flex-direction: column-reverse;
}

.toast-container.bottom-left {
  bottom: 0;
  left: 0;
  flex-direction: column-reverse;
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 320px;
  max-width: 480px;
  pointer-events: auto;
  cursor: default;
  position: relative;
  overflow: hidden;
  border-left: 4px solid transparent;
}

.toast-item.success {
  border-left-color: #00C853;
}

.toast-item.error {
  border-left-color: #FF1744;
}

.toast-item.warning {
  border-left-color: #FFC400;
}

.toast-item.info {
  border-left-color: #00B0FF;
}

.toast-item.has-action {
  cursor: pointer;
}

.toast-item.has-action:hover {
  background: #f8f9fa;
}

.toast-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  flex-shrink: 0;
}

.toast-item.success .toast-icon {
  background: rgba(0, 200, 83, 0.1);
  color: #00C853;
}

.toast-item.error .toast-icon {
  background: rgba(255, 23, 68, 0.1);
  color: #FF1744;
}

.toast-item.warning .toast-icon {
  background: rgba(255, 196, 0, 0.1);
  color: #FFC400;
}

.toast-item.info .toast-icon {
  background: rgba(0, 176, 255, 0.1);
  color: #00B0FF;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.4;
}

.toast-message {
  font-size: 13px;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.5;
}

.toast-action {
  font-size: 12px;
  font-weight: 600;
  color: #00D4FF;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toast-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  background: #f1f5f9;
  color: #64748b;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  animation: progress linear forwards;
}

@keyframes progress {
  from { width: 100%; }
  to { width: 0%; }
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.toast-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
