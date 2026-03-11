# Agent Orchestrator 使用指南

## 系统概述

Agent Orchestrator 是一个**三级权限Agent管理系统**，支持：

- 🤖 **三级权限**：System Agent → Manager Agent → Worker Agent
- 🔄 **双模式运行**：被动模式 + 定时模式
- 📊 **实时监控**：可视化控制中心面板
- 🧠 **自主进化**：Manager Agent 自主管理、优化 Worker
- 🚀 **自我迭代**：24/7 自动运行，无需人工干预

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户 (User)                               │
│                    👑 最高权限，可操作所有Agent                    │
├─────────────────────────────────────────────────────────────────┤
│  System Agents          Manager Agents          Worker Agents   │
│  (系统级服务)            (自主管理)              (执行任务)      │
│                                                                  │
│  🔍 系统监控器     →   🎯 主管理Agent  →  🤖 Worker 1           │
│  📝 系统日志管理器      (常驻后台)        🤖 Worker 2           │
│     (只能用户操作)      (自主决策)        🤖 Worker 3           │
│                          ↓ 管理            (受Manager管理)      │
│                      ✍️ 内容管理Agent                           │
│                                                                  │
│  权限规则：                                                       │
│  - System Agent：只能用户操作                                    │
│  - Manager Agent：可管理 Worker，不能动 System                   │
│  - Worker Agent：只能执行任务，不能管理其他Agent                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 快速开始

### 1. 初始化系统

```typescript
import { initializeDefaultAgents } from '../.vitepress/theme/components/ai-chat/core/orchestrator'

// 初始化默认Agent系统
// 这将创建：
// - 2个 System Agent（系统监控、日志管理）
// - 1个 Manager Agent（主管理Agent，常驻后台）
initializeDefaultAgents()
```

### 2. 打开控制中心面板

```typescript
import ControlPanel from '../.vitepress/theme/components/ai-chat/modules/orchestrator/ControlPanel.vue'

// 在Vue组件中使用
<template>
  <ControlPanel />
</template>
```

---

## Agent 类型详解

### 1. System Agent（系统级）

**特点：**
- 只能由用户创建和操作
- 常驻后台运行
- 提供系统级服务

**预设：**

| Agent | 图标 | 职责 |
|-------|------|------|
| 系统监控器 | 🔍 | 监控系统状态、收集指标、生成报告 |
| 系统日志管理器 | 📝 | 收集归档日志、分析异常 |

**创建方式：**
```typescript
import { agentOrchestrator, systemMonitorAgentPreset } from './orchestrator'

const systemAgent = agentOrchestrator.createSystemAgent({
  ...systemMonitorAgentPreset,
  name: '我的系统监控'
})
```

---

### 2. Manager Agent（管理级）

**特点：**
- 可自主管理 Worker Agents
- 常驻后台，24/7 监控
- 自动扩缩容、故障恢复、性能优化

**核心能力：**

```
自动决策规则：
├─ 高负载扩容：CPU > 80% 时自动创建 Worker
├─ 空闲缩容：Worker 空闲 > 24h 自动暂停
├─ 故障恢复：失败率 > 30% 自动暂停并重建
├─ 性能优化：定期分析并优化 Worker 配置
└─ 积压处理：任务队列 > 5 创建临时 Worker
```

**创建方式：**
```typescript
import { agentOrchestrator, mainManagerAgentPreset } from './orchestrator'
import { managerEngineRegistry } from './manager-agent'

// 创建 Manager
const manager = agentOrchestrator.createManagerAgent({
  ...mainManagerAgentPreset,
  name: '内容管理Agent'
})

// 启动决策引擎
const engine = managerEngineRegistry.createEngine(manager.id)

// 手动触发决策
await engine.forceDecisionCycle()
```

---

### 3. Worker Agent（工作级）

**特点：**
- 执行具体任务
- 受 Manager Agent 管理
- 支持两种模式

#### 模式 A：被动模式（Passive）

等待用户指令，完成后保持沉默。

```typescript
import { createPassiveWorker } from './orchestrator'

// 创建被动Worker
const worker = createPassiveWorker(managerId)

// 用户触发任务
await agentOrchestrator.triggerAgentTask(
  worker.id,
  '写一篇文章',
  { topic: 'AI发展趋势' },
  'user'
)
```

#### 模式 B：定时模式（Scheduled）

按计划自动执行。

```typescript
import { createScheduledCollector } from './orchestrator'

// 创建定时Worker，每天早上9点执行
const collector = createScheduledCollector(managerId)

// 自动按cron表达式触发
// 0 9 * * * = 每天早上9点
```

---

## 使用场景示例

### 场景1：稍后阅读助手

**需求：** 发送链接，自动提取内容并归档

```typescript
import { createReadLaterWorker } from './orchestrator'

// 创建Worker
const readLater = createReadLaterWorker(managerId)

// 用户发送指令
await agentOrchestrator.triggerAgentTask(
  readLater.id,
  '处理链接',
  { url: 'https://zhuanlan.zhihu.com/p/xxx' },
  'user'
)

// Worker自动：
// 1. 解析知乎文章
// 2. 提取内容
// 3. 生成摘要
// 4. 保存到 docs/sections/readflow/
// 5. 返回结果，保持沉默等待下次指令
```

### 场景2：每日自动资讯收集

**需求：** 每天早上9点自动搜索AI资讯，生成文章

```typescript
import { createScheduledCollector } from './orchestrator'

// 创建定时Worker
const dailyCollector = createScheduledCollector(managerId)

// 每天早上9点自动：
// 1. 搜索 "AI最新进展"
// 2. 搜索 "技术趋势"
// 3. 整合内容
// 4. 生成文章保存到 docs/sections/knowledge/auto-generated/
```

### 场景3：研究助手

**需求：** 深度研究主题，生成报告

```typescript
import { createResearchWorker } from './orchestrator'

// 创建研究Worker
const researcher = createResearchWorker(managerId)

// 用户触发研究
await agentOrchestrator.triggerAgentTask(
  researcher.id,
  '研究 Transformer 架构',
  { 
    topic: 'Transformer',
    sources: ['web', 'github', 'arxiv']
  },
  'user'
)

// Worker自动：
// 1. 搜索相关资料
// 2. 收集GitHub代码
// 3. 查找ArXiv论文
// 4. 整理核心观点
// 5. 生成研究报告
```

### 场景4：自主管理系统

**需求：** 系统根据负载自动管理Workers

```typescript
import { initializeDefaultAgents } from './orchestrator'

// 初始化系统
initializeDefaultAgents()

// Manager Agent 自动：
// - 监控所有Worker状态
// - 高负载时自动创建新Worker
// - 空闲时自动暂停Worker
// - 失败时自动恢复
// - 定期生成系统报告
```

---

## 控制中心面板

### 功能概览

控制中心面板提供：

1. **系统状态监控**
   - 实时系统负载
   - 活跃任务数
   - Agent总数

2. **Agent 列表**
   - 按等级筛选（System/Manager/Worker）
   - 实时状态显示
   - 当前任务进度
   - 执行统计

3. **Agent 详情**
   - 基本信息
   - 实时任务详情
   - 工具调用链
   - 实时日志
   - 任务历史
   - 能力评分

4. **系统事件流**
   - 实时事件显示
   - 告警通知

### 使用方式

```vue
<template>
  <div class="app">
    <ControlPanel />
  </div>
</template>

<script setup>
import ControlPanel from './orchestrator/ControlPanel.vue'
</script>
```

---

## API 参考

### AgentOrchestrator

```typescript
// 创建 System Agent
createSystemAgent(params: CreateSystemAgentParams): EnhancedAgent

// 创建 Manager Agent
createManagerAgent(params: CreateManagerAgentParams, createdBy?: string): EnhancedAgent

// 创建 Worker Agent
createWorkerAgent(params: CreateWorkerAgentParams, createdBy?: string): EnhancedAgent

// 删除 Agent
deleteAgent(agentId: string, deletedBy?: string): boolean

// 暂停/恢复 Agent
pauseAgent(agentId: string, pausedBy?: string): boolean
resumeAgent(agentId: string, resumedBy?: string): boolean

// 触发任务
triggerAgentTask(
  agentId: string,
  taskName: string,
  input: any,
  triggeredBy?: 'user' | 'schedule' | 'manager' | 'system'
): Promise<TaskRecord | null>

// 获取数据
getAllAgents(): EnhancedAgent[]
getAgent(agentId: string): EnhancedAgent | undefined
getSystemState(): SystemState
getControlPanelData(): ControlPanelData
```

### ManagerAgentEngine

```typescript
// 手动触发决策循环
runDecisionCycle(): Promise<DecisionResult[]>
forceDecisionCycle(): Promise<DecisionResult[]>

// 添加自定义决策规则
addDecisionRule(rule: DecisionRule): void

// 添加进化策略
addEvolutionStrategy(strategy: EvolutionStrategy): void

// 获取决策历史
getDecisionHistory(): DecisionResult[]
```

---

## 权限系统

### 权限矩阵

| 操作者 ↓ / 目标 → | System | Manager | Worker |
|------------------|--------|---------|--------|
| **User** | ✅ 全部 | ✅ 全部 | ✅ 全部 |
| **System** | ✅ 全部 | ✅ 全部 | ✅ 全部 |
| **Manager** | ❌ 无 | ✅ 查看 | ✅ 全部 |
| **Worker** | ❌ 无 | ❌ 无 | ✅ 仅自己 |

### 权限检查

```typescript
// 检查权限
const hasPermission = agentOrchestrator.checkPermission(
  'manager',  // 操作者等级
  'worker',   // 目标等级
  'create'    // 操作类型
)

// 断言权限（无权限时抛出错误）
agentOrchestrator.assertPermission('manager', 'worker', 'create')
```

---

## 自我进化机制

### 决策规则

Manager Agent 根据以下规则自主决策：

```typescript
// 规则1: 高负载扩容
if (系统负载 > 80% || 任务队列 > 10) {
  创建新Worker()
}

// 规则2: 空闲缩容
if (Worker空闲 > 24h && 空闲Worker > 2) {
  暂停Worker()
}

// 规则3: 故障恢复
if (Worker失败率 > 30%) {
  暂停Worker()
  创建新Worker()
  通知用户()
}

// 规则4: 性能优化
if (定时: 每天凌晨3点) {
  分析性能数据()
  生成优化建议()
  调整配置()
}
```

### 进化策略

```typescript
// 自动扩缩容
{
  trigger: { type: 'load', threshold: 80 },
  action: { type: 'scale_up', params: { count: 1 } }
}

// 故障预测
{
  trigger: { type: 'error_rate', threshold: 0.3 },
  action: { type: 'recreate', params: {} }
}

// 性能优化
{
  trigger: { type: 'schedule', schedule: '0 2 * * *' },
  action: { type: 'optimize_prompt', params: {} }
}
```

---

## 最佳实践

### 1. 创建专用Manager

为不同场景创建专门的Manager：

```typescript
// 内容管理Manager
const contentManager = agentOrchestrator.createManagerAgent({
  ...contentManagerAgentPreset,
  name: '内容管理Agent'
})

// 数据分析Manager
const dataManager = agentOrchestrator.createManagerAgent({
  ...mainManagerAgentPreset,
  name: '数据分析Agent',
  capabilities: {
    skillIds: ['data_analysis'],
    toolIds: ['query_data', 'generate_chart']
  }
})
```

### 2. 合理配置定时任务

```typescript
// 避免所有Worker同时触发
const worker1 = createScheduledCollector(managerId)
worker1.scheduleConfig!.cron = '0 9 * * *'  // 早上9点

const worker2 = createScheduledCollector(managerId)
worker2.scheduleConfig!.cron = '0 12 * * *' // 中午12点

const worker3 = createScheduledCollector(managerId)
worker3.scheduleConfig!.cron = '0 18 * * *' // 晚上6点
```

### 3. 监控和告警

```typescript
// 订阅系统事件
agentOrchestrator.onEvent('agent:error', (event) => {
  console.error('Agent错误:', event)
  // 发送告警通知
})

agentOrchestrator.onEvent('task:failed', (event) => {
  console.error('任务失败:', event)
  // 记录到日志
})
```

### 4. 定期维护

```typescript
// 每月清理历史数据
setInterval(() => {
  const agents = agentOrchestrator.getAllAgents()
  for (const agent of agents) {
    // 只保留最近30天的历史
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    agent.taskHistory = agent.taskHistory.filter(
      t => t.startedAt > oneMonthAgo
    )
  }
}, 30 * 24 * 60 * 60 * 1000)
```

---

## 故障排查

### 常见问题

**Q: Manager Agent 无法创建 Worker**
- 检查 Manager 状态是否为 `idle` 或 `running`
- 检查是否达到最大 Worker 数量限制
- 查看系统事件日志

**Q: 定时任务没有触发**
- 检查 Worker 的 `scheduleConfig.enabled` 是否为 true
- 检查 Cron 表达式是否正确
- 检查时区设置是否正确

**Q: 任务执行失败**
- 查看 Worker 的任务历史
- 检查工具调用链中的错误信息
- 查看实时日志

**Q: 系统负载过高**
- Manager 会自动创建新的 Worker
- 手动暂停非关键 Worker
- 检查是否有死循环任务

---

## 扩展开发

### 自定义决策规则

```typescript
const engine = managerEngineRegistry.getEngine(managerId)

engine.addDecisionRule({
  id: 'my-custom-rule',
  name: '我的自定义规则',
  description: '当满足条件时执行自定义操作',
  condition: (context) => {
    // 返回 true 时触发 action
    return context.systemState.load.cpu > 90
  },
  action: async (context) => {
    // 执行自定义操作
    return {
      decision: 'custom_action',
      reason: 'CPU负载过高',
      confidence: 0.9,
      expectedOutcome: '降低系统负载'
    }
  },
  priority: 100,
  enabled: true
})
```

### 自定义任务处理器

```typescript
const worker = agentOrchestrator.createWorkerAgent({
  ...passiveWorkerPreset,
  tasks: [{
    id: 'custom-task',
    name: '自定义任务',
    type: 'custom',
    inputSchema: { url: 'string' },
    outputSchema: { result: 'string' },
    tools: ['fetch_url'],
    handler: async (input, context) => {
      context.logger('info', '开始处理')
      context.updateProgress(50, '处理中')
      
      // 自定义逻辑
      const result = await process(input.url)
      
      context.updateProgress(100, '完成')
      return { result }
    }
  }]
})
```

---

## 总结

Agent Orchestrator 提供了一个完整的 **自我进化Agent生态系统**：

1. **三级权限**：System → Manager → Worker，安全可控
2. **双模式**：被动响应 + 定时执行，灵活应对不同场景
3. **自主管理**：Manager 24/7 监控，自动扩缩容、故障恢复
4. **实时监控**：可视化面板，随时掌握系统状态
5. **自我进化**：基于历史数据持续优化

用户只需关注高层指令，系统会自动完成底层管理和优化。
