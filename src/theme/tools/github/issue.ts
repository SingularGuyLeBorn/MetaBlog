/**
 * ============================================================================
 * GitHub Issue 操作工具
 * ============================================================================
 *
 * 提供 GitHub Issue 的查询、创建、更新、评论和搜索功能. 
 * 所有操作通过后端 BFF 代理转发,前端只负责传参. 
 *
 * @module src/theme/tools/github/issue
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

/**
 * 获取 Issues 列表的工具定义
 */
export const githubGetIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetIssues',
    description: `获取 GitHub 仓库的 Issues 列表. 查看问题报告、功能请求、讨论等. 

使用场景：
1. 了解项目已知的问题和 bug
2. 查看社区提交的功能请求
3. 了解用户反馈和讨论主题
4. 追踪某个问题的解决方案

示例用法：
- 查看开放的 Issues：state="open"(默认)
- 查看所有 Issues 包括已关闭的：state="all"
- 查看最近 20 个：per_page=20

注意事项：
- 默认只返回开放的 Issues,需要查看已关闭的要指定 state="all"
- 返回结果按创建时间倒序排列
- 如果需要搜索特定关键词,请使用 githubSearchIssues`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        state: {
          type: 'string',
          description: 'Issue 状态筛选：open(只返回开放的)、closed(只返回已关闭的)、all(返回全部). 默认 open',
          enum: ['open', 'closed', 'all'],
          default: 'open'
        },
        per_page: {
          type: 'number',
          description: '每页返回的 Issue 数量,默认 10,最多 100. 建议不超过 30 以保持响应速度',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

/**
 * 创建 Issue 的工具定义
 */
export const githubCreateIssueDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateIssue',
    description: `在 GitHub 仓库创建 Issue. 用于提交 bug 报告、功能请求、任务或讨论主题. 

使用场景：
1. 发现 bug 后向项目维护者报告
2. 提出新功能建议
3. 创建开发任务或 TODO 项
4. 发起技术讨论

示例用法：
- 提交 bug：title="登录按钮点击无响应", body="环境：Chrome 120...\n复现步骤：..."
- 提功能请求：title="[Feature] 支持暗黑模式", labels=["enhancement"]
- 简单任务：title="更新依赖版本到最新", labels=["chore"]

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- title 必须填写,body 可选但建议详细描述
- labels 必须是仓库已存在的标签,不存在的标签会被忽略
- 创建后 Issue 编号会自动分配`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        title: {
          type: 'string',
          description: 'Issue 标题,简明扼要描述问题或需求,例如 "登录页面在 Safari 下样式错乱"'
        },
        body: {
          type: 'string',
          description: 'Issue 正文内容,支持 Markdown 格式. 建议包含：问题描述、复现步骤、期望行为、实际行为、环境信息'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表,例如 ["bug"], ["enhancement", "help wanted"]. 必须是仓库已存在的标签'
        }
      },
      required: ['owner', 'repo', 'title']
    }
  }
}

/**
 * 创建 Issue 评论的工具定义
 */
export const githubCreateIssueCommentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateIssueComment',
    description: `在 GitHub Issue 或 Pull Request 下添加评论. 

使用场景：
1. 回复用户的问题或反馈
2. 在 Issue 中补充信息或更新进展
3. 在 PR 下进行一般性讨论(非代码审查评论)
4. 通知相关人员查看 Issue/PR

示例用法：
- 回复 bug 报告：body="感谢报告！这个问题已在 v2.1.0 中修复,请升级后重试. "
- 更新进展：body="当前进展：\n- [x] 复现问题\n- [ ] 编写修复\n- [ ] 发布版本"

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- 这里的 number 是 Issue 或 PR 的编号(URL 中 # 后面的数字)
- 如需提交正式的代码审查 Review(APPROVE/REQUEST_CHANGES),请使用 githubCreatePullRequestReview
- 支持 Markdown 格式,包括 @mention 提及用户`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        number: {
          type: 'number',
          description: 'Issue 或 PR 的编号(URL 中 # 后面的数字),例如 42'
        },
        body: {
          type: 'string',
          description: '评论内容,支持 Markdown 格式. 例如 "感谢反馈！这个问题已确认,正在修复中. "'
        }
      },
      required: ['owner', 'repo', 'number', 'body']
    }
  }
}

/**
 * 更新 Issue 的工具定义
 */
export const githubUpdateIssueDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubUpdateIssue',
    description: `更新 GitHub Issue 或 Pull Request 的标题、正文、状态或标签. 

使用场景：
1. 修正 Issue 的标题使其更准确
2. 补充或更新 Issue 的描述内容
3. 关闭已解决的 Issue 或 PR
4. 重新打开需要继续处理的 Issue
5. 添加或移除标签以分类管理

示例用法：
- 关闭 Issue：state="closed"
- 修改标题：title="[已修复] 登录按钮点击无响应"
- 添加标签：labels=["bug", "priority:high"]
- 同时更新多个字段：title="新标题", body="更新后的内容", state="closed"

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- 所有字段都是可选的,只传需要修改的字段
- 传入 labels 会完全替换原有标签,不是追加
- 关闭 PR 与合并 PR 是不同的操作,合并请使用 githubMergePullRequest`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        number: {
          type: 'number',
          description: 'Issue 或 PR 的编号(URL 中 # 后面的数字),例如 42'
        },
        title: {
          type: 'string',
          description: '新标题(可选). 不传入则保持原标题不变'
        },
        body: {
          type: 'string',
          description: '新正文内容(可选),支持 Markdown. 不传入则保持原内容不变'
        },
        state: {
          type: 'string',
          enum: ['open', 'closed'],
          description: '状态(可选)：open(重新打开)、closed(关闭). 不传入则保持原状态'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表(可选),例如 ["bug", "enhancement"]. 传入后会完全替换原有标签,不是追加. 不传入则保持原标签不变'
        }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

/**
 * 列出 Issue 评论的工具定义
 */
export const githubListIssueCommentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListIssueComments',
    description: `列出 GitHub Issue 或 Pull Request 的所有评论. 

使用场景：
1. 查看 Issue 的完整讨论历史
2. 获取 PR 中的评论和反馈
3. 跟踪问题解决过程中的沟通记录
4. 查找某个用户发表的评论

示例用法：
- 查看 Issue #42 的所有评论
- 查看最近 50 条评论：per_page=50

注意事项：
- 返回结果按时间正序排列(最早的评论在前)
- 只返回普通评论,不包含代码行级评论(line comments)
- 如需查看代码审查 Review,请使用相关 PR Review API`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        number: {
          type: 'number',
          description: 'Issue 或 PR 的编号(URL 中 # 后面的数字),例如 42'
        },
        per_page: {
          type: 'number',
          description: '每页返回的评论数量,默认 30,最多 100',
          default: 30
        }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

/**
 * 搜索 Issues 的工具定义
 */
export const githubSearchIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubSearchIssues',
    description: `搜索 GitHub Issues 和 Pull Requests. 支持全局搜索或指定仓库内搜索. 

使用场景：
1. 查找某个技术问题的解决方案
2. 搜索特定标签或状态的 Bug 报告
3. 发现正在讨论的新功能
4. 在特定仓库内搜索相关 Issue
5. 查找自己创建或参与的 Issue/PR

搜索语法示例：
- "memory leak repo:facebook/react" — 在 React 仓库搜索内存泄漏相关 Issue
- "is:pr is:open label:bug" — 搜索开放的 Bug PR
- "is:issue author:octocat" — 搜索某用户创建的 Issue
- "sort:updated-desc" — 按最近更新时间排序
- "is:closed label:bug created:>2024-01-01" — 搜索 2024 年后关闭的 bug

注意事项：
- 支持 GitHub 高级搜索语法,可用 is:、repo:、label:、author:、sort: 等限定词
- 未限定 repo: 时进行全局搜索,可能受 GitHub API 速率限制
- 每页最多返回 100 条结果,默认 10 条
- 搜索结果按相关度排序`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词,支持 GitHub 高级搜索语法. 例如 "memory leak repo:facebook/react"、"is:issue is:open label:bug"'
        },
        per_page: {
          type: 'number',
          description: '每页返回的结果数量,默认 10,最多 100',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

// ============ ToolExecutors ============

/**
 * 获取 Issues 列表
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubGetIssues: ToolExecutor = async (args) => callGitHubTool('githubGetIssues', args)

/**
 * 创建 Issue
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubCreateIssue: ToolExecutor = async (args) => callGitHubTool('githubCreateIssue', args)

/**
 * 创建 Issue 评论
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubCreateIssueComment: ToolExecutor = async (args) => callGitHubTool('githubCreateIssueComment', args)

/**
 * 更新 Issue
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubUpdateIssue: ToolExecutor = async (args) => callGitHubTool('githubUpdateIssue', args)

/**
 * 列出 Issue 评论
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubListIssueComments: ToolExecutor = async (args) => callGitHubTool('githubListIssueComments', args)

/**
 * 搜索 Issues
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubSearchIssues: ToolExecutor = async (args) => callGitHubTool('githubSearchIssues', args)
