/**
 * ============================================================================
 * 数学计算工具
 * ============================================================================
 *
 * 执行基础数学计算,支持加减乘除和括号运算. 
 * 出于安全考虑,仅允许数字和基本运算符,使用 Function 构造函数求值. 
 *
 * @module src/theme/tools/system/calculate
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/**
 * 数学计算工具定义
 */
export const calculateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calculate',
    description: `执行基础数学计算,支持加减乘除和括号运算. \n\n【什么时候调用】\n- 用户需要进行精确数值计算(如 "3.14 * 25"、"(100 + 200) / 3")\n- 用户要求验证某个计算结果\n- 用户询问涉及数值推导的问题,且心算容易出错\n\n【不调用的情况】\n- 用户只是闲聊数字概念,不需要精确结果\n- 问题可以通过常识直接回答\n\n【示例用法】\n- calculate(expression="2 + 2 * 3") → 8\n- calculate(expression="(100 - 20) / 4") → 20\n- calculate(expression="3.14159 * 10") → 31.4159\n\n【注意事项】\n- 仅支持 + - * / ( ) 和数字、小数点,不支持函数(如 sin、sqrt、log)\n- 不支持单位换算,如 "1km = ?m" 这类请直接回答\n- 表达式过长(超过500字符)可能导致解析失败`,
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式字符串. 格式：仅支持数字、+ - * / ( ) 和小数点. 示例："2 + 2 * 3"、"(100 - 20) / 4"、"3.14159 * 10". 不支持变量、函数或单位换算. '
        }
      },
      required: ['expression']
    }
  }
}

/**
 * 数学计算执行器
 *
 * 安全计算：先过滤非法字符,只允许数字和基本运算符,
 * 再通过 Function 构造函数求值. 避免 eval 的安全风险. 
 *
 * @param args - 包含 expression 参数
 * @returns 计算结果
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
      '请检查表达式格式,例如: (1 + 2) * 3'
    )
  }
}
