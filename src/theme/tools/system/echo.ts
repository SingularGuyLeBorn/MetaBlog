/**
 * 系统工具定义 — test_echo
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const testEchoDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'test_echo',
    description: '【测试专用】回声工具，验证工具调用是否正常工作。当用户说"测试工具"时使用。',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '要回显的消息内容'
        },
        repeat_count: {
          type: 'number',
          description: '重复次数，默认1次',
          default: 1
        }
      },
      required: ['message']
    }
  }
}

/**
 * 测试回声工具
 */
export const testEcho: ToolExecutor = async (args): Promise<ToolResult> => {
  const { message, repeat_count = 1 } = args
  
  if (!message) {
    return createErrorResult(
      'Missing message parameter',
      '请提供消息内容',
      '示例: test_echo(message="Hello", repeat_count=3)'
    )
  }
  
  const result = Array(repeat_count).fill(message).join('\n')
  
  return createSuccessResult(
    result,
    `回声测试: ${message}`,
    'test_echo'
  )
}
