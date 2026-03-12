<!--
  AgentChat - Agent 隔离会话组件 (液态玻璃风格)
  
  功能：
  - 独立的 Agent 聊天界面
  - Agent 切换下拉选择
  - 隔离的会话记忆
  - 液态玻璃视觉效果
-->
<template>
  <div class="agent-chat-liquid">
    <!-- 聊天头部 - Agent 切换 -->
    <header class="chat-header-liquid">
      <div class="agent-selector">
        <div class="selector-trigger" @click="showAgentDropdown = !showAgentDropdown">
          <div class="selected-agent">
            <span class="agent-avatar">{{ currentAgent?.avatar || '🤖' }}</span>
            <div class="agent-info">
              <span class="agent-name">{{ currentAgent?.name || '选择 Agent' }}</span>
              <span class="agent-status" :class="currentAgent?.status">{{ statusText }}</span>
            </div>
          </div>
          <span class="dropdown-arrow" :class="{ open: showAgentDropdown }">▼</span>
        </div>
        
        <!-- Agent 下拉菜单 -->
        <Transition name="dropdown">
          <div v-if="showAgentDropdown" class="agent-dropdown">
            <div class="dropdown-glow" />
            <div class="dropdown-content">
              <div 
                v-for="agent in agents" 
                :key="agent.id"
                class="agent-option"
                :class="{ active: agent.id === currentAgentId }"
                @click="switchAgent(agent)"
              >
                <span class="option-avatar">{{ agent.avatar }}</span>
                <div class="option-info">
                  <span class="option-name">{{ agent.name }}</span>
                  <span class="option-desc">{{ agent.description.slice(0, 30) }}...</span>
                </div>
                <span v-if="agent.id === currentAgentId" class="option-check">✓</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
      
      <div class="header-actions">
        <button class="action-btn" title="清空对话" @click="clearChat">
          <span>🗑️</span>
        </button>
        <button class="action-btn" title="设置" @click="openSettings">
          <span>⚙️</span>
        </button>
        <button class="action-btn close" title="关闭" @click="$emit('close')">
          <span>✕</span>
        </button>
      </div>
    </header>

    <!-- 消息区域 -->
    <div class="chat-messages" ref="messageContainer">
      <!-- 欢迎消息 -->
      <div v-if="messages.length === 0" class="welcome-liquid">
        <div class="welcome-glow" />
        <div class="welcome-content">
          <div class="welcome-avatar">{{ currentAgent?.avatar || '🤖' }}</div>
          <h3>{{ currentAgent?.name }}</h3>
          <p>{{ currentAgent?.description }}</p>
          <div class="welcome-capabilities">
            <span v-for="skill in agentSkills" :key="skill.id" class="cap-tag">
              {{ skill.icon }} {{ skill.name }}
            </span>
          </div>
          <div class="quick-starts">
            <button 
              v-for="(prompt, index) in quickStartPrompts" 
              :key="index"
              class="quick-start-btn"
              @click="sendMessage(prompt)"
            >
              {{ prompt }}
            </button>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
      <template v-else>
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="message-liquid"
          :class="{ user: message.role === 'user', assistant: message.role === 'assistant' }"
        >
          <div class="message-glow" :class="message.role" />
          <div class="message-avatar">
            {{ message.role === 'user' ? '👤' : currentAgent?.avatar }}
          </div>
          <div class="message-content">
            <div class="message-text" v-html="renderMarkdown(message.content)" />
            <div class="message-meta">
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              <button v-if="message.role === 'assistant'" class="regenerate-btn" @click="regenerate(index)">
                🔄 重新生成
              </button>
            </div>
          </div>
        </div>

        <!-- 思考中 -->
        <div v-if="isThinking" class="message-liquid assistant thinking">
          <div class="message-glow assistant" />
          <div class="message-avatar">{{ currentAgent?.avatar }}</div>
          <div class="message-content">
            <div class="thinking-indicator">
              <div class="thinking-bubble" v-for="i in 3" :key="i" />
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-liquid">
      <div class="input-wrapper">
        <textarea
          v-model="inputMessage"
          rows="1"
          :placeholder="`给 ${currentAgent?.name || 'Agent'} 发送消息...`"
          @keydown.enter.prevent="handleEnter"
          @input="adjustHeight"
          ref="inputEl"
        />
        <div class="input-actions">
          <button 
            class="send-btn"
            :disabled="!inputMessage.trim() || isThinking"
            @click="sendMessage()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22,2 15,22 11,13 2,9 22,2" />
            </svg>
          </button>
        </div>
      </div>
      <div class="input-hint">
        <span>按 Enter 发送，Shift + Enter 换行</span>
      </div>
    </div>

    <!-- 设置弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSettings" class="settings-modal-overlay" @click.self="showSettings = false">
          <div class="settings-modal-liquid">
            <div class="modal-glow" />
            <div class="modal-header">
              <h3>⚙️ 对话设置</h3>
              <button class="close-btn" @click="showSettings = false">✕</button>
            </div>
            <div class="modal-content">
              <div class="setting-item">
                <label>记住对话历史</label>
                <label class="liquid-toggle">
                  <input type="checkbox" v-model="settings.rememberHistory" />
                  <span class="toggle-slider" />
                </label>
              </div>
              <div class="setting-item">
                <label>自动滚动到底部</label>
                <label class="liquid-toggle">
                  <input type="checkbox" v-model="settings.autoScroll" />
                  <span class="toggle-slider" />
                </label>
              </div>
              <div class="setting-item">
                <label>显示思考过程</label>
                <label class="liquid-toggle">
                  <input type="checkbox" v-model="settings.showThinking" />
                  <span class="toggle-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useAgentConfig } from '../../../core/composables/useAgentConfig'
import type { Agent } from '../../../core/types/agent'
import * as agentChatStorage from '../../../core/services/agentChatStorage'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const props = defineProps<{
  initialAgentId?: string
}>()

const emit = defineEmits<{
  close: []
  'agent-change': [agent: Agent]
}>()

const { agents, skills, activeAgent, setActive, buildSystemPrompt } = useAgentConfig()

// 状态
const currentAgentId = ref(props.initialAgentId || activeAgent.value?.id)
const showAgentDropdown = ref(false)
const showSettings = ref(false)
const isThinking = ref(false)
const inputMessage = ref('')
const messages = ref<Message[]>([])
const messageContainer = ref<HTMLElement>()
const inputEl = ref<HTMLTextAreaElement>()

const settings = ref({
  rememberHistory: true,
  autoScroll: true,
  showThinking: false
})

// 计算属性
const currentAgent = computed(() => 
  agents.value.find(a => a.id === currentAgentId.value) || agents.value[0]
)

const statusText = computed(() => {
  const status = currentAgent.value?.status
  const map: Record<string, string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    idle: '空闲'
  }
  return map[status] || status || '未知'
})

const agentSkills = computed(() => {
  if (!currentAgent.value) return []
  const skillIds = currentAgent.value.capabilities?.skillIds || []
  return skills.value.filter(s => skillIds.includes(s.id))
})

const quickStartPrompts = computed(() => {
  const agent = currentAgent.value
  if (!agent) return ['你好！', '请介绍一下你自己']
  
  const skillIds = agent.capabilities?.skillIds || []
  const prompts = ['你好！', '请介绍一下你自己']
  if (skillIds.includes('write')) {
    prompts.push('帮我写一篇文章')
  }
  if (skillIds.includes('code')) {
    prompts.push('帮我审查这段代码')
  }
  return prompts.slice(0, 4)
})

// 方法
function handleEnter(e: KeyboardEvent) {
  if (e.shiftKey) {
    return
  }
  e.preventDefault()
  sendMessage()
}

function adjustHeight() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

async function sendMessage(content?: string) {
  const message = content || inputMessage.value.trim()
  if (!message || isThinking.value) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: message,
    timestamp: Date.now()
  })

  if (!content) {
    inputMessage.value = ''
    if (inputEl.value) {
      inputEl.value.style.height = 'auto'
    }
  }

  isThinking.value = true
  scrollToBottom()

  // 模拟 AI 响应
  setTimeout(async () => {
    const response = await generateResponse(message)
    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    })
    isThinking.value = false
    scrollToBottom()
  }, 1500)
}

async function generateResponse(userMessage: string): Promise<string> {
  const agent = currentAgent.value
  if (!agent) return '抱歉，我没有找到对应的 Agent。'

  // 构建系统提示词
  const systemPrompt = buildSystemPrompt(agent)
  
  // 这里应该调用实际的 AI 服务
  // 现在返回模拟响应
  return `我是 **${agent.name}**，已收到你的消息："${userMessage.slice(0, 20)}..."

我的系统提示词：
\`\`\`
${systemPrompt.slice(0, 100)}...
\`\`\`

（注：这里应该连接到实际的 AI 服务生成回复）`
}

async function switchAgent(agent: Agent) {
  if (agent.id === currentAgentId.value) {
    showAgentDropdown.value = false
    return
  }

  // 保存当前会话
  await saveCurrentSession()

  // 切换 Agent
  currentAgentId.value = agent.id
  await setActive(agent.id)
  
  // 加载新 Agent 的会话
  await loadAgentSession(agent.id)
  
  showAgentDropdown.value = false
  emit('agent-change', agent)
}

async function saveCurrentSession() {
  if (settings.value.rememberHistory && currentAgentId.value) {
    await agentChatStorage.saveAgentChatMessages(currentAgentId.value, messages.value as any)
  }
}

async function loadAgentSession(agentId: string) {
  if (settings.value.rememberHistory) {
    const saved = await agentChatStorage.getAgentChatMessages(agentId)
    if (saved && saved.length > 0) {
      messages.value = saved as any
      return
    }
  }
  messages.value = []
}

async function clearChat() {
  if (confirm('确定要清空当前对话吗？')) {
    messages.value = []
    if (currentAgentId.value) {
      await agentChatStorage.clearAgentChatSession(currentAgentId.value)
    }
  }
}

function openSettings() {
  showSettings.value = true
}

function regenerate(messageIndex: number) {
  // 找到对应的用户消息
  for (let i = messageIndex - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      const userMessage = messages.value[i].content
      // 删除当前及之后的消息
      messages.value = messages.value.slice(0, i + 1)
      // 重新生成
      sendMessage(userMessage)
      break
    }
  }
}

function scrollToBottom() {
  if (!settings.value.autoScroll) return
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

function renderMarkdown(content: string): string {
  // 简化的 Markdown 渲染
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听 Agent 变化
watch(() => props.initialAgentId, (newId) => {
  if (newId && newId !== currentAgentId.value) {
    const agent = agents.value.find(a => a.id === newId)
    if (agent) {
      switchAgent(agent)
    }
  }
})

// 页面加载时恢复会话
onMounted(async () => {
  if (currentAgentId.value) {
    await loadAgentSession(currentAgentId.value)
  }
})
</script>

<style scoped>
/* ===== AgentChat 液态玻璃容器 ===== */
.agent-chat-liquid {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, 
    rgba(248, 250, 252, 0.9) 0%, 
    rgba(241, 245, 249, 0.8) 100%
  );
  border-radius: 24px;
  overflow: hidden;
  position: relative;
}

/* ===== 头部 - Agent 选择器 ===== */
.chat-header-liquid {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.7) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  z-index: 10;
}

.agent-selector {
  position: relative;
}

.selector-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.selector-trigger:hover {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.1);
}

.selected-agent {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border-radius: 12px;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.3);
}

.agent-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agent-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.agent-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 100px;
  width: fit-content;
}

.agent-status.online {
  background: #d1fae5;
  color: var(--sr-morandi-green, #a8b3a8);
}

.agent-status.offline {
  background: #f1f5f9;
  color: var(--sr-text-muted, #94a3b8);
}

.agent-status.busy {
  background: #fef3c7;
  color: #d97706;
}

.dropdown-arrow {
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.3s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

/* Agent 下拉菜单 */
.agent-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 280px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  backdrop-filter: blur(20px);
  z-index: 100;
  overflow: hidden;
}

.dropdown-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(179, 168, 184, 0.1), transparent 60%);
  pointer-events: none;
}

.dropdown-content {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.agent-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.agent-option:hover {
  background: rgba(179, 168, 184, 0.08);
}

.agent-option.active {
  background: linear-gradient(145deg, rgba(179, 168, 184, 0.12), rgba(184, 160, 144, 0.08));
}

.option-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(241, 245, 249, 0.9), rgba(226, 232, 240, 0.8));
  border-radius: 10px;
  font-size: 18px;
}

.option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.option-desc {
  font-size: 11px;
  color: #94a3b8;
}

.option-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border-radius: 50%;
  font-size: 12px;
  color: white;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* 头部操作按钮 */
.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.action-btn.close:hover {
  background: #fee2e2;
}

/* ===== 消息区域 ===== */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 欢迎界面 */
.welcome-liquid {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.welcome-glow {
  position: absolute;
  inset: 20%;
  background: radial-gradient(circle, rgba(179, 168, 184, 0.1), transparent 60%);
  filter: blur(40px);
  animation: glow-pulse 4s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.welcome-content {
  text-align: center;
  position: relative;
  z-index: 1;
}

.welcome-avatar {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border-radius: 24px;
  font-size: 40px;
  margin: 0 auto 20px;
  box-shadow: 0 12px 32px rgba(179, 168, 184, 0.3);
  animation: avatar-float 3s ease-in-out infinite;
}

@keyframes avatar-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.welcome-content h3 {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.welcome-content p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
  max-width: 400px;
}

.welcome-capabilities {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.cap-tag {
  padding: 6px 12px;
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  border-radius: 100px;
  font-size: 12px;
  color: #1e40af;
}

.quick-starts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
  margin: 0 auto;
}

.quick-start-btn {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  color: #475569;
  cursor: pointer;
  transition: all 0.3s ease;
}

.quick-start-btn:hover {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.25);
}

/* 消息气泡 */
.message-liquid {
  display: flex;
  gap: 12px;
  max-width: 85%;
  position: relative;
}

.message-liquid.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-glow {
  position: absolute;
  inset: -4px;
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
  filter: blur(8px);
}

.message-glow.user {
  background: linear-gradient(135deg, rgba(179, 168, 184, 0.3), rgba(184, 160, 144, 0.2));
}

.message-glow.assistant {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.5), rgba(241, 245, 249, 0.3));
}

.message-liquid:hover .message-glow {
  opacity: 1;
}

.message-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(241, 245, 249, 0.9), rgba(226, 232, 240, 0.8));
  border-radius: 12px;
  font-size: 18px;
  flex-shrink: 0;
  z-index: 1;
}

.message-liquid.assistant .message-avatar {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 1;
}

.message-text {
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--sr-text-primary, #1a1a2e);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.message-liquid.user .message-text {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
  border-bottom-right-radius: 6px;
}

.message-liquid.assistant .message-text {
  background: rgba(255, 255, 255, 0.95);
  border-bottom-left-radius: 6px;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 4px;
}

.message-time {
  font-size: 11px;
  color: #94a3b8;
}

.regenerate-btn {
  padding: 4px 10px;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  border-radius: 6px;
  font-size: 11px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.regenerate-btn:hover {
  background: rgba(179, 168, 184, 0.1);
  color: var(--sr-morandi-blue, #9daab8);
}

/* 思考中 */
.thinking-indicator {
  display: flex;
  gap: 6px;
  padding: 14px 18px;
}

.thinking-bubble {
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border-radius: 50%;
  animation: thinking-bounce 1.4s ease-in-out infinite both;
}

.thinking-bubble:nth-child(1) { animation-delay: -0.32s; }
.thinking-bubble:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinking-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* ===== 输入区域 ===== */
.chat-input-liquid {
  padding: 16px 20px 20px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.7) 0%,
    rgba(255, 255, 255, 0.9) 100%
  );
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
}

.input-wrapper {
  display: flex;
  gap: 10px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.input-wrapper textarea {
  flex: 1;
  padding: 10px 14px;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1.5;
  color: var(--sr-text-primary, #1a1a2e);
  resize: none;
  outline: none;
  max-height: 120px;
}

.input-wrapper textarea::placeholder {
  color: #94a3b8;
}

.input-actions {
  display: flex;
  align-items: flex-end;
}

.send-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.3);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 20px;
  height: 20px;
}

.input-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
}

/* ===== 设置弹窗 ===== */
.settings-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-modal-liquid {
  position: relative;
  width: 400px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  overflow: hidden;
}

.modal-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(179, 168, 184, 0.1), transparent 50%);
  pointer-events: none;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #fee2e2;
}

.modal-content {
  padding: 20px 24px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
}

/* 液态开关 */
.liquid-toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.liquid-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  transition: 0.3s;
  border-radius: 26px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.liquid-toggle input:checked + .toggle-slider {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
}

.liquid-toggle input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

/* Modal 过渡 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .chat-header-liquid {
    padding: 12px 16px;
  }
  
  .agent-dropdown {
    left: -20px;
    right: -20px;
    min-width: auto;
  }
}
</style>
