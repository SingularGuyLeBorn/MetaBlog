<!--
  MessageList - 消息列表组件（3D 液态玻璃风格）
-->
<template>
  <div ref="containerRef" class="message-list-3d" @scroll="handleScroll">
    <!-- 欢迎页面 -->
    <div v-if="!sessionId || messages.length === 0" class="welcome-page-3d">
      <!-- 背景光效 -->
      <div class="welcome-bg-effects">
        <div class="bg-orb orb-1"></div>
        <div class="bg-orb orb-2"></div>
        <div class="bg-orb orb-3"></div>
      </div>
      
      <div class="welcome-logo-3d">
        <div class="logo-glow"></div>
        <div class="logo-ring ring-1"></div>
        <div class="logo-ring ring-2"></div>
        <span class="logo-icon">✨</span>
      </div>
      <h1 class="welcome-title-3d">
        <span class="gradient-text-3d">AI 助手</span>
      </h1>
      <p class="welcome-desc-3d">基于 DeepSeek 大模型，为您提供专业智能对话体验</p>
      <div class="quick-actions-3d">
        <button
          v-for="(action, index) in quickActions"
          :key="action.text"
          class="quick-action-btn-3d"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="$emit('use-prompt', action.text)"
        >
          <span class="action-icon-3d">{{ action.icon }}</span>
          <span class="action-text">{{ action.text }}</span>
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <MessageBubble
        v-for="(message, index) in messages"
        :key="message.id"
        :message="message"
        :is-streaming="isStreaming && index === messages.length - 1"
        :is-last="index === messages.length - 1"
        :versions="getMessageVersions(message)"
        @regenerate="$emit('regenerate')"
        @switch-version="$emit('switch-version', $event.userMessageId, $event.versionIndex)"
      />
    </template>

    <!-- 滚动到底部按钮 -->
    <Transition name="fade-3d">
      <button
        v-if="showScrollBtn"
        class="scroll-to-bottom-3d"
        @click="scrollToBottom(true)"
      >
        <Icon name="chevron-down" :size="20" />
        <span v-if="isStreaming" class="new-messages-dot-3d" />
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import MessageBubble from './MessageBubble.vue'
import { Icon } from '../../../../shared/components'
import type { ChatMessage, MessageGroup } from '../../../core/types'

interface Props {
  messages: ChatMessage[]
  messageGroups: MessageGroup[]
  sessionId: string | null
  isStreaming: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'use-prompt': [text: string]
  regenerate: []
  'switch-version': [userMessageId: string, versionIndex: number]
}>()

const getMessageVersions = (message: ChatMessage) => {
  if (message.role !== 'assistant' || !message.parentMessageId) return null
  
  const group = props.messageGroups.find(g => g.userMessage.id === message.parentMessageId)
  if (!group || group.aiVersions.length <= 1) return null
  
  return {
    versions: group.aiVersions,
    currentIndex: group.currentVersionIndex,
    userMessageId: group.userMessage.id
  }
}

const containerRef = ref<HTMLElement>()
const showScrollBtn = ref(false)
const userScrolledUp = ref(false)

const quickActions = [
  { icon: '📝', text: '帮我写一篇技术博客' },
  { icon: '💻', text: '解释这段代码的作用' },
  { icon: '🐛', text: '帮我调试这个错误' },
  { icon: '📚', text: '总结这篇文章要点' }
]

function isNearBottom(): boolean {
  const container = containerRef.value
  if (!container) return true
  
  const { scrollTop, scrollHeight, clientHeight } = container
  return scrollHeight - scrollTop - clientHeight < 50
}

let scrollTimeout: ReturnType<typeof setTimeout> | null = null
function handleScroll() {
  const container = containerRef.value
  if (!container) return
  
  if (scrollTimeout) clearTimeout(scrollTimeout)
  
  const nearBottom = isNearBottom()
  showScrollBtn.value = !nearBottom
  
  if (!nearBottom) {
    userScrolledUp.value = true
  } else {
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
  
  userScrolledUp.value = false
  showScrollBtn.value = false
}

watch(
  () => props.messages.length,
  (newLength, oldLength) => {
    if (newLength <= (oldLength || 0)) return
    
    nextTick(() => {
      if (!userScrolledUp.value) {
        scrollToBottom(false)
      }
    })
  },
  { flush: 'post' }
)

let contentUpdateTimeout: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.messages[props.messages.length - 1]?.content || '',
  () => {
    if (!props.isStreaming || userScrolledUp.value) return
    
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

watch(() => props.isStreaming, (streaming, wasStreaming) => {
  if (streaming && !wasStreaming) {
    userScrolledUp.value = false
    nextTick(() => {
      if (isNearBottom()) {
        scrollToBottom(false)
      }
    })
  }
  
  if (!streaming && wasStreaming) {
    nextTick(() => {
      if (!userScrolledUp.value) {
        scrollToBottom(true)
      }
    })
  }
})

defineExpose({ scrollToBottom })
</script>

<style scoped>
.message-list-3d {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  position: relative;
  scroll-behavior: smooth;
}

/* 3D 欢迎页面 */
.welcome-page-3d {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
  position: relative;
  animation: fadeInUp 0.6s ease;
}

/* 背景光效 */
.welcome-bg-effects {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.4;
  animation: orb-float 8s ease-in-out infinite;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(107, 231, 142, 0.2), transparent 70%);
  top: 20%;
  left: 20%;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(255, 31, 34, 0.15), transparent 70%);
  bottom: 30%;
  right: 20%;
  animation-delay: -3s;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(107, 231, 142, 0.15), transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -6s;
}

@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.1); }
}

/* 3D Logo */
.welcome-logo-3d {
  position: relative;
  margin-bottom: 32px;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(107, 231, 142, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  animation: pulse-glow 3s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.logo-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px dashed;
}

.ring-1 {
  inset: -10px;
  border-color: rgba(107, 231, 142, 0.3);
  animation: spin 15s linear infinite;
}

.ring-2 {
  inset: -20px;
  border-color: rgba(255, 31, 34, 0.2);
  animation: spin-reverse 20s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spin-reverse { to { transform: rotate(-360deg); } }

.logo-icon {
  position: relative;
  font-size: 64px;
  filter: drop-shadow(0 4px 20px rgba(107, 231, 142, 0.4));
  animation: icon-float 3s ease-in-out infinite;
  z-index: 1;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.welcome-title-3d {
  font-size: 42px;
  font-weight: 800;
  margin-bottom: 16px;
  color: #1e293b;
  position: relative;
  z-index: 1;
}

.gradient-text-3d {
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 12px rgba(16, 185, 129, 0.1));
}

.welcome-desc-3d {
  font-size: 16px;
  color: #64748b;
  margin-bottom: 40px;
  max-width: 400px;
  position: relative;
  z-index: 1;
  font-weight: 500;
}

/* 3D 快捷操作按钮 */
.quick-actions-3d {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 520px;
  position: relative;
  z-index: 1;
}

.quick-action-btn-3d {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  animation: card-fade-in 0.5s ease backwards;
}

@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quick-action-btn-3d:hover {
  border-color: rgba(59, 130, 246, 0.4);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 12px 30px rgba(59, 130, 246, 0.1), inset 0 0 16px rgba(59, 130, 246, 0.05);
  transform: translateY(-4px) rotateX(5deg);
}

.action-icon-3d {
  font-size: 24px;
  transition: transform 0.3s ease;
}

.quick-action-btn-3d:hover .action-icon-3d {
  transform: scale(1.2) rotate(10deg);
}

.action-text {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

/* 3D 滚动到底部按钮 */
.scroll-to-bottom-3d {
  position: absolute;
  bottom: 28px;
  right: 28px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.scroll-to-bottom-3d:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.4);
  color: #3b82f6;
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(59, 130, 246, 0.15), inset 0 0 12px rgba(59, 130, 246, 0.05);
}

.new-messages-dot-3d {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: #6BE78E;
  border-radius: 50%;
  border: 2px solid #000B1A;
  animation: pulse-dot 1.5s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(107, 231, 142, 0.5);
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

/* 过渡动画 */
.fade-3d-enter-active,
.fade-3d-leave-active {
  transition: all 0.3s ease;
}

.fade-3d-enter-from,
.fade-3d-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .quick-actions-3d {
    grid-template-columns: 1fr;
  }
  
  .welcome-title-3d {
    font-size: 32px;
  }
  
  .logo-icon {
    font-size: 48px;
  }
  
  .welcome-logo-3d {
    width: 100px;
    height: 100px;
  }
}
</style>
