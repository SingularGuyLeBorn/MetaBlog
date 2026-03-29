/**
 * 代码工具定义
 */

import type { ToolDefinition } from '../types'

export const executeCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'execute_code',
    description: '执行代码片段并返回结果。支持 JavaScript、Python、Bash 等语言。当用户需要运行代码、测试算法或执行脚本时使用。',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要执行的代码'
        },
        language: {
          type: 'string',
          description: '编程语言，如 "javascript", "python", "bash" 等',
          enum: ['javascript', 'python', 'bash', 'shell', 'typescript']
        }
      },
      required: ['code', 'language']
    }
  }
}

export const analyzeCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'analyze_code',
    description: '分析代码质量、潜在问题和改进建议。当用户需要代码审查、性能分析或安全检查时使用。',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要分析的源代码'
        },
        language: {
          type: 'string',
          description: '编程语言，如 javascript, python, java 等'
        }
      },
      required: ['code', 'language']
    }
  }
}
