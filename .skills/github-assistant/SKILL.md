---
name: GitHub 助手
description: |
  通过 GitHub REST API 管理仓库、Issue、PR、分支、文件、Release、工作流等。
  触发时机：用户提到 GitHub、仓库、代码提交、Issue、Pull Request、分支、Release、Actions 工作流等。
  不适用：GitLab、Gitee 等其他代码托管平台操作（平台 API 不兼容）。
---

## 适用边界

- **管什么**：GitHub 仓库全生命周期（创建、查询、修改、删除）、代码文件操作、Issue/PR 管理、分支管理、Release、Actions 工作流、速率限制查询
- **不管什么**：非 GitHub 平台（GitLab、Gitee 等）、本地 Git 命令操作（commit、rebase 等）、代码审查的语义判断（只负责 API 调用，不负责判断代码质量）

## 设计模式

**Tool Wrapper** — 封装 GitHub REST API 为可直接调用的工具，Agent 负责参数组装和流程编排，工具负责 HTTP 通信和错误翻译。

## Gotchas

1. **Token 未配置时所有写操作都会失败** — 检查 `GITHUB_TOKEN` 是否设置
2. **422 错误语义复杂** — 可能是「已存在」「参数无效」「配额不足」「归档仓库」等多种原因，不能统一视为参数错误
3. **组织仓库 404 不一定是真不存在** — Token 未授权组织时，GitHub 故意返回 404 避免泄露存在性
4. **空仓库无法创建新分支** — 必须先推送初始提交（`auto_init=true`）
5. **文件更新必须传 sha** — 先 `githubGetFileContent` 获取 sha，再传给 `githubCreateOrUpdateFile`
6. **分支保护规则会阻止直接推送** — 受保护分支的修改必须通过 Pull Request

详细分析见 `references/best-practices.md`。

## 工作流

### 查询类任务（仓库信息、文件内容、Issue 列表等）
1. 确认用户提供的 owner/repo 参数
2. 选择对应查询工具直接调用
3. 返回结果，必要时补充说明（如速率限制状态）

### 写操作类任务（创建仓库、修改文件、合并 PR 等）
1. **说明操作内容、影响范围、回滚方式**
2. **等待用户确认**
3. 组装参数，调用对应工具
4. 处理错误（根据 references/error-cheat-sheet.md 判断重试或终止）
5. 返回操作结果和后续建议

### PR 审查类任务
1. 获取 PR 详情和文件变更
2. 获取相关文件的当前内容（用于对比）
3. 分析变更（Agent 语义判断）
4. 如需提交 Review，先说明评论内容和位置，确认后执行

## 输出要求

- 查询类：直接返回结构化结果，关键字段高亮
- 写操作类：返回操作结果 + 影响摘要 + 回滚方式（如删除可恢复、覆盖不可逆）
- 错误类：返回错误码 + 具体原因 + 处理建议（引用 error-cheat-sheet）

## 确认门槛

以下操作**必须先向用户说明，等待确认后再执行**：
- 创建 / 删除 / 更新仓库
- 创建 / 删除 / 更新文件
- 合并 / 关闭 Pull Request
- 删除分支
- 创建 Release
- 触发工作流（可能消耗 CI 分钟数）

说明内容必须包含：
1. 具体操作内容
2. 影响范围（影响哪些资源）
3. 回滚方式（是否可撤销）

## 参考文档

- [工具清单](references/tools.md) — 34 个工具的完整分类列表
- [错误速查表](references/error-cheat-sheet.md) — HTTP 状态码快速处理指南
- [最佳实践](references/best-practices.md) — Token 配置、422 陷阱、速率限制、权限与组织、文件操作细节
