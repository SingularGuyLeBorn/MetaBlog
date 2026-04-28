/**
 * GitHub 工具：Pull Request 操作
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

export const githubListPullsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListPulls',
    description: `获取 GitHub 仓库的 Pull Requests(PR)。查看待合并的代码变更。

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
          description: 'PR 状态：open(开放)、closed(已关闭)、all(全部)，默认open',
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

export const githubGetPullDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetPull',
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
    name: 'githubCreatePullRequest',
    description: `创建 GitHub Pull Request。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        title: { type: 'string', description: 'PR 标题' },
        head: { type: 'string', description: '源分支，例如 "feature-branch"' },
        base: { type: 'string', description: '目标分支，默认main', default: 'main' },
        body: { type: 'string', description: 'PR 正文(支持Markdown' },
        draft: { type: 'boolean', description: '是否为 Draft', default: false }
      },
      required: ['owner', 'repo', 'title', 'head']
    }
  }
}

export const githubMergePullRequestDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubMergePullRequest',
    description: `合并 GitHub Pull Request。支持 merge、squash、rebase。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'PR 编号' },
        merge_method: { type: 'string', enum: ['merge', 'squash', 'rebase'], description: '合并方式，默认squash', default: 'squash' },
        commit_title: { type: 'string', description: '合并提交标题(可选)' },
        commit_message: { type: 'string', description: '合并提交消息(可选)' }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubGetPullRequestFilesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetPullRequestFiles',
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
        per_page: { type: 'number', description: '每页数量，默认100', default: 100 }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubCreatePullRequestReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreatePullRequestReview',
    description: `对 Pull Request 提交 Review(审查意见)。支持 APPROVE(通过)、REQUEST_CHANGES(请求修改)、COMMENT(仅评论)。

使用场景：
1. 代码审查后给出通过/不通过意见
2. 提出修改建议
3. 对 PR 进行整体评价

注意事项：
- 不能 Review 自己创建的 PR(GitHub 会返回 422)
- APPROVE 后 PR 可以被合并(如果设置了审查要求)`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'PR 编号' },
        event: {
          type: 'string',
          description: 'Review 类型：APPROVE(通过)、REQUEST_CHANGES(请求修改)、COMMENT(仅评论)',
          enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT']
        },
        body: { type: 'string', description: 'Review 评论内容(REQUEST_CHANGES COMMENT 必填)' }
      },
      required: ['owner', 'repo', 'number', 'event']
    }
  }
}

// ============ ToolExecutors ============

export const githubListPulls: ToolExecutor = async (args) => callGitHubTool('githubListPulls', args)

export const githubGetPull: ToolExecutor = async (args) => callGitHubTool('githubGetPull', args)

export const githubCreatePullRequest: ToolExecutor = async (args) => callGitHubTool('githubCreatePullRequest', args)

export const githubMergePullRequest: ToolExecutor = async (args) => callGitHubTool('githubMergePullRequest', args)

export const githubGetPullRequestFiles: ToolExecutor = async (args) => callGitHubTool('githubGetPullRequestFiles', args)

export const githubCreatePullRequestReview: ToolExecutor = async (args) => callGitHubTool('githubCreatePullRequestReview', args)
