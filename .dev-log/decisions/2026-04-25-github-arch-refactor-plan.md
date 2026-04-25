# GitHub 工具架构重构计划

> 日期：2026-04-25
> 背景：当前 GitHub 工具采用"前端重逻辑 + 后端透明代理"模式，与项目其他外部 API 工具（Lark/Yuque/Network）的"后端重逻辑"模式不一致。

---

## 现状诊断

### 当前架构

```
前端 github_get_repo()
  → 参数构造、URL 编码、base64 解码、错误翻译
  → fetch('/api/github/repos/owner/repo')
    → 后端 registerGitHubRoutes() [纯透传]
      → fetch('https://api.github.com/repos/owner/repo')
        → 返回原始响应
```

### 问题清单

| # | 问题 | 影响 | 严重程度 |
|---|------|------|:--------:|
| 1 | 后端纯透明代理，不做参数校验 | 恶意/错误请求直接穿透到 GitHub | 🔴 |
| 2 | `translateGitHubError` 在前端 | 后端无法复用错误翻译逻辑 | 🟡 |
| 3 | base64 编解码在前端 | 后端 Python 脚本无法复用文件读取逻辑 | 🟡 |
| 4 | 与 Lark/Yuque 架构不一致 | 新贡献者困惑，维护成本增加 | 🟠 |
| 5 | 前端 bundle 过大 | 49 个工具文件全部打包进前端 | 🟡 |
| 6 | 后端无法独立执行 GitHub 工具 | 定时任务/后台脚本需重写逻辑 | 🟡 |

---

## 目标架构

```
前端 github_get_repo()
  → 极简调用：fetch('/api/github/repo', { body: { owner, repo } })
    → 后端 /api/github/repo [显式路由]
      → 参数校验（owner/repo 格式）
      → 调用 GitHub API
      → 错误翻译（中文友好提示）
      → 结果格式化
      → 返回统一结构 { success, data, error }
```

---

## 任务分解

### 任务 1：设计 GitHub 后端显式路由（不删除透明代理）

**问题：** `server/routes/external/github.ts` 只有一个 `/api/github` catch-all 路由，所有请求无差别透传。

**怎么改：**
- 保留现有 `/api/github/*` 透明代理作为 **fallback**（兼容未被显式路由覆盖的端点）
- 新增显式路由，覆盖高频操作：
  - `GET /api/github/repo?owner=&repo=` → 获取仓库信息
  - `GET /api/github/repo/contents?owner=&repo=&path=&ref=` → 获取文件/目录内容
  - `GET /api/github/repo/branches?owner=&repo=` → 列出分支
  - `GET /api/github/repo/issues?owner=&repo=&state=` → 列出 Issue
  - `POST /api/github/repo/issue` → 创建 Issue
  - `GET /api/github/repo/pulls?owner=&repo=&state=` → 列出 PR

**涉及文件：**
- `server/routes/external/github.ts`（改造）
- `src/theme/tools/github/repo.ts`（瘦身）
- `src/theme/tools/github/file.ts`（瘦身）
- `src/theme/tools/github/issue.ts`（瘦身）
- `src/theme/tools/github/pull-request.ts`（瘦身）
- `src/theme/tools/github/branch.ts`（瘦身）

**验收标准：**
- [ ] 显式路由响应结构与原来一致（前端无需修改调用方式）
- [ ] owner/repo 参数做格式校验（只允许 `[a-zA-Z0-9_.-]`）
- [ ] 错误响应包含中文翻译（复用现有 `translateGitHubError` 逻辑，下沉到后端）
- [ ] 透明代理仍保留，未覆盖的端点继续走 fallback

---

### 任务 2：把错误翻译下沉到后端

**问题：** `translateGitHubError()` 在 `src/theme/tools/github/utils.ts`（前端），后端和其他脚本无法复用。

**怎么改：**
- 在 `server/utils/` 创建 `github-error-translator.ts`，移植 `translateGitHubError`
- 后端 GitHub 路由调用翻译器，返回统一错误结构
- 前端保留轻量封装（或直接透传后端翻译后的消息）

**涉及文件：**
- 新建：`server/utils/github-error-translator.ts`
- 修改：`server/routes/external/github.ts`
- 修改：`src/theme/tools/github/utils.ts`（标记为 deprecated 或删除）

**验收标准：**
- [ ] 后端返回的错误响应包含 `message`（中文）和 `suggestion`（修复建议）
- [ ] 前端不再做错误翻译，直接展示后端返回的消息

---

### 任务 3：后端增加参数校验层

**问题：** 当前任何 URL 都可以穿透到 GitHub API，如 `/api/github/../../admin`（虽然 GitHub 会拒绝，但后端没有第一道防线）。

**怎么改：**
- 为每个显式路由定义参数 schema（Zod 或手写校验）
- 校验规则：
  - `owner`: `/^[a-zA-Z0-9_.-]{1,39}$/`（GitHub username 规则）
  - `repo`: `/^[a-zA-Z0-9_.-]{1,100}$/`
  - `path`: 禁止 `..`，禁止绝对路径
  - `ref`: 分支名编码校验

**涉及文件：**
- 新建：`server/utils/github-validators.ts`
- 修改：`server/routes/external/github.ts`

**验收标准：**
- [ ] 非法 owner/repo 返回 400，不访问 GitHub API
- [ ] 包含 `..` 的 path 返回 403
- [ ] 现有测试全部通过

---

### 任务 4：前端 GitHub 工具瘦身

**问题：** 前端 `github/utils.ts` 包含 base64 编解码、ref 路径编码、错误翻译等**纯逻辑**，这些应该在后端完成。

**怎么改：**
- `githubRequest()` 简化为：拼 URL → fetch → 返回 JSON
- 删除 `translateGitHubError`（后端已提供）
- 删除 `encodeBase64` / `decodeBase64`（后端已提供）
- 保留 `encodeRefPath`（URL 编码仍在前端做，因为涉及 URL 构造）

**涉及文件：**
- `src/theme/tools/github/utils.ts`
- `src/theme/tools/github/*.ts`（各工具文件简化）

**验收标准：**
- [ ] `utils.ts` 行数减少 50% 以上
- [ ] 各工具文件不再做复杂结果处理
- [ ] 前端测试更新并通过

---

### 任务 5：建立后端 GitHub 工具复用层（供 Python/脚本调用）

**问题：** Python 实验脚本 `project/experiments/github-api/github_client.py` 与前端工具完全独立，逻辑重复。

**怎么改：**
- 在 `server/utils/` 创建 `github-client.ts`，封装常用 GitHub API 调用
- 提供与前端工具对应的函数：`getRepo()`, `listIssues()`, `getFileContent()`, `createIssue()` 等
- Python 脚本可选择：a) 调用后端 HTTP API；b) 继续独立实现（保持灵活性）

**涉及文件：**
- 新建：`server/utils/github-client.ts`
- 可选修改：`project/experiments/github-api/github_client.py`

**验收标准：**
- [ ] `github-client.ts` 提供 6 个常用函数
- [ ] 后端路由使用 `github-client.ts` 而不是直接 `fetch`
- [ ] 函数返回统一结构 `{ success, data, error }`

---

### 任务 6：测试加固

**怎么改：**
- 新增后端参数校验测试（非法 owner → 400）
- 新增后端错误翻译测试（404 → 中文提示）
- 新增缓存 + 显式路由的集成测试
- 更新前端测试（删除错误翻译相关测试，移到后端）

**涉及文件：**
- `tests/server/github-routes.test.ts`
- 新建：`tests/server/github-validators.test.ts`

**验收标准：**
- [ ] 后端新增 ≥5 个测试
- [ ] 全量测试通过率 100%

---

## 执行顺序

```
任务 1（显式路由设计）
    ↓
任务 2（错误翻译下沉）
    ↓
任务 3（参数校验）
    ↓
任务 4（前端瘦身）
    ↓
任务 5（复用层）
    ↓
任务 6（测试加固）
```

每个任务都可以独立 PR，但我建议 **1+2+3 合并为第一批**（它们互相依赖），**4+5+6 合并为第二批**。

---

## 工作量预估

| 批次 | 任务 | 预估时间 | 风险 |
|:---|:---|:---:|:---|
| 第一批 | 显式路由 + 错误翻译 + 参数校验 | 2-3 小时 | 中（需确保不破坏现有调用） |
| 第二批 | 前端瘦身 + 复用层 + 测试 | 2-3 小时 | 低 |

**总计：4-6 小时，约 200-300 行代码变更。**

---

## 要不要执行？

如果你确认，我可以：
1. **先只做第一批**（显式路由 + 错误翻译 + 参数校验），做完你验收
2. 或者 **一次性全做**

你选哪种？
