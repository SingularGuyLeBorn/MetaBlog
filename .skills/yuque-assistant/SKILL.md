---
id: yuque-assistant
name: 语雀助手
description: 通过语雀内部 Web API 操作知识库和文档，完全免费无需会员
icon: 📝
category: productivity
tags:
  - 语雀
  - 文档
  - 知识库
  - Yuque
tools:
  - yuque_repo_list
  - yuque_toc_get
   - yuque_doc_list
  - yuque_doc_read
  - yuque_doc_create
  - yuque_doc_update
  - yuque_doc_delete
  - yuque_search
usageScenarios:
  - 列出语雀知识库
  - 获取知识库目录结构
  - 列出知识库中的文档
  - 读取语雀文档内容
  - 创建语雀文档
  - 更新语雀文档
  - 删除语雀文档
  - 在语雀中管理知识库
---

# 语雀助手

## 描述

通过语雀**内部 Web API** 直接操作知识库和文档，**完全免费，无需超级会员**。

> 与飞书不同，语雀使用浏览器 Cookie 认证（`_yuque_session` + `_ctoken`），不需要 Personal Access Token。

---

## 核心概念

### repo_id（知识库 ID）

语雀知识库的唯一标识，是一个**数字 ID**。

- 调用 `yuque_repo_list()` 获取所有知识库的 `id`
- 示例：`68025057`

### doc_slug（文档 Slug）

文档的 URL 友好标识，是一串字母数字组合。

- 从 `yuque_toc_get()` 或 `yuque_doc_list()` 结果中获取 `url` 字段
- 示例：`buslgogeucwcim33`
- **注意**：Slug 用于读取文档，但不能用于更新或删除

### doc_id（文档数字 ID）

文档的数字 ID，用于**更新和删除**操作。

- 从 `yuque_doc_read()` 结果中获取 `id` 字段
- 示例：`266422684`
- **⚠️ 重要**：更新和删除必须用 doc_id，不能用 doc_slug！

---

## 工作流

### 1. 列出知识库

```
yuque_repo_list()
  → 返回知识库列表，包含 id、name、slug
```

**返回示例**：
```
1. LLM知识库 (ID: 68025057, Slug: qah8x7)
   无描述
2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
   课程笔记
```

### 2. 获取知识库目录

```
yuque_toc_get(repo_id="68025057")
  → 返回目录结构（TITLE 目录项 + DOC 文档项）
```

**返回示例**：
```
📁 第一章
  📄 1.1 概述 (slug: abc123)
  📄 1.2 详细说明 (slug: def456)
📁 第二章
  📄 2.1 总结 (slug: ghi789)
```

### 3. 读取文档内容

```
yuque_doc_read(repo_id="68025057", doc_slug="abc123")
  → 返回文档标题和内容（Lake HTML 格式）
```

**⚠️ 注意**：
- 内容格式是 Lake HTML，不是纯 Markdown
- 返回值中包含 `doc_id`，这是后续更新/删除的必需参数

### 4. 创建文档

```
yuque_doc_create(
  repo_id="68025057",
  title="新文档标题",
  content="<h1>标题</h1><p>正文内容</p>"
)
  → 返回新文档的 id 和 slug
```

**⚠️ 注意**：
- `content` 支持 HTML 标签，系统会自动包装为 Lake 格式
- 创建后文档**不会自动出现在知识库目录中**，如需加入目录请后续在语雀网页版手动调整

### 5. 更新文档

**必须先读取文档获取 doc_id：**

```
yuque_doc_read(repo_id="68025057", doc_slug="abc123")
  → 获取 doc_id（如 266422684）
  → yuque_doc_update(
       repo_id="68025057",
       doc_id="266422684",
       title="新标题",
       content="<h1>新内容</h1>"
     )
```

**⚠️ 重要**：
- `doc_id` 是数字 ID，不是 slug！
- 必须先调用 `yuque_doc_read` 获取 doc_id

### 6. 删除文档

```
yuque_doc_read(repo_id="68025057", doc_slug="abc123")
  → 获取 doc_id
  → yuque_doc_delete(repo_id="68025057", doc_id="266422684")
```

**⚠️ 警告**：删除操作不可逆，请确认后再执行！

---

## 注意事项

### 认证方式

- 使用浏览器 Cookie（`_yuque_session` + `_ctoken`），不是 Token
- Cookie 获取方法：登录语雀 → F12 → Application → Cookies → 复制值
- **切勿泄露 Cookie，切勿提交到 Git！**

### 内容格式

- 创建/更新时，`content` 参数支持 HTML 标签
- 系统会自动包装为 Lake HTML 格式（语雀自研格式）
- 读取时返回的内容也是 Lake HTML 格式

### 搜索不可用

- `yuque_search` 当前不可用（内部 Web API 不支持搜索）
- 如需查找文档，请使用 `yuque_repo_list` → `yuque_toc_get` 浏览目录

### 更新/删除需要 doc_id

- **读取用 slug，更新/删除用 id**
- doc_id 是数字（如 266422684），doc_slug 是字符串（如 abc123）
- 必须先调用 `yuque_doc_read` 获取 doc_id

### 权限

- 只能操作自己拥有权限的知识库和文档
- 无法操作他人知识库（即使被邀请为协作者，也可能受限）

---

## 示例对话

### 示例 1：列出知识库

**用户**："帮我看看语雀里有什么知识库"

**Agent**：
```
yuque_repo_list()
```

**返回**：
```
1. LLM知识库 (ID: 68025057, Slug: qah8x7)
2. Awesome-CS336 (ID: 68016047, Slug: zf1hbk)
```

### 示例 2：读取文档

**用户**："读取第一个知识库里最近的一篇文档"

**Agent**：
```
yuque_toc_get(repo_id="68025057")
  → 获取第一个 DOC 的 slug
yuque_doc_read(repo_id="68025057", doc_slug="abc123")
```

### 示例 3：创建文档

**用户**："在那个知识库里创建一篇新文档"

**Agent**：
```
yuque_doc_create(
  repo_id="68025057",
  title="项目计划",
  content="<h1>项目计划</h1><p>这是项目计划的内容...</p>"
)
```

### 示例 4：更新文档

**用户**："把刚才那篇文档的标题改成项目总结"

**Agent**：
```
yuque_doc_read(repo_id="68025057", doc_slug="刚才创建的slug")
  → 获取 doc_id
yuque_doc_update(
  repo_id="68025057",
  doc_id="266422684",
  title="项目总结"
)
```

### 示例 5：删除文档

**用户**："把刚才那篇文档删了"

**Agent**：
```
yuque_doc_read(repo_id="68025057", doc_slug="刚才创建的slug")
  → 获取 doc_id
yuque_doc_delete(repo_id="68025057", doc_id="266422684")
```

---

## 相关文件

- **后端路由**：`server/routes/yuque.ts`
- **前端工具定义**：`src/theme/tools/yuque/definitions.ts`
- **前端工具执行器**：`src/theme/tools/yuque/executors.ts`
- **测试 Notebook**：`docs-internal/yuque-api-lab/01_yuque_webapi.ipynb`
