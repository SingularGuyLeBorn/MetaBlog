/**
 * GitHub 工具：文件操 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

export const githubCreateOrUpdateFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateOrUpdateFile',
    description: `在 GitHub 仓库中创建或更新文件。自动创建 commit，无需本地 git 操作。需要 write 权限。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        path: { type: 'string', description: '文件路径，例如"src/index.ts"' },
        content: { type: 'string', description: '文件纯文本内' },
        message: { type: 'string', description: 'commit 消息' },
        branch: { type: 'string', description: '目标分支，默认main', default: 'main' },
        sha: { type: 'string', description: '现有文件 sha(更新时必填)' }
      },
      required: ['owner', 'repo', 'path', 'content', 'message']
    }
  }
}

export const githubDeleteFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubDeleteFile',
    description: `删除 GitHub 仓库中的文件。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        path: { type: 'string', description: '文件路径' },
        message: { type: 'string', description: 'commit 消息' },
        sha: { type: 'string', description: '文件 sha' },
        branch: { type: 'string', description: '目标分支，默认main', default: 'main' }
      },
      required: ['owner', 'repo', 'path', 'message', 'sha']
    }
  }
}

// ============ ToolExecutors ============

export const githubCreateOrUpdateFile: ToolExecutor = async (args) => callGitHubTool('githubCreateOrUpdateFile', args)

export const githubDeleteFile: ToolExecutor = async (args) => callGitHubTool('githubDeleteFile', args)
