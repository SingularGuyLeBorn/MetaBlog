<template>
  <div 
    class="liquid-glass"
    :class="{ 'is-hovering': isHovering, 'is-active': isActive }"
    :style="glassStyle"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="glass-bg" :style="bgStyle"></div>
    <div class="glass-shine"></div>
    <div class="glass-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  glowColor?: string
  intensity?: number
}>()

const isHovering = ref(false)
const isActive = ref(false)

const glassStyle = computed(() => ({
  '--glow-color': props.glowColor || 'rgba(255, 255, 255, 0.5)',
  '--intensity': props.intensity || 0.5,
}))

const bgStyle = computed(() => ({
  background: `linear-gradient(135deg, 
    rgba(255, 255, 255, ${0.7 * (props.intensity || 0.5)}), 
    rgba(255, 255, 255, ${0.3 * (props.intensity || 0.5)})
  )`,
  backdropFilter: 'blur(20px) saturate(180%)',
}))
</script>

<style scoped>
.liquid-glass {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.glass-bg {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.glass-shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.4) 0%,
    transparent 50%,
    rgba(255, 255, 255, 0.1) 100%
  );
  pointer-events: none;
}

.glass-content {
  position: relative;
  z-index: 1;
}

.liquid-glass.is-hovering {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
</style>
