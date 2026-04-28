/**
 * 笔记工具定义 — queryKnowledge
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

export const queryKnowledgeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'queryKnowledge',
    description: '查询知识库中的信息。当用户询问项目知识、技术文档或概念解释时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '查询内容'
        }
      },
      required: ['query']
    }
  }
}

/**
 * 查询知识(搜索本地文章)
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
