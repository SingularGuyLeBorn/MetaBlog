<!--
  AIChatOrbNew - 新版 AI Chat 组件
  
  基于 Pinia 状态管理架构
  功能完整、代码清晰、易于维护
-->
<template>
  <Teleport to="body">
    <!-- 悬浮按钮 -->
    <Transition name="orb">
      <button
        v-if="!isOpen"
        class="chat-orb"
        @click="open"
        aria-label="打开 AI 助手"
      >
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
        </svg>
        <span v-if="unreadCount" class="badge">{{ unreadCount }}</span>
      </button>
    </Transition>
    
    <!-- 聊天窗口 -->
    <Transition name="window">
      <div v-if="isOpen" class="chat-window" :class="{ 'maximized': isMaximized }">
        <!-- 头部 -->
        <header class="chat-header">
          <div class="header-left">
            <h3>AI 助手</h3>
            <span class="state-badge" :class="currentState.toLowerCase()">
              {{ stateLabel }}
            </span>
          </div>
          <div class="header-actions">
            <button 
              v-if="canInterrupt"
              class="action-btn danger"
              @click="interrupt"
              title="停止生成"
            >
              <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
            </button>
            <button class="action-btn" @click="toggleMaximize" :title="isMaximized ? '还原' : '最大化'">
              <svg v-if="!isMaximized" viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              <svg v-else viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            </button>
            <button class="action-btn" @click="close" title="关闭">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
        </header>
        
        <!-- 主体区域 -->
        <div class="chat-body">
          <!-- 侧边栏：会话列表 -->
          <aside v-if="showSidebar" class="chat-sidebar">
            <div class="sidebar-header">
              <button class="new-chat-btn" @click="createNewSession">
                <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                新对话
              </button>
            </div>
            
            <div class="session-list">
              <!-- 今天 -->
              <div v-if="today.length" class="session-group">
                <h4>今天</h4>
                <SessionItem
                  v-for="s in today"
                  :key="(s as any).id"
                  :session="s"
                  :active="(s as any).id === currentId"
                  @click="switchSession((s as any).id)"
                  @delete="deleteSession((s as any).id)"
                />
              </div>
              
              <!-- 昨天 -->
              <div v-if="yesterday.length" class="session-group">
                <h4>昨天</h4>
                <SessionItem
                  v-for="s in yesterday"
                  :key="(s as any).id"
                  :session="s"
                  :active="(s as any).id === currentId"
                  @click="switchSession((s as any).id)"
                  @delete="deleteSession((s as any).id)"
                />
              </div>
              
              <!-- 最近7天 -->
              <div v-if="thisWeek.length" class="session-group">
                <h4>最近7天</h4>
                <SessionItem
                  v-for="s in thisWeek"
                  :key="(s as any).id"
                  :session="s"
                  :active="(s as any).id === currentId"
                  @click="switchSession((s as any).id)"
                  @delete="deleteSession((s as any).id)"
                />
              </div>
              
              <!-- 更早 -->
              <div v-if="older.length" class="session-group">
                <h4>更早</h4>
                <SessionItem
                  v-for="s in older"
                  :key="(s as any).id"
                  :session="s"
                  :active="(s as any).id === currentId"
                  @click="switchSession((s as any).id)"
                  @delete="deleteSession((s as any).id)"
                />
              </div>
            </div>
          </aside>
          
          <!-- 聊天区域 -->
          <main class="chat-main">
            <!-- 消息列表 -->
            <div 
              ref="messageContainer"
              class="message-list"
              @scroll="onScroll"
            >
              <!-- 空状态 -->
              <div v-if="!messages.length" class="empty-state">
                <div class="empty-icon">💬</div>
                <h3>开始新的对话</h3>
                <p>输入问题，AI 助手会为你解答</p>
                <div class="quick-prompts">
                  <button 
                    v-for="prompt in quickPrompts" 
                    :key="prompt"
                    @click="usePrompt(prompt)"
                  >
                    {{ prompt }}
                  </button>
                </div>
              </div>
              
              <!-- 消息 -->
              <template v-else>
                <ChatMessage
                  v-for="msg in messages"
                  :key="msg.id"
                  :message="msg"
                  :is-streaming="msg.id === streamingMessageId && isStreaming"
                  @copy="copyToClipboard"
                  @regenerate="regenerate"
                />
                
                <!-- 加载指示器 -->
                <div v-if="isLoading && !isStreaming" class="loading-indicator">
                  <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </template>
              
              <!-- 返回底部按钮 -->
              <button 
                v-if="!isAtBottom && messages.length"
                class="scroll-to-bottom"
                @click="scrollToBottom"
              >
                <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
              </button>
            </div>
            
            <!-- 输入区域 -->
            <div class="chat-input-area" :class="{ 'streaming': isStreaming }">
              <!-- 已选文章标签 -->
              <div v-if="inputArticles.length" class="selected-articles">
                <span 
                  v-for="article in inputArticles" 
                  :key="article.id"
                  class="article-tag"
                >
                  📄 {{ article.title }}
                  <button @click="removeArticle(article.id)">×</button>
                </span>
              </div>
              
              <div class="input-wrapper">
                <div
                  ref="inputRef"
                  class="rich-input"
                  :class="{ disabled: !canSend }"
                  contenteditable="true"
                  :placeholder="inputPlaceholder"
                  @input="onInput"
                  @keydown="handleKeydown"
                  @paste="handlePaste"
                />
                
                <div class="input-actions">
                  <button 
                    class="action-icon"
                    @click="showArticleSelector = true"
                    title="引用文章"
                  >
                    <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                  </button>
                  
                  <button 
                    v-if="isStreaming"
                    class="send-btn stop"
                    @click="interrupt"
                  >
                    <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>
                  </button>
                  <button 
                    v-else
                    class="send-btn"
                    :disabled="!canSend || !inputContent.trim()"
                    @click="send"
                  >
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                  </button>
                </div>
              </div>
              
              <div class="input-footer">
                <span class="hint">Enter 发送 · Shift+Enter 换行</span>
                <span v-if="error" class="error">{{ (error as Error)?.message }}</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useChat, useChatInput, useChatHistory } from '../../composables'
import { useAutoScroll } from '../../composables/useVirtualScroll'
import ChatMessage from './examples/ChatMessage.vue'
import SessionItem from './SessionItem.vue'

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════

const isOpen = ref(false)
const isMaximized = ref(false)
const showSidebar = ref(true)
const showArticleSelector = ref(false)
const unreadCount = ref(0)
const inputRef = ref<HTMLElement>()

// Quick prompts
const quickPrompts = [
  '帮我总结这篇文章',
  '写一个关于 Vue 3 的教程',
  '优化这段代码',
  '解释这个概念'
]

// ═══════════════════════════════════════════════════════════════
// Chat 相关
// ═══════════════════════════════════════════════════════════════

const { 
  messages,
  isLoading,
  isStreaming,
  canSend,
  canInterrupt,
  currentState,
  inputContent,
  updateInput,
  sendMessage,
  interrupt,
  regenerate: chatRegenerate,
  newChat
} = useChat({
  autoScroll: true
})

const { 
  handleKeydown: handleInputKeydown,
  clearInput 
} = useChatInput()

const { 
  today, yesterday, thisWeek, older,
  currentId,
  create: createSession,
  delete: deleteSession,
  switch: switchSession
} = useChatHistory()

// ═══════════════════════════════════════════════════════════════
// 自动滚动
// ═══════════════════════════════════════════════════════════════

const messageContainer = ref<HTMLElement>()
const { 
  isAtBottom,
  onScroll,
  scrollToBottom 
} = useAutoScroll(messageContainer)

// ═══════════════════════════════════════════════════════════════
// 计算属性
// ═══════════════════════════════════════════════════════════════

const stateLabel = computed(() => {
  const labels: Record<string, string> = {
    'IDLE': '就绪',
    'COMPOSING': '输入中',
    'SENDING': '发送中',
    'RECEIVING': '接收中',
    'STREAMING': '生成中',
    'ERROR': '出错了',
    'INTERRUPTED': '已中断'
  }
  return labels[currentState.value] || currentState.value
})

const streamingMessageId = computed(() => {
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' ? last.id : null
})

const inputPlaceholder = computed(() => {
  if (isStreaming.value) return 'AI 正在生成回复...'
  if (isLoading.value) return '处理中...'
  return '输入消息，Enter 发送...'
})

const inputArticles = computed((): Array<{ id: string; title: string }> => {
  // 从 store 获取已选文章
  return []
})

const error = computed(() => null)

// ═══════════════════════════════════════════════════════════════
// 窗口控制
// ═══════════════════════════════════════════════════════════════

function open() {
  isOpen.value = true
  unreadCount.value = 0
  nextTick(() => scrollToBottom())
}

function close() {
  isOpen.value = false
}

function toggleMaximize() {
  isMaximized.value = !isMaximized.value
}

// ═══════════════════════════════════════════════════════════════
// 输入处理
// ═══════════════════════════════════════════════════════════════

function onInput(e: Event) {
  const target = e.target as HTMLElement
  updateInput(target.innerText)
}

function handleKeydown(e: KeyboardEvent) {
  handleInputKeydown(e, () => send())
}

function handlePaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

async function send() {
  const content = inputRef.value?.innerText.trim()
  if (!content) return
  
  // 清空输入
  if (inputRef.value) {
    inputRef.value.innerText = ''
  }
  clearInput()
  
  await sendMessage(content, { stream: true })
}

function usePrompt(prompt: string) {
  if (inputRef.value) {
    inputRef.value.innerText = prompt
    updateInput(prompt)
    inputRef.value.focus()
  }
}

function removeArticle(id: string) {
  // 从 store 移除文章
}

// ═══════════════════════════════════════════════════════════════
// 会话管理
// ═══════════════════════════════════════════════════════════════

async function createNewSession() {
  await newChat()
  nextTick(() => {
    inputRef.value?.focus()
    scrollToBottom()
  })
}

// ═══════════════════════════════════════════════════════════════
// 其他
// ═══════════════════════════════════════════════════════════════

async function regenerate() {
  await chatRegenerate()
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

// ═══════════════════════════════════════════════════════════════
// 监听
// ═══════════════════════════════════════════════════════════════

// 监听新消息，增加未读计数
watch(() => messages.value.length, (newLen, oldLen) => {
  if (newLen > oldLen && !isOpen.value) {
    unreadCount.value++
  }
})

// 流式生成时自动滚动
watch(isStreaming, (streaming) => {
  if (streaming) {
    nextTick(() => scrollToBottom())
  }
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   悬浮按钮
   ═══════════════════════════════════════════════════════════════ */

.chat-orb {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-orb:hover {
  transform: scale(1.1) rotate(10deg);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.5);
}

.chat-orb svg {
  width: 28px;
  height: 28px;
  fill: currentColor;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* ═══════════════════════════════════════════════════════════════
   聊天窗口
   ═══════════════════════════════════════════════════════════════ */

.chat-window {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 400px;
  height: 600px;
  background: var(--bg-primary, #ffffff);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
}

.chat-window.maximized {
  width: calc(100vw - 48px);
  height: calc(100vh - 48px);
  bottom: 24px;
  right: 24px;
}

/* ═══════════════════════════════════════════════════════════════
   头部
   ═══════════════════════════════════════════════════════════════ */

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.state-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(255,255,255,0.2);
  text-transform: uppercase;
}

.state-badge.streaming {
  background: #10b981;
  animation: glow 1.5s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.header-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255,255,255,0.2);
}

.action-btn.danger {
  background: #ef4444;
  animation: pulse 1s infinite;
}

.action-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* ═══════════════════════════════════════════════════════════════
   主体
   ═══════════════════════════════════════════════════════════════ */

.chat-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ═══════════════════════════════════════════════════════════════
   侧边栏
   ═══════════════════════════════════════════════════════════════ */

.chat-sidebar {
  width: 240px;
  border-right: 1px solid var(--border-color, #e5e7eb);
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary, #f9fafb);
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.new-chat-btn {
  width: 100%;
  padding: 10px;
  border: 1px dashed var(--border-color, #d1d5db);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  border-color: var(--primary-color, #667eea);
  color: var(--primary-color, #667eea);
  background: rgba(102, 126, 234, 0.05);
}

.new-chat-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-group {
  margin-bottom: 16px;
}

.session-group h4 {
  padding: 8px 12px;
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ═══════════════════════════════════════════════════════════════
   聊天主区域
   ═══════════════════════════════════════════════════════════════ */

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  position: relative;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary, #6b7280);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 18px;
  color: var(--text-primary, #111827);
}

.empty-state p {
  margin: 0 0 24px;
  font-size: 14px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 300px;
}

.quick-prompts button {
  padding: 8px 16px;
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 20px;
  background: white;
  color: var(--text-secondary, #6b7280);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-prompts button:hover {
  border-color: var(--primary-color, #667eea);
  color: var(--primary-color, #667eea);
  background: rgba(102, 126, 234, 0.05);
}

.loading-indicator {
  padding: 16px;
  display: flex;
  justify-content: center;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color, #667eea);
  animation: bounce 1.4s ease-in-out infinite both;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

.scroll-to-bottom {
  position: absolute;
  bottom: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-primary, white);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s;
}

.scroll-to-bottom:hover {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-primary, #111827);
  transform: translateY(-2px);
}

.scroll-to-bottom svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
  transform: rotate(180deg);
}

/* ═══════════════════════════════════════════════════════════════
   输入区域
   ═══════════════════════════════════════════════════════════════ */

.chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-secondary, #f9fafb);
}

.chat-input-area.streaming {
  background: rgba(102, 126, 234, 0.05);
}

.selected-articles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.article-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(102, 126, 234, 0.1);
  color: var(--primary-color, #667eea);
  border-radius: 4px;
  font-size: 12px;
}

.article-tag button {
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  color: currentColor;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.article-tag button:hover {
  opacity: 1;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 10px 14px;
  background: var(--bg-primary, white);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
}

.rich-input {
  flex: 1;
  min-height: 24px;
  max-height: 200px;
  padding: 2px 0;
  outline: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary, #111827);
  word-break: break-word;
}

.rich-input:empty::before {
  content: attr(placeholder);
  color: var(--text-placeholder, #9ca3af);
}

.rich-input.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.action-icon {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-icon:hover {
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-primary, #111827);
}

.action-icon svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.send-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--primary-color, #667eea);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: var(--primary-hover, #5a67d8);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn.stop {
  background: #ef4444;
  animation: pulse 1s infinite;
}

.send-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 0 4px;
  font-size: 11px;
}

.hint {
  color: var(--text-tertiary, #9ca3af);
}

.error {
  color: #ef4444;
}

/* ═══════════════════════════════════════════════════════════════
   过渡动画
   ═══════════════════════════════════════════════════════════════ */

.orb-enter-active,
.orb-leave-active {
  transition: all 0.3s ease;
}

.orb-enter-from,
.orb-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.window-enter-active,
.window-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.window-enter-from,
.window-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
</style>
