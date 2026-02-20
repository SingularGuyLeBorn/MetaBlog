<template>
  <!-- Floating Orb Button -->
  <Transition name="orb-fade">
    <div
      v-if="!isOpen"
      ref="orbRef"
      class="ai-orb"
      @click="openConsole"
      :style="orbPositionStyle"
    >
      <div class="orb-inner">
        <!-- P4-Icon: 可爱小机器人图标 -->
        <svg class="orb-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- 身体 -->
          <circle cx="32" cy="34" r="22" fill="url(#bodyGradient)" stroke="white" stroke-width="2"/>
          <!-- 左眼 -->
          <circle cx="25" cy="30" r="5" fill="white"/>
          <circle cx="25" cy="30" r="2.5" fill="#1E40AF"/>
          <!-- 右眼 -->
          <circle cx="39" cy="30" r="5" fill="white"/>
          <circle cx="39" cy="30" r="2.5" fill="#1E40AF"/>
          <!-- 小嘴巴 -->
          <path d="M28 40 Q32 44 36 40" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
          <!-- 天线 -->
          <line x1="32" y1="12" x2="32" y2="4" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="32" cy="4" r="3" fill="#FBBF24" stroke="white" stroke-width="1.5"/>
          <!-- 渐变定义 -->
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#60A5FA"/>
              <stop offset="100%" style="stop-color:#3B82F6"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div class="orb-glow"></div>
    </div>
  </Transition>

  <!-- Smart Floating Console -->
  <Teleport to="body">
    <Transition name="console-scale">
      <div
        v-if="isOpen"
        ref="consoleRef"
        class="smart-console"
        :style="consoleStyle"
        @mousedown="bringToFront"
      >
        <!-- Resize Handles (8 directions) -->
        <div class="resize-handle n" @mousedown.prevent="startResize('n', $event)" />
        <div class="resize-handle s" @mousedown.prevent="startResize('s', $event)" />
        <div class="resize-handle e" @mousedown.prevent="startResize('e', $event)" />
        <div class="resize-handle w" @mousedown.prevent="startResize('w', $event)" />
        <div class="resize-handle ne" @mousedown.prevent="startResize('ne', $event)" />
        <div class="resize-handle nw" @mousedown.prevent="startResize('nw', $event)" />
        <div class="resize-handle se" @mousedown.prevent="startResize('se', $event)" />
        <div class="resize-handle sw" @mousedown.prevent="startResize('sw', $event)" />
        
        <!-- Visual Grip Handle (bottom-right) -->
        <div class="grip-handle" @mousedown.prevent="startResize('se', $event)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 16l4 4M12 16l4 4M8 16l4 4"/>
          </svg>
        </div>

        <!-- Header -->
        <div class="console-header" @mousedown.prevent="startDrag">
          <div class="header-left">
            <!-- P4-Session: 历史按钮 -->
            <button 
              class="history-btn"
              @click="showSessionSidebar = !showSessionSidebar"
              title="会话历史"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="session-count" v-if="sessions.length > 1">{{ sessions.length }}</span>
            </button>
            <span class="header-title">MetaUniverse</span>
          </div>
          <div class="header-right">
            <!-- P4-Quote: 引用当前文章按钮 -->
            <button 
              v-if="isArticlePage"
              class="quote-current-btn"
              @click="quoteCurrentArticle"
              title="引用当前文章"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <span>引用当前</span>
            </button>
            
            <!-- P4-Session: 新建会话按钮 -->
            <button 
              class="new-session-btn"
              @click="createSession"
              title="新建会话"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 4v16m8-8H4"/>
              </svg>
            </button>
            
            <!-- Model Selector -->
            <div class="model-selector" ref="modelSelectorRef">
              <button 
                class="model-btn"
                @click.stop="toggleModelDropdown"
                :class="{ 'thinking': isThinkingMode }"
              >
                <span class="model-status-dot" :class="{ thinking: isThinkingMode }"></span>
                <span class="model-name">{{ isThinkingMode ? '🧠 深度' : '⚡ 快速' }}</span>
                <svg class="model-arrow" :class="{ open: showModelDropdown }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              
              <!-- Model Dropdown -->
              <Transition name="dropdown">
                <div v-if="showModelDropdown" class="model-dropdown" :class="{ 'dropdown-up': dropdownDirection === 'up' }">
                  <div class="dropdown-section">
                    <div class="dropdown-title">选择模式</div>
                    <button 
                      class="dropdown-item" 
                      :class="{ active: !isThinkingMode }"
                      @click="selectModel(false)"
                    >
                      <span class="item-dot" :class="{ active: !isThinkingMode }"></span>
                      <div class="item-info">
                        <div class="item-name">⚡ 快速响应</div>
                        <div class="item-desc">适合日常对话与即时问答</div>
                      </div>
                    </button>
                    <button 
                      class="dropdown-item" 
                      :class="{ active: isThinkingMode }"
                      @click="selectModel(true)"
                    >
                      <span class="item-dot" :class="{ active: isThinkingMode }"></span>
                      <div class="item-info">
                        <div class="item-name">🧠 深度思考</div>
                        <div class="item-desc">适合复杂分析与深度推理</div>
                      </div>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
            
            <!-- Close Button -->
            <button class="close-btn" @click="closeConsole">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- P4-Session: Session Sidebar -->
        <Transition name="session-sidebar">
          <div v-if="showSessionSidebar" class="session-sidebar">
            <div class="session-sidebar-header">
              <span class="sidebar-title">会话历史</span>
              <button class="sidebar-close" @click="showSessionSidebar = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <div class="session-sidebar-content">
              <button class="new-session-large" @click="createSession">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 4v16m8-8H4"/>
                </svg>
                <span>新建会话</span>
              </button>
              
              <div v-for="group in groupedSessions" :key="group.label" class="session-group">
                <div class="session-group-label">{{ group.label }}</div>
                <div 
                  v-for="session in group.sessions" 
                  :key="session.id"
                  class="session-item"
                  :class="{ active: session.id === currentSessionId }"
                  @click="switchSession(session.id)"
                >
                  <div class="session-info">
                    <div class="session-title">{{ getSessionTitle(session) }}</div>
                    <div class="session-meta">
                      {{ session.messages.length }} 条消息 · 
                      {{ new Date(session.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
                    </div>
                  </div>
                  <button 
                    class="session-delete"
                    @click="deleteSession(session.id, $event)"
                    title="删除会话"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Message Area -->
        <div ref="messageAreaRef" class="message-area" :class="{ 'with-sidebar': showSessionSidebar }">
          <!-- Empty State -->
          <div v-if="messages.length === 0" class="empty-state">
            <div class="empty-icon">🌌</div>
            <div class="empty-title">MetaUniverse AI</div>
            <div class="empty-desc">智能对话，深度思考</div>
            <div class="empty-tips">
              <div class="tip-item"><kbd>/</kbd> 使用技能</div>
              <div class="tip-item"><kbd>@</kbd> 引用文章</div>
            </div>
          </div>
          
          <!-- P3-Persist: 恢复提示 -->
          <div v-else-if="messages.length > 0 && !hasShownRestoreNotice" class="restore-notice">
            <span>💾 已恢复之前的对话</span>
            <button class="restore-close" @click="hasShownRestoreNotice = true">×</button>
          </div>

          <!-- Messages -->
          <template v-else>
            <div
              v-for="(msg, index) in messages"
              :key="index"
              class="message"
              :class="{ 'user': msg.role === 'user', 'ai': msg.role === 'assistant' }"
            >
              <!-- Avatar -->
              <div class="message-avatar">
                <span v-if="msg.role === 'user'">👤</span>
                <LiquidCoreAvatar v-else :size="36" :is-thinking="isLoading && index === messages.length - 1 && msg.role === 'assistant'" />
              </div>
              
              <!-- Content -->
              <div class="message-content">
                <!-- Reasoning (Thinking Process) -->
                <div v-if="msg.role === 'assistant' && msg.reasoning" class="reasoning-block">
                  <details>
                    <summary>🧠 思考过程</summary>
                    <div class="reasoning-content">{{ msg.reasoning }}</div>
                  </details>
                </div>
                <!-- Markdown Rendering -->
                <div v-if="msg.role === 'assistant'" class="markdown-body" v-html="renderMarkdown(msg.content)" />
                <div v-else class="user-text">{{ msg.content }}</div>
                
                <!-- Attached Articles Display -->
                <div v-if="msg.attachedArticles?.length" class="attached-articles">
                  <span 
                    v-for="article in msg.attachedArticles" 
                    :key="article.path"
                    class="article-tag"
                  >
                    📄 {{ article.title }}
                  </span>
                </div>
                
                <!-- Timestamp -->
                <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
              </div>
            </div>
          </template>

          <!-- Loading Indicator -->
          <div v-if="isLoading" class="loading-indicator">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
          </div>
        </div>

        <!-- Skill Bar -->
        <div v-if="activeSkill || attachedArticles.length > 0" class="skill-bar">
          <TransitionGroup name="skill-slide">
            <div v-if="activeSkill" :key="'skill'" class="skill-capsule">
              <span>{{ activeSkill.icon }}</span>
              <span>{{ activeSkill.name }}</span>
              <button class="skill-remove" @click="removeSkill">×</button>
            </div>
            <div 
              v-for="article in attachedArticles" 
              :key="article.path"
              class="article-capsule"
            >
              <span>📄</span>
              <span>{{ article.title }}</span>
              <button class="skill-remove" @click="removeArticle(article)">×</button>
            </div>
          </TransitionGroup>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <!-- Popover for / and @ -->
          <Transition name="popover">
            <div 
              v-if="showPopover" 
              class="input-popover"
              :class="{ 'popover-up': true }"
            >
              <!-- Skill List -->
              <div v-if="popoverMode === 'skill'" class="popover-list">
                <div class="popover-header">选择技能</div>
                <div
                  v-for="skill in availableSkills"
                  :key="skill.id"
                  class="popover-item"
                  :class="{ active: selectedPopoverIndex === availableSkills.indexOf(skill) }"
                  @click="selectSkill(skill)"
                  @mouseenter="selectedPopoverIndex = availableSkills.indexOf(skill)"
                >
                  <span class="popover-icon">{{ skill.icon }}</span>
                  <div class="popover-info">
                    <div class="popover-name">{{ skill.name }}</div>
                    <div class="popover-desc">{{ skill.description }}</div>
                  </div>
                </div>
              </div>
              
              <!-- P4-Article: 重构文章选择器 - 目录树+预览面板 -->
              <div v-else-if="popoverMode === 'article'" class="article-picker">
                <!-- Header with search -->
                <div class="article-picker-header">
                  <input 
                    ref="articleSearchRef"
                    v-model="articleSearch"
                    type="text" 
                    placeholder="搜索文章..."
                    class="article-picker-search"
                    @keydown="handleArticleSearchKeydown"
                  >
                </div>
                
                <!-- Two panel layout -->
                <div class="article-picker-body">
                  <!-- Left: Directory Tree -->
                  <div class="article-tree">
                    <div v-if="articleSearch" class="article-search-results">
                      <div
                        v-for="article in filteredArticles"
                        :key="article.path"
                        class="article-tree-item"
                        :class="{ active: previewArticle?.path === article.path }"
                        @click="previewArticle = article; loadArticlePreview(article)"
                        @mouseenter="previewArticle = article; loadArticlePreview(article)"
                      >
                        <span class="tree-icon">📄</span>
                        <span class="tree-label">{{ article.title }}</span>
                      </div>
                      <div v-if="filteredArticles.length === 0" class="article-tree-empty">
                        未找到匹配文章
                      </div>
                    </div>
                    <div v-else class="article-tree-content">
                      <TreeItem 
                        v-for="item in articleTree" 
                        :key="item.path || item.name"
                        :item="item"
                        :active-path="previewArticle?.path"
                        @select="onTreeItemSelect"
                        @hover="onTreeItemHover"
                      />
                    </div>
                  </div>
                  
                  <!-- Right: Preview Panel -->
                  <div class="article-preview" v-if="previewArticle">
                    <div class="preview-header">
                      <h4 class="preview-title">{{ previewArticle.title }}</h4>
                      <div class="preview-actions">
                        <button class="preview-btn" @click="quoteFullArticle">
                          <span>📄</span> 引用全文
                        </button>
                      </div>
                    </div>
                    <div class="preview-content" ref="previewContentRef">
                      <div v-if="previewLoading" class="preview-loading">
                        <div class="preview-spinner"></div>
                        <span>加载中...</span>
                      </div>
                      <div v-else-if="previewError" class="preview-error">
                        {{ previewError }}
                      </div>
                      <div v-else class="preview-markdown markdown-body" v-html="renderMarkdown(previewContent)"></div>
                    </div>
                  </div>
                  <div v-else class="article-preview-empty">
                    <div class="empty-preview-icon">📖</div>
                    <div class="empty-preview-text">选择左侧文章预览</div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Input Box -->
          <div class="input-box">
            <!-- Rich Text Input (contenteditable) -->
            <div
              ref="inputRef"
              class="rich-input"
              contenteditable="true"
              :placeholder="inputPlaceholder"
              @keydown="handleInputKeydown"
              @input="handleInput"
              @focus="inputFocused = true"
              @blur="inputFocused = false"
            />
            
            <button 
              class="send-btn"
              :class="{ active: canSend, loading: isLoading }"
              :disabled="!canSend"
              @click="sendMessage"
            >
              <svg v-if="!isLoading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              <div v-else class="send-spinner"></div>
            </button>
          </div>
          
          <!-- Input Tips -->
          <div class="input-tips">
            <span v-if="showSkillHint" class="tip-hint">按 Enter 选择技能</span>
            <span v-else-if="showArticleHint" class="tip-hint">按 Enter 引用文章，Esc 取消</span>
            <span v-else class="tip-shortcuts">
              <kbd>/</kbd> 技能 <kbd>@</kbd> 引用 <kbd>Enter</kbd> 发送
            </span>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- P4-Select: Selection Toolbar -->
    <Transition name="toolbar-fade">
      <div
        v-if="showSelectionToolbar"
        class="selection-toolbar"
        :style="{ left: `${selectionToolbarPos.x}px`, top: `${selectionToolbarPos.y}px` }"
      >
        <button class="toolbar-btn primary" @click="askSelectedText">
          <span>🤖</span>
          <span>询问AI</span>
        </button>
        <button class="toolbar-btn" @click="copySelectedText">
          <span>📋</span>
          <span>复制</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { marked } from 'marked'
import { useData } from 'vitepress'
import { useChatService } from '../../../agent/chat-service'
import { AgentRuntime } from '../../../agent/core/AgentRuntime'
import { eventBus } from '../../../agent/core/EventBus'
import { builtinSkills } from '../../../agent/skills/builtin'  // P1-SKL-REG: 导入内置技能
import { useLogger } from '../../composables/useLogger'
import LiquidCoreAvatar from './LiquidCoreAvatar.vue'

// ==================== Logger ====================
const logger = useLogger('human')
const aiLogger = useLogger('ai')

// ==================== Types ====================
interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachedArticles?: ArticleData[]
  reasoning?: string  // 深度思考过程
}

interface SkillData {
  id: string
  name: string
  icon: string
  description: string
}

interface ArticleData {
  path: string
  title: string
  date?: string
  content?: string  // 文章内容（可选，用于引用时发送全文）
}

// ==================== State ====================
const isOpen = ref(false)
const isThinkingMode = ref(false)
const showModelDropdown = ref(false)
const dropdownDirection = ref<'down' | 'up'>('down')

// Console Position & Size
// P3-UI: 增大初始窗口尺寸 - 宽度 3 倍 (380->1140)，高度 1.2 倍 (600->720)
const consolePos = ref({ x: window.innerWidth - 1180, y: 80 })
const consoleSize = ref({ width: 1140, height: 720 })
const isDragging = ref(false)
const isResizing = ref(false)
const resizeDirection = ref('')
const dragStart = ref({ x: 0, y: 0, consoleX: 0, consoleY: 0, width: 0, height: 0 })
const zIndex = ref(1000)

// Input State
const inputFocused = ref(false)
const inputRef = ref<HTMLDivElement>()
const inputVersion = ref(0) // Force re-computation of canSend
const showPopover = ref(false)
const popoverMode = ref<'skill' | 'article'>('skill')
const selectedPopoverIndex = ref(0)
const articleSearch = ref('')

// Track last input for triggering popover
const lastInputTrigger = ref<{ type: '/' | '@' | null, position: number }>({ type: null, position: 0 })

// Chat Service
const chatService = useChatService()

// P3-Persist: 恢复提示显示状态
const hasShownRestoreNotice = ref(false)

// P4-Article: 文章预览相关状态
const previewArticle = ref<ArticleData | null>(null)
const previewContent = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const previewContentRef = ref<HTMLElement>()

// P4-Article: 文章目录树
interface TreeNode {
  name: string
  path?: string
  title?: string
  children?: TreeNode[]
  isDirectory?: boolean
}

const articleTree = computed<TreeNode[]>(() => {
  const tree: TreeNode[] = []
  const articles = allArticles.value
  
  // Group by directory structure
  const groups: Record<string, ArticleData[]> = {}
  articles.forEach(article => {
    const parts = article.path.split('/').filter(Boolean)
    const dir = parts.length > 1 ? parts[0] : '根目录'
    if (!groups[dir]) groups[dir] = []
    groups[dir].push(article)
  })
  
  Object.entries(groups).forEach(([dir, items]) => {
    if (items.length === 1 && items[0].path.split('/').filter(Boolean)[0] === dir) {
      // Single item, flatten
      tree.push({
        name: items[0].title,
        path: items[0].path,
        title: items[0].title,
        isDirectory: false
      })
    } else {
      // Group
      tree.push({
        name: dir,
        isDirectory: true,
        children: items.map(a => ({
          name: a.title,
          path: a.path,
          title: a.title,
          isDirectory: false
        }))
      })
    }
  })
  
  return tree
})

// P4-Article: 加载文章预览
async function loadArticlePreview(article: ArticleData) {
  if (!article.path) return
  previewLoading.value = true
  previewError.value = ''
  previewContent.value = ''
  
  try {
    const content = await fetchArticleContent(article.path)
    // Truncate if too long
    previewContent.value = content.slice(0, 10000) + (content.length > 10000 ? '\n\n...(内容已截断)' : '')
  } catch (e) {
    previewError.value = '加载失败: ' + String(e)
  } finally {
    previewLoading.value = false
  }
}

// P4-Article: 树节点选择
function onTreeItemSelect(item: TreeNode) {
  if (item.path && item.title) {
    previewArticle.value = { path: item.path, title: item.title }
    loadArticlePreview(previewArticle.value)
  }
}

function onTreeItemHover(item: TreeNode) {
  if (item.path && item.title) {
    previewArticle.value = { path: item.path, title: item.title }
    loadArticlePreview(previewArticle.value)
  }
}

// P4-Article: 引用全文
function quoteFullArticle() {
  if (!previewArticle.value) return
  selectArticle(previewArticle.value)
  showPopover.value = false
  previewArticle.value = null
}

// P4-Article: TreeItem 渲染组件
const TreeItem = {
  name: 'TreeItem',
  props: ['item', 'activePath'],
  emits: ['select', 'hover'],
  setup(props: { item: TreeNode; activePath?: string }, { emit }: any) {
    const isOpen = ref(true)
    const isActive = computed(() => props.item.path === props.activePath)
    
    function onClick() {
      if (props.item.isDirectory) {
        isOpen.value = !isOpen.value
      } else {
        emit('select', props.item)
      }
    }
    
    function onMouseEnter() {
      if (!props.item.isDirectory) {
        emit('hover', props.item)
      }
    }
    
    return { isOpen, isActive, onClick, onMouseEnter }
  },
  template: `
    <div class="tree-node">
      <div 
        class="tree-item" 
        :class="{ 'tree-directory': item.isDirectory, 'tree-file': !item.isDirectory, 'active': isActive }"
        @click="onClick"
        @mouseenter="onMouseEnter"
      >
        <span v-if="item.isDirectory" class="tree-toggle">
          {{ isOpen ? '▼' : '▶' }}
        </span>
        <span v-else class="tree-icon">📄</span>
        <span class="tree-label">{{ item.name }}</span>
      </div>
      <div v-if="item.isDirectory && isOpen && item.children" class="tree-children">
        <TreeItem 
          v-for="child in item.children" 
          :key="child.path || child.name"
          :item="child"
          :active-path="activePath"
          @select="$emit('select', $event)"
          @hover="$emit('hover', $event)"
        />
      </div>
    </div>
  `
}

// Agent Runtime（技能执行通道）
let agentRuntime: AgentRuntime | null = null
let agentRuntimeReady = false

// P1-INIT: 初始化 AgentRuntime（含 checkpoint 加载）
async function initAgentRuntime() {
  try {
    agentRuntime = AgentRuntime.getInstance()
    
    // P1-SKL-REG: 注册内置技能（确保技能在 AgentRuntime 中可用）
    for (const skill of builtinSkills) {
      agentRuntime.registerSkill(skill)
    }
    console.log('[AIChatOrb] 已注册', builtinSkills.length, '个内置技能')
    
    await agentRuntime.initialize()  // 必须调用以加载 checkpoints
    agentRuntimeReady = true
    console.log('[AIChatOrb] AgentRuntime 初始化完成')
  } catch (e) {
    console.warn('[AIChatOrb] AgentRuntime 初始化失败，技能执行将不可用:', e)
  }
}

// 意图关键词检测（与 IntentRouter 保持一致）
const INTENT_KEYWORDS = [
  /(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i,
  /(?:编辑|修改|调整|优化|重写).{0,10}(?:内容|文章|段落|这部分)/i,
  /(?:搜索|查找|调研|研究).{0,5}(?:关于|资料|信息|最新)/i,
  /(?:总结|概括|摘要|TL;DR)/i,
  /(?:解释|说明|讲解).{0,5}(?:代码|这段|函数|类)/i,
  /(?:更新|完善|补充).{0,5}(?:知识图谱|图谱|链接|关系)/i,
  /(?:删除|移除|清理).{0,5}(?:文章|文件)/i,
  /(?:列出|查看|显示).{0,5}(?:文章|文件列表)/i,
]

function shouldUseAgentRuntime(text: string): boolean {
  if (activeSkill.value) return true
  return INTENT_KEYWORDS.some(pattern => pattern.test(text))
}

// ==================== Multi-Session Management ====================
// P4-Session: 多会话管理
const SESSIONS_KEY = 'metablog-chat-sessions'
const CURRENT_SESSION_KEY = 'metablog-current-session'

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const sessions = ref<ChatSession[]>(loadSessions())
const currentSessionId = ref<string>(loadCurrentSessionId())
const showSessionSidebar = ref(false)

// 获取当前会话
const currentSession = computed(() => {
  return sessions.value.find(s => s.id === currentSessionId.value)
})

// 获取当前会话的消息
const messages = computed({
  get: () => currentSession.value?.messages || [],
  set: (newMessages: Message[]) => {
    const session = currentSession.value
    if (session) {
      session.messages = newMessages
      session.updatedAt = Date.now()
    }
  }
})

// 加载会话列表
function loadSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.map((s: any) => ({
        ...s,
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    }
  } catch (e) {
    console.warn('[AIChatOrb] 加载会话列表失败:', e)
  }
  // 默认创建一个会话
  return [createNewSession()]
}

// 加载当前会话ID
function loadCurrentSessionId(): string {
  try {
    const stored = localStorage.getItem(CURRENT_SESSION_KEY)
    if (stored) {
      // 检查会话是否存在
      const sessions = loadSessions()
      if (sessions.find(s => s.id === stored)) {
        return stored
      }
    }
  } catch (e) {
    console.warn('[AIChatOrb] 加载当前会话失败:', e)
  }
  // 返回第一个会话
  const sessions = loadSessions()
  return sessions[0]?.id || createNewSession().id
}

// 保存会话列表
function saveSessions() {
  try {
    // 每个会话最多保存 50 条消息
    const toSave = sessions.value.map(s => ({
      ...s,
      messages: s.messages.slice(-50)
    }))
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(toSave))
    localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId.value)
  } catch (e) {
    console.warn('[AIChatOrb] 保存会话失败:', e)
  }
}

// 创建新会话
function createNewSession(): ChatSession {
  const now = Date.now()
  return {
    id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title: '新对话',
    messages: [],
    createdAt: now,
    updatedAt: now
  }
}

// 切换会话
function switchSession(sessionId: string) {
  currentSessionId.value = sessionId
  saveSessions()
  nextTick(() => {
    scrollToBottom()
    inputRef.value?.focus()
  })
}

// 新建会话
function createSession() {
  const newSession = createNewSession()
  sessions.value.unshift(newSession)
  currentSessionId.value = newSession.id
  saveSessions()
  showSessionSidebar.value = false
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// 删除会话
function deleteSession(sessionId: string, event: Event) {
  event.stopPropagation()
  if (sessions.value.length <= 1) {
    alert('至少保留一个会话')
    return
  }
  if (confirm('确定要删除这个会话吗？')) {
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value[0]?.id
    }
    saveSessions()
  }
}

// 获取会话标题（从第一条用户消息或默认）
function getSessionTitle(session: ChatSession): string {
  if (session.title && session.title !== '新对话') {
    return session.title
  }
  const firstUserMessage = session.messages.find(m => m.role === 'user')
  if (firstUserMessage) {
    const preview = firstUserMessage.content.slice(0, 20)
    return preview + (firstUserMessage.content.length > 20 ? '...' : '')
  }
  return '新对话'
}

// 按时间分组会话
const groupedSessions = computed(() => {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  
  const groups: { label: string; sessions: ChatSession[] }[] = [
    { label: '今天', sessions: [] },
    { label: '昨天', sessions: [] },
    { label: '最近7天', sessions: [] },
    { label: '更早', sessions: [] }
  ]
  
  sessions.value.forEach(session => {
    const daysAgo = (now - session.updatedAt) / oneDay
    if (daysAgo < 1) {
      groups[0].sessions.push(session)
    } else if (daysAgo < 2) {
      groups[1].sessions.push(session)
    } else if (daysAgo < 8) {
      groups[2].sessions.push(session)
    } else {
      groups[3].sessions.push(session)
    }
  })
  
  // 只返回非空组
  return groups.filter(g => g.sessions.length > 0)
})

// Data
const isLoading = chatService.isLoading
const isAgentExecuting = ref(false)
const activeSkill = ref<SkillData | null>(null)
const attachedArticles = ref<ArticleData[]>([])

// P4-Quote: 当前文章引用
const vpData = useData()
const currentPagePath = computed(() => vpData.page.value.relativePath)
const isArticlePage = computed(() => {
  const path = currentPagePath.value
  return path && (path.endsWith('.md') || path.includes('/'))
})
const currentArticleData = computed<ArticleData | null>(() => {
  if (!isArticlePage.value) return null
  const path = currentPagePath.value
  // Convert relative path to URL path
  const urlPath = '/' + path.replace(/\.md$/, '.html')
  // Find in allArticles or create new
  const existing = allArticles.value.find(a => a.path === urlPath || a.path === path)
  if (existing) return existing
  return {
    path: urlPath,
    title: vpData.page.value.title || '当前文章'
  }
})

// 引用当前文章
async function quoteCurrentArticle() {
  if (!currentArticleData.value) return
  const article = currentArticleData.value
  
  // Fetch content
  const content = await fetchArticleContent(article.path)
  const articleWithContent = { ...article, content }
  
  // Add to attached articles
  if (!attachedArticles.value.find(a => a.path === article.path)) {
    attachedArticles.value.push(articleWithContent)
  }
  
  // Add to input
  const capsuleHtml = `<span class="inline-capsule" contenteditable="false" data-path="${article.path}"><span class="capsule-text">📄 ${article.title}</span><button class="capsule-remove" title="删除" onclick="this.parentElement.remove()">×</button></span>&nbsp;`
  if (inputRef.value) {
    inputRef.value.innerHTML += capsuleHtml
    inputVersion.value++
  }
  
  logger.logInfo('chat.article.quote', `引用当前文章: ${article.title}`, { path: article.path })
}

// Refs
const consoleRef = ref<HTMLElement>()
const orbRef = ref<HTMLElement>()
const modelSelectorRef = ref<HTMLElement>()
const messageAreaRef = ref<HTMLElement>()
const articleSearchRef = ref<HTMLInputElement>()

// 智能滚动控制
const isUserNearBottom = ref(true)
const SCROLL_THRESHOLD = 100  // 距离底部多少像素视为"在底部"

// ==================== Constants ====================
// P3-UI: 调整最小尺寸以适应更大的初始窗口
const MIN_WIDTH = 480
const MIN_HEIGHT = 480
const MAX_WIDTH = Math.min(window.innerWidth * 0.95, 1600)
const MAX_HEIGHT = Math.min(window.innerHeight * 0.95, 1080)

// ==================== Persistence Helpers ====================
// P3-Persist: 加载对话历史
function loadChatHistory(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 转换日期字符串回 Date 对象
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }
  } catch (e) {
    console.warn('[AIChatOrb] 加载对话历史失败:', e)
  }
  return []
}

// P4-Session: 保存所有会话
function saveChatHistory() {
  saveSessions()
}

// P4-Session: 清空当前会话
function clearChatHistory() {
  const session = currentSession.value
  if (session) {
    session.messages = []
    session.updatedAt = Date.now()
    saveSessions()
  }
}

const availableSkills: SkillData[] = [
  { id: 'research', name: '深度研究', icon: '🔍', description: '联网搜索并生成深度报告' },
  { id: 'rewrite', name: '智能改写', icon: '✍️', description: '优化和润色文章内容' },
  { id: 'translate', name: '翻译', icon: '🌐', description: '多语言翻译' },
  { id: 'summarize', name: '总结', icon: '📝', description: '提取文章核心要点' },
]

// Get articles from VitePress sidebar config
const allArticles = computed<ArticleData[]>(() => {
  const vpData = useData()
  const sidebar = vpData.theme.value.sidebar || {}
  const articles: ArticleData[] = []
  
  // Process sidebar config to extract articles
  function processSidebarItems(items: any[], basePath = '') {
    items.forEach((item: any) => {
      if (item.link && !item.link.match(/^https?:\/\//)) {
        articles.push({
          path: item.link,
          title: item.text || item.title || '未命名文章',
          date: item.frontmatter?.date || item.date
        })
      }
      if (item.items && Array.isArray(item.items)) {
        processSidebarItems(item.items, basePath)
      }
    })
  }
  
  // Handle different sidebar formats
  Object.values(sidebar).forEach((section: any) => {
    if (Array.isArray(section)) {
      processSidebarItems(section)
    } else if (section && section.items) {
      processSidebarItems(section.items)
    }
  })
  
  return articles
})

// ==================== Computed ====================
const consoleStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${consolePos.value.x}px`,
  top: `${consolePos.value.y}px`,
  width: `${consoleSize.value.width}px`,
  height: `${consoleSize.value.height}px`,
  zIndex: zIndex.value,
}))

const orbPositionStyle = computed(() => ({
  position: 'fixed' as const,
  right: '24px',
  bottom: '24px',
  zIndex: 999,
}))

// Helper: Get text content from input
function getInputContent(): string {
  if (!inputRef.value) return ''
  return inputRef.value.textContent || ''
}

// Helper to check if can send (checks input content)
const canSend = computed(() => {
  // Access inputVersion to force re-computation
  const version = inputVersion.value
  if (!inputRef.value) return false
  const text = inputRef.value.textContent?.trim() || ''
  const hasCapsules = inputRef.value.querySelectorAll('.inline-capsule').length > 0
  const hasContent = text.length > 0 || hasCapsules
  return hasContent && !isLoading.value
})

const filteredArticles = computed(() => {
  const articles = allArticles.value
  if (!articleSearch.value) return articles
  const term = articleSearch.value.toLowerCase()
  return articles.filter(a => a.title.toLowerCase().includes(term))
})

// Helper: Get current cursor position in text
function getCursorPosition(): number {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount || !inputRef.value) return 0
  
  const range = selection.getRangeAt(0)
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(inputRef.value)
  preCaretRange.setEnd(range.endContainer, range.endOffset)
  return preCaretRange.toString().length
}

// Helper: Set cursor position after a node
function setCursorAfter(node: Node) {
  const selection = window.getSelection()
  if (!selection) return
  
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

// Helper: Get text before cursor
function getTextBeforeCursor(): string {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount || !inputRef.value) return ''
  
  const range = selection.getRangeAt(0)
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(inputRef.value)
  preCaretRange.setEnd(range.endContainer, range.endOffset)
  return preCaretRange.toString()
}

// Helper: Delete text before cursor (for removing trigger chars)
function deleteTextBeforeCursor(count: number) {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount || !inputRef.value) return
  
  const range = selection.getRangeAt(0)
  const textNode = range.startContainer
  
  if (textNode.nodeType === Node.TEXT_NODE) {
    const text = textNode.textContent || ''
    const offset = range.startOffset
    if (offset >= count) {
      textNode.textContent = text.slice(0, offset - count) + text.slice(offset)
      range.setStart(textNode, offset - count)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }
  }
}

const inputPlaceholder = computed(() => {
  if (showPopover.value && popoverMode.value === 'skill') return ''
  if (showPopover.value && popoverMode.value === 'article') return '输入搜索文章...'
  return '输入消息，使用 / 技能 @ 引用文章...'
})

const showSkillHint = computed(() => showPopover.value && popoverMode.value === 'skill')
const showArticleHint = computed(() => showPopover.value && popoverMode.value === 'article')

// ==================== Methods ====================
// Markdown Rendering
function renderMarkdown(content: string): string {
  const html = marked.parse(content, {
    gfm: true,
    breaks: true,
    async: false,
  }) as string
  // Simple XSS protection without DOMPurify for now
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-blocked=')
}

// Console Controls
function openConsole() {
  isOpen.value = true
  bringToFront()
  nextTick(() => {
    adjustInitialPosition()
    inputRef.value?.focus()
    scrollToBottom()
  })
}

// P3-Close: 关闭确认 - 如果有对话内容，显示确认对话框
function closeConsole() {
  // 如果有消息且不是正在加载，询问是否确认关闭
  if (messages.value.length > 0 && !isLoading.value) {
    const hasUserMessages = messages.value.some(m => m.role === 'user')
    if (hasUserMessages) {
      const confirmed = confirm('确定要关闭对话窗口吗？\n\n您的对话历史已自动保存，下次打开时可继续查看。')
      if (!confirmed) return
    }
  }
  
  isOpen.value = false
  // Reset state
  showModelDropdown.value = false
  showPopover.value = false
  
  // P3-Persist: 关闭时保存对话历史
  saveChatHistory()
}

function bringToFront() {
  zIndex.value = Math.max(zIndex.value + 1, 1000)
}

function adjustInitialPosition() {
  const width = consoleSize.value.width
  const height = consoleSize.value.height
  
  // Ensure console is within viewport
  consolePos.value.x = Math.min(consolePos.value.x, window.innerWidth - width - 20)
  consolePos.value.y = Math.min(consolePos.value.y, window.innerHeight - height - 20)
  consolePos.value.x = Math.max(20, consolePos.value.x)
  consolePos.value.y = Math.max(20, consolePos.value.y)
}

// Dragging
function startDrag(e: MouseEvent) {
  if (isResizing.value) return
  isDragging.value = true
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    consoleX: consolePos.value.x,
    consoleY: consolePos.value.y,
    width: 0,
    height: 0,
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  
  let newX = dragStart.value.consoleX + dx
  let newY = dragStart.value.consoleY + dy
  
  // Magnetic snap to edges
  if (newX < 20) newX = 0
  if (newY < 20) newY = 0
  if (newX > window.innerWidth - consoleSize.value.width - 20) {
    newX = window.innerWidth - consoleSize.value.width
  }
  if (newY > window.innerHeight - consoleSize.value.height - 20) {
    newY = window.innerHeight - consoleSize.value.height
  }
  
  consolePos.value.x = newX
  consolePos.value.y = newY
  
  updateDropdownDirection()
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// Resizing
function startResize(direction: string, e: MouseEvent) {
  e.stopPropagation()
  isResizing.value = true
  resizeDirection.value = direction
  dragStart.value = {
    x: e.clientX,
    y: e.clientY,
    consoleX: consolePos.value.x,
    consoleY: consolePos.value.y,
    width: consoleSize.value.width,
    height: consoleSize.value.height,
  }
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!isResizing.value) return
  
  const dx = e.clientX - dragStart.value.x
  const dy = e.clientY - dragStart.value.y
  const dir = resizeDirection.value
  
  let newWidth = dragStart.value.width
  let newHeight = dragStart.value.height
  let newX = dragStart.value.consoleX
  let newY = dragStart.value.consoleY
  
  // Calculate new dimensions based on direction
  if (dir.includes('e')) newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStart.value.width + dx))
  if (dir.includes('s')) newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStart.value.height + dy))
  if (dir.includes('w')) {
    const maxDx = dragStart.value.width - MIN_WIDTH
    const minDx = dragStart.value.width - MAX_WIDTH
    const clampedDx = Math.max(minDx, Math.min(maxDx, dx))
    newWidth = dragStart.value.width - clampedDx
    newX = dragStart.value.consoleX + clampedDx
  }
  if (dir.includes('n')) {
    const maxDy = dragStart.value.height - MIN_HEIGHT
    const minDy = dragStart.value.height - MAX_HEIGHT
    const clampedDy = Math.max(minDy, Math.min(maxDy, dy))
    newHeight = dragStart.value.height - clampedDy
    newY = dragStart.value.consoleY + clampedDy
  }
  
  consoleSize.value.width = newWidth
  consoleSize.value.height = newHeight
  consolePos.value.x = newX
  consolePos.value.y = newY
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

// Model Selector
function toggleModelDropdown() {
  showModelDropdown.value = !showModelDropdown.value
  if (showModelDropdown.value) {
    updateDropdownDirection()
    nextTick(() => {
      const closeDropdown = (e: MouseEvent) => {
        if (!modelSelectorRef.value?.contains(e.target as Node)) {
          showModelDropdown.value = false
          document.removeEventListener('click', closeDropdown)
        }
      }
      setTimeout(() => document.addEventListener('click', closeDropdown), 0)
    })
  }
}

function updateDropdownDirection() {
  const consoleBottom = consolePos.value.y + consoleSize.value.height
  const spaceBelow = window.innerHeight - consoleBottom
  // 模型选择器始终在 Header，应该下拉
  dropdownDirection.value = 'down'
}

function selectModel(thinking: boolean) {
  isThinkingMode.value = thinking
  showModelDropdown.value = false
}

// Input Handling
function handleInput() {
  // Increment version to force re-computation of canSend
  inputVersion.value++
  
  // Auto-resize input
  nextTick(() => {
    const input = inputRef.value
    if (input) {
      input.style.height = 'auto'
      input.style.height = Math.min(200, input.scrollHeight) + 'px'
    }
  })
  
  // Check for / or @ trigger
  if (!showPopover.value) {
    checkForTrigger()
  }
}

function handleInputKeydown(e: KeyboardEvent) {
  // Popover navigation
  if (showPopover.value) {
    const items = popoverMode.value === 'skill' ? availableSkills : filteredArticles.value
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedPopoverIndex.value = (selectedPopoverIndex.value + 1) % items.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedPopoverIndex.value = (selectedPopoverIndex.value - 1 + items.length) % items.length
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (popoverMode.value === 'skill') {
        selectSkill(availableSkills[selectedPopoverIndex.value])
      } else {
        selectArticle(filteredArticles.value[selectedPopoverIndex.value])
      }
    } else if (e.key === 'Escape') {
      showPopover.value = false
      // Remove the trigger character
      deleteTextBeforeCursor(1)
    }
    return
  }
  
  // Send on Enter (without shift)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// Check for trigger on input event (after character is inserted)
function checkForTrigger() {
  const text = getInputContent()
  const lastTwo = text.slice(-2)
  
  // Check for / trigger (at start or after space/newline)
  if (lastTwo === ' /' || text === '/') {
    // Only trigger if we're not already showing skill popover
    if (!showPopover.value || popoverMode.value !== 'skill') {
      showPopover.value = true
      popoverMode.value = 'skill'
      selectedPopoverIndex.value = 0
      lastInputTrigger.value = { type: '/', position: text.length - 1 }
    }
    return
  }
  
  // Check for @ trigger
  if (lastTwo === ' @' || text === '@') {
    // Only trigger if we're not already showing article popover
    if (!showPopover.value || popoverMode.value !== 'article') {
      showPopover.value = true
      popoverMode.value = 'article'
      selectedPopoverIndex.value = 0
      articleSearch.value = ''
      lastInputTrigger.value = { type: '@', position: text.length - 1 }
      nextTick(() => articleSearchRef.value?.focus())
    }
    return
  }
}

function handleArticleSearchKeydown(e: KeyboardEvent) {
  e.stopPropagation()
  const items = filteredArticles.value
  
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedPopoverIndex.value = (selectedPopoverIndex.value + 1) % items.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedPopoverIndex.value = (selectedPopoverIndex.value - 1 + items.length) % items.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (items[selectedPopoverIndex.value]) {
      selectArticle(items[selectedPopoverIndex.value])
    }
  }
}

// Skill & Article Selection
function selectSkill(skill: SkillData) {
  activeSkill.value = skill
  // Remove the / trigger
  deleteTextBeforeCursor(1)
  showPopover.value = false
  
  // Log skill selection
  logger.logInfo('chat.skill.select', `选择技能: ${skill.name}`, {
    skillId: skill.id,
    skillName: skill.name
  })
}

function removeSkill() {
  const skillName = activeSkill.value?.name
  activeSkill.value = null
  
  // Log skill removal
  if (skillName) {
    logger.logInfo('chat.skill.remove', `移除技能: ${skillName}`)
  }
}

function selectArticle(article: ArticleData) {
  if (!inputRef.value) return
  
  // Get current content and find/replace @ with capsule
  const html = inputRef.value.innerHTML
  
  // Create capsule HTML
  const capsuleHtml = `<span class="inline-capsule" contenteditable="false" data-path="${article.path}"><span class="capsule-text">📄 ${article.title}</span><button class="capsule-remove" title="删除" onclick="this.parentElement.remove()">×</button></span>&nbsp;`
  
  // Replace last @ with capsule
  const lastAtIndex = html.lastIndexOf('@')
  if (lastAtIndex >= 0) {
    inputRef.value.innerHTML = html.slice(0, lastAtIndex) + capsuleHtml + html.slice(lastAtIndex + 1)
  } else {
    inputRef.value.innerHTML = html + capsuleHtml
  }
  
  // Move cursor to end
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(inputRef.value)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
  
  articleSearch.value = ''
  showPopover.value = false
}

function removeArticle(article: ArticleData) {
  attachedArticles.value = attachedArticles.value.filter(a => a.path !== article.path)
}

// P3-Persist: 处理清空历史
function handleClearHistory() {
  if (messages.value.length === 0) return
  
  const confirmed = confirm('确定要清空所有对话历史吗？\n\n此操作不可恢复。')
  if (confirmed) {
    clearChatHistory()
    hasShownRestoreNotice.value = false
  }
}

// Extract inline capsules and text from input
function extractInputContent(): { text: string, articles: ArticleData[] } {
  if (!inputRef.value) return { text: '', articles: [] }
  
  const articles: ArticleData[] = []
  const clone = inputRef.value.cloneNode(true) as HTMLElement
  
  // Extract articles from capsules
  clone.querySelectorAll('.inline-capsule').forEach(capsule => {
    const path = capsule.getAttribute('data-path')
    const title = capsule.querySelector('.capsule-text')?.textContent?.replace('📄 ', '') || ''
    if (path && !articles.find(a => a.path === path)) {
      articles.push({ path, title })
    }
  })
  
  // Get text content (capsules will be replaced with spaces)
  const text = clone.textContent?.trim() || ''
  
  return { text, articles }
}

// Fetch article content from the markdown file
async function fetchArticleContent(path: string): Promise<string> {
  try {
    // Handle various path formats:
    // /sections/knowledge/rl-math-principle/index.html -> /sections/knowledge/rl-math-principle.md
    // /sections/knowledge/rl-math-principle.html -> /sections/knowledge/rl-math-principle.md
    // /sections/knowledge/rl-math-principle/ -> /sections/knowledge/rl-math-principle/index.md
    
    let basePath = path
    
    // Remove trailing slash and .html
    basePath = basePath.replace(/\/$/, '').replace(/\.html$/, '')
    
    // If path ends with /index, remove it
    basePath = basePath.replace(/\/index$/, '')
    
    // Try .md directly
    let mdPath = basePath + '.md'
    let response = await fetch(mdPath)
    if (response.ok) {
      const content = await response.text()
      return content.replace(/^---\n[\s\S]*?\n---\n/, '').trim().slice(0, 5000)
    }
    
    // Try index.md
    mdPath = basePath + '/index.md'
    response = await fetch(mdPath)
    if (response.ok) {
      const content = await response.text()
      return content.replace(/^---\n[\s\S]*?\n---\n/, '').trim().slice(0, 5000)
    }
    
    // Try with sections path prefix removed (if present)
    if (basePath.startsWith('/sections/')) {
      const shortPath = basePath.replace('/sections/', '/')
      mdPath = shortPath + '.md'
      response = await fetch(mdPath)
      if (response.ok) {
        const content = await response.text()
        return content.replace(/^---\n[\s\S]*?\n---\n/, '').trim().slice(0, 5000)
      }
    }
    
    console.warn('Could not fetch article:', path, 'tried:', basePath + '.md', 'and', basePath + '/index.md')
    return '(无法获取文章内容: ' + path + ')'
  } catch (e) {
    console.error('Failed to fetch article:', path, e)
    return '(获取文章内容失败: ' + String(e) + ')'
  }
}

// Messaging — 双通道路由
async function sendMessage() {
  if (!canSend.value) return
  
  // Extract content from rich input
  const { text, articles } = extractInputContent()
  
  // Fetch article contents
  const articlesWithContent: ArticleData[] = []
  if (articles.length > 0) {
    for (const article of articles) {
      const content = await fetchArticleContent(article.path)
      articlesWithContent.push({ ...article, content })
    }
  }
  
  // Build full message content with articles
  let fullContent = text || ''
  if (articlesWithContent.length > 0) {
    fullContent += '\n\n--- 引用文章 ---\n'
    articlesWithContent.forEach((article, idx) => {
      fullContent += `\n[${idx + 1}] ${article.title}\n${article.content?.slice(0, 5000) || '(无内容)'}\n`
    })
  }
  
  if (!fullContent.trim()) {
    fullContent = '(空消息)'
  }
  
  // Add user message
  messages.value.push({
    role: 'user',
    content: text || '(引用文章)',
    timestamp: new Date(),
    attachedArticles: articlesWithContent.length > 0 ? articlesWithContent : undefined,
  })
  
  // Log human message
  const skillName = activeSkill.value?.name || null
  logger.logInfo('chat.message', '用户发送消息', {
    contentLength: text?.length || 0,
    articleCount: articles.length,
    model: isThinkingMode.value ? 'deepseek-reasoner' : 'deepseek-chat',
    activeSkill: skillName,
    routeMode: shouldUseAgentRuntime(text || '') ? 'agent' : 'chat'
  })
  
  // Clear input
  if (inputRef.value) {
    inputRef.value.innerHTML = ''
    inputRef.value.style.height = 'auto'
  }
  
  // Move articles to permanent attachment
  if (articlesWithContent.length > 0) {
    attachedArticles.value = [...attachedArticles.value, ...articlesWithContent]
  }
  
  // ========================================
  // 双通道路由决策
  // ========================================
  const useAgent = shouldUseAgentRuntime(text || '') && agentRuntime
  
  if (useAgent) {
    await sendViaAgent(fullContent, text || '', articlesWithContent)
  } else {
    await sendViaChat(fullContent, articlesWithContent)
  }
}

/**
 * 技能执行通道 — 通过 AgentRuntime 路由
 * 用于意图匹配的操作：写文章、编辑、研究、总结等
 */
async function sendViaAgent(
  fullContent: string,
  rawText: string,
  articles: ArticleData[]
) {
  const startTime = Date.now()
  isAgentExecuting.value = true
  
  // Create placeholder
  const assistantMsg: Message = {
    role: 'assistant',
    content: '⏳ 正在执行技能...',
    timestamp: new Date(),
  }
  const msgIndex = messages.value.push(assistantMsg) - 1
  
  aiLogger.logInfo('agent.execute', 'Agent 技能执行开始', {
    skill: activeSkill.value?.name || 'auto-detect',
    contentLength: fullContent.length,
    articleCount: articles.length
  })
  
  try {
    if (!agentRuntime) throw new Error('AgentRuntime 未初始化')
    
    // 构建上下文
    const context: { currentFile?: string; selectedText?: string } = {}
    if (articles.length > 0) {
      context.currentFile = articles[0].path
    }
    
    // 通过 AgentRuntime 处理（走完整 IntentRouter → SkillEngine 链路）
    const result = await agentRuntime.processInput(fullContent, context)
    
    // 更新消息内容
    const resultContent = result.content || '技能执行完成'
    messages.value[msgIndex].content = resultContent
    
    // 如果返回了文件路径，添加跳转提示
    const metadata = result.metadata as { path?: string, tokens?: number, cost?: number } | undefined
    if (metadata?.path) {
      messages.value[msgIndex].content += `\n\n📄 文件已保存：\`${metadata.path}\``
    }
    
    const duration = Date.now() - startTime
    aiLogger.logSuccess('agent.complete', 'Agent 技能执行成功', {
      skill: activeSkill.value?.name || 'auto-detect',
      duration,
      path: metadata?.path,
      tokens: metadata?.tokens,
      cost: metadata?.cost
    })
    
  } catch (err) {
    const duration = Date.now() - startTime
    aiLogger.logError('agent.error', 'Agent 技能执行失败', {
      skill: activeSkill.value?.name || 'auto-detect',
      duration,
      error: err instanceof Error ? err.message : String(err)
    })
    
    messages.value[msgIndex].content = 
      `❌ 技能执行失败：${err instanceof Error ? err.message : String(err)}\n\n💡 您可以尝试换一种方式描述，或直接进行对话。`
  } finally {
    isAgentExecuting.value = false
    // 清除已使用的技能
    activeSkill.value = null
  }
}

/**
 * 纯聊天通道 — 通过 chatService 直连 LLM
 * 用于日常对话、问答等无副作用操作
 */
async function sendViaChat(
  fullContent: string,
  articles: ArticleData[]
) {
  let startTime = 0
  let model = ''
  let msgIndex = 0
  
  try {
    const config = chatService.getConfig()
    model = isThinkingMode.value ? 'deepseek-reasoner' : (config.deepseekModel || 'deepseek-chat')
    
    // Create placeholder for streaming response
    const assistantMsg: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }
    msgIndex = messages.value.push(assistantMsg) - 1
    
    startTime = Date.now()
    aiLogger.logInfo('chat.request', 'AI请求开始', {
      model,
      contentLength: fullContent.length,
      hasArticles: articles.length > 0
    })
    
    // Stream response
    await chatService.sendMessageStream(
      fullContent,
      (chunk) => {
        if (chunk.reasoning) {
          messages.value[msgIndex].reasoning = 
            (messages.value[msgIndex].reasoning || '') + chunk.reasoning
        }
        if (chunk.content) {
          messages.value[msgIndex].content += chunk.content
        }
      },
      { model, temperature: 0.7 }
    )
    
    const duration = Date.now() - startTime
    const responseContent = messages.value[msgIndex].content
    aiLogger.logSuccess('chat.response', 'AI响应完成', {
      model,
      duration,
      contentLength: responseContent.length,
      hasReasoning: !!messages.value[msgIndex].reasoning
    })
  } catch (err) {
    const duration = Date.now() - startTime
    aiLogger.logError('chat.error', 'AI请求失败', {
      model,
      duration,
      error: err instanceof Error ? err.message : String(err)
    })
    
    messages.value.pop()
    messages.value.push({
      role: 'assistant',
      content: `❌ 请求失败: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date(),
    })
  }
}

// Smart scroll helper
function scrollToBottom() {
  const area = messageAreaRef.value
  if (area) {
    area.scrollTop = area.scrollHeight
  }
}

// Check if user is near bottom
function checkScrollPosition() {
  const area = messageAreaRef.value
  if (area) {
    const distanceFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight
    isUserNearBottom.value = distanceFromBottom < SCROLL_THRESHOLD
  }
}

// Utilities
function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// Close popover on outside click
function handleOutsideClick(e: MouseEvent) {
  if (showPopover.value && !consoleRef.value?.contains(e.target as Node)) {
    showPopover.value = false
  }
}

// P4-Select: 页面文本选中相关状态
const showSelectionToolbar = ref(false)
const selectionToolbarPos = ref({ x: 0, y: 0 })
const selectedText = ref('')
let selectionToolbarTimeout: number | null = null

// P4-Select: 监听页面文本选中
function handlePageSelection() {
  // 清除之前的定时器
  if (selectionToolbarTimeout) {
    clearTimeout(selectionToolbarTimeout)
  }
  
  const selection = window.getSelection()
  const text = selection?.toString().trim() || ''
  
  if (text.length > 0 && text.length < 2000) {
    // 获取选区位置
    const range = selection!.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    selectedText.value = text
    selectionToolbarPos.value = {
      x: rect.left + rect.width / 2 - 60, // 居中
      y: rect.top - 45 // 在选区上方
    }
    showSelectionToolbar.value = true
    
    // 3秒后自动隐藏
    selectionToolbarTimeout = window.setTimeout(() => {
      showSelectionToolbar.value = false
    }, 3000)
  } else {
    showSelectionToolbar.value = false
    selectedText.value = ''
  }
}

// P4-Select: 询问选中的文本
function askSelectedText() {
  if (!selectedText.value) return
  
  // 打开悬浮球
  openConsole()
  
  // 将选中文本填入输入框
  nextTick(() => {
    if (inputRef.value) {
      const quoteText = `> ${selectedText.value}\n\n请解释以上内容：`
      inputRef.value.textContent = quoteText
      inputVersion.value++
      inputRef.value.focus()
    }
  })
  
  // 隐藏工具条
  showSelectionToolbar.value = false
  selectedText.value = ''
  
  logger.logInfo('chat.selection.ask', '询问选中文本', { textLength: selectedText.value.length })
}

// P4-Select: 复制选中的文本
function copySelectedText() {
  if (!selectedText.value) return
  navigator.clipboard.writeText(selectedText.value)
  showSelectionToolbar.value = false
}

// ==================== Lifecycle ====================
onMounted(async () => {
  // P1-INIT: 初始化 AgentRuntime
  await initAgentRuntime()
  
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('resize', adjustInitialPosition)
  // Add scroll listener for smart scrolling
  messageAreaRef.value?.addEventListener('scroll', checkScrollPosition)
  
  // P4-Select: 监听页面文本选中
  document.addEventListener('mouseup', handlePageSelection)
  document.addEventListener('keyup', handlePageSelection)
})

onUnmounted(() => {
  // P0-3: 取消正在进行的流式请求
  chatService.abort()
  
  // P4-Session: 卸载时保存所有会话
  saveSessions()
  
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('resize', adjustInitialPosition)
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  messageAreaRef.value?.removeEventListener('scroll', checkScrollPosition)
  
  // P4-Select: 移除文本选中监听
  document.removeEventListener('mouseup', handlePageSelection)
  document.removeEventListener('keyup', handlePageSelection)
  
  if (selectionToolbarTimeout) {
    clearTimeout(selectionToolbarTimeout)
  }
})

// P4-Session: 监听会话变化，自动保存
watch(sessions, () => {
  saveSessions()
}, { deep: true })

// Watch for console open to set initial position
watch(isOpen, (open) => {
  if (open) {
    // Center console on screen initially
    const width = consoleSize.value.width
    const height = consoleSize.value.height
    consolePos.value.x = Math.max(20, (window.innerWidth - width) / 2)
    consolePos.value.y = Math.max(20, (window.innerHeight - height) / 2)
  }
})
</script>

<style scoped>
/* ==================== Floating Orb ==================== */
.ai-orb {
  width: 56px;
  height: 56px;
  cursor: pointer;
  position: relative;
}

.orb-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  z-index: 2;
}

.orb-icon {
  width: 44px;
  height: 44px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

/* 天线动画 */
.ai-orb:hover .orb-icon circle[fill="#FBBF24"] {
  animation: antenna-glow 1s ease-in-out infinite alternate;
}

@keyframes antenna-glow {
  from { fill: #FBBF24; }
  to { fill: #FCD34D; }
}

.orb-glow {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
  animation: orb-pulse 3s ease-in-out infinite;
  z-index: 1;
}

.ai-orb:hover .orb-inner {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(59, 130, 246, 0.5);
}

@keyframes orb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 0.3; }
}

/* ==================== Smart Console ==================== */
.smart-console {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.2s;
}

.resize-handle:hover,
.smart-console:hover .resize-handle {
  opacity: 1;
}

.resize-handle.n { top: 0; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
.resize-handle.s { bottom: 0; left: 8px; right: 8px; height: 8px; cursor: ns-resize; }
.resize-handle.e { right: 0; top: 8px; bottom: 8px; width: 8px; cursor: ew-resize; }
.resize-handle.w { left: 0; top: 8px; bottom: 8px; width: 8px; cursor: ew-resize; }
.resize-handle.ne { top: 0; right: 0; width: 16px; height: 16px; cursor: nesw-resize; }
.resize-handle.nw { top: 0; left: 0; width: 16px; height: 16px; cursor: nwse-resize; }
.resize-handle.se { bottom: 0; right: 0; width: 16px; height: 16px; cursor: nwse-resize; }
.resize-handle.sw { bottom: 0; left: 0; width: 16px; height: 16px; cursor: nesw-resize; }

.resize-handle::before {
  content: '';
  position: absolute;
  background: rgba(59, 130, 246, 0.5);
  transition: all 0.2s;
}

.resize-handle.n::before,
.resize-handle.s::before { height: 2px; left: 0; right: 0; top: 3px; }
.resize-handle.e::before,
.resize-handle.w::before { width: 2px; top: 0; bottom: 0; left: 3px; }
.resize-handle.ne::before,
.resize-handle.nw::before,
.resize-handle.se::before,
.resize-handle.sw::before { 
  width: 8px; height: 2px; top: 50%; left: 50%; transform: translate(-50%, -50%); 
}

/* Grip Handle */
.grip-handle {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94A3B8;
  cursor: nwse-resize;
  z-index: 101;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.grip-handle:hover {
  opacity: 1;
  color: #475569;
}

.grip-handle svg {
  width: 16px;
  height: 16px;
}

/* ==================== Header ==================== */
.console-header {
  height: 52px;
  background: #FAFAF9;
  border-bottom: 1px solid #F5F5F4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  cursor: move;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* P4-Session: History Button */
.history-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
  position: relative;
}

.history-btn:hover {
  background: #E5E7EB;
  color: #1F2937;
}

.history-btn.active {
  background: #DBEAFE;
  color: #1E40AF;
}

.history-btn svg {
  width: 18px;
  height: 18px;
}

.session-count {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #EF4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* P4-Session: New Session Button */
.new-session-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
}

.new-session-btn:hover {
  background: #DBEAFE;
  color: #1E40AF;
}

.new-session-btn svg {
  width: 18px;
  height: 18px;
}

/* P4-Quote: Quote Current Button */
.quote-current-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #92400E;
  transition: all 0.2s;
}

.quote-current-btn:hover {
  background: #FDE68A;
  border-color: #F59E0B;
}

.quote-current-btn svg {
  width: 16px;
  height: 16px;
}

.header-title {
  font-size: 15px;
  font-weight: 500;
  color: #292524;
  font-weight: 600;
  color: #1F2937;
  letter-spacing: -0.3px;
}

.header-skill-badge {
  font-size: 12px;
  padding: 3px 10px;
  background: #DBEAFE;
  color: #1E40AF;
  border-radius: 12px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Model Selector */
.model-selector {
  position: relative;
}

.model-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #4B5563;
  transition: all 0.2s;
}

.model-btn:hover {
  background: #E5E7EB;
  color: #1F2937;
}

.model-btn.thinking {
  background: #FFFFFF;
  border-color: #94A3B8;
  color: #475569;
}

.model-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #475569;
  box-shadow: 0 0 0 2px rgba(71, 85, 105, 0.2);
}

.model-status-dot.thinking {
  background: #64748B;
  box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.2);
  animation: status-breathe 2s ease-in-out infinite;
}

@keyframes status-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.model-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.2s;
}

.model-arrow.open {
  transform: rotate(180deg);
}

/* Model Dropdown */
.model-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 260px;
  background: #FFFFFF;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  z-index: 1000;
  overflow: hidden;
  transform-origin: top;
}

.model-dropdown.dropdown-up {
  top: auto;
  bottom: calc(100% + 8px);
  transform-origin: bottom;
}

.dropdown-section {
  padding: 8px 0;
}

.dropdown-title {
  padding: 8px 16px;
  font-size: 12px;
  color: #78716C;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.dropdown-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.dropdown-item:hover,
.dropdown-item.active {
  background: #F3F4F6;
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid #D1D5DB;
  margin-top: 4px;
  flex-shrink: 0;
}

.item-dot.active {
  background: #64748B;
  border-color: #64748B;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}

.item-desc {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}

/* Close Button */
.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #FEE2E2;
  color: #DC2626;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* P3-Persist: Clear History Button */
.clear-history-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
}

.clear-history-btn:hover {
  background: #FEF3C7;
  color: #D97706;
}

.clear-history-btn svg {
  width: 18px;
  height: 18px;
}

/* ==================== Session Sidebar ==================== */
.session-sidebar {
  position: absolute;
  left: 0;
  top: 52px;
  bottom: 0;
  width: 280px;
  background: #FFFFFF;
  border-right: 1px solid #E5E7EB;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.session-sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #F3F4F6;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
}

.sidebar-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6B7280;
  transition: all 0.2s;
}

.sidebar-close:hover {
  background: #F3F4F6;
  color: #1F2937;
}

.sidebar-close svg {
  width: 16px;
  height: 16px;
}

.session-sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.new-session-large {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
  background: #EFF6FF;
  border: 1px dashed #93C5FD;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #1E40AF;
  transition: all 0.2s;
}

.new-session-large:hover {
  background: #DBEAFE;
  border-color: #60A5FA;
}

.new-session-large svg {
  width: 16px;
  height: 16px;
}

.session-group {
  margin-bottom: 16px;
}

.session-group-label {
  font-size: 11px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 8px;
  margin-bottom: 6px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
}

.session-item:hover {
  background: #F9FAFB;
}

.session-item.active {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: #1F2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 2px;
}

.session-delete {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #9CA3AF;
  opacity: 0;
  transition: all 0.2s;
}

.session-item:hover .session-delete {
  opacity: 1;
}

.session-delete:hover {
  background: #FEE2E2;
  color: #DC2626;
}

.session-delete svg {
  width: 14px;
  height: 14px;
}

/* Sidebar transition */
.session-sidebar-enter-active,
.session-sidebar-leave-active {
  transition: transform 0.2s ease;
}

.session-sidebar-enter-from,
.session-sidebar-leave-to {
  transform: translateX(-100%);
}

/* Message area with sidebar */
.message-area.with-sidebar {
  margin-left: 280px;
}

/* ==================== Message Area ==================== */
.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #FAFAF9;
  scroll-behavior: smooth;
}

/* Empty State */
.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #A8A29E;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #292524;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  margin-bottom: 24px;
  color: #78716C;
}

.empty-tips {
  display: flex;
  gap: 16px;
}

.tip-item {
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #78716C;
}

.tip-item kbd {
  padding: 2px 8px;
  background: #F5F5F4;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  color: #57534E;
}

/* P3-Persist: Restore Notice */
.restore-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  margin: 8px 16px;
  background: #DBEAFE;
  border: 1px solid #93C5FD;
  border-radius: 8px;
  font-size: 13px;
  color: #1E40AF;
  animation: fade-in-down 0.3s ease;
}

@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.restore-close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(30, 64, 175, 0.1);
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  color: #1E40AF;
  line-height: 1;
  transition: all 0.2s;
}

.restore-close:hover {
  background: rgba(30, 64, 175, 0.2);
}

/* Messages */
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  animation: message-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: #FFFFFF;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.message.user .message-avatar {
  background: #F5F5F4;
}

.message-content {
  flex: 1;
  min-width: 0;
  max-width: calc(100% - 48px);
}

.user-text {
  background: #E7E5E4;
  color: #1C1917;
  padding: 12px 16px;
  border-radius: 16px 16px 4px 16px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

/* Reasoning Block (Thinking Process) - Low saturation gray style */
.reasoning-block {
  background: transparent;
  border-left: 3px solid #CBD5E1;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 13px;
}

.reasoning-block details {
  cursor: pointer;
}

.reasoning-block summary {
  font-weight: 500;
  color: #78716C;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
  font-style: italic;
}

.reasoning-block summary::-webkit-details-marker {
  display: none;
}

.reasoning-block summary::before {
  content: '▶';
  font-size: 10px;
  transition: transform 0.2s;
  color: #A8A29E;
}

.reasoning-block details[open] summary::before {
  transform: rotate(90deg);
}

.reasoning-content {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #F5F5F4;
  color: #57534E;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 400px;
  overflow-y: auto;
  font-style: italic;
}

.markdown-body {
  background: #FFFFFF;
  padding: 16px 20px;
  border-radius: 4px 16px 16px 16px;
  border: 1px solid #F2F2F2;
  font-size: 14px;
  line-height: 1.7;
  color: #44403C;
}

/* Markdown Styles */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 0 0 12px;
  font-weight: 600;
  color: #1F2937;
}

.markdown-body :deep(h1) { font-size: 18px; }
.markdown-body :deep(h2) { font-size: 16px; }
.markdown-body :deep(h3) { font-size: 15px; }

.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 12px;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid #3B82F6;
  background: #F8FAFC;
  padding: 12px 16px;
  margin: 12px 0;
  border-radius: 0 8px 8px 0;
  color: #475569;
}

.markdown-body :deep(code) {
  background: #F1F5F9;
  color: #EF4444;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
}

.markdown-body :deep(pre) {
  background: #1E1E1E;
  border-radius: 12px;
  overflow: hidden;
  margin: 12px 0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.markdown-body :deep(pre code) {
  display: block;
  padding: 16px;
  background: transparent;
  color: #E4E4E4;
  overflow-x: auto;
  line-height: 1.6;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #E2E8F0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #E2E8F0;
}

.markdown-body :deep(th) {
  background: #F1F5F9;
  font-weight: 600;
  color: #1E293B;
}

.markdown-body :deep(tr:last-child td) {
  border-bottom: none;
}

.markdown-body :deep(tr:nth-child(even)) {
  background: #F8FAFC;
}

.markdown-body :deep(strong) {
  color: #1E293B;
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: #2563EB;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

/* Attached Articles - Slate gray style */
.attached-articles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.article-tag {
  font-size: 12px;
  padding: 4px 10px;
  background: #F1F5F9;
  color: #334155;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.message-time {
  font-size: 11px;
  color: #D6D3D1;
  margin-top: 6px;
  padding-left: 4px;
}

/* Loading Indicator */
.loading-indicator {
  display: flex;
  gap: 6px;
  padding: 16px 20px;
  justify-content: center;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: #64748B;
  border-radius: 50%;
  animation: loading-bounce 1.4s ease-in-out infinite both;
}

.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes loading-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ==================== Skill Bar ==================== */
.skill-bar {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  background: #FAFAFA;
  border-top: 1px solid #F3F4F6;
  overflow-x: auto;
  scrollbar-width: none;
}

.skill-bar::-webkit-scrollbar {
  display: none;
}

.skill-capsule,
.article-capsule {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  flex-shrink: 0;
}

.skill-remove {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(0,0,0,0.1);
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  color: #6B7280;
  line-height: 1;
  transition: all 0.2s;
}

.skill-remove:hover {
  background: #FEE2E2;
  color: #DC2626;
}

/* Skill Animation */
.skill-slide-enter-active,
.skill-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.skill-slide-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.skill-slide-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

/* ==================== Input Area ==================== */
.input-area {
  padding: 12px 16px 16px;
  background: white;
  border-top: 1px solid #E5E7EB;
  position: relative;
}

/* Popover */
.input-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 16px;
  right: 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05);
  z-index: 100;
  overflow: hidden;
  max-height: 280px;
}

.popover-up {
  transform-origin: bottom;
}

.popover-list {
  display: flex;
  flex-direction: column;
}

.popover-header {
  padding: 12px 16px;
  border-bottom: 1px solid #F3F4F6;
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.popover-search {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.popover-search:focus {
  border-color: #94A3B8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
}

.popover-scroll {
  max-height: 200px;
  overflow-y: auto;
}

.popover-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}

.popover-item:hover,
.popover-item.active {
  background: #F3F4F6;
}

.popover-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F4F6;
  border-radius: 8px;
  font-size: 16px;
}

.popover-info {
  flex: 1;
  min-width: 0;
}

.popover-name {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}

.popover-desc {
  font-size: 12px;
  color: #6B7280;
  margin-top: 2px;
}

.article-thumb {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #64748B;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.popover-date {
  font-size: 11px;
  color: #9CA3AF;
}

.popover-empty {
  padding: 24px;
  text-align: center;
  color: #9CA3AF;
  font-size: 14px;
}

/* P4-Article: Article Picker */
.article-picker {
  width: 700px;
  height: 450px;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
}

.article-picker-header {
  padding: 12px 16px;
  border-bottom: 1px solid #F3F4F6;
  flex-shrink: 0;
}

.article-picker-search {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.article-picker-search:focus {
  border-color: #94A3B8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
}

.article-picker-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Tree Panel */
.article-tree {
  width: 240px;
  border-right: 1px solid #F3F4F6;
  overflow-y: auto;
  padding: 8px;
  background: #FAFAFA;
}

.article-tree-content,
.article-search-results {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-node {
  display: flex;
  flex-direction: column;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.tree-item:hover {
  background: #F3F4F6;
}

.tree-item.active {
  background: #DBEAFE;
  color: #1E40AF;
}

.tree-directory {
  font-weight: 500;
  color: #374151;
}

.tree-file {
  color: #4B5563;
  padding-left: 20px;
}

.tree-toggle {
  font-size: 10px;
  color: #9CA3AF;
  width: 14px;
  text-align: center;
}

.tree-icon {
  font-size: 14px;
}

.tree-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-children {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 8px;
}

.article-tree-empty {
  padding: 24px;
  text-align: center;
  color: #9CA3AF;
  font-size: 13px;
}

/* Preview Panel */
.article-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #F3F4F6;
  flex-shrink: 0;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 6px;
  font-size: 12px;
  color: #1E40AF;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover {
  background: #DBEAFE;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #9CA3AF;
  font-size: 14px;
}

.preview-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #E5E7EB;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-error {
  padding: 24px;
  text-align: center;
  color: #DC2626;
  font-size: 14px;
}

.preview-markdown {
  font-size: 13px;
  line-height: 1.7;
}

.preview-markdown :deep(h1),
.preview-markdown :deep(h2),
.preview-markdown :deep(h3) {
  font-size: 14px;
  margin: 12px 0 8px;
}

.preview-markdown :deep(p) {
  margin: 8px 0;
}

.preview-markdown :deep(code) {
  font-size: 12px;
}

.preview-markdown :deep(pre) {
  font-size: 12px;
}

.article-preview-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  gap: 12px;
}

.empty-preview-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-preview-text {
  font-size: 14px;
}

/* Input Box */
.input-box {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  background: #F5F5F4;
  border: 1px solid #E7E5E4;
  border-radius: 12px;
  padding: 8px 12px;
  transition: all 0.2s;
}

.input-box:focus-within {
  background: #FFFFFF;
  border-color: #D6D3D1;
}

.rich-input {
  flex: 1;
  min-height: 24px;
  max-height: 200px;
  padding: 6px 4px;
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
  color: #292524;
  overflow-y: auto;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.rich-input:empty::before {
  content: attr(placeholder);
  color: #A8A29E;
  pointer-events: none;
}

.rich-input .inline-capsule {
  display: inline;
  align-items: center;
  gap: 4px;
  padding: 2px 4px 2px 6px;
  background: #F1F5F9;
  color: #334155;
  border: 1px solid #E2E8F0;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  margin: 0 2px;
  vertical-align: middle;
  cursor: default;
  user-select: none;
  max-width: calc(100% - 20px);
  white-space: nowrap;
}

.rich-input .inline-capsule .capsule-text {
  display: inline;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rich-input .inline-capsule .capsule-remove {
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #94A3B8;
  color: #FFFFFF;
  border-radius: 50%;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  margin-left: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.rich-input .inline-capsule:hover .capsule-remove {
  opacity: 1;
}

.rich-input .inline-capsule .capsule-remove:hover {
  background: #DC2626;
}

.send-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #E5E7EB;
  border-radius: 8px;
  color: #9CA3AF;
  cursor: not-allowed;
  flex-shrink: 0;
  transition: all 0.2s;
}

.send-btn.active {
  background: #475569;
  color: #FFFFFF;
  cursor: pointer;
}

.send-btn.active:hover {
  background: #334155;
  transform: scale(1.05);
}

.send-btn svg {
  width: 18px;
  height: 18px;
}

.send-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Input Tips */
.input-tips {
  margin-top: 8px;
  font-size: 11px;
  color: #9CA3AF;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tip-hint {
  color: #3B82F6;
  font-weight: 500;
}

.tip-shortcuts {
  display: flex;
  gap: 12px;
}

.tip-shortcuts kbd {
  padding: 2px 6px;
  background: #F3F4F6;
  border-radius: 4px;
  font-family: inherit;
}

/* ==================== Transitions ==================== */
.orb-fade-enter-active,
.orb-fade-leave-active {
  transition: all 0.3s ease;
}

.orb-fade-enter-from,
.orb-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.console-scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.console-scale-leave-active {
  transition: all 0.2s ease;
}

.console-scale-enter-from,
.console-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dropdown-leave-active {
  transition: all 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.95);
}

.dropdown-up.dropdown-enter-from,
.dropdown-up.dropdown-leave-to {
  transform: scaleY(0.95) translateY(10px);
}

.popover-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.popover-leave-active {
  transition: all 0.15s ease;
}

.popover-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.popover-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* P4-Select: Selection Toolbar */
.selection-toolbar {
  position: fixed;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 9999;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #4B5563;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.toolbar-btn:hover {
  background: #F3F4F6;
}

.toolbar-btn.primary {
  background: #EFF6FF;
  color: #1E40AF;
}

.toolbar-btn.primary:hover {
  background: #DBEAFE;
}

.toolbar-fade-enter-active,
.toolbar-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toolbar-fade-enter-from,
.toolbar-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
