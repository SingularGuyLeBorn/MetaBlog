<template>
  <div 
    class="ai-avatar"
    :class="[`ai-avatar--${size}`, { 'ai-avatar--animated': animated }]"
  >
    <div class="ai-avatar__inner">
      <!-- 四芒星 SVG 图标 -->
      <svg class="ai-avatar__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L13.5 9.5L21 12L13.5 14.5L12 22L10.5 14.5L3 12L10.5 9.5L12 2Z" fill="currentColor"/>
        <circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity="0.5"/>
      </svg>
    </div>
    <div v-if="animated" class="ai-avatar__glow"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}>()

const size = computed(() => props.size || 'md')
</script>

<style scoped>
.ai-avatar {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.ai-avatar__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #c4a882 0%, #a89080 50%, #8a7a6a 100%);
  color: rgba(255, 255, 255, 0.95);
  position: relative;
  z-index: 1;
  box-shadow: 0 2px 8px rgba(168, 144, 128, 0.25), inset 0 1px 0 rgba(255,255,255,0.15);
}

.ai-avatar__icon {
  display: block;
}

.ai-avatar--sm .ai-avatar__inner {
  width: 28px;
  height: 28px;
  padding: 5px;
}
.ai-avatar--sm .ai-avatar__icon {
  width: 16px;
  height: 16px;
}

.ai-avatar--md .ai-avatar__inner {
  width: 40px;
  height: 40px;
  padding: 8px;
}
.ai-avatar--md .ai-avatar__icon {
  width: 22px;
  height: 22px;
}

.ai-avatar--lg .ai-avatar__inner {
  width: 56px;
  height: 56px;
  padding: 12px;
}
.ai-avatar--lg .ai-avatar__icon {
  width: 30px;
  height: 30px;
}

.ai-avatar--xl .ai-avatar__inner {
  width: 80px;
  height: 80px;
  padding: 16px;
}
.ai-avatar--xl .ai-avatar__icon {
  width: 44px;
  height: 44px;
}

.ai-avatar__glow {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c4a882 0%, #a89080 100%);
  opacity: 0.35;
  filter: blur(6px);
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.06);
  }
}
</style>
