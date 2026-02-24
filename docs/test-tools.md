# 🔧 工具测试页面

此页面用于测试 AI Chat 的各种工具是否正常工作。

## 快速测试命令

复制以下命令到 AI 聊天框进行测试：

### 1. MCP 工具测试

```
使用 MCP 工具计算: 123 + 456 * 2
```

```
用 text_stats 统计这段文字：这是一段测试文字，包含 123 个字符。
```

```
获取系统信息
```

### 2. fetch_url 测试

**测试可访问的 API：**
```
fetch_url https://api.github.com/users/octocat
```

**测试带超时的请求：**
```
fetch_url https://httpbin.org/get timeout=5000
```

**测试 POST 请求：**
```
fetch_url https://httpbin.org/post method=POST body={"test": "hello"}
```

### 3. 文章工具测试

```
创建一篇测试文章，标题是"工具测试"，内容是测试内容，保存在 sections/posts/test-tool.md
```

```
查看文件 docs/sections/posts/test-tool.md 的内容
```

```
删除文件 sections/posts/test-tool.md
```

### 4. GitHub 工具测试

```
查看 GitHub 仓库 facebook/react 的信息
```

```
搜索 GitHub 上包含 "vue" 的代码，语言为 TypeScript
```

```
获取 facebook/react 仓库的 README.md 文件内容
```

### 5. 搜索工具测试

```
搜索本地关于 "Vue" 的文章
```

## 诊断步骤

如果 `fetch_url` 返回 504 错误：

1. **检查目标网站**：在浏览器中直接访问该 URL
2. **检查网络**：运行 `ping api.github.com` 确认网络连通
3. **增加超时时间**：使用 `timeout=20000` 参数
4. **检查代理**：某些网站可能需要特定的 User-Agent

## 预期结果

| 工具 | 预期行为 |
|------|----------|
| MCP math | 返回计算结果 |
| MCP text_stats | 返回字数、字符数统计 |
| MCP system_info | 返回平台、时区信息 |
| fetch_url | 返回网页内容或 JSON |
| create_article | 创建新文章文件 |
| github_get_repo | 返回仓库信息 |
