<template>
  <div 
    class="ai-avatar"
    :class="[`ai-avatar--${size}`, { 'ai-avatar--animated': animated }]"
  >
    <div class="ai-avatar__inner">
      <span class="ai-avatar__icon">🤖</span>
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
}

.ai-avatar__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: bold;
  position: relative;
  z-index: 1;
}

.ai-avatar--sm .ai-avatar__inner {
  width: 24px;
  height: 24px;
  font-size: 14px;
}

.ai-avatar--md .ai-avatar__inner {
  width: 40px;
  height: 40px;
  font-size: 20px;
}

.ai-avatar--lg .ai-avatar__inner {
  width: 56px;
  height: 56px;
  font-size: 28px;
}

.ai-avatar--xl .ai-avatar__inner {
  width: 80px;
  height: 80px;
  font-size: 40px;
}

.ai-avatar__glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.4;
  filter: blur(8px);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}
</style>
