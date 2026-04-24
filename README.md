# MetaBlog — AI 驱动的智能博客与 Agent 平台

<p align="center">
  <strong>从静态博客到自主 Agent 的演进</strong>
</p>

<p align="center">
  <a href="./docs/guide/quickstart.md">快速开始</a> •
  <a href="./project/docs/architecture.md">架构设计</a> •
  <a href="./docs/guide/tools.md">工具系统</a> •
  <a href="./docs/guide/agent-system.md">Agent 系统</a> •
  <a href="./project/requirements/backlog.md">需求清单</a>
</p>

---

## 🎯 项目简介

MetaBlog 是一个将**静态博客**、**AI 对话**和**自主 Agent**融为一体的知识管理平台。它基于 VitePress 构建博客前端，内嵌完整的 AI 聊天系统和工具调用框架，让 AI 不仅能回答问题，还能直接操作博客内容、管理代码、集成外部平台。

### 核心能力

| 能力 | 说明 |
|------|------|
| 📝 **智能博客** | VitePress 驱动的 Markdown 博客，支持数学公式、代码高亮、Wiki 链接 |
| 🤖 **AI 对话** | 多模型支持（DeepSeek/Kimi/Zhipu/OpenAI 等），流式响应，思考过程展示 |
| 🛠️ **工具调用** | 55+ 内置工具 + MCP 外部扩展，AI 可直接操作文件、GitHub、飞书、语雀等 |
| 🧪 **代码沙箱** | 后端安全执行 Python/JavaScript/Bash，支持数学计算和代码验证 |
| 👤 **Agent 系统** | 多 Agent 管理、Skill 技能组合、独立会话、工具权限控制 |

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd MetaBlog

# 安装依赖
pnpm install
```

### 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env
```

编辑 `.env`，至少配置以下项：

```env
# AI 模型（必填一项）
LLM_DEEPSEEK_API_KEY=sk-your-key-here
# 或 LLM_KIMI_API_KEY=...
# 或 LLM_OPENAI_API_KEY=...

# 飞书集成（可选）
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx

# 语雀集成（可选）
YUQUE_SESSION=xxx
YUQUE_CTOKEN=xxx
```

> 📖 完整环境变量说明见 [docs/guide/environment.md](./docs/guide/environment.md)

### 启动开发服务器

```bash
pnpm docs:dev
```

访问：
- 博客首页：`http://localhost:5173`
- AI 助手：`http://localhost:5173/chat`

### 构建生产版本

```bash
pnpm docs:build
pnpm docs:preview
```

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      VitePress 前端层                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   博客页面    │  │  AI 聊天界面  │  │ Agent 控制台  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Express BFF 层                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  /api/chat   │  │ /api/sandbox │  │ /api/tools   │      │
│  │  AI 路由     │  │ 代码沙箱     │  │ 工具路由     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/lark    │  │ /api/yuque   │  │ /api/github  │      │
│  │ 飞书集成     │  │ 语雀集成     │  │ GitHub 代理  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      外部服务层                              │
│  DeepSeek  Kimi  Zhipu  OpenAI  飞书  语雀  GitHub  ...    │
└─────────────────────────────────────────────────────────────┘
```

> 详细架构见 [docs/guide/architecture.md](./docs/guide/architecture.md)

---

## 🛠️ 工具系统

内置 **55+** 工具，覆盖 12 个类别：

| 类别 | 代表工具 | 数量 |
|------|---------|------|
| 文章管理 | `create_article`, `update_article`, `search_articles` | 6 |
| GitHub | `github_get_repo`, `github_search_code`, `github_get_issues` | 6 |
| 飞书 | `feishu_doc_create`, `feishu_doc_append`, `feishu_im_send` | 10 |
| 语雀 | `yuque_doc_create`, `yuque_doc_update`, `yuque_image_upload` | 9 |
| 网络 | `web_search`, `fetch_url` | 2 |
| 代码 | `execute_code`, `analyze_code` | 2 |
| 文件 | `read_file`, `write_file`, `list_files` | 3 |
| 平台解析 | `parse_zhihu`, `parse_xiaohongshu`, `ocr_image` | 5 |
| 文本处理 | `summarize_text`, `translate_text`, `format_text` | 4 |
| 系统 | `get_current_time`, `get_weather`, `calculate` | 4 |
| 知识库 | `kb_create`, `kb_query`, `kb_document_add` | 7 |

**MCP 扩展**：通过 MCP (Model Context Protocol) 接入外部工具，支持 GitHub、Slack、Notion、数据库等 20+ 预设配置。

> 完整工具文档见 [docs/guide/tools.md](./docs/guide/tools.md)

---

## 🤖 Agent 系统

- **多 Agent 管理**：创建、编辑、删除多个 AI Agent
- **四种配置模式**：纯提示词 / 纯技能 / 纯工具 / 混合模式
- **Skill 技能组合**：预设能力包（写作专家、编程助手、数据分析师等）
- **独立会话**：每个 Agent 拥有独立的对话历史
- **工具权限**：精细控制每个 Agent 可用的工具集合

> 详细说明见 [docs/guide/agent-system.md](./docs/guide/agent-system.md)

---

## 💻 代码沙箱

后端安全执行环境，支持三种语言：

| 语言 | 执行方式 | 安全特性 |
|------|---------|---------|
| Python | Monty 解释器 | 无文件/网络访问，纯计算环境 |
| JavaScript | vm.runInNewContext | 独立上下文，无全局污染 |
| Bash | 白名单命令过滤 | 仅允许安全命令 |

限制：30 秒超时、1MB 输出上限、50KB 代码长度限制。

---

## 📚 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + VitePress 1.x |
| 样式 | Tailwind CSS 3.x + 自定义 CSS |
| 状态管理 | Pinia + Vue Composition API |
| 后端 BFF | Express 5.x（VitePress 插件集成） |
| AI 服务 | DeepSeek / Kimi / Zhipu / OpenAI / Gemini / Anthropic / Qwen / ... |
| 包管理 | pnpm |
| 构建工具 | Vite 5.x |

---

## 📖 文档导航

| 文档 | 内容 |
|------|------|
| [快速开始](./docs/guide/quickstart.md) | 安装、配置、启动、常见问题 |
| [架构设计](./project/docs/architecture.md) | 系统架构、数据流、模块说明 |
| [开发路线图](./project/docs/roadmap.md) | 近期/中期/长期开发计划 |
| [工具系统](./docs/guide/tools.md) | 工具列表、使用示例、自定义工具开发 |
| [Agent 系统](./docs/guide/agent-system.md) | Agent 配置、Skill 开发、会话管理 |
| [开发指南](./docs/guide/development.md) | 目录结构、开发规范、调试技巧 |
| [环境变量](./docs/guide/environment.md) | 完整环境变量说明与配置示例 |
| [需求清单](./project/requirements/backlog.md) | 功能需求 backlog |
| [已完成](./project/requirements/completed.md) | 已完成需求记录 |

---

## 📝 许可证

MIT License

---

<p align="center">
  <em>让 AI 成为博客的共创者，而不只是对话者</em>
</p>
