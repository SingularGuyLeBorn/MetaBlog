/**
 * 系统工具定义 — getWeather
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult } from '@/theme/tools/types'

export const getWeatherDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'getWeather',
    description: '获取指定城市的天气信息。当用户询问天气、出行建议或需要了解气候条件时使用。',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，如 "北京"、"上海"、"New York"'
        },
        days: {
          type: 'number',
          description: '预报天数，默认 3 天',
          default: 3
        }
      },
      required: ['city']
    }
  }
}

/**
 * 获取天气
 */
export const getWeather: ToolExecutor = async (args): Promise<ToolResult> => {
  const { city, days = 3 } = args
  
  if (!city) {
    return createErrorResult(
      'Missing city parameter',
      '请提供城市名称',
      '示例: getWeather(city="北京", days=3)'
    )
  }
  
  // 当前未接入真实天气 API
  return createErrorResult(
    'Weather API not configured',
    '天气查询需要配置天气 API',
    '建议配置和风天气(https://dev.qweather.com)或心知天气 API'
  )
}
