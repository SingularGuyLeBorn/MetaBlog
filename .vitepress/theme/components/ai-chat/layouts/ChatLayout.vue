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
          <div class="header-info">
            <h1 class="session-title">{{ currentSession?.title || '新对话' }}</h1>
            <span v-if="currentSession" class="model-tag">
              {{ currentSession.config.model }}
            </span>
          </div>
        </div>
        <div class="header-right">
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
      :session-id="currentSessionId"
        :is-streaming="isStreaming"
        @use-prompt="handleQuickPrompt"
        @regenerate="regenerateLastMessage()"
      />

      <!-- 输入框 -->
      <ChatInput
        ref="chatInputRef"
        v-model="inputText"
        :is-streaming="isStreaming"
        @send="handleSend"
        @stop="interruptGeneration"
      />
    </main>

    <!-- 右侧设置面板 -->
    <SettingsPanel
      :config="currentConfig"
      :collapsed="rightCollapsed"
      @update:config="updateConfig"
      @toggle-collapse="rightCollapsed = !rightCollapsed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { SessionPanel, MessageList, ChatInput, SettingsPanel } from '../features'
import { Icon } from '../ui'
import { useAIChat } from '../composables/useAIChat'
import type { SessionConfig } from '../composables/types'

const {
  sessions,
  currentSessionId,
  currentSession,
  messages,
  isStreaming,
  defaultConfig,
  createSession,
  switchSession,
  renameSession,
  deleteSession,
  sendMessage,
  interruptGeneration,
  clearMessages,
  regenerateLastMessage,
  updateSessionConfig
} = useAIChat()

const leftCollapsed = ref(false)
const rightCollapsed = ref(true)
const inputText = ref('')
const messageListRef = ref<InstanceType<typeof MessageList>>()
const chatInputRef = ref<InstanceType<typeof ChatInput>>()



const currentConfig = computed({
  get: () => currentSession.value?.config || defaultConfig,
  set: (val) => {
    // 更新配置
  }
})

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return
  
  inputText.value = ''
  
  // 立即滚动到底部
  nextTick(() => {
    messageListRef.value?.scrollToBottom()
    chatInputRef.value?.focus()
  })
  
  await sendMessage(text)
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

.header-right {
  display: flex;
  gap: var(--ai-space-2);
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
