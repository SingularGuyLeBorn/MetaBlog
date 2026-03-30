/**
 * 文本处理工具执行器
 * 包含：摘要、格式化、翻译等功能
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

/**
 * 文本摘要
 */
export const summarizeText: ToolExecutor = async (args): Promise<ToolResult> => {
  const { text, max_length = 200 } = args
  
  if (!text) {
    return createErrorResult(
      'Missing text parameter',
      '请提供文本内容',
      '示例: summarize_text(text="长文本内容...", max_length=200)'
    )
  }
  
  // 简单的文本摘要（取前 max_length 个字符）
  const summary = text.length <= max_length 
    ? text 
    : text.substring(0, max_length) + '...'
  
  return createSuccessResult(
    {
      originalLength: text.length,
      summaryLength: Math.min(text.length, max_length),
      summary
    },
    `摘要完成 (${Math.min(text.length, max_length)}/${text.length} 字符)`,
    'summarize_text'
  )
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

/**
 * 翻译文本
 */
export const translateText: ToolExecutor = async (args): Promise<ToolResult> => {
  const { text, target_language, source_language } = args
  
  if (!text || !target_language) {
    return createErrorResult(
      'Missing required parameters',
      '请提供文本和目标语言',
      '示例: translate_text(text="Hello", target_language="zh")'
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
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      targetLanguage: langNames[target_language] || target_language,
      sourceLanguage: source_language 
        ? (langNames[source_language] || source_language) 
        : 'auto',
      note: '当前使用 AI 自身翻译能力，如需更专业的翻译，请配置 DeepL/Google Translate API'
    },
    `翻译请求: ${langNames[target_language] || target_language}`,
    'translate_text',
    '当前依赖 AI 自身翻译能力'
  )
}
