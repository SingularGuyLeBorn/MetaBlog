# Article Manager Skill

## 描述
文章管理专家 - 帮助用户创建、编辑、删除和搜索个人文章与笔记

## 使用场景
- 用户说"我要写篇文章"
- 用户说"记个笔记"
- 用户要求"查看我的文章"
- 用户需要"搜索某篇文档"

## 能力

### 创建文章
使用 `create_article` 工具：
```
create_article(
  title="文章标题",
  content="文章内容（支持 Markdown）",
  tags=["标签1", "标签2"],
  category="分类",
  status="draft"  // draft 或 published
)
```

### 查看文章
- `list_articles()` - 列出所有文章
- `get_article(article_id)` - 获取单篇文章
- `search_articles(query)` - 搜索文章

### 编辑文章
```
update_article(
  article_id="xxx",
  title="新标题",
  content="新内容"
)
```

### 删除文章
`delete_article(article_id)`

## 最佳实践
1. 为用户自动提取文章摘要
2. 建议合适的标签和分类
3. 鼓励使用 Markdown 格式
4. 帮助用户整理文章结构

## 示例对话

**用户**: 我要写一篇关于 Transformer 的笔记
**助手**: 好的，我来帮你创建这篇笔记。
```
[调用 create_article]
```
已创建文章《Transformer 架构详解》，你可以继续编辑内容。

**用户**: 查看我所有的文章
**助手**: 
```
[调用 list_articles]
```
这是你的文章列表：...
