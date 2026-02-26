# AI 工具测试平台

> 用于测试和验证 AI Agent 的各类工具功能

<script setup>
import { ref, onMounted } from 'vue'
import ToolTester from '../../../.vitepress/theme/components/ToolTester.vue'
</script>

<ToolTester />

---

## 工具清单

### 📚 知识库文章管理

| 工具名 | 功能 | 状态 |
|--------|------|------|
| `list_articles` | 列出文章目录 | ✅ 可用 |
| `get_article_content` | 读取文章内容 | ✅ 可用 |
| `search_articles` | 搜索文章 | ✅ 可用 |
| `create_article` | 创建新文章 | ✅ 可用 |
| `update_article` | 更新文章 | ✅ 可用 |
| `delete_article` | 删除文章 | ✅ 可用 |

### 🌐 网络内容抓取

| 工具名 | 功能 | 状态 |
|--------|------|------|
| `fetch_url` | 通用网页内容提取 | 🚧 开发中 |
| `fetch_arxiv` | ArXiv 论文抓取 | 🚧 开发中 |
| `fetch_github` | GitHub 项目信息 | 🚧 开发中 |
| `fetch_github_file` | GitHub 文件内容 | 🚧 开发中 |

### 🛠️ 系统工具

| 工具名 | 功能 | 状态 |
|--------|------|------|
| `get_current_time` | 获取当前时间 | ✅ 可用 |
| `test_echo` | 回声测试 | ✅ 可用 |

### 📝 文本处理

| 工具名 | 功能 | 状态 |
|--------|------|------|
| `summarize_text` | 文本摘要 | ✅ 可用 |
| `format_text` | 文本格式化 | ✅ 可用 |

---

## 使用说明

1. 在上方测试器中选择要测试的工具
2. 填写参数（支持 JSON 格式）
3. 点击执行查看结果
4. 查看详细的执行日志和错误信息

---

## 错误码参考

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| `ARTICLE_NOT_FOUND` | 文章不存在 | 检查路径是否正确 |
| `PERMISSION_DENIED` | 权限不足 | 检查文件权限 |
| `INVALID_PATH` | 路径格式错误 | 使用正确的路径格式 |
| `NETWORK_ERROR` | 网络请求失败 | 检查网络连接 |
| `TIMEOUT` | 请求超时 | 稍后重试 |
