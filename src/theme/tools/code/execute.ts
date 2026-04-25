/**
 * 代码工具定义 — execute_code
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

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
