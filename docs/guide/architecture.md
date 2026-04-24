# 架构设计

本文档介绍 MetaBlog 的系统架构、核心模块和数据流。

---

## 🏛️ 整体架构

MetaBlog 采用 **VitePress 前端 + Express BFF 后端** 的混合架构。VitePress 负责博客页面渲染，同时通过 Vite 插件内嵌 Express 服务器提供 BFF API。

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  博客页面     │  │  AI 聊天      │  │  Agent 面板   │      │
│  │  (VitePress) │  │  (Vue SPA)    │  │  (Vue SPA)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │    Vite Dev Server │
                    │  (VitePress 集成)  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Express BFF 中间件                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/chat    │  │ /api/sandbox │  │ /api/files   │      │
│  │ AI 对话路由   │  │ 代码沙箱     │  │ 文件操作     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/lark    │  │ /api/yuque   │  │ /api/github  │      │
│  │ 飞书 API 代理 │  │ 语雀 API 代理 │  │ GitHub 代理  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/platform│  │ /api/agent   │  │ /api/mcp     │      │
│  │ 平台解析      │  │ Agent 管理    │  │ MCP 管理      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      外部服务层                              │
│  DeepSeek  Kimi  Zhipu  OpenAI  飞书  语雀  GitHub  ...    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 前端架构

### VitePress 集成

VitePress 作为静态站点生成器，同时承载博客内容和 AI 应用：

```
vitepress/
├── config.ts              # VitePress 配置（含 BFF 插件注册）
├── theme/                 # 自定义主题
│   ├── components/        # Vue 组件
│   │   └── ai-chat/       # AI 聊天相关组件
│   │       ├── ChatInterface.vue
│   │       ├── MessageBubble.vue
│   │       ├── AgentPanel.vue
│   │       └── ...
│   ├── tools/             # 工具系统
│   │   ├── article/       # 文章管理工具
│   │   ├── github/        # GitHub 工具
│   │   ├── lark/          # 飞书工具（按功能分类：doc.ts, wiki.ts, ...）
│   │   ├── yuque/         # 语雀工具（按功能分类：repo.ts, doc.ts, ...）
│   │   ├── registry.ts    # 工具注册表
│   │   └── index.ts       # 统一入口
│   ├── composables/       # Vue 组合式函数
│   ├── services/          # 前端服务层
│   └── stores/            # Pinia 状态管理
└── utils/                 # 工具函数
```

### AI 聊天模块

```
src/theme/components/ai-chat/
├── ChatInterface.vue      # 聊天界面主容器
├── MessageBubble.vue      # 消息气泡（支持工具调用展示）
├── ChatInput.vue          # 输入框
├── AgentPanel.vue         # Agent 配置面板
├── ToolTester.vue         # 工具测试平台
├── EntityLinkCard.vue     # 实体链接卡片
├── TypewriterText.vue     # 打字机效果
└── ...
```

---

## 🔧 后端 BFF 架构

后端通过 VitePress 的 `vite.plugin` 配置嵌入 Express 中间件：

```typescript
// .vitepress/config.ts
vite: {
  plugins: [
    metaBlogRoutingPlugin(),   // 路由注册
    metaBlogBffPlugin(),       // BFF API 注册
  ]
}
```

### 路由组织

```
server/
├── routes/
│   ├── chat.ts              # AI 对话路由（/api/chat/*）
│   ├── init.ts              # 初始化路由 + 文件操作 API
│   ├── lark.ts              # 飞书 API 代理
│   ├── yuque.ts             # 语雀 API 代理
│   ├── github.ts            # GitHub API 代理
│   ├── sandbox.ts           # 代码沙箱执行
│   ├── platform-parser.ts   # 平台链接解析
│   └── ...
├── sandbox/
│   ├── monty-runner.py      # Python 沙箱（Monty）
│   └── js-runner.js         # JS 沙箱（vm.runInNewContext）
├── middleware/              # Express 中间件
└── utils/                   # 后端工具函数
```

### 核心 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat/completions` | POST | AI 对话（流式/非流式） |
| `/api/chat/models` | GET | 获取可用模型列表 |
| `/api/sandbox/exec` | POST | 代码沙箱执行 |
| `/api/files/read` | GET | 读取文件内容 |
| `/api/files/save` | POST | 保存文件 |
| `/api/files/delete` | POST | 删除文件（支持软删除） |
| `/api/files/trash` | GET | 获取回收站列表 |
| `/api/files/restore` | POST | 恢复回收站文件 |
| `/api/lark/*` | - | 飞书 API 代理 |
| `/api/yuque/*` | - | 语雀 API 代理 |
| `/api/github/*` | - | GitHub API 代理 |

---

## 📊 数据流

### AI 对话数据流

```
用户输入
    ↓
ChatInterface.vue
    ↓
aiService.ts (前端服务层)
    ↓
POST /api/chat/completions
    ↓
chat.ts (后端路由)
    ↓
选择 Provider → 调用 AI API
    ↓
流式响应 ← 工具调用决策
    ↓
如需工具调用：
    executeTool() → 工具执行
    ↓
工具结果返回给 AI
    ↓
AI 生成最终回复
    ↓
流式传输到前端
    ↓
MessageBubble.vue 渲染
```

### 文件操作数据流

```
AI 调用 create_article / update_article
    ↓
工具执行器（前端）
    ↓
POST /api/files/save
    ↓
init.ts (安全校验 + 写入文件)
    ↓
gitCommit() → 自动 Git 提交
    ↓
返回成功结果
```

---

## 🔐 安全设计

### 文件操作安全

1. **路径遍历防护**：禁止 `..` 路径
2. **板块边界校验**：AI 只能操作 `posts`、`knowledge`、`resources` 板块
3. **路径范围限制**：文件操作被限制在 `docs/` 目录内
4. **软删除机制**：删除的文件进入 `.trash/` 回收站，保留 30 天

### API Key 安全

1. **服务端代理**：所有 AI API 调用通过后端路由代理，前端不直接暴露 Key
2. **环境变量隔离**：使用 `LLM_` 前缀的变量，不暴露给前端
3. **Vite `envPrefix`**：仅暴露 `VITE_` 和 `LLM_` 前缀变量

### 代码沙箱安全

| 语言 | 隔离机制 | 限制 |
|------|---------|------|
| Python | Monty 解释器（无文件/网络访问） | 30s 超时，1MB 输出 |
| JavaScript | vm.runInNewContext + 独立子进程 | 同上 |
| Bash | 白名单命令过滤 | 同上 |

---

## 📁 数据存储

### 运行时数据（`.data/`）

```
.data/
├── agents/                # Agent 配置
├── sessions/              # 聊天会话记录
├── memories/              # Agent 记忆
├── messages/              # 消息历史
├── skills/                # Skill 定义
└── logs/                  # 运行时日志
```

### 博客内容（`docs/sections/`）

```
docs/sections/
├── posts/                 # 博客文章
├── knowledge/             # 知识库（结构化内容）
├── resources/             # 公开资源
└── about/                 # 关于页面（AI 不可操作）
```

---

## 🔄 模块间通信

### 前端内部

- **Props/Events**：父子组件通信
- **Pinia Stores**：全局状态（会话、Agent 配置）
- **Event Bus**：工具调用结果通知（简化版）

### 前后端通信

- **REST API**：文件操作、工具执行
- **SSE (Server-Sent Events)**：AI 流式响应
- **WebSocket**：预留（暂未使用）
