/**
 * GitHub 工具：Pull Request 操作
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { githubRequest, translateGitHubError } from './utils'

// ============ ToolDefinitions ============

export const githubListPullsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_pulls',
    description: `获取 GitHub 仓库的 Pull Requests（PR）。查看待合并的代码变更。

使用场景：
1. 了解项目正在进行的开发
2. 查看代码审查状态
3. 了解新功能进展
4. 追踪 bug 修复进度`,
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
          description: 'PR 状态：open（开放）、closed（已关闭）、all（全部），默认 open',
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

export const githubGetPullDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_pull',
    description: `获取单个 GitHub Pull Request 的详细信息。查看 PR 的代码变更统计、合并状态等。`,
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
        number: {
          type: 'number',
          description: 'PR 编号'
        }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubCreatePullRequestDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_pull_request',
    description: `创建 GitHub Pull Request。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        title: { type: 'string', description: 'PR 标题' },
        head: { type: 'string', description: '源分支，例如 "feature-branch"' },
        base: { type: 'string', description: '目标分支，默认 main', default: 'main' },
        body: { type: 'string', description: 'PR 正文（支持 Markdown）' },
        draft: { type: 'boolean', description: '是否为 Draft', default: false }
      },
      required: ['owner', 'repo', 'title', 'head']
    }
  }
}

export const githubMergePullRequestDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_merge_pull_request',
    description: `合并 GitHub Pull Request。支持 merge、squash、rebase。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'PR 编号' },
        merge_method: { type: 'string', enum: ['merge', 'squash', 'rebase'], description: '合并方式，默认 squash', default: 'squash' },
        commit_title: { type: 'string', description: '合并提交标题（可选）' },
        commit_message: { type: 'string', description: '合并提交消息（可选）' }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubGetPullRequestFilesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_pull_request_files',
    description: `获取 Pull Request 的变更文件列表。查看 PR 中修改了哪些文件、新增/删除行数等。

使用场景：
1. 代码审查前了解变更范围
2. 统计 PR 的代码变更量
3. 检查是否修改了不该动的文件
4. 生成变更摘要`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'PR 编号' },
        per_page: { type: 'number', description: '每页数量，默认 100', default: 100 }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubCreatePullRequestReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_pull_request_review',
    description: `对 Pull Request 提交 Review（审查意见）。支持 APPROVE（通过）、REQUEST_CHANGES（请求修改）、COMMENT（仅评论）。

使用场景：
1. 代码审查后给出通过/不通过意见
2. 提出修改建议
3. 对 PR 进行整体评价

注意事项：
- 不能 Review 自己创建的 PR（GitHub 会返回 422）
- APPROVE 后 PR 可以被合并（如果设置了审查要求）`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'PR 编号' },
        event: {
          type: 'string',
          description: 'Review 类型：APPROVE（通过）、REQUEST_CHANGES（请求修改）、COMMENT（仅评论）',
          enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT']
        },
        body: { type: 'string', description: 'Review 评论内容（REQUEST_CHANGES 和 COMMENT 必填）' }
      },
      required: ['owner', 'repo', 'number', 'event']
    }
  }
}

// ============ ToolExecutors ============

/**
 * GitHub 工具：列出 Pull Requests
 *
 * 获取仓库的 PR 列表。支持按状态过滤。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: GET /repos/{owner}/{repo}/pulls
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.state - 状态过滤：open、closed、all，默认 open
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data 字段包含 PR 数组
 */
export const githubListPulls: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, state = 'open', per_page = 10 } = args

  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_pulls(owner="facebook", repo="react")'
    )
  }

  try {
    const pulls = await githubRequest(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}`)

    const items = pulls.map((pr: any) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user.login,
      branch: `${pr.head.ref} → ${pr.base.ref}`,
      draft: pr.draft,
      createdAt: pr.created_at
    }))

    return createSuccessResult(
      items,
      `${owner}/${repo} 的 ${state} PRs (${items.length} 条)`,
      'github_list_pulls'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：获取单个 PR 详情
 *
 * 查看指定 PR 的完整信息，包括标题、描述、分支、合并状态、评论数等。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: GET /repos/{owner}/{repo}/pulls/{number}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @returns ToolResult，data 字段包含 PR 完整信息
 */
export const githubGetPull: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number } = args

  if (!owner || !repo || !number) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner、repo 和 PR number',
      '示例: github_get_pull(owner="facebook", repo="react", number=123)'
    )
  }

  try {
    const pr = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}`)

    return createSuccessResult(
      {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        body: pr.body,
        branch: `${pr.head.ref} → ${pr.base.ref}`,
        draft: pr.draft,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        merged: pr.merged,
        mergeable: pr.mergeable,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      },
      `PR #${pr.number}: ${pr.title} (${pr.state})`,
      'github_get_pull'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 Pull Request
 *
 * 在仓库中创建新的 PR。需要指定源分支和目标分支。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: POST /repos/{owner}/{repo}/pulls
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.title - PR 标题
 * @param args.head - 源分支（如 "feature-branch"）
 * @param args.base - 目标分支（如 "main"）
 * @param args.body - PR 描述（支持 Markdown，可选）
 * @returns ToolResult，data 字段包含新创建的 PR 信息
 */
export const githubCreatePullRequest: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, title, head, base = 'main', body, draft = false } = args
  if (!owner || !repo || !title || !head) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、title 和 head')
  }
  try {
    const payload: any = { title, head, base, draft }
    if (body !== undefined) payload.body = body
    const pr = await githubRequest(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { number: pr.number, url: pr.html_url, title: pr.title },
      `成功创建 PR #${pr.number}: ${pr.title}`,
      'github_create_pull_request'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：合并 Pull Request
 *
 * 将指定的 PR 合并到目标分支。支持三种合并方式。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: PUT /repos/{owner}/{repo}/pulls/{number}/merge
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @param args.commit_title - 合并提交的标题（可选）
 * @param args.commit_message - 合并提交的描述（可选）
 * @param args.merge_method - 合并方式：merge、squash、rebase，默认 merge
 * @returns ToolResult，data 字段包含合并后的提交信息
 */
export const githubMergePullRequest: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, merge_method = 'squash', commit_title, commit_message } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const payload: any = { merge_method }
    if (commit_title) payload.commit_title = commit_title
    if (commit_message) payload.commit_message = commit_message
    const result = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}/merge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { sha: result.sha, message: result.message },
      `成功合并 PR #${number} (commit: ${result.sha?.substring(0, 7)})`,
      'github_merge_pull_request'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：获取 PR 变更文件
 *
 * 查看 Pull Request 中修改的文件列表、变更行数和 diff 内容。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: GET /repos/{owner}/{repo}/pulls/{number}/files
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @param args.per_page - 每页数量，默认 100
 * @returns ToolResult，data.files 包含变更文件列表
 */
export const githubGetPullRequestFiles: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, per_page = 100 } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}/files?per_page=${per_page}`)
    const items = data.map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch
    }))
    const totalAdditions = items.reduce((sum: number, f: any) => sum + f.additions, 0)
    const totalDeletions = items.reduce((sum: number, f: any) => sum + f.deletions, 0)
    return createSuccessResult(
      { files: items, totalAdditions, totalDeletions, fileCount: items.length },
      `PR #${number} 变更文件 (${items.length} 个)，+${totalAdditions}/-${totalDeletions}`,
      'github_get_pull_request_files'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 PR Review
 *
 * 对 Pull Request 提交审查意见。支持 APPROVE、REQUEST_CHANGES、COMMENT 三种类型。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: POST /repos/{owner}/{repo}/pulls/{number}/reviews
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @param args.event - Review 类型：APPROVE / REQUEST_CHANGES / COMMENT
 * @param args.body - Review 评论内容（REQUEST_CHANGES 和 COMMENT 必填）
 * @returns ToolResult，data 字段包含 Review 信息
 */
export const githubCreatePullRequestReview: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, event, body } = args
  if (!owner || !repo || !number || !event) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、number 和 event')
  }
  if ((event === 'REQUEST_CHANGES' || event === 'COMMENT') && !body) {
    return createErrorResult('Missing body', 'REQUEST_CHANGES 或 COMMENT 类型的 Review 必须提供 body')
  }
  try {
    const payload: any = { event }
    if (body !== undefined) payload.body = body
    const data = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { id: data.id, state: data.state, html_url: data.html_url },
      `Review 提交成功：${data.state}`,
      'github_create_pull_request_review'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
