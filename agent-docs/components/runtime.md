# AgentRuntime 组件详细设计

## 基本信息

| 属性 | 值 |
|-----|-----|
| **层级** | L4 - 智能编排层 |
| **文件位置** | `.vitepress/agent/core/AgentRuntime.ts` |
| **实现状态** | ✅ 已实现 |
| **完成度** | 85% |

## 功能设计

### 核心职责
AgentRuntime 是整个 Agent 系统的中央控制器，负责：
1. **生命周期管理**: Agent 的初始化、运行、暂停、恢复、销毁
2. **任务调度**: 接收用户输入，解析意图，调度技能执行
3. **状态管理**: 维护任务状态机，支持断点续作
4. **事件协调**: 通过 EventBus 协调各组件间的通信
5. **模式切换**: 管理三种编辑模式 (MANUAL/COLLAB/AGENT)

### 子组件

```
AgentRuntime
├── IntentRouter      # 意图解析
├── StateMachine      # 状态管理
├── MemoryManager     # 记忆管理 (注入)
├── SkillEngine       # 技能引擎 (外部注册)
├── Logger            # 日志系统 (注入)
└── CostTracker       # 成本追踪 (注入)
```

## 交互方式

### 对外接口

```typescript
// 单例获取
static getInstance(config?: AgentRuntimeConfig): AgentRuntime

// 初始化
async initialize(): Promise<void>

// 模式切换
setMode(mode: EditorMode): void
getMode(): EditorMode

// 技能注册
registerSkill(skill: Skill): void
listSkills(): Skill[]

// 主要交互入口
async processInput(input: string, context?: { currentFile?: string }): Promise<ChatMessage>

// COLLAB 模式: 分析编辑器内容
async analyzeEditorContent(content: string, cursorPosition: number): Promise<any[]>

// 获取行内建议
async getInlineSuggestions(content: string, line: number, ch: number): Promise<any[]>

// 事件监听
on(event: string, callback: (data: any) => void): () => void
```

### 与其他组件交互

```
AgentRuntime (L4)
    │
    ├──→ IntentRouter (L4)        意图解析
    │     └── 返回 ParsedIntent
    │
    ├──→ StateMachine (L4)        状态流转
    │     └── 状态: IDLE → UNDERSTANDING → EXECUTING → COMPLETED
    │
    ├──→ Skill.handler (L4)       技能执行
    │     └── 通过 SkillContext 注入依赖
    │
    ├──→ MemoryManager (L4/L1)    记忆读写
    │     ├── buildContext()      构建 RAG 上下文
    │     ├── saveTaskHistory()   保存任务历史
    │     └── extractEntities()   提取实体
    │
    ├──→ LLMManager (L2)          LLM 调用 (通过 Skill)
    │     └── chat() / chatStream()
    │
    └──→ UI (L5)                  事件通知
          └── emit('taskCompleted', data)
```

## 实现进度

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 单例模式 | ✅ 完成 | 全局唯一实例管理 |
| 初始化流程 | ✅ 完成 | LLM、Memory、Checkpoints 加载 |
| 模式切换 | ✅ 完成 | MANUAL/COLLAB/AGENT 三种模式 |
| 意图处理 | ✅ 完成 | 解析 → 匹配技能 → 执行 |
| 技能注册 | ✅ 完成 | 动态注册，支持中间件 |
| 状态管理 | ✅ 完成 | 7 种状态流转 |
| 事件系统 | ✅ 完成 | 发布订阅模式 |
| COLLAB 分析 | ⚠️ 基础 | 有框架，建议逻辑待完善 |
| 行内建议 | ⚠️ 基础 | 返回上下文关联，LLM 生成待完善 |
| 断点续作 | ❌ 未实现 | loadCheckpoints/saveCheckpoint 为空 |
| WikiLinks 检测 | ⚠️ 基础 | 检测逻辑有，文章存在检查待实现 |

## 关键代码片段

### 任务执行流程

```typescript
private async executeIntent(intent: ParsedIntent, rawInput: string, messageId: string): Promise<ChatMessage> {
  // 1. 创建任务
  const taskId = this.generateId()
  this.currentTask = { id: taskId, state: 'PLANNING', ... }
  
  // 2. 查找技能
  const skill = this.intentRouter.findSkill(intent)
  if (!skill) return errorMessage
  
  // 3. 构建 SkillContext
  const skillContext: SkillContext = {
    taskId,
    memory: this.memory,
    logger: this.logger,
    costTracker: this.costTracker,
    currentFile: this.currentFile,
    sessionId: this.sessionId
  }
  
  // 4. 执行技能
  const result = await skill.handler(skillContext, intent.parameters)
  
  // 5. 记录成本 & 保存历史
  this.costTracker.record({ tokens: result.tokensUsed, cost: result.cost })
  await this.memory.saveTaskHistory(history)
  
  // 6. 通知 UI
  this.emit('taskCompleted', { taskId, result })
  
  return assistantMessage
}
```

## 待完善项

1. **断点续作**: 实现 `loadCheckpoints()` 和 `saveCheckpoint()`
2. **COLLAB 增强**: 完善 `analyzeEditorContent()` 的 LLM 分析逻辑
3. **行内建议**: 接入 LLM 生成补全建议
4. **错误恢复**: 添加重试机制和优雅降级
