<!--
  Liquid Glass Button - 液态毛玻璃按钮
  特性：
  - 90%透明+10%雾感的玻璃背景
  - 悬浮时慢慢浮上来（不是跳）
  - 按压时的有机形变（凹陷效果）
  - 霓虹辉光边缘
  - 闪烁高光效果
-->
<template>
  <button
    ref="btnRef"
    class="lg-btn-v2"
    :class="[
      `lg-btn-${variant}`,
      `lg-btn-${size}`,
      { 
        'is-loading': loading, 
        'is-disabled': disabled,
        'is-pressed': isPressed,
        'is-floating': isFloating 
      }
    ]"
    :disabled="disabled || loading"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @click="handleClick"
  >
    <!-- 玻璃光泽层 -->
    <span class="lg-btn-shine" />
    
    <!-- 涟漪容器 -->
    <span class="lg-btn-ripples" ref="ripplesRef" />
    
    <!-- 内容 -->
    <span class="lg-btn-content" :class="{ 'is-hidden': loading }">
      <span v-if="icon || $slots.icon" class="lg-btn-icon">
        <slot name="icon">
          <span v-if="icon" v-html="icon" />
        </slot>
      </span>
      <span class="lg-btn-text">
        <slot />
      </span>
    </span>
    
    <!-- 加载状态 -->
    <span v-if="loading" class="lg-btn-loader">
      <span class="lg-btn-spinner" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  loading?: boolean
  disabled?: boolean
  ripple?: boolean
  floatOnHover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  ripple: true,
  floatOnHover: true,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const btnRef = ref<HTMLButtonElement>()
const ripplesRef = ref<HTMLElement>()
const isPressed = ref(false)
const isFloating = ref(false)

let floatTimeout: number | null = null
let pressTimeout: number | null = null

// 鼠标进入 - 慢慢浮上来
function onMouseEnter() {
  if (props.floatOnHover && !props.disabled && !props.loading) {
    // 清除之前的定时器
    if (floatTimeout) clearTimeout(floatTimeout)
    // 添加延迟，实现"慢慢"的感觉
    floatTimeout = window.setTimeout(() => {
      isFloating.value = true
    }, 50)
  }
}

// 鼠标离开
function onMouseLeave() {
  isPressed.value = false
  isFloating.value = false
  if (floatTimeout) clearTimeout(floatTimeout)
}

// 鼠标按下 - 凹陷效果
function onMouseDown(e: MouseEvent) {
  if (!props.disabled && !props.loading) {
    isPressed.value = true
    if (pressTimeout) clearTimeout(pressTimeout)
    
    // 创建涟漪
    if (props.ripple && ripplesRef.value) {
      createRipple(e)
    }
  }
}

// 鼠标抬起
function onMouseUp() {
  pressTimeout = window.setTimeout(() => {
    isPressed.value = false
  }, 100)
}

// 创建涟漪效果
function createRipple(e: MouseEvent) {
  if (!ripplesRef.value || !btnRef.value) return
  
  const rect = btnRef.value.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  const ripple = document.createElement('span')
  ripple.className = 'lg-ripple-effect'
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    margin-left: -${size / 2}px;
    margin-top: -${size / 2}px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
    transform: scale(0);
    animation: lg-ripple-btn 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    pointer-events: none;
  `
  
  ripplesRef.value.appendChild(ripple)
  
  setTimeout(() => {
    ripple.remove()
  }, 800)
}

// 点击处理
function handleClick(e: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}

// 清理
onUnmounted(() => {
  if (floatTimeout) clearTimeout(floatTimeout)
  if (pressTimeout) clearTimeout(pressTimeout)
})
</script>

<style scoped>
/* 基础按钮 - 液态毛玻璃 */
.lg-btn-v2 {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  border: none;
  outline: none;
  
  /* 玻璃效果 */
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px) saturate(1.3);
  -webkit-backdrop-filter: blur(12px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  
  /* 过渡 - 使用粘稠缓动 */
  transition: 
    transform 400ms cubic-bezier(0.22, 1, 0.36, 1),
    background 400ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 400ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 400ms cubic-bezier(0.22, 1, 0.36, 1);
  
  will-change: transform, box-shadow;
}

/* 尺寸变体 */
.lg-btn-sm {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 8px;
}

.lg-btn-md {
  padding: 12px 24px;
  font-size: 14px;
}

.lg-btn-lg {
  padding: 16px 32px;
  font-size: 15px;
  border-radius: 16px;
}

/* 光泽层 */
.lg-btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.3) 0%,
    transparent 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  opacity: 0;
  transition: opacity 200ms ease;
  pointer-events: none;
  z-index: 0;
}

/* 涟漪容器 */
.lg-btn-ripples {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  z-index: 1;
}

/* 内容 */
.lg-btn-content {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  z-index: 2;
  transition: opacity 200ms ease;
}

.lg-btn-content.is-hidden {
  opacity: 0;
}

.lg-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lg-btn-v2:hover .lg-btn-icon {
  transform: scale(1.1) rotate(5deg);
}

.lg-btn-text {
  line-height: 1;
}

/* 加载状态 */
.lg-btn-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.lg-btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: lg-spin 0.8s linear infinite;
}

@keyframes lg-spin {
  to { transform: rotate(360deg); }
}

/* ═════════════════════════════════════════════════════════════════
   变体样式
   ═════════════════════════════════════════════════════════════════ */

/* 主要按钮 */
.lg-btn-primary {
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.85) 0%,
    rgba(96, 165, 250, 0.85) 100%
  );
  border-color: rgba(139, 92, 246, 0.4);
  color: white;
  box-shadow: 0 4px 14px rgba(139, 92, 246, 0.25);
}

.lg-btn-primary .lg-btn-shine {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.4) 0%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 100%
  );
}

/* 次要按钮 */
.lg-btn-secondary {
  background: rgba(255, 255, 255, 0.72);
  color: #1e293b;
}

.dark .lg-btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

/* Ghost 按钮 */
.lg-btn-ghost {
  background: transparent;
  border-color: transparent;
}

.lg-btn-ghost:hover:not(.is-disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

/* 危险按钮 */
.lg-btn-danger {
  background: linear-gradient(
    135deg,
    rgba(239, 68, 68, 0.85) 0%,
    rgba(220, 38, 38, 0.85) 100%
  );
  border-color: rgba(239, 68, 68, 0.4);
  color: white;
}

/* 玻璃按钮（完全透明） */
.lg-btn-glass {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.lg-btn-glass:hover:not(.is-disabled) {
  background: rgba(255, 255, 255, 0.2);
}

/* ═════════════════════════════════════════════════════════════════
   交互状态
   ═════════════════════════════════════════════════════════════════ */

/* 悬浮状态 - 慢慢浮上来 */
.lg-btn-v2:hover:not(.is-disabled):not(.is-loading) {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(168, 85, 247, 0.3);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 0 20px rgba(168, 85, 247, 0.15);
}

.lg-btn-v2:hover:not(.is-disabled):not(.is-loading) .lg-btn-shine {
  opacity: 1;
}

/* 主要按钮悬浮 */
.lg-btn-primary:hover:not(.is-disabled):not(.is-loading) {
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.95) 0%,
    rgba(96, 165, 250, 0.95) 100%
  );
  box-shadow: 
    0 8px 24px rgba(139, 92, 246, 0.3),
    0 0 30px rgba(139, 92, 246, 0.2);
}

/* 浮动效果 - 更加明显的悬浮 */
.lg-btn-v2.is-floating:not(.is-disabled):not(.is-loading) {
  transform: translateY(-4px);
}

.lg-btn-v2.is-floating.lg-btn-lg:not(.is-disabled):not(.is-loading) {
  transform: translateY(-6px);
}

/* 按压状态 - 凹陷效果 */
.lg-btn-v2.is-pressed:not(.is-disabled):not(.is-loading) {
  transform: translateY(0) scale(0.97);
  transition-duration: 100ms;
}

.lg-btn-v2.is-pressed:not(.is-disabled):not(.is-loading).is-floating {
  transform: translateY(-1px) scale(0.97);
}

.lg-btn-primary.is-pressed:not(.is-disabled):not(.is-loading) {
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.75) 0%,
    rgba(96, 165, 250, 0.75) 100%
  );
  box-shadow: 
    inset 0 2px 8px rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(139, 92, 246, 0.1);
}

/* 禁用状态 */
.lg-btn-v2.is-disabled,
.lg-btn-v2:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* 加载状态 */
.lg-btn-v2.is-loading {
  cursor: wait;
  transform: none !important;
}

/* 焦点状态 */
.lg-btn-v2:focus-visible {
  outline: none;
  box-shadow: 
    0 0 0 3px rgba(139, 92, 246, 0.2),
    0 0 20px rgba(139, 92, 246, 0.1);
}

/* 涟漪动画 */
@keyframes lg-ripple-btn {
  0% {
    transform: scale(0);
    opacity: 0.6;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

/* 闪烁高光效果 */
.lg-btn-v2::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transform: translateX(-100%) skewX(-15deg);
  pointer-events: none;
  z-index: 2;
  opacity: 0;
}

.lg-btn-v2:hover::after {
  animation: lg-sheen-btn 1s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes lg-sheen-btn {
  0% {
    transform: translateX(-100%) skewX(-15deg);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(200%) skewX(-15deg);
    opacity: 0;
  }
}
</style>
