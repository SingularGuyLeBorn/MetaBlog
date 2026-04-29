# MetaBlog 文档

欢迎来到 MetaBlog 文档中心。这里包含了从快速上手到深度定制的完整指南。

## 📑 文档导航

| 文档 | 适合人群 | 内容 |
|------|---------|------|
| [快速开始](./quickstart.md) | 所有用户 | 安装、配置、启动、常见问题 |
| [环境变量配置](./environment.md) | 部署者 | 完整的 `.env` 配置说明 |
| [架构设计](./architecture.md) | 开发者 | 系统架构、模块划分、数据流 |
| [工具系统](./tools.md) | 使用者 & 开发者 | 工具列表、使用示例、自定义开发 |
| [Agent 工具调用交互](./agent-tool-interaction.md) | 开发者 | 时序图、UML 图、系统各方交互 |
| [Agent 系统](./agent-system.md) | 使用者 | Agent 配置、Skill 开发、会话管理 |
| [开发指南](./development.md) | 贡献者 | 目录结构、编码规范、调试技巧 |

---

## 🚀 一分钟速览

**MetaBlog** 是 AI 驱动的智能博客与 Agent 平台，核心能力包括：

- **智能博客**：基于 VitePress，支持 Markdown、数学公式、代码高亮
- **AI 对话**：多模型支持，流式响应，工具调用
- **代码沙箱**：后端安全执行 Python / JavaScript / Bash
- **平台集成**：飞书、语雀、GitHub 深度集成
- **Agent 系统**：多 Agent 管理、Skill 技能组合、独立会话

---

## 💡 常见场景

### 场景 1：用 AI 写博客文章

1. 打开 `http://localhost:5173/chat`
2. 告诉 AI 想写的主题
3. AI 会自动调用 `createArticle` 工具生成文章
4. 文章保存到 `docs/sections/posts/`，自动触发 Git 提交

### 场景 2：代码验证与演示

1. 在聊天中让 AI 写一段代码
2. AI 调用 `executeCode` 工具在沙箱中执行
3. 查看执行结果，确认代码正确性

### 场景 3：飞书文档同步

1. 配置 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`
2. 让 AI 将博客文章同步到飞书
3. AI 自动调用 `feishuDocCreate` 创建文档

---

## 🆘 需要帮助？

- 查看 [快速开始](./quickstart.md) 中的常见问题
- 阅读 [开发指南](./development.md) 了解调试技巧
- 检查 `.env` 配置是否正确(参考 [环境变量](./environment.md))
