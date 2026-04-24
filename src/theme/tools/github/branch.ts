/**
 * GitHub 工具：分支 + Fork
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { githubRequest, translateGitHubError, encodeRefPath } from './utils'

// ============ ToolDefinitions ============

export const githubCreateBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_branch',
    description: `基于现有分支创建新分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        branch: { type: 'string', description: '新分支名称' },
        from_branch: { type: 'string', description: '源分支，默认 main', default: 'main' }
      },
      required: ['owner', 'repo', 'branch']
    }
  }
}

export const githubDeleteBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_delete_branch',
    description: `删除 GitHub 分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        branch: { type: 'string', description: '分支名称' }
      },
      required: ['owner', 'repo', 'branch']
    }
  }
}

export const githubForkRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_fork_repo',
    description: `Fork 一个 GitHub 仓库。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '源仓库所有者' },
        repo: { type: 'string', description: '源仓库名称' },
        organization: { type: 'string', description: '目标组织（可选）' },
        name: { type: 'string', description: '新仓库名（可选）' }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListBranchesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_branches',
    description: `列出 GitHub 仓库的所有分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        per_page: { type: 'number', description: '返回数量，默认 30', default: 30 }
      },
      required: ['owner', 'repo']
    }
  }
}

// ============ ToolExecutors ============

/**
 * GitHub 工具：创建分支
 *
 * 基于现有分支创建新分支。新分支的初始提交与源分支相同。
 *
 * 典型使用场景：
 * - 创建功能分支
 * - 清理已合并分支
 *
 * API: POST /repos/{owner}/{repo}/git/refs
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.branch - 新分支名称
 * @param args.from_branch - 源分支，默认 main
 * @returns ToolResult，data 字段包含新分支的引用信息
 */
export const githubCreateBranch: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, branch, from_branch = 'main' } = args
  if (!owner || !repo || !branch) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 branch')
  }
  try {
    const baseBranch = await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeRefPath(from_branch)}`)
    const sha = baseBranch.object.sha
    const result = await githubRequest(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha })
    })
    return createSuccessResult({ ref: result.ref }, `成功创建分支: ${branch}`, 'github_create_branch')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：删除分支
 *
 * 删除仓库中的指定分支。已合并到主分支的功能分支通常可以安全删除。
 *
 * 典型使用场景：
 * - 创建功能分支
 * - 清理已合并分支
 *
 * API: DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.branch - 要删除的分支名称
 * @returns ToolResult，确认删除成功
 */
export const githubDeleteBranch: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, branch } = args
  if (!owner || !repo || !branch) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 branch')
  }
  try {
    await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeRefPath(branch)}`, { method: 'DELETE' })
    return createSuccessResult({}, `成功删除分支: ${branch}`, 'github_delete_branch')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：Fork 仓库
 *
 * 将指定仓库 Fork 到当前用户名下，或 Fork 到指定组织。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: POST /repos/{owner}/{repo}/forks
 *
 * @param args.owner - 源仓库所有者
 * @param args.repo - 源仓库名称
 * @param args.organization - 目标组织名（可选，默认 Fork 到个人账户）
 * @returns ToolResult，data 字段包含新 Fork 的仓库信息
 */
export const githubForkRepo: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, organization, name } = args
  if (!owner || !repo) {
    return createErrorResult('Missing required parameters', '请提供 owner 和 repo')
  }
  try {
    const payload: any = {}
    if (organization) payload.organization = organization
    if (name) payload.name = name
    const result = await githubRequest(`/repos/${owner}/${repo}/forks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { full_name: result.full_name, url: result.html_url },
      `成功 Fork 仓库: ${result.full_name}`,
      'github_fork_repo'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：列出分支
 *
 * 获取仓库的所有分支列表。支持分页。
 *
 * 典型使用场景：
 * - 创建功能分支
 * - 清理已合并分支
 *
 * API: GET /repos/{owner}/{repo}/branches
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.per_page - 每页结果数，默认 30
 * @returns ToolResult，data 字段包含分支数组
 */
export const githubListBranches: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, per_page = 30 } = args
  if (!owner || !repo) {
    return createErrorResult('Missing required parameters', '请提供 owner 和 repo')
  }
  try {
    const branches = await githubRequest(`/repos/${owner}/${repo}/branches?per_page=${per_page}`)
    const items = branches.map((b: any) => ({ name: b.name, protected: b.protected }))
    return createSuccessResult(items, `${owner}/${repo} 的分支 (${items.length} 个)`, 'github_list_branches')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
