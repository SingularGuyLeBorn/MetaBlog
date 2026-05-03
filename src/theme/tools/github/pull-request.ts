/**
 * ============================================================================
 * GitHub Pull Request 操作工具
 * ============================================================================
 *
 * 提供 GitHub Pull Request 的查询、创建、合并、审查等功能. 
 * 所有操作通过后端 BFF 代理转发,前端只负责传参. 
 *
 * @module src/theme/tools/github/pull-request
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

/**
 * 列出 PR 的工具定义
 */
export const githubListPullsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListPulls',
    description: `获取 GitHub 仓库的 Pull Requests(PR)列表. 查看待合并或已合并的代码变更. 

使用场景：
1. 了解项目正在进行的开发工作
2. 查看代码审查状态和进度
3. 追踪新功能或 bug 修复的 PR
4. 统计仓库的代码合并活动

示例用法：
- 查看开放的 PR：state="open"(默认)
- 查看所有 PR 包括已关闭的：state="all"
- 查看最近 20 个：per_page=20

注意事项：
- 默认只返回开放的 PR,需要查看已关闭的要指定 state="all"
- 返回结果按创建时间倒序排列
- 如需查看某个 PR 的详细变更文件列表,请使用 githubGetPullRequestFiles`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        state: {
          type: 'string',
          description: 'PR 状态筛选：open(只返回开放的)、closed(只返回已关闭/已合并的)、all(返回全部). 默认 open',
          enum: ['open', 'closed', 'all'],
          default: 'open'
        },
        per_page: {
          type: 'number',
          description: '每页返回的 PR 数量,默认 10,最多 100. 建议不超过 30 以保持响应速度',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

/**
 * 获取单个 PR 详情的工具定义
 */
export const githubGetPullDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetPull',
    description: `获取单个 GitHub Pull Request 的详细信息. 查看 PR 的代码变更统计、合并状态、审查要求等. 

使用场景：
1. 查看某个 PR 的详细信息和当前状态
2. 确认 PR 是否可以安全合并(是否有冲突、是否通过检查)
3. 获取 PR 的源分支和目标分支信息
4. 查看 PR 的审查要求和合并阻塞原因

示例用法：
- 获取 PR #42 的详情：number=42

注意事项：
- 返回信息中包含 mergeable 字段表示是否有合并冲突
- merged 字段表示是否已合并
- 大 PR 的返回数据可能较多`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        number: {
          type: 'number',
          description: 'PR 的编号(URL 中 /pull/ 后面的数字),例如 42'
        }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

/**
 * 创建 PR 的工具定义
 */
export const githubCreatePullRequestDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreatePullRequest',
    description: `创建 GitHub Pull Request,将源分支的代码变更合并到目标分支. 

使用场景：
1. 完成功能开发后请求代码审查和合并
2. 提交 bug 修复的代码变更
3. 发起文档更新或配置变更的审查
4. 从 Fork 的仓库向上游仓库提交贡献

示例用法：
- 基本创建：title="feat: 添加用户登录功能", head="feature/login", base="main"
- 带描述：title="fix: 修复内存泄漏", head="fix/memory-leak", body="## 变更内容\n- 修复了...\n- 添加了测试..."
- Draft PR：title="WIP: 重构核心模块", head="refactor/core", draft=true

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- head 分支必须已经在远程仓库中存在,不能基于空仓库或不存在的分支创建 PR
- 如果 head 分支在 Fork 仓库中,格式为 "fork-owner:branch-name"
- 如果仓库没有分支保护规则,创建后可能可以直接合并
- Draft PR 表示尚未完成,不适合立即合并`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        title: {
          type: 'string',
          description: 'PR 标题,简明扼要描述变更内容,例如 "feat: 添加暗黑模式支持"'
        },
        head: {
          type: 'string',
          description: '源分支名称(包含代码变更的分支),例如 "feature/login". 如果是 Fork 仓库的分支,格式为 "fork-owner:branch-name". 该分支必须已在远程存在'
        },
        base: {
          type: 'string',
          description: '目标分支名称(代码要合并到的分支),例如 "main"、"develop". 默认 main',
          default: 'main'
        },
        body: {
          type: 'string',
          description: 'PR 正文内容,支持 Markdown 格式. 建议包含：变更摘要、详细说明、测试情况、相关 Issue 链接'
        },
        draft: {
          type: 'boolean',
          description: '是否为 Draft PR(草稿). true 表示尚未完成,不适合立即合并. 默认 false',
          default: false
        }
      },
      required: ['owner', 'repo', 'title', 'head']
    }
  }
}

/**
 * 合并 PR 的工具定义
 */
export const githubMergePullRequestDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubMergePullRequest',
    description: `合并 GitHub Pull Request. 支持三种合并方式：merge、squash、rebase. 

使用场景：
1. 代码审查通过后合并功能分支
2. 自动合并通过 CI 检查的 PR
3. 批量合并依赖更新 PR

三种合并方式的区别：
- merge：创建一个合并提交(merge commit),保留完整的分支历史. 适合需要保留所有提交记录的场景
- squash：将 PR 中的所有提交压缩为一个提交后合并,分支历史更干净. 适合功能开发完成后的合并(默认推荐)
- rebase：将 PR 的提交变基到目标分支上,不创建合并提交,呈线性历史. 适合小型变更或要求线性历史的项目

示例用法：
- 默认 squash 合并：number=42
- 使用 merge 合并：number=42, merge_method="merge"
- 自定义提交信息：number=42, commit_title="feat: 添加登录功能", commit_message="详细说明..."

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- PR 必须没有合并冲突且通过所有必需检查才能合并
- 如果仓库设置了审查要求,可能需要先通过 githubCreatePullRequestReview 进行 APPROVE
- 合并后 head 分支不会自动删除,如需删除请使用 githubDeleteBranch`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        number: {
          type: 'number',
          description: 'PR 的编号(URL 中 /pull/ 后面的数字),例如 42'
        },
        merge_method: {
          type: 'string',
          enum: ['merge', 'squash', 'rebase'],
          description: '合并方式：merge(保留所有提交并创建合并提交)、squash(压缩为一个提交后合并,默认推荐)、rebase(变基为线性历史). 默认 squash',
          default: 'squash'
        },
        commit_title: {
          type: 'string',
          description: '合并提交的标题(可选). 不传入则使用 PR 标题'
        },
        commit_message: {
          type: 'string',
          description: '合并提交的详细消息(可选). 不传入则使用 PR 描述或默认消息'
        }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

/**
 * 获取 PR 变更文件的工具定义
 */
export const githubGetPullRequestFilesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetPullRequestFiles',
    description: `获取 Pull Request 的变更文件列表. 查看 PR 中修改了哪些文件、新增/删除行数、文件状态等. 

使用场景：
1. 代码审查前快速了解变更范围
2. 统计 PR 的代码变更量(新增/删除行数)
3. 检查是否意外修改了不该动的文件(如 lock 文件、配置文件)
4. 生成 PR 变更摘要或检查清单
5. 确认 PR 是否包含测试文件

示例用法：
- 查看 PR #42 的所有变更文件
- 限制返回数量：per_page=50

注意事项：
- 返回每个文件的变更状态：added(新增)、removed(删除)、modified(修改)、renamed(重命名)
- 包含每个文件的新增行数(additions)和删除行数(deletions)
- 大 PR 可能包含大量文件,可通过 per_page 分页获取
- 不返回具体的代码差异内容,只返回文件级元数据`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        number: {
          type: 'number',
          description: 'PR 的编号(URL 中 /pull/ 后面的数字),例如 42'
        },
        per_page: {
          type: 'number',
          description: '每页返回的文件数量,默认 100,最多 100',
          default: 100
        }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

/**
 * 创建 PR Review 的工具定义
 */
export const githubCreatePullRequestReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreatePullRequestReview',
    description: `对 Pull Request 提交正式的 Review(审查意见). 支持通过(APPROVE)、请求修改(REQUEST_CHANGES)、仅评论(COMMENT). 

使用场景：
1. 代码审查后给出通过/不通过的正式意见
2. 发现代码问题要求作者修改
3. 对 PR 进行整体评价和反馈
4. 满足仓库的审查要求以允许合并

示例用法：
- 通过审查：event="APPROVE", body="代码清晰,测试完整,LGTM！"
- 请求修改：event="REQUEST_CHANGES", body="第 3 行有潜在的空指针问题,请添加 null 检查"
- 仅评论：event="COMMENT", body="建议在文档中补充这个函数的用法示例"

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- 不能 Review 自己创建的 PR(GitHub 会返回 422 错误)
- APPROVE 后如果仓库设置了审查要求,PR 可以被合并
- REQUEST_CHANGES 会阻止 PR 合并,直到作者修改后重新请求审查
- COMMENT 不会影响 PR 的合并状态,仅用于提供反馈
- body 在 REQUEST_CHANGES 和 COMMENT 时必填,APPROVE 时可选`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者用户名或组织名,例如 "octocat"'
        },
        repo: {
          type: 'string',
          description: '仓库名称,例如 "Hello-World"'
        },
        number: {
          type: 'number',
          description: 'PR 的编号(URL 中 /pull/ 后面的数字),例如 42'
        },
        event: {
          type: 'string',
          description: 'Review 类型：APPROVE(通过审查,允许合并)、REQUEST_CHANGES(请求修改,阻止合并)、COMMENT(仅评论,不影响合并状态)',
          enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT']
        },
        body: {
          type: 'string',
          description: 'Review 评论内容(支持 Markdown). REQUEST_CHANGES 和 COMMENT 时必须填写;APPROVE 时可选,可用于附带赞美或建议'
        }
      },
      required: ['owner', 'repo', 'number', 'event']
    }
  }
}

// ============ ToolExecutors ============

/**
 * 列出 PR
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubListPulls: ToolExecutor = async (args) => callGitHubTool('githubListPulls', args)

/**
 * 获取单个 PR 详情
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubGetPull: ToolExecutor = async (args) => callGitHubTool('githubGetPull', args)

/**
 * 创建 PR
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubCreatePullRequest: ToolExecutor = async (args) => callGitHubTool('githubCreatePullRequest', args)

/**
 * 合并 PR
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubMergePullRequest: ToolExecutor = async (args) => callGitHubTool('githubMergePullRequest', args)

/**
 * 获取 PR 变更文件
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubGetPullRequestFiles: ToolExecutor = async (args) => callGitHubTool('githubGetPullRequestFiles', args)

/**
 * 创建 PR Review
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubCreatePullRequestReview: ToolExecutor = async (args) => callGitHubTool('githubCreatePullRequestReview', args)
