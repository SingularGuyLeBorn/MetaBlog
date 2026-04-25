/**
 * GitHub 工具：Issue 操作
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

export const githubGetIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetIssues',
    description: `获取 GitHub 仓库的 Issues。查看问题、bug 报告、功能请求。

使用场景：
1. 了解项目已知的问题
2. 查看功能请求和讨论
3. 了解社区反馈
4. 查看问题的解决方案`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        state: {
          type: 'string',
          description: 'Issue 状态：open（开放）、closed（已关闭）、all（全部），默认open',
          enum: ['open', 'closed', 'all'],
          default: 'open'
        },
        per_page: {
          type: 'number',
          description: '返回数量，默认10，最多30',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubCreateIssueDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateIssue',
    description: `在 GitHub 仓库创建 Issue。提交 bug 报告、功能请求或任务。

注意：需要 GITHUB_TOKEN 且有对应仓库的 write 权限。`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        title: {
          type: 'string',
          description: 'Issue 标题'
        },
        body: {
          type: 'string',
          description: 'Issue 正文内容（支Markdown
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表，例如["bug", "enhancement"]'
        }
      },
      required: ['owner', 'repo', 'title']
    }
  }
}

export const githubCreateIssueCommentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateIssueComment',
    description: `在 GitHub Issue 或 PR 下添加评论。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者 },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue PR 编号' },
        body: { type: 'string', description: '评论内容（支Markdown }
      },
      required: ['owner', 'repo', 'number', 'body']
    }
  }
}

export const githubUpdateIssueDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubUpdateIssue',
    description: `更新 GitHub Issue 或 PR 的状态、标题、正文、标签。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者 },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue 编号' },
        title: { type: 'string', description: '新标题（可选）' },
        body: { type: 'string', description: '新正文（可选）' },
        state: { type: 'string', enum: ['open', 'closed'], description: '状 },
        labels: { type: 'array', items: { type: 'string' }, description: '标签列表（可选）' }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubListIssueCommentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListIssueComments',
    description: `列出 GitHub Issue 或 PR 的所有评论。

使用场景：
1. 查看 Issue 的讨论历史
2. 获取 PR 的审查评论
3. 跟踪问题解决过程中的讨论`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者 },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue PR 编号' },
        per_page: { type: 'number', description: '每页数量，默认30', default: 30 }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubSearchIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubSearchIssues',
    description: `搜索 GitHub Issues 和 Pull Requests。支持全局搜索或指定仓库内搜索。

使用场景：
1. 查找某个技术问题的解决方案
2. 搜索 Bug 报告和修复状态
3. 发现正在讨论的新功能
4. 在特定仓库内搜索 Issue

搜索语法示例：
- "memory leak repo:facebook/react" - 在 React 仓库搜索内存泄漏
- "is:pr is:open label:bug" - 搜索开放的 Bug PR
- "is:issue author:octocat" - 搜索某用户创建的 Issue
- "sort:updated-desc" - 按最近更新排序`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，支持 GitHub 搜索语法'
        },
        per_page: {
          type: 'number',
          description: '每页结果数，默认 10，最多100',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

// ============ ToolExecutors ============

export const githubGetIssues: ToolExecutor = async (args) => callGitHubTool('githubGetIssues', args)

export const githubCreateIssue: ToolExecutor = async (args) => callGitHubTool('githubCreateIssue', args)

export const githubCreateIssueComment: ToolExecutor = async (args) => callGitHubTool('githubCreateIssueComment', args)

export const githubUpdateIssue: ToolExecutor = async (args) => callGitHubTool('githubUpdateIssue', args)

export const githubListIssueComments: ToolExecutor = async (args) => callGitHubTool('githubListIssueComments', args)

export const githubSearchIssues: ToolExecutor = async (args) => callGitHubTool('githubSearchIssues', args)
