# 需求清单 — 已完成

本文档记录 MetaBlog 已完成的全部功能需求，按时间倒序排列。

> **维护规则**：
> - 需求完成后从 [backlog.md](./backlog.md) 移除，记录到本文档
> - 记录完成日期和对应 Commit/PR

---

## 2026-04 完成

### [DONE-024] 实体链接卡片（EntityLinkCard）
- **完成日期**: 2026-04-23
- **领域**: Frontend
- **关联层级**: L3
- **描述**: 工具执行产生的飞书/语雀/GitHub 链接自动渲染为可点击卡片
- **实现要点**: 从工具结果提取 URL → 类型检测 → 图标映射 → 卡片渲染在 timeline 头部
- **相关文件**: `MessageBubble.vue`, `EntityLinkCard.vue`, `extractEntityLinks.ts`

### [DONE-023] 代码沙箱后端执行
- **完成日期**: 2026-04-22
- **领域**: Execution
- **关联层级**: L3
- **描述**: 后端 `/api/sandbox/exec` 路由，支持 Python/JS/Bash 安全执行
- **实现要点**: Python(Monty) + JS(vm.runInNewContext) + Bash(白名单)，30s超时/1MB输出限制
- **相关文件**: `server/routes/sandbox.ts`, `server/sandbox/monty-runner.py`

### [DONE-022] 环境变量重构
- **完成日期**: 2026-04-22
- **领域**: Harness
- **关联层级**: L3
- **描述**: `.env` 预加载、`MODEL_CONFIGS` 惰性初始化、前端移除 API Key 暴露、`LLM_` 前缀规范化
- **实现要点**: `LLM_` 优先，`VITE_` 兼容回退，所有 Provider 统一读取逻辑
- **相关文件**: `server/routes/init.ts`, `server/routes/chat.ts`

### [DONE-021] 块级公式修复
- **完成日期**: 2026-04-23
- **领域**: Frontend
- **关联层级**: L3
- **描述**: Markdown → 飞书 Docx 转换器支持单行 `$$...$$` 和多行 `$$
...
$$` 块级公式
- **实现要点**: `parseBlock` 中单行模式匹配 `line.match(/^\$\$(.+)\$\$$/)`，多行模式匹配 `line === '$$'`
- **相关文件**: `src/theme/tools/lark/markdown-to-blocks.ts`

### [DONE-020] 行内公式 $$...$$ 支持
- **完成日期**: 2026-04-24
- **领域**: Frontend
- **关联层级**: L3
- **描述**: 列表项/段落中的 `$$...$$` 被正确解析为 equation 元素，不再拆分为孤立 `$`
- **实现要点**: `tryParseEquation` 优先匹配 `$$...$$` 模式，降级为 `$...$`
- **相关文件**: `src/theme/tools/lark/markdown-to-blocks.ts`

### [DONE-019] 工具结果截断修复
- **完成日期**: 2026-04-22
- **领域**: Frontend
- **关联层级**: L3
- **描述**: `get_all_tools`/`get_all_skills` 默认返回精简摘要，新增 `detail` 参数控制完整输出
- **实现要点**: 避免工具结果过大导致请求体超过 AI API 限制
- **相关文件**: `src/theme/tools/index.ts`

### [DONE-018] 飞书工具链（10个）
- **完成日期**: 2026-04-19
- **领域**: Platform
- **关联层级**: L3
- **描述**: 完整的飞书文档操作工具链
- **工具列表**: `feishu_doc_create`, `feishu_doc_read`, `feishu_doc_search`, `feishu_doc_blocks`, `feishu_doc_append`, `feishu_doc_update_block`, `feishu_doc_delete_block`, `feishu_im_send`, `feishu_user_search`, `feishu_image_upload`
- **相关文件**: `server/routes/lark.ts`, `src/theme/tools/lark/`

### [DONE-017] 语雀工具链（9个）
- **完成日期**: 2026-04-19
- **领域**: Platform
- **关联层级**: L3
- **描述**: 完整的语雀文档操作工具链
- **工具列表**: `yuque_repo_list`, `yuque_toc_get`, `yuque_doc_list`, `yuque_doc_read`, `yuque_doc_create`, `yuque_doc_update`, `yuque_doc_delete`, `yuque_image_upload`, `yuque_search`
- **相关文件**: `server/routes/yuque.ts`, `src/theme/tools/yuque/`

### [DONE-016] 网络搜索（DuckDuckGo）
- **完成日期**: 2026-04-18
- **领域**: Data
- **关联层级**: L3
- **描述**: 零成本网络搜索，无需 API Key
- **实现要点**: DuckDuckGo HTML 版解析，DOMParser 优先降级正则，模块化架构支持后续扩展
- **相关文件**: `src/theme/tools/network/search/`

### [DONE-015] 文章创建安全沙箱
- **完成日期**: 2026-04-18
- **领域**: Harness
- **关联层级**: L3
- **描述**: 5 层文件操作安全边界
- **实现要点**: section 白名单(posts/knowledge/resources) + `..` 遍历拦截 + 路径范围限制 + 软删除 + Git 自动提交
- **相关文件**: `server/routes/init.ts`

### [DONE-014] GitHub 工具（6个）
- **完成日期**: 2026-04-18
- **领域**: Platform
- **关联层级**: L3
- **描述**: GitHub 仓库/代码/Issues 操作工具
- **工具列表**: `github_get_repo`, `github_list_repo_contents`, `github_get_file_content`, `github_search_code`, `github_get_commit_history`, `github_get_issues`
- **相关文件**: `src/theme/tools/github/`

### [DONE-013] 学术搜索工具（6个）
- **完成日期**: 2026-04-18
- **领域**: Academic
- **关联层级**: L3
- **描述**: 多平台学术论文搜索
- **工具列表**: `searchArxiv`, `fetchArxiv`, `searchOpenReview`, `fetchOpenReview`, `searchHuggingFace`, `searchPapersWithCode`, `searchSemanticScholar`
- **相关文件**: `src/theme/tools/academic/`

---

## 2026-03 完成

### [DONE-012] MCP 外部工具接入
- **完成日期**: 2026-03
- **领域**: Platform
- **关联层级**: L3
- **描述**: 完整的 MCP Client/Manager 架构，支持 HTTP/SSE/Stdio 传输
- **实现要点**: 20+ 预设 MCP 配置，工具自动注册到 Agent，连接状态实时监控
- **相关文件**: `src/theme/components/ai-chat/MCPConfigPanel.vue`

### [DONE-011] Agent 控制中心
- **完成日期**: 2026-03
- **领域**: Hermes
- **关联层级**: L3
- **描述**: Agent 创建/编辑/删除，四种配置模式（纯提示词/纯技能/纯工具/混合）
- **实现要点**: Agent 配置面板 + Skill 系统 + 独立会话 + 工具权限控制
- **相关文件**: `src/theme/components/ai-chat/AgentPanel.vue`

### [DONE-010] 工具测试平台
- **完成日期**: 2026-03
- **领域**: Frontend
- **关联层级**: L3
- **描述**: ToolTester.vue 可视化测试组件，一键批量测试
- **实现要点**: 单个测试 + 批量测试 + 成功率统计报告
- **相关文件**: `src/theme/components/ai-chat/ToolTester.vue`

### [DONE-009] 多模型支持
- **完成日期**: 2026-03
- **领域**: Frontend
- **关联层级**: L2
- **描述**: 支持 DeepSeek / Kimi / Zhipu / OpenAI / Gemini / Anthropic / Qwen / Baichuan / xAI / Cohere / OpenRouter / Mistral
- **实现要点**: 统一的 Provider 接口，环境变量配置，运行时切换
- **相关文件**: `server/routes/chat.ts`

---

## 2026-02 完成

### [DONE-008] AI 聊天界面
- **完成日期**: 2026-02
- **领域**: Frontend
- **关联层级**: L2
- **描述**: 多轮对话、流式响应、思考过程展示、工具调用可视化
- **实现要点**: SSE 流式传输 + 消息分组 + 工具调用 Timeline + 打字机效果
- **相关文件**: `src/theme/components/ai-chat/ChatInterface.vue`, `MessageBubble.vue`

### [DONE-007] 会话管理
- **完成日期**: 2026-02
- **领域**: Frontend
- **关联层级**: L2
- **描述**: 会话列表（按时间分组）、行内重命名、删除确认、消息版本切换
- **相关文件**: `src/theme/composables/useSession.ts`

---

## 2026-01 完成

### [DONE-006] VitePress 博客系统
- **完成日期**: 2026-01
- **领域**: Frontend
- **关联层级**: L1
- **描述**: 基于 VitePress 的静态博客，支持 Markdown、数学公式、代码高亮、Wiki 链接
- **实现要点**: 自定义主题 + 动态侧边栏生成 + 面包屑导航 + 自动重写规则
- **相关文件**: `.vitepress/config.ts`, `.vitepress/utils/`

### [DONE-005] 文章管理工具（6个）
- **完成日期**: 2026-01
- **领域**: Content
- **关联层级**: L3
- **描述**: 文章的 CRUD + 搜索 + 列表
- **工具列表**: `get_article_content`, `search_articles`, `list_articles`, `create_article`, `update_article`, `delete_article`
- **相关文件**: `src/theme/tools/article/`

---

## 更早完成

### [DONE-004] 知识库工具（7个）
- **完成日期**: 2025-12
- **领域**: Hermes
- **关联层级**: L3
- **描述**: 内存知识库的 CRUD 管理
- **工具列表**: `kb_list`, `kb_create`, `kb_delete`, `kb_query`, `kb_list_documents`, `kb_document_add`, `kb_document_delete`
- **相关文件**: `src/theme/tools/load_skill/`

### [DONE-003] 文本处理工具（4个）
- **完成日期**: 2025-12
- **领域**: Content
- **关联层级**: L3
- **描述**: 摘要、格式化、翻译
- **工具列表**: `summarize_text`, `format_text`, `translate_text`
- **相关文件**: `src/theme/tools/text/`

### [DONE-002] 文件操作工具（3个）
- **完成日期**: 2025-12
- **领域**: Execution
- **关联层级**: L3
- **描述**: 文件的读/写/列表
- **工具列表**: `read_file`, `write_file`, `list_files`
- **相关文件**: `src/theme/tools/file/`

### [DONE-001] 系统工具（4个）
- **完成日期**: 2025-12
- **领域**: Execution
- **关联层级**: L3
- **描述**: 时间、天气、计算、回声测试
- **工具列表**: `get_current_time`, `get_weather`, `calculate`, `test_echo`
- **相关文件**: `src/theme/tools/system/`

---

## 📊 统计

| 领域 | 已完成 |
|------|--------|
| Frontend | 7 |
| Execution | 3 |
| Platform | 4 |
| Data | 1 |
| Academic | 1 |
| Content | 2 |
| Harness | 2 |
| Hermes | 2 |
| **总计** | **24** |
