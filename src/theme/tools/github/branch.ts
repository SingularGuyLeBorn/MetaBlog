/**
 * GitHub 工具：分+ Fork
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

export const githubCreateBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateBranch',
    description: `基于现有分支创建新分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string', description: '仓库所有者' },
          repo: {type: 'string', description: '仓库名称'},
          branch: {
            type: 'string', description: '新分支名' },
            from_branch: {type: 'string', description: '源分支，默认 main', default: 'main'}
          },
          required: ['owner', 'repo', 'branch']
        }
      }
    }


export const githubDeleteBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubDeleteBranch',
    description: `删除 GitHub 分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string', description: '仓库所有者'
        },
        repo: {type: 'string', description: '仓库名称'},
        branch: {type: 'string', description: '分支名称'}
      },
      required: ['owner', 'repo', 'branch']
    }
  }
}

export const githubForkRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubForkRepo',
    description: `Fork 一个 GitHub 仓库。`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string', description: '源仓库所有者'
        },
        repo: {
          type: 'string', description: '源仓库名'
        },
        organization: {type: 'string', description: '目标组织（可选）'},
        name: {type: 'string', description: '新仓库名（可选）'}
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListBranchesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListBranches',
    description: `列出 GitHub 仓库的所有分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string', description: '仓库所有者'
        },
        repo: {type: 'string', description: '仓库名称'},
        per_page: {type: 'number', description: '返回数量，默认30', default: 30}
      },
      required: ['owner', 'repo']
    }
  }
}




// ============ ToolExecutors ============

export const githubCreateBranch: ToolExecutor = async (args) => callGitHubTool('githubCreateBranch', args)

export const githubDeleteBranch: ToolExecutor = async (args) => callGitHubTool('githubDeleteBranch', args)

export const githubForkRepo: ToolExecutor = async (args) => callGitHubTool('githubForkRepo', args)

export const githubListBranches: ToolExecutor = async (args) => callGitHubTool('githubListBranches', args)
