<template>
  <div class="message-versions">
    <!-- 版本切换器（始终显示，方便知道当前是第几个版本） -->
    <div class="version-switcher">
      <button 
        class="version-btn prev"
        :disabled="currentIndex <= 0"
        @click="switchToVersion(currentIndex - 1)"
        title="上一个版本"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      
      <span class="version-info">
        {{ currentIndex + 1 }} / {{ versions.length }}
      </span>
      
      <button 
        class="version-btn next"
        :disabled="currentIndex >= versions.length - 1"
        @click="switchToVersion(currentIndex + 1)"
        title="下一个版本"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
    
    <!-- 重新生成按钮（在版本切换右侧） -->
    <button 
      v-if="!isStreaming"
      class="regenerate-btn"
      @click="handleRegenerate"
      title="重新生成新版本"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      <span>重新生成</span>
    </button>
    
    <!-- 生成中指示器 -->
    <div v-else class="generating-indicator">
      <span class="generating-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span class="generating-text">生成中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '../composables/types'

interface Props {
  versions: ChatMessage[]
  currentIndex: number
  userMessageId: string
  isStreaming: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'switch', index: number): void
  (e: 'regenerate'): void
}>()

function switchToVersion(index: number) {
  if (index >= 0 && index < props.versions.length && index !== props.currentIndex) {
    emit('switch', index)
  }
}

function handleRegenerate() {
  emit('regenerate')
}
</script>

<style scoped>
.message-versions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* 版本切换器 */
.version-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 3px;
}

.version-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.version-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
}

.version-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.version-btn svg {
  width: 14px;
  height: 14px;
}

.version-info {
  min-width: 44px;
  text-align: center;
  font-weight: 600;
  color: var(--vp-c-text-1);
  font-size: 13px;
}

/* 重新生成按钮 */
.regenerate-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.regenerate-btn:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}

.regenerate-btn svg {
  width: 14px;
  height: 14px;
}

/* 生成中指示器 */
.generating-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--vp-c-brand-soft);
  border-radius: 8px;
  color: var(--vp-c-brand);
}

.generating-text {
  font-size: 12px;
  font-weight: 500;
}

.generating-dots {
  display: flex;
  gap: 3px;
}

.generating-dots span {
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.generating-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.generating-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
