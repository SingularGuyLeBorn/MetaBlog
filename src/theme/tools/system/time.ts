/**
 * 系统工具定义 — get_current_time
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult } from '@/theme/tools/types'

export const getCurrentTimeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: '获取当前系统时间。当用户询问"现在几点"、"当前时间"、"今天日期"等时间相关问题时，必须调用此工具获取准确时间。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

/**
 * 获取当前时间
 */
export const getCurrentTime: ToolExecutor = async (): Promise<ToolResult> => {
  const now = new Date()
  return createSuccessResult(
    {
      datetime: now.toISOString(),
      localString: now.toLocaleString('zh-CN'),
      timestamp: now.getTime(),
      date: now.toLocaleDateString('zh-CN'),
      time: now.toLocaleTimeString('zh-CN')
    },
    `当前时间: ${now.toLocaleString('zh-CN')}`,
    'get_current_time'
  )
}
