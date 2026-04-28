/**
 * GitHub 工具：Workflow 操作
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

export const githubListWorkflowsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListWorkflows',
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
    name: 'githubListWorkflowRuns',
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
          description: '返回数量，默认10',
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
    name: 'githubTriggerWorkflow',
    description: `手动触发 GitHub Actions 工作流。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        workflow_id: { type: 'string', description: '工作ID 或文件名' },
        ref: { type: 'string', description: '触发分支，默认main', default: 'main' },
        inputs: { type: 'object', description: '工作流输入参数(可选)' }
      },
      required: ['owner', 'repo', 'workflow_id']
    }
  }
}

// ============ ToolExecutors ============

export const githubListWorkflows: ToolExecutor = async (args) => callGitHubTool('githubListWorkflows', args)

export const githubListWorkflowRuns: ToolExecutor = async (args) => callGitHubTool('githubListWorkflowRuns', args)

export const githubTriggerWorkflow: ToolExecutor = async (args) => callGitHubTool('githubTriggerWorkflow', args)
