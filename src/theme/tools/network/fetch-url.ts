/**
 * URL 获取工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api'

export const fetchUrlDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetchUrl',
    description: `获取指定 URL 的网页内容。支持静态网页、API 接口、JSON 数据等。

使用场景：
1. 获取网页内容进行摘要分析
2. 调用 REST API 获取数据
3. 获取原始代码文件内容
4. 获取文档、博客、新闻等内容

支持自动内容类型识别：HTML、JSON、纯文本等。`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要获取的 URL，支持 http/https。例如：https://api.github.com/users/octocat'
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
          description: '请求超时时间（毫秒），默认 10000（10秒）',
          default: 10000
        },
        max_length: {
          type: 'number',
          description: '返回内容最大长度（字符），默认 200000',
          default: 200000
        }
      },
      required: ['url']
    }
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
    max_length = 200000
  } = args

  if (!url) {
    return createErrorResult(
      'Missing url parameter',
      '请提供 URL',
      '示例: fetchUrl(url="https://api.github.com/users/octocat")'
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

  // 检测是否是需要 Jina Reader 的反爬虫平台
  const isAntiCrawlPlatform = /zhihu\.com|zhuanlan\.zhihu\.com|mp\.weixin\.qq\.com|juejin\.cn|csdn\.net/.test(url)

  let rawContent = ''
  let contentType = ''
  let usedJinaReader = false

  // 【反爬虫平台】优先使用 Jina Reader API（免费，知乎/微信等支持良好）
  if (isAntiCrawlPlatform) {
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(timeout)
      })
      if (jinaRes.ok) {
        rawContent = await jinaRes.text()
        contentType = 'text/markdown'
        usedJinaReader = true
      }
    } catch {
      // Jina Reader 失败则继续走 proxy/fetch
    }
  }

  // 非反爬虫平台，或 Jina Reader 失败时，走 proxy/fetch
  if (!usedJinaReader) {
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
      // proxy/fetch 返回 403 时，尝试 Jina Reader 作为兜底
      if (response.status === 403) {
        try {
          const jinaRes = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
            signal: AbortSignal.timeout(timeout)
          })
          if (jinaRes.ok) {
            rawContent = await jinaRes.text()
            contentType = 'text/markdown'
            usedJinaReader = true
          }
        } catch {
          // Jina Reader 也失败
        }
      }

      if (!usedJinaReader) {
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
    } else {
      contentType = response.headers.get('content-type') || ''
      rawContent = await response.text()
    }
  }

  // 根据内容类型处理
  let processedContent = rawContent
  let parsedByPlatform = false
  let parsedTitle = ''
  let parsedAuthor = ''

  if (usedJinaReader) {
    // Jina Reader 返回的就是 Markdown 格式，直接解析
    const lines = rawContent.split('\n')
    parsedTitle = lines[0]?.replace(/^Title:\s*/, '') || ''
    processedContent = lines.slice(1).join('\n').trim()
  } else if (contentType.includes('application/json')) {
    try {
      const jsonData = JSON.parse(rawContent)
      processedContent = JSON.stringify(jsonData, null, 2)
    } catch {
      // 保持原样
    }
  } else if (contentType.includes('text/html')) {
    // 【优化】HTML 内容优先走 platform-parser 进行精炼解析
    // platform-parser 针对各平台（微信公众号、知乎、B站等）有专门解析逻辑，
    // 能提取正文、去除广告导航页脚等噪声，比简单去标签节省大量 token
    try {
      const platformRes = await fetch(`${API_BASE}/platform/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (platformRes.ok) {
        const platformData = await platformRes.json()
        if (platformData.success && platformData.data?.content) {
          parsedByPlatform = true
          parsedTitle = platformData.data.title || ''
          parsedAuthor = platformData.data.author || ''
          // 组合成 Markdown 格式，更省 token 且结构清晰
          const parts: string[] = []
          if (parsedTitle) parts.push(`# ${parsedTitle}`)
          if (parsedAuthor) parts.push(`> 作者: ${parsedAuthor}`)
          parts.push(platformData.data.content)
          processedContent = parts.join('\n\n')
        }
      }
    } catch {
      // platform-parser 失败则 fallback 到简单处理
    }

    // Fallback: 简单去标签（platform-parser 失败或未命中平台时）
    if (!parsedByPlatform) {
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
  }

    // 截断内容 — 截断时提示 AI 可以调大 max_length 重新获取
    const isTruncated = processedContent.length > max_length
    const displayContent = isTruncated
      ? processedContent.substring(0, max_length) +
        `\n\n---` +
        `\n[内容已截断] 原始内容共 ${rawContent.length} 字符，当前限制 ${max_length} 字符。` +
        `\n如需获取更多内容，可重新调用 fetchUrl(url="${url}", max_length=${max_length * 2})`
      : processedContent

    return createSuccessResult(
      {
        url,
        method: httpMethod,
        contentType,
        size: rawContent.length,
        content: displayContent,
        truncated: isTruncated,
        parsedByPlatform,
        usedJinaReader,
        title: parsedTitle || undefined,
        author: parsedAuthor || undefined
      },
      `请求成功 (${rawContent.length} 字符${usedJinaReader ? '，由 Jina Reader 解析为 Markdown' : parsedByPlatform ? '，已由 platform-parser 精炼' : ''}${isTruncated ? '，已截断至 ' + max_length : ''})`,
      'fetchUrl'
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
