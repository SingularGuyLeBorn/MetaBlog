/**
 * =============================================================================
 * 语雀 (Yuque) 目录操作
 * =============================================================================
 *
 * 包含获取知识库目录结构（TOC）。
 * =============================================================================
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { yuqueApi, translateYuqueError } from './repo'

// =============================================================================
// 工具定义与执行器
// =============================================================================

/**
 * 工具：获取知识库目录结构
 *
 * 返回知识库的 TOC（Table of Contents），包含两类条目：
 *   - TITLE：目录项（文件夹）
 *   - DOC：文档项（实际文档）
 *
 * 目录是层级结构，通过 depth 字段表示层级深度。
 *
 * 【使用示例】
 *   yuque_toc_get(repo_id="68025057")
 */
export const yuqueTocGetDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'yuque_toc_get',
    description: `获取语雀知识库的目录结构（TOC）。

返回知识库中所有文档的层级关系，包括：
- TITLE: 目录/分组项
- DOC: 实际文档项

每个条目包含 title、slug（字段名为 url）、depth 层级等。

使用示例:
yuque_toc_get(repo_id="68025057")

返回示例:
📁 第一章 (slug: xxx)
  📄 1.1 概述 (slug: abc123)
  📄 1.2 详细说明 (slug: def456)
📁 第二章
  📄 2.1 总结 (slug: ghi789)`,
    parameters: {
      type: 'object',
      properties: {
        repo_id: {
          type: 'string',
          description: '知识库 ID（从 yuque_repo_list 结果中获取）',
        },
      },
      required: ['repo_id'],
    },
  },
}

/**
 * 执行器：获取知识库目录结构
 *
 * 调用后端 GET /api/yuque/toc?repo_id=xxx
 *
 * 【响应格式差异】
 * 内部 Web API 返回 { data: { toc: [...] } }，
 * 而 Open API v2 返回 { data: [...] }。
 * 本执行器兼容两种格式。
 */
export const yuqueTocGet = async (args: Record<string, any>): Promise<ToolResult> => {
  const { repo_id } = args

  if (!repo_id) {
    return createErrorResult('Missing repo_id', '缺少 repo_id 参数')
  }

  try {
    const result = await yuqueApi('GET', '/toc', undefined, { repo_id })

    if (!result.data) {
      return createErrorResult(result.msg || result.message || '请求失败', '获取目录失败')
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
      'yuque_toc_get'
    )
  } catch (error: any) {
    const translated = translateYuqueError({ message: error.message })
    return createErrorResult(error.message, translated.message, translated.suggestion)
  }
}
