# Chat State Management Architecture

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Components                             │
│                    (AIChatOrb.vue - 只读)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Pinia Stores (Domain)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  chatStore   │  │ messageStore │  │ sessionStore │           │
│  │  当前对话状态 │  │  消息管理    │  │  会话列表    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│  ┌──────────────┐                                                │
│  │ streamStore  │                                                │
│  │  流式响应管理 │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              State Machines (Business Logic)                     │
├─────────────────────────────────────────────────────────────────┤
│  ChatStateMachine    - 管理对话生命周期                          │
│  MessageStateMachine - （未来）单条消息状态                      │
│  StreamStateMachine  - （未来）流连接状态                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Adapters                                 │
│  chatApi.ts  |  streamApi.ts  |  storageApi.ts                   │
└─────────────────────────────────────────────────────────────────┘
```

## Store 职责

### chatStore - 当前对话状态管理
- 管理当前输入内容、引用文章、活跃技能
- 协调消息发送流程
- 维护 ChatStateMachine 实例
- 处理流式/非流式发送的统一入口

```typescript
const chat = useChatStore()
chat.updateInput('你好')
chat.attachArticle({ path: '/article.md', title: '测试文章' })
await chat.sendMessage({ stream: true })
chat.interrupt() // 中断当前请求
```

### messageStore - 消息管理
- 管理所有会话的消息数据
- 提供消息CRUD操作
- 消息状态跟踪（pending/streaming/completed/error）
- 乐观更新和撤销

```typescript
const message = useMessageStore()
message.addMessage({ sessionId, role: 'user', content: '你好' })
message.updateMessage(messageId, { content: '更新内容', status: 'streaming' })
message.getLastAssistantMessage(sessionId)
```

### sessionStore - 会话管理
- 管理会话列表（CRUD）
- 当前会话切换
- 会话元数据管理（标题、时间戳等）
- 与会话API的交互

```typescript
const session = useSessionStore()
await session.initialize()
await session.createSession('新对话')
session.switchSession(sessionId)
session.todaySessions // getter
```

### streamStore - 流式响应管理
- 管理 SSE 连接状态
- 流数据缓冲与重放
- 流式消息的平滑更新（防抖）
- 连接异常自动重连

```typescript
const stream = useStreamStore()
await stream.startStream(options, {
  onChunk: (chunk) => { /* 更新UI */ },
  onComplete: (metadata) => { /* 完成处理 */ },
  onError: (error) => { /* 错误处理 */ }
})
```

## State Machine 状态流转

```
                    ┌─────────────┐
         ┌─────────│    IDLE     │
         │         │   (空闲)    │
         │         └──────┬──────┘
         │                │ START_COMPOSING
         │                ▼
         │         ┌─────────────┐
         │         │  COMPOSING  │
         │         │  (正在输入)  │
         │         └──────┬──────┘
         │                │ SEND_MESSAGE
         │                ▼
         │         ┌─────────────┐     START_STREAM     ┌─────────────┐
         │         │   SENDING   │─────────────────────▶│  STREAMING  │
         │         │  (发送中)   │                      │ (流式接收)  │
         │         └──────┬──────┘                      └──────┬──────┘
         │                │ RECEIVE_RESPONSE                    │
         │                │ (非流式)                    STREAM_CHUNK │
         │                ▼                                    │
         │         ┌─────────────┐                            │
         └────────▶│    IDLE     │◀───────────────────────────┘
                   │   (完成)    │           STREAM_END
                   └──────┬──────┘
                          │
              ERROR       │       INTERRUPT
                 │        │        │
                 ▼        │        ▼
            ┌─────────┐   │   ┌─────────────┐
            │  ERROR  │   │   │ INTERRUPTED │
            └────┬────┘   │   └──────┬──────┘
                 │        │          │
                 └────────┴──────────┘
                          │
                          ▼ RETRY
                    ┌─────────────┐
                    │   SENDING   │
                    └─────────────┘
```

## 状态流转规则

| 当前状态 | 允许的操作 | 禁止的操作 |
|---------|-----------|-----------|
| IDLE | 输入、发送 | 中断、重试 |
| COMPOSING | 输入、发送 | 中断 |
| SENDING | 中断 | 发送、输入 |
| STREAMING | 中断 | 发送、输入 |
| ERROR | 重试、重置、输入 | 中断 |
| INTERRUPTED | 重试、重置、输入 | 中断 |

## 迁移指南

### 从旧代码迁移

**旧代码（混乱的状态管理）：**
```typescript
// AIChatOrb.vue (旧)
const isLoading = ref(false)
const isAgentExecuting = ref(false)
const messages = ref<Message[]>([])
const sessions = ref<Session[]>([])
// ... 200+ 行状态管理代码
```

**新代码（清晰的分层）：**
```typescript
// AIChatOrb.vue (新)
import { useChatStores } from '../stores'

const { chat, message, session } = useChatStores()

// 只读访问
const messages = computed(() => 
  message.getSessionMessages(session.currentSessionId)
)

// 调用 action
function onSend() {
  chat.sendMessage()
}
```

## 安装依赖

```bash
npm install pinia
```

## 在主应用注册

```typescript
// .vitepress/theme/index.ts
import { createPinia } from 'pinia'

export default {
  enhanceApp({ app }) {
    app.use(createPinia())
  }
}
```
