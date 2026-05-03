<!--
  Liquid Glass Animated Container - 液态毛玻璃动画容器
  为子元素提供统一的液态玻璃效果和交错入场动画
-->
<template>
  <component
    :is="tag"
    ref="containerRef"
    class="lg-container"
    :class="{
      'is-staggered': stagger,
      'is-glass': glass,
      'is-hoverable': hoverable,
      'is-floating': isFloating,
      'is-pressed': isPressed
    }"
    :style="containerStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
  >
    <!-- 玻璃背景层 -->
    <div v-if="glass" class="lg-container-glass" />
    
    <!-- 折射光层 -->
    <div v-if="glass && refraction" class="lg-container-refraction" />
    
    <!-- 焦散阴影 -->
    <div v-if="glass && caustic" class="lg-container-caustic" />
    
    <!-- 涟漪容器 -->
    <div v-if="ripple" class="lg-container-ripples" ref="ripplesRef" />
    
    <!-- 内容 -->
    <div class="lg-container-content">
      <slot />
    </div>
  </component>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  tag?: string
  glass?: boolean
  hoverable?: boolean
  float?: boolean
  stagger?: boolean
  staggerDelay?: number
  refraction?: boolean
  caustic?: boolean
  ripple?: boolean
  glow?: boolean
  glowColor?: string
  padding?: string | number
  borderRadius?: string | number
  intensity?: number
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
  glass: true,
  hoverable: true,
  float: true,
  stagger: false,
  staggerDelay: 50,
  refraction: true,
  caustic: true,
  ripple: false,
  glow: true,
  glowColor: 'rgba(168, 85, 247, 0.3)',
  intensity: 1,
})

const containerRef = ref<HTMLElement>()
const ripplesRef = ref<HTMLElement>()
const isFloating = ref(false)
const isPressed = ref(false)
const hasEntered = ref(false)

let floatTimeout: number | null = null
let pressTimeout: number | null = null
let observer: IntersectionObserver | null = null

// 容器样式
const containerStyle = computed(() => {
  const style: Record<string, string> = {}
  
  if (props.padding !== undefined) {
    style.padding = typeof props.padding === 'number' 
      ? `${props.padding}px` 
      : props.padding
  }
  
  if (props.borderRadius !== undefined) {
    style.borderRadius = typeof props.borderRadius === 'number'
      ? `${props.borderRadius}px`
      : props.borderRadius
  }
  
  return style
})

// 鼠标进入
function onMouseEnter() {
  if (props.float && props.hoverable && !isPressed.value) {
    if (floatTimeout) clearTimeout(floatTimeout)
    floatTimeout = window.setTimeout(() => {
      isFloating.value = true
    }, 50)
  }
}

// 鼠标离开
function onMouseLeave() {
  isFloating.value = false
  isPressed.value = false
  if (floatTimeout) clearTimeout(floatTimeout)
}

// 鼠标按下
function onMouseDown(e: MouseEvent) {
  if (props.hoverable) {
    isPressed.value = true
    if (pressTimeout) clearTimeout(pressTimeout)
    
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

// 创建涟漪
function createRipple(e: MouseEvent) {
  if (!ripplesRef.value || !containerRef.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  const ripple = document.createElement('span')
  ripple.className = 'lg-container-ripple'
  ripple.style.cssText = `
    left: ${x}px;
    top: ${y}px;
  `
  
  ripplesRef.value.appendChild(ripple)
  
  setTimeout(() => {
    ripple.remove()
  }, 1500)
}

// 设置子元素交错动画
function setupStagger() {
  if (!props.stagger || !containerRef.value) return
  
  const children = containerRef.value.querySelectorAll('.lg-stagger-item')
  children.forEach((child, index) => {
    const el = child as HTMLElement
    el.style.animationDelay = `${index * props.staggerDelay}ms`
    el.classList.add('lg-enter-animation')
  })
}

// 入场动画观察
onMounted(() => {
  if (!containerRef.value) return
  
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasEntered.value) {
          hasEntered.value = true
          containerRef.value?.classList.add('has-entered')
          setupStagger()
          observer?.disconnect()
        }
      })
    },
    { threshold: 0.1 }
  )
  
  observer.observe(containerRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
  if (floatTimeout) clearTimeout(floatTimeout)
  if (pressTimeout) clearTimeout(pressTimeout)
})
</script>

<style scoped>
/* 基础容器 */
.lg-container {
  position: relative;
  border-radius: 16px;
  transition: 
    transform 600ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 600ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

/* 玻璃模式 */
.lg-container.is-glass {
  background: #f8f6f3;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.06),
    0 2px 4px rgba(0, 0, 0, 0.03),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  animation: lg-container-breathe 5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.dark .lg-container.is-glass {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

/* 呼吸动画 */
@keyframes lg-container-breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.001);
  }
}

/* 玻璃背景层 */
.lg-container-glass {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 50%,
    rgba(0, 0, 0, 0.02) 100%
  );
  pointer-events: none;
  z-index: 0;
}

/* 折射光层 */
.lg-container-refraction {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    transparent 0%,
    rgba(255, 255, 255, 0.05) 30%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 70%,
    transparent 100%
  );
  background-size: 200% 200%;
  animation: lg-container-refraction 10s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
}

@keyframes lg-container-refraction {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
}

/* 焦散阴影 */
.lg-container-caustic {
  position: absolute;
  bottom: -16px;
  left: 10%;
  right: 10%;
  height: 32px;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 30% 50%, rgba(168, 85, 247, 0.12), transparent 50%),
    radial-gradient(ellipse at 70% 50%, rgba(52, 211, 153, 0.1), transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(96, 165, 250, 0.1), transparent 60%);
  filter: blur(8px);
  opacity: 0.5;
  pointer-events: none;
  z-index: -1;
  animation: lg-container-caustic 8s ease-in-out infinite;
}

@keyframes lg-container-caustic {
  0%, 100% {
    opacity: 0.4;
    transform: scaleX(1);
  }
  50% {
    opacity: 0.6;
    transform: scaleX(1.05);
  }
}

/* 涟漪容器 */
.lg-container-ripples {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
}

/* 涟漪 */
.lg-container-ripple {
  position: absolute;
  width: 20px;
  height: 20px;
  margin-left: -10px;
  margin-top: -10px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: lg-container-ripple 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  pointer-events: none;
}

@keyframes lg-container-ripple {
  0% {
    transform: scale(0);
    opacity: 0.6;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
}

/* 内容层 */
.lg-container-content {
  position: relative;
  z-index: 3;
}

/* 悬浮效果 - 慢慢浮上来 */
.lg-container.is-hoverable.is-glass.is-floating {
  transform: translateY(-8px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 20px 50px -10px rgba(0, 0, 0, 0.15),
    0 10px 20px -5px rgba(0, 0, 0, 0.08),
    0 0 30px rgba(168, 85, 247, 0.1);
}

.dark .lg-container.is-hoverable.is-glass.is-floating {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

/* 按压效果 - 凹陷 */
.lg-container.is-hoverable.is-glass.is-pressed {
  transform: translateY(-2px) scale(0.99);
  transition-duration: 100ms;
  box-shadow: 
    inset 0 2px 8px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 0, 0, 0.04);
}

.lg-container.is-hoverable.is-glass.is-floating.is-pressed {
  transform: translateY(-3px) scale(0.99);
}

/* 交错动画模式 */
.lg-container.is-staggered .lg-stagger-item {
  opacity: 0;
  transform: translateY(20px);
}

.lg-container.is-staggered.has-entered .lg-stagger-item {
  animation: lg-stagger-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes lg-stagger-enter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 入场动画 */
.lg-container:not(.is-staggered) {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(4px);
}

.lg-container.has-entered:not(.is-staggered) {
  animation: lg-container-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes lg-container-enter {
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}
</style>
