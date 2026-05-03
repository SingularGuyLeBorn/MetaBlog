/**
 * ============================================================================
 * 系统时间工具
 * ============================================================================
 *
 * 获取当前系统时间,包括日期、时间、时间戳等完整信息. 
 * 返回服务器本地时间(北京时间格式). 
 *
 * @module src/theme/tools/system/time
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult } from '@/theme/tools/types'

/**
 * 获取当前时间工具定义
 */
export const getCurrentTimeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'getCurrentTime',
    description: `获取当前系统时间,包括日期、时间、时间戳等完整信息. \n\n【什么时候调用】\n- 用户询问"现在几点"、"当前时间"、"今天日期"等任何时间相关问题\n- 用户要求基于当前时间做判断(如"现在是否在工作时间")\n- 需要给回答加上时间戳或标记"截至今日"等场景\n- 用户说"明天"、"后天"、"上周"等相对时间词时,需要锚定当前日期才能准确计算\n\n【不调用的情况】\n- 用户只是泛泛谈论时间概念(如"时间很宝贵")\n- 历史日期的推算不需要当前时间\n\n【示例用法】\n- getCurrentTime() → { datetime: "2024-01-15T10:30:00.000Z", localString: "2024/1/15 10:30:00", ... }\n\n【注意事项】\n- 本工具无需任何参数,直接调用即可\n- 返回的是服务器本地时间(北京时间)\n- 时间戳单位是毫秒`,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

/**
 * 获取当前系统时间
 *
 * 返回 ISO 格式、本地字符串、时间戳、日期和时间等多种格式,
 * 便于不同场景使用. 
 *
 * @returns 当前时间信息对象
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
    'getCurrentTime'
  )
}
