<!--
  MessageList - 消息列表组件（智能滚动版）
  
  滚动行为：
  - 用户发送新消息时，自动滚动到底部
  - AI 生成过程中，如果用户向上滚动查看历史，停止自动跟随
  - 用户可以随时手动点击"回到底部"按钮恢复跟随
  - 新消息到达时，只有用户已经在底部附近才自动滚动
-->
<template>
  <div ref="containerRef" class="message-list ai-scroll" @scroll="handleScroll">
    <!-- 欢迎页面 -->
    <div v-if="!sessionId || !messages[sessionId] || messages[sessionId].length === 0" class="welcome-page">
      <div class="welcome-logo">
        <div class="logo-bg"></div>
        <span class="logo-icon">✨</span>
      </div>
      <h1 class="welcome-title">
        <span class="gradient-text">AI 助手</span>
      </h1>
      <p class="welcome-desc">基于 DeepSeek 大模型，为您提供专业智能对话体验</p>
      <div class="quick-actions">
        <button
          v-for="action in quickActions"
          :key="action.text"
          class="quick-action-btn"
          @click="$emit('use-prompt', action.text)"
        >
          <span class="action-icon">{{ action.icon }}</span>
          <span class="action-text">{{ action.text }}</span>
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <MessageBubble
        v-for="(message, index) in messages[sessionId]"
        :key="message.id"
        :message="message"
        :is-streaming="isStreaming && index === messages[sessionId].length - 1"
        :is-last="index === messages[sessionId].length - 1"
        @regenerate="$emit('regenerate')"
      />
    </template>

    <!-- 滚动到底部按钮 -->
    <Transition name="fade">
      <button
        v-if="showScrollBtn"
        class="scroll-to-bottom"
        @click="scrollToBottom(true)"
      >
        <Icon name="chevron-down" :size="20" />
        <span v-if="isStreaming" class="new-messages-dot" />
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import MessageBubble from './MessageBubble.vue'
import { Icon } from '../ui'
import type { ChatMessage } from '../composables/types'

interface Props {
  // 直接传入 messages ref 和 sessionId，避免 computed 缓存问题
  messages: Record<string, ChatMessage[]>
  sessionId: string | null
  isStreaming: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'use-prompt': [text: string]
  regenerate: []
}>()

const containerRef = ref<HTMLElement>()
const showScrollBtn = ref(false)

// 关键：用户是否已手动向上滚动（脱离自动跟随模式）
const userScrolledUp = ref(false)

const quickActions = [
  { icon: '📝', text: '帮我写一篇技术博客' },
  { icon: '💻', text: '解释这段代码的作用' },
  { icon: '🐛', text: '帮我调试这个错误' },
  { icon: '📚', text: '总结这篇文章要点' }
]

// 检测是否在底部附近（50px 容差）
function isNearBottom(): boolean {
  const container = containerRef.value
  if (!container) return true
  
  const { scrollTop, scrollHeight, clientHeight } = container
  return scrollHeight - scrollTop - clientHeight < 50
}

// 滚动事件处理
let scrollTimeout: ReturnType<typeof setTimeout> | null = null
function handleScroll() {
  const container = containerRef.value
  if (!container) return
  
  // 清除之前的超时
  if (scrollTimeout) clearTimeout(scrollTimeout)
  
  const nearBottom = isNearBottom()
  
  // 更新按钮显示状态
  showScrollBtn.value = !nearBottom
  
  // 用户向上滚动时，标记为手动滚动模式
  if (!nearBottom) {
    userScrolledUp.value = true
  } else {
    // 用户回到底部，重置标记
    userScrolledUp.value = false
  }
}

function scrollToBottom(smooth = true) {
  const container = containerRef.value
  if (!container) return
  
  container.scrollTo({
    top: container.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
  
  // 重置用户滚动标记
  userScrolledUp.value = false
  showScrollBtn.value = false
}

// 监听消息数量变化（新消息到达）
watch(
  () => props.sessionId ? props.messages[props.sessionId]?.length : 0,
  (newLength, oldLength) => {
    if (newLength <= (oldLength || 0)) return
    
    nextTick(() => {
      // 只有用户没有手动向上滚动时才自动滚动
      if (!userScrolledUp.value) {
        scrollToBottom(false) // 新消息用即时滚动
      }
    })
  },
  { flush: 'post' }
)

// 监听 AI 生成内容变化
let contentUpdateTimeout: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.sessionId ? props.messages[props.sessionId]?.[props.messages[props.sessionId]?.length - 1]?.content : '',
  () => {
    // 只有 AI 在生成且用户没有手动向上滚动时才滚动
    if (!props.isStreaming || userScrolledUp.value) return
    
    // 使用 requestAnimationFrame 节流，避免过于频繁的滚动
    if (contentUpdateTimeout) return
    
    contentUpdateTimeout = setTimeout(() => {
      contentUpdateTimeout = null
      
      if (!userScrolledUp.value && isNearBottom()) {
        const container = containerRef.value
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      }
    }, 50)
  }
)

// 监听生成开始/结束
watch(() => props.isStreaming, (streaming, wasStreaming) => {
  // 生成开始时，如果用户在底部，保持跟随
  if (streaming && !wasStreaming) {
    userScrolledUp.value = false
    nextTick(() => {
      if (isNearBottom()) {
        scrollToBottom(false)
      }
    })
  }
  
  // 生成结束时，如果用户在底部，确保滚动到底部
  if (!streaming && wasStreaming) {
    nextTick(() => {
      if (!userScrolledUp.value) {
        scrollToBottom(true)
      }
    })
  }
})

defineExpose({
  scrollToBottom
})
</script>

<style scoped>

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--ai-space-6);
  position: relative;
  scroll-behavior: smooth;
}

/* 欢迎页面 */
.welcome-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
  animation: fadeInUp 0.5s ease;
}

.welcome-logo {
  position: relative;
  margin-bottom: var(--ai-space-6);
}

.logo-bg {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse 3s ease-in-out infinite;
}

.logo-icon {
  position: relative;
  font-size: 56px;
  filter: drop-shadow(0 4px 12px rgba(59, 130, 246, 0.3));
}

.welcome-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: var(--ai-space-3);
  color: var(--ai-text-primary);
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-desc {
  font-size: 15px;
  color: var(--ai-text-tertiary);
  margin-bottom: var(--ai-space-8);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--ai-space-3);
  max-width: 480px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  padding: var(--ai-space-4) var(--ai-space-5);
  background: var(--ai-bg-card);
  border: 1px solid var(--ai-border-light);
  border-radius: var(--ai-radius-lg);
  text-align: left;
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.quick-action-btn:hover {
  border-color: var(--ai-border-focus);
  box-shadow: var(--ai-shadow-glow);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 20px;
}

.action-text {
  font-size: 14px;
  color: var(--ai-text-primary);
}

/* 滚动到底部按钮 */
.scroll-to-bottom {
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ai-bg-card);
  border: 1px solid var(--ai-border-light);
  border-radius: var(--ai-radius-full);
  box-shadow: var(--ai-shadow-lg);
  color: var(--ai-text-secondary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
  z-index: 10;
}

.scroll-to-bottom:hover {
  background: var(--ai-primary-50);
  border-color: var(--ai-primary-200);
  color: var(--ai-primary-600);
  transform: translateY(-2px);
}

.new-messages-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: #10b981;
  border-radius: 50%;
  border: 2px solid white;
  animation: pulse 1.5s ease-in-out infinite;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--ai-transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

@media (max-width: 640px) {
  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>
