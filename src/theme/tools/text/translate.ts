/**
 * 文本翻译工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const translateTextDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'translateText',
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

/**
 * 翻译文本
 */
export const translateText: ToolExecutor = async (args): Promise<ToolResult> => {
  const { text, target_language, source_language } = args
  
  if (!text || !target_language) {
    return createErrorResult(
      'Missing required parameters',
      '请提供文本和目标语言',
      '示例: translateText(text="Hello", target_language="zh")'
    )
  }
  
  const langNames: Record<string, string> = {
    'zh': '中文',
    'en': '英文',
    'ja': '日文',
    'ko': '韩文',
    'fr': '法文',
    'de': '德文',
    'es': '西班牙文',
    'ru': '俄文',
    'ar': '阿拉伯文',
    'pt': '葡萄牙文',
    'it': '意大利文'
  }
  
  // 当前依赖 AI 自身翻译能力
  return createSuccessResult(
    {
      text,
      targetLanguage: langNames[target_language] || target_language,
      sourceLanguage: source_language 
        ? (langNames[source_language] || source_language) 
        : 'auto',
      note: '当前使用 AI 自身翻译能力，如需更专业的翻译，请配置 DeepL/Google Translate API'
    },
    `翻译请求: ${langNames[target_language] || target_language}`,
    'translateText',
    '当前依赖 AI 自身翻译能力'
  )
}
