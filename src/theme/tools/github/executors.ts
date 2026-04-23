/**
 * ============================================================================
 * GitHub 工具执行器集合
 * ============================================================================
 *
 * 本模块为 AI Agent 提供完整的 GitHub REST API 调用能力。
 * 所有工具遵循统一的 ToolExecutor 接口：接收参数对象，返回 ToolResult。
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 设计原则                                                                  │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ 1. 单一职责：每个工具只做一件事，参数语义清晰                              │
 * │ 2. 错误友好：所有错误都经过 translateGitHubError 翻译为用户可读的提示     │
 * │ 3. 数据精简：返回结果只保留 Agent 需要的字段，避免 context bloat           │
 * │ 4. URL 安全：路径中的特殊字符（如中文、空格）都经过 encodeRefPath 编码     │
 * │ 5. Base64 兼容：decodeBase64 同时支持浏览器 atob 和 Node Buffer           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 工具分类（共 34 个）：
 * ├─ 仓库管理（9）：get_repo, search_repos, create_repo, update_repo, delete_repo,
 * │                list_repo_contents, fork_repo, get_readme, list_repos
 * ├─ 代码内容（5）：get_file_content, search_code, create_or_update_file,
 * │                delete_file, get_commit_history
 * ├─ 分支管理（4）：list_branches, create_branch, delete_branch, compare_commits
 * ├─ Issue（6）：get_issues, search_issues, create_issue, update_issue,
 * │             list_issue_comments, create_issue_comment
 * ├─ Pull Request（6）：list_pulls, get_pull, get_pull_request_files,
 * │                    create_pull_request, create_pull_request_review,
 * │                    merge_pull_request
 * ├─ Release（1）：create_release
 * ├─ Actions（2）：list_workflows, list_workflow_runs, trigger_workflow
 * └─ 系统（1）：get_rate_limit
 *
 * 认证方式：通过 VITE_GITHUB_TOKEN 环境变量注入 Bearer Token
 * API 文档：https://docs.github.com/en/rest
 * ============================================================================
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

/** GitHub REST API 根地址 */
const GITHUB_API_BASE = 'https://api.github.com'

/**
 * 从环境变量获取 GitHub Personal Access Token
 *
 * Vite 构建时会将 .env 中的 VITE_GITHUB_TOKEN 注入到 import.meta.env 中。
 * 如果 Token 未配置，未认证请求将受到每小时 60 次的严格速率限制。
 *
 * @returns GitHub Token 字符串，未配置时返回空字符串
 */
function getGitHubToken(): string {
  try {
    return (import.meta as any).env?.VITE_GITHUB_TOKEN || ''
  } catch {
    return ''
  }
}

/**
 * 将 GitHub API 错误码翻译为用户友好的中文提示
 *
 * GitHub REST API 的错误响应通常包含 HTTP 状态码和英文错误信息。
 * 本函数提取状态码，返回对应的中文错误描述和修复建议，
 * 使 Agent 能够在工具结果中向用户清晰解释失败原因。
 *
 * 覆盖的错误码：
 * - 401: Token 无效或过期
 * - 403: 无权限访问或速率限制（区分 rate limit 和普通 403）
 * - 404: 仓库/资源不存在
 * - 405: 操作不被允许（如对已合并 PR 的无效操作）
 * - 409: 资源冲突（合并冲突、资源已存在等）
 * - 422: 参数验证失败
 * - 429: 请求过于频繁
 * - 500/502/503: GitHub 服务端错误
 *
 * @param errorMsg - 原始错误消息（通常包含 HTTP 状态码）
 * @returns 包含 message（用户友好描述）和 suggestion（修复建议）的对象
 */
function translateGitHubError(errorMsg: string): { message: string; suggestion: string } {
  // 从错误消息中提取 HTTP 状态码（如 "GitHub API 404: ..." → 404）
  const statusMatch = errorMsg.match(/(\d{3})/)
  const status = statusMatch ? parseInt(statusMatch[1]) : 0

  if (status === 401) {
    return { message: 'GitHub Token 无效或已过期', suggestion: '请检查是否配置了 GITHUB_TOKEN 环境变量' }
  }
  if (status === 403) {
    if (errorMsg.includes('rate limit')) {
      return { message: 'GitHub API 速率限制', suggestion: '未认证请求每小时 60 次限制，建议配置 GITHUB_TOKEN' }
    }
    return { message: '没有权限访问该资源', suggestion: '请检查 Token 是否有对应仓库的访问权限' }
  }
  if (status === 404) {
    return { message: '仓库或资源不存在', suggestion: '请检查 owner、repo、path 参数是否正确' }
  }
  if (status === 405) {
    return { message: '操作不被允许', suggestion: 'PR 可能已合并，或当前状态不支持该操作' }
  }
  if (status === 409) {
    return { message: '资源冲突', suggestion: '可能存在合并冲突，或该资源已存在/已删除' }
  }
  if (status === 422) {
    return { message: '请求参数验证失败', suggestion: '请检查参数格式是否符合 GitHub API 要求' }
  }
  if (status === 429) {
    return { message: '请求过于频繁', suggestion: '请稍后再试' }
  }
  if (status === 500) {
    return { message: 'GitHub 服务器内部错误', suggestion: '请稍后重试' }
  }
  if (status === 502) {
    return { message: 'GitHub 网关错误', suggestion: 'GitHub 服务暂时不可用，请稍后重试' }
  }
  if (status === 503) {
    return { message: 'GitHub 服务维护中', suggestion: '请稍后重试' }
  }

  // 未知错误：返回原始消息，提供通用建议
  return { message: errorMsg, suggestion: '请检查参数或稍后重试' }
}

/**
 * GitHub REST API 通用请求封装
 *
 * 封装了所有 GitHub API 调用的公共逻辑：
 * 1. 拼接完整 URL（GITHUB_API_BASE + endpoint）
 * 2. 自动注入认证头（Bearer Token）
 * 3. 统一错误处理（非 2xx 状态码抛出异常）
 * 4. 特殊处理 204 No Content（DELETE 操作、触发工作流等返回空体）
 * 5. 自动解析 JSON 响应
 *
 * @param endpoint - API 端点路径，如 "/repos/facebook/react"（不需要包含基础 URL）
 * @param options  - fetch 选项，可覆盖 method（默认 GET）、body、headers 等
 * @returns API 响应解析后的 JSON 对象；204 响应返回空对象 {}
 * @throws Error 当响应状态码非 2xx 时，抛出包含状态码和响应文本的异常
 */
async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${GITHUB_API_BASE}${endpoint}`
  const token = getGitHubToken()

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MetaBlog-AI-Chat',
      // 如果配置了 Token，注入 Authorization 头；未配置则匿名访问（受速率限制）
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      // 允许调用方覆盖默认 headers（如 POST 时的 Content-Type）
      ...options.headers
    }
  })

  // 非 2xx 状态码统一抛出异常，由执行器捕获后翻译为 ToolResult
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`GitHub API ${response.status}: ${text}`)
  }

  // 204 No Content 处理：DELETE 分支、触发工作流等操作返回空响应体
  // 直接返回 {} 避免 response.json() 解析空体报错
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {}
  }

  // 正常响应：解析 JSON 返回
  return response.json()
}

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
 * GitHub 工具：获取 Issues 列表
 *
 * 列出仓库的 Issues，支持按状态过滤。返回结果自动过滤掉 Pull Request。
 *
 * 典型使用场景：
 * - 跟踪 Bug 修复进度
 * - 管理任务清单
 *
 * API: GET /repos/{owner}/{repo}/issues
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.state - 状态过滤：open、closed、all，默认 open
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data 字段包含 Issue 数组（已过滤 PR）
 */
export const githubGetIssues: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, state = 'open', per_page = 10 } = args
  
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_get_issues(owner="facebook", repo="react")'
    )
  }
  
  try {
    const issues = await githubRequest(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${per_page}`)

    // GitHub Issues API 默认把 PR 也当作 issue 返回，过滤掉 PR
    const items = issues
      .filter((issue: any) => !issue.pull_request)
      .map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        author: issue.user.login,
        createdAt: issue.created_at
      }))
    
    return createSuccessResult(
      items,
      `${owner}/${repo} 的 ${state} Issues (${items.length} 条)`,
      'github_get_issues'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：列出 Pull Requests
 *
 * 获取仓库的 PR 列表。支持按状态过滤。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: GET /repos/{owner}/{repo}/pulls
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.state - 状态过滤：open、closed、all，默认 open
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data 字段包含 PR 数组
 */
export const githubListPulls: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, state = 'open', per_page = 10 } = args
  
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_pulls(owner="facebook", repo="react")'
    )
  }
  
  try {
    const pulls = await githubRequest(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}`)
    
    const items = pulls.map((pr: any) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user.login,
      branch: `${pr.head.ref} → ${pr.base.ref}`,
      draft: pr.draft,
      createdAt: pr.created_at
    }))
    
    return createSuccessResult(
      items,
      `${owner}/${repo} 的 ${state} PRs (${items.length} 条)`,
      'github_list_pulls'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：获取单个 PR 详情
 *
 * 查看指定 PR 的完整信息，包括标题、描述、分支、合并状态、评论数等。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: GET /repos/{owner}/{repo}/pulls/{number}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @returns ToolResult，data 字段包含 PR 完整信息
 */
export const githubGetPull: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number } = args
  
  if (!owner || !repo || !number) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner、repo 和 PR number',
      '示例: github_get_pull(owner="facebook", repo="react", number=123)'
    )
  }
  
  try {
    const pr = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}`)
    
    return createSuccessResult(
      {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        body: pr.body,
        branch: `${pr.head.ref} → ${pr.base.ref}`,
        draft: pr.draft,
        commits: pr.commits,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changed_files,
        merged: pr.merged,
        mergeable: pr.mergeable,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      },
      `PR #${pr.number}: ${pr.title} (${pr.state})`,
      'github_get_pull'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 Issue
 *
 * 在指定仓库创建新的 Issue。支持标题、正文、标签、负责人和里程碑。
 *
 * 典型使用场景：
 * - 跟踪 Bug 修复进度
 * - 管理任务清单
 *
 * API: POST /repos/{owner}/{repo}/issues
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.title - Issue 标题
 * @param args.body - Issue 正文（支持 Markdown，可选）
 * @param args.labels - 标签数组（可选）
 * @param args.assignees - 负责人用户名数组（可选）
 * @returns ToolResult，data 字段包含新创建的 Issue 信息
 */
export const githubCreateIssue: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, title, body, labels } = args
  
  if (!owner || !repo || !title) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner、repo 和 title',
      '示例: github_create_issue(owner="facebook", repo="react", title="Bug report", body="...")'
    )
  }
  
  try {
    const payload: any = { title }
    if (body !== undefined) payload.body = body
    if (labels && Array.isArray(labels)) payload.labels = labels
    
    const issue = await githubRequest(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    return createSuccessResult(
      {
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        createdAt: issue.created_at
      },
      `成功创建 Issue #${issue.number}: ${issue.title}`,
      'github_create_issue'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：列出工作流
 *
 * 获取仓库中配置的所有 GitHub Actions 工作流列表。
 *
 * 典型使用场景：
 * - 查看 CI/CD 状态
 * - 手动触发构建
 *
 * API: GET /repos/{owner}/{repo}/actions/workflows
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @returns ToolResult，data 字段包含工作流数组
 */
export const githubListWorkflows: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo } = args
  
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_workflows(owner="facebook", repo="react")'
    )
  }
  
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/actions/workflows`)
    const items = (data.workflows || []).map((wf: any) => ({
      id: wf.id,
      name: wf.name,
      path: wf.path,
      state: wf.state,
      url: wf.html_url
    }))
    
    return createSuccessResult(
      items,
      `${owner}/${repo} 的工作流 (${items.length} 个)`,
      'github_list_workflows'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：列出工作流运行记录
 *
 * 查看工作流的最近执行记录，包括状态、分支、触发时间等。
 *
 * 典型使用场景：
 * - 查看 CI/CD 状态
 * - 手动触发构建
 *
 * API: GET /repos/{owner}/{repo}/actions/runs
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data 字段包含运行记录数组
 */
export const githubListWorkflowRuns: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, per_page = 10 } = args
  
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_workflow_runs(owner="facebook", repo="react")'
    )
  }
  
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/actions/runs?per_page=${per_page}`)
    const items = (data.workflow_runs || []).map((run: any) => ({
      id: run.id,
      name: run.name,
      branch: run.head_branch,
      status: run.status,
      conclusion: run.conclusion,
      event: run.event,
      runNumber: run.run_number,
      url: run.html_url,
      createdAt: run.created_at
    }))
    
    return createSuccessResult(
      items,
      `${owner}/${repo} 的运行记录 (${items.length} 次)`,
      'github_list_workflow_runs'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * 编码 GitHub ref 路径中的分支名/标签名
 * 保留 / 作为路径分隔符，但编码每个 segment 中的特殊字符
 */
function encodeRefPath(ref: string): string {
  return ref.split('/').map(encodeURIComponent).join('/')
}

// Base64 编码辅助函数（支持 Unicode，兼容浏览器和 Node）
function encodeBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
  } catch {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64')
    }
    throw new Error('Base64 encoding not available')
  }
}

// Base64 解码辅助函数（兼容浏览器和 Node）
function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
  } catch {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8')
    }
    throw new Error('Base64 decoding not available')
  }
}

/**
 * GitHub 工具：创建或更新文件
 *
 * 在仓库中创建新文件或更新已有文件。需要提供 Base64 编码的内容。
 *
 * 典型使用场景：
 * - 查看源代码文件
 * - 浏览项目目录结构
 *
 * API: PUT /repos/{owner}/{repo}/contents/{path}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.path - 文件路径
 * @param args.content - 文件内容（Base64 编码）
 * @param args.message - 提交信息
 * @param args.branch - 目标分支，默认 main
 * @param args.sha - 已有文件的 SHA（更新时必填）
 * @returns ToolResult，data 字段包含提交信息
 */
export const githubCreateOrUpdateFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path, content, message, branch = 'main', sha } = args
  if (!owner || !repo || !path || content === undefined || !message) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、path、content 和 message')
  }
  try {
    const payload: any = { message, content: encodeBase64(content), branch }
    if (sha) payload.sha = sha
    const data = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { path: data.content?.path, sha: data.content?.sha, url: data.content?.html_url },
      `成功提交文件: ${path} (commit: ${data.commit?.sha?.substring(0, 7)})`,
      'github_create_or_update_file'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：删除文件
 *
 * 从仓库中删除指定文件。需要提供文件的当前 SHA。
 *
 * 典型使用场景：
 * - 查看源代码文件
 * - 浏览项目目录结构
 *
 * API: DELETE /repos/{owner}/{repo}/contents/{path}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.path - 文件路径
 * @param args.message - 提交信息
 * @param args.sha - 文件的当前 SHA
 * @param args.branch - 目标分支，默认 main
 * @returns ToolResult，确认删除成功
 */
export const githubDeleteFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path, message, sha, branch = 'main' } = args
  if (!owner || !repo || !path || !message || !sha) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、path、message 和 sha')
  }
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha, branch })
    })
    return createSuccessResult({ commit: data.commit?.sha }, `成功删除文件: ${path}`, 'github_delete_file')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 Pull Request
 *
 * 在仓库中创建新的 PR。需要指定源分支和目标分支。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: POST /repos/{owner}/{repo}/pulls
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.title - PR 标题
 * @param args.head - 源分支（如 "feature-branch"）
 * @param args.base - 目标分支（如 "main"）
 * @param args.body - PR 描述（支持 Markdown，可选）
 * @returns ToolResult，data 字段包含新创建的 PR 信息
 */
export const githubCreatePullRequest: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, title, head, base = 'main', body, draft = false } = args
  if (!owner || !repo || !title || !head) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、title 和 head')
  }
  try {
    const payload: any = { title, head, base, draft }
    if (body !== undefined) payload.body = body
    const pr = await githubRequest(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { number: pr.number, url: pr.html_url, title: pr.title },
      `成功创建 PR #${pr.number}: ${pr.title}`,
      'github_create_pull_request'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：合并 Pull Request
 *
 * 将指定的 PR 合并到目标分支。支持三种合并方式。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: PUT /repos/{owner}/{repo}/pulls/{number}/merge
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @param args.commit_title - 合并提交的标题（可选）
 * @param args.commit_message - 合并提交的描述（可选）
 * @param args.merge_method - 合并方式：merge、squash、rebase，默认 merge
 * @returns ToolResult，data 字段包含合并后的提交信息
 */
export const githubMergePullRequest: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, merge_method = 'squash', commit_title, commit_message } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const payload: any = { merge_method }
    if (commit_title) payload.commit_title = commit_title
    if (commit_message) payload.commit_message = commit_message
    const result = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}/merge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { sha: result.sha, message: result.message },
      `成功合并 PR #${number} (commit: ${result.sha?.substring(0, 7)})`,
      'github_merge_pull_request'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 Issue / PR 评论
 *
 * 在指定的 Issue 或 PR 下添加评论。支持 Markdown 格式。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: POST /repos/{owner}/{repo}/issues/{number}/comments
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - Issue 或 PR 编号
 * @param args.body - 评论内容（支持 Markdown）
 * @returns ToolResult，data 字段包含新评论信息
 */
export const githubCreateIssueComment: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, body } = args
  if (!owner || !repo || !number || !body) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、number 和 body')
  }
  try {
    const comment = await githubRequest(`/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    })
    return createSuccessResult(
      { id: comment.id, url: comment.html_url },
      `成功添加评论: ID=${comment.id}`,
      'github_create_issue_comment'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：更新 Issue
 *
 * 修改现有 Issue 的属性，包括标题、正文、状态、标签、负责人等。
 *
 * 典型使用场景：
 * - 跟踪 Bug 修复进度
 * - 管理任务清单
 *
 * API: PATCH /repos/{owner}/{repo}/issues/{number}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - Issue 编号
 * @param args.title - 新标题（可选）
 * @param args.body - 新正文（可选）
 * @param args.state - 状态：open 或 closed（可选）
 * @param args.labels - 标签数组（可选）
 * @param args.assignees - 负责人数组（可选）
 * @returns ToolResult，data 字段包含更新后的 Issue 信息
 */
export const githubUpdateIssue: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, title, body, state, labels } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const payload: any = {}
    if (title !== undefined) payload.title = title
    if (body !== undefined) payload.body = body
    if (state !== undefined) payload.state = state
    if (labels !== undefined) payload.labels = labels
    const issue = await githubRequest(`/repos/${owner}/${repo}/issues/${number}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { number: issue.number, state: issue.state, title: issue.title },
      `成功更新 Issue #${issue.number}: [${issue.state}] ${issue.title}`,
      'github_update_issue'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建分支
 *
 * 基于现有分支创建新分支。新分支的初始提交与源分支相同。
 *
 * 典型使用场景：
 * - 创建功能分支
 * - 清理已合并分支
 *
 * API: POST /repos/{owner}/{repo}/git/refs
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.branch - 新分支名称
 * @param args.from_branch - 源分支，默认 main
 * @returns ToolResult，data 字段包含新分支的引用信息
 */
export const githubCreateBranch: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, branch, from_branch = 'main' } = args
  if (!owner || !repo || !branch) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 branch')
  }
  try {
    const baseBranch = await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeRefPath(from_branch)}`)
    const sha = baseBranch.object.sha
    const result = await githubRequest(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha })
    })
    return createSuccessResult({ ref: result.ref }, `成功创建分支: ${branch}`, 'github_create_branch')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：删除分支
 *
 * 删除仓库中的指定分支。已合并到主分支的功能分支通常可以安全删除。
 *
 * 典型使用场景：
 * - 创建功能分支
 * - 清理已合并分支
 *
 * API: DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.branch - 要删除的分支名称
 * @returns ToolResult，确认删除成功
 */
export const githubDeleteBranch: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, branch } = args
  if (!owner || !repo || !branch) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 branch')
  }
  try {
    await githubRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeRefPath(branch)}`, { method: 'DELETE' })
    return createSuccessResult({}, `成功删除分支: ${branch}`, 'github_delete_branch')
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：Fork 仓库
 *
 * 将指定仓库 Fork 到当前用户名下，或 Fork 到指定组织。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: POST /repos/{owner}/{repo}/forks
 *
 * @param args.owner - 源仓库所有者
 * @param args.repo - 源仓库名称
 * @param args.organization - 目标组织名（可选，默认 Fork 到个人账户）
 * @returns ToolResult，data 字段包含新 Fork 的仓库信息
 */
export const githubForkRepo: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, organization, name } = args
  if (!owner || !repo) {
    return createErrorResult('Missing required parameters', '请提供 owner 和 repo')
  }
  try {
    const payload: any = {}
    if (organization) payload.organization = organization
    if (name) payload.name = name
    const result = await githubRequest(`/repos/${owner}/${repo}/forks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { full_name: result.full_name, url: result.html_url },
      `成功 Fork 仓库: ${result.full_name}`,
      'github_fork_repo'
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

/**
 * GitHub 工具：列出分支
 *
 * 获取仓库的所有分支列表。支持分页。
 *
 * 典型使用场景：
 * - 创建功能分支
 * - 清理已合并分支
 *
 * API: GET /repos/{owner}/{repo}/branches
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.per_page - 每页结果数，默认 30
 * @returns ToolResult，data 字段包含分支数组
 */
export const githubListBranches: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, per_page = 30 } = args
  if (!owner || !repo) {
    return createErrorResult('Missing required parameters', '请提供 owner 和 repo')
  }
  try {
    const branches = await githubRequest(`/repos/${owner}/${repo}/branches?per_page=${per_page}`)
    const items = branches.map((b: any) => ({ name: b.name, protected: b.protected }))
    return createSuccessResult(items, `${owner}/${repo} 的分支 (${items.length} 个)`, 'github_list_branches')
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
 * GitHub 工具：触发工作流
 *
 * 手动触发 GitHub Actions 工作流的执行。需要工作流配置为支持 workflow_dispatch 触发。
 *
 * 典型使用场景：
 * - 查看 CI/CD 状态
 * - 手动触发构建
 *
 * API: POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.workflow_id - 工作流 ID 或文件名
 * @param args.ref - 触发分支，默认 main
 * @param args.inputs - 工作流输入参数对象（可选）
 * @returns ToolResult，确认触发成功
 */
export const githubTriggerWorkflow: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, workflow_id, ref = 'main', inputs } = args
  if (!owner || !repo || !workflow_id) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 workflow_id')
  }
  try {
    const payload: any = { ref }
    if (inputs) payload.inputs = inputs
    await githubRequest(`/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow_id)}/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return createSuccessResult({}, `成功触发工作流: ${workflow_id} (${ref})`, 'github_trigger_workflow')
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
 * GitHub 工具：搜索 Issues / PRs
 *
 * 全局搜索 GitHub Issues 和 Pull Requests。支持在特定仓库内搜索。
 *
 * 典型使用场景：
 * - 发现开源项目
 * - 查找代码示例
 *
 * API: GET /search/issues
 *
 * @param args.query - 搜索关键词，支持 GitHub 搜索语法
 * @param args.per_page - 每页结果数，默认 10
 * @returns ToolResult，data.items 包含匹配的 Issue/PR 列表
 */
export const githubSearchIssues: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, per_page = 10 } = args
  if (!query) {
    return createErrorResult('Missing query', '请提供搜索关键词')
  }
  try {
    const data = await githubRequest(`/search/issues?q=${encodeURIComponent(query)}&per_page=${per_page}`)
    const items = (data.items || []).map((i: any) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      type: i.pull_request ? 'pull_request' : 'issue',
      url: i.html_url,
      repo: i.repository_url?.replace('https://api.github.com/repos/', '')
    }))
    return createSuccessResult(
      { total: data.total_count, items },
      `找到 ${data.total_count} 个 Issues/PRs（显示 ${items.length} 个）`,
      'github_search_issues'
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
 * GitHub 工具：列出 Issue / PR 评论
 *
 * 获取指定 Issue 或 PR 下的所有评论。
 *
 * 典型使用场景：
 * - 获取仓库信息
 * - 管理代码仓库
 *
 * API: GET /repos/{owner}/{repo}/issues/{number}/comments
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - Issue 或 PR 编号
 * @param args.per_page - 每页数量，默认 30
 * @returns ToolResult，data 字段包含评论数组
 */
export const githubListIssueComments: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, per_page = 30 } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=${per_page}`)
    const items = data.map((c: any) => ({
      id: c.id,
      author: c.user?.login,
      body: c.body,
      createdAt: c.created_at
    }))
    return createSuccessResult(
      items,
      `${owner}/${repo} #${number} 的评论 (${items.length} 条)`,
      'github_list_issue_comments'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：获取 PR 变更文件
 *
 * 查看 Pull Request 中修改的文件列表、变更行数和 diff 内容。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: GET /repos/{owner}/{repo}/pulls/{number}/files
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @param args.per_page - 每页数量，默认 100
 * @returns ToolResult，data.files 包含变更文件列表
 */
export const githubGetPullRequestFiles: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, per_page = 100 } = args
  if (!owner || !repo || !number) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo 和 number')
  }
  try {
    const data = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}/files?per_page=${per_page}`)
    const items = data.map((f: any) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      changes: f.changes,
      patch: f.patch
    }))
    const totalAdditions = items.reduce((sum: number, f: any) => sum + f.additions, 0)
    const totalDeletions = items.reduce((sum: number, f: any) => sum + f.deletions, 0)
    return createSuccessResult(
      { files: items, totalAdditions, totalDeletions, fileCount: items.length },
      `PR #${number} 变更文件 (${items.length} 个)，+${totalAdditions}/-${totalDeletions}`,
      'github_get_pull_request_files'
    )
  } catch (error: any) {
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * GitHub 工具：创建 PR Review
 *
 * 对 Pull Request 提交审查意见。支持 APPROVE、REQUEST_CHANGES、COMMENT 三种类型。
 *
 * 典型使用场景：
 * - 审查代码变更
 * - 管理代码合并流程
 *
 * API: POST /repos/{owner}/{repo}/pulls/{number}/reviews
 *
 * @param args.owner - 仓库所有者
 * @param args.repo - 仓库名称
 * @param args.number - PR 编号
 * @param args.event - Review 类型：APPROVE / REQUEST_CHANGES / COMMENT
 * @param args.body - Review 评论内容（REQUEST_CHANGES 和 COMMENT 必填）
 * @returns ToolResult，data 字段包含 Review 信息
 */
export const githubCreatePullRequestReview: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, number, event, body } = args
  if (!owner || !repo || !number || !event) {
    return createErrorResult('Missing required parameters', '请提供 owner、repo、number 和 event')
  }
  if ((event === 'REQUEST_CHANGES' || event === 'COMMENT') && !body) {
    return createErrorResult('Missing body', 'REQUEST_CHANGES 或 COMMENT 类型的 Review 必须提供 body')
  }
  try {
    const payload: any = { event }
    if (body !== undefined) payload.body = body
    const data = await githubRequest(`/repos/${owner}/${repo}/pulls/${number}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return createSuccessResult(
      { id: data.id, state: data.state, html_url: data.html_url },
      `Review 提交成功：${data.state}`,
      'github_create_pull_request_review'
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
