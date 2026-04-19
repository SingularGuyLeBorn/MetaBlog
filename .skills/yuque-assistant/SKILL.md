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
通过语雀内部 Web API 直接操作知识库和文档，**完全免费，无需超级会员**。

> 与飞书不同，语雀使用浏览器 Cookie 认证，不需要 Personal Access Token。

## 核心概念

### repo_id（知识库 ID）
语雀知识库的唯一标识，是一个数字 ID。
- 调用 `yuque_repo_list` 获取所有知识库的 `id`

### doc_slug（文档 Slug）
文档的 URL 友好标识，是一串字母数字组合。
- 从 `yuque_toc_get` 或 `yuque_doc_list` 结果中获取 `slug`（在语雀内部 API 中字段名为 `url`）
- 示例：`buslgogeucwcim33`

### doc_id（文档 ID）
文档的数字 ID，用于更新和删除操作。
- 从 `yuque_doc_read` 结果中获取 `id`

## 工作流

### 1. 列出知识库
```
yuque_repo_list()
  → 返回知识库列表，包含 id、name、slug
```

### 2. 获取知识库目录
```
yuque_toc_get(repo_id="68025057")
  → 返回目录结构（TITLE 目录项 + DOC 文档项）
```

### 3. 读取文档内容
```
yuque_doc_read(repo_id="68025057", doc_slug="buslgogeucwcim33")
  → 返回文档标题和内容（Lake 格式 HTML）
```

### 4. 创建文档
```
yuque_doc_create(
  repo_id="68025057",
  title="新文档标题",
  content="<h1>标题</h1><p>正文内容</p>"
)
  → 返回新文档的 id 和 slug
```

### 5. 更新文档
**需要先读取文档获取 doc_id：**
```
yuque_doc_read(repo_id="68025057", doc_slug="buslgogeucwcim33")
  → 获取 doc_id
  → yuque_doc_update(
       repo_id="68025057",
       doc_id="266422684",
       title="新标题",
       content="<h1>新内容</h1>"
     )
```

### 6. 删除文档
```
yuque_doc_read(repo_id="68025057", doc_slug="buslgogeucwcim33")
  → 获取 doc_id
  → yuque_doc_delete(repo_id="68025057", doc_id="266422684")
```

## 注意事项

- **认证方式**：使用浏览器 Cookie（`_yuque_session` + `_ctoken`），不是 Token
- **内容格式**：创建/更新时，content 会被自动包装为 Lake HTML 格式
- **搜索不可用**：`yuque_search` 当前不可用（内部 Web API 不支持搜索）
- **更新/删除需要 doc_id**：必须先读取文档获取数字 ID，不能用 slug
- **权限**：只能操作自己拥有权限的知识库和文档

## 示例对话

用户："帮我看看语雀里有什么知识库"
→ `yuque_repo_list()`

用户："读取第一个知识库里最近的一篇文档"
→ `yuque_toc_get(repo_id=...)` → `yuque_doc_read(repo_id=..., doc_slug=...)`

用户："在那个知识库里创建一篇新文档"
→ `yuque_doc_create(repo_id=..., title="...", content="...")`

用户："把刚才那篇文档删了"
→ `yuque_doc_read(repo_id=..., doc_slug=...)` 获取 doc_id → `yuque_doc_delete(repo_id=..., doc_id=...)`
