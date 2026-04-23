/**
 * 代码工具执行器
 * 包含：代码分析、执行等功能
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

/**
 * 执行代码（通过后端沙箱）
 *
 * 支持的沙箱模式：
 * - Python: Monty 解释器（Rust 编写，完全隔离宿主机）
 * - JavaScript: 独立子进程 + vm.runInNewContext
 * - Bash: 受限命令白名单
 */
export const executeCode: ToolExecutor = async (args): Promise<ToolResult> => {
  const { code, language, inputs = {} } = args

  if (!code || !language) {
    return createErrorResult(
      'Missing required parameters',
      '请提供代码和语言',
      '示例: execute_code(code="console.log(1)", language="javascript")'
    )
  }

  const supportedLanguages = ['javascript', 'python', 'bash', 'shell', 'typescript']

  if (!supportedLanguages.includes(language.toLowerCase())) {
    return createErrorResult(
      'Unsupported language',
      `不支持的语言: ${language}`,
      `支持的语言: ${supportedLanguages.join(', ')}`
    )
  }

  try {
    const response = await fetch('/api/sandbox/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, inputs })
    })

    const result = await response.json()

    if (!result.success) {
      return createErrorResult(
        'EXECUTION_FAILED',
        result.error || '代码执行失败',
        result.stderr || ''
      )
    }

    return createSuccessResult(
      {
        result: result.result,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime: result.executionTime,
      },
      `执行成功 (${result.executionTime || '?'}ms)`,
      'execute_code'
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return createErrorResult(
      'NETWORK_ERROR',
      `沙箱服务调用失败: ${msg}`,
      '请检查后端服务是否正常运行'
    )
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
      '示例: analyze_code(code="function add(a,b) { return a+b }", language="javascript")'
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
    'analyze_code'
  )
}
