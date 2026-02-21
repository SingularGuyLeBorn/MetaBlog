<!--
  ChatLayout - 聊天主布局（浅色主题）
-->
<template>
  <div class="chat-layout">
    <!-- 左侧会话面板 -->
    <SessionPanel
      :sessions="sessions"
      :current-id="currentSessionId"
      :collapsed="leftCollapsed"
      @create="createSession()"
      @switch="switchSession"
      @rename="handleRename"
      @delete="handleDelete"
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
          <!-- 返回首页按钮 -->
          <a href="/" class="back-btn" title="返回首页">
            <Icon name="arrow-left" :size="18" />
          </a>
          <div class="header-info">
            <h1 class="session-title">{{ currentSession?.title || '新对话' }}</h1>
            <span v-if="currentSession" class="model-tag">
              {{ currentSession.config.model }}
            </span>
            <!-- 当前激活的 Agent 标签 -->
            <span v-if="activeAgent" class="agent-badge" @click="showAgentAdmin = true">
              <span class="badge-avatar">{{ activeAgent.avatar }}</span>
              <span class="badge-name">{{ activeAgent.name }}</span>
            </span>
          </div>
        </div>
        <div class="header-right">
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
        @send="handleSend"
        @stop="interruptGeneration"
        @select-skill="handleSelectSkill"
      />
    </main>

    <!-- 右侧设置面板 -->
    <SettingsPanel
      :config="currentConfig"
      :collapsed="rightCollapsed"
      @update:config="updateConfig"
      @toggle-collapse="rightCollapsed = !rightCollapsed"
    />

    <!-- Agent 管理中心 -->
    <AgentAdmin
      v-model:visible="showAgentAdmin"
      @agent-change="handleAgentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { SessionPanel } from '../modules/chat/session'
import { MessageList } from '../modules/chat/messages'
import { ChatInput } from '../modules/chat/input'
import { SettingsPanel } from '../modules/chat/settings'
import { AgentAdmin } from '../modules/agent/admin'
import { Icon } from '../ui'
import { useAIChat, useAgents } from '../core/composables'
import type { SessionConfig } from '../core/types'
import type { Skill } from '../core/composables/useSkills'
import type { Agent } from '../core/composables/useAgents'

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

const { activeAgent } = useAgents()

const leftCollapsed = ref(false)
const rightCollapsed = ref(true)
const inputText = ref('')
const messageListRef = ref<InstanceType<typeof MessageList>>()
const chatInputRef = ref<InstanceType<typeof ChatInput>>()
const showAgentAdmin = ref(false)
const selectedSkill = ref<Skill | undefined>(undefined)

const currentConfig = computed({
  get: () => currentSession.value?.config || defaultConfig,
  set: (val) => {
    // 更新配置
  }
})

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
  
  // 使用当前 Agent 的系统提示词 + 技能系统提示词
  if (currentSessionId.value) {
    let systemPrompt = activeAgent.value?.systemPrompt || '你是一个 helpful 的 AI 助手。'
    if (skillInfo?.systemPrompt) {
      systemPrompt = skillInfo.systemPrompt
    }
    updateSessionConfig(currentSessionId.value, { systemPrompt })
  }
  
  // 发送消息（包含技能信息用于UI显示）
  await sendMessage(content, skillInfo)
}

function handleQuickPrompt(text: string) {
  inputText.value = text
  nextTick(() => {
    chatInputRef.value?.focus()
  })
}

function handleRename(id: string) {
  const newTitle = prompt('重命名会话：')
  if (newTitle?.trim()) {
    renameSession(id, newTitle.trim())
  }
}

function handleDelete(id: string) {
  if (confirm('确定要删除这个会话吗？')) {
    deleteSession(id)
  }
}

function updateConfig(config: Partial<SessionConfig>) {
  if (currentSessionId.value) {
    updateSessionConfig(currentSessionId.value, config)
  }
}

function handleSelectSkill(skill: Skill | undefined) {
  selectedSkill.value = skill
}

function handleAgentChange(agent: Agent) {
  // Agent 切换后的处理
  console.log('切换到 Agent:', agent.name)
}
</script>

<style scoped>

.chat-layout {
  display: flex;
  height: 100vh;
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

/* Agent 徽章 */
.agent-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
}

.agent-badge:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  border-color: rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.badge-avatar {
  font-size: 14px;
}

.badge-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-brand);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 返回首页按钮 */
.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-md);
  color: var(--ai-text-tertiary);
  text-decoration: none;
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.back-btn:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

/* 响应式 */
@media (max-width: 1024px) {
  .chat-layout :deep(.session-panel),
  .chat-layout :deep(.settings-panel) {
    position: absolute;
    z-index: 100;
    height: 100%;
    box-shadow: var(--ai-shadow-xl);
  }
  
  .chat-layout :deep(.session-panel) {
    left: 0;
  }
  
  .chat-layout :deep(.settings-panel) {
    right: 0;
  }
}
</style>
