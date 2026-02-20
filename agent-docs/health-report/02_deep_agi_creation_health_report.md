# 场景二：深度 AGI 创作与修改 完整体检报告

> **版本**: v1.0  
> **生成时间**: 2026-02-20  
> **涵盖范围**: AgentRuntime 完整调用链，从初始化到文件持久化

---

## 一、启动与初始化流程

### 1.1 组件挂载触发

| 文件 | 函数 | 输入 | 输出 | 说明 |
|-----|------|------|------|------|
| `AIChatOrb.vue` | `onMounted()` | - | - | Vue 生命周期 |
| `AIChatOrb.vue` | `initAgentRuntime()` | - | `Promise<void>` | 初始化入口 |

### 1.2 AgentRuntime 初始化详细流程

```
initAgentRuntime()
    │
    ├──► AgentRuntime.getInstance(config)  ← 单例获取
    │       │
    │       ├──► new AgentRuntime(config)  ← 首次创建
    │       │       │
    │       │       ├──► this.sessionId = generateSessionId()
    │       │       ├──► this.intentRouter = new IntentRouter()
    │       │       ├──► this.stateMachine = new StateMachine()
    │       │       ├──► this.memory = getMemoryManager()
    │       │       ├──► this.logger = getStructuredLogger()
    │       │       └──► this.costTracker = new CostTrackerImpl()
    │       │
    │       └──► return existing instance  ← 已存在则返回
    │
    ├──► agentRuntime.registerSkill(skill) × 12  ← 注册所有内置技能
    │       │
    │       └──► this.skills.set(skill.name, skill)
    │               this.intentRouter.registerSkill(skill)
    │
    └──► agentRuntime.initialize()  ← 幂等初始化
            │
            ├──► if (this.initialized) return  ← 已初始化则跳过
            │
            ├──► createLLMManager(llmConfig)  ← LLM 管理器
            │
            ├──► this.memory.initialize?.()  ← 记忆系统初始化
            │
            └──► this.loadCheckpoints()  ← 加载断点续作
                    │
                    └──► checkpointStorage.load()  ← 文件读取
```

**初始化代码详解**:
```typescript
// AIChatOrb.vue:369-387
async function initAgentRuntime() {
  try {
    agentRuntime = AgentRuntime.getInstance()
    
    // P1-SKL-REG: 注册所有内置技能
    for (const skill of builtinSkills) {
      agentRuntime.registerSkill(skill)
    }
    console.log('[AIChatOrb] 已注册', builtinSkills.length, '个内置技能')
    
    await agentRuntime.initialize()  // 幂等初始化
    agentRuntimeReady = true
    console.log('[AIChatOrb] AgentRuntime 初始化完成')
  } catch (e) {
    console.warn('[AIChatOrb] AgentRuntime 初始化失败:', e)
  }
}

// AgentRuntime.ts:61-85 构造函数
private constructor(config: AgentRuntimeConfig) {
  this.config = { maxTokens: 8192, enableCostTracking: true, ...config }
  this.sessionId = this.generateSessionId()
  this.intentRouter = new IntentRouter()
  this.stateMachine = new StateMachine()
  this.memory = getMemoryManager()
  this.logger = getStructuredLogger()
  this.costTracker = new CostTrackerImpl()
  this.setupEventListeners()
}

// AgentRuntime.ts:93-116 initialize()
async initialize(): Promise<void> {
  if (this.initialized) {  // 幂等守卫
    this.logger.debug('Agent Runtime already initialized, skipping')
    return
  }
  
  this.logger.info('Agent Runtime initializing...', { sessionId: this.sessionId })
  
  try {
    const llmConfig = createLLMConfigFromEnv()
    createLLMManager(llmConfig)
  } catch (e) {
    this.logger.warn('LLM Manager initialization failed', { error: String(e) })
  }
  
  await this.memory.initialize?.()
  await this.loadCheckpoints()
  
  this.initialized = true
  this.logger.info('Agent Runtime initialized', { mode: this.config.mode })
  this.emit('initialized', { sessionId: this.sessionId, mode: this.config.mode })
}
```

---

## 二、完整调用链详解

### 阶段 1：意图理解与技能匹配

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `AIChatOrb.vue` | `sendMessage()` | - | - | 用户触发 |
| `AIChatOrb.vue` | `shouldUseAgentRuntime(text)` | `text: string` | `true` | 命中意图关键词 |
| `AgentRuntime.ts` | `processInput(text, context?)` | `text: string`, `context?: {currentFile?, selectedText?}` | `Promise<ChatMessage>` | 主处理入口 |

**processInput 详细流程**:
```typescript
// AgentRuntime.ts:168-210
async processInput(input: string, context?: {
  currentFile?: string
  selectedText?: string
}): Promise<ChatMessage> {
  const messageId = this.generateId()
  
  try {
    this.logger.info('Processing user input', { 
      input: input.substring(0, 100),
      context 
    })
    
    // 1. 意图解析
    this.setState('UNDERSTANDING')
    const intent = await this.intentRouter.parse(input, context)
    
    this.logger.info('Intent parsed', { 
      type: intent.type, 
      confidence: intent.confidence,
      entities: intent.entities 
    })
    
    // 2. 低置信度保护
    if (intent.confidence < 0.6) {
      return this.createAssistantMessage(
        messageId,
        `我不太确定您的意图...请告诉我更具体的指令。`
      )
    }
    
    // 3. 执行任务
    return this.executeIntent(intent, input, messageId)
    
  } catch (error) {
    this.logger.error('processInput failed', { error: error.message })
    this.setState('ERROR')
    return this.createAssistantMessage(
      messageId,
      `处理请求时出现内部错误：${error.message}`
    )
  }
}
```

---

### 阶段 2：意图解析详细流程

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `IntentRouter.ts` | `parse(input, context?)` | `input: string`, `context?: any` | `Promise<ParsedIntent>` | 意图解析 |
| `IntentRouter.ts` | `findSkill(intent)` | `intent: ParsedIntent` | `Skill \| undefined` | 技能匹配 |

**IntentRouter.parse 实现**:
```typescript
// IntentRouter.ts:45-89
async parse(input: string, context?: any): Promise<ParsedIntent> {
  // 1. 简单正则匹配
  for (const [type, pattern] of this.intentPatterns) {
    if (pattern.test(input)) {
      return {
        type,
        confidence: 0.8,
        raw: input,
        parameters: this.extractParameters(type, input),
        context
      }
    }
  }
  
  // 2. 复杂意图：调用 LLM 解析
  const parsePrompt: LLMMessage[] = [
    {
      role: 'system',
      content: `你是一个意图解析助手。将用户输入解析为结构化意图。只返回 JSON 格式：{"type": "...", "confidence": 0.9, "parameters": {...}}`
    },
    { role: 'user', content: input }
  ]
  
  const response = await this.llm.chat({ messages: parsePrompt })
  
  try {
    return JSON.parse(response.content)
  } catch {
    return { type: 'UNKNOWN', confidence: 0, raw: input, parameters: {}, context }
  }
}

// IntentRouter.ts:91-108
findSkill(intent: ParsedIntent): Skill | undefined {
  // 遍历所有注册的技能，匹配 intentPattern
  for (const skill of this.skills.values()) {
    if (skill.intentPattern instanceof RegExp) {
      if (skill.intentPattern.test(intent.raw)) return skill
    } else if (Array.isArray(skill.intentPattern)) {
      if (skill.intentPattern.includes(intent.type)) return skill
    }
  }
  return undefined
}
```

**技能匹配表**:

| 意图类型 | 匹配正则/关键词 | 对应 Skill |
|---------|---------------|-----------|
| WRITE_ARTICLE | `/写\|创作\|生成.{0,5}文章\|博客/i` | WriteArticleSkill |
| EDIT_CONTENT | `/编辑\|修改\|优化.{0,10}内容/i` | EditContentSkill |
| RESEARCH_WEB | `/搜索\|调研\|研究.{0,5}关于/i` | ResearchWebSkill |
| UPDATE_GRAPH | `/更新\|完善.{0,5}知识图谱/i` | UpdateGraphSkill |
| CODE_EXPLAIN | `/解释\|说明.{0,5}代码\|函数/i` | CodeExplainSkill |
| ANSWER_QUESTION | `/什么是\|为什么\|怎么.+?/i` | AnswerQuestionSkill |
| SUMMARIZE | `/总结\|概括\|摘要/i` | SummarizeSkill |



---

### 阶段 3：任务执行前准备

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `AgentRuntime.ts` | `executeIntent(intent, rawInput, messageId)` | `intent: ParsedIntent`, `rawInput: string`, `messageId: string` | `Promise<ChatMessage>` | 执行入口 |

**executeIntent 详细实现**:
```typescript
// AgentRuntime.ts:265-374
private async executeIntent(
  intent: ParsedIntent,
  rawInput: string,
  messageId: string
): Promise<ChatMessage> {
  // 1. 创建任务
  const taskId = this.generateId()
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
  this.currentTask = task
  
  this.setState('PLANNING', task)
  
  // 2. 查找技能
  const skill = this.intentRouter.findSkill(intent)
  if (!skill) {
    this.setState('ERROR', task)
    return this.createAssistantMessage(
      messageId,
      `抱歉，我暂时无法处理这个请求（${intent.type}）...`
    )
  }
  
  // 3. 执行前准备
  this.setState('EXECUTING', task)
  
  // P1-AG: 创建 AbortController
  const abortController = new AbortController()
  this.activeControllers.set(taskId, abortController)
  
  // 组装 SkillContext
  const skillContext: SkillContext = {
    taskId,
    memory: this.memory,
    logger: this.logger,
    costTracker: this.costTracker,
    currentFile: this.currentFile,
    sessionId: this.sessionId,
    fileLock: fileLockManager,
    signal: abortController.signal  // P1-AG: signal 传入
  }
  
  // 4. 执行技能
  try {
    // 检查是否已取消
    if (abortController.signal.aborted) {
      throw new Error('Task cancelled by user')
    }
    
    const result = await skill.handler(skillContext, intent.parameters)
    
    // 清理
    this.activeControllers.delete(taskId)
    
    // 更新任务状态
    task.totalSteps = 1
    task.currentStep = 1
    this.setState('COMPLETED', task)
    
    // 记录成本
    if (this.config.enableCostTracking) {
      this.costTracker.record({
        timestamp: Date.now(),
        model: this.config.model || 'default',
        tokens: result.tokensUsed,
        cost: result.cost,
        taskId,
        skill: skill.name
      })
    }
    
    // 保存历史
    await this.saveTaskHistory(taskId, skill.name, intent, result)
    this.activeTasks.delete(taskId)
    
    // 释放文件锁
    fileLockManager.releaseTaskLocks(taskId)
    
    // 触发完成事件
    this.emit('taskCompleted', { taskId, skill: skill.name, result })
    
    // 如果有文件产出，触发 UI 更新
    if (result.data?.path) {
      eventBus.emit('agent:taskCompleted', {
        path: result.data.path,
        title: result.data.title || this.extractFilename(result.data.path),
        section: this.extractSection(result.data.path),
        timestamp: Date.now(),
        tokensUsed: result.tokensUsed,
        cost: result.cost
      })
    }
    
    return this.createAssistantMessage(
      messageId,
      this.formatResult(result, skill.name),
      { tokens: result.tokensUsed, cost: result.cost }
    )
    
  } catch (error) {
    // 清理控制器
    this.activeControllers.delete(taskId)
    
    // 检查是否是取消错误
    const isCancelled = error instanceof Error && 
      (error.message === 'Task cancelled by user' || error.name === 'AbortError')
    
    if (isCancelled) {
      this.setState('CANCELLED', task)
      this.activeTasks.delete(taskId)
      fileLockManager.releaseTaskLocks(taskId)
      return this.createAssistantMessage(messageId, '任务已取消。')
    }
    
    this.setState('ERROR', task)
    this.activeTasks.delete(taskId)
    fileLockManager.releaseTaskLocks(taskId)
    
    return this.createAssistantMessage(
      messageId,
      `执行过程中出现错误：${error.message}`
    )
  }
}
```

---

### 阶段 4：技能执行（以 WriteArticleSkill 为例）

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `builtin.ts` | `WriteArticleSkill.handler(ctx, params)` | `ctx: SkillContext`, `params: any` | `Promise<SkillResult>` | 写文章技能 |

**WriteArticleSkill 完整流程**:
```typescript
// builtin.ts:45-126
export const WriteArticleSkill: Skill = {
  name: 'WriteArticle',
  description: '撰写新文章或创建内容',
  intentPattern: /(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i,
  requiredParams: ['topic'],
  optionalParams: ['outline', 'style', 'length', 'targetPath'],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { topic, style = '技术博客', length = 'medium', targetPath } = params
    
    ctx.logger.info('Starting article writing', { topic, style, length })
    
    // P1-SIG: 第一道断头台 - 检查取消
    if (ctx.signal?.aborted) {
      return { success: false, error: 'Task cancelled by user', tokensUsed: 0, cost: 0 }
    }
    
    // 1. 构建上下文
    const context = await ctx.memory.buildContext(topic)
    const relatedArticles = context.map(c => c.metadata.title || c.source).slice(0, 3)
    
    // P1-SIG: 第二道断头台
    if (ctx.signal?.aborted) {
      return { success: false, error: 'Task cancelled by user', tokensUsed: 0, cost: 0 }
    }
    
    // 2. 生成大纲
    const outlinePrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的技术博客作者。为给定的主题生成文章大纲。`
      },
      {
        role: 'user',
        content: `主题："${topic}"\n风格：${style}\n长度：${length}\n\n${context.length > 0 ? `相关文章：\n${context.map(c => `- ${c.metadata.title}`).join('\n')}` : ''}\n\n请生成文章大纲：`
      }
    ]
    
    const outline = await callLLM(outlinePrompt, { signal: ctx.signal })  // P1-SIG: 传递 signal
    ctx.logger.info('Outline generated', { tokens: outline.tokens })
    
    // P1-SIG: 第三道断头台
    if (ctx.signal?.aborted) {
      return { success: false, error: 'Task cancelled by user', tokensUsed: outline.tokens, cost: outline.cost }
    }
    
    // 3. 生成内容
    const contentPrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的技术博客作者。根据大纲撰写完整的文章内容。`
      },
      {
        role: 'user',
        content: `主题：${topic}\n大纲：\n${outline.content}\n\n请撰写完整的文章内容：`
      }
    ]
    
    const content = await callLLM(contentPrompt, { signal: ctx.signal })  // P1-SIG: 传递 signal
    ctx.logger.info('Content generated', { tokens: content.tokens })
    
    // P1-SIG: 第四道断头台
    if (ctx.signal?.aborted) {
      return { 
        success: false, 
        error: 'Task cancelled by user', 
        tokensUsed: outline.tokens + content.tokens, 
        cost: outline.cost + content.cost 
      }
    }
    
    // 4. 组装 frontmatter
    const date = new Date().toISOString().split('T')[0]
    const frontmatter = `---\ntitle: ${topic}\ndate: ${date}\nwikiLinks:\n${relatedArticles.map(r => `  - ${r}`).join('\n')}\n---`
    
    // 5. 保存文件
    const fullContent = `${frontmatter}\n\n${content.content}`
    const filePath = targetPath || `posts/${await slugifyAsync(topic)}.md`
    
    try {
      await saveFile(filePath, fullContent, ctx.taskId)  // 传入 taskId 用于文件锁
    } catch (saveError) {
      return {
        success: false,
        error: saveError.message,
        tokensUsed: outline.tokens + content.tokens,
        cost: outline.cost + content.cost
      }
    }
    
    // 6. 提取实体更新知识图谱
    await ctx.memory.entities.extractFromContent(fullContent, filePath)
    
    return {
      success: true,
      data: {
        message: `已创建文章「${topic}」，保存至 ${filePath}`,
        path: filePath,
        outline: outline.content,
        wordCount: content.content.length
      },
      tokensUsed: outline.tokens + content.tokens,
      cost: outline.cost + content.cost,
      nextSteps: ['添加更多章节', '插入代码示例', '创建相关文章']
    }
  }
}
```

---

### 阶段 5：StateMachine 状态管理

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `StateMachine.ts` | `transition(to, data?)` | `to: AgentState`, `data?: any` | `boolean` | 状态转换 |
| `StateMachine.ts` | `manageWatchdog(state)` | `state: AgentState` | - | Watchdog 管理 |

**StateMachine 实现**:
```typescript
// StateMachine.ts:48-94
transition(to: AgentState, data?: any): boolean {
  const from = this.currentState
  
  if (!this.isValidTransition(from, to)) {
    console.warn(`Invalid state transition: ${from} -> ${to}`)
    return false
  }
  
  this.currentState = to
  this.lastStateChangeTime = Date.now()
  
  // 管理 Watchdog
  this.manageWatchdog(to)
  
  this.emit(to, data)
  return true
}

// StateMachine.ts:96-130
private manageWatchdog(state: AgentState): void {
  // 清理现有 Watchdog
  if (this.watchdogTimer) {
    clearTimeout(this.watchdogTimer)
    this.watchdogTimer = null
  }
  
  // 只在"工作中"状态启动 Watchdog
  const watchStates = ['UNDERSTANDING', 'PLANNING', 'EXECUTING']
  if (watchStates.includes(state)) {
    this.watchdogTimer = setTimeout(() => {
      this.forceTimeout()
    }, this.WATCHDOG_TIMEOUT_MS)  // 默认 5 分钟
  }
}

// StateMachine.ts:132-151
private forceTimeout(): void {
  const previousState = this.currentState
  console.error(`[StateMachine] Watchdog 超时！状态 '${previousState}' 超过 ${this.WATCHDOG_TIMEOUT_MS / 1000} 秒`)
  
  this.currentState = 'ERROR'
  this.lastStateChangeTime = Date.now()
  
  this.emit('ERROR', { 
    reason: 'WATCHDOG_TIMEOUT',
    message: `状态 '${previousState}' 执行超时，系统强制终止`,
    timeoutMs: this.WATCHDOG_TIMEOUT_MS,
    timestamp: Date.now(),
    forced: true,
    previousState
  })
}

// 有效状态转换表 (StateMachine.ts:27-46)
private transitions: StateTransition[] = [
  { from: 'IDLE', to: 'UNDERSTANDING' },
  { from: 'UNDERSTANDING', to: 'PLANNING' },
  { from: 'PLANNING', to: 'EXECUTING' },
  { from: 'PLANNING', to: 'WAITING_INPUT' },
  { from: 'EXECUTING', to: 'WAITING_INPUT' },
  { from: 'EXECUTING', to: 'PAUSED' },
  { from: 'EXECUTING', to: 'COMPLETED' },
  { from: 'EXECUTING', to: 'ERROR' },
  // P0-SM: CANCELLED 支持
  { from: ['UNDERSTANDING', 'PLANNING', 'EXECUTING', 'WAITING_INPUT', 'PAUSED'], to: 'CANCELLED' },
  { from: 'CANCELLED', to: 'IDLE' },
  { from: ['UNDERSTANDING', 'PLANNING', 'EXECUTING', 'WAITING_INPUT', 'PAUSED', 'ERROR', 'CANCELLED'], to: 'IDLE' }
]
```

---

### 阶段 6：文件锁机制

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `FileLockManager.ts` | `acquire(filePath, taskId)` | `filePath: string`, `taskId: string` | `{ success: boolean; failed: string[] }` | 获取锁 |
| `FileLockManager.ts` | `releaseTaskLocks(taskId)` | `taskId: string` | `number` | 释放任务所有锁 |
| `files.ts` | `saveFile(path, content, taskId?)` | `path: string`, `content: string`, `taskId?: string` | `Promise<{ path, hash }>` | 带锁的文件保存 |

**FileLockManager 实现**:
```typescript
// FileLockManager.ts:48-112
class FileLockManager {
  private locks = new Map<string, { taskId: string; acquiredAt: number }>()
  private readonly LOCK_TIMEOUT_MS = 5 * 60 * 1000  // 5 分钟超时
  
  acquire(filePath: string, taskId: string): boolean {
    this.cleanupExpiredLocks()
    
    const existing = this.locks.get(filePath)
    if (existing && existing.taskId !== taskId) {
      return false  // 已被其他任务锁定
    }
    
    this.locks.set(filePath, { taskId, acquiredAt: Date.now() })
    return true
  }
  
  releaseTaskLocks(taskId: string): number {
    let count = 0
    for (const [path, lock] of this.locks.entries()) {
      if (lock.taskId === taskId) {
        this.locks.delete(path)
        count++
      }
    }
    return count
  }
  
  private cleanupExpiredLocks(): void {
    const now = Date.now()
    for (const [path, lock] of this.locks.entries()) {
      if (now - lock.acquiredAt > this.LOCK_TIMEOUT_MS) {
        this.locks.delete(path)
      }
    }
  }
}

// 单例导出
export const fileLockManager = new FileLockManager()
```

---

### 阶段 7：取消流程详解

| 文件 | 函数 | 触发条件 | 说明 |
|-----|------|---------|------|
| `AIChatOrb.vue` | `chatService.abort()` | 用户点击停止 | UI 触发 |
| `chat-service.ts` | `abortCurrentRequest()` | 同上 | 代理调用 |
| `AgentRuntime.ts` | `abort(taskId?)` | 同上 | 核心取消 |

**取消信号完整链路**:
```
用户点击"停止"
    │
    ▼
chatService.abort()
    │
    ├──► abortCurrentRequest()
    │       └──► currentAbortController?.abort()  ← 场景一用
    │
    └──► AgentRuntime.getInstance().abort()  ← 场景二用
            │
            ├──► targetTaskId = taskId \| currentTask?.id
            │
            ├──► controller = this.activeControllers.get(targetTaskId)
            │
            └──► controller?.abort()  ← 触发 AbortSignal
                    │
                    └──► AbortSignal 传递到:
                            ├──► skill.handler 内的 ctx.signal
                            ├──► callLLM() 的 signal 参数
                            ├──► fetch() 的 signal 选项
                            └──► readSSEStream() 的 signal 参数
                                    │
                                    └──► reader.cancel() 被调用
```

**AgentRuntime.abort 实现**:
```typescript
// AgentRuntime.ts:670-680
abort(taskId?: string): boolean {
  const targetTaskId = taskId || this.currentTask?.id
  if (!targetTaskId) return false
  
  const controller = this.activeControllers.get(targetTaskId)
  if (controller) {
    controller.abort()
    this.logger.info('Task abort requested', { taskId: targetTaskId })
    return true
  }
  return false
}
```

---

## 四、涉及文件与组件清单

### 4.1 前端组件

| 文件路径 | 职责 | 关键函数/变量 |
|---------|------|-------------|
| `AIChatOrb.vue` | 聊天界面与 AgentRuntime 初始化 | `sendMessage()`, `initAgentRuntime()`, `shouldUseAgentRuntime()` |

### 4.2 AgentRuntime 核心

| 文件路径 | 职责 | 关键函数/变量 |
|---------|------|-------------|
| `AgentRuntime.ts` | 核心运行时 | `processInput()`, `executeIntent()`, `abort()`, `activeControllers`, `skills` |
| `IntentRouter.ts` | 意图路由 | `parse()`, `findSkill()`, `intentPatterns` |
| `StateMachine.ts` | 状态管理 | `transition()`, `manageWatchdog()`, `forceTimeout()`, `transitions` |
| `FileLockManager.ts` | 文件锁 | `acquire()`, `releaseTaskLocks()`, `locks` |

### 4.3 技能层

| 文件路径 | 职责 | 关键函数/变量 |
|---------|------|-------------|
| `builtin.ts` | 内置技能集 | `WriteArticleSkill`, `EditContentSkill`, `callLLM()` |
| `articleSkills.ts` | 文章操作技能 | `CreateArticleSkill`, `DeleteArticleSkill` |

### 4.4 基础设施

| 文件路径 | 职责 | 关键函数/变量 |
|---------|------|-------------|
| `FileStorage.ts` | 文件存储 | `save()`, `load()`, `checkpointStorage` |
| `StructuredLogger.ts` | 结构化日志 | `info()`, `error()`, `debug()` |

---

## 五、错误兜底机制

### 5.1 错误类型与处理

| 错误类型 | 发生位置 | 捕获方式 | 兜底行为 |
|---------|---------|---------|---------|
| 意图解析失败 | `IntentRouter.parse()` | `try-catch` | 返回 UNKNOWN 意图 |
| 技能未找到 | `intentRouter.findSkill()` | 空值检查 | 返回"暂时无法处理" |
| LLM 调用失败 | `callLLM()` | `try-catch` | 返回错误结果 |
| 文件保存失败 | `saveFile()` | `try-catch` | 返回错误信息 |
| 用户取消 | `AbortSignal` | 错误类型判断 | 返回 CANCELLED 状态 |
| Watchdog 超时 | `forceTimeout()` | 定时器 | 强制转为 ERROR |
| 文件锁冲突 | `FileLockManager.acquire()` | 返回值检查 | 返回锁定失败 |

### 5.2 关键兜底代码

```typescript
// AgentRuntime.ts:357-388
catch (error) {
  this.activeControllers.delete(taskId)
  
  const isCancelled = error instanceof Error && 
    (error.message === 'Task cancelled by user' || error.name === 'AbortError')
  
  if (isCancelled) {
    this.setState('CANCELLED', task)
    this.activeTasks.delete(taskId)
    fileLockManager.releaseTaskLocks(taskId)
    return this.createAssistantMessage(messageId, '任务已取消。')
  }
  
  this.setState('ERROR', task)
  this.activeTasks.delete(taskId)
  fileLockManager.releaseTaskLocks(taskId)
  
  this.logger.error('Skill execution failed', { 
    skill: skill.name, 
    error: error.message 
  })
  
  return this.createAssistantMessage(
    messageId,
    `执行过程中出现错误：${error.message}`
  )
}
```

---

## 六、日志记录机制

### 6.1 日志记录点

| 位置 | 级别 | 事件名 | 内容 |
|-----|------|--------|------|
| processInput 开始 | info | `agent.input.received` | 输入内容摘要 |
| 意图解析完成 | info | `agent.intent.parsed` | 意图类型、置信度 |
| 状态转换 | debug | `agent.state.changed` | from -> to |
| 技能执行开始 | info | `agent.skill.started` | skillName, taskId |
| LLM 调用 | debug | `agent.llm.called` | tokens, cost |
| 文件保存 | info | `agent.file.saved` | path, size |
| 任务完成 | success | `agent.task.completed` | duration, cost |
| 任务取消 | info | `agent.task.cancelled` | taskId |
| 错误发生 | error | `agent.error` | error, stack |

---

## 七、目前实现的问题

### 7.1 已修复问题

| 问题 | 状态 | 修复版本 |
|-----|------|---------|
| CANCELLED 状态不在转换表 | ✅ | v14 |
| UpdateGraph signal 未传 | ✅ | v16 |
| initialize() 非幂等 | ✅ | v14 |
| AIChatOrb 不注册技能 | ✅ | v14 |

### 7.2 已修复问题（P2）✅

| 问题 | 状态 | 修复详情 |
|-----|------|---------|
| 意图解析无缓存 | ✅ | 在 `IntentRouter` 中添加 LRU 缓存（50条，10分钟TTL）|
| 技能执行无进度反馈 | ✅ | 在 `SkillContext` 中添加 `onProgress` 回调，已更新 WriteArticle/EditContent/UpdateGraph 技能 |
| Checkpoint 只保存不恢复 | ✅ | 实现完整的断点续作：加载时标记为 PAUSED，提供 `getResumableTasks()` / `resumeTask()` / `abandonTask()` API |

---

## 八、调用链时序图

### 8.1 标准执行流程

```
用户输入「写一篇文章」
    │
    ▼
AIChatOrb.sendMessage()
    │
    ├──► shouldUseAgentRuntime() ──► true（命中 WRITE_ARTICLE）
    │
    ▼
agentRuntime.processInput(text)
    │
    ├──► setState('UNDERSTANDING')
    │
    ├──► intentRouter.parse(text)
    │       │
    │       ├──► 检查 LRU 缓存 ──► 未命中
    │       │
    │       ├──► 正则匹配 WRITE_ARTICLE
    │       │
    │       ├──► 存入缓存
    │       │
    │       └──► return { type: 'WRITE_ARTICLE', confidence: 0.85 }
    │
    ├──► intentRouter.findSkill(intent)
    │       │
    │       └──► return WriteArticleSkill
    │
    ▼
executeIntent(intent, rawInput, messageId)
    │
    ├──► 创建 taskId, TaskState
    │
    ├──► setState('PLANNING')
    │
    ├──► abortController = new AbortController()
    │
    ├──► activeControllers.set(taskId, abortController)
    │
    ├──► 创建 updateProgress 回调
    │
    ├──► skillContext = { 
    │           signal: abortController.signal,
    │           onProgress: updateProgress  ← P2-AG-2 注入
    │       }
    │
    ├──► setState('EXECUTING')
    │
    ▼
WriteArticleSkill.handler(skillContext, params)
    │
    ├──► ctx.onProgress?.({step:1, totalSteps:6, message:'构建上下文...'})
    │
    ├──► 检查 ctx.signal?.aborted
    │
    ├──► memory.buildContext(topic)
    │
    ├──► ctx.onProgress?.({step:2, totalSteps:6, message:'生成大纲...'})
    │
    ├──► callLLM(outlinePrompt, { signal })  ← 生成大纲
    │
    ├──► ctx.onProgress?.({step:3, totalSteps:6, message:'撰写内容...'})
    │
    ├──► callLLM(contentPrompt, { signal })  ← 生成内容
    │
    ├──► ctx.onProgress?.({step:5, totalSteps:6, message:'保存文件...'})
    │
    ├──► saveFile(filePath, content, taskId)
    │
    └──► return SkillResult
    │
    ▼
AgentRuntime 处理结果
    │
    ├──► setState('COMPLETED')
    │
    ├──► costTracker.record({ tokens, cost })
    │
    ├──► saveTaskHistory()
    │
    ├──► saveCheckpoint(task)  ← P2-CHK-3
    │
    ├──► fileLockManager.releaseTaskLocks(taskId)
    │
    ├──► emit('taskCompleted', { taskId, result })
    │
    └──► return ChatMessage
    │
    ▼
UI 更新显示结果
```

### 8.2 断点恢复流程 (P2-CHK-3)

```
VitePress 启动
    │
    ▼
AgentRuntime.initialize()
    │
    ├──► loadCheckpoints()
    │       │
    │       ├──► 读取 agent-checkpoints.json
    │       │
    │       ├──► 过滤 24h 内未完成/未错误任务
    │       │
    │       ├──► 状态设为 PAUSED
    │       │
    │       └──► emit('checkpointsLoaded', { tasks })
    │
    ▼
UI 层 (AIChatOrb.vue)
    │
    ├──► 监听 checkpointsLoaded 事件
    │
    ├──► 显示"可恢复任务"提示
    │
    └──► 用户点击"恢复"
            │
            ▼
    agentRuntime.resumeTask(taskId)
            │
            ├──► 检查任务存在且 PAUSED
            │
            ├──► 状态设为 PLANNING
            │
            └──► 调用 executeIntent(intent, rawInput, messageId)
                    │
                    ▼
            继续标准执行流程...
```

---

## 附录：P2 修复详情

### 修复 P2-IR-1: IntentRouter LRU 缓存

```typescript
// IntentRouter.ts
class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>
  private maxSize: number
  private ttlMs: number

  get(key: K): V | undefined { /* TTL 检查 */ }
  set(key: K, value: V): void { /* LRU 淘汰 */ }
}

// 在 parse() 方法中
const cacheKey = `${normalizedInput}:${JSON.stringify(context)}`
const cached = this.intentCache.get(cacheKey)
if (cached) return cached  // 缓存命中

// 解析完成后存入缓存
this.intentCache.set(cacheKey, result)
```

**配置**: 50 条缓存，10 分钟 TTL

---

### 修复 P2-AG-2: 技能执行进度反馈

**类型定义** (types.ts):
```typescript
export interface ProgressInfo {
  step: number              // 当前步骤
  totalSteps: number        // 总步骤
  message: string           // 进度描述
  detail?: string           // 详细描述
  percent?: number          // 百分比
}

export interface SkillContext {
  // ... 其他字段
  onProgress?: (progress: ProgressInfo) => void  // 新增
}
```

**AgentRuntime 注入**:
```typescript
const updateProgress = (progress: ProgressInfo) => {
  task.currentStep = progress.step
  task.totalSteps = progress.totalSteps
  this.emit('progress', { taskId, ...progress })
}

const skillContext: SkillContext = {
  // ...
  onProgress: updateProgress
}
```

**技能中使用** (WriteArticleSkill):
```typescript
ctx.onProgress?.({ step: 1, totalSteps: 6, message: '正在构建上下文...' })
// ... 构建上下文
ctx.onProgress?.({ step: 2, totalSteps: 6, message: '正在生成文章大纲...' })
// ... 生成大纲
```

---

### 修复 P2-CHK-3: Checkpoint 断点恢复

**加载 Checkpoints**:
```typescript
private async loadCheckpoints(): Promise<void> {
  // ... 加载 validTasks
  for (const task of validTasks) {
    task.state = 'PAUSED'  // 标记为暂停
    this.activeTasks.set(task.id, task)
  }
  
  // 通知 UI
  this.emit('checkpointsLoaded', { tasks: validTasks })
}
```

**公共 API**:
```typescript
// 获取可恢复任务
getResumableTasks(): Array<{ id, state, startedAt, description }>

// 恢复指定任务
async resumeTask(taskId: string): Promise<ChatMessage | null>

// 放弃任务
async abandonTask(taskId: string): Promise<boolean>
```

**使用示例**:
```typescript
// UI 层获取可恢复任务
const resumable = agentRuntime.getResumableTasks()
// 显示列表给用户

// 用户选择恢复
await agentRuntime.resumeTask(taskId)

// 或放弃
await agentRuntime.abandonTask(taskId)
```

---

## 九、总结

场景二是 MetaBlog 最复杂的交互路径，涉及：

1. **AgentRuntime 完整生命周期**: 初始化 → 意图解析 → 技能执行 → 清理
2. **复杂状态管理**: StateMachine + Watchdog + CANCELLED 支持
3. **并发控制**: FileLockManager 防止文件冲突
4. **取消链路**: AbortController 全链路传递
5. **成本追踪**: CostTracker 记录每个任务的 Token 和费用

整个调用链涉及约 12 个核心文件，40+ 个关键函数，是理解 MetaBlog Agent 框架的最佳入口。
