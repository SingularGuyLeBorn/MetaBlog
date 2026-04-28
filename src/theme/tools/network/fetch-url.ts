/**
 * URL 获取工具
 *
 * 对齐后端架构：
 * - 简单网页获取 → POST /api/platform/parse（后端统一处理获取+解析）
 * - API/自定义请求 → POST /api/proxy/fetch（通用 HTTP 代理）
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

const API_BASE = '/api'

export const fetchUrlDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetchUrl',
    description: `获取指定 URL 的内容。支持网页文章（自动解析为 Markdown）、API 接口、JSON 数据等。

使用场景：
1. 获取网页/文章/博客内容（自动转为 Markdown）
2. 调用 REST API 获取数据
3. 获取原始代码文件内容

注意：
- 简单 GET 请求会自动走后端平台解析器（支持知乎、微信、小红书等反爬平台）
- 如需自定义请求头或 POST/PUT 等操作，会自动走通用代理`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要获取的 URL，支持 http/https。例如：https://zhuanlan.zhihu.com/p/xxx'
        },
        method: {
          type: 'string',
          description: 'HTTP 方法：GET、POST、PUT、DELETE 等，默认 GET',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'GET'
        },
        headers: {
          type: 'object',
          description: '可选：自定义 HTTP 请求头，如 {"Authorization": "Bearer token"}'
        },
        body: {
          type: 'string',
          description: '可选：请求体内容，用于 POST/PUT/PATCH 请求'
        },
        timeout: {
          type: 'number',
          description: '请求超时时间(毫秒)，默认 15000(15秒)，反爬平台可能需要更长',
          default: 15000
        },
        max_length: {
          type: 'number',
          description: '返回内容最大长度(字符)，默认 200000',
          default: 200000
        },
        options: {
          type: 'object',
          description: '解析选项。例如知乎问题页面可设置 { maxAnswers: 3 } 提取多个回答',
          properties: {
            maxAnswers: {
              type: 'number',
              description: '知乎问题页面：最多提取几个回答，默认 1',
              default: 1
            }
          }
        }
      },
      required: ['url']
    }
  }
}

/**
 * 判断是否为 API 调用（需要走通用代理而非平台解析器）
 */
function isApiCall(method: string, body?: string, headers?: Record<string, any>): boolean {
  return method !== 'GET' || !!body || !!(headers && Object.keys(headers).length > 0)
}

/**
 * 截断内容
 */
function truncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '\n\n[内容已截断，原始长度 ' + content.length + ' 字符]'
}

/**
 * 从 Markdown 内容中提取图片链接
 */
function extractImages(content: string): string[] {
  const images: string[] = []
  const regex = /!\[.*?\]\((.*?)\)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    images.push(match[1])
  }
  return images
}

/**
 * 处理 proxy/fetch 的响应
 */
async function handleProxyResponse(
  response: Response,
  url: string,
  maxLength: number
): Promise<ToolResult> {
  const contentType = response.headers.get('content-type') || ''
  const rawContent = await response.text()

  let processedContent = rawContent

  if (contentType.includes('application/json')) {
    try {
      const json = JSON.parse(rawContent)
      processedContent = JSON.stringify(json, null, 2)
    } catch {
      processedContent = rawContent
    }
  } else if (contentType.includes('text/html')) {
    // 简单去标签
    processedContent = rawContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const isTruncated = processedContent.length > maxLength
  const finalContent = truncate(processedContent, maxLength)

  return createSuccessResult(
    finalContent,
    `请求成功 (${rawContent.length} 字符，Content-Type: ${contentType})`,
    'fetchUrl'
  )
}

/**
 * 通用代理请求
 */
async function proxyFetch(
  url: string,
  method: string,
  headers: Record<string, any>,
  body: string | undefined,
  timeout: number,
  maxLength: number
): Promise<ToolResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${API_BASE}/proxy/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method, headers, body, timeout }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createErrorResult(
        `HTTP ${response.status}`,
        errorData.message || `请求失败 (${response.status})`,
        errorData.suggestion || '请检查 URL 或稍后重试'
      )
    }

    return handleProxyResponse(response, url, maxLength)
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      return createErrorResult(
        'Request timeout',
        `请求超时 (${timeout}ms)`,
        '建议增加 timeout 参数或检查网络连接'
      )
    }
    return createErrorResult(
      'Network error',
      `网络请求失败: ${error.message}`,
      '请检查网络连接或 URL 是否正确'
    )
  }
}

/**
 * 平台解析器请求（网页 → Markdown）
 */
async function platformParse(
  url: string,
  timeout: number,
  maxLength: number,
  options?: Record<string, any>
): Promise<ToolResult | null> {
  try {
    const response = await fetch(`${API_BASE}/platform/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeout, options }),
      signal: AbortSignal.timeout(timeout + 5000)
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.success || !data.data) return null

    const { title, author, content, images } = data.data
    if (!content) return null

    const parts: string[] = []
    if (title) parts.push(`# ${title}`)
    if (author) parts.push(`> 作者: ${author}`)
    parts.push(content)

    // 追加未嵌入内容的图片
    if (images && images.length > 0) {
      const embedded = content
      const extraImages = images.filter((img: string) => !embedded.includes(img))
      if (extraImages.length > 0) {
        parts.push('---')
        parts.push('**图片:**')
        extraImages.forEach((img: string) => parts.push(`![](${img})`))
      }
    }

    const fullContent = parts.join('\n\n')
    const isTruncated = fullContent.length > maxLength
    const finalContent = truncate(fullContent, maxLength)

    return createSuccessResult(
      finalContent,
      `解析成功 (${content.length} 字符${isTruncated ? '，已截断' : ''})`,
      'fetchUrl'
    )
  } catch {
    return null
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
    timeout = 15000,
    max_length = 200000,
    options
  } = args

  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供 URL',
      '示例: fetchUrl(url="https://example.com")'
    )
  }

  try {
    new URL(url)
  } catch {
    return createErrorResult(
      'Invalid URL format',
      `无效的 URL 格式: ${url}`,
      '请提供完整的 URL，如 https://example.com'
    )
  }

  const httpMethod = method.toUpperCase()
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  if (!validMethods.includes(httpMethod)) {
    return createErrorResult(
      'Invalid HTTP method',
      `不支持的 HTTP 方法: ${method}`,
      `支持的方法: ${validMethods.join(', ')}`
    )
  }

  // ===== 路由判断 =====
  // API 调用（自定义 method/headers/body）→ 通用代理
  // 简单网页获取 → 平台解析器（后端统一处理反爬、解析、Markdown 转换）

  if (isApiCall(httpMethod, body, headers)) {
    // 通用代理分支
    return proxyFetch(url, httpMethod, headers, body, timeout, max_length)
  }

  // 网页获取分支：先走平台解析器
  const platformResult = await platformParse(url, timeout, max_length, options)
  if (platformResult) {
    return platformResult
  }

  // 平台解析器失败 → proxy/fetch 兜底
  const proxyResult = await proxyFetch(url, 'GET', {}, undefined, timeout, max_length)
  return proxyResult
}
