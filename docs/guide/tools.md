# 工具系统

MetaBlog 拥有完整的工具调用框架，AI 可以通过工具直接操作博客内容、查询外部信息、执行代码等。

---

## 🏗️ 工具系统架构

```
AI 决策层
    ↓
Function Calling (OpenAI 格式)
    ↓
工具注册表 (registry.ts)
    ↓
分类工具执行器 (article/*.ts, github/*.ts, lark/*.ts, yuque/*.ts, ...)
    ↓
结果处理 → 返回给 AI
```

### 核心概念

| 概念 | 说明 |
|------|------|
| **ToolDefinition** | 工具 Schema 定义（OpenAI Function Calling 格式） |
| **ToolExecutor** | 工具执行函数 |
| **ToolResult** | 统一返回格式（成功/失败） |
| **ToolRegistration** | 工具注册信息（定义 + 执行器绑定） |

---

## 📋 内置工具清单

### 文章管理（6个）

| 工具名 | 功能 | 示例调用 |
|--------|------|---------|
| `get_article_content` | 读取文章内容 | `get_article_content(path="/sections/posts/hello")` |
| `search_articles` | 全文搜索 | `search_articles(query="Docker")` |
| `list_articles` | 列出目录文章 | `list_articles(folder_path="/sections/knowledge/ml/")` |
| `create_article` | 创建文章 | `create_article(title="新文章", path="posts/article.md")` |
| `update_article` | 更新文章 | `update_article(path="...", content="...", mode="append")` |
| `delete_article` | 删除文章 | `delete_article(path="...", confirm=true)` |

### GitHub 仓库查询与管理（13个）

| 工具名 | 功能 |
|--------|------|
| `github_get_repo` | 获取仓库信息 |
| `github_list_repo_contents` | 浏览目录结构 |
| `github_get_file_content` | 读取源码文件 |
| `github_search_code` | 搜索开源代码 |
| `github_get_commit_history` | 查看提交历史 |
| `github_get_readme` | 获取 README |
| `github_compare_commits` | 对比提交差异 |
| `github_get_rate_limit` | 查看 API 限额 |
| `github_search_repos` | 搜索仓库 |
| `github_create_repo` | 创建仓库 |
| `github_update_repo` | 更新仓库 |
| `github_delete_repo` | 删除仓库 |
| `github_create_release` | 创建 Release |

### GitHub Issue（6个）

| 工具名 | 功能 |
|--------|------|
| `github_get_issues` | 查看 Issues |
| `github_create_issue` | 创建 Issue |
| `github_create_issue_comment` | 创建评论 |
| `github_update_issue` | 更新 Issue |
| `github_list_issue_comments` | 列出评论 |
| `github_search_issues` | 搜索 Issues |

### GitHub Pull Request（6个）

| 工具名 | 功能 |
|--------|------|
| `github_list_pulls` | 列出 PR |
| `github_get_pull` | 获取 PR 详情 |
| `github_create_pull_request` | 创建 PR |
| `github_merge_pull_request` | 合并 PR |
| `github_get_pull_request_files` | 获取 PR 文件变更 |
| `github_create_pull_request_review` | 创建 PR Review |

### GitHub 文件操作（2个）

| 工具名 | 功能 |
|--------|------|
| `github_create_or_update_file` | 创建/更新文件 |
| `github_delete_file` | 删除文件 |

### GitHub 分支与 Fork（4个）

| 工具名 | 功能 |
|--------|------|
| `github_create_branch` | 创建分支 |
| `github_delete_branch` | 删除分支 |
| `github_fork_repo` | Fork 仓库 |
| `github_list_branches` | 列出分支 |

### GitHub 工作流（3个）

| 工具名 | 功能 |
|--------|------|
| `github_list_workflows` | 列出工作流 |
| `github_list_workflow_runs` | 列出工作流运行 |
| `github_trigger_workflow` | 触发工作流 |

### 飞书文档（13个）

| 工具名 | 功能 |
|--------|------|
| `feishu_doc_create` | 创建飞书文档（支持自动分配权限） |
| `feishu_doc_read` | 读取文档内容 |
| `feishu_doc_meta` | 获取文档元信息 |
| `feishu_doc_search` | 搜索文档 |
| `feishu_doc_blocks` | 获取文档块列表 |
| `feishu_doc_append` | 追加内容（支持表格、代码块、公式） |
| `feishu_doc_update_block` | 更新文档块 |
| `feishu_doc_delete_block` | 删除文档块 |
| `feishu_doc_insert_image` | 插入图片到文档 |
| `feishu_doc_share` | 分享文档权限 |
| `feishu_doc_unshare` | 取消文档权限 |
| `feishu_im_send` | 发送 IM 消息 |
| `feishu_user_search` | 搜索用户 |

### 飞书 Wiki 知识库（13个）

| 工具名 | 功能 |
|--------|------|
| `feishu_wiki_space_create` | 创建知识库空间 |
| `feishu_wiki_space_list` | 列出知识库空间 |
| `feishu_wiki_space_get` | 获取空间详情 |
| `feishu_wiki_space_update` | 更新空间信息 |
| `feishu_wiki_space_delete` | 删除空间 |
| `feishu_wiki_node_create` | 创建 Wiki 节点 |
| `feishu_wiki_node_list` | 列出节点 |
| `feishu_wiki_node_delete` | 删除节点 |
| `feishu_wiki_node_move` | 移动节点 |
| `feishu_wiki_move_doc` | 将外部文档迁入 Wiki |
| `feishu_wiki_member_list` | 获取成员列表 |
| `feishu_wiki_member_add` | 添加成员 |
| `feishu_wiki_member_remove` | 移除成员 |

### 语雀文档（9个）

| 工具名 | 功能 |
|--------|------|
| `yuque_repo_list` | 列出知识库 |
| `yuque_toc_get` | 获取目录结构 |
| `yuque_doc_list` | 列出文档 |
| `yuque_doc_read` | 读取文档 |
| `yuque_doc_create` | 创建文档 |
| `yuque_doc_update` | 更新文档 |
| `yuque_doc_delete` | 删除文档 |
| `yuque_image_upload` | 上传图片 |
| `yuque_search` | 搜索文档 |

### 语雀知识库管理（6个）

| 工具名 | 功能 |
|--------|------|
| `yuque_repo_create` | 创建知识库 |
| `yuque_repo_update` | 更新知识库 |
| `yuque_repo_delete` | 删除知识库 |
| `yuque_repo_get` | 获取知识库详情 |
| `yuque_repo_setting_get` | 获取知识库设置 |
| `yuque_repo_setting_update` | 更新知识库设置 |

### 网络（2个）

| 工具名 | 功能 |
|--------|------|
| `fetch_url` | HTTP 请求（GET/POST/PUT/DELETE），支持 HTML 提取 |
| `web_search` | DuckDuckGo 搜索（零成本） |

### 代码（2个）

| 工具名 | 功能 |
|--------|------|
| `execute_code` | 在沙箱中执行 Python/JS/Bash |
| `analyze_code` | 代码分析 |

### 学术研究（8个）

| 工具名 | 功能 |
|--------|------|
| `search_arxiv` | 搜索 arXiv 论文 |
| `fetch_arxiv` | 获取 arXiv 论文详情 |
| `search_openreview` | 搜索 OpenReview |
| `fetch_openreview` | 获取 OpenReview 论文详情 |
| `search_huggingface` | 搜索 HuggingFace 模型 |
| `fetch_huggingface_model` | 获取 HuggingFace 模型详情 |
| `search_paperswithcode` | 搜索 Papers with Code |
| `search_semantic_scholar` | 搜索 Semantic Scholar |

### 文件操作（3个）

| 工具名 | 功能 |
|--------|------|
| `read_file` | 读取文件 |
| `write_file` | 写入文件 |
| `list_files` | 列出目录 |

### 平台解析（9个）

| 工具名 | 功能 |
|--------|------|
| `parse_zhihu` | 解析知乎文章 |
| `parse_xiaohongshu` | 解析小红书笔记 |
| `parse_wechat` | 解析微信公众号文章 |
| `parse_douyin` | 解析抖音 |
| `parse_bilibili` | 解析 B 站 |
| `parse_weibo` | 解析微博 |
| `parse_platform_link` | 通用平台链接解析 |
| `ocr_image` | OCR 图片识别 |
| `process_image` | 图片处理 |

### 文本处理（3个）

| 工具名 | 功能 |
|--------|------|
| `summarize_text` | 文本摘要 |
| `format_text` | 文本格式化 |
| `translate_text` | 文本翻译 |

### 系统（4个）

| 工具名 | 功能 |
|--------|------|
| `get_current_time` | 获取当前时间 |
| `get_weather` | 获取天气 |
| `calculate` | 数学计算 |
| `test_echo` | 回声测试 |

### 笔记（3个）

| 工具名 | 功能 |
|--------|------|
| `create_note` | 创建笔记 |
| `list_notes` | 列出笔记 |
| `query_knowledge` | 查询知识库 |

---

## 🔌 MCP 外部扩展

通过 MCP (Model Context Protocol) 接入外部工具服务。

### 预设配置（20+）

| 类别 | 服务 |
|------|------|
| 代码平台 | GitHub、GitLab、Bitbucket |
| 社交媒体 | 知乎、小红书、微博、Twitter |
| 开发工具 | Puppeteer、Playwright、PostgreSQL、SQLite、Docker、K8s |
| 生产力 | Slack、Notion、Google Drive、Brave Search |

### 使用方法

1. 在 `/chat` 页面打开 MCP 面板
2. 选择预设配置并填入凭证
3. 连接成功后工具自动注册到 Agent

---

## 🛠️ 自定义工具开发

### 目录结构

```
src/theme/tools/<category>/
├── <feature>.ts     # 工具定义 + 执行器（同一文件）
├── ...              # 其他功能分类文件
└── index.ts         # 统一导出
```

### 第 1 步：定义工具 Schema 和执行器

```typescript
// src/theme/tools/my-category/feature.ts
import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

// --- 定义 ---
export const myToolDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: '一句话描述工具功能，让 AI 知道何时调用它',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: '参数说明：格式要求、取值范围、示例值'
        }
      },
      required: ['param1']
    }
  }
}

// --- 执行器 ---
export const myTool: ToolExecutor = async (args) => {
  const { param1 } = args

  // 参数校验
  if (!param1) {
    return createErrorResult('Missing param1', '缺少必要参数')
  }

  try {
    // 执行逻辑
    const result = await doSomething(param1)
    return createSuccessResult(result, '操作成功', 'my_tool')
  } catch (error: any) {
    return createErrorResult(error.message, '操作失败')
  }
}
```

### 第 3 步：注册到系统

```typescript
// src/theme/tools/my-category/index.ts
export { myTool, myToolDef } from './feature'

// src/theme/tools/index.ts
import { myTool, myToolDef } from './my-category'

registerTools([
  { name: 'my_tool', definition: myToolDef, executor: myTool }
])
```

---

## 🧪 工具测试

访问 `/chat` 页面的工具测试面板（ToolTester.vue），可以：

1. **单个测试**：选择工具，填写参数，执行测试
2. **批量测试**：一键测试所有工具
3. **查看报告**：成功率统计、错误详情

---

## 📐 工具返回格式

所有工具必须返回统一格式：

```typescript
interface ToolResult {
  success: boolean
  data?: any          // 成功时的数据
  error?: string      // 失败时的错误信息
  message?: string    // 用户友好的提示
  toolName: string    // 工具名称
}
```

### 成功示例

```typescript
createSuccessResult(
  { articleId: '123', title: '新文章' },
  '文章创建成功',
  'create_article'
)
```

### 失败示例

```typescript
createErrorResult(
  'Path not found',
  '文件路径不存在，请检查路径是否正确'
)
```
