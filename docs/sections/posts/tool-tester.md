# AI 工具测试平台

> 用于测试和验�?AI Agent 的各类工具功�?

<script setup>
import { ref, onMounted } from 'vue'
</script>

<ToolTester />

---

## 工具清单

### 📚 知识库文章管�?

| 工具�?| 功能 | 状�?|
|--------|------|------|
| `listArticles` | 列出文章目录 | �?可用 |
| `getArticleContent` | 读取文章内容 | �?可用 |
| `searchArticles` | 搜索文章 | �?可用 |
| `createArticle` | 创建新文�?| �?可用 |
| `updateArticle` | 更新文章 | �?可用 |
| `deleteArticle` | 删除文章 | �?可用 |

### 🌐 网络内容抓取

| 工具�?| 功能 | 状�?|
|--------|------|------|
| `fetchUrl` | 通用网页内容提取 | 🚧 开发中 |
| `fetchArxiv` | ArXiv 论文抓取 | 🚧 开发中 |
| `fetch_github` | GitHub 项目信息 | 🚧 开发中 |
| `fetch_github_file` | GitHub 文件内容 | 🚧 开发中 |

### 🛠�?系统工具

| 工具�?| 功能 | 状�?|
|--------|------|------|
| `getCurrentTime` | 获取当前时间 | �?可用 |
| `testEcho` | 回声测试 | �?可用 |

### 📝 文本处理

| 工具�?| 功能 | 状�?|
|--------|------|------|
| `summarizeText` | 文本摘要 | �?可用 |
| `formatText` | 文本格式�?| �?可用 |

---

## 使用说明

1. 在上方测试器中选择要测试的工具
2. 填写参数(支�?JSON 格式�?
3. 点击执行查看结果
4. 查看详细的执行日志和错误信息

---

## 错误码参�?

| 错误�?| 含义 | 解决方案 |
|--------|------|----------|
| `ARTICLE_NOT_FOUND` | 文章不存�?| 检查路径是否正�?|
| `PERMISSION_DENIED` | 权限不足 | 检查文件权�?|
| `INVALID_PATH` | 路径格式错误 | 使用正确的路径格�?|
| `NETWORK_ERROR` | 网络请求失败 | 检查网络连�?|
| `TIMEOUT` | 请求超时 | 稍后重试 |
