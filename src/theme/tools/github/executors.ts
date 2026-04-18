/**
 * GitHub 工具执行器
 * 包含：仓库查询、代码搜索、提交历史等功能
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const GITHUB_API_BASE = 'https://api.github.com'

/**
 * GitHub API 请求封装
 */
async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${GITHUB_API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'MetaBlog-AI-Chat',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}`)
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
    if (error.message.includes('404')) {
      return createErrorResult(
        'Repository not found',
        '仓库不存在',
        '请检查 owner 和 repo 参数'
      )
    }
    if (error.message.includes('403')) {
      return createErrorResult(
        'Rate limit exceeded',
        'GitHub API 速率限制',
        '请稍后再试（未认证请求每小时 60 次限制）'
      )
    }
    return createErrorResult(
      error.message,
      '获取仓库信息失败',
      '请稍后重试'
    )
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
    return createErrorResult(
      error.message,
      '获取仓库内容失败',
      '请检查参数或稍后重试'
    )
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
    return createErrorResult(
      error.message,
      '获取文件内容失败',
      '请检查路径或稍后重试'
    )
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
    return createErrorResult(
      error.message,
      '搜索代码失败',
      '请稍后重试'
    )
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
    return createErrorResult(
      error.message,
      '获取提交历史失败',
      '请稍后重试'
    )
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
    return createErrorResult(
      error.message,
      '获取 Issues 失败',
      '请稍后重试'
    )
  }
}
