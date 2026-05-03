/**
 * ============================================================================
 * GitHub Actions Workflow 操作工具
 * ============================================================================
 *
 * 提供 GitHub Actions 工作流的查询、运行记录查看和手动触发功能. 
 * 所有操作通过后端 BFF 代理转发,前端只负责传参. 
 *
 * @module src/theme/tools/github/workflow
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

/**
 * 列出工作流的工具定义
 */
export const githubListWorkflowsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListWorkflows',
    description: `列出 GitHub 仓库的所有 Actions 工作流. 查看仓库配置的 CI/CD 流水线. 

使用场景：
1. 查看仓库有哪些自动化工作流(CI、CD、测试、发布等)
2. 获取 workflow_id 以便后续触发或查看运行记录
3. 了解项目的自动化流程和检查规则
4. 确认某个工作流是否已配置

示例用法：
- 列出仓库所有工作流

注意事项：
- 只返回 .github/workflows/ 目录下定义的工作流
- 返回结果中包含每个工作流的 id 和 path,可用于 githubTriggerWorkflow 和 githubListWorkflowRuns
- 被禁用或删除的工作流不会出现在列表中`,
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
        }
      },
      required: ['owner', 'repo']
    }
  }
}

/**
 * 列出工作流运行记录的工具定义
 */
export const githubListWorkflowRunsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListWorkflowRuns',
    description: `列出 GitHub 仓库的 Actions 工作流运行记录. 查看 CI/CD 的执行历史和状态. 

使用场景：
1. 查看最近的工作流执行状态(成功、失败、进行中)
2. 追踪某次提交或 PR 的 CI 检查结果
3. 排查构建失败的原因
4. 统计工作流的执行频率和成功率

示例用法：
- 查看最近 10 次运行记录(默认)
- 查看最近 30 次：per_page=30

注意事项：
- 返回所有工作流的运行记录,不分具体工作流
- 结果按开始时间倒序排列(最新的在前)
- 状态包括：queued(排队中)、in_progress(运行中)、completed(已完成)
- 结论包括：success(成功)、failure(失败)、cancelled(取消)、skipped(跳过)
- 如需查看特定工作流的运行记录,可先使用 githubListWorkflows 获取 workflow_id 再筛选`,
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
          description: '每页返回的运行记录数量,默认 10,最多 100',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

/**
 * 触发工作流的工具定义
 */
export const githubTriggerWorkflowDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubTriggerWorkflow',
    description: `手动触发(dispatch)GitHub Actions 工作流. 用于启动配置了 workflow_dispatch 事件的工作流. 

使用场景：
1. 手动触发发布流程(如发布新版本、部署到生产环境)
2. 手动运行测试或代码检查
3. 触发需要人工确认的 CI/CD 流程
4. 重新运行某个特定工作流

示例用法：
- 触发发布工作流：workflow_id="release.yml", ref="main"
- 触发带参数的工作流：workflow_id="deploy.yml", ref="main", inputs={"environment": "staging", "version": "1.2.3"}

注意事项：
- 需要 GITHUB_TOKEN 且有对应仓库的 write 权限
- workflow_id 可以通过 githubListWorkflows 获取,是工作流文件在 .github/workflows/ 下的文件名(如 "ci.yml")或数字 ID
- 只能触发配置了 workflow_dispatch 事件的工作流,否则会报错
- ref 必须是已存在的分支或标签名称
- inputs 中的参数必须在工作流文件中有对应的 inputs 定义,否则会报错`,
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
        workflow_id: {
          type: 'string',
          description: '工作流 ID 或文件名. 可通过 githubListWorkflows 获取,例如 "ci.yml"、"deploy.yml" 或数字 ID'
        },
        ref: {
          type: 'string',
          description: '触发工作流的分支或标签名称,例如 "main"、"release/v1.0". 默认 main',
          default: 'main'
        },
        inputs: {
          type: 'object',
          description: '传递给工作流的输入参数(可选). 必须是工作流文件中 workflow_dispatch.inputs 下已定义的参数,例如 {"environment": "production", "dry_run": "false"}'
        }
      },
      required: ['owner', 'repo', 'workflow_id']
    }
  }
}

// ============ ToolExecutors ============

/**
 * 列出工作流
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubListWorkflows: ToolExecutor = async (args) => callGitHubTool('githubListWorkflows', args)

/**
 * 列出工作流运行记录
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubListWorkflowRuns: ToolExecutor = async (args) => callGitHubTool('githubListWorkflowRuns', args)

/**
 * 触发工作流
 *
 * @param args - 工具参数
 * @returns 操作结果
 */
export const githubTriggerWorkflow: ToolExecutor = async (args) => callGitHubTool('githubTriggerWorkflow', args)
