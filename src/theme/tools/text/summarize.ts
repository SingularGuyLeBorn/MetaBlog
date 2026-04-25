/**
 * 文本摘要工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const summarizeTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'summarize_text',
    description: '对给定文本生成简短摘要。当用户要求"总结"、"摘要"、"概括"或文本过长需要精简时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '需要摘要的原始文本'
        },
        max_length: {
          type: 'number',
          description: '摘要最大长度（字符数），默认200',
          default: 200
        }
      },
      required: ['text']
    }
  }
}

/**
 * 文本摘要
 */
export const summarizeText: ToolExecutor = async (args): Promise<ToolResult> => {
  const { text, max_length = 200 } = args
  
  if (!text) {
    return createErrorResult(
      'Missing text parameter',
      '请提供文本内容',
      '示例: summarize_text(text="长文本内容...", max_length=200)'
    )
  }
  
  // 简单的文本摘要（取前 max_length 个字符）
  const summary = text.length <= max_length 
    ? text 
    : text.substring(0, max_length) + '...'
  
  return createSuccessResult(
    {
      originalLength: text.length,
      summaryLength: Math.min(text.length, max_length),
      summary
    },
    `摘要完成 (${Math.min(text.length, max_length)}/${text.length} 字符)`,
    'summarize_text'
  )
}
