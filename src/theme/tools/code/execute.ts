/**
 * ============================================================================
 * execute 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/code
 */


import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/**
 * 代码执行工具定义
 */
export const executeCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'executeCode',
    description: '在沙箱环境中执行代码片段并返回运行结果(stdout、stderr、返回值和执行时间). \n\n使用场景：当用户需要「运行一段代码看看结果」「验证这个算法对不对」「帮我测试一下这段代码」「计算一个表达式的值」时调用. 适合快速验证代码逻辑、执行计算、测试小段脚本. \n\n示例用法：executeCode(code="console.log(1+2)", language="javascript")\n\n注意事项：\n- 支持的语言：javascript、python、bash、shell、typescript\n- JavaScript 在独立子进程 + vm.runInNewContext 中运行;Python 使用 Monty 解释器(Rust 编写,完全隔离);Bash 使用受限命令白名单\n- 无法访问网络、文件系统或外部环境变量\n- 执行有时长限制,超时会中断\n- 如果代码包含死循环或大量输出,可能被强制终止\n- 不要用于执行不可信或恶意代码,沙箱有安全边界但非绝对',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要执行的完整代码字符串. 必须是符合目标语言语法的有效代码. 示例："print(sum(range(10)))"、"console.log(\\"hello\\")"、"ls -la"'
        },
        language: {
          type: 'string',
          description: '编程语言,必须是以下之一：javascript、python、bash、shell、typescript. 大小写不敏感. ',
          enum: ['javascript', 'python', 'bash', 'shell', 'typescript']
        }
      },
      required: ['code', 'language']
    }
  }
}

/**
 * 执行代码(通过后端沙箱)
 *
 * 支持的沙箱模式：
 * - Python: Monty 解释器(Rust 编写,完全隔离宿主机)
 * - JavaScript: 独立子进程 + vm.runInNewContext
 * - Bash: 受限命令白名单
 *
 * @param args - 工具参数
 * @param args.code - 要执行的代码
 * @param args.language - 编程语言
 * @param args.inputs - 输入参数(可选,用于需要 stdin 的场景)
 * @returns 执行结果或错误信息
 */
export const executeCode: ToolExecutor = async (args): Promise<ToolResult> => {
  const { code, language, inputs = {} } = args

  if (!code || !language) {
    return createErrorResult(
      'Missing required parameters',
      '请提供代码和语言',
      '示例: executeCode(code="console.log(1)", language="javascript")'
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
      'executeCode'
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
