# UI 组件详解

> **【总-分-总】组件详解**
> 
> 先理解 UI 组件的整体架构，再详解每个核心组件，最后总结组件间通信模式。

---

## 【总】UI 组件架构

MetaUniverse Agent 的 UI 层基于 **Vue 3 + VitePress**，采用组件化设计，与 Agent Runtime 通过事件系统解耦。

### 组件层次结构

```
┌─────────────────────────────────────────────────────────────┐
│                      UI 组件架构                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layout Layer                                               │
│  ├── Layout.vue              # VitePress 布局               │
│  └── GlobalContainer.vue     # Agent 组件挂载点             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Feature Components (功能组件)                              │
│  ├── AIChatOrb.vue           # 智能悬浮球                   │
│  ├── GlobalPageEditorAGI.vue # 增强编辑器                   │
│  ├── HistoryViewerAGI.vue    # 增强历史查看器               │
│  └── KnowledgeGraph.vue      # 知识图谱                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Sub Components (子组件)                                    │
│  ├── AgentModeToggle.vue     # 模式切换器                   │
│  ├── InlineSuggestion.vue    # 行内建议                     │
│  ├── ContextIndicator.vue    # 上下文指示器                 │
│  ├── ChatInterface.vue       # 聊天界面                     │
│  └── Timeline.vue            # 时间轴                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Base Components (基础组件)                                 │
│  ├── VditorEditor.vue        # 编辑器封装                   │
│  ├── LoadingSpinner.vue      # 加载动画                     │
│  └── CostBadge.vue           # 成本标签                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 组件通信方式

```
┌─────────────────────────────────────────────────────────────┐
│                    组件通信模式                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Props/Emits (父子组件)                                  │
│     父 → 子: Props 传值                                     │
│     子 → 父: Events 回调                                    │
│                                                             │
│  2. AgentRuntime Events (全局事件)                          │
│     • 订阅: agent.on('event', callback)                    │
│     • 发布: AgentRuntime 内部 emit                         │
│                                                             │
│  3. Provide/Inject (深层嵌套)                               │
│     • 提供: provide('key', value)                          │
│     • 注入: inject('key')                                  │
│                                                             │
│  4. Composables (共享逻辑)                                  │
│     • useAgent()                                           │
│     • useChat()                                            │
│     • useMemory()                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 【分】核心组件详解

### AIChatOrb - 智能悬浮球

**【总】功能定位**

系统的"智能入口"和"全局助手"，提供快速访问 AI 能力的入口。

**【分】组件结构**

```vue
<!-- AIChatOrb.vue 结构 -->
<template>
  <!-- 悬浮球 -->
  <div 
    v-if="!isOpen"
    class="ai-chat-orb"
    @click="open"
  >
    <div class="orb-icon" :class="{ 'has-notification': hasNotification }">
      🤖
    </div>
  </div>
  
  <!-- 聊天界面 -->
  <Teleport to="body">
    <ChatInterface
      v-if="isOpen"
      :messages="messages"
      :is-streaming="isStreaming"
      @send="handleSend"
      @close="close"
      @quick-action="handleQuickAction"
    />
  </Teleport>
</template>

<script setup lang="ts">
const agent = AgentRuntime.getInstance()
const isOpen = ref(false)
const messages = ref<ChatMessage[]>([])
const isStreaming = ref(false)

// 上下文感知
function captureContext(): ContextSnapshot {
  return {
    currentPage: window.location.pathname,
    selectedText: window.getSelection()?.toString() || '',
    wikiLinks: extractWikiLinksFromPage(),
    recentHistory: getRecentArticles()
  }
}

// 发送消息
async function handleSend(content: string) {
  // 添加用户消息
  messages.value.push({
    id: generateId(),
    role: 'user',
    content,
    timestamp: Date.now()
  })
  
  isStreaming.value = true
  
  // 调用 Agent
  const context = captureContext()
  const response = await agent.processInput(content, context)
  
  // 添加 AI 回复
  messages.value.push(response)
  
  isStreaming.value = false
}

// 快捷操作
function handleQuickAction(action: string) {
  switch (action) {
    case 'continue':
      handleSend('基于当前文章续写')
      break
    case 'search':
      handleSend('搜索相关资料')
      break
    case 'summarize':
      handleSend('总结当前文章')
      break
  }
}
</script>
```

**【分】状态管理**

```typescript
// 使用 composable 封装
export function useChatOrb() {
  const agent = AgentRuntime.getInstance()
  const isOpen = ref(false)
  const messages = ref<ChatMessage[]>(loadMessagesFromStorage())
  const unreadCount = ref(0)
  
  // 监听新消息
  agent.on('taskCompleted', () => {
    if (!isOpen.value) {
      unreadCount.value++
    }
  })
  
  function open() {
    isOpen.value = true
    unreadCount.value = 0
  }
  
  function close() {
    isOpen.value = false
    saveMessagesToStorage(messages.value)
  }
  
  async function send(content: string) {
    // ...
  }
  
  return {
    isOpen,
    messages,
    unreadCount,
    open,
    close,
    send
  }
}
```

**【总】设计要点**

```
✅ 悬浮球始终可见，方便快速访问
✅ 使用 Teleport 渲染到 body，避免样式隔离问题
✅ 上下文感知，自动捕获当前页面信息
✅ 消息历史持久化，刷新不丢失
✅ 未读消息红点提示
```

---

### GlobalPageEditorAGI - 增强编辑器

**【总】功能定位**

人机协同创作工作站，支持三种编辑模式的切换。

**【分】组件结构**

```vue
<template>
  <div class="global-page-editor-agi">
    <!-- 工具栏 -->
    <EditorToolbar
      :file-path="currentFile"
      :is-saving="isSaving"
      :mode="editorMode"
      @mode-change="onModeChange"
      @save="saveContent"
      @close="closeEditor"
    />
    
    <!-- 编辑区域 -->
    <div class="editor-main">
      <VditorEditor
        v-model="content"
        :mode="editorMode"
        @cursor-change="onCursorChange"
        @input="onInput"
      />
      
      <!-- 行内建议 -->
      <InlineSuggestion
        v-if="activeSuggestion"
        :suggestion="activeSuggestion"
        @accept="acceptSuggestion"
        @dismiss="dismissSuggestion"
      />
    </div>
    
    <!-- 底部状态栏 -->
    <EditorStatusBar
      :word-count="content.length"
      :is-saving="isSaving"
      :agent-state="agentState"
      :mode="editorMode"
      :context-info="contextInfo"
    />
  </div>
</template>

<script setup lang="ts">
const agent = AgentRuntime.getInstance()
const editorMode = ref<EditorMode>('MANUAL')
const content = ref('')
const isSaving = ref(false)
const agentState = ref<AgentState>('IDLE')
const activeSuggestion = ref<Suggestion | null>(null)
const contextInfo = ref<ContextInfo>({ relatedArticles: 0, entities: [], tokens: 0 })

// 监听模式变化
agent.on('modeChanged', ({ newMode }) => {
  editorMode.value = newMode
})

// 监听 Agent 状态
agent.on('stateChanged', ({ state }) => {
  agentState.value = state
})

// 输入处理（COLLAB 模式）
const debouncedAnalyze = debounce(async (val: string) => {
  if (editorMode.value === 'COLLAB') {
    const suggestions = await agent.analyzeEditorContent(val, cursorPosition.value)
    if (suggestions.length > 0) {
      activeSuggestion.value = suggestions[0]
    }
  }
}, 1500)

function onInput(val: string) {
  content.value = val
  debouncedAnalyze(val)
}

// 模式切换
function onModeChange(mode: EditorMode) {
  agent.setMode(mode)
}

// 保存
async function saveContent() {
  isSaving.value = true
  
  await fetch('/api/files/save', {
    method: 'POST',
    body: JSON.stringify({ path: currentFile.value, content: content.value })
  })
  
  // 提取实体（如果是 COLLAB/AGENT 模式）
  if (editorMode.value !== 'MANUAL') {
    await agent.getMemory().extractEntitiesFromContent(content.value, currentFile.value)
  }
  
  isSaving.value = false
}
</script>
```

**【分】三模态切换**

```typescript
// 模式配置
const modeConfig: Record<EditorMode, ModeConfig> = {
  MANUAL: {
    label: '人工',
    icon: '👤',
    features: [],  // 无 AI 功能
    vditorConfig: {
      hint: { show: false },
      toolbar: ['headings', 'bold', 'italic', 'link', 'list', 'code']
    }
  },
  COLLAB: {
    label: '协作',
    icon: '🤝',
    features: ['inline-suggestion', 'context-indicator', 'entity-detection'],
    vditorConfig: {
      hint: { show: true },  // 启用提示
      toolbar: [...manualToolbar, 'ai-assist']  // 添加 AI 辅助按钮
    }
  },
  AGENT: {
    label: '托管',
    icon: '🤖',
    features: ['natural-language-command', 'auto-write', 'auto-edit'],
    vditorConfig: {
      readOnly: true,  // 只读，Agent 自动编辑
      toolbar: ['agent-status', 'interrupt', 'accept']
    }
  }
}
```

**【总】设计要点**

```
✅ 模式切换平滑，有视觉反馈
✅ MANUAL 模式下与原有编辑器完全一致
✅ COLLAB 模式下实时建议，不干扰编辑
✅ AGENT 模式下用户只输入指令
✅ 底部状态栏显示 AI 状态和上下文信息
```

---

### HistoryViewerAGI - 增强历史查看器

**【总】功能定位**

融合人工编辑历史和 Agent 操作历史的统一查看界面。

**【分】组件结构**

```vue
<template>
  <div class="history-viewer-agi">
    <!-- 标签页 -->
    <div class="history-tabs">
      <button 
        v-for="tab in tabs"
        :key="tab.key"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.badge" class="badge">{{ tab.badge }}</span>
      </button>
    </div>
    
    <!-- 内容区域 -->
    <div class="history-content">
      <!-- 左侧列表 -->
      <div class="history-list">
        <!-- 文件历史 -->
        <template v-if="activeTab === 'file'">
          <HistorySection
            title="人工编辑"
            icon="👤"
            :items="humanCommits"
            @select="viewCommit"
          />
          <HistorySection
            title="Agent 编辑"
            icon="🤖"
            :items="agentCommits"
            @select="viewCommit"
          />
        </template>
        
        <!-- Agent 任务 -->
        <template v-if="activeTab === 'agent'">
          <TaskList
            :tasks="agentTasks"
            @select="viewTask"
          />
        </template>
      </div>
      
      <!-- 右侧详情 -->
      <div class="history-detail">
        <CommitDetail
          v-if="selectedCommit"
          :commit="selectedCommit"
        />
        <TaskDetail
          v-else-if="selectedTask"
          :task="selectedTask"
          @view-step="viewStep"
        />
        <EmptyState v-else />
      </div>
    </div>
  </div>
</template>
```

**【分】任务时间轴展示**

```vue
<!-- TaskDetail.vue -->
<template>
  <div class="task-detail">
    <h3>🤖 Agent 任务</h3>
    
    <!-- 任务元信息 -->
    <div class="task-meta">
      <p><strong>任务 ID:</strong> {{ task.id }}</p>
      <p><strong>描述:</strong> {{ task.description }}</p>
      <p><strong>耗时:</strong> {{ formatDuration(task.completedAt - task.startedAt) }}</p>
      <p><strong>成本:</strong> ${{ task.cost.toFixed(4) }}</p>
    </div>
    
    <!-- 步骤时间轴 -->
    <div class="task-timeline">
      <h4>执行步骤</h4>
      <Timeline
        :items="task.steps.map(s => ({
          title: s.skill,
          description: formatStepMeta(s),
          status: s.error ? 'error' : 'success'
        }))"
        @select="onStepSelect"
      />
    </div>
    
    <!-- 步骤详情 -->
    <div v-if="selectedStep" class="step-detail">
      <h4>步骤 {{ selectedStep.index }} 详情</h4>
      <pre class="io-section">输入: {{ JSON.stringify(selectedStep.input, null, 2) }}</pre>
      <pre class="io-section">输出: {{ JSON.stringify(selectedStep.output, null, 2) }}</pre>
    </div>
  </div>
</template>
```

---

### AgentModeToggle - 模式切换器

**【总】功能定位**

编辑器右上角的模式切换控件，提供直观的模式选择和状态展示。

**【分】实现代码**

```vue
<template>
  <div class="agent-mode-toggle">
    <div class="mode-segmented">
      <button
        v-for="m in modes"
        :key="m.key"
        class="mode-btn"
        :class="{ active: mode === m.key, [m.key.toLowerCase()]: true }"
        @click="switchMode(m.key)"
      >
        <span class="mode-icon">{{ m.icon }}</span>
        <span class="mode-label">{{ m.label }}</span>
      </button>
    </div>
    <div class="mode-indicator" :class="mode.toLowerCase()"></div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ mode: EditorMode }>()
const emit = defineEmits(['change'])

const modes = [
  { key: 'MANUAL', label: '人工', icon: '👤', description: '完全手动编辑' },
  { key: 'COLLAB', label: '协作', icon: '🤝', description: 'AI 实时建议' },
  { key: 'AGENT', label: '托管', icon: '🤖', description: 'Agent 自动执行' }
]

function switchMode(newMode: EditorMode) {
  if (newMode !== props.mode) {
    emit('change', newMode)
  }
}
</script>

<style scoped>
/* 模式按钮样式 */
.mode-btn.active.manual { background: #6b7280; }
.mode-btn.active.collab { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
}
.mode-btn.active.agent { 
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); 
}

/* 底部指示条动画 */
.mode-indicator.collab,
.mode-indicator.agent {
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
</style>
```

---

### InlineSuggestion - 行内建议

**【总】功能定位**

COLLAB 模式下，在编辑器光标位置显示的建议浮窗。

**【分】实现要点**

```vue
<template>
  <div 
    class="inline-suggestion"
    :class="typeClass"
    :style="positionStyle"
  >
    <div class="suggestion-header">
      <span class="type-badge">{{ typeLabel }}</span>
      <span v-if="suggestion.confidence" class="confidence">
        {{ Math.round(suggestion.confidence * 100) }}%
      </span>
    </div>
    
    <div class="suggestion-content">
      <p class="suggestion-text">{{ suggestion.content }}</p>
    </div>
    
    <div class="suggestion-actions">
      <button class="action-btn primary" @click="accept">
        <span class="key">Tab</span>
        <span>接受</span>
      </button>
      <button class="action-btn" @click="dismiss">
        <span class="key">Esc</span>
        <span>忽略</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 键盘事件监听
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault()
    accept()
  } else if (e.key === 'Escape') {
    dismiss()
  }
}
</script>
```

---

## 【总】组件通信最佳实践

### 模式 1: 使用 Composables 共享状态

```typescript
// composables/useAgent.ts
export function useAgent() {
  const agent = AgentRuntime.getInstance()
  const state = ref(agent.getCurrentState())
  const mode = ref(agent.getMode())
  
  // 订阅状态变化
  onMounted(() => {
    const unsubscribe = agent.on('stateChanged', ({ state: newState }) => {
      state.value = newState
    })
    
    onUnmounted(() => unsubscribe())
  })
  
  return {
    agent,
    state,
    mode,
    setMode: agent.setMode.bind(agent),
    processInput: agent.processInput.bind(agent)
  }
}

// 在组件中使用
const { state, mode, setMode } = useAgent()
```

### 模式 2: 全局状态管理

```typescript
// stores/agent.ts (Pinia)
export const useAgentStore = defineStore('agent', () => {
  const agent = AgentRuntime.getInstance()
  
  // State
  const messages = ref<ChatMessage[]>([])
  const currentTask = ref<TaskState | null>(null)
  
  // Getters
  const isProcessing = computed(() => currentTask.value?.state === 'EXECUTING')
  
  // Actions
  async function sendMessage(content: string) {
    messages.value.push({ role: 'user', content, id: generateId() })
    
    const response = await agent.processInput(content)
    messages.value.push(response)
  }
  
  return {
    messages,
    currentTask,
    isProcessing,
    sendMessage
  }
})
```

### 模式 3: 事件总线（跨组件通信）

```typescript
// utils/eventBus.ts
import mitt from 'mitt'

const emitter = mitt<{
  'suggestion:accept': Suggestion
  'suggestion:dismiss': Suggestion
  'editor:save': string
  'chat:scrollToBottom': void
}>()

export default emitter

// 组件 A 发送
import emitter from './utils/eventBus'
emitter.emit('suggestion:accept', suggestion)

// 组件 B 接收
import emitter from './utils/eventBus'
onMounted(() => {
  emitter.on('suggestion:accept', (suggestion) => {
    // 处理接受建议
  })
})
```

---

## 附录：组件目录结构

```
docs/.vitepress/theme/components/
├── agent/                          # Agent 相关组件
│   ├── AIChatOrb.vue              # 智能悬浮球
│   ├── ChatInterface.vue          # 聊天界面
│   ├── GlobalPageEditorAGI.vue    # 增强编辑器
│   ├── AgentModeToggle.vue        # 模式切换器
│   ├── InlineSuggestion.vue       # 行内建议
│   ├── ContextIndicator.vue       # 上下文指示器
│   ├── HistoryViewerAGI.vue       # 增强历史查看器
│   └── TaskTimeline.vue           # 任务时间轴
├── editor/                         # 编辑器组件
│   └── VditorEditor.vue           # Vditor 封装
├── features/                       # 功能组件
│   └── KnowledgeGraph.vue         # 知识图谱
└── base/                           # 基础组件
    ├── LoadingSpinner.vue
    ├── CostBadge.vue
    └── EmptyState.vue
```

---

*文档版本: 1.0*  
*关联文档: [AgentRuntime](./runtime.md), [组件交互](../interactions/ui-runtime.md)*
