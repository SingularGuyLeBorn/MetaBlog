/**
 * 系统工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

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

export const getWeatherDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_weather',
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
