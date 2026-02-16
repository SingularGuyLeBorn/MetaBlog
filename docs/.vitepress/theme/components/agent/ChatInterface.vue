<script setup lang="ts">
/**
 * ChatInterface - 聊天界面组件
 * AIChatOrb 的子组件
 */
import { ref, computed, nextTick, watch } from 'vue'
import type { ChatMessage, AgentState } from '../../../agent/core/types'
import { CostTracker } from '../../../agent/runtime/CostTracker'

interface Props {
  messages: ChatMessage[]
  isProcessing: boolean
  state: AgentState
}

const props = defineProps<Props>()
const emit = defineEmits(['send', 'clear', 'close', 'minimize'])

const inputText = ref('')
const isMinimized = ref(false)
const messagesContainer = ref<HTMLElement>()

// 快捷操作
const quickActions = [
  { icon: '📝', label: '续写', prompt: '基于当前文章续写下一节' },
  { icon: '🔍', label: '搜索', prompt: '搜索相关最新资料' },
  { icon: '📊', label: '总结', prompt: '为当前文章生成摘要' }
]

// 状态文本
const stateText = computed(() => {
  const map: Record<AgentState, string> = {
    'IDLE': '就绪',
    'UNDERSTANDING': '思考中...',
    'PLANNING': '规划中...',
    'EXECUTING': '执行中...',
    'WAITING_INPUT': '等待输入',
    'PAUSED': '已暂停',
    'COMPLETED': '已完成',
    'ERROR': '发生错误'
  }
  return map[props.state]
})

// 监听消息变化，自动滚动
watch(() => props.messages.length, () => {
  scrollToBottom()
})

function sendMessage() {
  const text = inputText.value.trim()
  if (!text || props.isProcessing) return
  
  emit('send', text)
  inputText.value = ''
}

function executeQuickAction(action: typeof quickActions[0]) {
  emit('send', action.prompt)
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCost(cost: number): string {
  return CostTracker.formatCost(cost)
}
</script>

<template>
  <div class="chat-interface" :class="{ minimized: isMinimized }">
    <!-- Header -->
    <div class="chat-header">
      <div class="header-left">
        <span class="state-indicator" :class="state.toLowerCase()"></span>
        <div class="header-info">
          <span class="agent-name">MetaUniverse Agent</span>
          <span class="agent-state">{{ stateText }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="isMinimized = !isMinimized">
          {{ isMinimized ? '□' : '—' }}
        </button>
        <button class="action-btn" @click="emit('clear')">🗑</button>
        <button class="action-btn close" @click="emit('close')">×</button>
      </div>
    </div>

    <!-- Messages -->
    <div v-show="!isMinimized" ref="messagesContainer" class="messages-container">
      <div 
        v-for="msg in messages" 
        :key="msg.id"
        class="message"
        :class="msg.role"
      >
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
        <div class="content">
          <div class="text" v-html="msg.content.replace(/\n/g, '<br>')"></div>
          <div class="meta">
            <span class="time">{{ formatTime(msg.timestamp) }}</span>
            <span v-if="msg.metadata?.cost" class="cost">
              {{ formatCost(msg.metadata.cost) }}
            </span>
            <span v-if="msg.metadata?.tokens" class="tokens">
              {{ msg.metadata.tokens }} tokens
            </span>
          </div>
        </div>
      </div>

      <!-- Processing -->
      <div v-if="isProcessing" class="message assistant processing">
        <div class="avatar">🤖</div>
        <div class="content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div v-show="!isMinimized" class="quick-actions">
      <button 
        v-for="action in quickActions" 
        :key="action.label"
        class="quick-action-btn"
        @click="executeQuickAction(action)"
      >
        {{ action.icon }} {{ action.label }}
      </button>
    </div>

    <!-- Input -->
    <div v-show="!isMinimized" class="input-area">
      <textarea
        v-model="inputText"
        placeholder="输入指令..."
        rows="2"
        @keydown.enter.prevent="sendMessage"
      />
      <button 
        class="send-btn"
        :disabled="!inputText.trim() || isProcessing"
        @click="sendMessage"
      >
        发送
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-interface {
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.chat-interface.minimized {
  height: auto;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.state-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #52c41a;
}

.state-indicator.understanding,
.state-indicator.executing {
  background: #1890ff;
  animation: blink 1s infinite;
}

.state-indicator.paused,
.state-indicator.waiting_input {
  background: #faad14;
}

.state-indicator.error {
  background: #f5222d;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.header-info {
  display: flex;
  flex-direction: column;
}

.agent-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-text);
}

.agent-state {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text);
}

.action-btn.close:hover {
  background: #ff4d4f;
  color: white;
}

/* Messages */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 300px;
}

.message {
  display: flex;
  gap: 10px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.content {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--vp-c-bg-alt);
}

.message.user .content {
  background: var(--vp-c-brand);
  color: white;
}

.text {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  font-size: 10px;
  opacity: 0.6;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--vp-c-text-3);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid var(--vp-c-divider);
  overflow-x: auto;
}

.quick-action-btn {
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 16px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

/* Input Area */
.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider);
}

.input-area textarea {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  font-size: 13px;
  resize: none;
  outline: none;
}

.input-area textarea:focus {
  border-color: var(--vp-c-brand);
}

.send-btn {
  padding: 0 16px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
