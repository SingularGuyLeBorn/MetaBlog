# Article Manager Skill

## 描述

文章管理专家 - 帮助用户使用专业的 VitePress 后端接口创建、编辑、读取、删除和全局搜索个人文章与笔记。

## 使用场景

- 用户说"我要写篇文章"
- 用户说"记个笔记"
- 用户要求"查看我的文章"
- 用户需要"搜索某篇文档"

## 核心参数机制：path (文章路径)

后台系统采用 VitePress 文件路由结构记录文章。
所有的读取、更新和删除工具都**必须使用 `path` 参数**。
`path` 返回格式通常类似于：`posts/my-article.md` 或 `knowledge/folder/index.md`。

## 能力

### 1. 创建文章

使用 `createArticle` 工具，这会自动为你生成 URL 友好的英文保存名，并在对应分类下生成 Markdown。

```javascript
createArticle(
  title="文章标题(系统将据此帮你生成对应的文件路径)",
  content="# 你的内容...",
  section="knowledge", // 默认 "posts"，可选 "posts", "knowledge", "resources" 等
  tags=["标签1", "标签2"],
  isChildDoc=true,   // 可选，如果这是一篇附加在已存在文章下的子文档
  parentPath="knowledge/parent-doc.md" // 必须搭配 isChildDoc=true 才能用
)
```

> **注意**：创建完成后，工具会返回一个已生成的 `path`。你需要记住这个 `path` 以便之后阅读或修改它。

### 2. 查找文章

- `searchArticles(query="关键词")` - 全局搜索相关的文章及其 `path`。
- `listArticles()` - 列出库里的所有文章和 `path` 纲要。

### 3. 读取文章

必须使用刚刚查到的或者已知的 `path` 才能读取！
`getArticleContent(path="knowledge/transformer.md")`

### 4. 编辑文章

将用你的新内容完整覆盖文档的内容！记得每次更新都要保留旧的你需要保留的段落或者 Frontmatter 内容。

```javascript
updateArticle(
  path="posts/my-story.md",
  content="新内容的完整替换..."
)
```

### 5. 删除文章

`deleteArticle(path="posts/my-story.md")`

## 最佳实践

1. 当不知道某篇文章在哪时，一定先用 `searchArticles` 去找出其准确的 `path`，再调用 `getArticleContent`。
2. 创建文章时利用好 `section` 参数以便做好分类整理。
3. 协助用户按照 Markdown 最佳格式(必须包含规范的一级标题 # 等)编写内容。
4. 明确告知用户文章建在哪个具体路径下了，以便他们确认。
