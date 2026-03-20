<template>
  <button
    class="animated-btn"
    :class="[
      `btn-${variant}`,
      `btn-${size}`,
      { 'is-loading': loading, 'is-disabled': disabled }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span class="btn-content" :class="{ 'is-hidden': loading }">
      <span v-if="icon" class="btn-icon">
        <slot name="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <component :is="icon" />
          </svg>
        </slot>
      </span>
      <span class="btn-text">
        <slot />
      </span>
    </span>
    
    <span v-if="loading" class="btn-loader">
      <span class="loader-spinner"></span>
    </span>
    
    <!-- 涟漪效果容器 -->
    <span class="btn-ripple" ref="rippleRef"></span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  loading?: boolean
  disabled?: boolean
  ripple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  ripple: true,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const rippleRef = ref<HTMLElement>()

const handleClick = (e: MouseEvent) => {
  if (props.ripple) {
    createRipple(e)
  }
  emit('click', e)
}

const createRipple = (e: MouseEvent) => {
  if (!rippleRef.value) return
  
  const button = e.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = e.clientX - rect.left - size / 2
  const y = e.clientY - rect.top - size / 2
  
  const ripple = document.createElement('span')
  ripple.className = 'ripple-effect'
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: scale(0);
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  `
  
  rippleRef.value.appendChild(ripple)
  
  setTimeout(() => {
    ripple.remove()
  }, 600)
}
</script>

<style scoped>
.animated-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

/* 尺寸 */
.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn-md {
  padding: 10px 16px;
  font-size: 14px;
}

.btn-lg {
  padding: 14px 24px;
  font-size: 16px;
}

/* 变体样式 */
.btn-primary {
  background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.45);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-secondary {
  background: #F3F4F6;
  color: #374151;
}

.btn-secondary:hover {
  background: #E5E7EB;
  transform: translateY(-1px);
}

.btn-ghost {
  background: transparent;
  color: #6B7280;
}

.btn-ghost:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
}

.btn-danger {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  color: white;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
}

/* 禁用状态 */
.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.is-disabled:hover {
  transform: none;
}

/* 加载状态 */
.is-loading {
  cursor: wait;
}

.btn-content.is-hidden {
  opacity: 0;
}

.btn-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 图标 */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  transition: transform 0.3s;
}

.animated-btn:hover .btn-icon {
  transform: scale(1.1) rotate(5deg);
}

.btn-icon svg {
  width: 100%;
  height: 100%;
}

/* 涟漪效果 */
.btn-ripple {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
}

:global(.ripple-effect) {
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  to {
    transform: scale(2);
    opacity: 0;
  }
}

/* 焦点状态 */
.animated-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
</style>
