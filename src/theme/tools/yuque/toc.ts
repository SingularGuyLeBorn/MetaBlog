/**
 * ============================================================================
 * 语雀(Yuque)目录操作工具
 * ============================================================================
 *
 * 提供获取语雀知识库目录结构(TOC, Table of Contents)的能力. 
 * 返回结果包含 TITLE(目录分组)和 DOC(实际文档)两种类型的层级结构. 
 *
 * @module src/theme/tools/yuque/toc
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { translateYuqueError, yuqueApi } from './repo'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 获取语雀知识库目录结构的工具定义
 *
 * 返回知识库的 TOC(Table of Contents),包含两类条目：
 *   - TITLE：目录项(文件夹)
 *   - DOC：文档项(实际文档)
 *
 * 目录是层级结构,通过 depth 字段表示层级深度. 
 *
 * 使用示例：
 *   yuqueTocGet(repo_id="68025057")
 */
export const yuqueTocGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuqueTocGet',
    description: `【功能】获取语雀知识库的完整目录结构(TOC, Table of Contents). 

【使用场景】
- 用户想浏览知识库的文档层级和分类结构时调用
- 查找某篇文档在知识库中的位置时调用
- 获取文档的 slug(URL 路径名)以便后续调用 yuqueDocRead 读取内容
- 与 yuqueDocList 的区别：本工具返回完整层级结构(含目录分组),yuqueDocList 只返回文档列表

【示例用法】
yuqueTocGet(repo_id="68025057")
→ 返回:
📁 第一章 (slug: chapter1)
  📄 1.1 概述 (slug: abc123)
  📄 1.2 详细说明 (slug: def456)
📁 第二章
  📄 2.1 总结 (slug: ghi789)

【注意事项】
- 返回结果中的 url 字段就是文档的 slug,用于 yuqueDocRead 的 doc_slug 参数
- depth 字段表示层级深度,0 为顶层
- TITLE 类型是目录分组,DOC 类型是实际可读的文档`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库数字 ID,如 "68025057". 先从 yuqueRepoList 返回值中获取',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 获取语雀知识库目录结构
 *
 * 调用后端 GET /api/yuque/toc?repo_id=xxx
 *
 * 响应格式差异：
 * 内部 Web API 返回 { data: { toc: [...] } },
 * 而 Open API v2 返回 { data: [...] }. 
 * 本执行器兼容两种格式. 
 *
 * @param args - 包含 repo_id 参数
 * @returns 目录结构列表,包含层级深度和类型标识
 */
export const yuqueTocGet = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const result = await yuqueApi('GET', '/toc', undefined, { repo_id })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取目录失败', undefined, result.status || result.code)
    }

    // 内部 Web API: { data: { toc: [...] } }
    // 兼容处理：如果 data 直接是数组也支持
    const toc = result.data?.toc || result.data || []
    const formatted = toc.map((item: any) => {
      const indent = '  '.repeat(item.depth || 0)
      const icon = item.type === 'DOC' ? '📄' : item.type === 'TITLE' ? '📁' : '🔗'
      return `${indent}${icon} ${item.title}${item.url ? ` (slug: ${item.url})` : ''}`
    }).join('\n')

    return createSuccessResult(
      result.data,
      `目录结构 (${toc.length} 项):\n${formatted}`,
      'yuqueTocGet'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
