/**
 * GitHub 工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const githubGetRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_repo',
    description: `获取 GitHub 仓库信息。查看仓库详情、统计信息、最近更新等。

使用场景：
1. 了解一个开源项目的基本信息
2. 查看仓库的 Star 数、Fork 数、语言分布
3. 获取 README 内容摘要
4. 查看最近的提交活动

示例：
- 查看 React 仓库：owner="facebook", repo="react"
- 查看 VS Code：owner="microsoft", repo="vscode"`,
    parameters: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: '仓库所有者（用户名或组织名），例如 "facebook"、"microsoft"、"vercel"'
        },
        repo: {
          type: 'string',
          description: '仓库名称，例如 "react"、"vscode"、"next.js"'
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListRepoContentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_repo_contents',
    description: `列出 GitHub 仓库的文件和目录内容。浏览代码结构、查找特定文件。

使用场景：
1. 浏览仓库的目录结构
2. 查找特定的源代码文件
3. 了解项目组织结构
4. 定位配置文件（package.json、tsconfig.json 等）

示例：
- 查看根目录：owner="facebook", repo="react", path=""
- 查看 src 目录：owner="facebook", repo="react", path="src"`,
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
        path: {
          type: 'string',
          description: '目录或文件路径，默认空字符串（根目录）。例如 "src"、"docs"、"package.json"',
          default: ''
        },
        ref: {
          type: 'string',
          description: '分支、标签或 commit SHA，默认主分支（main/master）'
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubGetFileContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_file_content',
    description: `获取 GitHub 仓库中特定文件的内容。读取源代码、配置文件等。支持限制读取长度避免大文件占用过多上下文。

使用场景：
1. 查看源代码实现
2. 读取配置文件（package.json、.gitignore 等）
3. 学习优秀的代码示例
4. 查看文档文件

注意：
- 文件路径需要包含完整的相对路径
- 支持获取文件的原始内容（自动解码 base64）
- 可以指定特定分支或 commit
- 大文件会自动截断，可通过 max_length 调整`,
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
        path: {
          type: 'string',
          description: '文件路径，例如 "src/index.ts"、"package.json"、"README.md"'
        },
        ref: {
          type: 'string',
          description: '分支、标签或 commit SHA，默认主分支'
        },
        max_length: {
          type: 'number',
          description: '最大读取字符数，默认 5000。大文件建议调大或分多次读取。',
          default: 5000
        }
      },
      required: ['owner', 'repo', 'path']
    }
  }
}

export const githubSearchCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_search_code',
    description: `在 GitHub 上搜索代码。查找开源项目中的代码示例、特定实现。

使用场景：
1. 查找特定函数的代码实现示例
2. 搜索开源项目中的最佳实践
3. 查找特定语言/框架的使用示例
4. 学习如何解决特定问题

搜索语法：
- 关键词搜索："useState hook"
- 限定语言："quickSort language:python"
- 限定仓库："apiCall repo:facebook/react"
- 限定路径："config path:src"`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询，支持 GitHub 代码搜索语法。例如 "useEffect cleanup"、"language:typescript react hooks"'
        },
        language: {
          type: 'string',
          description: '可选：限定编程语言，例如 "javascript"、"python"、"typescript"、"go"'
        },
        limit: {
          type: 'number',
          description: '返回结果数量，默认 5，最大 10',
          default: 5
        }
      },
      required: ['query']
    }
  }
}

export const githubGetCommitHistoryDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_commit_history',
    description: `获取 GitHub 仓库的提交历史。查看最近的代码变更、提交信息。

使用场景：
1. 了解项目最近的发展动态
2. 查看特定功能的实现历史
3. 追踪 bug 修复记录
4. 了解贡献者活动`,
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
        path: {
          type: 'string',
          description: '可选：限定特定文件或目录的提交历史'
        },
        per_page: {
          type: 'number',
          description: '返回的提交数量，默认 10，最大 30',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubGetIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_issues',
    description: `获取 GitHub 仓库的 Issues。查看问题、bug 报告、功能请求。

使用场景：
1. 了解项目已知的问题
2. 查看功能请求和讨论
3. 了解社区反馈
4. 查看问题的解决方案`,
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
          description: 'Issue 状态：open（开放）、closed（已关闭）、all（全部），默认 open',
          enum: ['open', 'closed', 'all'],
          default: 'open'
        },
        per_page: {
          type: 'number',
          description: '返回数量，默认 10，最大 30',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListPullsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_pulls',
    description: `获取 GitHub 仓库的 Pull Requests（PR）。查看待合并的代码变更。

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
          description: 'PR 状态：open（开放）、closed（已关闭）、all（全部），默认 open',
          enum: ['open', 'closed', 'all'],
          default: 'open'
        },
        per_page: {
          type: 'number',
          description: '返回数量，默认 10，最大 30',
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
    name: 'github_get_pull',
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

export const githubCreateIssueDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_issue',
    description: `在 GitHub 仓库创建 Issue。提交 bug 报告、功能请求或任务。

注意：需要 GITHUB_TOKEN 且有对应仓库的 write 权限。`,
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
        title: {
          type: 'string',
          description: 'Issue 标题'
        },
        body: {
          type: 'string',
          description: 'Issue 正文内容（支持 Markdown）'
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表，例如 ["bug", "enhancement"]'
        }
      },
      required: ['owner', 'repo', 'title']
    }
  }
}

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

export const githubCreatePullRequestDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_pull_request',
    description: `创建 GitHub Pull Request。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        title: { type: 'string', description: 'PR 标题' },
        head: { type: 'string', description: '源分支，例如 "feature-branch"' },
        base: { type: 'string', description: '目标分支，默认 main', default: 'main' },
        body: { type: 'string', description: 'PR 正文（支持 Markdown）' },
        draft: { type: 'boolean', description: '是否为 Draft', default: false }
      },
      required: ['owner', 'repo', 'title', 'head']
    }
  }
}

export const githubMergePullRequestDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_merge_pull_request',
    description: `合并 GitHub Pull Request。支持 merge、squash、rebase。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'PR 编号' },
        merge_method: { type: 'string', enum: ['merge', 'squash', 'rebase'], description: '合并方式，默认 squash', default: 'squash' },
        commit_title: { type: 'string', description: '合并提交标题（可选）' },
        commit_message: { type: 'string', description: '合并提交消息（可选）' }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubCreateIssueCommentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_issue_comment',
    description: `在 GitHub Issue 或 PR 下添加评论。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue 或 PR 编号' },
        body: { type: 'string', description: '评论内容（支持 Markdown）' }
      },
      required: ['owner', 'repo', 'number', 'body']
    }
  }
}

export const githubUpdateIssueDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_update_issue',
    description: `更新 GitHub Issue 或 PR 的状态、标题、正文、标签。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue 编号' },
        title: { type: 'string', description: '新标题（可选）' },
        body: { type: 'string', description: '新正文（可选）' },
        state: { type: 'string', enum: ['open', 'closed'], description: '状态' },
        labels: { type: 'array', items: { type: 'string' }, description: '标签列表（可选）' }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubCreateBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_branch',
    description: `基于现有分支创建新分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        branch: { type: 'string', description: '新分支名称' },
        from_branch: { type: 'string', description: '源分支，默认 main', default: 'main' }
      },
      required: ['owner', 'repo', 'branch']
    }
  }
}

export const githubDeleteBranchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_delete_branch',
    description: `删除 GitHub 分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        branch: { type: 'string', description: '分支名称' }
      },
      required: ['owner', 'repo', 'branch']
    }
  }
}

export const githubForkRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_fork_repo',
    description: `Fork 一个 GitHub 仓库。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '源仓库所有者' },
        repo: { type: 'string', description: '源仓库名称' },
        organization: { type: 'string', description: '目标组织（可选）' },
        name: { type: 'string', description: '新仓库名（可选）' }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubCreateReleaseDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_release',
    description: `创建 GitHub Release。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        tag_name: { type: 'string', description: '标签名，例如 "v1.0.0"' },
        name: { type: 'string', description: 'Release 标题' },
        body: { type: 'string', description: 'Release 正文' },
        draft: { type: 'boolean', description: '是否为 Draft', default: false },
        prerelease: { type: 'boolean', description: '是否为预发布', default: false }
      },
      required: ['owner', 'repo', 'tag_name']
    }
  }
}

export const githubListBranchesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_branches',
    description: `列出 GitHub 仓库的所有分支。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        per_page: { type: 'number', description: '返回数量，默认 30', default: 30 }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubCompareCommitsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_compare_commits',
    description: `比较两个分支或 commit 的差异。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        base: { type: 'string', description: '基准分支或 commit' },
        head: { type: 'string', description: '对比分支或 commit' }
      },
      required: ['owner', 'repo', 'base', 'head']
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

export const githubGetReadmeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_readme',
    description: `获取 GitHub 仓库 README 内容（自动解码）。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        ref: { type: 'string', description: '分支或标签' }
      },
      required: ['owner', 'repo']
    }
  }
}


export const githubSearchReposDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_search_repos',
    description: `搜索 GitHub 仓库。通过关键词查找公开或私有仓库，支持按语言、Star 数、更新时间等过滤。

使用场景：
1. 发现优秀的开源项目
2. 查找特定技术栈的示例代码
3. 搜索相关领域的工具库
4. 寻找可 Fork 的项目模板

搜索语法示例：
- "react state management" - 搜索包含这些词的项目
- "language:typescript stars:>1000" - TypeScript 项目且 Star>1000
- "topic:machine-learning" - 主题为机器学习
- "user:facebook" - 搜索某个用户的仓库`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，支持 GitHub 搜索语法，如 "react stars:>1000 language:typescript"'
        },
        per_page: {
          type: 'number',
          description: '每页结果数，默认 10，最大 100',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

export const githubSearchIssuesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_search_issues',
    description: `搜索 GitHub Issues 和 Pull Requests。支持全局搜索或指定仓库内搜索。

使用场景：
1. 查找某个技术问题的解决方案
2. 搜索 Bug 报告和修复状态
3. 发现正在讨论的新功能
4. 在特定仓库内搜索 Issue

搜索语法示例：
- "memory leak repo:facebook/react" - 在 React 仓库搜索内存泄漏
- "is:pr is:open label:bug" - 搜索开放的 Bug PR
- "is:issue author:octocat" - 搜索某用户创建的 Issue
- "sort:updated-desc" - 按最近更新排序`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，支持 GitHub 搜索语法'
        },
        per_page: {
          type: 'number',
          description: '每页结果数，默认 10，最大 100',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

export const githubCreateRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_repo',
    description: `创建新的 GitHub 仓库。在用户名下创建一个新的代码仓库。

使用场景：
1. 为新项目创建代码仓库
2. 创建演示或实验项目
3. 创建组织内部的工具仓库
4. 创建文档或博客仓库

注意事项：
- 仓库名只能包含字母、数字、连字符、下划线和点号
- 如果已存在同名仓库，会报错 422
- 创建的仓库默认归属到当前 Token 对应的用户`,
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: '仓库名称，例如 "my-project"、"api-docs"'
        },
        description: {
          type: 'string',
          description: '仓库描述（可选）'
        },
        private: {
          type: 'boolean',
          description: '是否私有仓库，默认 false（公开）',
          default: false
        },
        auto_init: {
          type: 'boolean',
          description: '是否自动初始化 README，默认 false',
          default: false
        }
      },
      required: ['name']
    }
  }
}

export const githubUpdateRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_update_repo',
    description: `更新 GitHub 仓库设置。修改仓库的可见性、描述、Topics 等元信息。

使用场景：
1. 将仓库设为公开或私有
2. 修改仓库描述
3. 添加或更新 Topics
4. 启用/禁用 Issues、Wiki 等功能

注意事项：
- visibility 变更只能从 private → public 或 public → private
- 变更 visibility 可能需要额外的权限`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        description: { type: 'string', description: '新的仓库描述（可选）' },
        visibility: { type: 'string', description: '可见性：public 或 private（可选）' },
        topics: { type: 'array', items: { type: 'string' }, description: 'Topics 标签数组（可选）' },
        has_issues: { type: 'boolean', description: '是否启用 Issues（可选）' },
        has_wiki: { type: 'boolean', description: '是否启用 Wiki（可选）' },
        has_projects: { type: 'boolean', description: '是否启用 Projects（可选）' }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubDeleteRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_delete_repo',
    description: `删除 GitHub 仓库。⚠️ 危险操作，删除后无法恢复！

使用场景：
1. 清理不再需要的实验仓库
2. 删除误创建的仓库

注意事项：
- 删除操作不可逆
- 需要仓库的 admin 权限
- 如果开启了删除保护（Dependabot 等），可能无法删除`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListIssueCommentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_list_issue_comments',
    description: `列出 GitHub Issue 或 PR 的所有评论。

使用场景：
1. 查看 Issue 的讨论历史
2. 获取 PR 的审查评论
3. 跟踪问题解决过程中的讨论`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'Issue 或 PR 编号' },
        per_page: { type: 'number', description: '每页数量，默认 30', default: 30 }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubGetPullRequestFilesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_pull_request_files',
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
        per_page: { type: 'number', description: '每页数量，默认 100', default: 100 }
      },
      required: ['owner', 'repo', 'number']
    }
  }
}

export const githubCreatePullRequestReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_create_pull_request_review',
    description: `对 Pull Request 提交 Review（审查意见）。支持 APPROVE（通过）、REQUEST_CHANGES（请求修改）、COMMENT（仅评论）。

使用场景：
1. 代码审查后给出通过/不通过意见
2. 提出修改建议
3. 对 PR 进行整体评价

注意事项：
- 不能 Review 自己创建的 PR（GitHub 会返回 422）
- APPROVE 后 PR 可以被合并（如果设置了审查要求）`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者' },
        repo: { type: 'string', description: '仓库名称' },
        number: { type: 'number', description: 'PR 编号' },
        event: {
          type: 'string',
          description: 'Review 类型：APPROVE（通过）、REQUEST_CHANGES（请求修改）、COMMENT（仅评论）',
          enum: ['APPROVE', 'REQUEST_CHANGES', 'COMMENT']
        },
        body: { type: 'string', description: 'Review 评论内容（REQUEST_CHANGES 和 COMMENT 必填）' }
      },
      required: ['owner', 'repo', 'number', 'event']
    }
  }
}

export const githubGetRateLimitDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'github_get_rate_limit',
    description: `查看 GitHub API 配额使用情况。了解剩余请求次数和重置时间。

使用场景：
1. 排查 API 调用失败是否因配额耗尽
2. 监控大量调用时的配额消耗
3. 规划批量操作的时间`,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
