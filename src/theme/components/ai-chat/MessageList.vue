<!--
  MessageList - 消息列表组件(Star River 风格)
-->
<template>
  <div class="message-list-wrapper">
    <div ref="containerRef" class="message-list" @scroll="handleScroll">
      <!-- 欢迎页面 -->
      <div v-if="!sessionId || messages.length === 0" class="welcome-page">
        <!-- 背景光效 -->
        <div class="welcome-bg-effects">
          <div class="bg-orb orb-1"></div>
          <div class="bg-orb orb-2"></div>
          <div class="bg-orb orb-3"></div>
        </div>
        
        <div class="welcome-logo">
          <div class="logo-glow"></div>
          <div class="logo-ring ring-1"></div>
          <div class="logo-ring ring-2"></div>
          <span class="logo-icon">✨</span>
        </div>
        <h1 class="welcome-title">
          <span class="gradient-text">AI 助手</span>
        </h1>
        <p class="welcome-desc">基于 DeepSeek 大模型,为您提供专业智能对话体验</p>
        <!-- 快捷提示已移除 -->
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
    </div>

    <!-- 滚动到底部按钮（固定在视口，不随消息滚动） -->
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
import { Icon } from '@/theme/components/common'
import type { ChatMessage, MessageGroup } from '@/theme/types'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'

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
  'active-message-change': [messageId: string]
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
const activeMessageId = ref('')

// IntersectionObserver 追踪消息可见性
let messageObserver: IntersectionObserver | null = null
let observedElements = new Map<Element, string>()

function setupMessageObserver() {
  if (!containerRef.value) return
  if (messageObserver) messageObserver.disconnect()
  observedElements.clear()

  messageObserver = new IntersectionObserver(
    (entries) => {
      // 找出最可见的元素(相交比例最大的)
      let maxRatio = 0
      let mostVisibleId = ''
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio
          mostVisibleId = observedElements.get(entry.target) || ''
        }
      }
      if (mostVisibleId && mostVisibleId !== activeMessageId.value) {
        activeMessageId.value = mostVisibleId
        emit('active-message-change', mostVisibleId)
      }
    },
    {
      root: containerRef.value,
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    }
  )

  // 观察所有消息元素
  const wrappers = containerRef.value.querySelectorAll('.message-wrapper')
  for (const el of wrappers) {
    const id = el.getAttribute('id')?.replace('msg-', '')
    if (id) {
      observedElements.set(el, id)
      messageObserver.observe(el)
    }
  }
}

function teardownMessageObserver() {
  messageObserver?.disconnect()
  messageObserver = null
  observedElements.clear()
}


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

onMounted(() => {
  nextTick(() => setupMessageObserver())
})

onUnmounted(() => {
  teardownMessageObserver()
})

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

function scrollToMessage(messageId: string) {
  const el = document.getElementById('msg-' + messageId)
  const container = containerRef.value
  if (el && container) {
    const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
}

watch(
  () => props.messages.length,
  (newLength, oldLength) => {
    if (newLength <= (oldLength || 0)) return

    nextTick(() => {
      if (!userScrolledUp.value) {
        scrollToBottom(false)
      }
      // 消息变化后重新观察
      setupMessageObserver()
    })
  },
  { flush: 'post' }
)

let contentUpdateTimeout: ReturnType<typeof setTimeout> | null = null
let scrollRafId: number | null = null
watch(
  () => props.messages[props.messages.length - 1]?.content || '',
  () => {
    if (!props.isStreaming || userScrolledUp.value) return

    if (contentUpdateTimeout) return

    contentUpdateTimeout = setTimeout(() => {
      contentUpdateTimeout = null

      if (!userScrolledUp.value && isNearBottom()) {
        if (scrollRafId) cancelAnimationFrame(scrollRafId)
        scrollRafId = requestAnimationFrame(() => {
          scrollRafId = null
          const container = containerRef.value
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        })
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

defineExpose({ scrollToBottom, scrollToMessage })
</script>

<style scoped>
.message-list-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
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
  background: radial-gradient(circle, rgba(179, 168, 184, 0.18), transparent 70%);
  top: 20%;
  left: 20%;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(154, 168, 179, 0.14), transparent 70%);
  bottom: 30%;
  right: 20%;
  animation-delay: -3s;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(212, 196, 176, 0.12), transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -6s;
}

@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.1); }
}

/* Logo */
.welcome-logo {
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
  background: radial-gradient(circle, rgba(179, 168, 184, 0.2) 0%, transparent 70%);
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
  border-color: rgba(179, 168, 184, 0.35);
  animation: spin 15s linear infinite;
}

.ring-2 {
  inset: -20px;
  border-color: rgba(154, 168, 179, 0.25);
  animation: spin-reverse 20s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes spin-reverse { to { transform: rotate(-360deg); } }

.logo-icon {
  position: relative;
  font-size: 64px;
  filter: drop-shadow(0 4px 20px rgba(184, 160, 144, 0.25));
  animation: icon-float 3s ease-in-out infinite;
  z-index: 1;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.welcome-title {
  font-size: 42px;
  font-weight: 300;
  margin-bottom: 16px;
  color: var(--sr-text-primary, #2d2a26);
  position: relative;
  z-index: 1;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, var(--sr-morandi-purple, #b3a8b8) 0%, var(--sr-morandi-warm, #d4c4b0) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 12px rgba(179, 168, 184, 0.15));
}

.welcome-desc {
  font-size: 16px;
  color: var(--sr-text-secondary, #6a6560);
  margin-bottom: 40px;
  max-width: 400px;
  position: relative;
  z-index: 1;
  font-weight: 400;
}

/* 快捷操作按钮 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 520px;
  position: relative;
  z-index: 1;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s ease;
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

.quick-action-btn:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.action-icon {
  font-size: 24px;
  transition: transform 0.3s ease;
}

.quick-action-btn:hover .action-icon {
  transform: scale(1.1);
}

.action-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--sr-text-primary, #2d2a26);
}

/* 滚动到底部按钮 */
.scroll-to-bottom {
  position: absolute;
  bottom: 28px;
  right: 28px;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 50%;
  color: var(--sr-text-muted, #9a9588);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.scroll-to-bottom:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: var(--sr-text-secondary, #6a6560);
}

.new-messages-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: var(--sr-morandi-warm, #d4c4b0);
  border-radius: 50%;
  border: 2px solid var(--sr-bg-primary, #f8f6f3);
  animation: pulse-dot 1.5s ease-in-out infinite;
  border: 2px solid var(--sr-bg-primary, #f8f6f3);
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
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
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .welcome-title {
    font-size: 32px;
  }
  
  .logo-icon {
    font-size: 48px;
  }
  
  .welcome-logo {
    width: 100px;
    height: 100px;
  }
}
</style>
