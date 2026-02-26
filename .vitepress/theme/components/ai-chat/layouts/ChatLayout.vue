<!--
  ChatLayout - 聊天主布局（支持多 Agent 独立会话）
-->
<template>
  <div class="chat-layout">
    <!-- 左侧会话面板 -->
    <SessionPanel
      :sessions="filteredSessions"
      :current-id="currentSessionId"
      :collapsed="leftCollapsed"
      :agent-name="selectedAgent?.name"
      @create="createSessionForCurrentAgent"
      @switch="switchSession"
      @rename="handleRename"
      @delete="handleDelete"
      @manage="showSessionManager = true"
      @toggle-collapse="leftCollapsed = !leftCollapsed"
    />

    <!-- 中间聊天区域 -->
    <main class="chat-main">
      <!-- 顶部栏 -->
      <header class="main-header">
        <div class="header-left">
          <button class="menu-btn" @click="leftCollapsed = !leftCollapsed">
            <Icon name="menu" :size="20" />
          </button>
          <div class="header-info">
            <h1 class="session-title">{{ currentSession?.title || '新对话' }}</h1>
            
            <!-- Agent 选择下拉框 -->
            <div class="agent-selector" ref="agentSelectorRef">
              <button 
                class="agent-select-trigger"
                :class="{ 'open': showAgentDropdown }"
                @click="showAgentDropdown = !showAgentDropdown"
              >
                <span class="selected-avatar">{{ selectedAgent?.avatar || '🤖' }}</span>
                <span class="selected-name">{{ selectedAgent?.name || '选择 Agent' }}</span>
                <Icon name="chevron-down" :size="14" class="dropdown-icon" />
              </button>
              
              <!-- 下拉菜单 -->
              <Transition name="dropdown">
                <div v-if="showAgentDropdown" class="agent-dropdown">
                  <div class="dropdown-header">
                    <span>选择 Agent</span>
                    <button class="manage-btn" @click="openAgentAdmin">
                      <Icon name="settings" :size="12" />
                      管理
                    </button>
                  </div>
                  <div class="dropdown-divider"></div>
                  <div class="agent-list">
                    <button
                      v-for="agent in allAgents"
                      :key="agent.id"
                      class="agent-option"
                      :class="{ 'active': selectedAgent?.id === agent.id }"
                      @click="selectAgent(agent)"
                    >
                      <span class="option-avatar">{{ agent.avatar }}</span>
                      <div class="option-info">
                        <span class="option-name">{{ agent.name }}</span>
                        <span class="option-desc">{{ agent.description }}</span>
                      </div>
                      <span v-if="selectedAgent?.id === agent.id" class="check-icon">✓</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
            
            <span v-if="currentSession" class="model-tag">
              {{ currentSession.config.model }}
            </span>
          </div>
        </div>
        <div class="header-right">
          <!-- 日志监控按钮 -->
          <button 
            class="icon-btn log-dashboard-btn" 
            :class="{ active: showLogDashboard }"
            title="日志监控 (Ctrl+L)"
            @click="showLogDashboard = !showLogDashboard"
          >
            <Icon name="terminal" :size="18" />
          </button>
          <!-- Agent 管理中心按钮 -->
          <button 
            class="icon-btn agent-admin-btn" 
            :class="{ active: showAgentAdmin }"
            title="Agent 控制中心"
            @click="showAgentAdmin = true"
          >
            <Icon name="sparkles" :size="18" />
          </button>
          <button class="icon-btn" @click="clearMessages()">
            <Icon name="trash" :size="18" />
          </button>
          <button class="icon-btn" @click="rightCollapsed = !rightCollapsed">
            <Icon name="settings" :size="18" />
          </button>
        </div>
      </header>

      <!-- 消息列表 -->
      <MessageList
        ref="messageListRef"
        :messages="messages"
        :message-groups="messageGroups"
        :session-id="currentSessionId"
        :is-streaming="isStreaming"
        :agent-name="selectedAgent?.name"
        :agent-avatar="selectedAgent?.avatar"
        @use-prompt="handleQuickPrompt"
        @regenerate="handleRegenerate"
        @switch-version="switchVersion"
      />

      <!-- 输入框 -->
      <ChatInput
        ref="chatInputRef"
        v-model="inputText"
        :is-streaming="isStreaming"
        :selected-skill="selectedSkill"
        :placeholder="inputPlaceholder"
        @send="handleSend"
        @stop="interruptGeneration"
        @select-skill="handleSelectSkill"
      />
    </main>

    <!-- 右侧设置面板 -->
    <SettingsPanel
      :config="currentConfig"
      :collapsed="rightCollapsed"
      :agent-system-prompt="currentAgentSystemPrompt"
      :is-system-prompt-customized="isSystemPromptCustomized"
      @update:config="handleUpdateConfig"
      @toggle-collapse="rightCollapsed = !rightCollapsed"
      @open-agent-center="showAgentAdmin = true"
      @reset-system-prompt="resetSystemPromptToAgent"
    />

    <!-- Agent 管理中心 -->
    <AgentAdmin
      v-model:visible="showAgentAdmin"
      @agent-change="handleAgentChange"
      @start-chat="handleStartChatFromAdmin"
    />
    
    <!-- Agent 简易聊天对话框 -->
    <AgentChatDialog
      v-model:visible="showAgentChatDialog"
      :agent="dialogAgent"
      @expand="handleExpandDialog"
    />
    
    <!-- 会话管理器 -->
    <SessionManager
      v-model:visible="showSessionManager"
      :sessions="sessions"
      :agents="allAgents"
      :current-session-id="currentSessionId"
      :current-agent="selectedAgent"
      @create="createSessionForCurrentAgent"
      @switch="handleSwitchFromManager"
      @rename="renameSession"
      @delete="handleBatchDelete"
    />
    
    <!-- 日志监控面板 -->
    <LogDashboard v-model:visible="showLogDashboard" />
    
    <!-- 删除确认弹窗 - 液态玻璃 3D 风格 -->
    <Teleport to="body">
      <Transition name="glass-modal">
        <div v-if="showDeleteConfirm" class="glass-overlay" @click.self="showDeleteConfirm = false">
          <div class="glass-modal-3d">
            <!-- 玻璃光效 -->
            <div class="glass-shine"></div>
            <div class="glass-glow"></div>
            
            <div class="glass-content">
              <!-- 警告图标 -->
              <div class="glass-icon-wrapper">
                <div class="glass-icon">⚠️</div>
                <div class="icon-ring"></div>
              </div>
              
              <h4 class="glass-title">确认删除会话</h4>
              <p class="glass-hint">删除后无法恢复，该会话的所有消息都将被清除</p>
              
              <div class="glass-actions">
                <button class="glass-btn secondary" @click="showDeleteConfirm = false">
                  <span class="btn-shine"></span>
                  取消
                </button>
                <button class="glass-btn danger" @click="executeDelete">
                  <span class="btn-shine"></span>
                  <span class="danger-pulse"></span>
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { Teleport } from 'vue'
import { SessionPanel, SessionManager } from '../modules/chat/session'
import { MessageList } from '../modules/chat/messages'
import { ChatInput } from '../modules/chat/input'
import { SettingsPanel } from '../modules/chat/settings'
import { AgentAdmin } from '../modules/agent'
import { AgentChatDialog } from '../modules/agent/chat'
import { LogDashboard } from '../modules/agent/admin'
import { Icon } from '../ui'
import { useAIChat, useAgents } from '../core/composables'
import { useAgentConfig } from '../core/composables/useAgentConfig'
import type { SessionConfig, ChatSession } from '../core/types'
import type { Skill } from '../core/composables/useSkills'
import type { Agent } from '../core/types/agent'

const {
  sessions,
  currentSessionId,
  currentSession,
  messages,
  messageGroups,
  isStreaming,
  defaultConfig,
  createSession,
  switchSession,
  renameSession,
  deleteSession,
  sendMessage,
  interruptGeneration,
  clearMessages,
  regenerateResponse,
  switchVersion,
  updateSessionConfig
} = useAIChat()

const { activeAgent, agents: allAgents, setActive } = useAgentConfig()
const { buildSystemPrompt } = useAgentConfig()

// UI 状态
const leftCollapsed = ref(false)
const rightCollapsed = ref(true)
const inputText = ref('')
const messageListRef = ref<InstanceType<typeof MessageList>>()
const chatInputRef = ref<InstanceType<typeof ChatInput>>()
const showAgentAdmin = ref(false)
const showLogDashboard = ref(false)
const selectedSkill = ref<Skill | undefined>(undefined)

// Agent 选择相关
const selectedAgent = ref<Agent | null>(null)
const showAgentDropdown = ref(false)
const agentSelectorRef = ref<HTMLElement>()

// 对话框相关
const showAgentChatDialog = ref(false)
const dialogAgent = ref<Agent | null>(null)

// 删除确认状态
const showDeleteConfirm = ref(false)
const sessionToDelete = ref<string | null>(null)

// 会话管理器
const showSessionManager = ref(false)

// 计算属性：按 Agent 过滤的会话列表
const filteredSessions = computed(() => {
  if (!selectedAgent.value) return sessions.value
  
  // 筛选出当前选中 Agent 的会话
  // 通过 agentId 字段来标识（需要在 Session 类型中添加）
  return sessions.value.filter(s => {
    // 如果会话有 agentId，则匹配
    if ((s as any).agentId) {
      return (s as any).agentId === selectedAgent.value?.id
    }
    // 如果没有 agentId，默认显示（兼容旧数据）
    return true
  })
})

// 输入框占位符
const inputPlaceholder = computed(() => {
  if (selectedAgent.value) {
    return `给 ${selectedAgent.value.name} 发送消息...`
  }
  return '发送消息...'
})

// 当前 Agent 的系统提示词
const currentAgentSystemPrompt = computed(() => {
  if (!selectedAgent.value) return ''
  return selectedAgent.value.systemPrompt || buildSystemPrompt(selectedAgent.value)
})

// System Prompt 是否已自定义（与会话初始值不同）
const isSystemPromptCustomized = computed((): boolean => {
  if (!currentSession.value) return false
  // 如果会话有 _customSystemPrompt 标记，说明用户手动修改过
  if (currentSession.value.config._customSystemPrompt) return true
  
  // 或者与会话创建时的 Agent systemPrompt 不同
  const agentPrompt = currentAgentSystemPrompt.value
  const sessionPrompt = currentSession.value.config.systemPrompt
  
  // 如果两者不同，且 sessionPrompt 不为空，说明被自定义了
  return !!(sessionPrompt && sessionPrompt !== agentPrompt)
})

// 键盘快捷键：Ctrl+L 打开日志面板
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault()
    showLogDashboard.value = true
  }
}

// 点击外部关闭下拉框
function handleClickOutside(e: MouseEvent) {
  if (agentSelectorRef.value && !agentSelectorRef.value.contains(e.target as Node)) {
    showAgentDropdown.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
  
  // 初始化：如果有活跃 Agent，选中它
  if (activeAgent.value) {
    selectedAgent.value = activeAgent.value
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
})

// 监听活跃 Agent 变化
watch(() => activeAgent.value, (agent) => {
  if (agent && !selectedAgent.value) {
    selectedAgent.value = agent
  }
})

const currentConfig = computed({
  get: () => currentSession.value?.config || defaultConfig,
  set: (val) => {
    // 更新配置
  }
})

// 选择 Agent
async function selectAgent(agent: Agent) {
  selectedAgent.value = agent
  setActive(agent.id)
  showAgentDropdown.value = false
  
  // 检查是否已有该 Agent 的会话
  const agentSessions = sessions.value.filter(s => (s as any).agentId === agent.id)
  
  if (agentSessions.length === 0) {
    // 没有会话，自动创建一个
    await createSessionForCurrentAgent()
  } else {
    // 切换到最新的会话
    const latestSession = agentSessions[agentSessions.length - 1]
    switchSession(latestSession.id)
    
    // 如果当前会话没有自定义 systemPrompt，更新为新 Agent 的
    if (!latestSession.config._customSystemPrompt) {
      const agentPrompt = agent.systemPrompt || buildSystemPrompt(agent)
      updateSessionConfig(latestSession.id, { 
        systemPrompt: agentPrompt
      })
      latestSession.config._customSystemPrompt = false
    }
  }
}

// 为当前 Agent 创建会话
async function createSessionForCurrentAgent() {
  const newSession = await createSession()
  if (newSession && selectedAgent.value) {
    // 标记会话属于哪个 Agent
    ;(newSession as any).agentId = selectedAgent.value.id
    ;(newSession as any).agentName = selectedAgent.value.name
    
    // 设置会话标题
    renameSession(newSession.id, `与 ${selectedAgent.value.name} 的对话`)
    
    // 设置系统提示词为 Agent 的默认（未自定义）
    const systemPrompt = selectedAgent.value.systemPrompt || buildSystemPrompt(selectedAgent.value)
    updateSessionConfig(newSession.id, { systemPrompt })
    newSession.config._customSystemPrompt = false // 标记为未自定义，跟随 Agent
  }
}

// 打开 Agent 管理
function openAgentAdmin() {
  showAgentDropdown.value = false
  showAgentAdmin.value = true
}

async function handleRegenerate() {
  if (!currentSessionId.value) return
  
  // 找到最后一条用户消息重新生成
  const sessionMessages = messages.value
  for (let i = sessionMessages.length - 1; i >= 0; i--) {
    if (sessionMessages[i].role === 'user') {
      await regenerateResponse(sessionMessages[i].id)
      break
    }
  }
}

async function handleSend(content: string, skillInfo?: { id: string; name: string; icon: string; systemPrompt: string }) {
  if (!content.trim() || isStreaming.value) return
  
  inputText.value = ''
  
  // 立即滚动到底部
  nextTick(() => {
    messageListRef.value?.scrollToBottom()
    chatInputRef.value?.focus()
  })
  
  // 只有在使用了技能且技能有 systemPrompt 时才更新
  // 保持用户自定义的 systemPrompt 不被覆盖
  if (currentSessionId.value && skillInfo?.systemPrompt) {
    updateSessionConfig(currentSessionId.value, { systemPrompt: skillInfo.systemPrompt })
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session) {
      session.config._customSystemPrompt = true // 标记为用户自定义
    }
  }
  
  // 发送消息
  await sendMessage(content, skillInfo)
}

function handleQuickPrompt(text: string) {
  inputText.value = text
  nextTick(() => {
    chatInputRef.value?.focus()
  })
}

function handleRename(id: string, newTitle: string) {
  if (newTitle?.trim()) {
    renameSession(id, newTitle.trim())
  }
}

function handleDelete(id: string) {
  sessionToDelete.value = id
  showDeleteConfirm.value = true
}

// 从会话管理器切换会话
function handleSwitchFromManager(sessionId: string) {
  // 找到会话对应的 Agent
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    const agentId = (session as any).agentId
    if (agentId) {
      const agent = allAgents.value.find(a => a.id === agentId)
      if (agent) {
        selectedAgent.value = agent
        setActive(agent.id)
      }
    }
  }
  switchSession(sessionId)
  showSessionManager.value = false
}

// 批量删除会话
function handleBatchDelete(sessionIds: string[]) {
  sessionIds.forEach(id => deleteSession(id))
}

// 重置 System Prompt 到 Agent 默认
function resetSystemPromptToAgent() {
  if (!currentSessionId.value || !selectedAgent.value) return
  
  const agentPrompt = selectedAgent.value.systemPrompt || buildSystemPrompt(selectedAgent.value)
  updateSessionConfig(currentSessionId.value, { 
    systemPrompt: agentPrompt,
    _customSystemPrompt: false 
  })
}

function executeDelete() {
  if (sessionToDelete.value) {
    deleteSession(sessionToDelete.value)
    sessionToDelete.value = null
    showDeleteConfirm.value = false
  }
}

function updateConfig(config: Partial<SessionConfig>) {
  if (currentSessionId.value) {
    // 如果修改了 systemPrompt，检查是否与会话初始值不同
  if ('systemPrompt' in config) {
    const newPrompt = config.systemPrompt
    const agentPrompt = currentAgentSystemPrompt.value
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session && newPrompt !== undefined) {
      session.config._customSystemPrompt = newPrompt !== agentPrompt
    }
  }
    
  updateSessionConfig(currentSessionId.value, config)
  }
}

// 包装 updateConfig 以处理 SettingsPanel 的事件
function handleUpdateConfig(config: Partial<SessionConfig>) {
  updateConfig(config)
}

function handleSelectSkill(skill: Skill | undefined) {
  selectedSkill.value = skill
}

// 从 AgentAdmin 切换 Agent（旧版方式，保留兼容）
async function handleAgentChange(agent: Agent) {
  await selectAgent(agent)
  showAgentAdmin.value = false
}

// 从 AgentAdmin 点击聊天按钮 - 打开简易对话框
function handleStartChatFromAdmin(agent: Agent) {
  dialogAgent.value = agent
  showAgentChatDialog.value = true
  setActive(agent.id)
}

// 从对话框展开到完整界面
async function handleExpandDialog(agent: Agent, dialogMessages: any[]) {
  // 关闭对话框
  showAgentChatDialog.value = false
  
  // 在完整界面中选中该 Agent
  await selectAgent(agent)
  
  // 如果对话框有消息，可以合并到新会话
  if (dialogMessages.length > 1) { // 不止欢迎消息
    // 可以在这里实现消息同步
    console.log('同步对话框消息:', dialogMessages.length)
  }
}
</script>

<style scoped>

.chat-layout {
  display: flex;
  height: calc(100vh - var(--vp-nav-height, 64px));
  background: var(--ai-bg-body);
  overflow: hidden;
}

/* 主聊天区 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--ai-bg-body);
}

/* 顶部栏 */
.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ai-space-3) var(--ai-space-5);
  background: var(--ai-bg-sidebar);
  border-bottom: 1px solid var(--ai-border-light);
  box-shadow: var(--ai-shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
}

.menu-btn,
.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-md);
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.menu-btn:hover,
.icon-btn:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

.icon-btn.active {
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.header-info {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
}

.session-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ai-text-primary);
  margin: 0;
}

.model-tag {
  padding: 2px 10px;
  background: var(--ai-primary-100);
  color: var(--ai-primary-700);
  border-radius: var(--ai-radius-full);
  font-size: 11px;
  font-weight: 500;
}

/* Agent 选择器 */
.agent-selector {
  position: relative;
}

.agent-select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
}

.agent-select-trigger:hover,
.agent-select-trigger.open {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
  border-color: rgba(99, 102, 241, 0.4);
}

.selected-avatar {
  font-size: 16px;
}

.selected-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  color: var(--vp-c-brand);
  transition: transform 0.2s;
}

.agent-select-trigger.open .dropdown-icon {
  transform: rotate(180deg);
}

/* Agent 下拉菜单 */
.agent-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 280px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid var(--ai-border-light);
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  color: var(--vp-c-brand);
  cursor: pointer;
  transition: all 0.2s;
}

.manage-btn:hover {
  background: var(--vp-c-brand-soft);
}

.dropdown-divider {
  height: 1px;
  background: var(--ai-border-light);
  margin: 0 16px;
}

.agent-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.agent-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.agent-option:hover {
  background: var(--ai-gray-100);
}

.agent-option.active {
  background: var(--vp-c-brand-soft);
}

.option-avatar {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ai-gray-100);
  border-radius: 10px;
}

.option-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ai-text-primary);
}

.option-desc {
  font-size: 12px;
  color: var(--ai-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand);
  color: white;
  border-radius: 50%;
  font-size: 11px;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.header-right {
  display: flex;
  gap: var(--ai-space-2);
}

/* Agent 管理按钮特殊样式 */
.agent-admin-btn {
  position: relative;
}

.agent-admin-btn::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: var(--vp-c-brand);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.agent-admin-btn.active::after {
  opacity: 1;
}

/* 日志按钮特殊样式 */
.log-dashboard-btn {
  position: relative;
}

.log-dashboard-btn:hover {
  color: #059669;
  background: #d1fae5;
}

.log-dashboard-btn.active {
  color: #059669;
  background: #a7f3d0;
}

/* ========== 液态玻璃 3D 弹窗 ========== */
.glass-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  perspective: 1000px;
}

.glass-modal-3d {
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(248, 250, 252, 0.85) 50%,
    rgba(241, 245, 249, 0.8) 100%
  );
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset,
    0 0 60px rgba(99, 102, 241, 0.1);
  transform-style: preserve-3d;
  animation: modal-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(30px) rotateX(-10deg) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0) scale(1);
  }
}

.glass-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shine 3s infinite;
}

@keyframes shine {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}

.glass-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(
    circle,
    rgba(99, 102, 241, 0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.glass-content {
  position: relative;
  z-index: 1;
}

.glass-icon-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

.glass-icon {
  font-size: 56px;
  position: relative;
  z-index: 1;
  animation: icon-pulse 2s ease-in-out infinite;
}

@keyframes icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.icon-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border: 2px solid rgba(239, 68, 68, 0.2);
  border-radius: 50%;
  animation: ring-expand 2s ease-out infinite;
}

@keyframes ring-expand {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.glass-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 12px;
  color: #1e293b;
  background: linear-gradient(135deg, #1e293b, #475569);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass-hint {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 28px;
  line-height: 1.6;
}

.glass-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.glass-btn {
  position: relative;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  overflow: hidden;
}

.glass-btn .btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.5s;
}

.glass-btn:hover .btn-shine {
  left: 100%;
}

.glass-btn.secondary {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #475569;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.glass-btn.secondary:hover {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.glass-btn.danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
}

.glass-btn.danger:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
}

.danger-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 12px;
  border: 2px solid rgba(239, 68, 68, 0.5);
  animation: danger-pulse 2s ease-out infinite;
}

@keyframes danger-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0;
  }
}

/* 弹窗过渡动画 */
.glass-modal-enter-active,
.glass-modal-leave-active {
  transition: all 0.3s ease;
}

.glass-modal-enter-from,
.glass-modal-leave-to {
  opacity: 0;
}

.glass-modal-enter-from .glass-modal-3d,
.glass-modal-leave-to .glass-modal-3d {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .selected-name {
    max-width: 60px;
  }
  
  .agent-dropdown {
    left: auto;
    right: 0;
  }
}
</style>
