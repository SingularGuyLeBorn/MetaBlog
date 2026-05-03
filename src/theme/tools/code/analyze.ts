/**
 * ============================================================================
 * analyze 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/code
 */


import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/**
 * 代码分析工具定义
 */
export const analyzeCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'analyzeCode',
    description: '分析代码质量,输出代码度量指标(行数、注释率、圈复杂度)和潜在改进建议. \n\n使用场景：当用户提供了一段代码并询问「这段代码有什么问题」「请帮我 review 一下」「代码质量怎么样」「能不能优化」时调用. 适合对单个函数或代码片段做快速静态分析,不适合大型项目级审查. \n\n示例用法：analyzeCode(code="function add(a,b){return a+b}", language="javascript")\n\n注意事项：\n- 只支持静态分析,不会实际执行代码\n- 支持的语言：javascript、typescript、python、bash、shell、java、cpp、c、go、rust、ruby、php\n- 分析指标包括：总行数、代码行数、空行数、注释行数、注释率、圈复杂度\n- 如果圈复杂度 > 10 或文件 > 100 行,会给出重构建议\n- 代码片段不宜过长(建议 < 500 行),否则分析可能不够精确',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: '要分析的源代码字符串. 必须是完整的、可解析的代码片段,而非伪代码或自然语言描述. '
        },
        language: {
          type: 'string',
          description: '代码的编程语言. 必须是以下之一：javascript、typescript、python、bash、shell、java、cpp、c、go、rust、ruby、php. 大小写不敏感. '
        }
      },
      required: ['code', 'language']
    }
  }
}

/**
 * 分析代码质量
 *
 * 对代码片段进行静态分析,计算度量指标并给出改进建议. 
 * 使用正则匹配而非 AST 解析,因为前端不需要引入完整的解析库,
 * 对于片段级分析已经足够精确. 
 *
 * @param args - 工具参数
 * @param args.code - 要分析的源代码
 * @param args.language - 编程语言
 * @returns 分析结果或错误信息
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

  // 各语言注释行检测正则
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

  // 简单的代码复杂度估算(圈复杂度)
  // 通过统计控制流关键字数量来估算,虽然不是精确的 AST 分析,
  // 但对片段级代码已足够反映复杂程度
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
      cyclomaticComplexity > 10 ? '代码复杂度较高,建议重构拆分' : null,
      lines.length > 100 ? '函数/文件较长,建议拆分' : null
    ].filter(Boolean)
  }

  return createSuccessResult(
    analysis,
    `代码分析完成 (${lines.length} 行)`,
    'analyzeCode'
  )
}
