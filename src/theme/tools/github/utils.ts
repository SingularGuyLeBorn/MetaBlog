/**
 * ============================================================================
 * GitHub 工具共享辅助函数
 * ============================================================================
 */

import { createErrorResult } from '@/theme/tools/types'

/** GitHub REST API 根地址 */
export const GITHUB_API_BASE = 'https://api.github.com'

/**
 * 从环境变量获取 GitHub Personal Access Token
 *
 * Vite 构建时会将 .env 中的 VITE_GITHUB_TOKEN 注入到 import.meta.env 中。
 * 如果 Token 未配置，未认证请求将受到每小时 60 次的严格速率限制。
 *
 * @returns GitHub Token 字符串，未配置时返回空字符串
 */
export function getGitHubToken(): string {
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
export function translateGitHubError(errorMsg: string): { message: string; suggestion: string } {
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
export async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
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
 * 编码 GitHub ref 路径中的分支名/标签名
 * 保留 / 作为路径分隔符，但编码每个 segment 中的特殊字符
 */
export function encodeRefPath(ref: string): string {
  return ref.split('/').map(encodeURIComponent).join('/')
}

/** Base64 编码辅助函数（支持 Unicode，兼容浏览器和 Node） */
export function encodeBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
  } catch {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64')
    }
    throw new Error('Base64 encoding not available')
  }
}

/** Base64 解码辅助函数（兼容浏览器和 Node） */
export function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
  } catch {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8')
    }
    throw new Error('Base64 decoding not available')
  }
}
