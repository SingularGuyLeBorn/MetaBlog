/**
 * 代码工具定义 — analyzeCode
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const analyzeCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'analyzeCode',
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

/**
 * 分析代码
 */
export const analyzeCode: ToolExecutor = async (args): Promise<ToolResult> => {
  const { code, language } = args
  
  if (!code || !language) {
    return createErrorResult(
      'Missing required parameters',
      '请提供代码和语言',
      '示例: analyzeCode(code="function add(a,b) { return a+b }", language="javascript")'
    )
  }
  
  // 代码分析
  const lines = code.split('\n')
  const nonEmptyLines = lines.filter((l: string) => l.trim())
  
  // 检测注释行
  const commentPatterns: Record<string, RegExp> = {
    javascript: /^\s*(\/\/|\/\*|\*)/,
    typescript: /^\s*(\/\/|\/\*|\*)/,
    python: /^\s*(#|''')/,
    bash: /^\s*#/,
    shell: /^\s*#/,
    java: /^\s*(\/\/|\/\*|\*)/,
    cpp: /^\s*(\/\/|\/\*|\*)/,
    c: /^\s*(\/\/|\/\*|\*)/,
    go: /^\s*(\/\/)/,
    rust: /^\s*(\/\/|\/\*)/,
    ruby: /^\s*#/,
    php: /^\s*(\/\/|\/\*|#)/
  }
  
  const commentRegex = commentPatterns[language.toLowerCase()] || /^\s*\//
  const commentLines = lines.filter((l: string) => commentRegex.test(l))
  
  // 简单的代码复杂度估算
  const cyclomaticComplexity = (
    (code.match(/\bif\b/g) || []).length +
    (code.match(/\belse\b/g) || []).length +
    (code.match(/\bfor\b/g) || []).length +
    (code.match(/\bwhile\b/g) || []).length +
    (code.match(/\bcase\b/g) || []).length +
    (code.match(/\bcatch\b/g) || []).length +
    1
  )
  
  const analysis = {
    language: language.toLowerCase(),
    metrics: {
      totalLines: lines.length,
      codeLines: nonEmptyLines.length,
      emptyLines: lines.length - nonEmptyLines.length,
      commentLines: commentLines.length,
      commentRatio: ((commentLines.length / nonEmptyLines.length) * 100).toFixed(1) + '%'
    },
    complexity: {
      cyclomatic: cyclomaticComplexity,
      level: cyclomaticComplexity > 10 ? 'high' : cyclomaticComplexity > 5 ? 'medium' : 'low'
    },
    suggestions: [
      commentLines.length === 0 ? '建议添加注释以提高代码可读性' : null,
      cyclomaticComplexity > 10 ? '代码复杂度较高，建议重构拆分' : null,
      lines.length > 100 ? '函数/文件较长，建议拆分' : null
    ].filter(Boolean)
  }
  
  return createSuccessResult(
    analysis,
    `代码分析完成 (${lines.length} 行)`,
    'analyzeCode'
  )
}
