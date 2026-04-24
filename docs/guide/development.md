# 开发指南

本文档面向开发者，介绍 MetaBlog 的开发规范、调试技巧和贡献流程。

---

## 📁 目录结构详解

```
MetaBlog/
├── .data/                     # 运行时数据（Git 忽略）
│   ├── agents/                # Agent 配置
│   ├── sessions/              # 会话记录
│   ├── memories/              # Agent 记忆
│   └── logs/                  # 运行日志
│
├── .vitepress/                # VitePress 配置与主题
│   ├── config.ts              # 主配置（含 BFF 插件）
│   ├── theme/                 # 自定义主题组件
│   │   ├── components/        # Vue 组件
│   │   │   └── ai-chat/       # AI 聊天组件
│   │   ├── tools/             # 工具系统
│   │   ├── composables/       # Vue 组合式函数
│   │   ├── services/          # 前端服务层
│   │   ├── stores/            # Pinia 状态管理
│   │   └── utils/             # 工具函数
│   └── utils/                 # VitePress 工具函数
│
├── bin/                       # CLI 工具
│   └── meta-agent-cli.ts      # Meta-Agent CLI
│
├── docs/                      # VitePress 内容目录
│   ├── sections/              # 博客文章分类
│   │   ├── posts/             # 博客文章
│   │   ├── knowledge/         # 知识库
│   │   ├── resources/         # 公开资源
│   │   └── about/             # 关于页面
│   ├── public/                # 静态资源
│   ├── guide/                 # 项目文档（本文档）
│   └── index.md               # 博客首页
│
├── server/                    # BFF 后端
│   ├── routes/                # API 路由
│   ├── sandbox/               # 代码沙箱
│   ├── middleware/            # Express 中间件
│   ├── utils/                 # 后端工具
│   └── vitepress-integration.ts  # VitePress 集成插件
│
├── src/                       # 前端源码（VitePress 主题）
│   └── theme/                 # 主题代码
│       ├── components/        # Vue 组件
│       ├── tools/             # 工具系统
│       ├── composables/       # 组合式函数
│       ├── services/          # 服务层
│       ├── stores/            # Pinia 存储
│       ├── types/             # TypeScript 类型
│       └── utils/             # 工具函数
│
├── tests/                     # 测试套件
│   └── markdown-to-blocks.test.ts  # Markdown 转飞书块测试
│
├── scripts/                   # 构建脚本
│   ├── migrate-data.cjs       # 数据迁移
│   └── structure-checker.js   # 文档结构检查
│
├── project/                   # 实验与原型
│   ├── experiments/           # API 实验（飞书、语雀、GitHub 等）
│   ├── docs/                  # 项目文档
│   └── requirements/          # 需求文档
│
├── .env                       # 环境变量（Git 忽略）
├── package.json
└── README.md
```

---

## 🎯 开发规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件 | kebab-case | `message-bubble.vue`, `ai-service.ts` |
| 组件 | PascalCase | `MessageBubble.vue`, `AgentPanel.vue` |
| 函数/变量 | camelCase | `executeTool`, `toolResult` |
| 常量 | SCREAMING_SNAKE_CASE | `RESULT_TRUNCATE_LENGTH` |
| 类型/接口 | PascalCase | `ToolDefinition`, `AgentConfig` |
| 工具名 | snake_case | `create_article`, `feishu_doc_create` |

### 代码风格

- 使用 **TypeScript** 严格模式
- Vue 组件使用 `<script setup lang="ts">`
- 优先使用 Vue Composition API
- 异步操作使用 `async/await`
- 错误处理必须包含用户友好的中文提示

### 工具开发规范

1. **定义文件**（`definitions.ts`）：
   - `description` 必须清晰，让 AI 知道何时调用
   - 每个参数都要有 `description`
   - `required` 必须包含所有不可省略的参数

2. **执行器文件**（`executors.ts`）：
   - 必须做参数校验
   - 使用 `createSuccessResult` / `createErrorResult` 返回
   - 错误信息需要中英文双语

3. **注册文件**（`index.ts`）：
   - 统一导出定义和执行器
   - 在 `src/theme/tools/index.ts` 中注册

---

## 🐛 调试技巧

### 前端调试

1. **Vue DevTools**：安装浏览器扩展，查看组件状态和 Pinia store
2. **控制台日志**：关键流程已添加日志，搜索 `[EntityLink]`、`[Tool]`、`[Agent]` 等前缀
3. **Network 面板**：查看 `/api/*` 请求和响应

### 后端调试

后端日志使用结构化日志系统，格式如下：

```
[类别] 操作: 描述 {metadata}
```

例如：
```
[api.request] GET /api/chat/models
[api.response] GET /api/chat/models - 200 (45ms)
[file.saved] File saved: sections/posts/new-article.md
```

### 常见问题调试

| 问题 | 调试方法 |
|------|---------|
| AI 不调用工具 | 检查工具定义 `description` 是否清晰；检查工具是否正确注册 |
| 工具执行失败 | 查看浏览器 Network 面板；查看后端控制台错误日志 |
| 文件保存失败 | 检查路径是否包含 `..`；检查是否在允许的板块内 |
| 沙箱执行失败 | 检查本地 Python/Node 是否安装；查看 `/api/sandbox/exec` 响应 |

---

## 🧪 测试

### 单元测试

```bash
# 运行测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 仅运行一次
pnpm test:run
```

### 工具测试

使用内置的 ToolTester 组件：

1. 访问 `/chat` 页面
2. 打开工具测试面板
3. 选择工具并填写参数
4. 执行测试

### 结构检查

```bash
# 检查文档结构完整性
pnpm check:structure

# 干运行（不修复）
pnpm check:structure:dry

# 详细输出
pnpm check:structure:verbose
```

---

## 🔄 开发工作流

### 添加新功能

1. **创建分支**：
   ```bash
   git checkout -b feature/my-feature
   ```

2. **开发**：
   - 前端代码在 `src/theme/`
   - 后端代码在 `server/`
   - 文档在 `docs/guide/`

3. **测试**：
   - 本地运行 `pnpm docs:dev`
   - 使用 ToolTester 测试工具
   - 运行 `pnpm test`

4. **提交**：
   ```bash
   git add .
   git commit -m "feat: 添加 xxx 功能"
   ```

### 添加新工具

参考 [工具系统 - 自定义工具开发](./tools.md#自定义工具开发)。

### 添加新文档

1. 在 `docs/guide/` 下创建 `.md` 文件
2. 在 `docs/guide/index.md` 中添加链接
3. 在 `README.md` 中更新文档导航

---

## 📝 日志规范

### 前端日志

使用 `console.log` 时添加前缀，便于过滤：

```typescript
console.log('[Tool] executing:', toolName)
console.log('[Agent] switching to:', agentId)
console.log('[Chat] message sent:', messageId)
```

### 后端日志

使用系统日志对象：

```typescript
system.info('category.action', '描述', { metadata })
system.debug('category.action', '描述')
system.warn('category.action', '描述')
system.error('category.action', '描述')
```

---

## 🔧 环境变量开发

开发时需要注意的环境变量：

| 变量 | 开发用途 |
|------|---------|
| `LLM_DEFAULT_PROVIDER` | 指定默认 AI Provider |
| `LLM_DAILY_BUDGET` | 限制每日 API 花费 |
| `HTTP_PROXY` | 开发时如需代理 |

修改 `.env` 后需要重启开发服务器才能生效。

---

## 📦 依赖管理

使用 pnpm：

```bash
# 安装依赖
pnpm add <package>

# 安装开发依赖
pnpm add -D <package>

# 更新依赖
pnpm update

# 清理缓存
pnpm store prune
```

---

## 🌐 浏览器兼容性

- **Chrome** 90+
- **Firefox** 90+
- **Edge** 90+
- **Safari** 14+

需要支持：ES2020、CSS Grid、Fetch API、WebSocket
