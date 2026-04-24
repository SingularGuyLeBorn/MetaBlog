/**
 * GitHub 工具：Workflow 操作
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { githubRequest, translateGitHubError } from './utils'

// ============ ToolDefinitions ============

export const githubListWorkflowsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_workflows',
    description: `列出 GitHub 仓库的 Actions 工作流。查看 CI/CD 流水线配置。`,
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
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListWorkflowRunsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_workflow_runs',
    description: `列出 GitHub 仓库的 Actions 工作流运行记录。查看 CI/CD 执行状态。`,
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
        per_page: {
          type: 'number',
          description: '返回数量，默认 10',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubTriggerWorkflowDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_trigger_workflow',
    description: `手动触发 GitHub Actions 工作流。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        workflow_id: { type: 'string', description: '工作流 ID 或文件名' },
        ref: { type: 'string', description: '触发分支，默认 main', default: 'main' },
        inputs: { type: 'object', description: '工作流输入参数（可选）' }
      },
      required: ['owner', 'repo', 'workflow_id']
    }
  }
}

// ============ ToolExecutors ============

/**
 * GitHub 工具：列出工作流
 *
 * 获取仓库中配置的所有 GitHub Actions 工作流列表。
 *
 * 典型使用场景：
 * - 查看 CI/CD 状态
 * - 手动触发构建
 *
 * API: GET /repos/{owner}/{repo}/actions/workflows
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @returns ToolResult，data 字段包含工作流数组
 */
export const githubListWorkflows: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo } = args

  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_workflows(owner="facebook", repo="react")'
    )
  }

  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/actions/workflows`)
    const items = (data.workflows || []).map((wf: any) => ({
      id: wf.id,
      name: wf.name,
      path: wf.path,
      state: wf.state,
      url: wf.html_url
    }))

    return createSuccessResult(
      items,
      `${owner}/${repo} 的工作流 (${items.length} 个)`,
      'github_list_workflows'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：列出工作流运行记录
 *
 * 查看工作流的最近执行记录，包括状态、分支、触发时间等。
 *
 * 典型使用场景：
 * - 查看 CI/CD 状态
 * - 手动触发构建
 *
 * API: GET /repos/{owner}/{repo}/actions/runs
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data 字段包含运行记录数组
 */
export const githubListWorkflowRuns: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, per_page = 10 } = args

  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_workflow_runs(owner="facebook", repo="react")'
    )
  }

  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/actions/runs?per_page=${per_page}`)
    const items = (data.workflow_runs || []).map((run: any) => ({
      id: run.id,
      name: run.name,
      branch: run.head_branch,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      runNumber: run.run_number,
      url: run.html_url,
      createdAt: run.created_at
    }))

    return createSuccessResult(
      items,
      `${owner}/${repo} 的运行记录 (${items.length} 次)`,
      'github_list_workflow_runs'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：触发工作流
 *
 * 手动触发 GitHub Actions 工作流的执行。需要工作流配置为支持 workflow_dispatch 触发。
 *
 * 典型使用场景：
 * - 查看 CI/CD 状态
 * - 手动触发构建
 *
 * API: POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.workflow_id - 工作流 ID 或文件名
 * @param args.ref - 触发分支，默认 main
 * @param args.inputs - 工作流输入参数对象（可选）
 * @returns ToolResult，确认触发成功
 */
export const githubTriggerWorkflow: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, workflow_id, ref = 'main', inputs } = args
  if (!owner || !repo || !workflow_id) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 workflow_id')
  }
  try {
    const payload: any = { ref }
    if (inputs) payload.inputs = inputs
    await githubRequest(`/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow_id)}/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult({}, `成功触发工作流: ${workflow_id} (${ref})`, 'github_trigger_workflow')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
