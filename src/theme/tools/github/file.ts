/**
 * ============================================================================
 * GitHub 文件操作工具
 * ============================================================================
 *
 * 提供在 GitHub 仓库中直接创建、更新和删除文件的功能,
 * 无需本地 git 操作,自动创建 commit. 
 *
 * @module src/theme/tools/github/file
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

/**
 * 创建或更新文件的工具定义
 */
export const githubCreateOrUpdateFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateOrUpdateFile',
    description: `在 GitHub 仓库中直接创建或更新文件,无需本地 git 操作,自动创建 commit. 

使用场景：
1. 快速修改配置文件(如 README.md、package.json)
2. 创建新的代码文件或文档
3. 修复线上文件的简单错误
4. 更新 CI/CD 配置文件

示例用法：
- 创建新文件：path="docs/guide.md", content="# 指南\n...", message="添加指南文档"
- 更新已有文件：先调用 githubGetFileContent 获取 sha,然后 path="src/index.ts", content="...", message="修复 bug", sha="abc123..."

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- 创建新文件时不需要传 sha,更新已有文件时 sha 必填
- sha 必须通过 githubGetFileContent 获取,它是文件当前版本的唯一标识
- content 必须是纯文本内容(Base64 编码由后端自动处理)
- 如果 path 包含的目录不存在,GitHub 会自动创建`,
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
        path: {
          type: 'string',
          description: '文件在仓库中的路径,例如 "src/index.ts"、"README.md"、".github/workflows/ci.yml"'
        },
        content: {
          type: 'string',
          description: '文件的纯文本内容. 后端会自动进行 Base64 编码,无需手动编码'
        },
        message: {
          type: 'string',
          description: 'commit 消息,例如 "feat: 添加用户登录功能"、"fix: 修复空指针异常"'
        },
        branch: {
          type: 'string',
          description: '目标分支名称,文件将被提交到这个分支上. 默认 main',
          default: 'main'
        },
        sha: {
          type: 'string',
          description: '现有文件的 sha 哈希值,更新文件时必填. 必须通过 githubGetFileContent 获取,用于防止并发修改冲突'
        }
      },
      required: ['owner', 'repo', 'path', 'content', 'message']
    }
  }
}

/**
 * 删除文件的工具定义
 */
export const githubDeleteFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubDeleteFile',
    description: `删除 GitHub 仓库中的文件,自动创建删除 commit. 

使用场景：
1. 清理不再需要的配置文件或代码文件
2. 删除误提交的文件
3. 移除废弃的文档或资源文件

示例用法：
- 删除文件：path="temp/debug.js", message="删除调试文件", sha="abc123..."

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- sha 必填,必须通过 githubGetFileContent 获取,它是文件当前版本的唯一标识
- 删除操作不可逆,但可以通过 git 历史恢复
- 只能删除单个文件,删除目录需要逐个删除其中的文件`,
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
        path: {
          type: 'string',
          description: '要删除的文件路径,例如 "src/old-module.ts"、"docs/deprecated.md"'
        },
        message: {
          type: 'string',
          description: '删除 commit 的消息,例如 "chore: 删除废弃的调试代码"'
        },
        sha: {
          type: 'string',
          description: '文件的 sha 哈希值,必填. 必须通过 githubGetFileContent 获取,用于确认删除的是文件的最新版本'
        },
        branch: {
          type: 'string',
          description: '目标分支名称,从哪个分支删除文件. 默认 main',
          default: 'main'
        }
      },
      required: ['owner', 'repo', 'path', 'message', 'sha']
    }
  }
}

// ============ ToolExecutors ============

/**
 * 创建或更新文件
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubCreateOrUpdateFile: ToolExecutor = async (args) => callGitHubTool('githubCreateOrUpdateFile', args)

/**
 * 删除文件
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubDeleteFile: ToolExecutor = async (args) => callGitHubTool('githubDeleteFile', args)
