/**
 * GitHub 工具：仓库查询 + 管理
 */

import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { callGitHubTool } from './utils'

// ============ ToolDefinitions ============

export const githubGetRepoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetRepo',
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
          description: '仓库所有者（用户名或组织名），例如"facebook"microsoft"vercel"'
        },
        repo: {
          type: 'string',
          description: '仓库名称，例如"react"vscode"next.js"'
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubListRepoContentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubListRepoContents',
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
          description: '仓库所有者
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        path: {
          type: 'string',
          description: '目录或文件路径，默认空字符串（根目录）。例如"src"docs"package.json"',
          default: ''
        },
        ref: {
          type: 'string',
          description: '分支、标签或 commit SHA，默认主分支（main/master
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubGetFileContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetFileContent',
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
          description: '仓库所有者
        },
        repo: {
          type: 'string',
          description: '仓库名称'
        },
        path: {
          type: 'string',
          description: '文件路径，例如"src/index.ts"package.json"README.md"'
        },
        ref: {
          type: 'string',
          description: '分支、标签或 commit SHA，默认主分支'
        },
        max_length: {
          type: 'number',
          description: '最大读取字符数，默认5000。大文件建议调大或分多次读取,
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
    name: 'githubSearchCode',
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
          description: '搜索查询，支GitHub 代码搜索语法。例如"useEffect cleanup"language:typescript react hooks"'
        },
        language: {
          type: 'string',
          description: '可选：限定编程语言，例如"javascript"python"typescript"go"'
        },
        limit: {
          type: 'number',
          description: '返回结果数量，默认5，最多10',
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
    name: 'githubGetCommitHistory',
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
          description: '仓库所有者
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
          description: '返回的提交数量，默认 10，最多30',
          default: 10
        }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubGetReadmeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetReadme',
    description: `获取 GitHub 仓库 README 内容（自动解码）。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者 },
        repo: { type: 'string', description: '仓库名称' },
        ref: { type: 'string', description: '分支或标签 }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubCompareCommitsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCompareCommits',
    description: `比较两个分支或 commit 的差异。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者 },
        repo: { type: 'string', description: '仓库名称' },
        base: { type: 'string', description: '基准分支或commit' },
        head: { type: 'string', description: '对比分支或commit' }
      },
      required: ['owner', 'repo', 'base', 'head']
    }
  }
}

export const githubGetRateLimitDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubGetRateLimit',
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

export const githubSearchReposDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubSearchRepos',
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
          description: '每页结果数，默认 10，最多100',
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
    name: 'githubCreateRepo',
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
          description: '仓库名称，例如"my-project"api-docs"'
        },
        description: {
          type: 'string',
          description: '仓库描述（可选）'
        },
        private: {
          type: 'boolean',
          description: '是否私有仓库，默认false（公开,
          default: false
        },
        auto_init: {
          type: 'boolean',
          description: '是否自动初始README，默认false',
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
    name: 'githubUpdateRepo',
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
        owner: { type: 'string', description: '仓库所有者 },
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
    name: 'githubDeleteRepo',
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
        owner: { type: 'string', description: '仓库所有者 },
        repo: { type: 'string', description: '仓库名称' }
      },
      required: ['owner', 'repo']
    }
  }
}

export const githubCreateReleaseDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'githubCreateRelease',
    description: `创建 GitHub Release。`,
    parameters: {
      type: 'object',
      properties: {
        owner: { type: 'string', description: '仓库所有者 },
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

// ============ ToolExecutors ============

export const githubGetRepo: ToolExecutor = async (args) => callGitHubTool('githubGetRepo', args)

export const githubListRepoContents: ToolExecutor = async (args) => callGitHubTool('githubListRepoContents', args)

export const githubGetFileContent: ToolExecutor = async (args) => callGitHubTool('githubGetFileContent', args)

export const githubSearchCode: ToolExecutor = async (args) => callGitHubTool('githubSearchCode', args)

export const githubGetCommitHistory: ToolExecutor = async (args) => callGitHubTool('githubGetCommitHistory', args)

export const githubGetReadme: ToolExecutor = async (args) => callGitHubTool('githubGetReadme', args)

export const githubCompareCommits: ToolExecutor = async (args) => callGitHubTool('githubCompareCommits', args)

export const githubGetRateLimit: ToolExecutor = async (args) => callGitHubTool('githubGetRateLimit', args)

export const githubSearchRepos: ToolExecutor = async (args) => callGitHubTool('githubSearchRepos', args)

export const githubCreateRepo: ToolExecutor = async (args) => callGitHubTool('githubCreateRepo', args)

export const githubUpdateRepo: ToolExecutor = async (args) => callGitHubTool('githubUpdateRepo', args)

export const githubDeleteRepo: ToolExecutor = async (args) => callGitHubTool('githubDeleteRepo', args)

export const githubCreateRelease: ToolExecutor = async (args) => callGitHubTool('githubCreateRelease', args)
