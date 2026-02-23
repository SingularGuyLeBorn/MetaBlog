# MetaBlog - AI 驱动的智能博客系统

<p align="center">
  <img src="./docs/public/logo.png" width="120" alt="MetaBlog Logo">
</p>

<p align="center">
  <strong>从静态博客到智能 Agent 的进化之路</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#架构设计">架构设计</a> •
  <a href="#开发路线图">开发路线图</a> •
  <a href="#贡献指南">贡献指南</a>
</p>

---

## 🎯 项目愿景

MetaBlog 不是一个普通的博客系统，它代表了内容管理系统向智能化 Agent 平台的演进：

| 层级 | 状态 | 描述 |
|------|------|------|
| **L1: 静态博客** | ✅ 已完成 | 基于 VitePress 的高性能博客，支持 Markdown、数学公式、代码高亮 |
| **L2: 内置 Chatbot** | ✅ 已完成 | 集成 DeepSeek AI，支持多轮对话、流式响应 |
| **L3: Agent 化** | ✅ 基本完成 | AI 可操作博客文章（增删改查），实现热更新 |
| **L4: 自主 Agent** | 🚧 规划中 | Agent 面板支持定时任务、状态监听、自主执行 |
| **L5: Meta-Agent** | 🚧 规划中 | 能创建和配置其他 Agent 的超级 Agent |
| **L6: 状态监控** | 🚧 规划中 | 实时监控 Agent 运行状态（休眠/唤醒/执行中） |

---

## ✨ 功能特性

### 🤖 AI 助手系统

- **多轮对话**：支持上下文理解的多轮对话
- **流式响应**：实时显示 AI 回复，支持打字机效果
- **思考模式**：可展示 AI 的推理过程（Chain of Thought）
- **工具调用**：AI 可调用 22+ 种工具操作博客和外部资源

### 🛠️ 强大的工具系统

#### 文章管理工具（6个）
| 工具 | 功能 | 示例 |
|------|------|------|
| `get_article_content` | 读取文章内容，支持行范围 | `get_article_content(path="/sections/posts/hello", start_line=1, end_line=50)` |
| `search_articles` | 全文搜索，支持分类筛选 | `search_articles(query="Docker", section="knowledge")` |
| `list_articles` | 列出文章，支持递归浏览 | `list_articles(folder_path="/sections/knowledge/ml/")` |
| `create_article` | 创建文章，自动 frontmatter | `create_article(title="新文章", path="posts/article.md", tags=["AI"])` |
| `update_article` | 更新文章，支持追加/插入 | `update_article(path="...", content="...", mode="append")` |
| `delete_article` | 删除文章，支持备份 | `delete_article(path="...", confirm=true, backup_first=true)` |

#### GitHub 工具（6个）
| 工具 | 功能 |
|------|------|
| `github_get_repo` | 获取仓库信息、统计、README 预览 |
| `github_list_repo_contents` | 浏览目录结构 |
| `github_get_file_content` | 读取源码文件 |
| `github_search_code` | 搜索开源代码示例 |
| `github_get_commit_history` | 查看提交历史 |
| `github_get_issues` | 查看 Issues 和讨论 |

#### 网络工具
| 工具 | 功能 |
|------|------|
| `fetch_url` | 通用 HTTP 请求（GET/POST/PUT/DELETE），支持自定义 Header 和 Body |
| `web_search` | 网络搜索（需要配置搜索引擎 API） |

#### 其他工具
- **文件操作**：`read_file`, `write_file`, `list_files`
- **代码工具**：`execute_code`, `analyze_code`
- **文本处理**：`summarize_text`, `format_text`, `translate_text`
- **系统工具**：`get_current_time`, `get_weather`, `calculate`

### 🎨 Skills 技能系统

AI 可以通过不同的 **Skills** 获得特定领域的能力：

| Skill | 描述 | 工具集 |
|-------|------|--------|
| 通用助手 | 默认对话模式 | 基础工具 |
| 写作专家 | 文章创作和编辑 | 文章管理 + 文本处理 |
| 编程助手 | 代码编写 + GitHub 集成 | 代码工具 + GitHub 全套 |
| 数据分析师 | 数据分析 + 报告生成 | 分析工具 + 文章管理 |
| 创意助手 | 头脑风暴 + 灵感记录 | 创意工具 + 知识管理 |

**内联编辑**：支持在模态框中直接编辑 Skill 的提示词和工具配置。

### 👤 Agent 控制中心

- **Agent 管理**：创建、编辑、删除 AI Agent
- **四种配置模式**：
  - 🔹 纯提示词模式：完全自定义角色
  - 🔹 纯技能模式：选择预设 Skill 组合
  - 🔹 纯工具模式：直接配置可用工具
  - 🔹 混合模式：技能 + 额外工具扩展
- **能力图谱**：可视化展示 Agent 的能力结构

### 💬 会话管理

- **会话列表**：按时间分组（今天/昨天/更早）
- **行内编辑**：直接在列表中重命名会话
- **删除确认**：美观的确认弹窗，避免误操作
- **消息版本**：支持重新生成并切换不同版本

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 9+
- DeepSeek API Key（或其他兼容 OpenAI API 的服务）

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd MetaBlog

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，添加你的 DeepSeek API Key
```

### 配置

编辑 `.env` 文件：

```env
# DeepSeek API Key（必填）
VITE_DEEPSEEK_API_KEY=your-api-key-here

# 可选：自定义 API 基础地址
VITE_DEEPSEEK_API_BASE=https://api.deepseek.com/v1
```

### 开发

```bash
# 启动开发服务器
npm run docs:dev

# 构建生产版本
npm run docs:build

# 预览生产版本
npm run docs:preview
```

### 访问

- 博客首页：`http://localhost:5173`
- AI 聊天：`http://localhost:5173/chat`

---

## 🏗️ 架构设计

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + VitePress |
| 状态管理 | Vue Composition API + Refs |
| 样式 | Tailwind CSS + 自定义 CSS |
| AI 服务 | DeepSeek API (OpenAI 兼容) |
| 数据存储 | 文件系统 + 后端 API |
| 构建工具 | Vite |

### 核心模块

```
vitepress/theme/components/ai-chat/
├── core/
│   ├── composables/      # Vue 组合式函数
│   │   ├── useAIChat.ts      # AI 对话核心
│   │   ├── useAgentConfig.ts # Agent 配置
│   │   └── useSkills.ts      # Skills 管理
│   ├── services/         # 服务层
│   │   ├── aiService.ts      # AI API 调用
│   │   ├── agentStorage.ts   # Agent 数据持久化
│   │   └── sessionLogger.ts  # 会话日志
│   ├── tools/            # 工具系统
│   │   ├── definitions.ts    # 工具定义
│   │   ├── executors.ts      # 工具执行器
│   │   └── registry.ts       # 工具注册表
│   ├── skills/           # Skills 系统
│   │   └── registry.ts       # Skills 注册表
│   ├── mcp/              # MCP Server 实现
│   │   └── index.ts          # MCP 管理器
│   └── types/            # TypeScript 类型
├── modules/
│   ├── chat/             # 聊天模块
│   │   ├── session/      # 会话面板
│   │   ├── messages/     # 消息列表
│   │   ├── input/        # 输入框
│   │   └── settings/     # 设置面板
│   └── agent/            # Agent 模块
│       ├── admin/        # Agent 管理
│       └── skills/       # Skills 管理
├── layouts/              # 布局组件
└── ui/                   # UI 组件库
```

### 数据流

```
用户输入 → AI Service → 工具调用 → 文件系统/外部 API
                ↓
            流式响应 ← 结果处理 ← 工具执行结果
```

---

## 📋 开发路线图

### L4: 自主 Agent 面板（规划中）

**目标**：让 Agent 能够自主、定时或根据博客状态执行任务

**核心功能**：
- [ ] **任务调度器**：支持定时任务（Cron 表达式）
- [ ] **事件监听**：监听文件变化、博客状态变化
- [ ] **任务队列**：管理待执行、执行中、已完成的任务
- [ ] **通知系统**：任务完成后通知用户

**实现方案**：
1. 创建 `AgentScheduler` 服务
2. 集成 `node-cron` 或类似库实现定时任务
3. 添加文件系统监听器（chokidar）
4. 设计任务存储格式（JSON/YAML）

### L5: Meta-Agent（规划中）

**目标**：创建一个能创建和配置其他 Agent 的超级 Agent

**核心功能**：
- [ ] **Agent 工厂**：通过自然语言创建新 Agent
- [ ] **权限管理**：Meta-Agent 的权限控制
- [ ] **Skill 生成器**：自动生成 Skill 定义
- [ ] **Agent 市场**：导入/导出 Agent 配置

**实现方案**：
1. 扩展 Agent 配置面板，支持"创建 Agent"工具
2. 添加 `create_agent`, `update_agent_config` 等工具
3. 设计 Agent 模板系统
4. 实现 Agent 配置的导入导出

### L6: 状态监控（规划中）

**目标**：实时监控 Agent 的运行状态

**核心功能**：
- [ ] **状态指示器**：休眠 / 即将唤醒 / 执行中
- [ ] **执行日志**：查看 Agent 的执行历史
- [ ] **性能监控**：执行时间、成功率统计
- [ ] **异常告警**：执行失败时通知

**实现方案**：
1. 创建 `AgentMonitor` 组件
2. 设计状态机：idle → scheduled → running → completed/failed
3. 添加 WebSocket 或轮询机制更新状态
4. 实现可视化仪表板

---

## 🔧 高级配置

### 自定义工具

在 `.vitepress/theme/components/ai-chat/core/tools/` 中添加：

```typescript
// definitions.ts
export const myToolDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: '我的自定义工具',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string' }
      },
      required: ['param1']
    }
  }
}

// executors.ts
export const myTool: ToolExecutor = async (args) => {
  const { param1 } = args
  // 实现工具逻辑
  return `结果: ${param1}`
}

// index.ts - 注册工具
{ name: 'my_tool', definition: myToolDef, executor: myTool }
```

### MCP Server 扩展

```typescript
import { MCPServer, mcpManager } from './core/mcp'

const myMCPServer = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  description: '我的 MCP Server'
})

myMCPServer.registerTool(
  'my_tool',
  {
    name: 'my_tool',
    description: '工具描述',
    parameters: { type: 'object', properties: {} }
  },
  async (args) => {
    return { result: 'success' }
  }
)

mcpManager.register('my-server', myMCPServer)
```

---

## 🐛 常见问题

### Q: AI 创建文章后显示 "Failed to fetch"
**A**: 这是请求体过大导致的。已修复，系统会自动截断过长的工具结果（>6000字符）。

### Q: 如何添加新的 LLM 提供商？
**A**: 修改 `aiService.ts` 中的 `API_BASE_URL` 和 `getApiKey()` 函数。

### Q: 工具调用失败怎么办？
**A**: 检查浏览器控制台的 Network 面板，查看 `/api/*` 端点的响应。

### Q: 如何备份博客数据？
**A**: 博客数据存储在 `docs/sections/` 目录下，直接备份该目录即可。

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [VitePress](https://vitepress.dev/) - 强大的静态站点生成器
- [DeepSeek](https://deepseek.com/) - 优秀的 AI 服务
- [Vue.js](https://vuejs.org/) - 渐进式前端框架

---

<p align="center">
  <strong>让 AI 成为博客的共创者，而不只是对话者</strong>
</p>
