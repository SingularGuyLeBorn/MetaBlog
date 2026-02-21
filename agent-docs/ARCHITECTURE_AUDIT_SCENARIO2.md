# MetaBlog 系统架构解剖报告 - 场景2：AI协作者模式

> **版本**: v1.0  
> **生成时间**: 2026-02-21  
> **解剖范围**: 场景2（AI协作者模式）完整调用链

---

## 【第一阶段】架构映射 - 场景2：AI协作者模式

### 场景定位

用户在 AIChatOrb 对话框中输入自然语言指令（如"写一篇关于React的文章"），AI Agent 解析意图、执行技能、生成文件并保存到指定位置。

### 一、组件清单

| 层级 | 组件名称 | 文件路径 | 职责 |
|-----|---------|---------|------|
| **L5 UI层** | AIChatOrb.vue | `.vitepress/theme/components/agent/AIChatOrb.vue` | 悬浮球入口、聊天界面、输入处理 |
| **L5 UI层** | LiquidCoreAvatar.vue | `.vitepress/theme/components/agent/LiquidCoreAvatar.vue` | AI头像动画 |
| **L4 编排层** | AgentRuntime.ts | `.vitepress/agent/core/AgentRuntime.ts` | 核心运行时、任务调度 |
| **L4 编排层** | IntentRouter.ts | `.vitepress/agent/core/IntentRouter.ts` | 意图解析、技能匹配 |
| **L4 编排层** | StateMachine.ts | `.vitepress/agent/core/StateMachine.ts` | 7状态管理、Watchdog超时保护 |
| **L4 编排层** | FileLockManager.ts | `.vitepress/agent/core/FileLockManager.ts` | 文件锁管理、并发控制 |
| **L4 编排层** | builtin.ts | `.vitepress/agent/skills/builtin.ts` | 7大内置技能实现 |
| **L3 工具层** | files.ts | `.vitepress/agent/api/files.ts` | 文件API封装 |
| **L3 工具层** | chat-service.ts | `.vitepress/agent/chat-service.ts` | 轻量聊天服务 |
| **L2 运行时层** | manager.ts | `.vitepress/agent/llm/manager.ts` | LLM路由管理 |
| **L2 运行时层** | deepseek.ts | `.vitepress/agent/llm/providers/deepseek.ts` | DeepSeek Provider |
| **L1 存储层** | FileStorage.ts | `.vitepress/agent/memory/FileStorage.ts` | 文件化存储 |
| **L1 存储层** | EntityManager.ts | `.vitepress/agent/memory/entities/EntityManager.ts` | 实体管理 |

### 二、API调用链（时序图）

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户      │     │ AIChatOrb   │     │AgentRuntime │     │   Skill     │     │  LLM API    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │                   │
       │ 1. 点击悬浮球      │                   │                   │                   │
       │──────────────────>│                   │                   │                   │
       │                   │                   │                   │                   │
       │ 2. 输入"写文章..." │                   │                   │                   │
       │──────────────────>│                   │                   │                   │
       │                   │ 3. sendMessage()  │                   │                   │
       │                   │──────────────────>│                   │                   │
       │                   │                   │ 4. shouldUseAgentRuntime()
       │                   │                   │ (正则匹配意图)     │                   │
       │                   │                   │──────────────────>│                   │
       │                   │                   │                   │                   │
       │                   │                   │ 5. processInput() │                   │
       │                   │                   │ (进入AgentRuntime)│                   │
       │                   │                   │                   │                   │
       │                   │                   │ 6. intentRouter.parse()
       │                   │                   │──────────────────>│                   │
       │                   │                   │                   │                   │
       │                   │                   │ 7. 检查LRU缓存    │                   │
       │                   │                   │   /正则匹配/LLM兜底│                   │
       │                   │                   │<──────────────────│                   │
       │                   │                   │                   │                   │
       │                   │                   │ 8. intentRouter.findSkill()
       │                   │                   │ (匹配WriteArticleSkill)
       │                   │                   │                   │                   │
       │                   │                   │ 9. executeIntent()
       │                   │                   │ (创建taskId/AbortController)
       │                   │                   │                   │                   │
       │                   │                   │10. skill.handler(skillContext, params)
       │                   │                   │────────────────────────────────────────>│
       │                   │                   │                   │                   │
       │                   │                   │                   │11. callLLM(outlinePrompt)
       │                   │                   │                   │ (生成大纲)        │
       │                   │                   │                   │──────────────────>│
       │                   │                   │                   │                   │
       │                   │                   │                   │12. fetch() POST /api/chat
       │                   │                   │                   │                   │
       │                   │                   │                   │13. readSSEStream()
       │                   │                   │                   │ (流式解析)        │
       │                   │                   │                   │                   │
       │                   │                   │                   │14. callLLM(contentPrompt)
       │                   │                   │                   │ (生成正文)        │
       │                   │                   │                   │──────────────────>│
       │                   │                   │                   │                   │
       │                   │                   │                   │15. saveFile()
       │                   │                   │                   │ POST /api/files/save
       │                   │                   │                   │                   │
       │                   │                   │16. 返回SkillResult │                   │
       │                   │                   │<────────────────────────────────────────│
       │                   │                   │                   │                   │
       │                   │                   │17. 状态机→COMPLETED
       │                   │                   │18. saveTaskHistory()
       │                   │                   │19. emit('taskCompleted')
       │                   │                   │                   │                   │
       │                   │20. 返回ChatMessage │                   │                   │
       │                   │<──────────────────│                   │                   │
       │                   │                   │                   │                   │
       │21. UI渲染结果     │                   │                   │                   │
       │<──────────────────│                   │                   │                   │
```

### 三、数据流转详解

#### Step 1: 用户输入捕获

```typescript
// 文件: AIChatOrb.vue (lines 747-759)
// 函数: shouldUseAgentRuntime(text: string): boolean

// 输入: "写一篇关于React Hooks的文章"
const text: string = inputRef.value?.innerText || ''

// 变量赋值
const INTENT_KEYWORDS: RegExp[] = [
  /(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i,
  /(?:编辑|修改|调整|优化|重写).{0,10}(?:内容|文章|段落)/i,
  // ... 共8条正则
]

// 流转过程
const matched: boolean = INTENT_KEYWORDS.some(pattern => pattern.test(text))
// matched = true → 进入AgentRuntime路径
```

#### Step 2: 意图解析

```typescript
// 文件: IntentRouter.ts (lines 215-327)
// 函数: parse(input: string, context?: any): Promise<ParsedIntent>

// 输入: "写一篇关于React Hooks的文章"
const normalizedInput: string = input.toLowerCase().trim()

// 缓存检查 (P2-IR-1)
const cacheKey: string = `${normalizedInput}:${JSON.stringify(context)}`
const cached: ParsedIntent | undefined = this.intentCache.get(cacheKey)

// 正则匹配
const match = normalizedInput.match(/(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i)
// match[0] = "写文章"

// 参数提取
const topic: string = (() => {
  const topicMatch = input.match(/(?:关于|介绍)(.+?)(?:的|教程|文章|博客|内容|，|,|$)/i)
  return topicMatch ? topicMatch[1].trim() : ''
})()
// topic = "React Hooks"

// 输出
const parsedIntent: ParsedIntent = {
  type: 'WRITE_ARTICLE',
  confidence: 0.85,  // 基于匹配长度计算
  entities: ['React Hooks'],
  parameters: {
    topic: 'React Hooks',
    rawInput: '写一篇关于React Hooks的文章'
  },
  raw: '写一篇关于React Hooks的文章'
}
```

#### Step 3: 技能匹配与执行准备

```typescript
// 文件: AgentRuntime.ts (lines 275-340)
// 函数: executeIntent(intent: ParsedIntent, rawInput: string, messageId: string): Promise<ChatMessage>

// 任务创建
const taskId: string = this.generateId()  // "1771641002184_22kljh7ky"
const task: TaskState = {
  id: taskId,
  state: 'PLANNING',
  currentStep: 0,
  totalSteps: 1,
  context: { intent, rawInput },
  checkpoint: null,
  startedAt: Date.now(),
  updatedAt: Date.now()
}
this.activeTasks.set(taskId, task)

// 技能查找
const skill: Skill | undefined = this.intentRouter.findSkill(intent)
// skill = WriteArticleSkill

// AbortController创建 (P1-AG)
const abortController: AbortController = new AbortController()
this.activeControllers.set(taskId, abortController)

// SkillContext组装
const skillContext: SkillContext = {
  taskId,
  memory: this.memory,           // MemoryManager实例
  logger: this.logger,           // StructuredLogger实例
  costTracker: this.costTracker, // CostTracker实例
  currentFile: this.currentFile, // 当前文件路径
  sessionId: this.sessionId,     // 会话ID
  fileLock: fileLockManager,     // FileLockManager单例
  signal: abortController.signal, // 取消信号
  onProgress: updateProgress     // 进度回调 (P2-AG-2)
}
```

#### Step 4: WriteArticleSkill执行

```typescript
// 文件: builtin.ts (lines 54-188)
// 函数: WriteArticleSkill.handler(ctx: SkillContext, params: any): Promise<SkillResult>

// 参数解构
const { topic, style = '技术博客', length = 'medium', targetPath } = params

// Step 4.1: 检查取消信号 (P1-SIG)
if (ctx.signal?.aborted) {
  return { success: false, error: 'Task cancelled by user', tokensUsed: 0, cost: 0 }
}

// Step 4.2: 构建上下文
ctx.onProgress?.({ step: 1, totalSteps: 6, message: '正在构建上下文...' })
const context: ContextResult[] = await ctx.memory.buildContext(topic)
// context = [{ content: '...', source: 'react-hooks-guide.md', score: 0.95, metadata: {...} }]

// Step 4.3: 生成大纲
ctx.onProgress?.({ step: 2, totalSteps: 6, message: '正在生成文章大纲...' })
const outlinePrompt: LLMMessage[] = [
  { role: 'system', content: '...' },
  { role: 'user', content: `主题为："${topic}"...` }
]
const outline: LLMResult = await callLLM(outlinePrompt, { signal: ctx.signal })
// outline = { content: '## 引言\n## useState...', tokens: 520, cost: 0.002 }

// Step 4.4: 生成正文
ctx.onProgress?.({ step: 3, totalSteps: 6, message: '正在撰写文章内容...' })
const contentPrompt: LLMMessage[] = [...]
const content: LLMResult = await callLLM(contentPrompt, { signal: ctx.signal })
// content = { content: '# React Hooks...', tokens: 2500, cost: 0.008 }

// Step 4.5: 组装并保存文件
ctx.onProgress?.({ step: 5, totalSteps: 6, message: '正在保存文件...' })
const frontmatter: string = `---\ntitle: ${topic}\ndate: ${date}\nwikiLinks:\n${relatedArticles.map(r => `  - ${r}`).join('\n')}\n---`
const fullContent: string = `${frontmatter}\n\n${content.content}`
const filePath: string = targetPath || `sections/posts/${await slugifyAsync(topic)}.md`
// filePath = "sections/posts/react-hooks.md"

await saveFile(filePath, fullContent, ctx.taskId)
// 内部调用: fetch('/api/files/save', { method: 'POST', body: JSON.stringify({ path, content, taskId }) })

// Step 4.6: 提取实体更新知识图谱
ctx.onProgress?.({ step: 6, totalSteps: 6, message: '正在更新知识图谱...' })
await ctx.memory.entities.extractFromContent(fullContent, filePath)

// 返回结果
const result: SkillResult = {
  success: true,
  data: {
    message: `已创建文章「${topic}」，保存至 ${filePath}`,
    path: filePath,
    outline: outline.content,
    wordCount: content.content.length
  },
  tokensUsed: outline.tokens + content.tokens,  // 3020
  cost: outline.cost + content.cost,            // 0.01
  nextSteps: ['添加更多章节', '插入代码示例', '创建相关文章']
}
```

#### Step 5: 网络请求详解

```typescript
// 文件: deepseek.ts (lines 59-85)
// 函数: chatStream(request: LLMRequest, onChunk: Function): Promise<void>

// Request构建
const requestConfig: RequestInit = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${this.config.apiKey}`
  },
  body: JSON.stringify({
    model: request.model || this.config.model,  // "deepseek-chat"
    messages: request.messages,                  // LLMMessage[]
    stream: true
  }),
  signal: request.signal  // AbortSignal绑定
}

// HTTP请求
const response: Response = await fetch(`${this.baseURL}/chat/completions`, requestConfig)

// SSE流解析
await readSSEStream(response, request.signal, (data: string) => {
  const chunk: StreamChunk = JSON.parse(data)
  const delta: DeltaContent = chunk.choices[0]?.delta
  onChunk({
    content: delta?.content || '',
    reasoning: delta?.reasoning_content || '',
    finishReason: chunk.choices[0]?.finish_reason
  })
})
```

#### Step 6: 文件保存API详解

```typescript
// 文件: files.ts (lines 59-86)
// 函数: saveFile(path: string, content: string, taskId?: string, overwrite?: boolean): Promise<{path: string, hash: string}>

// 输入
const path: string = 'sections/posts/react-hooks.md'
const content: string = '---\ntitle: React Hooks\n...'
const taskId: string = '1771641002184_22kljh7ky'

// 请求构建
const response: Response = await fetch('/api/files/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path, content, taskId, overwrite: false })
})

// 状态码处理
if (response.status === 423) throw new Error('File is locked by another task')
if (response.status === 409) throw new Error('File already exists')

// 响应
const data: { success: boolean; data: { path: string; hash: string }; error?: string } = await response.json()
// data = { success: true, data: { path: 'sections/posts/react-hooks.md', hash: 'a1b2c3...' } }
```

### 四、通信机制

| 通信方向 | 机制 | 数据格式 | 说明 |
|---------|------|---------|------|
| UI → AgentRuntime | 直接方法调用 | `Promise<ChatMessage>` | AgentRuntime.getInstance().processInput() |
| AgentRuntime → Skill | 直接方法调用 | `Promise<SkillResult>` | skill.handler(skillContext, params) |
| Skill → LLM API | HTTP + SSE | `fetch()` + `readSSEStream()` | 流式响应，支持取消 |
| Skill → File API | HTTP POST | `fetch('/api/files/save')` | 带文件锁验证 |
| AgentRuntime → UI | EventBus | `emit('taskCompleted', data)` | 解耦通知 |
| 组件间状态 | Vue Refs | `ref<T>()` / `computed<T>()` | 响应式更新 |

---

## 【第二阶段】步进式评估

### Step 1: 用户输入与意图识别

**文件**: `AIChatOrb.vue:747-759` → `IntentRouter.ts:215-327`

#### ✅ Good
- **多层级意图解析**: 正则匹配 → LRU缓存 → LLM兜底，三层防护确保意图识别准确率
- **否定词检测**: `isNegationNearKeyword()` 检测"不要写文章"这类否定意图，避免误触发
- **LRU缓存优化**: 50条缓存，10分钟TTL，减少重复解析开销

#### ⚠️ Bad
- **正则硬编码**: 8条正则表达式硬编码在 `AIChatOrb.vue:736-745` 和 `IntentRouter.ts:74-164`，新增意图需改两处
- **置信度阈值固定**: `confidence < 0.6` 时询问用户，阈值不可配置
- **LLM兜底无超时**: `classifyWithLLM()` 未设置超时，网络卡顿时会阻塞

#### 🔧 Fix
```typescript
// 建议: 意图配置外部化
// config/intents.ts
export const intentConfig = {
  patterns: [...],  // 集中管理
  confidenceThreshold: 0.6,  // 可配置
  llmTimeout: 5000,  // 5秒超时
  cacheSize: 50
}

// IntentRouter.ts 中
const { confidenceThreshold, llmTimeout } = loadIntentConfig()
if (intent.confidence < confidenceThreshold) { ... }

// LLM兜底添加超时
const llmIntent = await Promise.race([
  this.classifyWithLLM(input),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), llmTimeout)
  )
])
```

---

### Step 2: 任务创建与上下文组装

**文件**: `AgentRuntime.ts:275-340`

#### ✅ Good
- **AbortController机制**: 每个任务独立 `AbortController`，支持精准取消单个任务
- **SkillContext依赖注入**: 通过context注入memory/logger/costTracker，便于测试和替换
- **进度回调支持**: `onProgress` 回调让UI可实时展示执行步骤 (P2-AG-2)

#### ⚠️ Bad
- **activeTasks无上限**: `this.activeTasks` 是Map，无并发任务数限制，可能内存泄漏
- **skillContext深度克隆缺失**: 引用传递，skill可能意外修改共享状态
- **currentTask单点**: 虽然支持并发，但 `this.currentTask` 只存最新任务，不利于监控

#### 🔧 Fix
```typescript
// 建议: 并发控制 + 上下文隔离
private readonly MAX_CONCURRENT_TASKS = 5

async executeIntent(...): Promise<ChatMessage> {
  // 并发控制
  if (this.activeTasks.size >= this.MAX_CONCURRENT_TASKS) {
    return this.createAssistantMessage(messageId, '当前任务过多，请稍后再试')
  }
  
  // 上下文深克隆（或使用 immer）
  const skillContext: SkillContext = produce({
    taskId,
    memory: this.memory,
    // ...
  }, draft => {
    // 只读快照
  })
}
```

---

### Step 3: LLM调用与流式处理

**文件**: `builtin.ts:15-48` → `deepseek.ts:59-85` → `stream.ts`

#### ✅ Good
- **统一callLLM封装**: 所有skill通过 `callLLM()` 调用，自动处理stream/non-stream
- **signal全链路传递**: 从UI → AgentRuntime → Skill → callLLM → fetch，取消信号100%覆盖
- **SSE流解析统一**: `readSSEStream()` 提取到独立模块，所有provider复用

#### ⚠️ Bad
- **无重试机制**: LLM调用失败直接抛出，无指数退避重试
- **无Token预算控制**: 大纲+正文可能超出maxTokens，但无前置检查
- **流式回调无防抖**: 高频onChunk可能触发过多UI更新

#### 🔧 Fix
```typescript
// 建议: 添加重试和预算控制
async function callLLM(
  messages: LLMMessage[],
  options?: { 
    stream?: boolean
    signal?: AbortSignal
    maxRetries?: number  // 新增
    tokenBudget?: number // 新增
  }
): Promise<LLMResult> {
  const { maxRetries = 3, tokenBudget = 4096 } = options || {}
  
  // Token预估（简单字符数/4）
  const estimatedTokens = messages.reduce((sum, m) => 
    sum + Math.ceil(m.content.length / 4), 0
  )
  if (estimatedTokens > tokenBudget) {
    throw new Error(`Token budget exceeded: ${estimatedTokens} > ${tokenBudget}`)
  }
  
  // 指数退避重试
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await doCallLLM(messages, options)
    } catch (e) {
      if (attempt === maxRetries - 1) throw e
      await delay(1000 * Math.pow(2, attempt))  // 1s, 2s, 4s
    }
  }
}
```

---

### Step 4: 文件保存与锁机制

**文件**: `builtin.ts:157-167` → `files.ts:59-86` → `FileLockManager.ts`

#### ✅ Good
- **前端文件锁**: `FileLockManager` 在内存级防止并发写入，5分钟自动过期
- **服务端双重验证**: `/api/files/save` 返回423状态码表示锁冲突
- **软删除支持**: `deleteFile` 默认软删除，支持恢复

#### ⚠️ Bad
- **前后端锁不同步**: 前端锁(`FileLockManager`)和服务端锁(未在文档中详述)是两套机制，可能不一致
- **锁粒度粗**: 文件级锁，无法支持块级并发编辑
- **无死锁检测**: 任务A锁文件1等文件2，任务B锁文件2等文件1 → 死锁

#### 🔧 Fix
```typescript
// 建议: 统一分布式锁 + 死锁检测
interface LockRequest {
  filePath: string
  taskId: string
  timeout: number
  timestamp: number
}

// 死锁检测（图算法）
class DeadlockDetector {
  private waitForGraph: Map<string, Set<string>> = new Map() // taskId -> {filePaths}
  
  detectCycle(): string[] | null {
    // DFS检测环
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const dfs = (node: string): string[] | null => {
      visited.add(node)
      recursionStack.add(node)
      
      const neighbors = this.waitForGraph.get(node) || new Set()
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const cycle = dfs(neighbor)
          if (cycle) return [node, ...cycle]
        } else if (recursionStack.has(neighbor)) {
          return [node, neighbor]
        }
      }
      
      recursionStack.delete(node)
      return null
    }
    
    for (const node of this.waitForGraph.keys()) {
      if (!visited.has(node)) {
        const cycle = dfs(node)
        if (cycle) return cycle
      }
    }
    return null
  }
}
```

---

### Step 5: 状态机与Watchdog

**文件**: `StateMachine.ts:48-122`

#### ✅ Good
- **7状态完整**: IDLE → UNDERSTANDING → PLANNING → EXECUTING → (COMPLETED|ERROR|CANCELLED)
- **Watchdog超时保护**: 5分钟无状态变更自动强制ERROR，防止僵尸任务
- **状态转换验证**: `isValidTransition()` 确保非法转换被拦截

#### ⚠️ Bad
- **Watchdog时间固定**: 5分钟硬编码，不同任务可能需要不同超时
- **无状态持久化**: 刷新页面后状态机重置，正在执行的任务失去跟踪
- **PAUSED状态支持有限**: 断点续作有框架但具体恢复逻辑待完善

#### 🔧 Fix
```typescript
// 建议: 动态超时 + 状态持久化
interface StateConfig {
  defaultTimeout: number
  taskSpecificTimeouts: Record<string, number>  // 不同skill不同超时
}

class StateMachine {
  // 状态持久化到localStorage
  private persistState(): void {
    localStorage.setItem('agent-state', JSON.stringify({
      currentState: this.currentState,
      lastStateChangeTime: this.lastStateChangeTime,
      taskId: this.currentTaskId
    }))
  }
  
  // 恢复状态
  restoreState(): void {
    const saved = localStorage.getItem('agent-state')
    if (saved) {
      const { currentState, lastStateChangeTime, taskId } = JSON.parse(saved)
      // 检查是否超时，恢复或清理
    }
  }
}
```

---

### Step 6: 结果返回与UI更新

**文件**: `AgentRuntime.ts:390-429` → `AIChatOrb.vue`

#### ✅ Good
- **统一消息格式**: `ChatMessage` 标准格式，含metadata(tokens/cost)
- **事件驱动更新**: `emit('taskCompleted')` 解耦，支持多监听者
- **成本追踪**: 每次调用自动记录token和cost

#### ⚠️ Bad
- **无结果缓存**: 相同输入重复执行，无缓存机制
- **错误信息暴露**: 直接返回 `error.message` 给用户，可能暴露敏感信息
- **无A/B测试支持**: 无法同时对比多个模型输出

#### 🔧 Fix
```typescript
// 建议: 结果缓存 + 错误脱敏
class ResultCache {
  private cache: Map<string, { result: SkillResult; timestamp: number }> = new Map()
  
  getKey(intent: ParsedIntent, params: any): string {
    return `${intent.type}:${JSON.stringify(params)}`
  }
  
  get(intent: ParsedIntent, params: any): SkillResult | undefined {
    const key = this.getKey(intent, params)
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1小时TTL
      return cached.result
    }
    return undefined
  }
}

// 错误脱敏
function sanitizeError(error: Error): string {
  const sensitivePatterns = [/api[_-]?key/i, /token/i, /password/i]
  let message = error.message
  for (const pattern of sensitivePatterns) {
    message = message.replace(pattern, '[REDACTED]')
  }
  return message
}
```

---

## 【第三阶段】跨场景一致性检查

### 场景交互矩阵

| 交互 | 机制 | 延迟 | 风险 |
|-----|------|------|------|
| 场景2写入 → 场景1读取 | VitePress热重载 | ~1-2秒 | 场景1缓存可能过时 |
| 场景2写入 → 场景3触发 | 文件系统监听 + Webhook | ~500ms | 可能触发循环依赖 |
| 场景1编辑 → 场景2上下文 | MemoryManager.buildContext() | 实时 | 无锁机制，可能读到脏数据 |

### 日志连贯性

```typescript
// 当前: 各场景独立日志格式
// 场景1: [ChatService] Starting stream generation
// 场景2: [AgentRuntime] Processing input... / [StateMachine] State transition
// 场景3: [Cron] Task started / [AutoPublisher] Publishing...

// 问题: 无统一traceId贯穿全链路
// 建议: 统一日志格式
interface LogEntry {
  traceId: string      // 全局追踪ID
  spanId: string       // 当前 span
  parentSpanId?: string // 父 span
  timestamp: number
  level: 'info' | 'error' | 'debug'
  component: string    // AIChatOrb / AgentRuntime / StateMachine
  event: string
  message: string
  metadata: Record<string, any>
}
```

### 资源竞争分析

```
场景1（人工编辑）        场景2（AI写入）           场景3（定时任务）
     │                       │                       │
     │ 编辑文件A             │                       │
     │──────────────────────>│                       │
     │                       │ 也想写入文件A          │
     │                       │──────────────────────>│
     │                       │                       │
     │ 冲突！                │                       │
     │<──────────────────────│                       │
     
问题: 场景1无文件锁概念，场景2/3有锁
建议: 统一文件锁机制，场景1编辑时也获取锁
```

---

## 【第四阶段】优先级修复清单

### P0: 必改（影响稳定性/安全性）

| 编号 | 问题 | 位置 | 修复方案 |
|-----|------|------|---------|
| P0-1 | 前后端锁机制不一致 | `FileLockManager.ts` / `server/routes/files.ts` | 统一使用服务端锁，前端锁仅作为乐观锁 |
| P0-2 | LLM调用无超时 | `deepseek.ts:59` | 添加 `Promise.race` 超时，默认30秒 |
| P0-3 | 错误信息可能暴露敏感内容 | `AgentRuntime.ts:217` | 添加 `sanitizeError()` 脱敏处理 |
| P0-4 | 并发任务无上限 | `AgentRuntime.ts:292` | 添加 `MAX_CONCURRENT_TASKS` 限制 |

### P1: 建议改（影响体验/性能）

| 编号 | 问题 | 位置 | 修复方案 |
|-----|------|------|---------|
| P1-1 | 意图正则硬编码 | `AIChatOrb.vue:736` / `IntentRouter.ts:74` | 配置外部化，支持热更新 |
| P1-2 | 无LLM调用重试 | `builtin.ts:15` | 添加指数退避重试机制 |
| P1-3 | 无Token预算控制 | `builtin.ts:107` | 前置预估，超出时自动拆分请求 |
| P1-4 | 结果无缓存 | `AgentRuntime.ts:348` | 添加 `ResultCache`，相同输入直接返回 |
| P1-5 | Watchdog时间固定 | `StateMachine.ts:23` | 支持按skill配置超时时间 |

### P2: 可选（增强功能）

| 编号 | 问题 | 位置 | 修复方案 |
|-----|------|------|---------|
| P2-1 | 无A/B测试支持 | `AgentRuntime.ts` | 支持同时调用多模型，对比输出 |
| P2-2 | 状态机无持久化 | `StateMachine.ts` | 状态保存到localStorage，页面刷新恢复 |
| P2-3 | 日志无统一traceId | `StructuredLogger.ts` | 接入OpenTelemetry，全链路追踪 |
| P2-4 | 进度反馈粒度粗 | `builtin.ts:76` | 支持百分比进度，而非仅步骤 |

---

## 附录：核心类型定义

```typescript
// SkillContext - 技能执行上下文
interface SkillContext {
  taskId: string                    // 任务唯一ID
  memory: MemoryManager             // 记忆管理器
  logger: Logger                    // 结构化日志
  costTracker: CostTracker          // 成本追踪
  currentFile: string               // 当前编辑文件
  sessionId: string                 // 会话ID
  fileLock: FileLockManager         // 文件锁
  signal?: AbortSignal              // 取消信号
  onProgress?: (p: ProgressInfo) => void  // 进度回调
}

// SkillResult - 技能执行结果
interface SkillResult {
  success: boolean                  // 是否成功
  data?: any                        // 返回数据
  error?: string                    // 错误信息
  tokensUsed: number                // Token消耗
  cost: number                      // 成本($)
  nextSteps?: string[]              // 建议下一步
}

// ParsedIntent - 解析后的意图
interface ParsedIntent {
  type: IntentType                  // 意图类型
  confidence: number                // 置信度(0-1)
  entities: string[]                // 提取的实体
  parameters: Record<string, any>   // 参数
  raw: string                       // 原始输入
}

// TaskState - 任务状态
interface TaskState {
  id: string
  state: AgentState                 // IDLE/UNDERSTANDING/PLANNING/EXECUTING/COMPLETED/ERROR/CANCELLED/PAUSED
  currentStep: number
  totalSteps: number
  context: { intent: ParsedIntent; rawInput: string }
  checkpoint: any | null
  startedAt: number
  updatedAt: number
}
```

---

*报告生成时间: 2026-02-21*  
*基于代码版本: MetaBlog v1.0*
