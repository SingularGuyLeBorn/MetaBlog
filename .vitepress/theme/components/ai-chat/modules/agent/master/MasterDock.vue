<!--
  MasterDock - Master Agent 专属悬浮面板 (液态玻璃风格)
  
  功能：
  - 常驻悬浮 Dock
  - 快速唤起 Master Agent
  - 独立的对话会话
  - 特权级系统管理工具
-->
<template>
  <div class="master-dock-container">
    <!-- 悬浮按钮 -->
    <button
      class="master-dock-trigger"
      :class="{ active: isOpen, pulse: hasNewMessage }"
      @click="toggleDock"
      title="Master Agent"
    >
      <div class="trigger-glow" />
      <div class="trigger-aura" />
      <span class="trigger-icon">👑</span>
      <div class="trigger-ripple" v-if="hasNewMessage" />
    </button>

    <!-- 悬浮面板 -->
    <Transition name="dock">
      <div v-if="isOpen" class="master-dock-panel">
        <!-- 面板光效 -->
        <div class="panel-ambient-glow" />
        
        <!-- 头部 -->
        <header class="dock-header">
          <div class="header-identity">
            <div class="identity-avatar">
              <span>👑</span>
              <div class="avatar-ring" />
            </div>
            <div class="identity-info">
              <h4 class="identity-name">Master Agent</h4>
              <span class="identity-badge">系统级</span>
            </div>
          </div>
          <div class="header-actions">
            <button 
              class="action-btn" 
              :class="{ active: showTools }"
              @click="showTools = !showTools"
              title="系统工具"
            >
              🛠️
            </button>
            <button class="action-btn close" @click="isOpen = false" title="关闭">
              ✕
            </button>
          </div>
        </header>

        <!-- 工具面板 -->
        <Transition name="tools">
          <div v-if="showTools" class="dock-tools">
            <div class="tools-grid">
              <button
                v-for="tool in masterTools"
                :key="tool.id"
                class="tool-item"
                @click="executeTool(tool)"
              >
                <span class="tool-icon">{{ tool.icon }}</span>
                <span class="tool-name">{{ tool.name }}</span>
              </button>
            </div>
          </div>
        </Transition>

        <!-- 消息区域 -->
        <div class="dock-messages" ref="messageContainer">
          <div v-if="messages.length === 0" class="empty-state">
            <div class="empty-icon">👑</div>
            <p class="empty-title">Master Agent 就绪</p>
            <p class="empty-desc">我是系统级的超级助手，可以帮你管理其他 Agent、配置系统设置等。</p>
            <div class="quick-actions">
              <button 
                v-for="action in quickActions" 
                :key="action.id"
                class="quick-action-btn"
                @click="sendQuickAction(action)"
              >
                {{ action.icon }} {{ action.label }}
              </button>
            </div>
          </div>
          
          <template v-else>
            <div
              v-for="(message, index) in messages"
              :key="index"
              class="message-bubble"
              :class="{ user: message.role === 'user', assistant: message.role === 'assistant' }"
            >
              <div class="message-avatar">
                {{ message.role === 'user' ? '👤' : '👑' }}
              </div>
              <div class="message-content">
                <div class="message-text" v-html="renderMarkdown(message.content)" />
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>
            </div>
            
            <!-- 思考中 -->
            <div v-if="isThinking" class="message-bubble assistant thinking">
              <div class="message-avatar">👑</div>
              <div class="message-content">
                <div class="thinking-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 输入区域 -->
        <div class="dock-input">
          <div class="input-wrapper">
            <textarea
              v-model="inputMessage"
              rows="1"
              placeholder="向 Master Agent 发送指令..."
              @keydown.enter.prevent="sendMessage"
              @input="adjustTextareaHeight"
              ref="inputEl"
            />
            <button 
              class="send-btn"
              :disabled="!inputMessage.trim() || isThinking"
              @click="sendMessage"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div class="input-hint">
            <span>Shift + Enter 换行</span>
            <span class="hint-divider">|</span>
            <span>Enter 发送</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface QuickAction {
  id: string
  label: string
  icon: string
  prompt: string
}

interface MasterTool {
  id: string
  name: string
  icon: string
  description: string
}

const isOpen = ref(false)
const showTools = ref(false)
const hasNewMessage = ref(false)
const isThinking = ref(false)
const inputMessage = ref('')
const messages = ref<Message[]>([])
const messageContainer = ref<HTMLElement>()
const inputEl = ref<HTMLTextAreaElement>()

// 系统工具
const masterTools: MasterTool[] = [
  { id: 'list_agents', name: '列出 Agents', icon: '📋', description: '查看所有 Agent' },
  { id: 'create_agent', name: '创建 Agent', icon: '➕', description: '创建新 Agent' },
  { id: 'system_status', name: '系统状态', icon: '📊', description: '查看系统状态' },
  { id: 'manage_skills', name: '管理 Skills', icon: '🎯', description: '管理技能' }
]

// 快捷操作
const quickActions: QuickAction[] = [
  { 
    id: 'create_writing_agent', 
    label: '创建写作助手', 
    icon: '✍️',
    prompt: '帮我创建一个专门用于写作辅助的 Agent，具备文章创作、润色和排版能力。'
  },
  { 
    id: 'create_code_agent', 
    label: '创建编程助手', 
    icon: '💻',
    prompt: '帮我创建一个代码助手，擅长代码审查、调试和重构。'
  },
  { 
    id: 'check_system', 
    label: '检查系统状态', 
    icon: '🔍',
    prompt: '检查当前系统状态，包括所有 Agent 的运行情况和资源使用。'
  }
]

// 方法
function toggleDock() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    hasNewMessage.value = false
    nextTick(() => {
      inputEl.value?.focus()
    })
  }
}

function adjustTextareaHeight() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

async function sendMessage() {
  const message = inputMessage.value.trim()
  if (!message || isThinking.value) return

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: message,
    timestamp: Date.now()
  })

  inputMessage.value = ''
  if (inputEl.value) {
    inputEl.value.style.height = 'auto'
  }

  isThinking.value = true
  scrollToBottom()

  // 模拟 AI 响应
  setTimeout(() => {
    const response = generateResponse(message)
    messages.value.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    })
    isThinking.value = false
    scrollToBottom()
  }, 1500)
}

function sendQuickAction(action: QuickAction) {
  inputMessage.value = action.prompt
  sendMessage()
}

function executeTool(tool: MasterTool) {
  const toolPrompts: Record<string, string> = {
    list_agents: '请列出系统中所有的 Agent，并显示它们的状态。',
    create_agent: '我想创建一个新的 Agent，请帮我完成配置。',
    system_status: '显示当前系统的运行状态和统计数据。',
    manage_skills: '显示所有可用的 Skills，我可以对它们进行管理。'
  }
  inputMessage.value = toolPrompts[tool.id] || `执行 ${tool.name}`
  sendMessage()
  showTools.value = false
}

function generateResponse(message: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('创建') && lowerMessage.includes('agent')) {
    return `✅ **Agent 创建向导**

我已准备好帮您创建新 Agent。请提供以下信息：

1. **名称**：给 Agent 起个名字
2. **描述**：它的主要用途
3. **模式选择**：
   - 📝 纯提示词模式
   - 🎯 技能模式
   - 🔧 工具模式
   - ⚡ 混合模式（推荐）

或者您可以直接告诉我："创建一个名为「文章助手」的 Agent，使用写作技能"`
  }
  
  if (lowerMessage.includes('状态') || lowerMessage.includes('检查')) {
    return `📊 **系统状态报告**

| 指标 | 数值 | 状态 |
|------|------|------|
| 运行中的 Agents | 3 | ✅ 正常 |
| 技能数量 | 12 | ✅ 正常 |
| 内存使用 | 45% | ✅ 正常 |
| API 调用/分钟 | 24 | ✅ 正常 |

**活跃 Agents：**
- 🤖 Meta 助手（在线）
- ✍️ 写作助手（空闲）
- 💻 代码助手（忙碌）`
  }
  
  if (lowerMessage.includes('skill') || lowerMessage.includes('技能')) {
    return `🎯 **技能管理**

**内置技能：**
- ✍️ 写作 - 文章创作和编辑
- 💻 编程 - 代码开发和调试
- 📋 总结 - 文本摘要
- 🌐 翻译 - 多语言翻译

**自定义技能：**
- 🎨 设计审查
- 📊 数据分析

您可以使用以下命令：
- "导出所有技能"
- "创建新技能"
- "编辑 XX 技能"`
  }
  
  return `🤔 我理解您的需求："${message}"

作为 Master Agent，我可以帮您：

1. **管理 Agents** - 创建、配置、删除 Agent
2. **系统配置** - 调整系统设置和参数
3. **数据分析** - 查看使用统计和报告
4. **故障排查** - 诊断和解决问题

请告诉我您具体想做什么，我会使用系统工具来协助您。`
}

function scrollToBottom() {
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
    .replace(/\n/g, '<br>')
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听新消息
onMounted(() => {
  // 模拟收到系统通知
  setTimeout(() => {
    if (!isOpen.value) {
      hasNewMessage.value = true
    }
  }, 5000)
})
</script>

<style scoped>
/* ===== Master Dock 容器 ===== */
.master-dock-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
}

/* ===== 悬浮按钮 ===== */
.master-dock-trigger {
  position: relative;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8) 0%, var(--sr-accent-star, #b8a090) 50%, #a855f7 100%);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 
    0 8px 32px rgba(179, 168, 184, 0.4),
    0 0 0 4px rgba(255, 255, 255, 0.1),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.master-dock-trigger:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 
    0 12px 40px rgba(179, 168, 184, 0.5),
    0 0 0 6px rgba(255, 255, 255, 0.15),
    inset 0 2px 4px rgba(255, 255, 255, 0.4);
}

.master-dock-trigger.active {
  transform: scale(0.9);
  box-shadow: 
    0 4px 16px rgba(179, 168, 184, 0.3),
    inset 0 2px 8px rgba(0, 0, 0, 0.2);
}

.master-dock-trigger.pulse {
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% {
    box-shadow: 
      0 8px 32px rgba(179, 168, 184, 0.4),
      0 0 0 4px rgba(255, 255, 255, 0.1);
  }
  50% {
    box-shadow: 
      0 8px 32px rgba(179, 168, 184, 0.5),
      0 0 0 8px rgba(179, 168, 184, 0.2);
  }
}

.trigger-glow {
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, #60a5fa, #a78bfa, #c084fc);
  border-radius: 50%;
  opacity: 0.5;
  filter: blur(12px);
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.trigger-aura {
  position: absolute;
  inset: -20px;
  border: 1px solid rgba(179, 168, 184, 0.2);
  border-radius: 50%;
  animation: aura-expand 3s ease-out infinite;
}

@keyframes aura-expand {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.trigger-icon {
  position: relative;
  z-index: 1;
  font-size: 28px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.trigger-ripple {
  position: absolute;
  inset: 0;
  border: 3px solid #fbbf24;
  border-radius: 50%;
  animation: ripple 1s ease-out infinite;
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* ===== 悬浮面板 ===== */
.master-dock-panel {
  position: absolute;
  right: 0;
  bottom: 80px;
  width: 380px;
  height: 560px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  box-shadow: 
    0 32px 64px -16px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 0 100px rgba(179, 168, 184, 0.15);
  backdrop-filter: blur(20px);
  overflow: hidden;
  transform-origin: bottom right;
}

.dock-enter-active,
.dock-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.panel-ambient-glow {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 0% 0%, rgba(179, 168, 184, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 100% 100%, rgba(184, 160, 144, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

/* ===== 头部 ===== */
.dock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.7) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
  z-index: 1;
}

.header-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.identity-avatar {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border-radius: 14px;
  font-size: 22px;
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.3);
}

.avatar-ring {
  position: absolute;
  inset: -3px;
  border: 2px solid transparent;
  border-top-color: #fbbf24;
  border-radius: 16px;
  animation: ring-rotate 3s linear infinite;
}

@keyframes ring-rotate {
  to { transform: rotate(360deg); }
}

.identity-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.identity-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
  background: linear-gradient(135deg, var(--sr-text-primary, #1a1a2e), var(--sr-morandi-blue, #9daab8));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.identity-badge {
  width: fit-content;
  padding: 2px 8px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
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
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(226, 232, 240, 0.8);
  transform: translateY(-1px);
}

.action-btn.active {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
}

.action-btn.close:hover {
  background: #fee2e2;
  color: var(--sr-morandi-pink, #d4b8b8);
}

/* ===== 工具面板 ===== */
.dock-tools {
  padding: 16px 20px;
  background: rgba(248, 250, 252, 0.8);
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  z-index: 1;
}

.tools-enter-active,
.tools-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
  opacity: 1;
}

.tools-enter-from,
.tools-leave-to {
  max-height: 0;
  opacity: 0;
  padding: 0 20px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-item:hover {
  background: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(179, 168, 184, 0.15);
}

.tool-icon {
  font-size: 20px;
}

.tool-name {
  font-size: 10px;
  font-weight: 500;
  color: var(--sr-text-muted, #94a3b8);
}

/* ===== 消息区域 ===== */
.dock-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(179, 168, 184, 0.1), rgba(184, 160, 144, 0.1));
  border-radius: 24px;
  font-size: 40px;
  margin-bottom: 16px;
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.empty-desc {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  line-height: 1.5;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.quick-action-btn {
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 100px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
  border-color: transparent;
  transform: translateY(-1px);
}

/* 消息气泡 */
.message-bubble {
  display: flex;
  gap: 10px;
  max-width: 85%;
}

.message-bubble.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-bubble.assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(241, 245, 249, 0.9), rgba(226, 232, 240, 0.8));
  border-radius: 10px;
  font-size: 16px;
  flex-shrink: 0;
}

.message-bubble.assistant .message-avatar {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-text {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--sr-text-primary, #1a1a2e);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.message-bubble.user .message-text {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
  border-bottom-right-radius: 4px;
}

.message-bubble.assistant .message-text {
  background: rgba(255, 255, 255, 0.9);
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #94a3b8;
  padding: 0 4px;
}

.message-bubble.user .message-time {
  text-align: right;
}

/* 思考中动画 */
.thinking-dots {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border-radius: 50%;
  animation: thinking-bounce 1.4s ease-in-out infinite both;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinking-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* ===== 输入区域 ===== */
.dock-input {
  padding: 16px 20px 20px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.7) 0%,
    rgba(255, 255, 255, 0.9) 100%
  );
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  z-index: 1;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  padding: 6px;
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
  font-size: 13px;
  line-height: 1.5;
  color: var(--sr-text-primary, #1a1a2e);
  resize: none;
  outline: none;
  max-height: 120px;
}

.input-wrapper textarea::placeholder {
  color: #94a3b8;
}

.send-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.3);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  width: 18px;
  height: 18px;
}

.input-hint {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.hint-divider {
  color: #cbd5e1;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .master-dock-container {
    right: 16px;
    bottom: 16px;
  }
  
  .master-dock-panel {
    width: calc(100vw - 32px);
    height: 480px;
    right: 0;
  }
  
  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
