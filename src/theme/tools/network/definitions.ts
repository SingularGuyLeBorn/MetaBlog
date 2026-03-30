/**
 * 网络工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const webSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '执行网络搜索获取最新信息。当用户询问时事、需要最新数据或查询不在知识库中的信息时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        num_results: {
          type: 'number',
          description: '返回结果数量，默认 5',
          default: 5
        }
      },
      required: ['query']
    }
  }
}

export const fetchUrlDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_url',
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
          description: '返回内容最大长度（字符），默认 15000',
          default: 15000
        }
      },
      required: ['url']
    }
  }
}
