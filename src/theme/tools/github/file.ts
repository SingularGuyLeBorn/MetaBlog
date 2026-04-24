/**
 * GitHub 工具：文件操作
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { githubRequest, translateGitHubError, encodeBase64 } from './utils'

// ============ ToolDefinitions ============

export const githubCreateOrUpdateFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_or_update_file',
    description: `在 GitHub 仓库中创建或更新文件。自动创建 commit，无需本地 git 操作。需要 write 权限。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        path: { type: 'string', description: '文件路径，例如 "src/index.ts"' },
        content: { type: 'string', description: '文件纯文本内容' },
        message: { type: 'string', description: 'commit 消息' },
        branch: { type: 'string', description: '目标分支，默认 main', default: 'main' },
        sha: { type: 'string', description: '现有文件 sha（更新时必填）' }
      },
      required: ['owner', 'repo', 'path', 'content', 'message']
    }
  }
}

export const githubDeleteFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_delete_file',
    description: `删除 GitHub 仓库中的文件。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        path: { type: 'string', description: '文件路径' },
        message: { type: 'string', description: 'commit 消息' },
        sha: { type: 'string', description: '文件 sha' },
        branch: { type: 'string', description: '目标分支，默认 main', default: 'main' }
      },
      required: ['owner', 'repo', 'path', 'message', 'sha']
    }
  }
}

// ============ ToolExecutors ============

/**
 * GitHub 工具：创建或更新文件
 *
 * 在仓库中创建新文件或更新已有文件。需要提供 Base64 编码的内容。
 *
 * 典型使用场景：
 * - 查看源代码文件
 * - 浏览项目目录结构
 *
 * API: PUT /repos/{owner}/{repo}/contents/{path}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.path - 文件路径
 * @param args.content - 文件内容（Base64 编码）
 * @param args.message - 提交信息
 * @param args.branch - 目标分支，默认 main
 * @param args.sha - 已有文件的 SHA（更新时必填）
 * @returns ToolResult，data 字段包含提交信息
 */
export const githubCreateOrUpdateFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path, content, message, branch = 'main', sha } = args
  if (!owner || !repo || !path || content === undefined || !message) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、path、content 和 message')
  }
  try {
    const payload: any = { message, content: encodeBase64(content), branch }
    if (sha) payload.sha = sha
    const data = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { path: data.content?.path, sha: data.content?.sha, url: data.content?.html_url },
      `成功提交文件: ${path} (commit: ${data.commit?.sha?.substring(0, 7)})`,
      'github_create_or_update_file'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：删除文件
 *
 * 从仓库中删除指定文件。需要提供文件的当前 SHA。
 *
 * 典型使用场景：
 * - 查看源代码文件
 * - 浏览项目目录结构
 *
 * API: DELETE /repos/{owner}/{repo}/contents/{path}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.path - 文件路径
 * @param args.message - 提交信息
 * @param args.sha - 文件的当前 SHA
 * @param args.branch - 目标分支，默认 main
 * @returns ToolResult，确认删除成功
 */
export const githubDeleteFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path, message, sha, branch = 'main' } = args
  if (!owner || !repo || !path || !message || !sha) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、path、message 和 sha')
  }
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha, branch })
    })
    return createSuccessResult({ commit: data.commit?.sha }, `成功删除文件: ${path}`, 'github_delete_file')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
