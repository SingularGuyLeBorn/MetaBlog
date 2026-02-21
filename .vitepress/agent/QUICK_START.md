# Chat 状态管理 - 快速上手指南

本指南帮助您快速上手新的 Pinia 状态管理架构。

## 目录

- [5 分钟快速开始](#5-分钟快速开始)
- [核心概念](#核心概念)
- [常用模式](#常用模式)
- [常见问题](#常见问题)

---

## 5 分钟快速开始

### 1. 安装依赖

```bash
npm install pinia
```

### 2. 注册 Pinia

在 `.vitepress/theme/index.ts` 中添加：

```typescript
import { createPinia } from 'pinia'
import persistPlugin from '../agent/stores/plugins/persistPlugin'

export default {
  enhanceApp({ app }) {
    const pinia = createPinia()
    pinia.use(persistPlugin)
    app.use(pinia)
  }
}
```

### 3. 在组件中使用

```vue
<template>
  <div class="chat">
    <!-- 消息列表 -->
    <div class="messages">
      <div v-for="msg in messages" :key="msg.id" class="message">
        {{ msg.content }}
      </div>
    </div>
    
    <!-- 输入框 -->
    <div class="input-area">
      <input 
        v-model="inputContent" 
        @keydown.enter="send"
        :disabled="!canSend"
      />
      <button @click="send" :disabled="!canSend">
        {{ isStreaming ? '停止' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { useChat } from '../composables/useChat'

const { 
  messages,
  inputContent,
  canSend,
  isStreaming,
  sendMessage,
  interrupt 
} = useChat()

async function send() {
  if (isStreaming.value) {
    await interrupt()
  } else {
    await sendMessage(inputContent.value, { stream: true })
  }
}
</script>
```

---

## 核心概念

### Store 架构

```
┌─────────────────────────────────────────────────────┐
│                    UI Components                     │
│         (BasicChatExample.vue, ChatMessage.vue)      │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                  Composables                         │
│   useChat(), useChatInput(), useChatHistory()        │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                   Pinia Stores                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ chatStore│ │sessionStore│ │messageStore│ │streamStore│ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│                ChatStateMachine                      │
│        IDLE → SENDING → STREAMING → IDLE             │
└─────────────────────────────────────────────────────┘
```

### 状态流转

```
                    ┌─────────┐
        ┌──────────▶│  IDLE   │◀──────────┐
        │           └────┬────┘           │
        │                │                │
   INTERRUPT        START_COMPOSING  STREAM_END
        │                │                │
        │           ┌────▼────┐           │
        │           │COMPOSING│           │
        │           └────┬────┘           │
        │                │ SEND_MESSAGE   │
        │           ┌────▼────┐           │
        └───────────┤ SENDING ├───────────┘
                    └────┬────┘
                         │ START_STREAM
                    ┌────▼────┐
                    │STREAMING│◀────┐
                    └────┬────┘     │
                         │          │
                    ┌────▼────┐     │
                    │  ERROR  ├─────┘
                    └─────────┘   RETRY
```

---

## 常用模式

### 模式 1: 基础消息发送

```typescript
import { useChat } from '../composables/useChat'

const { messages, sendMessage, isLoading } = useChat()

// 发送消息
async function handleSend(content: string) {
  try {
    await sendMessage(content, { stream: true })
  } catch (error) {
    console.error('发送失败:', error)
  }
}
```

### 模式 2: 管理多个会话

```typescript
import { useChatStores } from '../agent/stores'

const { session, chat } = useChatStores()

// 创建新会话
async function createNewChat() {
  const newSession = await session.createSession('新对话')
  await chat.switchSession(newSession.id)
}

// 切换会话
async function switchToSession(sessionId: string) {
  await chat.switchSession(sessionId)
}

// 删除会话
async function deleteChat(sessionId: string) {
  await session.deleteSession(sessionId)
}
```

### 模式 3: 输入框快捷键

```typescript
import { useChatInput } from '../composables/useChat'

const { inputContent, canSend, handleKeydown } = useChatInput()

// 在模板中使用
// <div contenteditable @keydown="onKeydown"></div>

function onKeydown(e: KeyboardEvent) {
  handleKeydown(e, () => {
    // 发送消息的逻辑
    sendMessage(inputContent.value)
  })
}
```

### 模式 4: 监听状态变化

```typescript
import { watch } from 'vue'
import { useChat } from '../composables/useChat'

const { currentState, isStreaming } = useChat()

// 监听状态变化
watch(currentState, (newState, oldState) => {
  console.log(`状态变化: ${oldState} → ${newState}`)
})

// 监听流式生成完成
watch(isStreaming, (streaming) => {
  if (!streaming) {
    console.log('流式生成完成')
    // 播放提示音或显示通知
  }
})
```

### 模式 5: 历史记录管理

```typescript
import { useChatHistory } from '../composables/useChat'

const { 
  today, yesterday, thisWeek, older,
  current, create, delete: deleteSession, search 
} = useChatHistory()

// 搜索历史
const results = search('关键词')

// 获取今天的会话
console.log('今天:', today.value)
```

### 模式 6: 导出聊天记录

```typescript
import { useChat } from '../composables/useChat'

const { exportChat } = useChat()

function downloadChat() {
  const markdown = exportChat('markdown')
  
  // 创建下载
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'chat.md'
  a.click()
}
```

---

## 常见问题

### Q: 如何判断当前是否可以发送消息？

```typescript
const { canSend } = useChat()

// canSend 会自动根据状态计算
// - IDLE 和 COMPOSING 状态返回 true
// - 其他状态返回 false
```

### Q: 如何中断流式生成？

```typescript
const { interrupt, canInterrupt } = useChat()

// 先检查是否可以中断
if (canInterrupt.value) {
  await interrupt()
}
```

### Q: 如何获取当前会话的所有消息？

```typescript
const { messages } = useChat()

// messages 是计算属性，会自动根据当前会话筛选
```

### Q: 如何实现自动滚动？

```typescript
import { useAutoScroll } from '../composables/useVirtualScroll'

const containerRef = ref<HTMLElement>()
const { scrollToBottom, onScroll } = useAutoScroll(containerRef)

// 在模板中
// <div ref="containerRef" @scroll="onScroll">...</div>
```

### Q: 如何自定义快捷键？

```typescript
import { useChatStores } from '../agent/stores'

const { chat } = useChatStores()

function handleKeydown(e: KeyboardEvent) {
  // Ctrl+Enter 发送
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault()
    chat.sendMessage({ stream: true })
  }
  
  // Escape 清空输入
  if (e.key === 'Escape') {
    chat.updateInput('')
  }
}
```

---

## 完整示例

参见:
- `BasicChatExample.vue` - 基础聊天组件
- `ChatMessage.vue` - 消息组件
- `useChat.ts` - Chat 组合式函数

---

## 迁移提示

从旧架构迁移:

| 旧 API | 新 API |
|--------|--------|
| `chatService.send()` | `chat.sendMessage()` |
| `chatService.isLoading` | `chat.isLoading` |
| `chatService.messages` | `useChat().messages` |
| `sessionStore.getActive()` | `session.currentSession` |

---

## 下一步

- 阅读完整架构文档: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 查看 API 参考: 参见各个 Store 文件中的 TypeScript 类型定义
- 运行测试: `npm test`
