<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="agent-chat-dialog-overlay" @click="handleOverlayClick">
        <Transition name="dialog-scale">
          <div v-if="visible" class="agent-chat-dialog" :class="{ 'expanding': isExpanding }" @click.stop>
            <!-- 头部 -->
            <div class="dialog-header">
              <div class="agent-info">
                <div class="agent-avatar">{{ agent?.avatar || '🤖' }}</div>
                <div class="agent-meta">
                  <div class="agent-name">{{ agent?.name || 'AI 助手' }}</div>
                  <div class="agent-status">
                    <span class="status-dot" :class="agent?.status"></span>
                    <span class="status-text">{{ statusText }}</span>
                  </div>
                </div>
              </div>
              <div class="header-actions">
                <button 
                  class="expand-btn" 
                  @click="expandToFull"
                  title="展开到 AI 助手"
                >
                  <span class="expand-icon">↗</span>
                  <span class="expand-text">展开</span>
                </button>
                <button class="close-btn" @click="close" title="关闭">×</button>
              </div>
            </div>

            <!-- 聊天区域 -->
            <div class="dialog-chat-container" ref="chatContainerRef">
              <div class="messages-wrapper">
                <div
                  v-for="msg in messages"
                  :key="msg.id"
                  class="message"
                  :class="msg.role"
                >
                  <div class="message-avatar">
                    {{ msg.role === 'user' ? '👤' : (agent?.avatar || '🤖') }}
                  </div>
                  <div class="message-content">
                    <div class="message-text" v-html="formatMessage(msg.content)"></div>
                    <div v-if="msg.isThinking" class="thinking-indicator">
                      <span class="dot"></span>
                      <span class="dot"></span>
                      <span class="dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 输入区域 -->
            <div class="dialog-input-area">
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
                  <span v-if="loading" class="stop-icon" @click.stop="handleStop">■</span>
                  <span v-else>➤</span>
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
const isExpanding = ref(false)
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
    // 初始化空消息或加载该 agent 的会话
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
  nextTick(() => {
    scrollToBottom()
  })
})

function scrollToBottom() {
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
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

// 发送消息
async function handleSend() {
  if (!inputMessage.value.trim() || !props.agent || loading.value) return

  const content = inputMessage.value.trim()
  inputMessage.value = ''

  // 添加用户消息
  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content
  })

  // 添加思考中消息
  const thinkingId = `thinking-${Date.now()}`
  messages.value.push({
    id: thinkingId,
    role: 'assistant',
    content: '',
    isThinking: true
  })

  loading.value = true

  try {
    // 调用 API 发送消息
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value
          .filter(m => !m.isThinking)
          .map(m => ({ role: m.role, content: m.content })),
        sessionId: `dialog-${props.agent.id}`,
        config: {
          model: 'deepseek-chat',
          temperature: 0.7,
          systemPrompt: props.agent.systemPrompt || `你是 ${props.agent.name}，${props.agent.description}`
        }
      })
    })

    if (!response.ok) throw new Error('请求失败')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    // 移除思考中消息
    const thinkingIndex = messages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex > -1) {
      messages.value.splice(thinkingIndex, 1)
    }

    // 添加空消息用于流式填充
    const responseId = `assistant-${Date.now()}`
    messages.value.push({
      id: responseId,
      role: 'assistant',
      content: ''
    })

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

              // 更新消息内容
              const msgIndex = messages.value.findIndex(m => m.id === responseId)
              if (msgIndex > -1) {
                messages.value[msgIndex].content = fullContent
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    }
  } catch (error) {
    // 移除思考中消息
    const thinkingIndex = messages.value.findIndex(m => m.id === thinkingId)
    if (thinkingIndex > -1) {
      messages.value.splice(thinkingIndex, 1)
    }

    // 添加错误消息
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

// 停止生成
function handleStop() {
  loading.value = false
}

// 展开到完整 AI 助手界面
function expandToFull() {
  if (!props.agent) return
  
  isExpanding.value = true
  
  // 触发展开动画
  setTimeout(() => {
    emit('expand', props.agent!, messages.value)
    isExpanding.value = false
    emit('update:visible', false)
  }, 300)
}

// 关闭对话框
function close() {
  emit('update:visible', false)
}

// 点击遮罩关闭
function handleOverlayClick() {
  close()
}
</script>

<style scoped lang="scss">
.agent-chat-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.agent-chat-dialog {
  width: 100%;
  max-width: 600px;
  height: 70vh;
  max-height: 600px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(99, 102, 241, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.expanding {
    transform: scale(1.05);
    opacity: 0;
  }
}

/* 头部 */
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.5);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.agent-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.agent-name {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
}

.agent-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  
  &.online { background: #10b981; box-shadow: 0 0 8px #10b981; }
  &.busy { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
  &.offline { background: #64748b; }
  &.error { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  color: #e0e7ff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3));
    border-color: rgba(99, 102, 241, 0.5);
    transform: translateY(-1px);
  }
}

.expand-icon {
  font-size: 14px;
}

.close-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fecaca;
  }
}

/* 聊天区域 */
.dialog-chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  
  &.user {
    flex-direction: row-reverse;
    
    .message-content {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border-bottom-right-radius: 4px;
    }
  }
  
  &.assistant {
    .message-content {
      background: rgba(30, 41, 59, 0.8);
      color: #e2e8f0;
      border-bottom-left-radius: 4px;
    }
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  
  code {
    background: rgba(0, 0, 0, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
  }
}

.thinking-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
  
  .dot {
    width: 8px;
    height: 8px;
    background: #94a3b8;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out;
    
    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* 输入区域 */
.dialog-input-area {
  padding: 16px 20px 20px;
  background: rgba(15, 23, 42, 0.5);
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  min-height: 44px;
  max-height: 120px;
  padding: 10px 16px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  color: #f1f5f9;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  
  &::placeholder {
    color: #64748b;
  }
  
  &:focus {
    border-color: rgba(99, 102, 241, 0.5);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  
  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.stop-icon {
  font-size: 12px;
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

.dialog-scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog-scale-leave-active {
  transition: all 0.2s ease;
}

.dialog-scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.dialog-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 响应式 */
@media (max-width: 640px) {
  .agent-chat-dialog {
    max-width: 100%;
    height: 80vh;
    border-radius: 16px;
  }

  .expand-text {
    display: none;
  }

  .dialog-header {
    padding: 12px 16px;
  }

  .agent-avatar {
    width: 38px;
    height: 38px;
    font-size: 18px;
  }

  .agent-name {
    font-size: 14px;
  }
  
  .message-content {
    max-width: 90%;
  }
}
</style>
