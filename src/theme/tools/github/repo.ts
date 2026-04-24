/**
 * GitHub 工具：仓库查询 + 管理
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { githubRequest, translateGitHubError, encodeRefPath, decodeBase64 } from './utils'

// ============ ToolDefinitions ============

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

// ============ ToolExecutors ============

/**
 * GitHub 工具：获取仓库详细信息
 *
 * 查询指定仓库的完整元数据，包括名称、描述、星标数、Fork 数、主要编程语言、默认分支、Topics、最近更新时间等。
 *
 * 典型使用场景：
 * - 了解开源项目概况
 * - 获取仓库 star/fork 统计数据
 *
 * API: GET /repos/{owner}/{repo}
 *
 * @param args.owner - 仓库所有者（用户名或组织名），如 "facebook"、"microsoft"
 * @param args.repo - 仓库名称，如 "react"、"vscode"
 * @returns ToolResult，data 字段包含仓库完整信息对象
 */
export const githubGetRepo: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo } = args

  // 参数校验：确保 owner 和 repo 必填
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_get_repo(owner="facebook", repo="react")'
    )
  }

  try {
    // 调用 GitHub API 获取仓库元数据
    const repoData = await githubRequest(`/repos/${owner}/${repo}`)

    // 精简返回字段，避免 context bloat
    const result = {
      fullName: repoData.full_name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      language: repoData.language,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      url: repoData.html_url
    }

    return createSuccessResult(
      result,
      `仓库: ${repoData.full_name} ⭐${repoData.stargazers_count.toLocaleString()}`,
      'github_get_repo'
    )
  } catch (error: any) {
    // 错误翻译：将 GitHub 错误码转为中文提示
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：列出仓库目录和文件
 *
 * 浏览仓库的文件结构，查看目录内容或文件元数据（大小、类型、SHA 等）。支持指定分支/标签。
 *
 * 典型使用场景：
 * - 查看源代码文件
 * - 浏览项目目录结构
 *
 * API: GET /repos/{owner}/{repo}/contents/{path}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.path - 目录路径，空字符串表示根目录
 * @param args.ref - 分支或标签名称（可选，默认默认分支）
 * @returns ToolResult，data 字段包含文件/目录项数组
 */
export const githubListRepoContents: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path = '', ref } = args

  // 参数校验：确保 owner 和 repo 必填
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_repo_contents(owner="facebook", repo="react", path="src")'
    )
  }

  try {
    // 构建 API 端点，对路径进行 URL 编码（保留 / 作为分隔符）
    let endpoint = `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`
    if (ref) {
      endpoint += `?ref=${encodeURIComponent(ref)}`
    }

    // 调用 GitHub API 获取目录内容
    const contents = await githubRequest(endpoint)

    // 处理返回结果：可能是数组（目录）或单个对象（文件）
    const items = Array.isArray(contents)
      ? contents.map((item: any) => ({
          name: item.name,
          type: item.type,
          path: item.path,
          size: item.size
        }))
      : [{
          name: contents.name,
          type: contents.type,
          path: contents.path,
          size: contents.size
        }]

    return createSuccessResult(
      items,
      `${owner}/${repo}/${path || ''} (${items.length} 项)`,
      'github_list_repo_contents'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：获取文件内容
 *
 * 获取指定路径文件的原始内容，自动进行 Base64 解码。支持指定分支/标签。
 *
 * 典型使用场景：
 * - 查看源代码文件
 * - 浏览项目目录结构
 *
 * API: GET /repos/{owner}/{repo}/contents/{path}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.path - 文件路径，如 "src/index.js"、"README.md"
 * @param args.ref - 分支或标签名称（可选）
 * @returns ToolResult，data.content 包含文件原始文本内容
 */
export const githubGetFileContent: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path, ref, max_length = 5000 } = args

  // 参数校验：确保 owner、repo 和 path 必填
  if (!owner || !repo || !path) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner、repo 和 path',
      '示例: github_get_file_content(owner="facebook", repo="react", path="README.md")'
    )
  }

  try {
    // 构建 API 端点，编码文件路径中的特殊字符
    let endpoint = `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`
    if (ref) {
      endpoint += `?ref=${encodeURIComponent(ref)}`
    }

    // 调用 GitHub API 获取文件元数据和 Base64 内容
    const data = await githubRequest(endpoint)

    // 检查返回内容：目录或空文件不会包含 content 字段
    if (!data.content) {
      return createErrorResult(
        'No content',
        '无法获取文件内容',
        '该文件可能是目录或没有内容'
      )
    }

    // Base64 解码文件内容
    const rawContent = decodeBase64(data.content)
    const isTruncated = rawContent.length > max_length

    // 截断时提示 AI 可以调大 max_length 重新获取
    const content = isTruncated
      ? rawContent.substring(0, max_length) +
        `\n\n---` +
        `\n[内容已截断] 文件共 ${rawContent.length} 字符，当前限制 ${max_length} 字符。` +
        `\n如需读取更多内容，可重新调用 github_get_file_content(owner="${owner}", repo="${repo}", path="${path}"${ref ? ', ref="' + ref + '"' : ''}, max_length=${Math.min(max_length * 2, 50000)})`
      : rawContent

    return createSuccessResult(
      {
        name: data.name,
        path: data.path,
        size: data.size,
        content,
        truncated: isTruncated
      },
      `${data.name} (${data.size} bytes${isTruncated ? '，已截断至 ' + max_length + ' 字符' : ''})`,
      'github_get_file_content'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：搜索代码
 *
 * 在 GitHub 上全局搜索代码片段。支持按仓库、语言、路径等过滤。
 *
 * 典型使用场景：
 * - 发现开源项目
 * - 查找代码示例
 *
 * API: GET /search/code
 *
 * @param args.query - 搜索查询，支持 GitHub 搜索语法，如 "useState language:typescript"
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data.items 包含匹配的代码片段
 */
export const githubSearchCode: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, language, limit = 5 } = args

  // 参数校验：搜索关键词必填
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: github_search_code(query="useState hook")'
    )
  }

  try {
    // 构建搜索查询：拼接语言筛选条件
    let searchQuery = query
    if (language) {
      searchQuery += ` language:${language}`
    }

    // 调用 GitHub 代码搜索 API
    const data = await githubRequest(`/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${limit}`)

    // 提取和精简搜索结果
    const items = data.items?.map((item: any) => ({
      repository: item.repository.full_name,
      path: item.path,
      url: item.html_url
    })) || []

    return createSuccessResult(
      items,
      `找到 ${data.total_count || 0} 个结果 (显示 ${items.length} 个)`,
      'github_search_code'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：获取提交历史
 *
 * 查看仓库的最近提交记录。支持按分支和文件路径过滤。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: GET /repos/{owner}/{repo}/commits
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.path - 文件路径（可选，只查看该文件的提交历史）
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data 字段包含提交记录数组
 */
export const githubGetCommitHistory: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path, per_page = 10 } = args

  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_get_commit_history(owner="facebook", repo="react")'
    )
  }

  try {
    let endpoint = `/repos/${owner}/${repo}/commits?per_page=${per_page}`
    if (path) {
      endpoint += `&path=${encodeURIComponent(path)}`
    }

    const commits = await githubRequest(endpoint)

    const items = commits.map((commit: any) => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message.split('\n')[0],
      author: commit.commit.author.name,
      date: commit.commit.author.date
    }))

    return createSuccessResult(
      items,
      `${owner}/${repo} 的最近 ${items.length} 条提交`,
      'github_get_commit_history'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：获取 README 内容
 *
 * 获取仓库 README 文件的原始内容，自动进行 Base64 解码。支持指定分支。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: GET /repos/{owner}/{repo}/readme
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.ref - 分支或标签（可选）
 * @returns ToolResult，data.content 包含 README 原始文本
 */
export const githubGetReadme: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, ref } = args
  if (!owner || !repo) {
    return createErrorResult('Missing required parameters', '请提供 owner 和 repo')
  }
  try {
    let endpoint = `/repos/${owner}/${repo}/readme`
    if (ref) endpoint += `?ref=${encodeURIComponent(ref)}`
    const data = await githubRequest(endpoint)
    const rawContent = decodeBase64(data.content)
    return createSuccessResult(
      { name: data.name, path: data.path, content: rawContent, size: data.size },
      `${data.name} (${data.size} bytes)`,
      'github_get_readme'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：比较提交
 *
 * 比较两个分支或提交之间的差异，查看变更文件和提交列表。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: GET /repos/{owner}/{repo}/compare/{base}...{head}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.base - 基础分支/提交
 * @param args.head - 对比分支/提交
 * @returns ToolResult，data 字段包含差异统计和文件列表
 */
export const githubCompareCommits: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, base, head } = args
  if (!owner || !repo || !base || !head) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、base 和 head')
  }
  try {
    const result = await githubRequest(`/repos/${owner}/${repo}/compare/${encodeRefPath(base)}...${encodeRefPath(head)}`)
    return createSuccessResult(
      {
        status: result.status,
        ahead_by: result.ahead_by,
        behind_by: result.behind_by,
        total_commits: result.total_commits,
        files: result.files?.map((f: any) => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions }))
      },
      `${base}...${head}: ${result.status} (+${result.ahead_by}/-${result.behind_by}, ${result.total_commits} commits)`,
      'github_compare_commits'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：查看 API 配额
 *
 * 获取当前 GitHub API 的速率限制状态，包括剩余请求数和重置时间。
 *
 * 典型使用场景：
 * - 监控 API 配额使用
 * - 排查请求失败原因
 *
 * API: GET /rate_limit
 *
 * @returns ToolResult，data.core 和 data.search 分别包含配额信息
 */
export const githubGetRateLimit: ToolExecutor = async (): Promise<ToolResult> => {
  try {
    const data = await githubRequest('/rate_limit')
    const core = data.resources?.core || {}
    const search = data.resources?.search || {}
    return createSuccessResult(
      {
        core: { limit: core.limit, remaining: core.remaining, reset: core.reset },
        search: { limit: search.limit, remaining: search.remaining, reset: search.reset }
      },
      `API 配额：Core ${core.remaining}/${core.limit} | Search ${search.remaining}/${search.limit}`,
      'github_get_rate_limit'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：搜索仓库
 *
 * 全局搜索 GitHub 仓库。支持按语言、Star 数、更新时间等过滤。
 *
 * 典型使用场景：
 * - 发现开源项目
 * - 查找代码示例
 *
 * API: GET /search/repositories
 *
 * @param args.query - 搜索关键词，支持 GitHub 搜索语法
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data.items 包含匹配的仓库列表
 */
export const githubSearchRepos: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, per_page = 10 } = args
  if (!query) {
    return createErrorResult('Missing query', '请提供搜索关键词')
  }
  try {
    const data = await githubRequest(`/search/repositories?q=${encodeURIComponent(query)}&per_page=${per_page}`)
    const items = (data.items || []).map((r: any) => ({
      full_name: r.full_name,
      description: r.description,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      url: r.html_url
    }))
    return createSuccessResult(
      { total: data.total_count, items },
      `找到 ${data.total_count} 个仓库（显示 ${items.length} 个）`,
      'github_search_repos'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建仓库
 *
 * 在当前用户名下创建新的 GitHub 仓库。
 *
 * 典型使用场景：
 * - 为新项目创建仓库
 * - 创建演示项目
 *
 * API: POST /user/repos
 *
 * @param args.name - 仓库名称
 * @param args.description - 仓库描述（可选）
 * @param args.private - 是否私有，默认 false
 * @param args.auto_init - 是否自动初始化 README，默认 false
 * @returns ToolResult，data 字段包含新仓库信息
 */
export const githubCreateRepo: ToolExecutor = async (args): Promise<ToolResult> => {
  const { name, description, private: isPrivate = false, auto_init = false } = args
  if (!name) {
    return createErrorResult('Missing name', '请提供仓库名称')
  }
  try {
    const payload: any = { name, private: isPrivate, auto_init }
    if (description !== undefined) payload.description = description
    const data = await githubRequest('/user/repos', { method: 'POST', body: JSON.stringify(payload) })
    return createSuccessResult(
      { name: data.name, full_name: data.full_name, url: data.html_url, private: data.private },
      `仓库创建成功！${data.full_name} (${data.private ? '私有' : '公开'})\n${data.html_url}`,
      'github_create_repo'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：更新仓库设置
 *
 * 修改仓库的元数据，包括描述、可见性、Topics、功能开关等。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: PATCH /repos/{owner}/{repo}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.description - 新描述（可选）
 * @param args.visibility - 可见性：public 或 private（可选）
 * @param args.topics - Topics 标签数组（可选）
 * @param args.has_issues - 是否启用 Issues（可选）
 * @param args.has_wiki - 是否启用 Wiki（可选）
 * @param args.has_projects - 是否启用 Projects（可选）
 * @returns ToolResult，data 字段包含更新后的仓库信息
 */
export const githubUpdateRepo: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, description, visibility, topics, has_issues, has_wiki, has_projects } = args
  if (!owner || !repo) {
    return createErrorResult('Missing required parameters', '请提供 owner 和 repo')
  }
  try {
    const payload: any = {}
    if (description !== undefined) payload.description = description
    if (visibility !== undefined) payload.visibility = visibility
    if (topics !== undefined) payload.topics = topics
    if (has_issues !== undefined) payload.has_issues = has_issues
    if (has_wiki !== undefined) payload.has_wiki = has_wiki
    if (has_projects !== undefined) payload.has_projects = has_projects

    const data = await githubRequest(`/repos/${owner}/${repo}`, { method: 'PATCH', body: JSON.stringify(payload) })
    return createSuccessResult(
      { name: data.name, full_name: data.full_name, visibility: data.visibility, description: data.description },
      `仓库 ${data.full_name} 更新成功`,
      'github_update_repo'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：删除仓库
 *
 * 删除指定的 GitHub 仓库。⚠️ 此操作不可逆！
 *
 * 典型使用场景：
 * - 清理不再需要的仓库
 *
 * API: DELETE /repos/{owner}/{repo}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @returns ToolResult，确认删除成功
 */
export const githubDeleteRepo: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo } = args
  if (!owner || !repo) {
    return createErrorResult('Missing required parameters', '请提供 owner 和 repo')
  }
  try {
    await githubRequest(`/repos/${owner}/${repo}`, { method: 'DELETE' })
    return createSuccessResult(
      {},
      `仓库 ${owner}/${repo} 已删除`,
      'github_delete_repo'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 Release
 *
 * 为仓库创建新的版本发布。可以关联到特定标签和提交。
 *
 * 典型使用场景：
 * - 发布软件版本
 * - 管理变更日志
 *
 * API: POST /repos/{owner}/{repo}/releases
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.tag_name - 标签名称，如 "v1.0.0"
 * @param args.name - Release 标题
 * @param args.body - Release 描述（支持 Markdown）
 * @param args.target_commitish - 目标分支或提交 SHA，默认 main
 * @param args.draft - 是否为草稿，默认 false
 * @param args.prerelease - 是否为预发布，默认 false
 * @returns ToolResult，data 字段包含新创建的 Release 信息
 */
export const githubCreateRelease: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, tag_name, name, body, draft = false, prerelease = false } = args
  if (!owner || !repo || !tag_name) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 tag_name')
  }
  try {
    const payload: any = { tag_name, draft, prerelease }
    if (name !== undefined) payload.name = name
    if (body !== undefined) payload.body = body
    const release = await githubRequest(`/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { id: release.id, tag_name: release.tag_name, url: release.html_url },
      `成功创建 Release: ${release.tag_name}`,
      'github_create_release'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
