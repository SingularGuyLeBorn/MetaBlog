# MetaBlog 实现计划书

> 本文档详细描述 L4-L6 的实现方案，确保开发连续性

---

## 📊 当前状态总览

| 层级 | 名称 | 状态 | 关键组件 |
|------|------|------|----------|
| L1 | 静态博客 | ✅ 已完成 | VitePress + Markdown |
| L2 | Chatbot | ✅ 已完成 | AI Chat + 流式响应 |
| L3 | Agent 化 | ✅ 基本完成 | 41 工具 + Skills + 工具测试平台 |
| L4 | 自主 Agent | 📝 待实现 | AgentScheduler |
| L5 | Meta-Agent | 📝 待实现 | AgentFactory |
| L6 | 状态监控 | 📝 待实现 | AgentMonitor |

---

## 🛠️ L3 工具系统完善计划

### 当前工具状态（41个）

| 类别 | 数量 | 工具列表 | 完成度 |
|------|------|----------|--------|
| 文章管理 | 6 | CRUD + 搜索 + 列表 | ✅ 100% |
| GitHub | 6 | 仓库/文件/提交/Issues/搜索 | ✅ 100% |
| 知识库 | 7 | KB CRUD + 文档管理 | ✅ 100%（内存存储） |
| 文件操作 | 3 | read/write/list | ✅ 100% |
| 文本处理 | 4 | 摘要/格式化/翻译 | ⚠️ translate 依赖 AI |
| 代码工具 | 2 | 执行/分析 | ⚠️ execute 仅浏览器 |
| 网络工具 | 3 | fetch/web_search/arxiv | ⚠️ web_search mock |
| 系统工具 | 4 | 时间/天气/计算/回声 | ⚠️ weather mock |
| 平台解析 | 4 | 知乎/小红书/微信/OCR | ⚠️ OCR mock |
| 笔记工具 | 2 | 创建/列出 | ✅ 100% |

### 需要修复的工具（高优先级）

| 工具 | 当前问题 | 修复方案 | 预计工时 |
|------|----------|----------|----------|
| `web_search` | mock 数据 | 接入 SerpAPI/Google CSE | 1天 |
| `get_weather` | mock 数据 | 接入和风/心知天气 API | 0.5天 |
| `ocr_image` | 未实现 | 接入百度/腾讯 OCR API | 1天 |
| `execute_code` | 浏览器执行 | 后端沙箱 (vm2/docker) | 2天 |
| `fetch_url` | 简单 GET | 支持 JS 渲染 (puppeteer) | 1天 |

### 计划新增工具（60+）

#### 高优先级（核心工具）
- [ ] 图片处理：compress_image, resize_image, crop_image
- [ ] PDF 处理：read_pdf, merge_pdf, split_pdf
- [ ] 数据库：query_database, backup_database
- [ ] Git 操作：git_status, git_commit, git_push, git_clone
- [ ] 邮件：send_email, read_email
- [ ] RSS：fetch_rss, subscribe_feed

#### 中优先级（扩展功能）
- [ ] 图表：generate_chart, generate_mermaid
- [ ] 视频：extract_audio, compress_video
- [ ] 日历：create_event, list_events, delete_event
- [ ] 社交：post_twitter, post_weibo
- [ ] AI 增强：generate_image, enhance_text
- [ ] 安全：encrypt_text, decrypt_text, hash_file

---

## 🎯 L4: 自主 Agent 面板

### 需求描述
Agent 能够自主、定时或根据博客状态执行任务，如定时搜集 AI 领域大事件并存储。

### 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                      AgentScheduler                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 定时任务 │  │ 事件监听 │  │ 任务队列 │  │ 通知系统 │    │
│  │  Cron    │  │  Watch   │  │  Queue   │  │ Notify   │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       └─────────────┴─────────────┴─────────────┘           │
│                         │                                    │
│                    ┌────┴────┐                               │
│                    │ Task    │                               │
│                    │ Engine  │                               │
│                    └────┬────┘                               │
│                         │                                    │
│              ┌──────────┼──────────┐                        │
│              ▼          ▼          ▼                        │
│         ┌────────┐ ┌────────┐ ┌────────┐                   │
│         │执行中  │ │已完成  │ │失败   │                   │
│         │running │ │completed│ │failed  │                   │
│         └────────┘ └────────┘ └────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 数据模型

```typescript
// types/agent-scheduler.ts

interface ScheduledTask {
  id: string
  name: string
  description: string
  
  // 触发条件
  trigger: {
    type: 'cron' | 'event' | 'manual' | 'once'
    // Cron 表达式 (如 "0 9 * * 1" 每周一 9点)
    cron?: string
    // 事件监听配置
    event?: {
      type: 'file_change' | 'folder_change' | 'blog_stat'
      path?: string
      condition?: string
    }
    // 一次性任务的时间
    runAt?: number
  }
  
  // 执行配置
  action: {
    type: 'tool_call' | 'agent_run'
    // 工具调用配置
    tool?: {
      name: string
      args: Record<string, any>
    }
    // Agent 运行配置
    agent?: {
      agentId: string
      prompt: string
    }
  }
  
  // 状态
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  lastRun?: number
  nextRun?: number
  runCount: number
  failCount: number
  
  // 元数据
  createdAt: number
  updatedAt: number
  createdBy: string // 'user' | 'agent'
}

interface TaskExecution {
  id: string
  taskId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: number
  endTime?: number
  result?: any
  error?: string
  logs: string[]
}
```

### 实现步骤

#### Phase 1: 基础架构 (1-2 天)

1. **创建核心服务** `core/services/agentScheduler.ts`
   ```typescript
   export class AgentScheduler {
     private tasks: Map<string, ScheduledTask>
     private executions: Map<string, TaskExecution>
     private cronJobs: Map<string, CronJob>
     
     // 任务管理
     createTask(config: TaskConfig): ScheduledTask
     updateTask(id: string, updates: Partial<TaskConfig>): void
     deleteTask(id: string): void
     pauseTask(id: string): void
     resumeTask(id: string): void
     
     // 执行控制
     runTaskNow(id: string): Promise<TaskExecution>
     cancelExecution(executionId: string): void
     
     // 事件监听
     watchFile(path: string, callback: () => void): void
     watchFolder(path: string, callback: () => void): void
   }
   ```

2. **持久化存储**
   - 任务配置: `.data/scheduled-tasks.json`
   - 执行历史: `.data/task-executions/` (按日期分片)

3. **Cron 支持**
   - 使用 `node-cron` 或 `croner` 库
   - 在 VitePress 开发服务器启动时初始化

#### Phase 2: UI 面板 (2-3 天)

1. **创建组件** `modules/agent/scheduler/`
   - `TaskList.vue` - 任务列表
   - `TaskEditor.vue` - 任务编辑器
   - `ExecutionLog.vue` - 执行日志
   - `SchedulerPanel.vue` - 主面板

2. **功能实现**
   - Cron 表达式可视化选择器
   - 事件触发条件配置
   - 执行历史查看
   - 手动触发按钮

#### Phase 3: 集成 (1 天)

1. 添加到 Agent 管理面板
2. 与 Skills 系统集成（创建 `scheduler` skill）
3. 添加工具：
   - `create_scheduled_task`
   - `list_scheduled_tasks`
   - `run_task_now`
   - `delete_scheduled_task`

### 使用示例

```typescript
// 用户创建定时任务
const task = scheduler.createTask({
  name: "每日 AI 资讯收集",
  description: "每天早上 9 点收集 AI 领域大事件",
  trigger: {
    type: "cron",
    cron: "0 9 * * *"
  },
  action: {
    type: "agent_run",
    agent: {
      agentId: "news-collector",
      prompt: "搜索今天的 AI 大事件，整理成文章保存到 news/ 目录"
    }
  }
})

// Agent 自己创建任务（Meta-Agent 能力）
create_scheduled_task({
  name: "每周代码审查",
  trigger: { type: "cron", cron: "0 10 * * 1" },
  action: {
    type: "tool_call",
    tool: {
      name: "analyze_code",
      args: { path: "src/" }
    }
  }
})
```

---

## 🎯 L5: Meta-Agent

### 需求描述
创建一个能创建和配置其他 Agent 的超级 Agent，实现 Agent 的自我管理。

### 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                        Meta-Agent                            │
│                    (Agent 的 Agent)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  用户输入: "创建一个专门写技术博客的 Agent"                    │
│       │                                                      │
│       ▼                                                      │
│  ┌──────────────────────────────────────┐                  │
│  │  1. 理解需求                           │                  │
│  │     - 角色: 技术博客作者               │                  │
│  │     - 能力: 写作 + 技术研究            │                  │
│  │     - 风格: 专业、深入                 │                  │
│  │                                        │                  │
│  │  2. 生成配置                           │                  │
│  │     - name: "TechWriter"               │                  │
│  │     - systemPrompt: "..."              │                  │
│  │     - skills: ["writing", "research"]  │                  │
│  │     - tools: ["create_article", "github_search_code"] │   │
│  │                                        │                  │
│  │  3. 创建 Agent                         │                  │
│  │     - 调用 create_agent()              │                  │
│  │     - 保存到 AgentStorage              │                  │
│  │                                        │                  │
│  │  4. 验证测试                           │                  │
│  │     - 运行示例任务                     │                  │
│  │     - 验证输出质量                     │                  │
│  └──────────────────────────────────────┘                  │
│       │                                                      │
│       ▼                                                      │
│  "TechWriter Agent 已创建完成！\n你可以这样使用它：..."       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 关键能力

1. **Agent 分析**
   - 解析用户需求，提取关键特征
   - 推荐合适的 Skills 和 Tools
   - 生成优化的 System Prompt

2. **配置生成**
   - 基于模板生成 Agent 配置
   - 自动命名和图标选择
   - 权限设置

3. **测试验证**
   - 创建后自动运行测试任务
   - 评估输出质量
   - 提供改进建议

### 实现步骤

#### Phase 1: Agent 工厂 (2-3 天)

1. **创建服务** `core/services/agentFactory.ts`
   ```typescript
   interface AgentTemplate {
     id: string
     name: string
     description: string
     category: string
     baseConfig: Partial<Agent>
     recommendedSkills: string[]
     recommendedTools: string[]
     promptTemplate: string
   }
   
   export class AgentFactory {
     templates: AgentTemplate[]
     
     // 基于描述创建 Agent
     async createFromDescription(
       description: string,
       options?: CreateOptions
     ): Promise<Agent>
     
     // 基于模板创建
     createFromTemplate(
       templateId: string,
       overrides: Partial<Agent>
     ): Promise<Agent>
     
     // 分析并推荐
     analyzeNeeds(description: string): {
       recommendedTemplate: string
       suggestedSkills: string[]
       suggestedTools: string[]
       generatedPrompt: string
     }
   }
   ```

2. **模板系统**
   - 预设模板：技术写手、代码审查员、数据分析师等
   - 模板可导出/导入

#### Phase 2: Meta-Agent Skill (2 天)

1. **创建 Meta-Agent Skill**
   ```typescript
   {
     id: 'meta-agent',
     name: 'Agent 创造者',
     description: '创建和配置其他 AI Agent',
     tools: [
       'create_agent',
       'clone_agent',
       'modify_agent_config',
       'test_agent',
       'delete_agent',
       'export_agent',
       'import_agent'
     ]
   }
   ```

2. **实现工具**
   - `create_agent`: 创建新 Agent
   - `clone_agent`: 克隆现有 Agent
   - `modify_agent_config`: 修改配置
   - `test_agent`: 测试运行
   - `export_agent`: 导出配置为 JSON/YAML
   - `import_agent`: 导入配置

#### Phase 3: UI 增强 (1-2 天)

1. **Agent 创建向导**
   - 自然语言输入框
   - 模板选择器
   - 配置预览
   - 测试运行按钮

2. **Agent 市场**
   - 展示内置 Agent
   - 导入/导出功能
   - Agent 分享（可选）

### 使用示例

```typescript
// 用户对话
用户: "创建一个能帮我审查代码的 Agent"

Meta-Agent: "我来为您创建一个代码审查 Agent..."
[调用工具]
1. analyze_requirements(description)
   → { type: "code_review", language: "any", strictness: "medium" }

2. create_agent({
     name: "CodeReviewer",
     description: "专业的代码审查助手",
     systemPrompt: "你是资深代码审查员...",
     capabilities: {
       mode: "skills-only",
       skillIds: ["programmer"],
       toolIds: ["analyze_code", "github_get_file_content"]
     }
   })

3. test_agent(agentId, sampleCode)
   → 验证通过

Meta-Agent: "✅ CodeReviewer 已创建！
它会帮您：
- 检查代码质量和潜在问题
- 提供改进建议
- 学习开源项目的最佳实践

试试对它说：'帮我审查这个函数'"
```

---

## 🎯 L6: 状态监控

### 需求描述
实时监控 Agent 的运行状态，可视化展示休眠/唤醒/执行中等状态。

### 状态机设计

```
                    ┌─────────────┐
         ┌─────────│   初始化   │─────────┐
         │         │  init      │         │
         │         └──────┬──────┘         │
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │  休眠中  │◄───►│  待命   │◄───►│ 执行中  │
   │  idle    │     │ ready   │     │running  │
   └────┬─────┘     └────┬─────┘     └────┬─────┘
        │                │                │
        │    ┌───────────┘                │
        │    │                            │
        │    ▼                            │
        │ ┌──────────┐                    │
        └►│ 调度中  │◄───────────────────┘
          │scheduled│
          └────┬─────┘
               │
               ▼
          ┌──────────┐
          │  完成   │
          │completed│
          └────┬─────┘
               │
         ┌─────┴─────┐
         ▼           ▼
    ┌────────┐  ┌────────┐
    │ 成功  │  │ 失败  │
    │success │  │ failed │
    └────────┘  └────────┘
```

### 监控指标

```typescript
interface AgentMetrics {
  // 当前状态
  status: AgentStatus
  
  // 执行统计
  executionStats: {
    totalRuns: number
    successCount: number
    failCount: number
    averageDuration: number
    lastRunTime: number
    nextScheduledTime?: number
  }
  
  // 资源使用
  resourceUsage: {
    tokensConsumed: number
    apiCalls: number
    storageUsed: number
  }
  
  // 实时信息
  currentTask?: {
    taskId: string
    startTime: number
    progress: number // 0-100
    description: string
  }
  
  // 健康度
  health: {
    score: number // 0-100
    lastError?: string
    degraded: boolean
  }
}
```

### 实现步骤

#### Phase 1: 状态追踪 (1 天)

1. **创建状态管理** `core/services/agentMonitor.ts`
   ```typescript
   export class AgentMonitor {
     private agentStates: Map<string, AgentState>
     private metrics: Map<string, AgentMetrics>
     
     // 状态更新
     updateStatus(agentId: string, status: AgentStatus, metadata?: any)
     
     // 开始/结束任务
     startTask(agentId: string, task: TaskInfo): string // 返回 executionId
     updateTaskProgress(executionId: string, progress: number)
     endTask(executionId: string, result: TaskResult)
     
     // 查询
     getAgentStatus(agentId: string): AgentStatus
     getAgentMetrics(agentId: string): AgentMetrics
     getAllActiveAgents(): AgentStatus[]
     
     // 事件
     onStatusChange(callback: (agentId: string, oldStatus: AgentStatus, newStatus: AgentStatus) => void)
   }
   ```

2. **集成到现有系统**
   - AI Service 调用前后更新状态
   - 工具执行时更新进度
   - 定时任务触发时更新

#### Phase 2: 可视化组件 (2 天)

1. **创建组件** `modules/agent/monitor/`
   - `AgentStatusBadge.vue` - 状态徽章（休眠/待命/执行中）
   - `AgentMonitorPanel.vue` - 监控面板
   - `ExecutionTimeline.vue` - 执行时间线
   - `MetricsChart.vue` - 指标图表

2. **状态展示**
   ```
   ┌────────────────────────────────────────┐
   │ Agent 状态监控                    [刷新] │
   ├────────────────────────────────────────┤
   │                                        │
   │ 🟢 Meta 助手      待命    [查看详情]  │
   │ 🔵 TechWriter     执行中  [查看进度]  │
   │ ⚪ CodeReviewer   休眠    [唤醒]     │
   │ 🟡 NewsCollector  调度中  14:30执行  │
   │                                        │
   ├────────────────────────────────────────┤
   │ 今日执行统计                           │
   │ ┌────────┬────────┬────────┬────────┐ │
   │ │ 总执行 │ 成功  │ 失败  │ 平均耗时│ │
   │ │   15   │   12  │   3   │  2.3s  │ │
   │ └────────┴────────┴────────┴────────┘ │
   └────────────────────────────────────────┘
   ```

#### Phase 3: 通知系统 (1 天)

1. **通知触发条件**
   - 任务完成/失败
   - 执行时间超过阈值
   - 连续失败次数过多
   - 资源使用异常

2. **通知方式**
   - 浏览器通知（Web Push）
   - UI 内通知中心
   - 邮件通知（可选）

### 集成点

```typescript
// 在 aiService.ts 中集成
export async function chatStream(...) {
  // 更新状态为执行中
  agentMonitor.updateStatus(agentId, 'running')
  
  try {
    // ... 执行 AI 请求
    
    // 更新进度
    agentMonitor.updateTaskProgress(executionId, 50)
    
    // 完成
    agentMonitor.endTask(executionId, { success: true })
    agentMonitor.updateStatus(agentId, 'idle')
  } catch (error) {
    agentMonitor.endTask(executionId, { success: false, error })
    agentMonitor.updateStatus(agentId, 'failed')
  }
}
```

---

## 🐛 Bug 修复记录

### Issue #7: 创建文章后 "Failed to fetch"

**问题原因**：AI 创建文章后，工具结果包含完整文章内容，导致后续请求体过大（>8KB），触发 API 限制。

**解决方案**：
1. 添加 `truncateMessages()` 函数，自动截断过长的工具结果（>6000字符）
2. 在 `chatNonStream()` 和 `chatStreamInternal()` 中调用截断
3. 截断时保留提示信息，告知用户内容已省略

```typescript
function truncateMessages(messages: any[], maxContentLength: number = 6000): any[] {
  return messages.map(m => {
    if (m.role === 'tool' && m.content?.length > maxContentLength) {
      return {
        ...m,
        content: m.content.substring(0, maxContentLength) + 
                 `\n\n... [内容已截断，省略 ${m.content.length - maxContentLength} 字符]`
      }
    }
    return m
  })
}
```

---

## 📅 实施时间线

| 阶段 | 任务 | 预计时间 | 依赖 |
|------|------|----------|------|
| **Week 1** | | | |
| | L4 Phase 1: AgentScheduler 基础架构 | 2 天 | 无 |
| | L4 Phase 2: 任务调度器 UI | 2 天 | Phase 1 |
| | L4 Phase 3: 集成和测试 | 1 天 | Phase 2 |
| **Week 2** | | | |
| | L5 Phase 1: AgentFactory | 3 天 | L4 |
| | L5 Phase 2: Meta-Agent Skill | 2 天 | Phase 1 |
| **Week 3** | | | |
| | L5 Phase 3: UI 增强 | 2 天 | Phase 2 |
| | L6 Phase 1: 状态追踪 | 1 天 | L5 |
| | L6 Phase 2: 可视化组件 | 2 天 | Phase 1 |
| **Week 4** | | | |
| | L6 Phase 3: 通知系统 | 1 天 | Phase 2 |
| | 集成测试和 Bug 修复 | 2 天 | 全部 |
| | 文档完善 | 2 天 | 全部 |

---

## 🔗 相关文件

| 文件 | 说明 |
|------|------|
| `core/services/agentScheduler.ts` | L4 调度器服务（待创建） |
| `core/services/agentFactory.ts` | L5 Agent 工厂（待创建） |
| `core/services/agentMonitor.ts` | L6 监控服务（待创建） |
| `modules/agent/scheduler/` | L4 UI 组件（待创建） |
| `modules/agent/factory/` | L5 UI 组件（待创建） |
| `modules/agent/monitor/` | L6 UI 组件（待创建） |
| `core/tools/definitions.ts` | 工具定义 |
| `core/tools/executors.ts` | 工具执行器 |

---

## 💡 关键决策

1. **调度器库选择**
   - 推荐：`croner`（比 node-cron 更轻量，支持时区）
   - 备选：`node-cron`（更成熟）

2. **状态存储**
   - 任务配置：JSON 文件（简单，可版本控制）
   - 执行历史：分片 JSON（避免单文件过大）

3. **实时更新**
   - 方案 A：WebSocket（实时，但复杂）
   - 方案 B：轮询（简单，推荐）
   - 方案 C：Server-Sent Events（折中）

4. **Meta-Agent 提示词**
   - 需要精心设计的 few-shot 示例
   - 建议先用 GPT-4 级别模型，后续可降级

---

> 本文档为开发蓝图，实际实现时可根据情况调整。
