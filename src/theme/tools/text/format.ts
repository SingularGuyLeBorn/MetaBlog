/**
 * 文本格式化工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const formatTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'format_text',
    description: '将文本格式化为指定格式（Markdown、JSON、YAML、表格等）。当用户需要格式化输出或转换格式时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '原始文本内容'
        },
        format: {
          type: 'string',
          description: '目标格式：markdown、json、yaml、table，默认markdown',
          enum: ['markdown', 'json', 'yaml', 'table'],
          default: 'markdown'
        }
      },
      required: ['text']
    }
  }
}

/**
 * 格式化文本
 */
export const formatText: ToolExecutor = async (args): Promise<ToolResult> => {
  const { text, format = 'markdown' } = args
  
  if (!text) {
    return createErrorResult(
      'Missing text parameter',
      '请提供文本内容',
      '示例: format_text(text="内容", format="json")'
    )
  }
  
  const validFormats = ['markdown', 'json', 'yaml', 'table']
  if (!validFormats.includes(format)) {
    return createErrorResult(
      'Invalid format',
      `不支持的格式: ${format}`,
      `支持的格式: ${validFormats.join(', ')}`
    )
  }
  
  try {
    let result = text
    
    switch (format) {
      case 'json':
        try {
          const obj = JSON.parse(text)
          result = JSON.stringify(obj, null, 2)
        } catch {
          return createErrorResult(
            'Invalid JSON',
            '输入不是有效的 JSON',
            '请检查 JSON 语法'
          )
        }
        break
      case 'yaml':
        // 简单的 YAML 格式转换
        result = text.split('\n').map((line: string) => line.trim()).join('\n')
        break
      case 'table':
        // 尝试将文本转换为 Markdown 表格
        const lines = text.split('\n').filter((l: string) => l.trim())
        if (lines.length >= 2) {
          // 假设第一行是表头
          const header = lines[0].split(/\t|,/).map((h: string) => h.trim())
          const separator = header.map(() => '---').join(' | ')
          const rows = lines.slice(1).map((line: string) => {
            return line.split(/\t|,/).map((cell: string) => cell.trim()).join(' | ')
          })
          result = [header.join(' | '), separator, ...rows].join('\n')
        }
        break
      case 'markdown':
      default:
        result = text
    }
    
    return createSuccessResult(
      {
        format,
        originalLength: text.length,
        resultLength: result.length,
        result
      },
      `格式化完成 (${format})`,
      'format_text'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '格式化失败',
      '请检查输入内容'
    )
  }
}
