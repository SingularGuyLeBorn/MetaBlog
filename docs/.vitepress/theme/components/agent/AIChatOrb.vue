<script setup lang="ts">
/**
 * AIChatOrb - 智能体悬浮球
 * 系统的"智能入口"与"全局助手"
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useData, useRoute } from 'vitepress'
import { AgentRuntime } from '../../../agent/core/AgentRuntime'
import { skillEngine } from '../../../agent/skills/SkillEngine'
import { builtinSkills } from '../../../agent/skills/builtin'
import type { ChatMessage, AgentState } from '../../../agent/core/types'
import OrbButton from './OrbButton.vue'
import ChatInterface from './ChatInterface.vue'

const { page } = useData()
const route = useRoute()

// Agent Runtime 实例
const agent = AgentRuntime.getInstance({ mode: 'COLLAB' })

// UI 状态
const isOpen = ref(false)
const isMinimized = ref(false)
const messages = ref<ChatMessage[]>([])
const inputText = ref('')
const isProcessing = ref(false)
const unreadCount = ref(0)
const currentState = ref<AgentState>('IDLE')

// 上下文感知
const currentContext = computed(() => ({
  path: route.path,
  title: page.value.title,
  wikiLinks: page.value.frontmatter.wikiLinks || []
}))

// 快捷操作
const quickActions = [
  { icon: '📝', label: '续写', prompt: '基于当前文章续写下一节' },
  { icon: '🔍', label: '搜索', prompt: '搜索相关最新资料' },
  { icon: '📊', label: '总结', prompt: '为当前文章生成摘要' }
]

// 初始化
onMounted(async () => {
  // 注册技能
  skillEngine.registerMany(builtinSkills)
  
  // 初始化 Agent
  await agent.initialize()
  
  // 注册技能到 Agent
  for (const skill of builtinSkills) {
    agent.registerSkill(skill)
  }

  // 监听 Agent 状态变化
  agent.on('stateChanged', ({ state }: { state: AgentState }) => {
    currentState.value = state
  })

  // 添加欢迎消息
  addWelcomeMessage()
})

// 切换聊天窗口
function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    unreadCount.value = 0
    nextTick(() => {
      scrollToBottom()
    })
  }
}

// 发送消息
async function sendMessage(text?: string) {
  const message = text || inputText.value.trim()
  if (!message || isProcessing.value) return

  // 添加用户消息
  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  messages.value.push(userMessage)
  inputText.value = ''
  isProcessing.value = true

  scrollToBottom()

  try {
    // 获取选中文字（如果有）
    const selectedText = window.getSelection()?.toString()

    // 调用 Agent 处理
    const response = await agent.processInput(message, {
      currentFile: page.value.relativePath,
      selectedText
    })

    // 添加助手回复
    messages.value.push(response)
    
  } catch (error) {
    messages.value.push({
      id: Date.now().toString(),
      role: 'assistant',
      content: `抱歉，处理过程中出现错误：${error instanceof Error ? error.message : String(error)}`,
      timestamp: Date.now()
    })
  } finally {
    isProcessing.value = false
    scrollToBottom()
  }
}

// 执行快捷操作
function executeQuickAction(action: typeof quickActions[0]) {
  sendMessage(action.prompt)
}

// 添加欢迎消息
function addWelcomeMessage() {
  const welcomeMsg: ChatMessage = {
    id: 'welcome',
    role: 'assistant',
    content: generateWelcomeMessage(),
    timestamp: Date.now()
  }
  messages.value.push(welcomeMsg)
}

// 生成欢迎消息（上下文感知）
function generateWelcomeMessage(): string {
  const title = page.value.title
  const path = route.path

  let msg = '🎉 欢迎回到 MetaUniverse！\n\n'

  if (title && path !== '/') {
    msg += `当前正在阅读《${title}》\n\n`
    msg += '我可以帮您：\n'
    msg += '• 解释文中概念（选中文字后问我）\n'
    msg += '• 基于此篇文章生成延伸阅读\n'
    msg += '• 检查相关知识的更新\n'
    msg += '• 撰写相关内容'
  } else {
    msg += '我是您的 AI 助手，可以帮助您：\n'
    msg += '• 撰写和编辑文章\n'
    msg += '• 搜索研究资料\n'
    msg += '• 管理知识图谱\n'
    msg += '• 回答知识库问题'
  }

  return msg
}

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    const container = document.querySelector('.chat-messages')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  })
}

// 清空对话
function clearChat() {
  messages.value = []
  addWelcomeMessage()
}

// 格式化时间
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听外部事件（如编辑器发送指令）
function handleExternalCommand(command: string) {
  if (!isOpen.value) {
    unreadCount.value++
  }
  sendMessage(command)
}

// 暴露方法供外部调用
defineExpose({
  handleExternalCommand,
  toggleChat
})
</script>

<template>
  <Teleport to="body">
    <div class="ai-chat-orb-container">
      <!-- Orb Button -->
      <OrbButton 
        :unread-count="unreadCount"
        :is-open="isOpen"
        :state="currentState"
        @click="toggleChat"
      />

      <!-- Chat Interface -->
      <Transition name="chat">
        <div v-if="isOpen" class="chat-interface" :class="{ minimized: isMinimized }">
          <!-- Header -->
          <div class="chat-header">
            <div class="header-left">
              <span class="orb-icon">🤖</span>
              <div class="header-info">
                <span class="agent-name">MetaUniverse Agent</span>
                <span class="agent-state" :class="currentState.toLowerCase()">
                  {{ currentState === 'IDLE' ? '就绪' : 
                     currentState === 'UNDERSTANDING' ? '思考中...' :
                     currentState === 'EXECUTING' ? '执行中...' :
                     currentState === 'WAITING_INPUT' ? '等待输入' : '工作中' }}
                </span>
              </div>
            </div>
            <div class="header-actions">
              <button class="action-btn minimize" @click="isMinimized = !isMinimized" title="最小化">
                {{ isMinimized ? '□' : '—' }}
              </button>
              <button class="action-btn clear" @click="clearChat" title="清空对话">🗑</button>
              <button class="action-btn close" @click="isOpen = false" title="关闭">×</button>
            </div>
          </div>

          <!-- Messages -->
          <div v-if="!isMinimized" class="chat-messages">
            <div 
              v-for="msg in messages" 
              :key="msg.id"
              class="message"
              :class="msg.role"
            >
              <div class="message-avatar">
                {{ msg.role === 'user' ? '👤' : '🤖' }}
              </div>
              <div class="message-content">
                <div class="message-text" v-html="msg.content.replace(/\n/g, '<br>')"></div>
                <div class="message-meta">
                  <span class="time">{{ formatTime(msg.timestamp) }}</span>
                  <span v-if="msg.metadata?.cost" class="cost">
                    ${{ msg.metadata.cost.toFixed(4) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Processing Indicator -->
            <div v-if="isProcessing" class="message assistant processing">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div v-if="!isMinimized" class="quick-actions">
            <button 
              v-for="action in quickActions" 
              :key="action.label"
              class="quick-action-btn"
              @click="executeQuickAction(action)"
            >
              <span class="icon">{{ action.icon }}</span>
              <span class="label">{{ action.label }}</span>
            </button>
          </div>

          <!-- Input Area -->
          <div v-if="!isMinimized" class="chat-input-area">
            <textarea
              v-model="inputText"
              class="chat-input"
              placeholder="输入指令...（如：写一篇关于Transformer的文章）"
              rows="2"
              @keydown.enter.prevent="sendMessage()"
            />
            <button 
              class="send-btn"
              :disabled="!inputText.trim() || isProcessing"
              @click="sendMessage()"
            >
              发送
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.ai-chat-orb-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

/* Chat Interface */
.chat-interface {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 380px;
  height: 500px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
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
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.orb-icon {
  font-size: 24px;
}

.header-info {
  display: flex;
  flex-direction: column;
}

.agent-name {
  font-weight: 600;
  font-size: 14px;
}

.agent-state {
  font-size: 11px;
  opacity: 0.9;
}

.agent-state.understanding,
.agent-state.executing {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 0.5; }
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  gap: 10px;
  animation: messageIn 0.3s ease;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--vp-c-bg-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.message-content {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 14px;
  background: var(--vp-c-bg-alt);
}

.message.user .message-content {
  background: var(--vp-c-brand);
  color: white;
}

.message-text {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  font-size: 10px;
  opacity: 0.6;
}

.message.user .message-meta {
  opacity: 0.8;
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 0;
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
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: var(--vp-c-bg-alt);
  border-color: var(--vp-c-brand);
}

.quick-action-btn .icon {
  font-size: 14px;
}

/* Input Area */
.chat-input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.chat-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  font-size: 13px;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input:focus {
  border-color: var(--vp-c-brand);
}

.send-btn {
  padding: 0 16px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn:not(:disabled):hover {
  opacity: 0.9;
}

/* Transitions */
.chat-enter-active,
.chat-leave-active {
  transition: all 0.3s ease;
}

.chat-enter-from,
.chat-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* Responsive */
@media (max-width: 480px) {
  .ai-chat-orb-container {
    bottom: 16px;
    right: 16px;
  }

  .chat-interface {
    width: calc(100vw - 32px);
    right: 0;
  }
}
</style>
