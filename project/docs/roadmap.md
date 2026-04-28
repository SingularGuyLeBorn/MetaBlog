# MetaBlog 开发路线图

> 最后更新：2026-04-28

---

## 架构层级

| 层级 | 状态 | 描述 |
|------|------|------|
| **L1: 静态博客** | ✅ 已完成 | 基于 VitePress 的高性能博客，支持 Markdown、数学公式、代码高亮 |
| **L2: 内置 Chatbot** | ✅ 已完成 | 集成 DeepSeek / Kimi / Zhipu AI，支持多轮对话、流式响应 |
| **L3: Agent 化** | ✅ 基本完成 | ChatBot Agent 化完成，能使用工具操作博客，实现热更新 |
| **L4: 自主 Agent** | 🚧 进行中 | Agent 面板支持定时任务、状态监听、自主执行 |
| **L5: Meta-Agent** | 🚧 规划中 | 能创建和配置其他 Agent 的超级 Agent |
| **L6: 状态监控** | 🚧 规划中 | 实时监控 Agent 运行状态(休眠/唤醒/执行中) |

---

## 最近完成(2026-04-14 ~ 2026-04-28)

### 平台解析与内容获取
- [x] **多层内容获取链路** — HTTP → Jina Reader → Playwright 本地渲染，自动降级
- [x] **反爬平台支持** — 知乎(Playwright + stealth)、小红书、抖音、B站、微博、微信公众号
- [x] **Jina Reader 兜底** — 反爬平台自动 fallback 到 Jina Reader 云端渲染
- [x] **OCR 图片识别服务** — 后端 `/api/ocr`，三引擎自动降级(PaddleOCR → Tesseract → OCR.space)
- [x] **平台解析工具扩展** — 新增 `parseWechat`, `parseWeibo`, `parseDouyin`, `parseBilibili`, `processImage`

### GitHub 工具全面扩展
- [x] **34 个 GitHub 工具** — 从 6 个扩展到 34 个，覆盖 Repo/Issue/PR/Branch/Workflow/File/Search
- [x] **模块化拆分** — 7 个分类文件(repo/issue/pull-request/branch/workflow/file/search)
- [x] **GitHub 错误翻译** — API 错误码自动转中文，降低 AI 理解成本
- [x] **ViteDevServer 路由修复** — 解决 GitHub 代理 404 问题

### 飞书生态完善
- [x] **飞书 Wiki 知识库 13 个工具** — Space/Node/Member 全生命周期管理
- [x] **飞书错误翻译** — 完整错误码映射 + 前缀兜底
- [x] **飞书表格 Block 创建** — 分步创建流程改造

### 语雀生态完善
- [x] **语雀知识库管理 6 个工具** — Repo CRUD + Setting 管理
- [x] **语雀错误翻译** — 完整错误码映射
- [x] **lake_builder 测试覆盖** — 59 个单元测试 + HTTP 路由测试

### 系统稳定性
- [x] **Rate Limit 限流** — 基于 async-mutex 的并发控制
- [x] **CORS 检查** — 学术工具跨域保护
- [x] **错误翻译系统** — 飞书/语雀/GitHub/External APIs 全覆盖
- [x] **环境变量重构** — `.env` 预加载、`LLM_` 前缀规范化、前端移除 API Key 暴露
- [x] **代码沙箱后端执行** — Python(Monty) + JS(vm.runInNewContext) + Bash(白名单)

### 聊天体验增强
- [x] **消息队列** — 解决并发消息顺序问题
- [x] **Skill Slash 快捷指令** — `/skill-name` 快速加载 Skill
- [x] **Article Mentions** — `@文章名` 引用博客文章
- [x] **实体链接卡片** — 飞书/语雀/GitHub 链接自动渲染为可点击卡片
- [x] **块级/行内公式修复** — Markdown → 飞书 Docx 转换器公式支持完善
- [x] **工具结果截断** — `getAllTools`/`getAllSkills` 默认精简，避免请求体过大
- [x] **假工具调用拦截** — Prompt 层面禁止 AI 在内容中伪造工具调用

### 渐进式披露
- [x] **动态工具上下文** — 从 119 个工具降噪到 7~15 个，提升调用准确率
- [x] **searchCapabilities** — 能力发现器，自动激活匹配工具
- [x] **loadSkill 激活** — Skill 加载后自动注入关联工具 schema

---

## 进行中

### 远程触达与移动端
- **目标**：离开电脑也能通过社交媒体截图/链接与 Agent 交互
- **场景**：刷到有趣内容 → 截图或复制链接 → 甩给 AI 处理(总结、存笔记、写文章)
- **方案**：Webhook / Telegram Bot / 微信企业号 / 邮件网关接收外部输入，触发 Agent 执行
- **优先级**：P0 — 解决"离开电脑就不行"的核心痛点

### 飞书 CLI 集成
- **目标**：让 Agent 能直接操作飞书(发消息、查日历、读文档、写多维表格)
- **方案**：后端 `child_process.spawn` 执行 `lark-cli`，前端封装 `run_lark_cli` 工具
- **依赖**：用户完成 `lark-cli auth login` 获取 user 身份

---

## 近期计划(1-2 周)

### 远程触达(高优先级)
- [ ] **Webhook 接收端** — 接收外部 HTTP 请求(截图/链接/文本)，触发 Agent 执行
- [ ] **Telegram Bot 集成** — 通过 Telegram 与 Agent 对话，发送截图和链接
- [ ] **邮件机器人** — 邮件作为一等公民消息渠道，支持附件(截图)处理
- [ ] **统一消息网关** — 所有渠道消息标准化为统一信封格式

### 工具增强
- [x] **webSearch 多引擎支持** — DuckDuckGo 已完成，待扩展 Tavily / Bing
- [ ] **getWeather 真实天气** — 接入和风天气 / OpenWeatherMap API
- [x] **executeCode 后端沙箱** — Python/JS/Bash 后端执行已完成
- [x] **fetchUrl JS 渲染** — Playwright 本地渲染 + Jina Reader 云端兜底已完成

### 飞书生态
- [ ] **lark_send_message** — 发送即时消息
- [ ] **lark_create_doc** — 创建云文档
- [ ] **lark_search_docs** — 搜索知识库文档
- [ ] **lark_calendar_events** — 查询日程

### 系统优化
- [x] **侧边栏缓存刷新** — 文章创建后自动刷新侧边栏
- [x] **doc-structure CRLF 兼容** — `extractTitle` 正则支持 `\r\n`
- [x] **Vue 响应式性能** — 避免 `messageGroups` 整数组替换导致的重渲染

---

## 中期计划(1 个月)

### 远程触达
- [ ] **Webhook 接收端** — 标准化 HTTP 端点接收外部输入
- [ ] **Telegram Bot** — 通过 Telegram 与 Agent 交互
- [ ] **邮件机器人** — IMAP 轮询 + 附件处理
- [ ] **统一消息网关** — 多渠道消息标准化信封格式

### 工具扩展
- [x] **学术搜索增强** — arXiv + OpenReview + HuggingFace + PapersWithCode + Semantic Scholar 已完成
- [ ] **RSS 订阅工具** — 订阅并解析 RSS Feed
- [ ] **PDF 处理工具** — 读取、摘要、转换
- [x] **图片处理工具** — OCR(PaddleOCR/Tesseract/OCR.space) 已完成，待扩展压缩裁剪
- [ ] **Git 操作工具** — commit、diff、branch、status
- [ ] **数据库查询工具** — SQLite 本地查询

### L4: 自主 Agent
- [ ] **定时任务调度** — Cron 表达式 + 任务队列(依赖 node-cron 已安装)
- [ ] **文件事件监听** — chokidar 监听 docs/sections/ 变化
- [ ] **Agent 状态机** — idle → scheduled → running → completed/failed
- [ ] **WebSocket 状态推送** — 实时更新 Agent 执行状态

### 知识库升级
- [ ] **向量搜索** — 接入 embedding + 相似度匹配
- [ ] **持久化存储** — IndexedDB / 后端 SQLite
- [ ] **多格式导入** — PDF / Word / HTML 转 Markdown

---

## 长期计划(3 个月)

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
| folder-note 模式(`folder/folder.md`) | VitePress rewrite 是构建时生成，运行时创建的文件没有 rewrite 规则，返回 404 |
| `/@fs/` 路由绕过 | 绕过 VitePress markdown 流水线，导致 frontmatter 不解析、pageData 缺失、标题丢失 |
| PowerShell `Set-Content` 写 UTF-8 文件 | 不加 `-Encoding UTF8` 会写入 ANSI(GBK)，导致中文乱码 |

---

## 贡献

欢迎提交 PR 或 Issue。新增工具请参考 `src/theme/tools/network/search/` 的模块化设计。
