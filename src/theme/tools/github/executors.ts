/**
 * GitHub 工具执行器
 * 包含：仓库查询、代码搜索、提交历史等功能
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const GITHUB_API_BASE = 'https://api.github.com'

function getGitHubToken(): string {
  try {
    return (import.meta as any).env?.VITE_GITHUB_TOKEN || ''
  } catch {
    return ''
  }
}

/**
 * GitHub 错误码翻译
 */
function translateGitHubError(errorMsg: string): { message: string; suggestion: string } {
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

  return { message: errorMsg, suggestion: '请检查参数或稍后重试' }
}

/**
 * GitHub API 请求封装
 */
async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${GITHUB_API_BASE}${endpoint}`
  const token = getGitHubToken()
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MetaBlog-AI-Chat',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`GitHub API ${response.status}: ${text}`)
  }
  
  return response.json()
}

/**
 * 获取 GitHub 仓库信息
 */
export const githubGetRepo: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo } = args
  
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_get_repo(owner="facebook", repo="react")'
    )
  }
  
  try {
    const repoData = await githubRequest(`/repos/${owner}/${repo}`)
    
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
    const translated = translateGitHubError(error.message)
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}

/**
 * 列出 GitHub 仓库内容
 */
export const githubListRepoContents: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path = '', ref } = args
  
  if (!owner || !repo) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner 和 repo',
      '示例: github_list_repo_contents(owner="facebook", repo="react", path="src")'
    )
  }
  
  try {
    let endpoint = `/repos/${owner}/${repo}/contents/${path}`
    if (ref) {
      endpoint += `?ref=${encodeURIComponent(ref)}`
    }
    
    const contents = await githubRequest(endpoint)
    
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
 * 获取 GitHub 文件内容
 */
export const githubGetFileContent: ToolExecutor = async (args): Promise<ToolResult> => {
  const { owner, repo, path, ref, max_length = 5000 } = args
  
  if (!owner || !repo || !path) {
    return createErrorResult(
      'Missing required parameters',
      '请提供 owner、repo 和 path',
      '示例: github_get_file_content(owner="facebook", repo="react", path="README.md")'
    )
  }
  
  try {
    let endpoint = `/repos/${owner}/${repo}/contents/${path}`
    if (ref) {
      endpoint += `?ref=${encodeURIComponent(ref)}`
    }
    
    const data = await githubRequest(endpoint)
    
    if (!data.content) {
      return createErrorResult(
        'No content',
        '无法获取文件内容',
        '该文件可能是目录或没有内容'
      )
    }
    
    const rawContent = atob(data.content)
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
 * 搜索 GitHub 代码
 */
export const githubSearchCode: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, language, limit = 5 } = args
  
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: github_search_code(query="useState hook")'
    )
  }
  
  try {
    let searchQuery = encodeURIComponent(query)
    if (language) {
      searchQuery += `+language:${language}`
    }
    
    const data = await githubRequest(`/search/code?q=${searchQuery}&per_page=${limit}`)
    
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
 * 获取 GitHub 提交历史
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
 * 获取 GitHub Issues
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
    
    const items = issues.map((issue: any) => ({
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
 * 获取 GitHub Pull Requests
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
 * 获取单个 GitHub Pull Request 详情
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
 * 创建 GitHub Issue
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
    if (body) payload.body = body
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
 * 列出 GitHub Actions 工作流
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
 * 列出 GitHub Actions 运行记录
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
