/**
 * ============================================================================
 * 语雀(Yuque)搜索操作工具
 * ============================================================================
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有提供搜索端点. 
 * 如需查找文档,请使用 yuqueRepoList + yuqueTocGet 浏览目录. 
 *
 * @module src/theme/tools/yuque/search
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult } from '@/theme/tools/types'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 搜索语雀的工具定义
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有提供搜索端点. 
 * 如需查找文档,请使用 yuqueRepoList + yuqueTocGet 浏览目录. 
 */
export const yuqueSearchDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueSearch',
    description: `【⚠️ 当前不可用】在语雀中搜索文档或知识库. 

【使用场景】
- 本工具暂不可用,请勿调用
- 如需查找文档,请改用 yuqueRepoList + yuqueTocGet 的组合

【替代方案】
1. 调用 yuqueRepoList() 获取所有知识库列表
2. 选择目标知识库的 repo_id
3. 调用 yuqueTocGet(repo_id="xxx") 浏览该知识库的目录结构`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词(当前不可用,调用会返回错误提示)',
        },
        type: {
          type: 'string',
          enum: ['doc', 'repo'],
          description: '搜索类型(当前不可用). doc=搜索文档, repo=搜索知识库',
          default: 'doc',
        },
      },
      required: ['query'],
    },
  },
}

/**
 * 搜索语雀
 *
 * 【⚠️ 当前不可用】
 * 语雀内部 Web API 没有搜索端点,直接返回友好提示. 
 *
 * @param args - 包含 query 参数
 * @returns 错误提示,建议替代方案
 */
export const yuqueSearch = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query } = args

  if (!query) {
    return createErrorResult('Missing query', '缺少搜索关键词')
  }

  return createErrorResult(
    '语雀内部 Web API 不支持搜索功能',
    '搜索不可用',
    '请使用 yuqueRepoList 获取知识库列表,然后用 yuqueTocGet 浏览目录'
  )
}
