<!--
  MessageBubble - 消息气泡组件
-->
<template>
  <div class="message-wrapper" :class="[message.role, { last: isLast }]">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message">
      <div class="message-content">
        <div class="message-text">{{ displayContent }}</div>
      </div>
      <Avatar type="user" />
    </div>

    <!-- AI 消息 -->
    <div v-else class="ai-message">
      <Avatar type="ai" :typing="isStreaming" />
      <div class="message-body">
        <!-- 思考过程 -->
        <div v-if="displayReasoning" class="reasoning-box">
          <div class="reasoning-header" @click="isExpanded = !isExpanded">
            <span class="reasoning-icon">💭</span>
            <span>思考过程</span>
            <Icon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
          </div>
          <div v-show="isExpanded" class="reasoning-content">
            {{ displayReasoning }}
          </div>
        </div>

        <!-- 消息内容 - 有内容时才显示气泡 -->
        <div v-if="message.content" class="message-bubble" v-html="renderedHtml"></div>
        <!-- 思考中占位 -->
        <div v-else-if="isStreaming" class="thinking-placeholder">
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
        </div>

        <!-- 流式光标 -->
        <span v-if="isStreaming" class="cursor"></span>

        <!-- 操作按钮 -->
        <div class="message-actions">
          <button class="action-btn" @click="copyContent">
            <Icon name="copy" :size="14" />
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
          <button v-if="isLast" class="action-btn" @click="$emit('regenerate')">
            <Icon name="refresh" :size="14" />
            <span>重新生成</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Avatar, Icon } from '../ui'
import type { ChatMessage } from '../composables/types'

interface Props {
  message: ChatMessage
  isStreaming: boolean
  isLast: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  regenerate: []
}>()

const isExpanded = ref(true)
const copied = ref(false)

// 直接读取，computed 会在 props.message 变化时自动更新
const displayContent = computed(() => props.message.content || '')
const displayReasoning = computed(() => props.message.reasoning?.content || '')
const renderedHtml = computed(() => {
  const content = props.message.content
  if (!content) return ''
  try {
    return DOMPurify.sanitize(marked.parse(content) as string)
  } catch (e) {
    return content
  }
})

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('Copy failed:', err)
  }
}
</script>

<style scoped>
.message-wrapper {
  margin-bottom: var(--ai-space-6);
  animation: fadeInUp 0.3s ease;
}

/* 用户消息 */
.user-message {
  display: flex;
  justify-content: flex-end;
  gap: var(--ai-space-3);
}

.user-message .message-content {
  max-width: 70%;
  padding: var(--ai-space-4) var(--ai-space-5);
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.user-message .message-text {
  font-size: 15px;
  line-height: 1.6;
}

/* AI 消息 */
.ai-message {
  display: flex;
  gap: var(--ai-space-3);
}

.message-body {
  flex: 1;
  max-width: calc(100% - 60px);
}

/* 思考过程 */
.reasoning-box {
  margin-bottom: var(--ai-space-3);
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--ai-radius-lg);
  overflow: hidden;
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  padding: var(--ai-space-2) var(--ai-space-4);
  font-size: 13px;
  color: #059669;
  cursor: pointer;
  transition: background var(--ai-transition-fast);
}

.reasoning-header:hover {
  background: #dcfce7;
}

.reasoning-icon {
  font-size: 14px;
}

.reasoning-content {
  padding: 0 var(--ai-space-4) var(--ai-space-3);
  font-size: 13px;
  color: var(--ai-text-tertiary);
  font-style: italic;
  line-height: 1.7;
  white-space: pre-wrap;
}

/* 消息气泡 */
.message-bubble {
  padding: var(--ai-space-4) var(--ai-space-5);
  background: var(--ai-bg-card);
  border: 1px solid var(--ai-border-light);
  border-radius: 4px 18px 18px 18px;
  box-shadow: var(--ai-shadow-sm);
  font-size: 15px;
  line-height: 1.8;
  color: var(--ai-text-primary);
}

/* Markdown 样式 */
.message-bubble :deep(p) {
  margin: 0 0 12px;
}

.message-bubble :deep(p:last-child) {
  margin-bottom: 0;
}

.message-bubble :deep(pre) {
  background: #1e293b;
  border-radius: var(--ai-radius-md);
  padding: var(--ai-space-4);
  overflow-x: auto;
  margin: var(--ai-space-3) 0;
}

.message-bubble :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
}

.message-bubble :deep(pre code) {
  color: #e2e8f0;
  background: none;
  padding: 0;
}

.message-bubble :deep(:not(pre) > code) {
  background: var(--ai-gray-100);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--ai-primary-700);
}

.message-bubble :deep(ul),
.message-bubble :deep(ol) {
  margin: var(--ai-space-3) 0;
  padding-left: var(--ai-space-6);
}

.message-bubble :deep(li) {
  margin: var(--ai-space-1) 0;
}

.message-bubble :deep(blockquote) {
  margin: var(--ai-space-3) 0;
  padding: var(--ai-space-3) var(--ai-space-4);
  border-left: 4px solid var(--ai-primary-400);
  background: var(--ai-primary-50);
  border-radius: 0 var(--ai-radius-md) var(--ai-radius-md) 0;
  color: var(--ai-text-secondary);
}

/* 流式光标 */
.cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background: var(--ai-primary-500);
  margin-left: 4px;
  border-radius: 2px;
  animation: cursorBlink 1s step-end infinite;
  vertical-align: middle;
}

@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 操作按钮 */
.message-actions {
  display: flex;
  gap: var(--ai-space-2);
  margin-top: var(--ai-space-3);
  opacity: 0;
  transition: opacity var(--ai-transition-fast);
}

.message-wrapper:hover .message-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--ai-space-1);
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-md);
  font-size: 12px;
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.action-btn:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

/* 思考中占位 */
.thinking-placeholder {
  display: flex;
  gap: 6px;
  padding: var(--ai-space-4);
  align-items: center;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  background: var(--ai-primary-400);
  border-radius: 50%;
  animation: thinkingBounce 1.4s ease-in-out infinite;
}

.thinking-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinkingBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
