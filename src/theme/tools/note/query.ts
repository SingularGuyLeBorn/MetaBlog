/**
 * ============================================================================
 * 知识库查询工具
 * ============================================================================
 *
 * 提供查询本地知识库信息的能力,当前为占位实现. 
 * 实际知识检索建议使用 searchArticles 搜索本地文章. 
 *
 * @module src/theme/tools/note/query
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/**
 * 查询知识库工具定义
 */
export const queryKnowledgeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'queryKnowledge',
    description: '查询知识库中的信息. 当用户询问项目知识、技术文档或概念解释时使用. ',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询词. 要求：具体、明确的关键词或短语,描述用户想了解的内容. 示例："Docker 部署配置"、"前端路由配置方式"、"用户认证流程"'
        }
      },
      required: ['query']
    }
  }
}

/**
 * 查询知识(搜索本地文章)
 *
 * 当前为占位实现,返回提示建议使用 searchArticles 工具. 
 *
 * @param args - 包含 query 参数
 * @returns 查询结果占位
 */
export const queryKnowledge: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供查询内容',
      '示例: queryKnowledge(query="Docker 使用方法")'
    )
  }

  // 搜索本地文章作为知识库
  return createSuccessResult(
    { query },
    `知识库查询: ${query}`,
    'queryKnowledge',
    '建议使用 searchArticles 搜索本地文章'
  )
}
