/**
 * 系统工具定义 — calculate
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const calculateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calculate',
    description: '执行数学计算。当用户需要复杂计算、数学公式求解或单位转换时使用。支持 + - * / ( ) 运算符。',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，例如 "2 + 2 * 3" 或 "(100 - 20) / 4"'
        }
      },
      required: ['expression']
    }
  }
}

/**
 * 数学计算工具
 */
export const calculate: ToolExecutor = async (args): Promise<ToolResult> => {
  const { expression } = args
  
  if (!expression) {
    return createErrorResult(
      'Missing expression parameter',
      '请提供数学表达式',
      '示例: calculate(expression="2 + 2 * 3")'
    )
  }
  
  try {
    // 安全计算：只允许数字和基本运算符
    const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '')
    if (sanitized !== expression) {
      return createErrorResult(
        'Invalid characters in expression',
        '表达式包含非法字符',
        '只允许数字和 + - * / ( ) . 运算符'
      )
    }
    
    // eslint-disable-next-line no-new-func
    const result = new Function('return ' + sanitized)()
    
    return createSuccessResult(
      {
        expression,
        result,
        type: typeof result
      },
      `计算结果: ${result}`,
      'calculate'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '计算错误',
      '请检查表达式格式，例如: (1 + 2) * 3'
    )
  }
}
