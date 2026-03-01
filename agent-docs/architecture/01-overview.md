# MetaBlog 系统架构概览

## 项目简介

MetaBlog 是一个 AI 驱动的智能博客系统，集成了多 Agent 管理、MCP 扩展、社交媒体内容解析、多模态 AI 对话等先进功能。

## 核心特性

- 🤖 **多 Agent 系统**：支持多个专业 Agent，每个 Agent 拥有不同的技能和工具
- 🔌 **MCP 扩展**：通过 Model Context Protocol 连接外部服务（GitHub、知乎、B站等）
- 🌐 **社交媒体解析**：支持 10+ 平台的内容提取（知乎、小红书、B站、抖音等）
- 🖼️ **多模态 AI**：支持图片、视频理解（Kimi 模型）
- 📝 **富文本编辑**：图文并茂的文章创作工具
- ⏰ **定时调度**：Cron 表达式支持的自动化任务
- 📡 **事件驱动**：文件变化触发 Agent 自动执行

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 文档框架 | VitePress |
| 状态管理 | Pinia |
| UI 组件 | 自定义组件库 |
| 后端服务 | Node.js + Express |
| 定时任务 | node-cron |
| 文件监听 | chokidar |
| 数据存储 | JSON 文件（.data/）|

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户界面层                                │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│  文章管理    │  AI 聊天    │ Agent 配置  │   MCP 管理            │
│  (VitePress) │  (Vue3)     │  (Vue3)     │   (Vue3)              │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────┬───────────┘
│                 │              │                   │
│                 ▼              ▼                   ▼
│         ┌─────────────────────────────────────────────────────┐
│         │              AI 核心层 (AI-Core)                      │
│         │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐  │
│         │  │ 工具系统 │ │ Skills  │ │ 记忆系统 │ │ 会话管理   │  │
│         │  │Registry │ │Registry │ │ Memory  │ │  Session   │  │
│         │  └────┬────┘ └────┬────┘ └────┬────┘ └─────┬──────┘  │
│         └───────┼──────────┼──────────┼────────────┼─────────┘
│                 │          │          │            │
│                 ▼          ▼          ▼            ▼
│         ┌─────────────────────────────────────────────────────┐
│         │              服务层 (Services)                        │
│         │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐  │
│         │  │AIService│ │Scheduler│ │EventBus │ │MasterTools │  │
│         │  │(AI调用) │ │(定时器) │ │(事件)   │ │(系统工具)  │  │
│         │  └────┬────┘ └────┬────┘ └────┬────┘ └─────┬──────┘  │
│         └───────┼──────────┼──────────┼────────────┼─────────┘
│                 │          │          │            │
│                 ▼          ▼          ▼            ▼
│         ┌─────────────────────────────────────────────────────┐
│         │              API 层 (Routes)                          │
│         │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐  │
│         │  │/api/chat│ │/api/mcp │ │/api/agents│ │/api/upload│  │
│         │  │(聊天)   │ │(MCP管理)│ │(Agent管理)│ │(文件上传)  │  │
│         │  └────┬────┘ └────┬────┘ └────┬────┘ └─────┬──────┘  │
│         └───────┼──────────┼──────────┼────────────┼─────────┘
│                 │          │          │            │
│                 ▼          ▼          ▼            ▼
│         ┌─────────────────────────────────────────────────────┐
│         │              数据层 (Data)                            │
│         │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────────┐  │
│         │  │agents.  │ │mcp-     │ │skills.  │ │ memories/  │  │
│         │  │json     │ │servers. │ │json     │ │            │  │
│         │  │         │ │json     │ │         │ │            │  │
│         │  └─────────┘ └─────────┘ └─────────┘ └────────────┘  │
│         └─────────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────────┘
```

## 模块划分

### 1. 文章管理模块 (Article Management)
- **功能**：Markdown 文件的 CRUD 操作
- **路径**：`server/routes/articles.ts`
- **前端**：VitePress 内置 + Vditor 编辑器

### 2. AI 聊天模块 (AI Chat)
- **功能**：多 Agent 对话、流式输出、工具调用
- **路径**：`.vitepress/theme/components/ai-chat/`
- **核心**：AI Service、Tool Registry、Skill Registry

### 3. Agent 管理模块 (Agent Management)
- **功能**：创建、配置、删除 Agent，权限管理
- **路径**：`server/routes/agents.ts`
- **特性**：Master Agent 保护机制

### 4. MCP 模块 (Model Context Protocol)
- **功能**：外部服务连接、工具扩展
- **路径**：`server/routes/mcp.ts`
- **支持**：HTTP/SSE/Stdio/WebSocket

### 5. 调度模块 (Scheduler)
- **功能**：定时任务、Cron 表达式
- **路径**：`server/services/Scheduler.ts`
- **依赖**：node-cron

### 6. 事件模块 (EventBus)
- **功能**：文件监听、事件触发
- **路径**：`server/services/EventBus.ts`
- **依赖**：chokidar

## 数据流

### 用户请求处理流程

```
用户输入
    ↓
前端组件 (Vue)
    ↓
AI Service (构建 Prompt + Tools)
    ↓
LLM API (OpenAI/Deepseek/Kimi)
    ↓
工具调用? ──Yes──→ 工具执行 → 结果返回 LLM
    ↓ No
流式输出到前端
    ↓
渲染消息 (Markdown + Trace)
```

### Agent 触发流程

```
触发源：
- 手动触发（用户点击）
- 定时触发（Scheduler）
- 事件触发（EventBus：文件变化）
- Webhook 触发

    ↓

Agent 执行：
1. 加载 Agent 配置（skills、tools、systemPrompt）
2. 构建系统提示词
3. 调用 LLM
4. 执行工具（如果需要）
5. 生成最终结果
6. 保存到记忆/文章
```

## 目录结构

```
MetaBlog/
├── .data/                      # 数据存储
│   ├── agents.json            # Agent 配置
│   ├── mcp-servers.json       # MCP 服务器配置
│   ├── skills.json            # Skills 配置
│   └── memories/              # 长期记忆存储
│
├── .vitepress/                # VitePress 配置
│   ├── theme/
│   │   ├── components/        # 组件
│   │   │   ├── ai-chat/      # AI 聊天核心
│   │   │   ├── Dashboards/   # 仪表盘
│   │   │   └── ui/           # UI 组件库
│   │   ├── composables/      # 组合式函数
│   │   ├── services/         # 前端服务
│   │   └── stores/           # Pinia 状态管理
│   └── config.ts             # VitePress 配置
│
├── server/                     # 后端服务
│   ├── routes/                # API 路由
│   │   ├── agents.ts         # Agent API
│   │   ├── mcp.ts            # MCP API
│   │   ├── articles.ts       # 文章 API
│   │   └── upload.ts         # 文件上传 API
│   └── services/             # 后端服务
│       ├── Scheduler.ts      # 定时任务
│       ├── EventBus.ts       # 事件总线
│       └── MasterTools.ts    # Master 工具
│
├── docs/                       # 博客内容
├── agent-docs/                # 项目文档
│   ├── architecture/         # 架构文档
│   ├── components/           # 组件文档
│   ├── scenarios/            # 使用场景
│   └── plans/                # 开发计划
│
└── model-reference/          # 模型参考文档
    ├── kimi/                 # Kimi API 文档
    └── deepseek/             # Deepseek API 文档
```

## 核心技术决策

### 1. 为什么选择文件存储而不是数据库？
- **原因**：博客系统天然适合文件存储（Markdown 文件）
- **优势**：
  - 版本控制友好（Git 管理）
  - 易于备份和迁移
  - 符合内容管理直觉
  - 无需部署数据库服务

### 2. 为什么使用 MCP 协议？
- **原因**：标准化的 AI 工具扩展协议
- **优势**：
  - 生态丰富（GitHub、Slack、数据库等）
  - 统一接口，易于扩展
  - 与 Claude Code 等工具兼容

### 3. 为什么采用多 Agent 架构？
- **原因**：单一 Agent 难以应对复杂场景
- **优势**：
  - 专业化分工（写作 Agent、代码 Agent、分析 Agent）
  - 隔离上下文，减少干扰
  - 可组合、可复用

## 扩展点

### 添加新工具
1. 在 `tools/definitions.ts` 定义工具 Schema
2. 在 `tools/executors-legacy.ts` 实现工具逻辑
3. 在 `tools/index.ts` 注册工具

### 添加新 Skill
1. 在 `skills/` 目录创建 Skill 文件
2. 定义 Skill 元数据和绑定工具
3. 在 `skills/registry.ts` 注册

### 添加新 Agent
1. 调用 `sys_create_agent` 工具
2. 或直接在 `agents.json` 添加配置
3. 配置 triggers、skills、permissions

## 性能优化

- **流式输出**：SSE 实时推送 AI 响应
- **懒加载**：动态导入大型组件
- **缓存**：Agent 配置、工具定义缓存
- **防抖**：输入框、搜索等频繁操作

## 安全考虑

- **文件访问限制**：只能访问项目目录
- **Master Agent 保护**：防止误删核心 Agent
- **工具权限控制**：高危操作需要确认
- **输入验证**：所有 API 参数校验
