# 场景三：定时任务自动发布 完整体检报告

> **版本**: v1.0  
> **生成时间**: 2026-02-20  
> **涵盖范围**: TaskScheduler → AutoPublisher → Git 操作的完整调用链

---

## 一、启动与初始化流程

### 1.1 VitePress 启动触发

| 文件 | 函数 | 输入 | 输出 | 说明 |
|-----|------|------|------|------|
| `config.ts` | `configureServer()` | `server: ViteDevServer` | - | Vite 配置钩子 |
| `config.ts` | `scheduler.start()` | - | `void` | 启动定时调度器 |

**启动代码**:
```typescript
// config.ts:393-407
{
  name: "meta-blog-bff",
  configureServer(server) {
    // ...
    
    // 启动后台任务调度器
    try {
      const { getTaskScheduler } = require("./agent/core/TaskScheduler");
      const scheduler = getTaskScheduler();
      scheduler.start();
    } catch (e) {
      system.error("server.tasks", "后台调度器启动失败: " + String(e));
    }
  }
}
```

### 1.2 TaskScheduler 初始化

| 文件 | 函数 | 输入 | 输出 | 说明 |
|-----|------|------|------|------|
| `TaskScheduler.ts` | `constructor()` | - | `TaskScheduler` | 构造函数 |
| `TaskScheduler.ts` | `loadState()` | - | `Promise<void>` | 加载持久化状态 |
| `TaskScheduler.ts` | `loadExecutionLog()` | - | `Promise<void>` | 加载执行日志 |

**初始化流程**:
```typescript
// TaskScheduler.ts:50-86
export class TaskScheduler {
  private logger = getStructuredLogger()
  private taskManager = getBackgroundTaskManager()
  
  // 定时检查器
  private checkTimer: ReturnType<typeof setInterval> | null = null
  
  // Cron 任务
  private cronTasks = new Map<TaskType, cron.ScheduledTask>()
  
  // 任务状态持久化
  private taskStates = new Map<TaskType, ScheduledTaskState>()
  
  // 今日执行记录
  private todayExecutions: ExecutionRecord[] = []
  
  // 今日成本统计
  private todayCost = 0
  
  // 配置
  private config: SchedulerConfig = {
    enabled: true,
    checkIntervalMs: 60000,    // 1分钟
    maxDailyTasks: 50,
    maxDailyCost: 5.0,         // $5/天
    retryAttempts: 3,
    retryDelayMs: 5000
  }
  
  // 存储路径
  private readonly STATE_FILE = join(process.cwd(), '.vitepress/agent/memory/scheduler-state.json')
  private readonly EXECUTION_LOG_FILE = join(process.cwd(), '.vitepress/agent/logs/scheduler-executions.json')
  
  constructor() {
    this.loadState()
    this.loadExecutionLog()
  }
}
```

---

## 二、完整调用链详解

### 阶段 1：调度器启动

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `TaskScheduler.ts` | `start()` | - | `void` | 启动调度器 |

**start 实现**:
```typescript
// TaskScheduler.ts:95-122
start(): void {
  if (this.checkTimer) {
    this.logger.warn('scheduler.already-running', 'TaskScheduler is already running')
    return
  }
  
  if (!this.config.enabled) {
    this.logger.info('scheduler.disabled', 'TaskScheduler is disabled in config')
    return
  }
  
  this.logger.info('scheduler.start', 'Starting TaskScheduler...', {
    maxDailyTasks: this.config.maxDailyTasks,
    maxDailyCost: this.config.maxDailyCost
  })
  
  // 从配置注册所有启用的任务
  this.registerTasksFromConfig()
  
  // 启动定时检查（状态持久化和成本控制检查）
  this.checkTimer = setInterval(() => {
    this.performMaintenance()
  }, this.config.checkIntervalMs)
  
  this.logger.success('scheduler.started', 'TaskScheduler started successfully', {
    registeredTasks: this.cronTasks.size
  })
}
```

---

### 阶段 2：任务注册

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `TaskScheduler.ts` | `registerTasksFromConfig()` | - | `void` | 从配置注册任务 |
| `TaskScheduler.ts` | `registerTask(taskType, cronExpression, config?)` | `TaskType`, `string`, `object` | `boolean` | 注册单个任务 |

**任务注册流程**:
```typescript
// TaskScheduler.ts:154-187
private registerTasksFromConfig(): void {
  const taskMapping: Record<string, TaskType> = {
    'arxivDigest': 'arxiv-digest',
    'rssAggregator': 'rss-aggregator',
    'codeDocs': 'code-docs',
    'contentCleanup': 'content-cleanup'
  }
  
  for (const [configKey, taskType] of Object.entries(taskMapping)) {
    const config = agentConfig.tasks[configKey]
    if (!config) continue
    
    // 检查任务是否启用
    if (!config.enabled && !config.schedule?.enabled) {
      this.logger.debug('scheduler.task-skipped', `Task ${taskType} is disabled`)
      continue
    }
    
    // 验证 Cron 表达式
    const cronExpr = config.schedule?.cron
    if (!cronExpr) {
      this.logger.warn('scheduler.no-cron', `Task ${taskType} has no cron expression`)
      continue
    }
    
    if (!cron.validate(cronExpr)) {
      this.logger.error('scheduler.invalid-cron', `Invalid cron expression for ${taskType}: ${cronExpr}`)
      continue
    }
    
    // 注册任务
    this.registerTask(taskType, cronExpr, config)
  }
}

// TaskScheduler.ts:192-241
registerTask(taskType: TaskType, cronExpression: string, config?: Record<string, any>): boolean {
  if (!cron.validate(cronExpression)) {
    this.logger.error('scheduler.invalid-cron', `Invalid cron expression: ${cronExpression}`)
    return false
  }
  
  // 如果已存在，先停止
  if (this.cronTasks.has(taskType)) {
    this.cronTasks.get(taskType)!.stop()
    this.cronTasks.delete(taskType)
  }
  
  // 创建 Cron 任务
  const scheduledTask = cron.schedule(
    cronExpression,
    async () => {
      await this.executeScheduledTask(taskType, config)
    },
    {
      scheduled: true,
      timezone: config?.timezone || 'Asia/Shanghai'
    } as any
  )
  
  this.cronTasks.set(taskType, scheduledTask)
  
  // 更新状态
  const state: ScheduledTaskState = {
    taskType,
    cronExpression,
    lastRun: this.taskStates.get(taskType)?.lastRun || 0,
    nextRun: this.getNextRunTime(cronExpression),
    runCount: this.taskStates.get(taskType)?.runCount || 0,
    failCount: this.taskStates.get(taskType)?.failCount || 0,
    enabled: true
  }
  this.taskStates.set(taskType, state)
  
  this.logger.info('scheduler.task-registered', `Registered scheduled task: ${taskType}`, {
    cron: cronExpression,
    nextRun: new Date(state.nextRun).toISOString()
  })
  
  return true
}
```

---

### 阶段 3：定时任务执行

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `TaskScheduler.ts` | `executeScheduledTask(taskType, config?, isManual?)` | `TaskType`, `object?`, `boolean?` | `Promise<BackgroundTask \| null>` | 执行定时任务 |

**执行流程**:
```typescript
// TaskScheduler.ts:273-377
private async executeScheduledTask(
  taskType: TaskType,
  config?: Record<string, any>,
  isManual = false
): Promise<BackgroundTask | null> {
  const state = this.taskStates.get(taskType)
  
  // 1. 幂等性检查：防止同一分钟内重复执行
  if (!isManual && state && Date.now() - state.lastRun < 60000) {
    this.logger.warn('scheduler.duplicate-prevented', `Prevented duplicate execution of ${taskType}`)
    return null
  }
  
  // 2. 成本控制检查
  if (!this.checkCostLimits()) {
    this.logger.error('scheduler.cost-limit', 'Daily cost limit reached, skipping scheduled task')
    return null
  }
  
  // 3. 任务数量限制检查
  if (this.todayExecutions.length >= this.config.maxDailyTasks) {
    this.logger.error('scheduler.task-limit', 'Daily task limit reached, skipping scheduled task')
    return null
  }
  
  this.logger.info('scheduler.executing', `Executing scheduled task: ${taskType}`, {
    isManual,
    dailyCost: this.todayCost,
    dailyTasks: this.todayExecutions.length
  })
  
  const executionStart = Date.now()
  
  try {
    // 4. 执行任务
    const task = await this.taskManager.triggerTask(
      taskType,
      config || {},
      {
        name: isManual ? `[手动触发] ${taskType}` : `[定时执行] ${taskType}`,
        triggeredBy: isManual ? 'human' : 'system'
      }
    )
    
    // 5. 更新状态
    if (state) {
      state.lastRun = executionStart
      state.nextRun = this.getNextRunTime(state.cronExpression)
      state.runCount++
      this.taskStates.set(taskType, state)
    }
    
    // 6. 记录执行成功
    this.recordExecution({
      taskType,
      timestamp: executionStart,
      success: true,
      cost: 0  // 将在任务完成时更新
    })
    
    // 7. 监听任务完成以更新成本
    const unsubscribe = this.taskManager.on('taskCompleted', (completedTask) => {
      if (completedTask.id === task.id) {
        const cost = completedTask.result?.output?.cost || 0
        this.todayCost += cost
        this.logger.info('scheduler.cost-updated', `Updated daily cost: $${this.todayCost.toFixed(4)}`)
        unsubscribe()
      }
    })
    
    this.saveState()
    return task
    
  } catch (error) {
    // 更新失败计数
    if (state) {
      state.failCount++
      state.lastError = error.message
      this.taskStates.set(taskType, state)
    }
    
    // 记录执行失败
    this.recordExecution({
      taskType,
      timestamp: executionStart,
      success: false,
      error: error.message
    })
    
    this.saveState()
    return null
  }
}
```

---

### 阶段 4：BackgroundTaskManager 任务处理

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `BackgroundTaskManager.ts` | `triggerTask(type, params, options?)` | `TaskType`, `object`, `object?` | `Promise<BackgroundTask>` | 触发任务 |
| `BackgroundTaskManager.ts` | `processQueue()` | - | `Promise<void>` | 处理任务队列 |

**任务管理实现**:
```typescript
// BackgroundTaskManager.ts:184-226
async triggerTask(
  type: TaskType,
  params: Record<string, any> = {},
  options: {
    name?: string
    triggeredBy?: 'human' | 'system'
  } = {}
): Promise<BackgroundTask> {
  const template = this.taskTemplates.get(type)
  if (!template) {
    throw new Error(`Unknown task type: ${type}`)
  }
  
  const task: BackgroundTask = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    name: options.name || template.name,
    status: 'pending',
    progress: 0,
    createdAt: Date.now(),
    triggeredBy: options.triggeredBy || 'system',
    result: null
  }
  
  this.tasks.set(task.id, task)
  this.emit('taskCreated', task)
  
  // 触发队列处理
  this.processQueue()
  
  return task
}

// BackgroundTaskManager.ts:256-283
private async processQueue(): Promise<void> {
  if (this.isProcessingQueue) return
  this.isProcessingQueue = true
  
  try {
    // 并发控制 (maxConcurrent = 2)
    if (this.runningTasks.size >= this.maxConcurrent) return
    
    // 获取待处理任务
    const pending = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => a.createdAt - b.createdAt)
    
    // 执行待处理任务
    for (const task of pending) {
      if (this.runningTasks.size >= this.maxConcurrent) break
      await this.executeTask(task)
    }
  } finally {
    this.isProcessingQueue = false
  }
}
```

---

### 阶段 5：任务执行与 AutoPublisher

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `AutoPublisher.ts` | `publish(contentPath, options?)` | `contentPath: string`, `options?: object` | `Promise<PublishResult>` | 主发布入口 |

**publish 实现**:
```typescript
// AutoPublisher.ts:122-178
async publish(
  contentPath: string,
  options?: {
    title?: string
    forceMode?: PublishConfig['mode']
    evaluation?: EvaluationResult
  }
): Promise<PublishResult> {
  const startTime = Date.now()
  const title = options?.title || contentPath.split('/').pop() || 'Untitled'
  
  this.logger.info('publisher.start', 'Starting publish process', {
    path: contentPath,
    title,
    mode: options?.forceMode || this.config.mode
  })
  
  try {
    // 1. 读取并验证内容
    const content = await this.readContent(contentPath)
    if (!content) {
      return this.createErrorResult(contentPath, 'Failed to read content')
    }
    
    // 2. 内容评估
    let evaluation = options?.evaluation
    if (!evaluation) {
      evaluation = await this.evaluator.evaluate(content, title)
    }
    
    // 3. 决定发布模式
    const mode = options?.forceMode || this.decidePublishMode(evaluation)
    
    // 4. 根据模式执行
    switch (mode) {
      case 'auto':
        return await this.autoPublish(contentPath, title, evaluation)
      case 'draft':
        return await this.saveAsDraft(contentPath, title, evaluation)
      case 'review':
        return await this.createForReview(contentPath, title, evaluation)
      default:
        return this.createErrorResult(contentPath, `Unknown publish mode: ${mode}`)
    }
    
  } catch (error) {
    return this.createErrorResult(contentPath, error.message)
  }
}
```

---

### 阶段 6：内容评估

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `ContentEvaluator.ts` | `evaluate(content, title, context?)` | `content: string`, `title: string`, `context?: any` | `Promise<EvaluationResult>` | 内容评估 |

**评估流程**:
```typescript
// ContentEvaluator.ts:114-198
async evaluate(content: string, title: string, context?: any): Promise<EvaluationResult> {
  // 1. 基础检查
  const basicChecks = this.performBasicChecks(content)
  if (!basicChecks.passed) {
    return { shouldCreate: false, reason: basicChecks.reason, ... }
  }
  
  // 2. 去重检查
  const duplication = await this.checkDuplication(content)
  if (duplication.isDuplicate) {
    return { shouldCreate: false, reason: 'DUPLICATE', duplication, ... }
  }
  
  // 3. 质量评估 (LLM)
  const quality = await this.assessQuality(content, title)
  
  // 4. 相关性评估 (LLM)
  const relevance = await this.assessRelevance(content, title, context)
  
  // 5. 内容分类 (LLM)
  const classification = await this.classifyContent(content, title)
  
  // 6. 综合决策
  const shouldCreate = quality.overall >= 6.0 && relevance.overall >= 6.0
  
  return {
    shouldCreate,
    quality,
    relevance,
    duplication,
    classification,
    targetPath: this.generateTargetPath(classification),
    suggestedTitle: await this.generateTitle(content, title),
    priority: this.calculatePriority(quality, relevance),
    estimatedValue: this.estimateValue(quality, relevance)
  }
}
```

---

### 阶段 7：Auto 模式发布

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `AutoPublisher.ts` | `autoPublish(contentPath, title, evaluation)` | `string`, `string`, `EvaluationResult` | `Promise<PublishResult>` | 自动发布 |
| `AutoPublisher.ts` | `gitCommit(contentPath, title, evaluation)` | `string`, `string`, `EvaluationResult` | `Promise<string>` | Git 提交 |

**autoPublish 实现**:
```typescript
// AutoPublisher.ts:184-256
private async autoPublish(
  contentPath: string,
  title: string,
  evaluation: EvaluationResult
): Promise<PublishResult> {
  const notifications: string[] = []
  
  try {
    // 1. Git 提交
    let commitHash: string | undefined
    if (this.config.git.autoCommit) {
      commitHash = await this.gitCommit(contentPath, title, evaluation)
      notifications.push('git-committed')
    }
    
    // 2. Git 推送
    if (this.config.git.autoPush) {
      await this.gitPush()
      notifications.push('git-pushed')
    }
    
    // 3. 触发构建
    let buildTriggered = false
    if (this.config.build.autoTrigger) {
      buildTriggered = await this.triggerBuild()
      notifications.push('build-triggered')
    }
    
    // 4. 更新索引 (P2: 空实现)
    await this.updateIndex(contentPath, title, evaluation)
    
    // 5. 发送通知
    await this.sendNotifications({
      type: 'published',
      title,
      path: contentPath,
      quality: evaluation.quality.overall
    })
    notifications.push('notification-sent')
    
    // 6. 记录历史
    this.recordHistory({...})
    
    return {
      success: true,
      path: contentPath,
      action: 'published',
      commitHash,
      buildTriggered,
      notificationsSent: notifications
    }
    
  } catch (error) {
    return this.createErrorResult(contentPath, error.message)
  }
}

// AutoPublisher.ts:395-424
gitCommit(contentPath: string, title: string, evaluation: EvaluationResult): Promise<string> {
  // 配置作者
  await this.git.addConfig('user.name', this.config.git.authorName)
  await this.git.addConfig('user.email', this.config.git.authorEmail)
  
  // 添加文件
  await this.git.add(contentPath)
  
  // 构建提交信息
  const commitMessage = `${this.config.git.commitPrefix} ${title}

- Quality: ${evaluation.quality.overall}/10
- Relevance: ${evaluation.relevance.overall}/10
- Category: ${evaluation.classification.primaryCategory}
- Difficulty: ${evaluation.classification.difficulty}

Auto-generated by MetaUniverse Agent`
  
  // 提交
  const result = await this.git.commit(commitMessage, contentPath)
  return result.commit
}
```

---

### 阶段 8：Review 模式与 PR 创建

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `AutoPublisher.ts` | `createForReview(contentPath, title, evaluation)` | `string`, `string`, `EvaluationResult` | `Promise<PublishResult>` | Review 模式 |
| `AutoPublisher.ts` | `createPullRequest(branchName, title, evaluation)` | `string`, `string`, `EvaluationResult` | `Promise<string>` | 创建 PR |

**Review 模式实现**:
```typescript
// AutoPublisher.ts:320-389
private async createForReview(
  contentPath: string,
  title: string,
  evaluation: EvaluationResult
): Promise<PublishResult> {
  try {
    // 1. 创建新分支
    const branchName = `agent/content-${Date.now()}`
    await this.git.checkoutLocalBranch(branchName)
    
    // 2. Git 提交到新分支
    const commitHash = await this.gitCommit(contentPath, title, evaluation)
    
    // 3. 推送到远程
    await this.git.push('origin', branchName)
    
    // 4. 创建 PR
    let prUrl: string | undefined
    if (this.config.createPR) {
      prUrl = await this.createPullRequest(branchName, title, evaluation)
    }
    
    // 5. 切回主分支
    await this.git.checkout('main')
    
    // 6. 发送通知
    await this.sendNotifications({ type: 'review', title, path: contentPath, prUrl })
    
    // 7. 记录历史
    this.recordHistory({...})
    
    return {
      success: true,
      path: contentPath,
      action: 'created-pr',
      commitHash,
      prUrl,
      notificationsSent: ['pr-created', 'notification-sent']
    }
    
  } catch (error) {
    // 尝试切回主分支
    try { await this.git.checkout('main') } catch {}
    return this.createErrorResult(contentPath, error.message)
  }
}

// AutoPublisher.ts:456-494
gitCommit(contentPath: string, title: string, evaluation: EvaluationResult): Promise<string> {
  // 配置作者
  await this.git.addConfig('user.name', this.config.git.authorName)
  await this.git.addConfig('user.email', this.config.git.authorEmail)
  
  // 添加文件
  await this.git.add(contentPath)
  
  // 构建提交信息
  const commitMessage = `${this.config.git.commitPrefix} ${title}

- Quality: ${evaluation.quality.overall}/10
- Relevance: ${evaluation.relevance.overall}/10
- Category: ${evaluation.classification.primaryCategory}
- Difficulty: ${evaluation.classification.difficulty}

Auto-generated by MetaUniverse Agent`
  
  // 提交
  const result = await this.git.commit(commitMessage, contentPath)
  return result.commit
}

// AutoPublisher.ts:431-444
gitCommit(contentPath: string, title: string, evaluation: EvaluationResult): Promise<string> {
  // 配置作者
  await this.git.addConfig('user.name', this.config.git.authorName)
  await this.git.addConfig('user.email', this.config.git.authorEmail)
  
  // 添加文件
  await this.git.add(contentPath)
  
  // 构建提交信息
  const commitMessage = `${this.config.git.commitPrefix} ${title}

- Quality: ${evaluation.quality.overall}/10
- Relevance: ${evaluation.relevance.overall}/10
- Category: ${evaluation.classification.primaryCategory}
- Difficulty: ${evaluation.classification.difficulty}

Auto-generated by MetaUniverse Agent`
  
  // 提交
  const result = await this.git.commit(commitMessage, contentPath)
  return result.commit
}

// AutoPublisher.ts:456-494
private async createPullRequest(
  branchName: string,
  title: string,
  evaluation: EvaluationResult
): Promise<string> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN not configured')
  }
  
  // 解析 owner/repo
  const remotes = await this.git.getRemotes(true)
  const origin = remotes.find(r => r.name === 'origin')
  const match = origin.refs.fetch.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/)
  const [, owner, repo] = match
  
  // P2-BASE: 获取当前分支（可能不是 main）
  const defaultBranch = await this.git.revparse(['--abbrev-ref', 'HEAD'])
  
  // 调用 GitHub API
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: `[Agent] ${title}`,
      head: branchName,
      base: defaultBranch,
      body: `## AI Generated Content

- **Quality Score**: ${evaluation.quality.overall}/10
- **Relevance**: ${evaluation.relevance.overall}/10
- **Category**: ${evaluation.classification.primaryCategory}
- **Difficulty**: ${evaluation.classification.difficulty}

Auto-generated by MetaUniverse Agent. Please review before merging.`
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GitHub API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  return data.html_url
}
```

---

## 四、涉及文件清单

### 4.1 调度层

| 文件路径 | 职责 | 关键函数 |
|---------|------|---------|
| `TaskScheduler.ts` | Cron 调度、成本控制 | `start()`, `registerTask()`, `executeScheduledTask()` |
| `BackgroundTaskManager.ts` | 任务队列、并发控制 | `triggerTask()`, `processQueue()`, `executeTask()` |

### 4.2 发布层

| 文件路径 | 职责 | 关键函数 |
|---------|------|---------|
| `AutoPublisher.ts` | 自动发布决策 | `publish()`, `autoPublish()`, `createForReview()`, `createPullRequest()` |
| `ContentEvaluator.ts` | 内容质量评估 | `evaluate()`, `assessQuality()`, `classifyContent()` |

### 4.3 Git 层

| 文件路径 | 职责 | 关键函数 |
|---------|------|---------|
| `GitOperator.ts` (server) | 服务端 Git 操作 | `commit()`, `push()`, `createBranch()` |
| `simple-git` (npm) | Git 命令封装 | `git.add()`, `git.commit()`, `git.push()` |

---

## 五、错误兜底机制

### 5.1 错误类型与处理

| 错误类型 | 发生位置 | 兜底行为 |
|---------|---------|---------|
| Cron 表达式无效 | `registerTask()` | 记录错误，跳过该任务 |
| 每日成本超限 | `executeScheduledTask()` | 跳过执行，记录日志 |
| 任务执行失败 | `executeTask()` | 重试3次，记录失败 |
| Git 提交失败 | `gitCommit()` | 返回错误结果 |
| GitHub API 失败 | `createPullRequest()` | 抛出异常，切回主分支 |
| 内容评估失败 | `evaluate()` | 返回默认低分结果 |

---

## 六、目前实现的问题

### 6.1 P2 级问题

| 问题 | 位置 | 影响 | 建议 |
|-----|------|------|------|
| `updateIndex()` 空实现 | `AutoPublisher.ts` | 搜索索引不更新 | 接入 Algolia 或实现本地搜索索引 |
| `revparse` 获取当前分支 | `AutoPublisher.ts` | PR base 可能错误 | 改为获取远程默认分支 |
| 无任务执行重试 | `BackgroundTaskManager` | 偶发失败无自动恢复 | 添加指数退避重试 |

### 6.2 已知限制

| 限制 | 说明 |
|-----|------|
| 需要 GITHUB_TOKEN | Review 模式必须配置环境变量 |
| 单节点部署 | TaskScheduler 不支持多实例分布式部署 |
| 无任务优先级 | 所有任务 FIFO，无紧急任务插队机制 |

---

## 七、总结

场景三是 MetaBlog 的后台自动工作流，涉及：

1. **定时调度**: Cron + TaskScheduler 实现精确触发
2. **成本控制**: 多层成本限制防止过度消费
3. **内容评估**: LLM 驱动的质量评分系统
4. **Git 工作流**: Auto/Draft/Review 三种发布模式
5. **异常处理**: 完整的错误捕获和日志记录

整个系统可以在无人值守的情况下自动完成内容生成、评估、发布的完整流程。
