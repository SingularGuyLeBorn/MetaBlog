<!--
  AgentChatDialog - Agent 简易聊天对话框
  
  功能：
  - 浮层形式的简易聊天界面
  - 快速与 Agent 对话
  - 可展开到完整聊天界面
-->
<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="agent-chat-dialog-overlay" @click.self="handleClose">
        <div class="agent-chat-dialog" :class="{ 'is-loading': isLoading }">
          <!-- 头部 -->
          <div class="dialog-header">
            <div class="agent-info">
              <span class="agent-avatar">{{ agent?.avatar || '🤖' }}</span>
              <div class="agent-meta">
                <h4 class="agent-name">{{ agent?.name || 'Agent' }}</h4>
                <span class="agent-status" :class="agent?.status">
                  {{ statusText }}
                </span>
              </div>
            </div>
            <div class="header-actions">
              <button class="btn-expand" @click="handleExpand" title="展开到完整界面">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </button>
              <button class="btn-close" @click="handleClose" title="关闭">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 消息区域 -->
          <div ref="messagesRef" class="dialog-messages">
            <!-- 欢迎消息 -->
            <div class="message system">
              <div class="message-content">
                <p>你好！我是 {{ agent?.name }}，{{ agent?.description || '有什么可以帮你的吗？' }}</p>
              </div>
            </div>
            
            <!-- 消息列表 -->
            <div 
              v-for="(msg, idx) in messages" 
              :key="idx"
              class="message"
              :class="[msg.role, { 'is-streaming': msg.isStreaming }]"
            >
              <div class="message-avatar">
                {{ msg.role === 'user' ? '👤' : (agent?.avatar || '🤖') }}
              </div>
              <div class="message-content">
                <div class="message-text" v-html="formatMessage(msg.content)"></div>
                <div v-if="msg.isStreaming" class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 输入区域 -->
          <div class="dialog-input-area">
            <div class="input-wrap">
              <textarea
                ref="inputRef"
                v-model="inputMessage"
                :disabled="isLoading"
                :placeholder="isLoading ? '思考中...' : '输入消息...'"
                @keydown.enter.prevent="handleSend"
                rows="1"
              ></textarea>
              <button 
                class="btn-send"
                :disabled="!inputMessage.trim() || isLoading"
                @click="handleSend"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Agent } from '../../types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

const props = defineProps<{
  visible: boolean
  agent: Agent | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'expand': [agent: Agent, messages: Message[]]
}>()

// 状态
const messages = ref<Message[]>([])
const inputMessage = ref('')
const isLoading = ref(false)
const messagesRef = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()

// 计算属性
const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌'
  }
  return statusMap[props.agent?.status || 'offline'] || '离线'
})

// 方法
function handleClose() {
  emit('update:visible', false)
}

function handleExpand() {
  if (props.agent) {
    emit('expand', props.agent, messages.value)
  }
  handleClose()
}

async function handleSend() {
  const content = inputMessage.value.trim()
  if (!content || isLoading.value || !props.agent) return
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content
  })
  
  inputMessage.value = ''
  isLoading.value = true
  
  // 添加助手消息（流式）
  const assistantMsg: Message = {
    role: 'assistant',
    content: '',
    isStreaming: true
  }
  messages.value.push(assistantMsg)
  
  await nextTick()
  scrollToBottom()
  
  // 模拟 AI 回复（实际项目中应该调用 API）
  setTimeout(() => {
    assistantMsg.content = `我是 ${props.agent?.name}，收到你的消息："${content}"`
    assistantMsg.isStreaming = false
    isLoading.value = false
    nextTick(scrollToBottom)
  }, 1000)
}

function scrollToBottom() {
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

function formatMessage(content: string): string {
  // 简单的 Markdown 格式化
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

// 监听 visible 变化
watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      inputRef.value?.focus()
      scrollToBottom()
    })
  }
})
</script>

<style scoped>
.agent-chat-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.agent-chat-dialog {
  width: 100%;
  max-width: 480px;
  height: 600px;
  max-height: 80vh;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* 头部 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--vp-c-bg-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.agent-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.agent-status {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.agent-status.online {
  color: var(--vp-c-green);
}

.agent-status.busy {
  color: var(--vp-c-yellow);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-expand,
.btn-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-expand:hover,
.btn-close:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.btn-expand svg,
.btn-close svg {
  width: 18px;
  height: 18px;
}

/* 消息区域 */
.dialog-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.message-content {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.6;
}

.message.user .message-content {
  background: var(--vp-c-brand);
  color: white;
}

.message.system .message-content {
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  text-align: center;
  max-width: 100%;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}

/* 输入区域 */
.dialog-input-area {
  padding: 16px 20px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.input-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: var(--vp-c-bg-mute);
  border-radius: 12px;
  padding: 8px 12px;
}

.input-wrap textarea {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 120px;
  min-height: 24px;
  outline: none;
}

.input-wrap textarea::placeholder {
  color: var(--vp-c-text-3);
}

.btn-send {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--vp-c-brand);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-send:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-send svg {
  width: 16px;
  height: 16px;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.4;
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
  30% { transform: translateY(-4px); }
}

/* 过渡动画 */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-active .agent-chat-dialog,
.dialog-fade-leave-active .agent-chat-dialog {
  transition: transform 0.3s ease;
}

.dialog-fade-enter-from .agent-chat-dialog,
.dialog-fade-leave-to .agent-chat-dialog {
  transform: scale(0.95);
}

/* 响应式 */
@media (max-width: 520px) {
  .agent-chat-dialog {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .agent-chat-dialog-overlay {
    padding: 0;
  }
}
</style>
