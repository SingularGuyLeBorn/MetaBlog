# Agent Runner 系统设计文档

> 状态：设计完成，待实现  
> 版本：v1.0  
> 日期：2026-04-18

---

## 1. 背景与目标

### 1.1 当前现状

MetaBlog 的 Agent 系统已完成 L3(Agent 化)：
- ChatBot 能识别工具调用意图
- 支持多轮对话中的工具链执行
- 有完整的工具注册表和 Skill 系统

但 Agent 仍处于"被动响应"状态 —— 只有在用户发送消息时才会执行。缺少**自主执行**能力。

### 1.2 目标

让 Agent 能够：
1. **定时自主执行**预设任务(无需用户触发)
2. **接受用户提交的复杂任务**，自动分解并编排多 Agent 协作执行
3. **报告执行结果**给用户

---

## 2. 架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                        Agent Runner 系统                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐      ┌─────────────┐      ┌───────────┐  │
│   │   用户层     │      │   用户层     │      │  系统事件  │  │
│   │ 提交复杂任务 │      │ 配置定时任务 │      │ 文件变更   │  │
│   └──────┬──────┘      └──────┬──────┘      └─────┬─────┘  │
│          │                    │                   │        │
│          ▼                    ▼                   ▼        │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              统一任务队列 (Task Queue)               │  │
│   │  • 用户任务：自然语言描述，待分解                   │  │
│   │  • 固定任务：预设的 cron + agent + prompt           │  │
│   │  • 事件任务：文件变化等触发的一次性任务             │  │
│   └─────────────────────────┬───────────────────────────┘  │
│                             │                              │
│   ┌─────────────────────────┴───────────────────────────┐  │
│   │              系统调度器 (System Scheduler)           │  │
│   │  基于 node-cron，轻量，不走 LLM                     │  │
│   │  职责：到时间了，决定唤醒谁                          │  │
│   └─────────────────────────┬───────────────────────────┘  │
│                             │                              │
│          ┌──────────────────┴──────────────────┐           │
│          │                                     │           │
│          ▼                                     ▼           │
│   ┌──────────────┐                    ┌──────────────┐    │
│   │  固定任务模式 │                    │  编排任务模式 │    │
│   │ mode: direct │                    │mode:orchstrate│    │
│   └──────┬───────┘                    └──────┬───────┘    │
│          │                                   │            │
│          ▼                                   ▼            │
│   ┌──────────────┐                    ┌──────────────┐    │
│   │  执行 Agent   │                    │ 调度器 Agent  │    │
│   │              │                    │              │    │
│   │ • 早报 Agent │                    │ • 查任务队列  │    │
│   │ • 备份 Agent │                    │ • 分解子任务  │    │
│   │ • 检查 Agent │                    │ • 选择执行者  │    │
│   │              │                    │ • 收集结果    │    │
│   └──────────────┘                    └──────┬───────┘    │
│                                              │            │
│                                       ┌──────┴──────┐     │
│                                       │  执行 Agents │     │
│                                       │              │     │
│                                       │ • calendar   │     │
│                                       │ • writer     │     │
│                                       │ • messenger  │     │
│                                       │ • researcher │     │
│                                       └──────────────┘     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              结果报告层 (Reporter)                   │  │
│   │  • 飞书消息通知                                      │  │
│   │  • 博客文章输出(写入 docs/sections/)               │  │
│   │  • 会话消息推送(WebSocket / 轮询)                  │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 两种执行模式详解

### 3.1 模式一：固定任务模式(Direct Mode)

**适用场景**：定时、重复、逻辑固定的简单任务

**典型用例**：
| 任务 | Cron | Agent | 行为 |
|------|------|-------|------|
| 每日早报 | `0 8 * * *` | morning-report-agent | 查日历 + 查任务 → 生成 Markdown 早报 → 写入博客 |
| 每周备份 | `0 0 * * 0` | backup-agent | 导出 docs/sections/ → 压缩 → 上传到存储 |
| RSS 监控 | `*/15 * * * *` | rss-monitor-agent | 拉取 RSS → 有新内容则抓取 → 生成摘要文章 |
| 数据同步 | `0 */6 * * *` | sync-agent | 同步外部数据源 → 更新本地知识库 |

**执行流程**：
```
Cron 触发
    ↓
系统调度器读取 schedule 配置
    ↓
直接调用 agentRunner.execute(agentId, presetContext)
    ↓
Agent 加载自己的 system prompt(内含固定任务逻辑)
    ↓
Agent 调用工具链执行
    ↓
结果写入预设输出位置(博客/飞书/日志)
    ↓
休眠
```

**特点**：
- 不走 LLM 做调度决策，开销低
- Agent 的 system prompt 里预先写死了任务逻辑
- 失败时独立重试，不影响其他 Agent
- 输出位置固定(如：每天早报写到 `docs/sections/posts/daily-report/YYYY-MM-DD.md`)

---

### 3.2 模式二：编排任务模式(Orchestrate Mode)

**适用场景**：用户临时提交的复杂任务，需要多 Agent 协作

**典型用例**：

> **用户留言**："帮我整理这周的工作：查一下日历上的会议、汇总未完成的任务、搜一下这周 AI 领域的重要新闻，然后生成一份周报发到我飞书。"

**执行流程**：
```
用户提交任务 → 存入任务队列(状态: pending)
    ↓
Cron 触发(每 5 分钟)→ 唤醒调度器 Agent
    ↓
调度器 Agent 读取队列中的 pending 任务
    ↓
调度器 LLM 分析任务：
    "这个任务需要：
     1. 查日历(calendar-agent)
     2. 查任务(task-agent)
     3. 搜新闻(researcher-agent + webSearch)
     4. 生成周报(writer-agent)
     5. 发飞书(messenger-agent)"
    ↓
按依赖顺序分发子任务：
    Step 1: calendar-agent, task-agent, researcher-agent(可并行)
    Step 2: writer-agent(依赖 Step 1 的结果)
    Step 3: messenger-agent(依赖 Step 2 的结果)
    ↓
收集所有子任务结果
    ↓
调度器格式化最终报告
    ↓
通知用户(飞书消息 / 博客文章 / 会话推送)
    ↓
标记任务完成(状态: completed)
```

**特点**：
- 调度器 Agent 每次心跳都调 LLM(即使队列空也调，用于检查)
- 能处理动态、自然语言描述的任务
- 自动选择最合适的执行 Agent
- 支持并行执行(无依赖的子任务同时跑)
- 支持错误重试和降级(某个 Agent 失败，换备选方案)

---

### 3.3 两种模式的对比

| 维度 | 固定任务模式 (Direct) | 编排任务模式 (Orchestrate) |
|------|----------------------|---------------------------|
| **触发源** | Cron 预设 | 用户提交 + Cron 心跳检查 |
| **任务来源** | 开发者预先配置 | 用户自然语言提交 |
| **调度决策** | 无(直接执行) | LLM 运行时分析分解 |
| **执行开销** | 低(只调执行 Agent) | 高(调调度器 + 多个执行 Agent) |
| **错误隔离** | 好(单 Agent 失败不影响其他) | 调度器是单点 |
| **任务分解** | 无(预先拆分) | 自动(LLM 动态分解) |
| **结果汇总** | 无(各 Agent 独立输出) | 有(调度器统一格式化) |
| **适用比例** | ~80% 的定时任务 | ~20% 的复杂任务 |

---

## 4. 核心模块设计

### 4.1 数据模型

#### AgentSchedule(定时调度配置)

```typescript
interface AgentSchedule {
  id: string                    // 唯一标识
  name: string                  // 任务名称，如"每日早报"
  cron: string                  // Cron 表达式
  agentId: string               // 关联的 Agent ID
  mode: 'direct' | 'orchestrate' // 执行模式
  enabled: boolean              // 是否启用
  
  // Direct 模式专用
  presetPrompt?: string         // 预设的 system prompt 片段
  outputTarget?: {              // 输出目标
    type: 'blog' | 'feishu' | 'log'
    path?: string               // blog: 文章路径; feishu: chat_id
  }
  
  // Orchestrate 模式专用
  taskQueueFilter?: string      // 只处理匹配此标签的任务
  
  // 通用
  maxRetries: number            // 失败重试次数
  timeout: number               // 单次执行超时(毫秒)
  lastRun?: Date                // 上次执行时间
  nextRun?: Date                // 下次执行时间
  runCount: number              // 累计执行次数
  failCount: number             // 累计失败次数
}
```

#### QueuedTask(用户提交的动态任务)

```typescript
interface QueuedTask {
  id: string
  title: string                 // 任务标题(用户输入或 LLM 生成)
  description: string           // 自然语言描述
  status: 'pending' | 'analyzing' | 'executing' | 'completed' | 'failed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  
  // 调度器分析后填充
  subTasks?: SubTask[]          // 分解后的子任务
  
  // 执行结果
  result?: string               // 最终报告
  outputs?: TaskOutput[]        // 各子任务的输出
  
  // 元数据
  createdBy: 'user' | 'system' | 'agent'
  createdAt: Date
  completedAt?: Date
  notifyTarget?: {              // 完成后通知谁
    type: 'feishu' | 'session' | 'none'
    targetId?: string
  }
}

interface SubTask {
  id: string
  agentId: string               // 执行此子任务的 Agent
  description: string           // 子任务描述
  context?: Record<string, any> // 传递给 Agent 的上下文
  dependsOn?: string[]          // 依赖的其他子任务 ID
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string               // 执行结果
  duration?: number             // 执行耗时(毫秒)
}
```

---

### 4.2 系统调度器(System Scheduler)

基于现有 `SchedulerTool` 扩展，职责极简：**到时间了，唤醒谁**。

```typescript
class AgentRunnerScheduler {
  private schedules: Map<string, AgentSchedule>
  private cronJobs: Map<string, CronJob>
  
  // 注册一个定时调度
  register(schedule: AgentSchedule): void
  
  // 取消注册
  unregister(scheduleId: string): void
  
  // Cron 触发时的回调
  private onTrigger(schedule: AgentSchedule): void {
    if (schedule.mode === 'direct') {
      // 直接模式：调用 AgentRunner 执行
      agentRunner.executeDirect(schedule.agentId, schedule.presetPrompt)
    } else {
      // 编排模式：调用 AgentRunner 唤醒调度器
      agentRunner.executeOrchestrate(schedule.agentId, schedule.taskQueueFilter)
    }
  }
}
```

**关键设计**：调度器本身**不走 LLM**，只做轻量的条件判断和路由。

---

### 4.3 Agent Runner(执行引擎)

```typescript
class AgentRunner {
  // ========== 固定任务模式 ==========
  
  async executeDirect(
    agentId: string,
    presetContext?: string
  ): Promise<ExecutionResult> {
    // 1. 加载 Agent 配置
    const agent = agentStore.getAgent(agentId)
    
    // 2. 构建 system prompt(预设 prompt + 固定任务指令)
    const systemPrompt = this.buildDirectPrompt(agent, presetContext)
    
    // 3. 调用 AI Service 执行(单轮或多轮工具调用)
    const result = await aiService.executeAgent(agent, systemPrompt)
    
    // 4. 处理输出(写入博客 / 发飞书 / 记日志)
    await this.handleOutput(agent.schedule.outputTarget, result)
    
    return result
  }
  
  // ========== 编排任务模式 ==========
  
  async executeOrchestrate(
    orchestratorAgentId: string,
    taskQueueFilter?: string
  ): Promise<void> {
    // 1. 读取待处理任务
    const tasks = taskQueue.getPending(taskQueueFilter)
    if (tasks.length === 0) return // 队列为空，直接返回
    
    // 2. 加载调度器 Agent
    const orchestrator = agentStore.getAgent(orchestratorAgentId)
    
    // 3. 调度器分析每个任务 → 分解为子任务
    for (const task of tasks) {
      task.status = 'analyzing'
      const analysis = await this.analyzeTask(orchestrator, task)
      task.subTasks = analysis.subTasks
      task.status = 'executing'
      
      // 4. 按依赖拓扑排序执行子任务
      await this.executeSubTasks(task.subTasks)
      
      // 5. 收集结果，生成最终报告
      task.result = await this.summarizeResults(orchestrator, task)
      task.status = 'completed'
      
      // 6. 通知用户
      await this.notifyUser(task)
    }
  }
  
  // 分析任务：调用调度器 LLM 分解
  private async analyzeTask(
    orchestrator: Agent,
    task: QueuedTask
  ): Promise<TaskAnalysis> {
    const prompt = this.buildOrchestratorPrompt(orchestrator, task)
    return await aiService.executeWithTools(orchestrator, prompt)
  }
  
  // 执行子任务(支持并行)
  private async executeSubTasks(subTasks: SubTask[]): Promise<void> {
    // 拓扑排序：按依赖层级分批执行
    const batches = this.topologicalSort(subTasks)
    
    for (const batch of batches) {
      // 同一批次的子任务并行执行
      await Promise.all(batch.map(st => this.runSubTask(st)))
    }
  }
  
  private async runSubTask(subTask: SubTask): Promise<void> {
    const agent = agentStore.getAgent(subTask.agentId)
    const result = await aiService.executeAgent(agent, subTask.description, subTask.context)
    subTask.result = result
    subTask.status = 'completed'
  }
}
```

---

## 5. 调度器 Agent 的 Prompt 设计

### 5.1 任务分析阶段 Prompt

```
你是一个任务调度专家。你的职责是分析用户提交的任务，将其分解为可执行的子任务。

## 当前任务
标题: {task.title}
描述: {task.description}
优先级: {task.priority}
提交时间: {task.createdAt}

## 可用执行 Agent
{agentsList}

每个 Agent 的说明：
- calendar-agent: 查询和操作日历、会议
- writer-agent: 撰写文章、生成报告、格式化文本
- messenger-agent: 发送飞书消息、邮件通知
- researcher-agent: 网络搜索、学术论文检索、信息收集
- code-agent: 代码分析、执行脚本、数据处理

## 输出格式
请严格按以下 JSON 格式输出分析结果：

{
  "analysis": "任务分析摘要",
  "subTasks": [
    {
      "agentId": "执行Agent的ID",
      "description": "子任务的详细描述，包含具体的输入和期望输出",
      "context": { "额外上下文数据": "..." },
      "dependsOn": ["依赖的子任务ID，无依赖则为空数组"]
    }
  ],
  "executionOrder": "并行/串行/混合 的说明",
  "estimatedTime": "预计总耗时(分钟)"
}

## 规则
1. 尽量并行化：没有依赖的子任务同时执行
2. 上下文传递：下游子任务需要上游结果的，在 context 中明确标注
3. 精确描述：每个子任务的 description 必须包含具体的输入和期望输出格式
4. 错误处理：为关键子任务指定备选 Agent
```

### 5.2 结果汇总阶段 Prompt

```
你是一个报告生成专家。所有子任务已执行完毕，请你汇总结果，生成一份完整的报告。

## 原始任务
{task.title}: {task.description}

## 子任务执行结果
{subTaskResults}

## 输出要求
1. 用中文撰写
2. 结构清晰：概述 → 详细结果 → 结论/建议
3. 保留关键数据和引用来源
4. 如果某个子任务失败，说明原因和替代方案
5. 根据任务的 notifyTarget 调整格式：
   - 飞书通知：简洁，突出重点，300字以内
   - 博客文章：完整，有结构，包含 frontmatter
   - 会话消息：对话式，分点说明
```

---

## 6. 状态机

### 6.1 固定任务 Agent 状态

```
idle ──[cron触发]──► running ──[成功]──► completed ──[next cron]──► idle
                           │
                           └──[失败]──► failed ──[重试]──► running
                                        │
                                        └──[重试耗尽]──► dead
```

### 6.2 编排任务状态

```
pending ──[调度器认领]──► analyzing ──[分解完成]──► executing
                                                  │
                    ┌─────────────────────────────┘
                    │
                    ▼
            subTask-1 running ──[完成]──► subTask-1 completed
            subTask-2 running ──[完成]──► subTask-2 completed
                    │
                    └──[全部完成]──► summarizing ──[报告生成]──► completed
                                                              │
                    ┌─────────────────────────────────────────┘
                    │
                    └──[任一失败且不可恢复]──► failed
```

---

## 7. 与现有系统的集成

### 7.1 复用现有基础设施

| 现有模块 | 复用方式 |
|---------|---------|
| `SchedulerTool` | 扩展 `mode` 字段，支持 `direct`/`orchestrate` |
| `TaskManager` | 作为任务队列的底层存储和管理 |
| `agentStore` | Agent 配置读取、system prompt 构建 |
| `aiService.chatStream` | Agent 执行的核心调用(工具调用循环) |
| `toolRegistry` | 执行 Agent 的工具权限控制 |
| `chatStore` | 编排任务的会话管理和结果展示 |

### 7.2 新增模块

| 新增模块 | 职责 | 位置 |
|---------|------|------|
| `AgentRunner` | 执行引擎，区分 direct/orchestrate | `server/agent-runner/` |
| `TaskQueue` | 用户任务队列的 CRUD | `server/agent-runner/queue.ts` |
| `OrchestratorPrompt` | 调度器 Agent 的 prompt 模板 | `server/agent-runner/prompts.ts` |
| `AgentRunnerPanel.vue` | 前端管理面板(调度列表、任务队列、执行日志) | `src/theme/components/agent-runner/` |

---

## 8. 实现路径

### Phase 1：固定任务模式(1 周)

1. 扩展 `SchedulerTool`：添加 `mode: 'direct'` 支持
2. 实现 `AgentRunner.executeDirect()`
3. 前端：Agent 配置面板增加"定时任务"选项卡
4. 预设 3 个示例任务：早报、RSS 监控、备份

### Phase 2：任务队列(3 天)

1. 实现 `TaskQueue`(基于文件系统或 SQLite)
2. 前端：用户提交任务的输入框
3. 后端 API：`POST /api/agent/tasks/submit`

### Phase 3：编排任务模式(1 周)

1. 实现 `AgentRunner.executeOrchestrate()`
2. 设计调度器 Agent 的 prompt 模板
3. 实现子任务的拓扑排序和并行执行
4. 结果汇总和通知机制

### Phase 4：飞书通知集成(3 天)

1. 接入 `lark-cli` 发消息
2. 任务完成后自动飞书通知
3. 支持用户配置通知目标

---

## 9. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 调度器 Agent 每次心跳都调 LLM，成本高 | API 费用增加 | 队列为空时跳过 LLM 调用；心跳间隔可配置(默认 5 分钟) |
| 调度器是单点故障 | 所有编排任务停止 | 调度器失败时降级：简单任务直接放入固定任务队列执行 |
| 子任务并行执行导致资源竞争 | 系统负载过高 | 限制并发数(默认最多 3 个 Agent 同时执行) |
| 子任务依赖关系复杂导致死锁 | 任务永远挂起 | 拓扑排序时检测环；设置全局超时(默认 10 分钟) |
| Agent 工具调用失败连锁反应 | 整个编排任务失败 | 单个 subTask 失败可配置：继续/重试/终止 |

---

## 10. 附录：与现有代码的对应关系

| 本设计中的概念 | 现有代码中的对应 |
|--------------|----------------|
| System Scheduler | `server/mcp-tools/scheduler.ts` → 扩展 |
| Task Queue | `server/mcp-tools/task-manager.ts` → 复用/扩展 |
| Agent Store | `src/theme/stores/agentStore.ts` → 复用 |
| AI Service | `src/theme/api/services/aiService.ts` → 复用 |
| Tool Registry | `src/theme/tools/registry.ts` → 复用 |
| Chat Store | `src/theme/stores/chatStore.ts` → 复用 |
| Lark CLI | `lark-cli` 命令行 → 后端 `child_process.spawn` |
