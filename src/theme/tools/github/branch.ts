/**
 * ============================================================================
 * GitHub 分支与 Fork 操作工具
 * ============================================================================
 *
 * 提供 GitHub 仓库分支的创建、删除、列表查询,以及 Fork 仓库功能. 
 * 所有操作通过后端 BFF 代理转发,前端只负责传参. 
 *
 * @module src/theme/tools/github/branch
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

/**
 * 创建分支的工具定义
 */
export const githubCreateBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateBranch',
    description: `基于现有分支创建新分支. 

使用场景：
1. 为新功能开发创建 feature 分支
2. 为 bug 修复创建 fix 分支
3. 在已有分支基础上创建实验分支

示例用法：
- 基于 main 创建 feature/login：branch="feature/login", from_branch="main"
- 基于 develop 创建 hotfix/v1.2.1：branch="hotfix/v1.2.1", from_branch="develop"

注意事项：
- from_branch 必须已在远程仓库存在,否则会报错
- 新分支名不能与已有分支重名
- 创建后不会自动推送任何代码,分支指向 from_branch 的最新 commit`,
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
        branch: {
          type: 'string',
          description: '新分支名称,例如 "feature/login". 建议使用语义化命名(feature/、fix/、hotfix/ 等前缀)'
        },
        from_branch: {
          type: 'string',
          description: '源分支名称,作为新分支的起点. 默认 main',
          default: 'main'
        }
      },
      required: ['owner', 'repo', 'branch']
    }
  }
}

/**
 * 删除分支的工具定义
 */
export const githubDeleteBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubDeleteBranch',
    description: `删除 GitHub 仓库中的分支. 

使用场景：
1. PR 合并后清理已废弃的功能分支
2. 删除错误的实验分支
3. 清理长期未使用的旧分支

示例用法：
- 删除已合并的 feature/login 分支

注意事项：
- 不能删除仓库的默认分支(通常是 main 或 master)
- 删除后分支上的 commit 如果未被其他分支引用,可能无法恢复
- 如果分支有未合并的代码,删除后这些代码将丢失,请谨慎操作`,
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
        branch: {
          type: 'string',
          description: '要删除的分支名称,例如 "feature/old-feature"'
        }
      },
      required: ['owner', 'repo', 'branch']
    }
  }
}

/**
 * Fork 仓库的工具定义
 */
export const githubForkRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubForkRepo',
    description: `Fork(复制)一个 GitHub 仓库到自己的账号或指定组织下. 

使用场景：
1. 想要为没有写权限的外部仓库贡献代码时,先 Fork 到自己名下
2. 基于他人项目做二次开发
3. 备份感兴趣的仓库到自己的账号

示例用法：
- Fork 到个人账号：owner="facebook", repo="react"
- Fork 到组织：owner="facebook", repo="react", organization="my-org"
- Fork 并重命名：owner="facebook", repo="react", name="my-react-fork"

注意事项：
- organization 留空时,Fork 到当前登录用户的个人账号下
- organization 填写时,Fork 到该组织下(需要是该组织成员且有创建仓库权限)
- name 留空时,新仓库名与源仓库相同
- 同一个用户对同一个仓库只能 Fork 一次,重复 Fork 会报错`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '源仓库的所有者用户名或组织名,例如 "facebook"'
        },
        repo: {
          type: 'string',
          description: '源仓库名称,例如 "react"'
        },
        organization: {
          type: 'string',
          description: '目标组织名称(可选). 留空则 Fork 到个人账号,填写则 Fork 到指定组织'
        },
        name: {
          type: 'string',
          description: 'Fork 后的新仓库名称(可选). 留空则与源仓库同名'
        }
      },
      required: ['owner', 'repo']
    }
  }
}

/**
 * 列出分支的工具定义
 */
export const githubListBranchesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListBranches',
    description: `列出 GitHub 仓库的所有分支. 

使用场景：
1. 查看仓库有哪些可用分支
2. 确认某个分支名是否存在(避免创建重名分支)
3. 了解项目的分支管理策略
4. 查找特定功能分支

示例用法：
- 列出仓库所有分支(默认返回 30 个)
- 列出前 100 个分支：per_page=100

注意事项：
- 默认按字母顺序返回,不是按最近更新时间
- 如果分支很多,返回结果可能很长,可通过 per_page 控制数量
- 不会返回已删除的分支`,
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
        per_page: {
          type: 'number',
          description: '每页返回的分支数量,默认 30,最多 100',
          default: 30
        }
      },
      required: ['owner', 'repo']
    }
  }
}

// ============ ToolExecutors ============

/**
 * 创建分支
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubCreateBranch: ToolExecutor = async (args) => callGitHubTool('githubCreateBranch', args)

/**
 * 删除分支
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubDeleteBranch: ToolExecutor = async (args) => callGitHubTool('githubDeleteBranch', args)

/**
 * Fork 仓库
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubForkRepo: ToolExecutor = async (args) => callGitHubTool('githubForkRepo', args)

/**
 * 列出分支
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubListBranches: ToolExecutor = async (args) => callGitHubTool('githubListBranches', args)
