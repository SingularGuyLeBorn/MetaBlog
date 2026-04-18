/**
 * 网络工具执行器
 * 薄层封装，具体逻辑在子模块中实现
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { searchWeb } from './search'

const API_BASE = '/api'

/**
 * 网络搜索
 */
export const webSearch: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, num_results = 5 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: web_search(query="VitePress 教程")'
    )
  }

  try {
    const { results, formatted } = await searchWeb({ query, num_results })
    return createSuccessResult(results, formatted, 'web_search')
  } catch (error: any) {
    if (error.message === 'No search results found') {
      return createErrorResult(
        'No search results found',
        '未找到搜索结果',
        '建议更换关键词或检查网络连接'
      )
    }
    return createErrorResult(
      error.message,
      '搜索出错',
      '请检查网络连接或稍后重试'
    )
  }
}

/**
 * 获取 URL 内容
 */
export const fetchUrl: ToolExecutor = async (args): Promise<ToolResult> => {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    timeout = 10000,
    max_length = 15000
  } = args

  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供 URL',
      '示例: fetch_url(url="https://api.github.com/users/octocat")'
    )
  }

  // 验证 URL 格式
  try {
    new URL(url)
  } catch {
    return createErrorResult(
      'Invalid URL format',
      `无效的 URL 格式: ${url}`,
      '请提供完整的 URL，如 https://example.com'
    )
  }

  // 验证 HTTP 方法
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  const httpMethod = method.toUpperCase()
  if (!validMethods.includes(httpMethod)) {
    return createErrorResult(
      'Invalid HTTP method',
      `不支持的 HTTP 方法: ${method}`,
      `支持的方法: ${validMethods.join(', ')}`
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method: httpMethod,
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
        timeout
      })
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 404) {
        return createErrorResult(
          'Resource not found (404)',
          '资源未找到',
          '请检查 URL 是否正确'
        )
      }
      if (response.status === 401 || response.status === 403) {
        return createErrorResult(
          `Access denied (${response.status})`,
          '访问被拒绝',
          '可能需要身份验证或权限不足'
        )
      }
      return createErrorResult(
        `HTTP ${response.status}`,
        '请求失败',
        '请检查请求参数或稍后重试'
      )
    }

    const contentType = response.headers.get('content-type') || ''
    const rawContent = await response.text()

    // 根据内容类型处理
    let processedContent = rawContent

    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(rawContent)
        processedContent = JSON.stringify(jsonData, null, 2)
      } catch {
        // 保持原样
      }
    } else if (contentType.includes('text/html')) {
      // 提取文本内容（去除 HTML 标签）
      processedContent = rawContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // 截断内容 — 截断时提示 AI 可以调大 max_length 重新获取
    const isTruncated = processedContent.length > max_length
    const displayContent = isTruncated
      ? processedContent.substring(0, max_length) +
        `\n\n---` +
        `\n[内容已截断] 原始内容共 ${rawContent.length} 字符，当前限制 ${max_length} 字符。` +
        `\n如需获取更多内容，可重新调用 fetch_url(url="${url}", max_length=${Math.min(max_length * 2, 50000)})`
      : processedContent

    return createSuccessResult(
      {
        url,
        method: httpMethod,
        contentType,
        size: rawContent.length,
        content: displayContent,
        truncated: isTruncated
      },
      `请求成功 (${rawContent.length} 字符${isTruncated ? '，已截断至 ' + max_length : ''})`,
      'fetch_url'
    )
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return createErrorResult(
        'Request timeout',
        `请求超时 (${timeout}ms)`,
        '建议增加 timeout 参数或检查网络连接'
      )
    }
    return createErrorResult(
      error.message,
      '请求失败',
      '请检查 URL 和网络连接'
    )
  }
}
