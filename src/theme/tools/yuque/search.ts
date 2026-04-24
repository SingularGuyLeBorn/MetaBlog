/**
 * =============================================================================
 * 语雀 (Yuque) 搜索操作
 * =============================================================================
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有提供搜索端点。
 * 如需查找文档，请使用 yuque_repo_list + yuque_toc_get 浏览目录。
 * =============================================================================
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult } from '@/theme/tools/types'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 工具：搜索语雀
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有提供搜索端点。
 * 如需查找文档，请使用 yuque_repo_list + yuque_toc_get 浏览目录。
 */
export const yuqueSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_search',
    description: `【⚠️ 当前不可用】在语雀中搜索文档或知识库。

语雀内部 Web API 不支持搜索功能。
如需查找文档，请使用 yuque_repo_list 获取知识库列表，
然后用 yuque_toc_get 浏览目录。`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
        type: {
          type: 'string',
          enum: ['doc', 'repo'],
          description: '搜索类型: doc=文档, repo=知识库',
          default: 'doc',
        },
      },
      required: ['query'],
    },
  },
}

/**
 * 执行器：搜索语雀
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有搜索端点，直接返回友好提示。
 */
export const yuqueSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query } = args

  if (!query) {
    return createErrorResult('Missing query', '缺少搜索关键词')
  }

  return createErrorResult(
    '语雀内部 Web API 不支持搜索功能',
    '搜索不可用',
    '请使用 yuque_repo_list 获取知识库列表，然后用 yuque_toc_get 浏览目录'
  )
}
