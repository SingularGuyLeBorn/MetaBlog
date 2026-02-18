# MetaUniverse 系统总体架构设计

## 一、架构概述

MetaUniverse 是一个融合传统静态博客与 AI-Native Agent 的双架构系统。保留 VitePress 的渲染优势，同时引入 Agent Runtime 实现内容的自主生长与人机协同。

**核心理念**: 从"静态镜像"（内容展示+人工编辑）升级为"自主生命体"（内容自生长+人机协同）。

## 二、组件组成

系统采用五层分层架构：

```
┌───────────────────────────────────────────────────────────────────────┐
│  L5: 人机共生界面层 (Human-AI Interface)                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ BlogFrontend │ │ GlobalPage   │ │  AIChatOrb   │ │  Knowledge   │  │
│  │  (博客前端)   │ │   Editor     │ │  (AI悬浮球)  │ │   Graph      │  │
│  │              │ │ (三模态编辑) │ │              │ │  (知识图谱)  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│  L4: 智能编排层 (AI Orchestration)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ IntentRouter │ │   Skill      │ │   State      │ │   Memory     │  │
│  │  (意图解析)   │ │   Engine     │ │   Machine    │ │   Manager    │  │
│  │              │ │  (技能引擎)  │ │  (状态机)    │ │ (记忆管理)   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│  L3: 工具与感知层 (Tools & Senses)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   WebSearch  │ │   Vditor     │ │    Git       │ │   RAG        │  │
│  │   (网络搜索) │ │   Bridge     │ │  Operator    │ │   Engine     │  │
│  │              │ │ (编辑器桥接) │ │  (Git操作)   │ │ (向量检索)   │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│  L2: 运行时与观察层 (Runtime & Observability)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   LLM        │ │    Logger    │ │    Cost      │ │    Health    │  │
│  │   Manager    │ │  (日志系统)  │ │   Tracker    │ │   Checker    │  │
│  │ (多Provider) │ │              │ │  (成本追踪)  │ │  (健康检查)  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
├───────────────────────────────────────────────────────────────────────┤
│  L1: 记忆存储层 (Memory Storage)                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Content    │ │   History    │ │   Agent      │ │   Vector     │  │
│  │   Repo       │ │   Backups    │ │   States     │ │     DB       │  │
│  │  (内容仓库)  │ │  (编辑历史)  │ │  (任务状态)  │ │  (向量索引)  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

## 三、各层组件功能

### L5: 人机共生界面层
负责与用户直接交互，提供三种协作模式。

| 组件 | 功能 | 状态 |
|-----|------|------|
| **BlogFrontend** | VitePress 静态站点渲染、文章展示、导航 | ✅ 已实现 |
| **GlobalPageEditor** | 三模态编辑器 (MANUAL/COLLAB/AGENT)、Vditor 集成、自动保存 | ⚠️ 部分实现 |
| **AIChatOrb** | AI 对话悬浮球、意图输入、快捷操作、流式输出 | ✅ 已实现 |
| **KnowledgeGraph** | Cytoscape 可视化、WikiLinks 展示、实体关系图谱 | ✅ 已实现 |

### L4: 智能编排层
系统的"大脑"，负责任务调度、意图解析、状态管理。

| 组件 | 功能 | 状态 |
|-----|------|------|
| **AgentRuntime** | 单例运行时、任务生命周期管理、事件总线、模式切换 | ✅ 已实现 |
| **IntentRouter** | 自然语言意图解析、技能匹配、置信度计算 | ✅ 已实现 |
| **SkillEngine** | 技能注册与执行、中间件支持、并发控制 | ✅ 已实现 |
| **StateMachine** | 7 状态管理 (IDLE/UNDERSTANDING/PLANNING/EXECUTING/PAUSED/COMPLETED/ERROR) | ✅ 已实现 |
| **MemoryManager** | 实体管理、任务历史、会话记忆、RAG 上下文构建 | ⚠️ 内存存储，待文件化 |

### L3: 工具与感知层
系统的"手脚"，负责与外部服务和编辑器交互。

| 组件 | 功能 | 状态 |
|-----|------|------|
| **WebSearch** | 多源网络搜索 (SerpAPI/Google/Arxiv)、可信度评分 | ❌ 未实现 |
| **VditorBridge** | 编辑器状态获取、内容插入、事件监听 | ❌ 未实现 |
| **GitOperator** | Git 提交、分支管理、Diff 对比、Agent 提交标记 | ❌ 未实现 |
| **RAGEngine** | 向量索引构建、相似度搜索、混合检索 | ⚠️ 关键词已实现，向量待实现 |

### L2: 运行时与观察层
基础设施服务，支撑上层运行。

| 组件 | 功能 | 状态 |
|-----|------|------|
| **LLMManager** | 7 Provider 管理 (DeepSeek/OpenAI等)、故障切换、流式输出 | ✅ 已实现 |
| **Logger** | 结构化日志、分级输出、持久化 | ✅ 已实现 |
| **CostTracker** | Token 统计、成本计算、预算告警 | ✅ 已实现 |

### L1: 记忆存储层
数据持久化层，支持 Git 版本控制。

| 组件 | 功能 | 状态 |
|-----|------|------|
| **Content Repo** | Markdown/代码文件存储、VitePress 构建源 | ✅ 已实现 |
| **History Backups** | 编辑历史备份、版本回滚 | ✅ 已实现 |
| **Agent States** | 任务历史、检查点、实体库 (文件化存储) | ⚠️ 待文件化 |
| **Vector DB** | RAG 向量索引、嵌入存储 | ❌ 待实现 |

## 四、组件间交互方式

### 4.1 整体数据流

```
用户操作 (L5)
    ↓
AIChatOrb / GlobalPageEditor
    ↓ 调用
AgentRuntime.processInput() (L4)
    ↓
IntentRouter.parse() → StateMachine.transition()
    ↓
SkillEngine.execute() (L4)
    ↓ 调用
┌─────────────────────────────────────┐
│ LLM.chat() (L2)                     │
│ WebSearch.search() (L3)             │
│ MemoryManager.buildContext() (L4)   │
│ VditorBridge.insert() (L3)          │
└─────────────────────────────────────┘
    ↓
结果聚合 (L4)
    ↓
UI 更新 (L5)
    ↓
MemoryManager.save*() (L4) → Storage (L1)
```

### 4.2 层间调用规则

| 调用方向 | 方式 | 说明 |
|---------|------|------|
| **上层 → 下层** | 直接方法调用 | L5 调用 L4，L4 调用 L3/L2/L1 |
| **下层 → 上层** | 事件总线 (EventBus) | 通过 `AgentRuntime.emit()` 通知 UI |
| **同层之间** | 接口调用 | 通过依赖注入或共享上下文 |

### 4.3 关键交互接口

```typescript
// L5 → L4: 用户输入处理
AgentRuntime.processInput(input: string, context?: { currentFile?: string }): Promise<ChatMessage>

// L4 → L3: 工具调用
SkillContext: { memory, logger, costTracker, currentFile, sessionId }

// L4 → L2: LLM 调用
LLMManager.chat(request: LLMRequest): Promise<LLMResponse>

// L4 → L1: 记忆持久化
MemoryManager.saveEntity(entity): Promise<void>
MemoryManager.saveTaskHistory(history): Promise<void>

// L3 → L1: 文件操作
FileSystem.readFile(path): Promise<string>
FileSystem.saveFile(path, content): Promise<void>
GitOperator.commit(message): Promise<void>
```

## 五、架构设计原则

1. **层间单向依赖**: 上层可调用下层，下层无感知上层
2. **接口契约**: 每层通过明确定义的接口交互
3. **可替换性**: 层内组件可替换（如更换 LLM Provider）
4. **渐进增强**: MANUAL 模式完全无 AI 介入
5. **可观测性**: Token、成本、耗时全透明

## 六、实现进度总览

```
总体完成度: 约 65%

L5 人机界面层:  ████████████░░░░░░░░  60%  
L4 智能编排层:  ████████████████░░░░  80%  
L3 工具感知层:  ██░░░░░░░░░░░░░░░░░░  10%  ⬅️ 当前重点
L2 运行时层:   █████████████████░░░  85%  
L1 记忆存储层:  ██████████░░░░░░░░░░  50%  ⬅️ 当前重点
```

**当前开发重点**:
1. **Memory 文件化**: 将 localStorage 改为文件存储
2. **Tools 实现**: WebSearch、GitOperator、VditorBridge
3. **API 实现**: BFF 层文件 CRUD、Git 操作接口
