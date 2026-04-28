# 快速开始

本文档帮助你从零开始运行 MetaBlog，并在 5 分钟内完成第一次 AI 对话。

---

## 📋 前置要求

- **Node.js** 18+(推荐 20 LTS)
- **pnpm** 8+(推荐)或 npm 9+
- 一个 AI 服务的 API Key(DeepSeek / Kimi / OpenAI 等)

### 检查环境

```bash
node -v    # v18.0.0 或更高
pnpm -v    # 8.0.0 或更高
```

---

## 🚀 安装步骤

### 1. 克隆仓库

```bash
git clone <repository-url>
cd MetaBlog
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
# 如果项目已有 .env 文件，直接编辑
# 如果没有，从示例复制(如果存在 .env.example)
cp .env.example .env  # 可选
```

编辑 `.env`，至少添加一个 AI Provider：

```env
# DeepSeek(推荐，国内可用)
LLM_DEEPSEEK_API_KEY=sk-your-key-here
LLM_DEEPSEEK_MODEL=deepseek-v4-pro
LLM_DEFAULT_PROVIDER=deepseek
```

获取 DeepSeek API Key：[https://platform.deepseek.com/](https://platform.deepseek.com/)

> 如需配置其他 Provider 或飞书/语雀集成，参考 [环境变量配置](./environment.md)。

### 4. 启动开发服务器

```bash
pnpm docs:dev
```

控制台显示以下信息即表示启动成功：

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### 5. 访问应用

- **博客首页**：`http://localhost:5173`
- **AI 助手**：`http://localhost:5173/chat`

---

## 💬 第一次 AI 对话

1. 打开 `http://localhost:5173/chat`
2. 在输入框中输入：`你好，请介绍一下自己`
3. 你应该能看到 AI 的流式回复

### 测试工具调用

尝试让 AI 使用工具：

```
请帮我搜索一下最近关于 Transformer 的论文
```

AI 会自动调用 `searchArxiv` 工具并展示结果。

### 测试代码执行

```
请计算 2 的 100 次方是多少
```

AI 会调用 `executeCode` 工具在沙箱中执行 Python 代码。

---

## 🏗️ 项目结构速览

```
MetaBlog/
├── docs/                   # VitePress 内容目录(博客文章)
│   ├── sections/           # 文章分类目录
│   │   ├── posts/          # 博客文章
│   │   ├── knowledge/      # 知识库
│   │   └── resources/      # 公开资源
│   └── public/             # 静态资源
├── src/
│   └── theme/
│       ├── components/     # Vue 组件(聊天 UI、Agent 面板等)
│       ├── tools/          # 工具系统定义与执行器
│       ├── composables/    # Vue 组合式函数
│       └── utils/          # 工具函数
├── server/
│   ├── routes/             # BFF API 路由
│   ├── sandbox/            # 代码沙箱执行器
│   └── middleware/         # 中间件
├── .data/                  # 运行时数据(Agent 状态、会话记录)
├── .env                    # 环境变量(不要提交到 Git)
└── package.json
```

---

## 🛠️ 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm docs:dev` | 启动开发服务器 |
| `pnpm docs:build` | 构建生产版本 |
| `pnpm docs:preview` | 预览生产构建 |
| `pnpm test` | 运行测试(Vitest) |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm meta-agent` | 运行 Meta-Agent CLI |
| `pnpm check:structure` | 检查文档结构完整性 |

---

## ❓ 常见问题

### Q: 启动后访问 `/chat` 页面报错

**A**: 检查 `.env` 中是否配置了至少一个 AI Provider 的 API Key。控制台会输出 `[LLM] Providers config: [...]` 显示已加载的 Provider。

### Q: AI 回复 "API Key 无效"

**A**: 
1. 确认 `.env` 中的 Key 正确且未过期
2. 确认使用了 `LLM_` 前缀(如 `LLM_DEEPSEEK_API_KEY`)
3. 重启开发服务器(修改 `.env` 后需要重启)

### Q: 工具调用失败(如 `feishuDocCreate`)

**A**: 
1. 检查对应的环境变量是否配置(如 `FEISHU_APP_ID`)
2. 查看浏览器控制台 Network 面板，查看 `/api/*` 端点的响应
3. 检查后端控制台是否有错误日志

### Q: 代码沙箱执行失败

**A**: 
1. 确认本地已安装 Python(`python --version`)
2. 确认已安装 `pydantic_monty`(`pip install pydantic-monty`)
3. 查看 `/api/sandbox/exec` 的响应了解具体错误

### Q: 如何添加新的 AI Provider？

**A**: 在 `.env` 中添加对应的环境变量即可，系统会自动识别。支持的 Provider 列表见 [环境变量配置](./environment.md)。

### Q: 修改文章后没有自动刷新

**A**: 文章保存后会自动触发 Git 提交，但热更新已禁用(避免聊天页面被刷新)。手动刷新博客页面即可看到更新。

---

## 📚 下一步

- 了解 [架构设计](./architecture.md)
- 探索 [工具系统](./tools.md)
- 配置 [Agent 系统](./agent-system.md)
- 查看完整 [环境变量列表](./environment.md)
