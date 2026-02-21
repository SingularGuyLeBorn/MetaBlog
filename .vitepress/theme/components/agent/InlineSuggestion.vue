<script setup lang="ts">
/**
 * InlineSuggestion - 行内建议组件
 * 类似 GitHub Copilot 的幽灵文本或浮动建议
 */
import { computed } from 'vue'
import type { InlineSuggestion } from '../../../agent/core/types'

interface Props {
  suggestion: InlineSuggestion
  position: { line: number; ch: number }
}

const props = defineProps<Props>()
const emit = defineEmits(['accept', 'dismiss', 'viewRelated'])

const suggestionClass = computed(() => ({
  'suggestion-completion': props.suggestion.type === 'completion',
  'suggestion-link': props.suggestion.type === 'link',
  'suggestion-rewrite': props.suggestion.type === 'rewrite',
  'suggestion-question': props.suggestion.type === 'question'
}))

const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    completion: '💡 补全',
    link: '🔗 链接',
    rewrite: '✨ 重写',
    question: '❓ 问题'
  }
  return labels[props.suggestion.type] || '💡 建议'
})

function accept() {
  emit('accept', props.suggestion)
}

function dismiss() {
  emit('dismiss', props.suggestion)
}

function viewRelated() {
  emit('viewRelated', props.suggestion)
}
</script>

<template>
  <div class="inline-suggestion" :class="suggestionClass">
    <div class="suggestion-header">
      <span class="type-badge">{{ typeLabel }}</span>
      <span class="confidence" v-if="suggestion.confidence">
        {{ Math.round(suggestion.confidence * 100) }}%
      </span>
    </div>
    
    <div class="suggestion-content">
      <p class="suggestion-text">{{ suggestion.content }}</p>
      <p v-if="suggestion.context" class="suggestion-context">
        {{ suggestion.context }}
      </p>
    </div>
    
    <div class="suggestion-actions">
      <button class="action-btn primary" @click="accept">
        <span class="key">Tab</span>
        <span>接受</span>
      </button>
      <button class="action-btn" @click="dismiss">
        <span class="key">Esc</span>
        <span>忽略</span>
      </button>
      <button v-if="suggestion.type === 'link'" class="action-btn" @click="viewRelated">
        查看相关
      </button>
    </div>
  </div>
</template>

<style scoped>
.inline-suggestion {
  position: absolute;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  max-width: 400px;
  z-index: 100;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 不同类型建议的样式 */
.suggestion-completion {
  border-left: 3px solid #1890ff;
}

.suggestion-link {
  border-left: 3px solid #52c41a;
}

.suggestion-rewrite {
  border-left: 3px solid #722ed1;
}

.suggestion-question {
  border-left: 3px solid #faad14;
}

/* Header */
.suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.type-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.confidence {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--vp-c-bg-alt);
  border-radius: 10px;
  color: var(--vp-c-text-2);
}

/* Content */
.suggestion-content {
  margin-bottom: 12px;
}

.suggestion-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--vp-c-text);
  margin: 0;
}

.suggestion-context {
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid var(--vp-c-divider);
}

/* Actions */
.suggestion-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 6px;
  font-size: 12px;
  color: var(--vp-c-text);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-bg-alt);
}

.action-btn.primary {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.action-btn.primary:hover {
  opacity: 0.9;
}

.key {
  padding: 2px 6px;
  background: var(--vp-c-bg-alt);
  border-radius: 4px;
  font-size: 10px;
  font-family: var(--vp-font-family-mono);
}

.action-btn.primary .key {
  background: rgba(255, 255, 255, 0.2);
}
</style>
