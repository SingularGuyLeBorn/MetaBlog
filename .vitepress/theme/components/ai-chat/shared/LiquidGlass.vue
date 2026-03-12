<template>
  <div
    ref="cardRef"
    class="sr-glass-card"
    :class="{
      'is-hovered': isHovered,
      'is-pressed': isPressed
    }"
    :style="containerStyle"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousedown="onMouseDown"
    @mouseup="onMouseUp"
    @mousemove="onMouseMove"
  >
    <div class="spotlight" :style="spotlightStyle"></div>
    <div class="card-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  glowColor?: string
  intensity?: number
}>()

const cardRef = ref<HTMLElement>()
const isHovered = ref(false)
const isPressed = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)

function onMouseEnter() {
  isHovered.value = true
}

function onMouseLeave() {
  isHovered.value = false
  isPressed.value = false
}

function onMouseDown() {
  isPressed.value = true
}

function onMouseUp() {
  isPressed.value = false
}

function onMouseMove(e: MouseEvent) {
  if (!cardRef.value) return
  const rect = cardRef.value.getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
}

const containerStyle = computed(() => {
  return {
    transform: isPressed.value ? 'scale(0.98)' : isHovered.value ? 'scale(1.02)' : 'scale(1)',
  }
})

const spotlightStyle = computed(() => {
  const color = props.glowColor || 'rgba(184, 160, 144, 0.15)' // Default Morandi star accent
  return {
    background: `radial-gradient(circle 200px at ${mouseX.value}px ${mouseY.value}px, ${color}, transparent 100%)`,
    opacity: isHovered.value ? (props.intensity || 1) : 0
  }
})
</script>

<style scoped>
.sr-glass-card {
  position: relative;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: inherit; /* Inherit border-radius from parent container if any */
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
}

/* Light dark/border adjustments for deep glass feel */
.sr-glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.6);
  pointer-events: none;
  z-index: 1;
}

.sr-glass-card.is-hovered {
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04);
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.5);
}

.sr-glass-card.is-pressed {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.15s ease-out; /* Snap back */
}

.spotlight {
  position: absolute;
  inset: -1px;
  pointer-events: none;
  transition: opacity 0.3s ease;
  z-index: 2; /* Put spotlight over the background but under the slot if needed, actual slot can override z-index */
  border-radius: inherit;
}

.card-content {
  position: relative;
  z-index: 10;
  height: 100%;
}
</style>
