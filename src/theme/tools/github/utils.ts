/**
 * ============================================================================
 * GitHub 工具共享辅助函数
 * ============================================================================
 *
 * 业务逻辑已下沉到后端 `server/utils/github-tool-executor.ts`. 
 * 前端只保留最薄的调用层,包括 BFF 代理请求、通用 REST 封装、
 * 编码辅助函数等. 
 *
 * @module src/theme/tools/github/utils
 */

import type { ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/** GitHub BFF 代理地址 */
export const GITHUB_API_BASE = '/api/github'

/**
 * 调用后端 GitHub 工具执行端点
 *
 * 后端负责：参数校验、GitHub API 调用、结果格式化、错误翻译
 * 前端只负责：传参、接收统一格式的结果
 *
 * @param toolName - 工具名称(对应后端路由)
 * @param params - 工具参数
 * @returns 标准化的 ToolResult
 */
export async function callGitHubTool(toolName: string, params: Record<string, any>): Promise<ToolResult> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: toolName, params })
    })

    // 防御：后端可能返回空响应或非 JSON(如 502 网关错误)
    const contentType = response.headers.get('content-type') || ''
    let result: any
    if (contentType.includes('application/json')) {
      result = await response.json()
    } else {
      const text = await response.text().catch(() => '')
      return createErrorResult(
        `Non-JSON response (${response.status}): ${text.slice(0, 200)}`,
        '后端返回格式异常',
        '请检查网络或联系管理员',
        response.status
      )
    }

    if (!result.success) {
      return createErrorResult(
        result.error || result.message || 'Unknown error',
        result.message || '请求失败',
        result.suggestion || '请检查参数或稍后重试',
        result.code
      )
    }

    return createSuccessResult(result.data, result.display, toolName, undefined, result.code)
  } catch (error: any) {
    return createErrorResult(
      error.message,
      'GitHub 工具调用失败',
      '请检查网络连接或稍后重试'
    )
  }
}

/**
 * GitHub REST API 通用请求封装
 *
 * 用于未被后端显式路由覆盖的端点,直接走 BFF 透明代理. 
 * 大部分工具应优先使用 callGitHubTool(). 
 *
 * @param endpoint - API 端点路径(如 "/repos/owner/repo")
 * @param options - fetch 选项
 * @returns 解析后的 JSON 数据
 * @throws 请求失败时抛出错误
 */
export async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${GITHUB_API_BASE}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`GitHub API ${response.status}: ${text}`)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {}
  }

  return response.json()
}

/**
 * 编码 GitHub ref 路径中的分支名/标签名
 *
 * 保留 / 作为路径分隔符,但编码每个 segment 中的特殊字符. 
 * GitHub API 要求 ref 中的特殊字符(如 #、空格)需要编码,
 * 但路径中的 / 不能编码. 
 *
 * @param ref - 分支名或标签名
 * @returns 编码后的路径段
 */
export function encodeRefPath(ref: string): string {
  return ref.split('/').map(encodeURIComponent).join('/')
}

/**
 * Base64 编码辅助函数(前端极少使用,保留供特殊场景)
 *
 * 优先使用浏览器的 btoa,兼容性不好时回退到 Buffer. 
 * 支持 Unicode 字符的 Base64 编码. 
 *
 * @param str - 原始字符串
 * @returns Base64 编码后的字符串
 * @throws 编码不可用时抛出错误
 */
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

/**
 * Base64 解码辅助函数(前端极少使用,保留供特殊场景)
 *
 * 优先使用浏览器的 atob,兼容性不好时回退到 Buffer. 
 * 支持 Unicode 字符的 Base64 解码. 
 *
 * @param str - Base64 编码的字符串
 * @returns 解码后的原始字符串
 * @throws 解码不可用时抛出错误
 */
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
