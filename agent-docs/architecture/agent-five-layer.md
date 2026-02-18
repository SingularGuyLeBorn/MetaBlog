# Agent 五层架构详解

> **【总-分-总】MetaUniverse Agent 五层架构**
> 
> 详细描述 L1-L5 每层的设计原理、组件构成和层间交互。

---

## 【总】架构全景

MetaUniverse Agent 采用**五层分层架构**，从下至上依次为：记忆存储层、运行时与观察层、工具与感知层、智能编排层、人机共生界面层。

```
┌───────────────────────────────────────────────────────────────────────┐
│                     L5: 人机共生界面层 (Human-AI Interface)              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ BlogFrontend │ │   GlobalPage │ │  AIChatOrb   │ │  Knowledge   │  │
│  │  (保留Vite   │ │   Editor-AGI │ │  (智能入口)   │ │   Graph      │  │
│  │   Press核心) │ │  (三模态编辑) │ │   悬浮球)    │ │ (AI探索)     │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L4: 智能编排层 (AI Orchestration)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ IntentRouter │ │   Skill      │ │   State      │ │  Memory      │  │
│  │ (意图解析)    │ │   Engine     │ │   Machine    │ │  Manager     │  │
│  │              │ │ (技能执行)   │ │ (断点续作)    │ │ (文件化记忆)  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L3: 工具与感知层 (Tools & Senses)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   WebSearch  │ │   Vditor     │ │    Git       │ │   RAG        │  │
│  │   (网络搜索) │ │   Bridge     │ │  Operator    │ │   Engine     │  │
│  │              │ │ (编辑器集成) │ │ (Git操作)    │ │ (向量检索)   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L2: 运行时与观察层 (Runtime & Observability)        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   LLM        │ │   Logger     │ │   Cost       │ │   Health     │  │
│  │  Manager     │ │ (结构化日志) │ │   Tracker    │ │   Checker    │  │
│  │ (多提供商)   │ │              │ │ (Token计费)  │ │ (故障自愈)   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│                     L1: 记忆存储层 (Memory Storage)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Content    │ │   History    │ │   Agent      │ │   Vector     │  │
│  │   Repo       │ │   Backups    │ │   States     │ │   DB         │  │
│  │ (Git版本)    │ │ (操作历史)   │ │ (任务状态)   │ │ (RAG索引)    │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

### 架构设计原则

```
┌─────────────────────────────────────────────────────────────────┐
│                    架构设计五原则                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 层间单向依赖                                                 │
│     • 上层可调用下层，下层不可感知上层                            │
│     • 通过接口契约交互                                           │
│                                                                 │
│  2. 职责单一                                                     │
│     • 每层有明确且唯一的职责                                     │
│     • 组件内聚，层间松耦合                                       │
│                                                                 │
│  3. 可替换性                                                     │
│     • 层内组件可替换，不影响其他层                                │
│     • 支持多种实现（如多种 LLM 提供商）                           │
│                                                                 │
│  4. 渐进增强                                                     │
│     • 核心功能轻量，高级功能可插拔                                │
│     • MANUAL 模式下无 AI 介入                                    │
│                                                                 │
│  5. 可观测性                                                     │
│     • 所有操作可追踪、可度量                                     │
│     • Token 使用、成本、耗时透明                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 【分】分层详解

### L1: 记忆存储层 (Memory Storage)

**【总】职责概述**

存储层负责所有数据的持久化，是系统的"记忆中枢"。包括内容版本、操作历史、任务状态、向量索引。

**【分】存储结构**

```
docs/.vitepress/
├── memory/                        # L1: Agent 记忆（Git 跟踪）
│   ├── entities/                  # 实体库
│   │   ├── concepts.json          # 概念定义
│   │   ├── technologies.json      # 技术/框架
│   │   ├── papers.json            # 论文
│   │   ├── people.json            # 人名
│   │   └── code.json              # 代码/算法
│   ├── tasks/                     # 任务历史
│   │   └── task_xxx.json
│   ├── context/                   # 短期会话记忆
│   │   └── sess_xxx.json
│   └── skills/                    # 技能提示词模板
│       └── research.yaml
│
├── history/                       # L1: 编辑历史（原有）
│   ├── posts/                     # 文件级历史
│   └── agent/                     # Agent 操作历史（新增）
│
└── cache/                         # L1: 构建缓存（.gitignore）
    └── rag/
        └── index.bin              # 向量索引
```

**【分】存储组件**

| 组件 | 技术选型 | 存储内容 | 演进路线 |
|------|---------|---------|---------|
| Content Repo | Git | Markdown 文章、代码文件 | 原有，保持不变 |
| History Backups | localStorage → 文件 | 编辑历史、任务记录 | Phase 1 迁移 |
| Agent States | localStorage → 文件 | 检查点、会话状态 | Phase 1 迁移 |
| Vector DB | 内存 → IndexedDB → 文件 | RAG 向量索引 | Phase 1 实现 |

**【总】向上层暴露的接口**

```typescript
interface StorageLayer {
  // 内容操作
  readFile(path: string): Promise<string>
  saveFile(path: string, content: string): Promise<void>
  
  // 历史操作
  saveTaskHistory(history: TaskHistory): Promise<void>
  getTaskHistory(taskId: string): Promise<TaskHistory | null>
  listTaskHistories(limit?: number): Promise<TaskHistory[]>
  
  // 实体操作
  saveEntity(entity: KnowledgeEntity): Promise<void>
  getEntity(id: string): Promise<KnowledgeEntity | null>
  findEntitiesByType(type: EntityType): Promise<KnowledgeEntity[]>
  findEntitiesByName(name: string): Promise<KnowledgeEntity[]>
  
  // 向量操作
  addToVectorIndex(content: string, embedding: number[], metadata?: any): Promise<void>
  vectorSearch(query: number[], topK?: number): Promise<VectorSearchResult[]>
}
```

---

### L2: 运行时与观察层 (Runtime & Observability)

**【总】职责概述**

运行时层提供基础设施服务，是系统的"神经系统"。

**【分】核心组件详解**

#### LLM Manager

```typescript
// 统一的多提供商接口
class LLMManager {
  private providers: Map<string, LLMProvider>
  private defaultProvider: string
  
  // 配置管理
  configure(provider: string, config: ProviderConfig): void
  setDefaultProvider(provider: string): void
  
  // 基础调用
  chat(request: LLMRequest): Promise<LLMResponse>
  
  // 流式调用（用于实时展示）
  chatStream(
    request: LLMRequest, 
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void>
  
  // 成本估算
  estimateCost(model: string, tokens: number): number
  
  // 获取可用模型列表
  listAvailableModels(): ModelInfo[]
}

// 支持的提供商
const SUPPORTED_PROVIDERS = [
  'deepseek',   // 带 reasoning_content
  'openai',
  'anthropic',
  'gemini',
  'kimi',
  'qwen',
  'zhipu'
]
```

#### Logger

```typescript
// 结构化日志系统
interface Logger {
  debug(event: string, data?: object): void
  info(event: string, data?: object): void
  warn(event: string, data?: object): void
  error(event: string, data?: object): void
}

// 日志格式示例
{
  "timestamp": "2026-02-18T01:12:09.644Z",
  "level": "info",
  "event": "skill.executed",
  "data": {
    "skill": "WriteArticle",
    "taskId": "task_123",
    "duration": 5200,
    "tokens": 2450,
    "cost": 0.08
  },
  "sessionId": "sess_abc123",
  "traceId": "trace_xyz789"
}
```

#### Cost Tracker

```typescript
// Token 与成本追踪
interface CostTracker {
  // 记录使用
  record(usage: TokenUsage): void
  
  // 统计查询
  getSessionCost(sessionId: string): CostReport
  getTotalCost(): CostReport
  
  // 格式化
  formatTokens(tokens: number): string  // "2.4k"
  formatCost(cost: number): string      // "$0.08"
}

interface TokenUsage {
  timestamp: number
  model: string
  tokens: number
  cost: number
  taskId: string
  skill: string
}
```

**【总】层间调用关系**

L2 为 L3/L4 提供基础设施服务，通过依赖注入或全局单例访问。

---

### L3: 工具与感知层 (Tools & Senses)

**【总】职责概述**

工具层封装外部服务的交互，是系统的"手脚和感官"。

**【分】工具详解**

#### WebSearch

```typescript
interface WebSearchTool {
  // 多源搜索
  search(query: string, options: SearchOptions): Promise<SearchResult[]>
  
  // 特定站点搜索
  searchArxiv(query: string): Promise<Paper[]>
  searchGoogle(query: string): Promise<SearchResult[]>
  searchGitHub(query: string): Promise<Repo[]>
  
  // 结果可信度评分
  scoreCredibility(result: SearchResult): number
  
  // 抓取网页内容
  fetchContent(url: string): Promise<string>
}

interface SearchResult {
  title: string
  link: string
  snippet: string
  source: 'google' | 'arxiv' | 'github' | 'other'
  credibility: number  // 0-1
  publishedDate?: string
}
```

**实现状态**: 🟡 Phase 1 接入 SerpAPI

#### Vditor Bridge

```typescript
interface VditorBridge {
  // 编辑器状态
  getContent(): string
  setContent(content: string): void
  getSelection(): { text: string; range: Range }
  getCursorPosition(): { line: number; ch: number }
  
  // 协作功能
  insertSuggestion(suggestion: Suggestion): void
  showInlineHint(hint: string, position: Position): void
  highlightText(range: Range, className: string): void
  
  // 事件监听
  onChange(callback: (content: string) => void): void
  onSave(callback: () => void): void
  onSelectionChange(callback: () => void): void
}
```

#### Git Operator

```typescript
interface GitOperator {
  // 基本操作
  commit(options: CommitOptions): Promise<CommitResult>
  diff(from: string, to: string): Promise<DiffResult>
  log(options: LogOptions): Promise<CommitInfo[]>
  status(): Promise<StatusResult>
  
  // 分支操作
  branch(name: string): Promise<void>
  checkout(ref: string): Promise<void>
  
  // Agent 专用
  commitAsAgent(params: AgentCommitParams): Promise<CommitResult>
  revertToCheckpoint(checkpointId: string): Promise<void>
  createCheckpoint(name: string): Promise<string>
}

interface AgentCommitParams {
  path: string
  taskId: string
  message: string
  metadata: {
    model: string
    tokens: number
    cost: number
    skill: string
  }
}
```

**实现状态**: 🟡 Phase 2 完整实现

#### RAG Engine

```typescript
interface RAGEngine {
  // 索引构建
  indexDocument(path: string, content: string): Promise<void>
  buildIndex(): Promise<void>
  
  // 检索
  search(query: string, options: SearchOptions): Promise<RAGResult[]>
  hybridSearch(query: string): Promise<RAGResult[]>  // 关键词 + 向量
  
  // 上下文构建
  buildContext(query: string, currentFile?: string): Promise<ContextChunk[]>
}

interface RAGResult {
  content: string
  source: string
  score: number
  metadata: {
    type: 'entity' | 'task_history' | 'article' | 'external'
    entityType?: EntityType
    title?: string
  }
}
```

**实现状态**: 🟡 Phase 1 实现向量检索

---

### L4: 智能编排层 (AI Orchestration)

**【总】职责概述**

编排层是系统的"大脑"，负责理解意图、调度技能、管理状态、维护记忆。

**【分】核心组件详解**

#### IntentRouter

```typescript
class IntentRouter {
  private skills: Map<string, Skill>
  
  // 技能注册
  registerSkill(skill: Skill): void
  
  // 意图解析
  parse(input: string, context?: object): Promise<ParsedIntent>
  
  // 技能匹配
  findSkill(intent: ParsedIntent): Skill | null
  
  // 相似意图推荐
  getSimilarIntents(intent: ParsedIntent, limit: number): ScoredIntent[]
}

interface ParsedIntent {
  type: string
  params: object
  confidence: number
  skill?: string
  raw: string
}
```

#### SkillEngine

```typescript
class SkillEngine {
  private skills: Map<string, Skill>
  
  // 技能管理
  register(skill: Skill): void
  registerMany(skills: Skill[]): void
  getSkill(name: string): Skill | undefined
  
  // 技能执行
  execute(
    skillName: string, 
    context: SkillContext, 
    params: object
  ): Promise<SkillResult>
  
  // 元数据
  listSkills(): SkillInfo[]
}

interface Skill {
  name: string
  description: string
  intentPattern: RegExp
  requiredParams: string[]
  optionalParams: string[]
  handler: (ctx: SkillContext, params: object) => Promise<SkillResult>
}
```

#### StateMachine

```typescript
class StateMachine {
  private currentState: AgentState
  private listeners: Map<AgentState, Set<Callback>>
  
  // 状态定义
  states: ['IDLE', 'UNDERSTANDING', 'PLANNING', 'EXECUTING', 'PAUSED', 'COMPLETED', 'ERROR']
  
  // 状态转换
  transition(to: AgentState): void
  canTransition(from: AgentState, to: AgentState): boolean
  
  // 事件监听
  on(state: AgentState, callback: Callback): void
  
  // 断点续作
  saveCheckpoint(): Promise<Checkpoint>
  loadCheckpoint(id: string): Promise<void>
}

type AgentState = 
  | 'IDLE'           // 空闲
  | 'UNDERSTANDING'  // 理解意图
  | 'PLANNING'       // 规划任务
  | 'EXECUTING'      // 执行中
  | 'PAUSED'         // 暂停（等待用户）
  | 'COMPLETED'      // 完成
  | 'ERROR'          // 错误
```

**状态流转图**：

```
┌──────┐   收到输入   ┌─────────────┐   解析成功   ┌─────────┐
│ IDLE │ ─────────→ │ UNDERSTANDING│ ─────────→ │ PLANNING │
└──────┘             └─────────────┘            └────┬─────┘
   ↑                                                 │
   │                                                 ↓
   │               ┌─────────┐   执行完成   ┌──────────┐
   └────────────── │  ERROR  │ ←───────── │ EXECUTING │
      错误恢复      └─────────┘            └────┬─────┘
                                               │
                     ┌──────────┐   用户暂停   │
                     │  PAUSED  │ ←────────────┘
                     └────┬─────┘
                          │ 继续执行
                          ↓
                     ┌──────────┐
                     │ COMPLETED│
                     └──────────┘
```

#### MemoryManager

详见 [组件详解 - MemoryManager](../components/memory.md)

---

### L5: 人机共生界面层 (Human-AI Interface)

**【总】职责概述**

界面层是用户与系统交互的入口，提供三种不同的协作模式。

**【分】核心组件详解**

#### AIChatOrb

```typescript
// AIChatOrb 组件
interface AIChatOrb {
  // 状态
  isOpen: boolean
  messages: ChatMessage[]
  isStreaming: boolean
  unreadCount: number
  
  // 上下文感知
  captureContext(): ContextSnapshot
  
  // 快捷操作
  quickActions: QuickAction[]
  
  // 交互
  open(): void
  close(): void
  sendMessage(message: string): Promise<void>
  clearHistory(): void
}

interface ContextSnapshot {
  currentPage: string      // 当前文章路径
  selectedText: string     // 用户选中的文字
  wikiLinks: string[]     // 当前文章的内部链接
  recentHistory: string[] // 最近相关文章
}

type QuickAction = 
  | { type: 'continue'; label: '续写'; icon: '📝' }
  | { type: 'search'; label: '搜索'; icon: '🔍' }
  | { type: 'summarize'; label: '总结'; icon: '📊' }
  | { type: 'explain'; label: '解释'; icon: '💡' }
```

#### GlobalPageEditor-AGI

```typescript
// 三模态编辑器
type EditorMode = 'MANUAL' | 'COLLAB' | 'AGENT'

interface GlobalPageEditorAGI {
  // 状态
  mode: EditorMode
  content: string
  isSaving: boolean
  agentState: AgentState
  suggestions: Suggestion[]
  
  // 模式切换
  setMode(mode: EditorMode): void
  
  // 内容操作
  loadContent(path: string): Promise<void>
  saveContent(): Promise<void>
  
  // COLLAB 模式
  analyzeContent(): Promise<void>
  acceptSuggestion(suggestion: Suggestion): void
  dismissSuggestion(suggestion: Suggestion): void
  
  // AGENT 模式
  sendCommand(command: string): Promise<void>
}

const modeConfig: Record<EditorMode, ModeConfig> = {
  MANUAL: {
    label: '人工',
    icon: '👤',
    color: '#6b7280',
    description: '完全手动编辑',
    features: ['auto-save', 'outline']
  },
  COLLAB: {
    label: '协作',
    icon: '🤝',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'AI 实时建议',
    features: ['inline-suggestion', 'context-indicator', 'entity-detection']
  },
  AGENT: {
    label: '托管',
    icon: '🤖',
    color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    description: 'Agent 自动执行',
    features: ['natural-language-command', 'auto-write', 'auto-edit']
  }
}
```

#### HistoryViewer-AGI

```typescript
// 增强历史查看器
interface HistoryViewerAGI {
  activeTab: 'file' | 'agent'
  
  // 文件历史
  humanCommits: CommitInfo[]
  agentCommits: CommitInfo[]
  selectedCommit: CommitInfo | null
  
  // Agent 任务
  agentTasks: TaskHistory[]
  selectedTask: TaskHistory | null
  selectedStep: TaskStep | null
  
  // 操作
  loadHistory(): Promise<void>
  viewCommit(commit: CommitInfo): void
  viewTask(task: TaskHistory): void
  viewStep(step: TaskStep): void
  rollback(commitHash: string): Promise<void>
}
```

---

## 【总】层间协作与数据流

### 完整数据流

```
用户操作 (L5)
    ↓
AIChatOrb / GlobalPageEditor-AGI
    ↓ 调用
AgentRuntime.processInput() (L4)
    ↓
┌─────────────────────────────────────┐
│ IntentRouter.parse() - 意图解析     │
│ StateMachine.transition() - 状态管理 │
└─────────────────────────────────────┘
    ↓
SkillEngine.execute() (L4)
    ↓ 调用
┌─────────────────────────────────────┐
│ LLM.chat() (L2)                     │
│ WebSearch.search() (L3)             │
│ MemoryManager.buildContext() (L4)   │
│ RAGEngine.vectorSearch() (L3)       │
└─────────────────────────────────────┘
    ↓
结果聚合 (L4)
    ↓
UI 更新 (L5)
    ↓
MemoryManager.save*() (L4) → Storage (L1)
```

### 调用关系矩阵

| 调用方 ↓ \ 被调方 → | L1 存储 | L2 运行时 | L3 工具 | L4 编排 | L5 界面 |
|-------------------|--------|----------|--------|--------|--------|
| **L5 界面** | - | - | - | ✅ Runtime | - |
| **L4 编排** | ✅ Memory | ✅ LLM/Cost | ✅ Skills | ✅ Internal | - |
| **L3 工具** | - | ✅ LLM | - | - | - |
| **L2 运行时** | - | - | - | - | - |
| **L1 存储** | - | - | - | - | - |

### 扩展点

```
┌──────────────────────────────────────────────────────────┐
│                       系统扩展点                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. 新增技能 (Skill)                                      │
│     → 实现 Skill 接口                                     │
│     → 在 SkillEngine 注册                                 │
│     → IntentRouter 自动识别                               │
│                                                          │
│  2. 新增 LLM 提供商                                       │
│     → 继承 LLMProvider 基类                               │
│     → 实现 chat/chatStream 方法                           │
│     → 在 LLMManager 注册                                  │
│                                                          │
│  3. 新增 UI 组件                                          │
│     → 通过 AgentRuntime.getInstance() 获取运行时           │
│     → 订阅相关事件                                        │
│     → 调用运行时方法                                      │
│                                                          │
│  4. 新增工具 (Tool)                                       │
│     → 实现工具接口                                        │
│     → 通过 SkillContext 注入技能                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 附录

### 文件目录对应

```
docs/.vitepress/
├── agent/                         # L4 编排层 + L3 工具层
│   ├── core/                      #   IntentRouter, StateMachine
│   ├── skills/                    #   SkillEngine
│   ├── memory/                    #   MemoryManager (L1 接口)
│   ├── llm/                       # L2 LLM Manager
│   ├── runtime/                   # L2 Logger, CostTracker
│   └── config/                    #   配置管理
│
├── theme/components/agent/        # L5 界面层
│   ├── AIChatOrb.vue
│   ├── GlobalPageEditorAGI.vue
│   ├── AgentModeToggle.vue
│   └── ...
│
├── memory/                        # L1 存储层 (新增)
│   ├── entities/
│   ├── tasks/
│   └── ...
│
└── history/                       # L1 存储层 (原有)
```

---

*文档版本: 1.0*  
*关联文档: [原有博客架构](./blog-vitepress.md), [整体架构概览](./overview.md)*
