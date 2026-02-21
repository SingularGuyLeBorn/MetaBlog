<!--
  ChatPage - AI 助手完整对话页面
  
  三栏布局：
  - 左侧：历史会话栏
  - 中间：对话主区域
  - 右侧：信源/上下文栏（可折叠）
  
  功能：
  - 完整的聊天记录增删改查
  - 长期存储（LocalStorage + 后端持久化）
  - 流式输出支持
  - 所有操作完整日志追踪
-->
<template>
  <div class="chat-page">
    <!-- 页面头部 -->
    <header class="chat-header">
      <div class="header-left">
        <div class="logo">
          <svg viewBox="0 0 24 24" class="logo-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
          </svg>
          <span>AI 助手</span>
        </div>
        <div class="status-badge" :class="connectionStatus">
          <span class="status-dot"></span>
          {{ statusText }}
        </div>
      </div>
      
      <div class="header-actions">
        <button 
          class="action-btn"
          :class="{ active: showSources }"
          @click="toggleSources"
          title="信源栏"
        >
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          信源
        </button>
        <button class="action-btn" @click="showSettings = true" title="设置">
          <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.16 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        </button>
      </div>
    </header>

    <!-- 主体三栏布局 -->
    <div class="chat-layout">
      <!-- 左侧：历史会话栏 -->
      <aside class="sidebar-left" :class="{ collapsed: leftCollapsed }">
        <div class="sidebar-header">
          <button class="new-chat-btn" @click="createNewSession">
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            新对话
          </button>
        </div>
        
        <div class="search-box">
          <svg viewBox="0 0 24 24" class="search-icon"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input 
            v-model="searchQuery" 
            placeholder="搜索历史记录..."
            @input="handleSearch"
          />
        </div>

        <div class="session-list" ref="sessionListRef">
          <!-- 今天 -->
          <div v-if="groupedSessions.today.length" class="session-group">
            <h4 class="group-title">今天</h4>
            <SessionItem
              v-for="session in groupedSessions.today"
              :key="(session as any).id"
              :session="session"
              :active="currentSessionId === (session as any).id"
              @click="switchSession((session as any).id)"
              @rename="renameSession((session as any).id, $event)"
              @delete="deleteSession((session as any).id)"
            />
          </div>
          
          <!-- 昨天 -->
          <div v-if="groupedSessions.yesterday.length" class="session-group">
            <h4 class="group-title">昨天</h4>
            <SessionItem
              v-for="session in groupedSessions.yesterday"
              :key="(session as any).id"
              :session="session"
              :active="currentSessionId === (session as any).id"
              @click="switchSession((session as any).id)"
              @rename="renameSession((session as any).id, $event)"
              @delete="deleteSession((session as any).id)"
            />
          </div>
          
          <!-- 最近7天 -->
          <div v-if="groupedSessions.thisWeek.length" class="session-group">
            <h4 class="group-title">最近7天</h4>
            <SessionItem
              v-for="session in groupedSessions.thisWeek"
              :key="(session as any).id"
              :session="session"
              :active="currentSessionId === (session as any).id"
              @click="switchSession((session as any).id)"
              @rename="renameSession((session as any).id, $event)"
              @delete="deleteSession((session as any).id)"
            />
          </div>
          
          <!-- 更早 -->
          <div v-if="groupedSessions.older.length" class="session-group">
            <h4 class="group-title">更早</h4>
            <SessionItem
              v-for="session in groupedSessions.older"
              :key="(session as any).id"
              :session="session"
              :active="currentSessionId === (session as any).id"
              @click="switchSession((session as any).id)"
              @rename="renameSession((session as any).id, $event)"
              @delete="deleteSession((session as any).id)"
            />
          </div>
          
          <!-- 空状态 -->
          <div v-if="!hasAnySessions" class="empty-sessions">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            <p>暂无历史记录</p>
            <span>点击"新对话"开始聊天</span>
          </div>
        </div>
        
        <!-- 折叠按钮 -->
        <button class="collapse-btn" @click="leftCollapsed = !leftCollapsed">
          <svg viewBox="0 0 24 24" :style="{ transform: leftCollapsed ? 'rotate(180deg)' : '' }">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
      </aside>

      <!-- 中间：对话主区域 -->
      <main class="chat-main">
        <!-- 消息列表 -->
        <div 
          ref="messageContainer"
          class="message-list"
          @scroll="handleScroll"
        >
          <!-- 欢迎区域（空状态） -->
          <div v-if="!currentMessages.length" class="welcome-area">
            <div class="welcome-content">
              <div class="welcome-icon">🤖</div>
              <h1>我是你的 AI 助手</h1>
              <p>可以帮你写作、编程、翻译、分析文档，或者只是聊聊天</p>
              
              <div class="quick-actions">
                <button 
                  v-for="prompt in quickPrompts" 
                  :key="prompt.text"
                  class="quick-action-btn"
                  @click="usePrompt(prompt.text)"
                >
                  <span class="icon">{{ prompt.icon }}</span>
                  <span class="text">{{ prompt.text }}</span>
                </button>
              </div>
            </div>
          </div>
          
          <!-- 消息列表 -->
          <template v-else>
            <ChatMessage
              v-for="(msg, index) in currentMessages"
              :key="msg.id"
              :message="msg"
              :is-streaming="isStreaming && msg.id === streamingMessageId"
              :is-first="index === 0"
              :is-last="index === currentMessages.length - 1"
              @copy="copyMessage(msg.content)"
              @regenerate="regenerateMessage(msg.id)"
              @delete="deleteMessage(msg.id)"
              @edit="editMessage(msg.id, $event)"
            />
          </template>
          
          <!-- 加载指示器 -->
          <div v-if="isLoading && !isStreaming" class="loading-indicator">
            <div class="typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="loading-text">AI 正在思考...</span>
          </div>
          
          <!-- 回到底部按钮 -->
          <Transition name="fade">
            <button 
              v-if="showScrollToBottom"
              class="scroll-to-bottom"
              @click="() => scrollToBottom()"
            >
              <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
            </button>
          </Transition>
        </div>

        <!-- 输入区域 -->
        <div class="input-area" :class="{ 'streaming': isStreaming }">
          <!-- 已选上下文 -->
          <div v-if="selectedContext.length" class="selected-context">
            <span 
              v-for="ctx in selectedContext" 
              :key="ctx.id"
              class="context-tag"
            >
              <span class="icon">{{ ctx.type === 'article' ? '📄' : '🔗' }}</span>
              {{ ctx.title }}
              <button @click="removeContext(ctx.id)" class="remove-btn">×</button>
            </span>
          </div>
          
          <div class="input-wrapper">
            <div class="input-actions-left">
              <button class="attach-btn" @click="showAttachMenu = true" title="添加附件">
                <svg viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
              </button>
            </div>
            
            <div class="input-box">
              <textarea
                ref="inputRef"
                v-model="inputContent"
                :placeholder="inputPlaceholder"
                :disabled="isLoading || isStreaming"
                @keydown="handleKeydown"
                @input="handleInput"
                rows="1"
              />
            </div>
            
            <div class="input-actions-right">
              <button 
                v-if="isStreaming"
                class="stop-btn"
                @click="stopGeneration"
                title="停止生成"
              >
                <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
              </button>
              <button 
                v-else
                class="send-btn"
                :disabled="!canSend || !inputContent.trim()"
                @click="sendMessage"
                title="发送消息"
              >
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
          
          <div class="input-footer">
            <div class="footer-left">
              <span class="hint">Enter 发送 · Shift+Enter 换行</span>
            </div>
            <div class="footer-right">
              <span v-if="error" class="error-message">{{ (error as Error)?.message }}</span>
              <span v-else-if="isStreaming" class="streaming-hint">正在生成...</span>
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧：信源/上下文栏 -->
      <aside class="sidebar-right" :class="{ collapsed: !showSources }">
        <div class="sidebar-header">
          <h3>信源与上下文</h3>
          <button class="close-btn" @click="showSources = false">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        
        <div class="sources-content">
          <!-- 当前对话上下文 -->
          <div class="source-section">
            <h4>当前对话</h4>
            <div class="context-info">
              <div class="info-item">
                <span class="label">会话ID</span>
                <span class="value">{{ currentSessionId?.slice(0, 8) || '-' }}</span>
              </div>
              <div class="info-item">
                <span class="label">消息数</span>
                <span class="value">{{ currentMessages.length }}</span>
              </div>
              <div class="info-item">
                <span class="label">Token数</span>
                <span class="value">{{ totalTokens }}</span>
              </div>
            </div>
          </div>
          
          <!-- 引用文档 -->
          <div class="source-section">
            <h4>引用文档</h4>
            <div v-if="!selectedContext.length" class="empty-source">
              <p>暂无引用的文档</p>
              <span>在对话中引用相关文档，我会结合文档内容回答</span>
            </div>
            <div v-else class="source-list">
              <div 
                v-for="ctx in selectedContext" 
                :key="ctx.id"
                class="source-item"
              >
                <span class="source-icon">{{ ctx.type === 'article' ? '📄' : '🔗' }}</span>
                <span class="source-title">{{ ctx.title }}</span>
              </div>
            </div>
          </div>
          
          <!-- 相关文章推荐 -->
          <div class="source-section">
            <h4>相关文章</h4>
            <div class="related-articles">
              <button 
                v-for="article in relatedArticles" 
                :key="article.path"
                class="related-article-btn"
                @click="addContext(article)"
              >
                <span class="icon">📄</span>
                <span class="title">{{ article.title }}</span>
                <span class="add-icon">+</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 设置弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
          <div class="modal-content settings-modal">
            <header class="modal-header">
              <h3>设置</h3>
              <button class="close-btn" @click="showSettings = false">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
              </button>
            </header>
            <div class="modal-body">
              <div class="setting-item">
                <label>模型</label>
                <select v-model="settings.model">
                  <option value="deepseek-chat">DeepSeek Chat</option>
                  <option value="deepseek-coder">DeepSeek Coder</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5</option>
                </select>
              </div>
              <div class="setting-item">
                <label>温度 ({{ settings.temperature }})</label>
                <input 
                  type="range" 
                  v-model.number="settings.temperature" 
                  min="0" 
                  max="2" 
                  step="0.1"
                />
              </div>
              <div class="setting-item">
                <label>最大 Token</label>
                <input type="number" v-model.number="settings.maxTokens" min="100" max="8000" step="100" />
              </div>
              <div class="setting-item checkbox">
                <label>
                  <input type="checkbox" v-model="settings.streamResponse" />
                  流式响应
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
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useChatStores } from '../../../agent/stores'
import { getStructuredLogger } from '../../../agent/runtime/StructuredLogger'
import SessionItem from '../agent/SessionItem.vue'
import ChatMessage from '../agent/ChatMessage.vue'

// ═══════════════════════════════════════════════════════════════
// Logger Setup
// ═══════════════════════════════════════════════════════════════

const logger = getStructuredLogger()
const log = {
  component: (event: string, data?: any) => logger.info('chat:component', event, data),
  session: (event: string, data?: any) => logger.info('chat:session', event, data),
  message: (event: string, data?: any) => logger.info('chat:message', event, data),
  ui: (event: string, data?: any) => logger.info('chat:ui', event, data),
  error: (event: string, error: any, data?: any) => logger.error('chat:error', event, { error, ...data })
}

// ═══════════════════════════════════════════════════════════════
// Setup
// ═══════════════════════════════════════════════════════════════

const { chat, session, message } = useChatStores()

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════

// UI 状态
const leftCollapsed = ref(false)
const showSources = ref(false)
const showSettings = ref(false)
const showAttachMenu = ref(false)
const searchQuery = ref('')

// Refs
const messageContainer = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()
const sessionListRef = ref<HTMLElement>()

// 输入
const inputContent = ref('')
const selectedContext = ref<Array<{ id: string; title: string; type: string; content?: string }>>([])

// 设置
const settings = ref({
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 2000,
  streamResponse: true
})

// 快速提示
const quickPrompts = [
  { icon: '✍️', text: '帮我写一篇技术博客' },
  { icon: '💻', text: '解释这段代码的作用' },
  { icon: '🐛', text: '帮我调试这个错误' },
  { icon: '📚', text: '总结这篇文章的要点' },
  { icon: '🔧', text: '优化这段代码性能' },
  { icon: '🌐', text: '翻译这段英文' }
]

// 推荐文章（模拟）
const relatedArticles = ref([
  { id: '1', title: 'Vue 3 组合式函数最佳实践', path: '/posts/vue3-composables', type: 'article' },
  { id: '2', title: 'TypeScript 高级类型技巧', path: '/posts/ts-advanced-types', type: 'article' },
  { id: '3', title: 'Node.js 性能优化指南', path: '/posts/nodejs-performance', type: 'article' }
])

// 滚动状态
const showScrollToBottom = ref(false)
const isUserScrolling = ref(false)
let scrollTimeout: number | null = null

// ═══════════════════════════════════════════════════════════════
// Computed
// ═══════════════════════════════════════════════════════════════

const currentSessionId = computed(() => chat.currentSessionId)
const currentMessages = computed(() => chat.currentMessages)
const isLoading = computed(() => chat.isLoading)
const isStreaming = computed(() => chat.isStreaming)
const canSend = computed(() => chat.canSend && inputContent.value.trim().length > 0)
const error = computed(() => chat.error)

const connectionStatus = computed(() => {
  if (isStreaming.value) return 'streaming'
  if (isLoading.value) return 'loading'
  return 'connected'
})

const statusText = computed(() => {
  if (isStreaming.value) return '生成中'
  if (isLoading.value) return '思考中'
  return '已连接'
})

const streamingMessageId = computed(() => {
  const last = currentMessages.value[currentMessages.value.length - 1]
  return last?.role === 'assistant' ? last.id : null
})

const inputPlaceholder = computed(() => {
  if (isStreaming.value) return 'AI 正在生成回复...'
  if (isLoading.value) return '处理中...'
  return '输入消息，Enter 发送...'
})

const totalTokens = computed(() => {
  return currentMessages.value.reduce((sum, msg) => {
    return sum + (msg.metadata?.tokens?.total || 0)
  }, 0)
})

const hasAnySessions = computed(() => {
  return session.sessions.length > 0
})

const groupedSessions = computed(() => ({
  today: session.todaySessions,
  yesterday: session.yesterdaySessions,
  thisWeek: session.thisWeekSessions,
  older: session.olderSessions
}))

// ═══════════════════════════════════════════════════════════════
// Methods
// ═══════════════════════════════════════════════════════════════

// 会话管理
async function createNewSession() {
  log.session('create_new', { timestamp: Date.now() })
  await chat.newChat('新对话')
  inputContent.value = ''
  chat.updateInput('')  // 同步到状态机，重置状态
  await nextTick(() => {
    inputRef.value?.focus()
    scrollToBottom()
  })
}

async function switchSession(sessionId: string) {
  log.session('switch', { sessionId, from: currentSessionId.value })
  await chat.switchSession(sessionId)
  inputContent.value = ''
  chat.updateInput('')  // 同步到状态机，重置状态
  await nextTick(() => {
    scrollToBottom()
  })
}

async function renameSession(sessionId: string, newTitle: string) {
  log.session('rename', { sessionId, newTitle })
  await session.updateSession(sessionId, { title: newTitle })
}

async function deleteSession(sessionId: string) {
  log.session('delete', { sessionId })
  if (confirm('确定要删除这个会话吗？')) {
    await session.deleteSession(sessionId)
    if (currentSessionId.value === sessionId) {
      chat.reset()
    }
  }
}

function handleSearch() {
  log.ui('search', { query: searchQuery.value })
  session.searchQuery = searchQuery.value
}

// 消息操作
async function sendMessage() {
  const content = inputContent.value.trim()
  if (!content || !canSend.value) return

  log.message('send', { 
    contentLength: content.length,
    hasContext: selectedContext.value.length > 0
  })

  // 清空本地输入
  inputContent.value = ''
  adjustTextareaHeight()
  
  // 清空已选上下文
  selectedContext.value = []
  
  // 直接传递内容，不再依赖 store 的 inputContent
  const success = await chat.sendMessage(content, { 
    stream: settings.value.streamResponse 
  })
  
  if (success) {
    log.message('send_success', { timestamp: Date.now() })
    await nextTick(() => scrollToBottom())
  } else {
    log.error('send_failed', chat.error)
  }
}

async function stopGeneration() {
  log.message('stop_generation', { timestamp: Date.now() })
  await chat.interrupt()
}

async function regenerateMessage(messageId: string) {
  log.message('regenerate', { messageId })
  await chat.retry()
}

async function deleteMessage(messageId: string) {
  log.message('delete', { messageId })
  message.deleteMessage(messageId)
}

async function editMessage(messageId: string, newContent: string) {
  log.message('edit', { messageId, contentLength: newContent.length })
  message.updateMessage(messageId, { content: newContent })
}

function copyMessage(content: string) {
  log.ui('copy_message', { contentLength: content.length })
  navigator.clipboard.writeText(content)
}

function usePrompt(prompt: string) {
  log.ui('use_prompt', { prompt })
  inputContent.value = prompt
  inputRef.value?.focus()
  adjustTextareaHeight()
}

// 上下文管理
function addContext(article: any) {
  log.ui('add_context', { articleId: article.id, title: article.title })
  if (!selectedContext.value.find(c => c.id === article.id)) {
    selectedContext.value.push({
      id: article.id,
      title: article.title,
      type: article.type
    })
  }
}

function removeContext(id: string) {
  log.ui('remove_context', { contextId: id })
  selectedContext.value = selectedContext.value.filter(c => c.id !== id)
}

function toggleSources() {
  showSources.value = !showSources.value
  log.ui('toggle_sources', { show: showSources.value })
}

// 输入处理
function handleInput() {
  chat.updateInput(inputContent.value)
  adjustTextareaHeight()
}

function handleKeydown(e: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (canSend.value) {
      sendMessage()
    }
  }
  
  // Ctrl/Cmd + C 停止生成
  if (e.key === 'c' && (e.ctrlKey || e.metaKey) && isStreaming.value) {
    e.preventDefault()
    stopGeneration()
  }
}

function adjustTextareaHeight() {
  const textarea = inputRef.value
  if (!textarea) return
  
  textarea.style.height = 'auto'
  const newHeight = Math.min(textarea.scrollHeight, 200)
  textarea.style.height = newHeight + 'px'
}

// 滚动处理
function handleScroll() {
  const container = messageContainer.value
  if (!container) return
  
  const { scrollTop, scrollHeight, clientHeight } = container
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
  
  showScrollToBottom.value = !isAtBottom && currentMessages.value.length > 0
  
  // 标记用户在手动滚动
  isUserScrolling.value = true
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  scrollTimeout = window.setTimeout(() => {
    isUserScrolling.value = false
  }, 1000)
}

function scrollToBottom(smooth = true) {
  const container = messageContainer.value
  if (!container || isUserScrolling.value) return
  
  container.scrollTo({
    top: container.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  })
}

// ═══════════════════════════════════════════════════════════════
// Lifecycle
// ═══════════════════════════════════════════════════════════════

onMounted(async () => {
  log.component('mount', { 
    timestamp: Date.now(),
    hasSession: !!currentSessionId.value
  })
  
  // 初始化会话列表（从后端加载）
  if (!session.isInitialized) {
    await session.initialize()
  }
  
  // 如果没有当前会话，创建一个默认会话
  if (!currentSessionId.value && session.sessions.length === 0) {
    await createNewSession()
  }
  
  // 自动滚动到底部
  await nextTick(() => scrollToBottom(false))
})

onUnmounted(() => {
  log.component('unmount', { timestamp: Date.now() })
})

// 监听消息变化，自动滚动
watch(() => currentMessages.value.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    nextTick(() => scrollToBottom())
  }
})

// 监听流式输出
watch(isStreaming, (streaming) => {
  if (streaming) {
    nextTick(() => scrollToBottom())
  }
})
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

/* ═══════════════════════════════════════════════════════════════
   Header
   ═══════════════════════════════════════════════════════════════ */

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
}

.logo-icon {
  width: 28px;
  height: 28px;
  fill: currentColor;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 13px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
}

.status-badge.streaming .status-dot {
  background: #f59e0b;
  animation: pulse 1.5s infinite;
}

.status-badge.loading .status-dot {
  background: #3b82f6;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.action-btn.active {
  background: rgba(255, 255, 255, 0.25);
}

.action-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* ═══════════════════════════════════════════════════════════════
   Layout
   ═══════════════════════════════════════════════════════════════ */

.chat-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ═══════════════════════════════════════════════════════════════
   Left Sidebar
   ═══════════════════════════════════════════════════════════════ */

.sidebar-left {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-alt);
  border-right: 1px solid var(--vp-c-divider);
  transition: width 0.3s ease;
  position: relative;
}

.sidebar-left.collapsed {
  width: 0;
  overflow: hidden;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.new-chat-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 14px;
  outline: none;
}

.search-box input::placeholder {
  color: var(--vp-c-text-3);
}

.search-icon {
  width: 18px;
  height: 18px;
  fill: var(--vp-c-text-3);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-group {
  margin-bottom: 16px;
}

.group-title {
  padding: 8px 12px;
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-sessions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--vp-c-text-3);
}

.empty-sessions svg {
  width: 48px;
  height: 48px;
  fill: currentColor;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-sessions p {
  margin: 0 0 4px;
  font-size: 14px;
}

.empty-sessions span {
  font-size: 12px;
  opacity: 0.7;
}

.collapse-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0 8px 8px 0;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  cursor: pointer;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.collapse-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  transition: transform 0.3s;
}

/* ═══════════════════════════════════════════════════════════════
   Main Chat Area
   ═══════════════════════════════════════════════════════════════ */

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--vp-c-bg);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scroll-behavior: smooth;
}

.welcome-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.welcome-content {
  text-align: center;
  max-width: 600px;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.welcome-content h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 12px;
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.welcome-content p {
  font-size: 16px;
  color: var(--vp-c-text-2);
  margin: 0 0 32px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.quick-action-btn:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  transform: translateY(-2px);
}

.quick-action-btn .icon {
  font-size: 24px;
}

.quick-action-btn .text {
  flex: 1;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: var(--vp-c-text-3);
}

.typing-animation {
  display: flex;
  gap: 4px;
}

.typing-animation span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-brand);
  animation: typing 1.4s infinite ease-in-out both;
}

.typing-animation span:nth-child(1) { animation-delay: -0.32s; }
.typing-animation span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.scroll-to-bottom {
  position: absolute;
  bottom: 140px;
  right: 32px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  z-index: 100;
}

.scroll-to-bottom:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  transform: translateY(-2px);
}

.scroll-to-bottom svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
  transform: rotate(180deg);
}

/* ═══════════════════════════════════════════════════════════════
   Input Area
   ═══════════════════════════════════════════════════════════════ */

.input-area {
  padding: 16px 24px;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-divider);
}

.input-area.streaming {
  background: var(--vp-c-brand-soft);
}

.selected-context {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.context-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 6px;
  font-size: 13px;
}

.context-tag .remove-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: currentColor;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.context-tag .remove-btn:hover {
  opacity: 1;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 12px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.input-wrapper:focus-within {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.input-actions-left,
.input-actions-right {
  display: flex;
  align-items: center;
}

.attach-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.2s;
}

.attach-btn:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.attach-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.input-box {
  flex: 1;
  min-width: 0;
}

.input-box textarea {
  width: 100%;
  min-height: 24px;
  max-height: 200px;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.input-box textarea::placeholder {
  color: var(--vp-c-text-3);
}

.input-box textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn,
.stop-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn {
  background: var(--vp-c-brand);
  color: white;
}

.send-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stop-btn {
  background: #ef4444;
  color: white;
  animation: pulse 1s infinite;
}

.send-btn svg,
.stop-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 0 4px;
  font-size: 12px;
}

.hint {
  color: var(--vp-c-text-3);
}

.error-message {
  color: #ef4444;
}

.streaming-hint {
  color: var(--vp-c-brand);
}

/* ═══════════════════════════════════════════════════════════════
   Right Sidebar (Sources)
   ═══════════════════════════════════════════════════════════════ */

.sidebar-right {
  width: 300px;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-alt);
  border-left: 1px solid var(--vp-c-divider);
  transition: width 0.3s ease;
}

.sidebar-right.collapsed {
  width: 0;
  overflow: hidden;
}

.sidebar-right .sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
}

.sidebar-right .sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.sidebar-right .close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-right .close-btn:hover {
  background: var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.sidebar-right .close-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.sources-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.source-section {
  margin-bottom: 24px;
}

.source-section h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.context-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--vp-c-bg);
  border-radius: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.info-item .label {
  color: var(--vp-c-text-3);
}

.info-item .value {
  color: var(--vp-c-text-1);
  font-family: monospace;
}

.empty-source {
  padding: 20px;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 13px;
}

.empty-source p {
  margin: 0 0 4px;
}

.empty-source span {
  font-size: 12px;
  opacity: 0.7;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--vp-c-bg);
  border-radius: 8px;
  font-size: 13px;
}

.source-icon {
  font-size: 16px;
}

.source-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-articles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.related-article-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.related-article-btn:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.related-article-btn .icon {
  font-size: 16px;
}

.related-article-btn .title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-article-btn .add-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--vp-c-brand);
  color: white;
  font-size: 12px;
}

/* ═══════════════════════════════════════════════════════════════
   Modal
   ═══════════════════════════════════════════════════════════════ */

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--vp-c-bg);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-header .close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.2s;
}

.modal-header .close-btn:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.modal-header .close-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.modal-body {
  padding: 24px;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.setting-item select,
.setting-item input[type="number"] {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 14px;
}

.setting-item input[type="range"] {
  width: 100%;
}

.setting-item.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.setting-item.checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* ═══════════════════════════════════════════════════════════════
   Responsive
   ═══════════════════════════════════════════════════════════════ */

@media (max-width: 1024px) {
  .sidebar-right {
    position: fixed;
    right: 0;
    top: 64px;
    bottom: 0;
    z-index: 100;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  }
  
  .sidebar-right.collapsed {
    transform: translateX(100%);
  }
}

@media (max-width: 768px) {
  .chat-header {
    padding: 12px 16px;
  }
  
  .logo span {
    display: none;
  }
  
  .sidebar-left {
    position: fixed;
    left: 0;
    top: 64px;
    bottom: 0;
    z-index: 100;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1);
  }
  
  .sidebar-left.collapsed {
    transform: translateX(-100%);
  }
  
  .message-list {
    padding: 16px;
  }
  
  .welcome-content h1 {
    font-size: 24px;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .input-area {
    padding: 12px 16px;
  }
}
</style>
