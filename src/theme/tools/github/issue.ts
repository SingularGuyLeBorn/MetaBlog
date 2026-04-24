/**
 * GitHub 工具：Issue 操作
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { githubRequest, translateGitHubError } from './utils'

// ============ ToolDefinitions ============

export const githubGetIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_issues',
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
          description: '仓库所有者'
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        state: {
          type: 'string',
          description: 'Issue 状态：open（开放）、closed（已关闭）、all（全部），默认 open',
          enum: ['open', 'closed', 'all'],
          default: 'open'
        },
        per_page: {
          type: 'number',
          description: '返回数量，默认 10，最大 30',
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
    name: 'github_create_issue',
    description: `在 GitHub 仓库创建 Issue。提交 bug 报告、功能请求或任务。

注意：需要 GITHUB_TOKEN 且有对应仓库的 write 权限。`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者'
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
          description: 'Issue 正文内容（支持 Markdown）'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表，例如 ["bug", "enhancement"]'
        }
      },
      required: ['owner', 'repo', 'title']
    }
  }
}

export const githubCreateIssueCommentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_issue_comment',
    description: `在 GitHub Issue 或 PR 下添加评论。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue 或 PR 编号' },
        body: { type: 'string', description: '评论内容（支持 Markdown）' }
      },
      required: ['owner', 'repo', 'number', 'body']
    }
  }
}

export const githubUpdateIssueDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_update_issue',
    description: `更新 GitHub Issue 或 PR 的状态、标题、正文、标签。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue 编号' },
        title: { type: 'string', description: '新标题（可选）' },
        body: { type: 'string', description: '新正文（可选）' },
        state: { type: 'string', enum: ['open', 'closed'], description: '状态' },
        labels: { type: 'array', items: { type: 'string' }, description: '标签列表（可选）' }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubListIssueCommentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_issue_comments',
    description: `列出 GitHub Issue 或 PR 的所有评论。

使用场景：
1. 查看 Issue 的讨论历史
2. 获取 PR 的审查评论
3. 跟踪问题解决过程中的讨论`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue 或 PR 编号' },
        per_page: { type: 'number', description: '每页数量，默认 30', default: 30 }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubSearchIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_search_issues',
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
          description: '每页结果数，默认 10，最大 100',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

// ============ ToolExecutors ============

/**
 * GitHub 工具：获取 Issues 列表
 *
 * 列出仓库的 Issues，支持按状态过滤。返回结果自动过滤掉 Pull Request。
 *
 * 典型使用场景：
 * - 跟踪 Bug 修复进度
 * - 管理任务清单
 *
 * API: GET /repos/{owner}/{repo}/issues
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.state - 状态过滤：open、closed、all，默认 open
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data 字段包含 Issue 数组（已过滤 PR）
 */
export const githubGetIssues: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, state = 'open', per_page = 10 } = args

  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_get_issues(owner="facebook", repo="react")'
    )
  }

  try {
    const issues = await githubRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${per_page}`)

    // GitHub Issues API 默认把 PR 也当作 issue 返回，过滤掉 PR
    const items = issues
      .filter((issue: any) => !issue.pull_request)
      .map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user.login,
        createdAt: issue.created_at
      }))

    return createSuccessResult(
      items,
      `${owner}/${repo} 的 ${state} Issues (${items.length} 条)`,
      'github_get_issues'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 Issue
 *
 * 在指定仓库创建新的 Issue。支持标题、正文、标签、负责人和里程碑。
 *
 * 典型使用场景：
 * - 跟踪 Bug 修复进度
 * - 管理任务清单
 *
 * API: POST /repos/{owner}/{repo}/issues
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.title - Issue 标题
 * @param args.body - Issue 正文（支持 Markdown，可选）
 * @param args.labels - 标签数组（可选）
 * @param args.assignees - 负责人用户名数组（可选）
 * @returns ToolResult，data 字段包含新创建的 Issue 信息
 */
export const githubCreateIssue: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, title, body, labels } = args

  if (!owner || !repo || !title) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner、repo 和 title',
      '示例: github_create_issue(owner="facebook", repo="react", title="Bug report", body="...")'
    )
  }

  try {
    const payload: any = { title }
    if (body !== undefined) payload.body = body
    if (labels && Array.isArray(labels)) payload.labels = labels

    const issue = await githubRequest(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    return createSuccessResult(
      {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        createdAt: issue.created_at
      },
      `成功创建 Issue #${issue.number}: ${issue.title}`,
      'github_create_issue'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 Issue / PR 评论
 *
 * 在指定的 Issue 或 PR 下添加评论。支持 Markdown 格式。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: POST /repos/{owner}/{repo}/issues/{number}/comments
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - Issue 或 PR 编号
 * @param args.body - 评论内容（支持 Markdown）
 * @returns ToolResult，data 字段包含新评论信息
 */
export const githubCreateIssueComment: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, body } = args
  if (!owner || !repo || !number || !body) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、number 和 body')
  }
  try {
    const comment = await githubRequest(`/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    })
    return createSuccessResult(
      { id: comment.id, url: comment.html_url },
      `成功添加评论: ID=${comment.id}`,
      'github_create_issue_comment'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：更新 Issue
 *
 * 修改现有 Issue 的属性，包括标题、正文、状态、标签、负责人等。
 *
 * 典型使用场景：
 * - 跟踪 Bug 修复进度
 * - 管理任务清单
 *
 * API: PATCH /repos/{owner}/{repo}/issues/{number}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - Issue 编号
 * @param args.title - 新标题（可选）
 * @param args.body - 新正文（可选）
 * @param args.state - 状态：open 或 closed（可选）
 * @param args.labels - 标签数组（可选）
 * @param args.assignees - 负责人数组（可选）
 * @returns ToolResult，data 字段包含更新后的 Issue 信息
 */
export const githubUpdateIssue: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, title, body, state, labels } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const payload: any = {}
    if (title !== undefined) payload.title = title
    if (body !== undefined) payload.body = body
    if (state !== undefined) payload.state = state
    if (labels !== undefined) payload.labels = labels
    const issue = await githubRequest(`/repos/${owner}/${repo}/issues/${number}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { number: issue.number, state: issue.state, title: issue.title },
      `成功更新 Issue #${issue.number}: [${issue.state}] ${issue.title}`,
      'github_update_issue'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：列出 Issue / PR 评论
 *
 * 获取指定 Issue 或 PR 下的所有评论。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: GET /repos/{owner}/{repo}/issues/{number}/comments
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - Issue 或 PR 编号
 * @param args.per_page - 每页数量，默认 30
 * @returns ToolResult，data 字段包含评论数组
 */
export const githubListIssueComments: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, per_page = 30 } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=${per_page}`)
    const items = data.map((c: any) => ({
      id: c.id,
      author: c.user?.login,
      body: c.body,
      createdAt: c.created_at
    }))
    return createSuccessResult(
      items,
      `${owner}/${repo} #${number} 的评论 (${items.length} 条)`,
      'github_list_issue_comments'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：搜索 Issues / PRs
 *
 * 全局搜索 GitHub Issues 和 Pull Requests。支持在特定仓库内搜索。
 *
 * 典型使用场景：
 * - 发现开源项目
 * - 查找代码示例
 *
 * API: GET /search/issues
 *
 * @param args.query - 搜索关键词，支持 GitHub 搜索语法
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data.items 包含匹配的 Issue/PR 列表
 */
export const githubSearchIssues: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, per_page = 10 } = args
  if (!query) {
    return createErrorResult('Missing query', '请提供搜索关键词')
  }
  try {
    const data = await githubRequest(`/search/issues?q=${encodeURIComponent(query)}&per_page=${per_page}`)
    const items = (data.items || []).map((i: any) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      type: i.pull_request ? 'pull_request' : 'issue',
      url: i.html_url,
      repo: i.repository_url?.replace('https://api.github.com/repos/', '')
    }))
    return createSuccessResult(
      { total: data.total_count, items },
      `找到 ${data.total_count} 个 Issues/PRs（显示 ${items.length} 个）`,
      'github_search_issues'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
