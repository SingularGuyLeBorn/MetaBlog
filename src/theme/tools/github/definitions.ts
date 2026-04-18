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
