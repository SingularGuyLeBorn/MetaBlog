---
name: 语雀助手
description: |
  通过语雀内部 Web API 操作知识库和文档，完全免费无需会员。
  触发时机：用户提到"语雀""知识库""文档""Yuque"等。
  不适用：与语雀无关的通用聊天或需要语雀 API 开发指导。
---

# 语雀助手

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

### 2. 获取知识库目录
```
yuqueTocGet(repo_id="68025057")
  → 返回目录结构(TITLE 目录项 + DOC 文档项)
```

### 3. 读取文档内容
```
yuqueDocRead(repo_id="68025057", doc_slug="abc123")
  → 返回文档标题和内容(Lake HTML 格式)
```
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
获取 URL 后，在文档内容中用 Markdown 图片语法引用。

### 5. 创建文档(推荐 Markdown 格式)
**最佳实践**：传 `format="markdown"`，直接上传标准 Markdown，语雀服务端自动渲染。
```
yuqueDocCreate(
  repo_id="68025057",
  title="新文档标题",
  content="# 标题\n\n$E=mc^2$\n\n| a | b |\n|---|---|\n| 1 | 2 |",
  format="markdown"
)
```
- **Markdown 原生渲染**：公式/表格/代码块都能正确渲染
- **数学公式**：支持 `$formula$`(行内) 和 `$$formula$$`(行间)
- **注意**：创建后文档**不会自动出现在知识库目录中**

### 6. 更新文档
**必须先读取文档获取 doc_id。**

**⚠️ 更新行为：全量替换，不是追加！**

| 传参方式 | 效果 |
|---------|------|
| 只传 `title` | ✅ 只改标题，保留原有内容 |
| 传 `content` | ⚠️ 整个文档内容被替换为新内容 |
| 传 `replace_text` | ✅ 智能局部替换(只改一句话) |

```
# 局部替换（推荐）
yuqueDocUpdate(
  repo_id="68025057",
  doc_id="266422684",
  replace_text={ "old": "错误句子B", "new": "正确句子B'" }
)

# 全量替换
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

### Markdown 格式规范
1. **段落顶格**：任何独立行的行首严禁出现前导空格
2. **无序列表**：统一使用 `-`(减号后跟一个空格)，不要用 `*` 或 `+`
3. **图片**：`![Alt text](URL)`，图注用引用格式 `> 图1: 描述`
4. **加粗**：`**` 必须紧密包裹文本，如 `**重点**` ✅，`** 重点 **` ❌
5. **公式**：行内用 `$E=mc^2$`，块级用顶格的 `$$...$$`
6. **标点**：使用英文半角标点 `.` `,` `(` `)` `:` `"` 等
7. **分隔**：不同内容块之间用一个空行分隔

### ⚠️ 公式转义陷阱(必看)
Python 字符串中 `\f` 会被当作 **form feed (换页符)** 吃掉！这会导致 LaTeX 公式中的 `\frac`、`\pm`、`\sqrt` 等命令损坏。

**错误示例**：
```python
content="$$x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$$"
# 实际变成: $$x = rac{-b m qrt{b^2-4ac}}{2a}$$
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

### 其他陷阱
- **搜索不可用**：`yuqueSearch` 当前不可用，如需查找文档请用 `yuqueRepoList` → `yuqueTocGet`
- **读取用 slug，更新/删除用 id**：doc_id 是数字，doc_slug 是字符串
- **权限**：只能操作自己拥有权限的知识库和文档

---

## 示例对话

**用户**："帮我看看语雀里有什么知识库"
→ `yuqueRepoList()`

**用户**："在那个知识库里创建一篇关于数学公式的文档"
→ `yuqueDocCreate(repo_id="...", title="数学公式速查", content="...", format="markdown")`

---

## 相关文件

- **后端路由**：`server/routes/yuque.ts`
- **前端工具定义与执行器**：`src/theme/tools/yuque/` 下按功能分类的文件
- **Python 客户端**：`project/experiments/yuque-api/yuque_client.py`
