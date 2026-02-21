# ChatBot 状态管理架构重构方案

> 针对当前 AIChatOrb.vue 中状态管理混乱的问题，参考成熟方案（ChatGPT/Claude/Vercel AI SDK）重新设计的分层架构。

---

## 一、问题诊断

### 当前架构痛点

```typescript
// 当前代码（AIChatOrb.vue ~400行状态管理）
const isLoading = ref(false)                    // 普通聊天加载
const isAgentExecuting = ref(false)             // Agent模式加载（不同步！）
const isStreaming = ref(false)                  // 流式状态
const inputContent = ref('')                    // 输入内容
const attachedArticles = ref([])                // 引用文章
const activeSkill = ref(null)                   // 活跃技能
const messages = ref([])                        // 当前消息列表
const sessions = ref([])                        // 会话列表
const currentSessionId = ref(null)              // 当前会话ID
const showSessionSidebar = ref(false)           // 侧边栏显隐
const isDragging = ref(false)                   // 拖拽状态
// ... 还有 20+ 个状态变量
```

**核心问题：**
1. **状态分散** - 200+ 行状态定义，逻辑和UI耦合
2. **命名混乱** - `isLoading` vs `isAgentExecuting` 职责不清
3. **同步问题** - 两个加载状态导致UI禁用逻辑错误（🚫bug）
4. **难以测试** - 无法单独测试业务逻辑
5. **难以扩展** - 新增功能需要修改多处

---

## 二、新架构设计

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Presentation Layer (Vue Components)                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ AIChatOrbNew.vue                                        │    │
│  │ - 只读访问 Store 状态                                    │    │
│  │ - 纯UI交互逻辑（拖拽、滚动、动画）                        │    │
│  │ - 通过 actions 触发业务逻辑                              │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Domain Layer (Pinia Stores)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  chatStore   │  │ messageStore │  │ sessionStore │          │
│  │  当前对话状态 │  │  消息管理    │  │  会话列表    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐                                                │
│  │ streamStore  │  ┌──────────────┐                              │
│  │ 流式响应管理 │  │ plugin: sync │  ← 自动持久化插件            │
│  └──────────────┘  └──────────────┘                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Business Logic (State Machines)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ChatStateMachine                                        │    │
│  │ - IDLE / COMPOSING / SENDING / STREAMING / ERROR        │    │
│  │ - 严格的有限状态机，禁止非法状态转换                      │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Data Access (API Adapters)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  chatApi.ts  │  │ streamApi.ts │  │ storageApi   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 状态机设计

```typescript
// 核心状态流转（参考 XState）
type ChatState = 
  | 'IDLE'           // 空闲
  | 'COMPOSING'      // 正在输入
  | 'SENDING'        // 发送中
  | 'RECEIVING'      // 等待响应（非流式）
  | 'STREAMING'      // 接收流式响应
  | 'ERROR'          // 错误状态
  | 'INTERRUPTED'    // 用户中断

// 状态转换规则表
const transitions = {
  IDLE: {
    START_COMPOSING: 'COMPOSING',
    SEND_MESSAGE: 'SENDING'
  },
  COMPOSING: {
    SEND_MESSAGE: 'SENDING',
    RESET: 'IDLE'
  },
  SENDING: {
    START_STREAM: 'STREAMING',
    RECEIVE_RESPONSE: 'IDLE',
    ERROR: 'ERROR',
    INTERRUPT: 'INTERRUPTED'
  },
  STREAMING: {
    STREAM_END: 'IDLE',
    ERROR: 'ERROR',
    INTERRUPT: 'INTERRUPTED'
  },
  ERROR: {
    RETRY: 'SENDING',
    RESET: 'IDLE'
  }
}
```

**状态机优势：**
- ✅ 防止非法状态转换（如 STREAMING 时禁止 SEND）
- ✅ 单一事实来源，消除 `isLoading` vs `isAgentExecuting` 歧义
- ✅ 可测试、可追踪、可调试

---

## 三、Store 设计详情

### 3.1 chatStore - 当前对话状态

```typescript
export const useChatStore = defineStore('chat', () => {
  // State
  const inputContent = ref('')
  const inputArticles = ref<AttachedArticle[]>([])
  const activeSkill = ref<string | null>(null)
  const stateMachine = new ChatStateMachine()
  
  // Getters（基于状态机）
  const isLoading = computed(() => 
    ['SENDING', 'RECEIVING', 'STREAMING'].includes(stateMachine.state)
  )
  const canSend = computed(() => 
    hasContent.value && stateMachine.can('SEND_MESSAGE')
  )
  const canInterrupt = computed(() => 
    stateMachine.can('INTERRUPT')
  )
  
  // Actions（统一入口）
  async function sendMessage(options: ChatOptions) {
    // 1. 状态检查
    if (!canSend.value) return false
    
    // 2. 状态转换
    stateMachine.transition({ type: 'SEND_MESSAGE' })
    
    // 3. 根据路由选择模式
    if (shouldUseAgentMode(inputContent.value)) {
      return sendViaAgent(options)
    } else {
      return sendViaChat(options)
    }
  }
  
  function interrupt() {
    if (!canInterrupt.value) return false
    stateMachine.transition({ type: 'INTERRUPT' })
    // ...
  }
})
```

**关键改进：**
- 统一 `isLoading` 计算属性，不再区分 Agent/Chat 模式
- `canSend` / `canInterrupt` 由状态机决定，而非手动维护

### 3.2 messageStore - 消息管理

```typescript
export const useMessageStore = defineStore('message', () => {
  // 结构：{ sessionId: Message[] }
  const messagesBySession = ref<Record<string, Message[]>>({})
  
  // 核心功能
  async function addMessage(params)    // 乐观添加
  function updateMessage(id, updates)  // 实时更新
  function deleteMessage(id)           // 删除
  function regenerateMessage(id)       // 重新生成
  function getContext(messageId, size) // 获取上下文
  
  // 高级功能
  function rollbackOptimisticUpdate(id)  // 失败回滚
  function exportMessages(format)        // 导出
})
```

### 3.3 sessionStore - 会话管理

```typescript
export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([])
  const currentSessionId = ref<string | null>(null)
  
  // 分组 getters
  const todaySessions = computed(() => ...)
  const yesterdaySessions = computed(() => ...)
  const olderSessions = computed(() => ...)
  
  // CRUD
  async function createSession(title)
  async function switchSession(id)
  async function deleteSession(id)
  async function updateTitle(id, title)
  
  // 智能功能
  async function autoRename(sessionId, firstMessageContent)
})
```

### 3.4 streamStore - 流式管理

```typescript
export const useStreamStore = defineStore('stream', () => {
  // 连接状态
  const isStreaming = ref(false)
  const isConnecting = ref(false)
  
  // 性能统计
  const timeToFirstToken = ref(0)
  const chunkCount = ref(0)
  
  // 防抖缓冲
  const buffer = ref('')
  
  async function startStream(options, callbacks) {
    // 1. 防抖更新（16ms ~60fps）
    // 2. 自动重连（指数退避）
    // 3. 连接保活
  }
})
```

---

## 四、迁移示例

### 4.1 发送消息流程对比

**旧代码（混乱）：**
```typescript
// AIChatOrb.vue (旧)
async function sendMessage() {
  const text = inputRef.value?.innerText || ''
  
  if (shouldUseAgentRuntime(text)) {
    isAgentExecuting.value = true  // 状态1
    try {
      const response = await agentRuntime.processInput(text)
      messages.value.push({...})
    } catch (e) {
      // 错误处理分散
    } finally {
      isAgentExecuting.value = false  // 可能忘记重置！
    }
  } else {
    isLoading.value = true  // 状态2
    await chatService.sendMessageStream(text, onChunk)
    isLoading.value = false
  }
}
```

**新代码（清晰）：**
```typescript
// AIChatOrbNew.vue (新)
async function sendMessage() {
  // 只调用 action，不关心内部实现
  await chat.sendMessage({ stream: true })
}

// 逻辑在 chatStore.ts
async function sendMessage(options) {
  if (!canSend.value) return false
  
  stateMachine.transition({ type: 'SEND_MESSAGE' })
  
  try {
    if (shouldUseAgentMode(inputContent.value)) {
      await sendViaAgent(options)
    } else {
      await sendViaChat(options)
    }
    stateMachine.transition({ type: 'STREAM_END' })
  } catch (e) {
    stateMachine.transition({ type: 'ERROR', payload: { error: e } })
  }
}
```

### 4.2 文件结构对比

**旧结构：**
```
.vitepress/
├── agent/
│   └── chat-service.ts          # 单一服务，职责不清
├── theme/
│   └── components/
│       └── agent/
│           └── AIChatOrb.vue    # 4000+行，包含所有逻辑
```

**新结构：**
```
.vitepress/
├── agent/
│   ├── stores/                  # 新增：状态管理层
│   │   ├── index.ts             # 统一导出
│   │   ├── chatStore.ts         # 当前对话状态
│   │   ├── messageStore.ts      # 消息管理
│   │   ├── sessionStore.ts      # 会话列表
│   │   ├── streamStore.ts       # 流式响应
│   │   └── machines/
│   │       └── ChatStateMachine.ts  # 状态机
│   └── api/
│       └── chat.ts              # API接口（已存在）
├── theme/
│   └── components/
│       └── agent/
│           ├── AIChatOrbNew.vue     # 新UI组件（简化）
│           ├── ChatMessage.vue      # 消息子组件
│           └── SessionItem.vue      # 会话子组件
```

---

## 五、使用指南

### 5.1 基础使用

```typescript
// 在组件中使用
import { useChatStores } from '../stores'

const { chat, message, session } = useChatStores()

// 读取状态
console.log(chat.currentState)      // 'IDLE'
console.log(chat.canSend)           // boolean
console.log(session.todaySessions)  // Session[]

// 调用action
chat.updateInput('你好')
await chat.sendMessage({ stream: true })
chat.interrupt()
```

### 5.2 监听状态变化

```typescript
// 监听状态机变化
const unsubscribe = chat.stateMachine.onTransition((state, context) => {
  console.log(`状态变为: ${state}`)
  if (state === 'ERROR') {
    showErrorToast(context.error)
  }
})

// 组件卸载时取消监听
onUnmounted(() => unsubscribe())
```

### 5.3 持久化插件

```typescript
// stores/plugins/persist.ts
export function persistPlugin({ store }) {
  // 自动保存草稿到 localStorage
  if (store.$id === 'chat') {
    store.$subscribe((mutation, state) => {
      localStorage.setItem('chat:draft', JSON.stringify({
        input: state.inputContent,
        articles: state.inputArticles
      }))
    })
  }
}

// 在 store 中注册
export const useChatStore = defineStore('chat', () => {
  // ...
}, {
  plugins: [persistPlugin]
})
```

---

## 六、性能优化

### 6.1 防抖更新

```typescript
// streamStore.ts
const DEBOUNCE_MS = 16 // ~60fps

function scheduleUpdate(updateFn: () => void) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(updateFn, DEBOUNCE_MS)
}
```

### 6.2 虚拟滚动（消息多的时候）

```typescript
// 只渲染可视区域消息
const visibleMessages = computed(() => {
  const start = Math.floor(scrollTop / itemHeight)
  const count = Math.ceil(viewportHeight / itemHeight)
  return messages.value.slice(start, start + count + buffer)
})
```

### 6.3 消息上限

```typescript
// 只保留最近100条消息在内存
const MAX_MESSAGES = 100

function addMessage(msg) {
  messages.value.push(msg)
  if (messages.value.length > MAX_MESSAGES) {
    messages.value = messages.value.slice(-MAX_MESSAGES)
  }
}
```

---

## 七、测试策略

### 7.1 状态机测试

```typescript
// ChatStateMachine.spec.ts
describe('ChatStateMachine', () => {
  it('should transition from IDLE to SENDING', () => {
    const sm = new ChatStateMachine()
    expect(sm.transition({ type: 'SEND_MESSAGE' })).toBe(true)
    expect(sm.getState()).toBe('SENDING')
  })
  
  it('should reject invalid transition', () => {
    const sm = new ChatStateMachine()
    sm.transition({ type: 'SEND_MESSAGE' })
    expect(sm.transition({ type: 'SEND_MESSAGE' })).toBe(false)
  })
})
```

### 7.2 Store测试

```typescript
// chatStore.spec.ts
describe('chatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  
  it('should not send when loading', async () => {
    const chat = useChatStore()
    chat.stateMachine.transition({ type: 'SEND_MESSAGE' })
    
    const result = await chat.sendMessage({})
    expect(result).toBe(false)
  })
})
```

---

## 八、实施路线图

### Phase 1: 基础设施（1-2天）
- [ ] 安装 Pinia
- [ ] 创建 stores 目录结构
- [ ] 实现 ChatStateMachine

### Phase 2: Core Stores（2-3天）
- [ ] 实现 chatStore
- [ ] 实现 messageStore
- [ ] 实现 sessionStore
- [ ] 实现 streamStore

### Phase 3: UI重构（2-3天）
- [ ] 创建 AIChatOrbNew.vue
- [ ] 创建 ChatMessage.vue
- [ ] 创建 SessionItem.vue

### Phase 4: 迁移与测试（2-3天）
- [ ] 逐步迁移功能
- [ ] 编写单元测试
- [ ] 性能测试

### Phase 5: 清理（1天）
- [ ] 删除旧代码
- [ ] 更新文档

---

## 九、参考资源

- [XState - JavaScript State Machines](https://xstate.js.org/)
- [Pinia - The Vue Store](https://pinia.vuejs.org/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [ChatGPT Web UI State Management](https://github.com/openai/chatgpt-retrieval-plugin)

---

**文档版本**: v1.0  
**作者**: Claude Code  
**日期**: 2026-02-21
