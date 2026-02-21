<template>
  <component
    :is="tag"
    class="animated-container"
    :class="[
      `animate-${animation}`,
      { 'is-visible': isVisible }
    ]"
    :style="{
      '--delay': `${delay}ms`,
      '--duration': `${duration}ms`,
    }"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  tag?: string
  animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'bounce'
  delay?: number
  duration?: number
  trigger?: 'mount' | 'visible' | 'hover'
  threshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
  animation: 'fade-up',
  delay: 0,
  duration: 500,
  trigger: 'visible',
  threshold: 0.1,
})

const isVisible = ref(props.trigger === 'mount')
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (props.trigger === 'visible') {
    const element = document.querySelector('.animated-container')
    if (element) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              isVisible.value = true
              observer?.unobserve(entry.target)
            }
          })
        },
        { threshold: props.threshold }
      )
      observer.observe(element)
    }
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<style scoped>
.animated-container {
  opacity: 0;
  transition: all var(--duration, 500ms) cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: var(--delay, 0ms);
}

.animated-container.is-visible {
  opacity: 1;
  transform: translate(0) scale(1) !important;
}

/* 从下方淡入 */
.animate-fade-up {
  transform: translateY(30px);
}

/* 从上方淡入 */
.animate-fade-down {
  transform: translateY(-30px);
}

/* 从左方淡入 */
.animate-fade-left {
  transform: translateX(-30px);
}

/* 从右方淡入 */
.animate-fade-right {
  transform: translateX(30px);
}

/* 缩放淡入 */
.animate-scale {
  transform: scale(0.9);
}

/* 弹跳淡入 */
.animate-bounce {
  transform: scale(0.3);
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animate-bounce.is-visible {
  animation: bounce-in var(--duration, 500ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: var(--delay, 0ms);
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
