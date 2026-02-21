# 场景一：手动轻量 AI 辅助（聊天）完整体检报告

> **版本**: v1.0  
> **生成时间**: 2026-02-20  
> **涵盖范围**: 从用户点击到 LLM 响应的完整调用链

---

## 一、启动与初始化流程

### 1.1 应用启动

```
VitePress 启动
    │
    ├── 加载 .vitepress/config.ts
    │   └── configureServer() 注册 BFF API 路由
    │       ├── /api/files/read
    │       ├── /api/files/save
    │       ├── /api/proxy/fetch
    │       └── ...
    │
    └── 挂载 Vue 应用
        └── AIChatOrb.vue 组件初始化
```

### 1.2 AIChatOrb 组件挂载

| 文件 | 函数 | 输入 | 输出 | 说明 |
|-----|------|------|------|------|
| `AIChatOrb.vue` | `onMounted()` | - | - | 组件挂载生命周期 |
| `AIChatOrb.vue` | `initAgentRuntime()` | - | `Promise<void>` | 初始化 AgentRuntime（场景二用，场景一不依赖） |

**变量赋值**:
```typescript
// AIChatOrb.vue:366-379
let agentRuntime: AgentRuntime | null = null
let agentRuntimeReady = false

async function initAgentRuntime() {
  try {
    agentRuntime = AgentRuntime.getInstance()
    // 注册技能
    for (const skill of builtinSkills) {
      agentRuntime.registerSkill(skill)
    }
    await agentRuntime.initialize()  // 幂等，只执行一次
    agentRuntimeReady = true
  } catch (e) { ... }
}
```

---

## 二、完整调用链详解

### 阶段 1：用户触发（UI 层）

| 文件 | 函数 | 输入参数 | 返回值 | 变量流转 |
|-----|------|---------|--------|---------|
| `AIChatOrb.vue` | `sendMessage()` | - | `Promise<void>` | `inputMessage.value` → `text` |
| `AIChatOrb.vue` | `shouldUseAgentRuntime(text)` | `text: string` | `boolean` | `INTENT_KEYWORDS` 正则匹配 |

**shouldUseAgentRuntime 详细逻辑**:
```typescript
// AIChatOrb.vue:393-397
function shouldUseAgentRuntime(text: string): boolean {
  if (activeSkill.value) return true  // 已有激活技能
  return INTENT_KEYWORDS.some(pattern => pattern.test(text))
}

// INTENT_KEYWORDS 定义 (AIChatOrb.vue:382-391)
const INTENT_KEYWORDS = [
  /(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i,     // 写文章
  /(?:编辑|修改|调整|优化|重写).{0,10}(?:内容|文章|段落)/i,  // 编辑
  /(?:搜索|查找|调研|研究).{0,5}(?:关于|资料|信息)/i,        // 研究
  /(?:总结|概括|摘要|TL;DR)/i,                              // 总结
  /(?:解释|说明|讲解).{0,5}(?:代码|这段|函数|类)/i,          // 解释代码
  /(?:更新|完善|补充).{0,5}(?:知识图谱|图谱|链接|关系)/i,    // 更新图谱
  /(?:删除|移除|清理).{0,5}(?:文章|文件)/i,                 // 删除
  /(?:列出|查看|显示).{0,5}(?:文章|文件列表)/i,             // 列出
]
```

**分支决策**:
- `shouldUseAgentRuntime(text) === true` → 进入 **场景二**（AgentRuntime 路径）
- `shouldUseAgentRuntime(text) === false` → 进入 **场景一**（轻量 chat-service 路径）

---

### 阶段 2：轻量路径进入（Service 层）

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `chat-service.ts` | `sendMessageStream(content, onChunk, options)` | `content: string`, `onChunk: Function`, `options?: ChatOptions` | `Promise<ChatMessage>` | 场景一主入口 |

**变量初始化**:
```typescript
// chat-service.ts:211-226
async function sendMessageStream(
  content: string,
  onChunk: (chunk: { content: string; reasoning?: string }) => void,
  options: ChatOptions = {}
): Promise<ChatMessage> {
  const llm = ensureLLMManager()  // 获取/创建 LLMManager
  const env = loadEnvConfig()     // 加载环境变量
  
  // 取消之前请求（P0-3 修复）
  abortCurrentRequest()           // 清理旧 AbortController
  currentAbortController = new AbortController()  // 新建控制器
  
  isLoading.value = true
  isStreaming.value = true
  error.value = null
  
  const startTime = Date.now()
  let assistantMessageId = ''
  let fullContent = ''
  let fullReasoning = ''
  // ...
}
```

---

### 阶段 3：LLM 调用（Provider 层）

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `chat-service.ts` | `llm.chatStream(request, onChunk)` | `request: LLMRequest`, `onChunk: Function` | `Promise<{usage, cost}>` | LLMManager 调用 |
| `manager.ts` | `LLMManager.chatStream()` | 同上 | 同上 | 路由到具体 Provider |
| `deepseek.ts` | `DeepSeekProvider.chatStream()` | `request: LLMRequest`, `onChunk: Function` | `Promise<void>` | 具体 Provider 实现 |

**request 对象构建**:
```typescript
// chat-service.ts:280-287
const { usage, cost } = await llm.chatStream(
  {
    messages: chatMessages,           // 对话历史
    stream: true,                     // 启用流式
    signal: currentAbortController.signal,  // P0-3: AbortSignal 传入
    model: options.model || env.DEEPSEEK_MODEL || 'deepseek-chat',
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 4096,
  },
  (chunk) => {  // onChunk 回调
    // 处理每个 chunk
    fullContent += chunk.content
    if (chunk.reasoning) fullReasoning += chunk.reasoning
    
    // 更新 UI
    onChunk({
      content: chunk.content,
      reasoning: chunk.reasoning,
      isReasoning: !!chunk.reasoning
    })
  }
)
```

---

### 阶段 4：网络请求与 SSE 解析（Network 层）

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `deepseek.ts` | `fetch()` | `url, {method, headers, body, signal}` | `Promise<Response>` | HTTP 请求 |
| `stream.ts` | `readSSEStream(response, signal, onLine)` | `response: Response`, `signal: AbortSignal`, `onLine: Function` | `Promise<void>` | SSE 流解析 |

**DeepSeek Provider 调用链**:
```typescript
// deepseek.ts:59-85
async chatStream(request, onChunk): Promise<void> {
  if (request.signal?.aborted) throw new Error('Request aborted')
  
  const response = await fetch(`${this.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    },
    body: JSON.stringify({
      model: request.model || this.config.model,
      messages: request.messages,
      stream: true,
    }),
    signal: request.signal  // AbortSignal 绑定到 fetch
  })
  
  if (!response.ok) throw new Error(`DeepSeek API error`)
  
  // 使用共享 SSE 解析器
  await readSSEStream(response, request.signal, (data) => {
    const chunk = JSON.parse(data)
    const delta = chunk.choices[0]?.delta
    onChunk({
      content: delta?.content || '',
      reasoning: delta?.reasoning_content || '',
      finishReason: chunk.choices[0]?.finish_reason
    })
  })
}
```

**readSSEStream 详细实现**:
```typescript
// llm/utils/stream.ts:15-62
export async function readSSEStream(
  response: Response,
  signal: AbortSignal | undefined,
  onLine: (line: string) => void
): Promise<void> {
  if (signal?.aborted) throw new Error('Request aborted')
  
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  
  const decoder = new TextDecoder()
  let buffer = ''
  
  // 注册 abort 监听器
  const abortHandler = () => reader.cancel('Request aborted').catch(() => {})
  signal?.addEventListener('abort', abortHandler)
  
  try {
    while (true) {
      if (signal?.aborted) throw new Error('Request aborted')
      
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data !== '[DONE]') onLine(data)
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', abortHandler)
    reader.releaseLock()
  }
}
```

---

### 阶段 5：响应组装与返回

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `chat-service.ts` | 匿名回调 | `chunk: LLMStreamChunk` | - | 组装完整内容 |
| `chat-service.ts` | `createAssistantMessage()` | `content, reasoning, usage, cost` | `ChatMessage` | 创建消息对象 |

**消息组装**:
```typescript
// chat-service.ts:320-345
const assistantMessage: ChatMessage = {
  id: assistantMessageId,
  role: 'assistant',
  content: fullContent,
  reasoning: fullReasoning || undefined,
  timestamp: Date.now(),
  metadata: {
    tokens: usage.totalTokens,
    cost: cost,
    duration: Date.now() - startTime,
    model: options.model || env.DEEPSEEK_MODEL || 'deepseek-chat'
  }
}

messages.value.push(assistantMessage)
isStreaming.value = false
currentAbortController = null
```

---

## 三、取消流程详解

### 3.1 取消触发

| 文件 | 函数 | 触发条件 | 说明 |
|-----|------|---------|------|
| `AIChatOrb.vue` | `chatService.abort()` | 用户点击"停止"按钮 | UI 层取消 |
| `chat-service.ts` | `abortCurrentRequest()` | 新请求开始前自动调用 | 自动清理 |
| `AIChatOrb.vue` | `onUnmounted()` | 组件卸载 | 清理残留请求 |

### 3.2 取消信号流转

```
用户点击"停止"
    │
    ▼
chatService.abort()
    │
    ├──► abortCurrentRequest()
    │       │
    │       ├──► currentAbortController?.abort()  ← 触发 AbortSignal
    │       │       │
    │       │       └──► fetch() 收到 abort 信号
    │       │               │
    │       │               └──► 抛出 DOMException: AbortError
    │       │
    │       └──► currentAbortController = null  ← 清理引用
    │
    └──► AgentRuntime.getInstance().abort()  ← 场景二用（场景一无任务）
                │
                └──► activeControllers.get(taskId)?.abort()
```

### 3.3 取消处理代码

```typescript
// chat-service.ts:89-106
function abortCurrentRequest() {
  if (currentAbortController) {
    currentAbortController.abort()  // 触发信号
    currentAbortController = null   // 清理
  }
  
  // 同时取消 AgentRuntime 中的任务（场景二）
  try {
    const agentRuntime = AgentRuntime.getInstance()
    agentRuntime.abort()
  } catch { /* 未初始化时忽略 */ }
}

// chat-service.ts:347-365
} catch (err) {
  isStreaming.value = false
  
  // 判断是否是取消错误
  const isCancelled = err instanceof Error && 
    (err.message === 'Request aborted' || err.name === 'AbortError')
  
  if (isCancelled) {
    // 用户主动取消，不是错误
    const cancelledMessage: ChatMessage = {
      id: assistantMessageId || generateId(),
      role: 'assistant',
      content: '[已取消]',
      timestamp: Date.now()
    }
    messages.value.push(cancelledMessage)
  } else {
    // 真正的错误
    error.value = err instanceof Error ? err.message : 'Unknown error'
    throw err
  }
} finally {
  isLoading.value = false
  isStreaming.value = false
  currentAbortController = null
}
```

---

## 四、错误兜底机制

### 4.1 错误类型与处理

| 错误类型 | 发生位置 | 捕获方式 | 兜底行为 | 用户感知 |
|---------|---------|---------|---------|---------|
| 网络超时 | `fetch()` | `try-catch` | 抛出 `Error: Timeout` | 红色错误提示 |
| API 限流 (429) | 响应状态 | `response.ok` 检查 | 抛出 `Error: Rate limited` | 提示稍后重试 |
| API Key 无效 (401) | 响应状态 | `response.ok` 检查 | 抛出 `Error: Unauthorized` | 提示检查配置 |
| 用户取消 | `AbortSignal` | `catch` 块判断 | 添加 `[已取消]` 消息 | 显示取消状态 |
| JSON 解析失败 | `JSON.parse()` | `try-catch` | 跳过该 chunk | 可能丢失部分内容 |
| SSE 流中断 | `reader.read()` | `catch` 块 | 结束流，返回已收内容 | 显示不完整提示 |

### 4.2 错误处理代码

```typescript
// deepseek.ts:87-95
if (!response.ok) {
  const errorText = await response.text()
  throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`)
}

// chat-service.ts:347-365
try {
  // ... LLM 调用
} catch (err) {
  // 区分取消错误和真正错误
  const isCancelled = err instanceof Error && 
    (err.message === 'Request aborted' || err.name === 'AbortError')
  
  if (!isCancelled) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    // 记录错误日志
    aiLogger.log('error', 'chat.stream.failed', '流式请求失败', {
      error: error.value,
      duration: Date.now() - startTime
    })
    throw err
  }
}
```

---

## 五、日志记录机制

### 5.1 日志记录点

| 位置 | 日志级别 | 事件名 | 内容 | 记录器 |
|-----|---------|--------|------|--------|
| sendMessageStream 开始 | info | `chat.request` | 请求开始，contentLength | aiLogger |
| LLM 响应成功 | success | `chat.response` | 状态码、响应时间 | aiLogger |
| 用户取消 | info | `chat.aborted` | 用户主动取消 | aiLogger |
| 网络错误 | error | `chat.stream.failed` | 错误详情、耗时 | aiLogger |
| API 错误 | error | `chat.api.error` | 状态码、错误信息 | aiLogger |

### 5.2 日志格式

```typescript
// aiLogger 定义 (chat-service.ts:35-43)
const aiLogger = {
  log: (level: 'info' | 'error' | 'debug', event: string, message: string, metadata?: any) => {
    fetch('/api/logs/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        event,
        message,
        actor: level === 'error' ? 'system' : 'ai',
        ...metadata
      })
    }).catch(() => {})  // 日志失败不阻断主流程
  }
}
```

---

## 六、涉及文件与组件清单

### 6.1 前端组件

| 文件路径 | 职责 | 关键函数/变量 |
|---------|------|-------------|
| `.vitepress/theme/components/agent/AIChatOrb.vue` | 聊天界面主组件 | `sendMessage()`, `shouldUseAgentRuntime()`, `INTENT_KEYWORDS` |
| `.vitepress/theme/components/agent/AIChatWindow.vue` | 聊天窗口子组件（如分离） | 消息渲染、输入处理 |
| `.vitepress/theme/composables/useLogger.ts` | 日志发送封装 | `useLogger()` |

### 6.2 服务层

| 文件路径 | 职责 | 关键函数/变量 |
|---------|------|-------------|
| `.vitepress/agent/chat-service.ts` | 聊天服务主逻辑 | `useChatService()`, `sendMessageStream()`, `abortCurrentRequest()`, `currentAbortController` |

### 6.3 LLM 层

| 文件路径 | 职责 | 关键函数/变量 |
|---------|------|-------------|
| `.vitepress/agent/llm/manager.ts` | LLMManager 路由 | `getLLMManager()`, `chatStream()` |
| `.vitepress/agent/llm/providers/deepseek.ts` | DeepSeek Provider | `chatStream()`, `baseURL`, `apiKey` |
| `.vitepress/agent/llm/providers/openai.ts` | OpenAI Provider | `chatStream()` |
| `.vitepress/agent/llm/utils/stream.ts` | SSE 流解析 | `readSSEStream()` |

### 6.4 服务端 API

| 文件路径 | 职责 | 端点 |
|---------|------|------|
| `.vitepress/config.ts` | BFF API 路由 | `/api/logs/add` |

---

## 七、目前实现的问题

### 7.1 P0/P1 级问题（已修复）

| 问题 | 状态 | 修复版本 | 说明 |
|-----|------|---------|------|
| AbortSignal 未传递 | ✅ 已修复 | v8 | 所有 Provider 已实现 signal 传递 |
| SSE 流解析重复代码 | ✅ 已修复 | v9 | 提取到 `readSSEStream()` |
| UpdateGraph signal 遗漏 | ✅ 已修复 | v16 | 全部技能 signal 完整 |

### 7.2 P2 级问题（待优化）

| 问题 | 影响 | 建议修复 |
|-----|------|---------|
| 日志发送失败无重试 | 网络抖动时日志丢失 | 添加指数退避重试 |
| 无请求超时设置 | 网络卡顿时无限等待 | fetch 添加 timeout |
| 无流式响应完整性校验 | 可能收到不完整 JSON | 添加校验和重试 |
| 消息历史无持久化 | 刷新页面丢失对话 | localStorage 缓存 |

### 7.3 已知限制

| 限制 | 说明 |
|-----|------|
| 浏览器兼容性 | 依赖 `AbortController`，IE11 不支持 |
| 并发请求 | 同一时间只能有一个活跃请求（自动取消前一个）|
| Token 计算 | 依赖 LLM 返回的 usage，非本地计算 |

---

## 八、调用链时序图

```
用户 ─────────────────────────────────────────────────────────►
  │
  │ 输入消息，点击发送
  ▼
AIChatOrb.sendMessage()
  │
  ├──► shouldUseAgentRuntime(text) ──► false（纯聊天）
  │
  ▼
chatService.sendMessageStream(text, onChunk)
  │
  ├──► abortCurrentRequest() 清理旧请求
  │
  ├──► currentAbortController = new AbortController()
  │
  ├──► ensureLLMManager() 获取 LLMManager
  │
  ▼
llm.chatStream({ messages, signal, ... }, onChunk)
  │
  ├──► LLMManager 路由到 Provider
  │
  ▼
DeepSeekProvider.chatStream(request, onChunk)
  │
  ├──► fetch(url, { ..., signal: request.signal })
  │       │
  │       └──► HTTP POST DeepSeek API
  │
  ▼
readSSEStream(response, signal, onLine)
  │
  ├──► reader.read() 循环
  │       │
  │       ├──► decoder.decode(value)
  │       │
  │       ├──► 解析 SSE data: 行
  │       │
  │       └──► onLine(data) → JSON.parse → onChunk(chunk)
  │
  ▼
chat-service onChunk 回调
  │
  ├──► fullContent += chunk.content
  │
  ├──► onChunk({ content, reasoning }) 回调给 AIChatOrb
  │
  ▼
AIChatOrb 更新 UI
  │
  └──► messages.value[last].content += text
  │
  │ 流结束
  ▼
createAssistantMessage() 组装最终消息
  │
  ▼
messages.value.push(assistantMessage)

───────────────────────────────────────────────────────────────

取消流程（用户点击"停止"）：

用户点击停止
  │
  ▼
chatService.abort()
  │
  ├──► abortCurrentRequest()
  │       │
  │       ├──► currentAbortController.abort() 触发信号
  │       │
  │       └──► currentAbortController = null
  │
  └──► AgentRuntime.abort()（场景二用）
  │
  ▼
fetch() 收到 abort 信号
  │
  └──► 抛出 AbortError
  │
  ▼
readSSEStream catch AbortError
  │
  └──► 清理 reader，释放锁
  │
  ▼
chat-service catch 块
  │
  ├──► 识别为取消错误（非真正错误）
  │
  └──► 添加 '[已取消]' 消息到 UI
```

---

## 九、总结

场景一是 MetaBlog 最简单的交互路径，其核心特点是：

1. **轻量**: 绕过 AgentRuntime，直接调用 LLM
2. **快速**: 无技能分发、无状态机、无文件锁
3. **可控**: AbortController 全链路传递，可随时取消
4. **容错**: 网络错误、API 错误均有兜底处理

整个调用链涉及约 6 个核心文件，15 个关键函数，数据流转清晰，适合作为系统入门的理解路径。
