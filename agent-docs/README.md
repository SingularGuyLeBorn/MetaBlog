# MetaBlog 技术文档

欢迎来到 MetaBlog 技术文档中心！这里包含了项目的完整架构设计、组件说明和使用场景。

## 文档结构

```
agent-docs/
├── README.md                          # 本文档
├── how-agents-know-skills-and-tools.md # 模型如何知道 Skills 和 Tools
├── architecture/                      # 架构设计
│   ├── 01-overview.md                # 系统架构概览
│   └── 02-backend-services.md        # 后端服务详细设计
├── components/                        # 组件设计
│   ├── 01-ai-chat-system.md          # AI 聊天系统组件
│   └── 02-tool-system.md             # 工具系统详细设计
├── scenarios/                         # 使用场景
│   ├── 01-content-research.md        # 场景一：内容研究与自动整理
│   ├── 02-social-media-monitor.md    # 场景二：社交媒体监控与内容聚合
│   ├── 03-github-code-review.md      # 场景三：GitHub 代码审查与文档生成
│   ├── 04-multimodal-chat.md         # 场景四：多模态 AI 对话
│   └── 05-rich-article-creation.md   # 场景五：富文本文章创作
└── plans/                            # 开发计划
    └── steps/                        # 开发步骤
```

## 快速导航

### 🏗️ 架构设计

| 文档 | 内容 |
|------|------|
| [系统架构概览](architecture/01-overview.md) | 整体架构、技术栈、数据流、目录结构 |
| [后端服务设计](architecture/02-backend-services.md) | Agent 管理、MCP 服务、Scheduler、EventBus、Master Tools |

### 🧩 组件设计

| 文档 | 内容 |
|------|------|
| [AI 聊天系统](components/01-ai-chat-system.md) | 工具系统、技能系统、服务层、聊天模块、状态管理 |
| [工具系统](components/02-tool-system.md) | 工具注册表、40+工具详解、开发指南、调试方法 |

### 🎬 使用场景

| 场景 | 描述 | 关键技术 |
|------|------|---------|
| [内容研究与自动整理](scenarios/01-content-research.md) | 自动搜索、解析、生成文章 | web_search、parse_platform_link、create_rich_article |
| [社交媒体监控](scenarios/02-social-media-monitor.md) | 多平台监控、定时简报 | parse_multiple_links、EventBus、Scheduler |
| [GitHub 代码审查](scenarios/03-github-code-review.md) | 自动 PR 审查、生成报告 | github_*、analyze_code、EventBus |
| [多模态 AI 对话](scenarios/04-multimodal-chat.md) | 图片/视频理解、分析 | multimediaService、Kimi API |
| [富文本文章创作](scenarios/05-rich-article-creation.md) | 图文并茂、代码、链接 | create_rich_article、insert_images |

## 核心功能一览

### 1. MCP 系统
- ✅ 完整 CRUD API
- ✅ 数据持久化到 `.data/mcp-servers.json`
- ✅ 支持 HTTP/SSE/Stdio/WebSocket 传输
- ✅ 内置 20+ 预设（GitHub、知乎、小红书、B站等）

### 2. 社交媒体解析
支持 10+ 平台：知乎、小红书、微信公众号、B站、抖音、CSDN、掘金、微博、Twitter、YouTube

### 3. Kimi 多模态
- ✅ 图片理解（PNG/JPEG/WebP/GIF）
- ✅ 视频理解（MP4/MOV/WebM/AVI）
- ✅ Base64 编码传输
- ✅ 视频缩略图生成

### 4. 富文本创作
- ✅ 图文并茂文章（create_rich_article）
- ✅ 批量图片插入（insert_images）
- ✅ 带链接文章（create_linked_article）
- ✅ 样式格式化（format_rich_media）

### 5. 调度系统
- ✅ 定时触发（Cron 表达式）
- ✅ 事件触发（文件变化）
- ✅ Webhook 触发
- ✅ Master Tools 系统管理

## 快速开始

### 查看架构设计
```bash
# 阅读系统架构
agent-docs/architecture/01-overview.md

# 阅读后端服务
agent-docs/architecture/02-backend-services.md
```

### 了解组件设计
```bash
# 阅读 AI 聊天系统
agent-docs/components/01-ai-chat-system.md

# 阅读工具系统
agent-docs/components/02-tool-system.md
```

### 学习使用场景
```bash
# 内容研究场景
agent-docs/scenarios/01-content-research.md

# 社交媒体监控
agent-docs/scenarios/02-social-media-monitor.md

# GitHub 代码审查
agent-docs/scenarios/03-github-code-review.md

# 多模态对话
agent-docs/scenarios/04-multimodal-chat.md

# 富文本创作
agent-docs/scenarios/05-rich-article-creation.md
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 文档框架 | VitePress |
| 状态管理 | Pinia |
| 后端服务 | Node.js + Express |
| 定时任务 | node-cron |
| 文件监听 | chokidar |
| 数据存储 | JSON 文件 |

## 核心概念

### Agent
Agent 是 MetaBlog 的核心概念，代表一个具有特定能力的 AI 助手。每个 Agent 可以：
- 拥有不同的模型配置（Kimi、Deepseek 等）
- 绑定特定的 Skills（技能组合）
- 配置触发器（定时、事件、手动）
- 拥有独立的记忆

### Skill
Skill 是工具的语义化组合，定义了 Agent 在特定场景下的工作流程。例如：
- **文章管理 Skill**：包含搜索、读取、创建文章的工具
- **代码审查 Skill**：包含代码分析、GitHub 操作的工具

### Tool
Tool 是 Agent 可以调用的具体功能，使用 OpenAI Function Calling 格式定义。例如：
- `get_article_content`：获取文章内容
- `parse_zhihu`：解析知乎链接
- `create_rich_article`：创建富文本文章

### MCP
Model Context Protocol（MCP）是标准化的 AI 工具扩展协议，允许连接外部服务（GitHub、数据库等）。

## 开发指南

### 添加新工具
1. 在 `definitions.ts` 定义工具 Schema
2. 在 `executors-legacy.ts` 实现工具逻辑
3. 在 `index.ts` 注册工具

### 添加新 Skill
1. 在 `skills/` 创建 Skill 文件
2. 定义元数据和绑定工具
3. 在 `registry.ts` 注册

### 创建新 Agent
1. 调用 `sys_create_agent` 工具
2. 或直接在 `agents.json` 添加配置

## 贡献指南

欢迎提交 Issue 和 PR！

## 许可证

ISC
