/**
 * 系统工具执行器
 * 包含：时间、计算、天气等系统级功能
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

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

/**
 * 获取天气
 */
export const getWeather: ToolExecutor = async (args): Promise<ToolResult> => {
  const { city, days = 3 } = args
  
  if (!city) {
    return createErrorResult(
      'Missing city parameter',
      '请提供城市名称',
      '示例: get_weather(city="北京", days=3)'
    )
  }
  
  // 当前未接入真实天气 API
  return createErrorResult(
    'Weather API not configured',
    '天气查询需要配置天气 API',
    '建议配置和风天气(https://dev.qweather.com)或心知天气 API'
  )
}
