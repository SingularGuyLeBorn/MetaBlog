<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div v-if="visible" class="chat-overlay" @click="handleOverlayClick">
        <Transition name="dialog">
          <div v-if="visible" class="chat-dialog" @click.stop>
            <!-- 头部 -->
            <div class="dialog-header">
              <div class="agent-info">
                <div class="agent-avatar">
                  <span>{{ agent?.avatar || '🤖' }}</span>
                  <div v-if="agent?.status === 'online'" class="status-dot" />
                </div>
                <div class="agent-meta">
                  <div class="agent-name">{{ agent?.name || 'AI 助手' }}</div>
                  <div class="agent-status">
                    <span class="status-text">{{ statusText }}</span>
                  </div>
                </div>
              </div>
              <div class="header-actions">
                <button class="action-btn" @click="expandToFull" title="展开">
                  <Icon name="maximize" />
                </button>
                <button class="action-btn close" @click="close" title="关闭">
                  <Icon name="x" />
                </button>
              </div>
            </div>

            <!-- 聊天区域 -->
            <div class="chat-area" ref="chatContainerRef">
              <div class="messages">
                <div
                  v-for="(msg, idx) in messages"
                  :key="msg.id"
                  class="message"
                  :class="msg.role"
                >
                  <div class="message-avatar">
                    {{ msg.role === 'user' ? '👤' : (agent?.avatar || '🤖') }}
                  </div>
                  <div class="message-bubble">
                    <div class="message-text" v-html="formatMessage(msg.content)"></div>
                    <div v-if="msg.isThinking" class="thinking">
                      <span class="thinking-dot"></span>
                      <span class="thinking-dot"></span>
                      <span class="thinking-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 输入区域 -->
            <div class="input-area">
              <div class="input-wrapper">
                <textarea
                  v-model="inputMessage"
                  :disabled="loading"
                  :placeholder="`给 ${agent?.name || 'AI'} 发送消息...`"
                  class="message-input"
                  rows="1"
                  @keydown.enter.prevent="handleSend"
                ></textarea>
                <button 
                  class="send-btn"
                  :disabled="!inputMessage.trim() || loading"
                  @click="handleSend"
                >
                  <Icon v-if="!loading" name="send" />
                  <span v-else class="stop-icon" @click.stop="handleStop">■</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Agent } from '../../../core/types/agent'
import Icon from '../../../shared/Icon.vue'

interface DialogMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  isThinking?: boolean
  isError?: boolean
}

const props = defineProps<{
  visible: boolean
  agent: Agent | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'expand': [agent: Agent, messages: DialogMessage[]]
}>()

const inputMessage = ref('')
const messages = ref<DialogMessage[]>([])
const loading = ref(false)
const chatContainerRef = ref<HTMLElement>()

const statusText = computed(() => {
  if (!props.agent) return '离线'
  const statusMap: Record<string, string> = {
    'online': '在线',
    'busy': '忙碌',
    'offline': '离线',
    'error': '错误'
  }
  return statusMap[props.agent.status] || '未知'
})

// 当对话框打开时，初始化消息
watch(() => props.visible, (val) => {
  if (val && props.agent) {
    if (messages.value.length === 0) {
      messages.value.push({
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `你好！我是 ${props.agent.name}。${props.agent.description || '有什么我可以帮您的吗？'}`
      })
    }
  }
})

// 监听消息变化，自动滚动到底部
watch(() => messages.value.length, () => {
  nextTick(() => scrollToBottom())
})

function scrollToBottom() {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

function formatMessage(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// 发送消息
async function handleSend() {
  if (!inputMessage.value.trim() || !props.agent || loading.value) return

  const content = inputMessage.value.trim()
  inputMessage.value = ''

  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content
  })

  const thinkingId = `thinking-${Date.now()}`
  messages.value.push({
    id: thinkingId,
    role: 'assistant',
    content: '',
    isThinking: true
  })

  loading.value = true

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.filter(m => !m.isThinking).map(m => ({ role: m.role, content: m.content })),
        sessionId: `dialog-${props.agent.id}`,
        config: {
          model: 'deepseek-chat',
          temperature: 0.7,
          systemPrompt: props.agent.capabilities?.customSystemPrompt || `你是 ${props.agent.name}，${props.agent.description}`
        }
      })
    })

    if (!response.ok) throw new Error('请求失败')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    const thinkingIndex = messages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex > -1) messages.value.splice(thinkingIndex, 1)

    const responseId = `assistant-${Date.now()}`
    messages.value.push({ id: responseId, role: 'assistant', content: '' })

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ''
              fullContent += content

              const msgIndex = messages.value.findIndex(m => m.id === responseId)
              if (msgIndex > -1) messages.value[msgIndex].content = fullContent
            } catch (e) {}
          }
        }
      }
    }
  } catch (error) {
    const thinkingIndex = messages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex > -1) messages.value.splice(thinkingIndex, 1)

    messages.value.push({
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: '抱歉，发生了错误，请稍后重试。',
      isError: true
    })
  } finally {
    loading.value = false
  }
}

function handleStop() {
  loading.value = false
}

function expandToFull() {
  if (!props.agent) return
  emit('expand', props.agent, messages.value)
  emit('update:visible', false)
}

function close() {
  emit('update:visible', false)
}

function handleOverlayClick() {
  close()
}
</script>

<style scoped>
/* ===== Overlay ===== */
.chat-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(12px);
  z-index: 1000;
  padding: 20px;
}

/* ===== Dialog ===== */
.chat-dialog {
  width: 100%;
  max-width: 600px;
  height: 70vh;
  max-height: 650px;
  background: #ffffff;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 
    0 25px 80px rgba(0,0,0,0.25),
    0 0 0 1px rgba(255,255,255,0.5);
}

/* ===== Header ===== */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #faf8ff, #ffffff);
  border-bottom: 1px solid #e2e8f0;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.agent-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(139,92,246,0.2);
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
}

.agent-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.agent-status {
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.action-btn:hover {
  background: #ede9fe;
  border-color: #8b5cf6;
  color: #7c3aed;
}

.action-btn.close:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* ===== Chat Area ===== */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f8fafc;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  animation: messageEnter 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
  opacity: 0;
  transform: translateY(10px);
}

@keyframes messageEnter {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #ffffff;
  border-radius: 10px;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.message-bubble {
  max-width: 75%;
  padding: 14px 18px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.message.assistant .message-bubble {
  background: #ffffff;
  color: #1e293b;
  border-bottom-left-radius: 6px;
}

.message.user .message-bubble {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border-bottom-right-radius: 6px;
}

.message-text code {
  padding: 2px 6px;
  background: rgba(0,0,0,0.06);
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.message.user .message-text code {
  background: rgba(255,255,255,0.2);
}

/* Thinking Animation */
.thinking {
  display: flex;
  gap: 4px;
  padding: 8px 0 4px;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  background: #94a3b8;
  border-radius: 50%;
  animation: thinking 1.4s infinite ease-in-out;
}

.thinking-dot:nth-child(1) { animation-delay: 0s; }
.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinking {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ===== Input Area ===== */
.input-area {
  padding: 20px 24px 24px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  min-height: 48px;
  max-height: 120px;
  padding: 12px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  color: #1e293b;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: all 150ms ease-out;
}

.message-input::placeholder {
  color: #94a3b8;
}

.message-input:hover {
  border-color: #cbd5e1;
}

.message-input:focus {
  border-color: #8b5cf6;
  box-shadow: 0 0 0 3px #ede9fe;
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  border: none;
  border-radius: 16px;
  color: white;
  cursor: pointer;
  transition: all 100ms ease-out;
  box-shadow: 0 4px 12px rgba(139,92,246,0.25);
  flex-shrink: 0;
}

.send-btn svg {
  width: 20px;
  height: 20px;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139,92,246,0.35);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-icon {
  font-size: 12px;
  font-weight: 700;
}

/* ===== Transitions ===== */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 200ms ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.dialog-enter-active {
  transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog-leave-active {
  transition: all 200ms ease;
}

.dialog-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.dialog-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* ===== Responsive ===== */
@media (max-width: 640px) {
  .chat-dialog {
    max-width: 100%;
    height: 85vh;
    border-radius: 20px;
  }

  .dialog-header {
    padding: 16px 20px;
  }

  .message-bubble {
    max-width: 85%;
  }
}
</style>
