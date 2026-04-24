# MetaBlog 开发路线图

> 最后更新：2026-04-18

---

## 架构层级

| 层级 | 状态 | 描述 |
|------|------|------|
| **L1: 静态博客** | ✅ 已完成 | 基于 VitePress 的高性能博客，支持 Markdown、数学公式、代码高亮 |
| **L2: 内置 Chatbot** | ✅ 已完成 | 集成 DeepSeek / Kimi / Zhipu AI，支持多轮对话、流式响应 |
| **L3: Agent 化** | ✅ 基本完成 | ChatBot Agent 化完成，能使用工具操作博客，实现热更新 |
| **L4: 自主 Agent** | 🚧 进行中 | Agent 面板支持定时任务、状态监听、自主执行 |
| **L5: Meta-Agent** | 🚧 规划中 | 能创建和配置其他 Agent 的超级 Agent |
| **L6: 状态监控** | 🚧 规划中 | 实时监控 Agent 运行状态（休眠/唤醒/执行中） |

---

## 最近完成（2026-04-14 ~ 2026-04-18）

### 网络搜索
- [x] **DuckDuckGo 搜索接入** — 零成本，无需 API Key
- [x] **模块化搜索架构** — `src/theme/tools/network/search/` 独立目录，支持后期扩展 Google/Bing/Tavily
- [x] **双模式解析** — 优先 DOMParser，降级正则解析

### 文章创建安全与结构
- [x] **5 层文件操作沙箱** — section 白名单（posts/knowledge/resources）+ `..` 遍历拦截
- [x] **folder/index.md 结构** — 放弃 folder-note 模式，采用 VitePress 原生支持的 index 模式
- [x] **自动中间文件夹 index.md** — 创建 `knowledge/llm/my-article/index.md` 时，自动补全 `knowledge/llm/index.md`
- [x] **YAML frontmatter 安全** — `escapeYamlValue()` 处理含 `:` 等特殊字符的标题
- [x] **CRLF 兼容** — 正则支持 `\r\n`，修复 Windows 下的 frontmatter 检测

### 工具与 UI 修复
- [x] **工具调用实时显示** — `splice()` + 数组引用替换强制触发 Vue 响应式更新
- [x] **重复工具注册** — 全局 `defaultToolsInitialized` 标志防止双 init
- [x] **路由修复** — 移除 `/@fs` 绕过，恢复 VitePress markdown 流水线处理
- [x] **HMR 修复** — `handleHotUpdate` 只抑制 data/.trash，不阻断 docs markdown
- [x] **favicon 404** — 添加空 favicon 占位
- [x] **组件别名修复** — `@/components/ArticleCards.vue` → `@/theme/components/common/ArticleCards.vue`

### 飞书 CLI 准备
- [x] **环境就绪** — 本地安装 `lark-cli` 1.0.14，完成应用创建（App ID: cli_a968d6a33df89bc0）
- [ ] **用户 OAuth 登录** — 待完成 `lark-cli auth login`
- [ ] **后端命令执行路由** — 待实现 `/api/lark/exec`
- [ ] **前端 `run_lark_cli` 工具** — 待注册到工具系统

---

## 进行中

### 飞书 CLI 集成
- **目标**：让 Agent 能直接操作飞书（发消息、查日历、读文档、写多维表格）
- **方案**：后端 `child_process.spawn` 执行 `lark-cli`，前端封装 `run_lark_cli` 工具
- **依赖**：用户完成 `lark-cli auth login` 获取 user 身份

---

## 近期计划（1-2 周）

### 工具增强
- [ ] **web_search 多引擎支持** — 环境变量切换 DuckDuckGo / Tavily / Bing
- [ ] **get_weather 真实天气** — 接入和风天气 / OpenWeatherMap API
- [ ] **execute_code 后端沙箱** — 后端用 vm2 / docker 执行 Python/Node
- [ ] **fetch_url JS 渲染** — 通过 Playwright MCP 获取 SPA 内容

### 飞书生态
- [ ] **lark_send_message** — 发送即时消息
- [ ] **lark_create_doc** — 创建云文档
- [ ] **lark_search_docs** — 搜索知识库文档
- [ ] **lark_calendar_events** — 查询日程

### 系统优化
- [ ] **侧边栏缓存刷新** — 文章创建后自动刷新侧边栏
- [ ] **doc-structure CRLF 兼容** — `extractTitle` 正则支持 `\r\n`
- [ ] **Vue 响应式性能** — 避免 `messageGroups` 整数组替换导致的重渲染

---

## 中期计划（1 个月）

### 工具扩展
- [ ] **学术搜索增强** — arXiv + Google Scholar + Semantic Scholar 联合搜索
- [ ] **RSS 订阅工具** — 订阅并解析 RSS Feed
- [ ] **PDF 处理工具** — 读取、摘要、转换
- [ ] **图片处理工具** — 压缩、裁剪、OCR（百度/腾讯 API）
- [ ] **Git 操作工具** — commit、diff、branch、status
- [ ] **数据库查询工具** — SQLite 本地查询

### L4: 自主 Agent
- [ ] **定时任务调度** — Cron 表达式 + 任务队列
- [ ] **文件事件监听** — chokidar 监听 docs/sections/ 变化
- [ ] **Agent 状态机** — idle → scheduled → running → completed/failed
- [ ] **WebSocket 状态推送** — 实时更新 Agent 执行状态

### 知识库升级
- [ ] **向量搜索** — 接入 embedding + 相似度匹配
- [ ] **持久化存储** — IndexedDB / 后端 SQLite
- [ ] **多格式导入** — PDF / Word / HTML 转 Markdown

---

## 长期计划（3 个月）

### L5: Meta-Agent
- [ ] **Agent 工厂** — 自然语言创建新 Agent
- [ ] **Skill 自动生成** — 根据 Agent 行为自动生成 Skill 定义
- [ ] **Agent 市场** — 导入/导出 Agent 配置

### L6: 状态监控
- [ ] **可视化仪表板** — Agent 执行历史、成功率、耗时统计
- [ ] **异常告警** — 任务失败时飞书/邮件通知
- [ ] **性能分析** — 工具调用热力图、模型 Token 消耗统计

---

## 已废弃/放弃的方向

| 方向 | 原因 |
|------|------|
| folder-note 模式（`folder/folder.md`） | VitePress rewrite 是构建时生成，运行时创建的文件没有 rewrite 规则，返回 404 |
| `/@fs/` 路由绕过 | 绕过 VitePress markdown 流水线，导致 frontmatter 不解析、pageData 缺失、标题丢失 |
| PowerShell `Set-Content` 写 UTF-8 文件 | 不加 `-Encoding UTF8` 会写入 ANSI（GBK），导致中文乱码 |

---

## 贡献

欢迎提交 PR 或 Issue。新增工具请参考 `src/theme/tools/network/search/` 的模块化设计。
