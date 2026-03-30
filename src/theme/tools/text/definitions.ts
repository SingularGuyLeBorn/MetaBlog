/**
 * 文本处理工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const summarizeTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'summarize_text',
    description: '对给定文本生成简短摘要。当用户要求"总结"、"摘要"、"概括"或文本过长需要精简时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '需要摘要的原始文本'
        },
        max_length: {
          type: 'number',
          description: '摘要最大长度（字符数），默认200',
          default: 200
        }
      },
      required: ['text']
    }
  }
}

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

export const translateTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'translate_text',
    description: '翻译文本到指定语言。当用户需要翻译内容或理解外语文本时使用。',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '要翻译的文本'
        },
        target_language: {
          type: 'string',
          description: '目标语言代码，如 "zh"（中文）、"en"（英文）、"ja"（日文）、"ko"（韩文）、"fr"（法文）、"de"（德文）等'
        },
        source_language: {
          type: 'string',
          description: '源语言代码（可选，自动检测）'
        }
      },
      required: ['text', 'target_language']
    }
  }
}
