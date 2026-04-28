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
  - yuqueRepoList
  - yuqueRepoCreate
  - yuqueRepoUpdate
  - yuqueRepoDelete
  - yuqueRepoGet
  - yuqueRepoSettingGet
  - yuqueRepoSettingUpdate
  - yuqueTocGet
  - yuqueDocList
  - yuqueDocRead
  - yuqueDocCreate
  - yuqueDocUpdate
  - yuqueDocDelete
  - yuqueImageUpload
  - yuqueSearch
usageScenarios:
  - 列出语雀知识库
  - 创建、更新、删除语雀知识库
  - 获取知识库详情与设置
  - 获取知识库目录结构
  - 列出知识库中的文档
  - 读取语雀文档内容
  - 创建语雀文档
  - 更新语雀文档
  - 删除语雀文档
  - 上传图片到语雀 CDN
  - 在语雀中管理知识库
---

# 语雀助手

## 描述

通过语雀**内部 Web API** 直接操作知识库和文档，**完全免费，无需超级会员**。

> 与飞书不同，语雀使用浏览器 Cookie 认证(`_yuque_session` + `_ctoken`)，不需要 Personal Access Token。

---

## 核心概念

### repo_id(知识库 ID)

语雀知识库的唯一标识，是一个**数字 ID**。

- 调用 `yuqueRepoList()` 获取所有知识库的 `id`
- 示例：`68025057`

### doc_slug(文档 Slug)

文档的 URL 友好标识，是一串字母数字组合。

- 从 `yuqueTocGet()` 或 `yuqueDocList()` 结果中获取 `url` 字段
- 示例：`buslgogeucwcim33`
- **注意**：Slug 用于读取文档，但不能用于更新或删除

### doc_id(文档数字 ID)

文档的数字 ID，用于**更新和删除**操作。

- 从 `yuqueDocRead()` 结果中获取 `id` 字段
- 示例：`266422684`
- **⚠️ 重要**：更新和删除必须用 doc_id，不能用 doc_slug！

---

## 工作流

### 1. 列出知识库

```
yuqueRepoList()
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
yuqueTocGet(repo_id="68025057")
  → 返回目录结构(TITLE 目录项 + DOC 文档项)
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
yuqueDocRead(repo_id="68025057", doc_slug="abc123")
  → 返回文档标题和内容(Lake HTML 格式)
```

**⚠️ 注意**：
- 内容格式是 Lake HTML，不是纯 Markdown
- 返回值中包含 `doc_id`，这是后续更新/删除的必需参数

### 4. 上传图片到语雀 CDN

```
yuqueImageUpload(
  image_base64="data:image/png;base64,iVBORw0KGgo...",
  file_name="chart.png"
)
  → 返回 { url: "https://cdn.nlark.com/yuque/0/...", filekey: "..." }
```

**使用图片**：获取 URL 后，在文档内容中用 Markdown 图片语法引用：
```
yuqueDocCreate(
  repo_id="68025057",
  title="带图片的文档",
  content="# 标题\n\n![图表描述](https://cdn.nlark.com/yuque/0/...)",
  format="markdown"
)
```

### 5. 创建文档(推荐 Markdown 格式)

**最佳实践**：传 `format="markdown"`，直接上传标准 Markdown，语雀服务端自动渲染。

```
yuqueDocCreate(
  repo_id="68025057",
  title="新文档标题",
  content="# 标题\n\n$E=mc^2$\n\n| a | b |\n|---|---|\n| 1 | 2 |",
  format="markdown"
)
  → 返回新文档的 id 和 slug
```

**✅ 强大功能**：
- **Markdown 原生渲染**：`format="markdown"` 时语雀服务端自动解析，公式/表格/代码块都能正确渲染
- **数学公式支持**：支持 `$formula$` (行内) 和 `$$formula$$` (行间) LaTeX 语法
- **表格支持**：支持标准的 Markdown 表格语法
- **代码高亮**：支持 ```python 等 fenced code block
- **图片支持**：`![Alt text](URL)` 语法，配合 yuqueImageUpload 使用
- **注意**：创建后文档**不会自动出现在知识库目录中**

**旧方式(Lake 格式，不推荐)**：
```
yuqueDocCreate(
  repo_id="68025057",
  title="新文档标题",
  content="<h1>标题</h1><p>正文</p>"
  # format 默认为 "lake"
)
```

### 6. 更新文档

**必须先读取文档获取 doc_id：**

```
yuqueDocRead(repo_id="68025057", doc_slug="abc123")
  → 获取 doc_id(如 266422684)
```

**⚠️ 更新行为：全量替换，不是追加！**

| 传参方式 | 效果 |
|---------|------|
| 只传 `title` | ✅ 只改标题，保留原有内容 |
| 传 `content` | ⚠️ 整个文档内容被替换为新内容 |
| 传 `replace_text` | ✅ 智能局部替换(只改一句话) |

**方式1：只更新标题(最安全)**
```
yuqueDocUpdate(repo_id="68025057", doc_id="266422684", title="新标题")
```

**方式2：局部替换一句话(推荐)**
```
yuqueDocUpdate(
  repo_id="68025057",
  doc_id="266422684",
  replace_text={ "old": "错误句子B", "new": "正确句子B'" }
)
```
后端自动完成：读取当前内容 → 替换指定文本 → 提交更新。

**方式3：全量替换内容**
```
yuqueDocUpdate(
  repo_id="68025057",
  doc_id="266422684",
  title="新标题",
  content="# 新标题\n\n新内容",
  format="markdown"
)
```

### 7. 删除文档

```
yuqueDocRead(repo_id="68025057", doc_slug="abc123")
  → 获取 doc_id
  → yuqueDocDelete(repo_id="68025057", doc_id="266422684")
```

**⚠️ 警告**：删除操作不可逆，请确认后再执行！

---

## 注意事项

### 认证方式

- 使用浏览器 Cookie(`_yuque_session` + `_ctoken`)，不是 Token
- Cookie 获取方法：登录语雀 → F12 → Application → Cookies → 复制值
- **切勿泄露 Cookie，切勿提交到 Git！**

### 内容格式

| format | 字段 | 说明 |
|--------|------|------|
| `markdown` (推荐) | `body` | 直接传标准 Markdown，语雀服务端自动渲染 |
| `lake` (默认) | `body_asl` | 传入 Lake HTML，非 Lake 格式会自动转换 |
| `html` | `body` | 直接传 HTML，语雀服务端自动转换 |

- **Markdown 优先**：强烈推荐 `format="markdown"`，公式、表格、代码块都能正确渲染
- **兼容性**：如果传入的内容已经以 `<!doctype lake>` 开头，lake 模式下将跳过转换直接提交

### Markdown 格式规范

为确保语雀正确渲染，请遵守以下规范：

1. **段落顶格**：任何独立行的行首严禁出现前导空格
2. **无序列表**：统一使用 `-`(减号后跟一个空格)，不要用 `*` 或 `+`
3. **图片**：`![Alt text](URL)`，图注用引用格式 `> 图1: 描述`
4. **加粗**：`**` 必须紧密包裹文本，内侧不含空格或标点。如 `**重点**` ✅，`** 重点 **` ❌
5. **公式**：行内用 `$E=mc^2$`，块级用顶格的 `$$...$$`
6. **标点**：使用英文半角标点 `.` `,` `(` `)` `:` `"` 等
7. **分隔**：不同内容块之间用一个空行分隔

### ⚠️ 公式转义陷阱(必看)

Python 字符串中 `\f` 会被当作 **form feed (换页符)** 吃掉！这会导致 LaTeX 公式中的 `\frac`、`\pm`、`\sqrt` 等命令损坏。

**错误示例**(会产生 `rac` 而不是 `\frac`)：
```python
content="$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$"
# 实际变成: $$x = rac{-b m qrt{b^2-4ac}}{2a}$$
```

**正确写法**(三选一)：
```python
# 方法1: 双反斜杠
content="$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$"

# 方法2: 原始字符串(推荐)
content=r"$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$"

# 方法3: 用 ^ 替代 frac(避免反斜杠)
content="$$x = (-b + (b^2-4ac)^(1/2)) / (2a)$$"
```

常见需要转义的 LaTeX 命令：`\frac` `\pm` `\sqrt` `\sum` `\int` `\alpha` `\beta` 等

### 搜索不可用

- `yuqueSearch` 当前不可用(内部 Web API 不支持搜索)
- 如需查找文档，请使用 `yuqueRepoList` → `yuqueTocGet` 浏览目录

### 更新/删除需要 doc_id

- **读取用 slug，更新/删除用 id**
- doc_id 是数字(如 266422684)，doc_slug 是字符串(如 abc123)
- 必须先调用 `yuqueDocRead` 获取 doc_id

### 权限

- 只能操作自己拥有权限的知识库和文档
- 无法操作他人知识库(即使被邀请为协作者，也可能受限)

---

## 示例对话

### 示例 1：列出知识库

**用户**："帮我看看语雀里有什么知识库"

**Agent**：
```
yuqueRepoList()
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
yuqueTocGet(repo_id="68025057")
  → 获取第一个 DOC 的 slug
yuqueDocRead(repo_id="68025057", doc_slug="abc123")
```

### 示例 3：创建带公式的文档

**用户**："在那个知识库里创建一篇关于数学公式的文档"

**Agent**：
```
yuqueDocCreate(
  repo_id="68025057",
  title="数学公式速查",
  content="# 数学公式速查\n\n## 1. 二次方程求根公式\n\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n## 2. 质能方程\n\n质能方程是 $E = mc^2$。\n\n## 3. 常用公式表\n\n| 公式 | 说明 |\n|------|------|\n| $E=mc^2$ | 质能方程 |\n| $a^2+b^2=c^2$ | 勾股定理 |",
  format="markdown"
)
```

### 示例 4：更新文档

**用户**："把刚才那篇文档的标题改成项目总结"

**Agent**：
```
yuqueDocRead(repo_id="68025057", doc_slug="刚才创建的slug")
  → 获取 doc_id
yuqueDocUpdate(
  repo_id="68025057",
  doc_id="266422684",
  title="项目总结"
)
```

### 示例 5：删除文档

**用户**："把刚才那篇文档删了"

**Agent**：
```
yuqueDocRead(repo_id="68025057", doc_slug="刚才创建的slug")
  → 获取 doc_id
yuqueDocDelete(repo_id="68025057", doc_id="266422684")
```

### 示例 6：创建带图片的文档

**用户**："创建一篇带图片的文档"

**Agent**：
```
# 1. 上传图片
yuqueImageUpload(image_base64="data:image/png;base64,iVBORw0KGgo...", file_name="chart.png")
  → 返回 url: https://cdn.nlark.com/yuque/0/...

# 2. 创建带图片的文档
yuqueDocCreate(
  repo_id="68025057",
  title="项目报告",
  content="# 项目报告\n\n## 数据图表\n\n![项目数据图表](https://cdn.nlark.com/yuque/0/...)\n\n> 图1: 2024年Q1数据概览\n\n## 说明\n\n- 数据来源：内部统计\n- 更新时间：2024年3月",
  format="markdown"
)
```

---

## 相关文件

- **后端路由**：`server/routes/yuque.ts`
- **前端工具定义与执行器**：`src/theme/tools/yuque/` 下按功能分类的文件
  - `repo.ts`(知识库管理)
  - `doc.ts`(文档操作)
  - `image.ts`(图片上传)
  - `search.ts`(搜索)
  - `toc.ts`(目录获取)
- **Python 客户端**：`project/experiments/yuque-api/yuque_client.py`
- **Lake 构建器**：`project/experiments/yuque-api/lake_builder.py`
- **测试 Notebook**：`project/experiments/yuque-api/99_yuque_api_showcase.ipynb`
