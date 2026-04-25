/**
 * 网络搜索工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { searchWeb } from './search'

export const webSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'webSearch',
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

/**
 * 网络搜索
 */
export const webSearch: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, num_results = 5 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: webSearch(query="VitePress 教程")'
    )
  }

  try {
    const { results, formatted } = await searchWeb({ query, num_results })
    return createSuccessResult(results, formatted, 'webSearch')
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
