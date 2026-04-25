/**
 * Meta 工具定义 — get_all_tools
 *
 * 用于查询系统级别的元信息：获取所有可用工具的完整列表
 */

import type { ToolDefinition } from '../types'
import type { ToolResult } from '../types'
import { getToolDefinitions } from '../registry'

export const getAllToolsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_all_tools',
    description: `获取当前系统中所有可用工具的列表。

当你不确定有哪些工具可用，或用户要求查看系统能力时，调用此工具。
默认返回摘要模式（仅分类+工具名），避免输出过长被截断。
如需查看每个工具的完整描述，请设置 detail=true。`,
    parameters: {
      type: 'object',
      properties: {
        detail: {
          type: 'boolean',
          description: '是否返回每个工具的完整描述。默认为 false（摘要模式）',
          default: false
        }
      },
      required: []
    }
  }
}

/**
 * 获取所有工具的列表（支持摘要/详细模式）
 *
 * 默认返回精简摘要（仅分类+数量+工具名），避免思考过程截断。
 * 如需查看每个工具的完整描述，使用 detail=true 参数。
 */
export async function executeGetAllTools(args?: { detail?: boolean }): Promise<ToolResult> {
  try {
    const defs = getToolDefinitions()
    const detail = args?.detail === true

    // 按类别分组
    const categoryMap: Record<string, { name: string; desc: string }[]> = {
      '文章管理': [], '文件管理': [], '网络工具': [], '代码工具': [],
      '文本处理': [], '笔记工具': [], '知识库': [], '系统工具': [],
      '学术平台': [], 'AI模型平台': [], '代码平台': [], '飞书集成': [],
      'Skill系统': [], '元信息': [], '其他': []
    }

    defs.forEach(d => {
      const name = d.function.name
      const desc = d.function.description.split('\n')[0]
      const category = getToolCategory(name)
      if (!categoryMap[category]) categoryMap[category] = []
      categoryMap[category].push({ name, desc })
    })

    const lines: string[] = []
    lines.push(`系统共有 ${defs.length} 个工具，分为以下类别：\n`)

    Object.entries(categoryMap).forEach(([category, items]) => {
      if (items.length === 0) return
      lines.push(`\n### ${category} (${items.length})`)
      if (detail) {
        items.forEach(item => lines.push(`- ${item.name}: ${item.desc}`))
      } else {
        // 摘要模式：只列工具名，每行最多 5 个
        const names = items.map(i => i.name)
        for (let i = 0; i < names.length; i += 5) {
          lines.push(`  ${names.slice(i, i + 5).join(', ')}`)
        }
      }
    })

    const hint = detail
      ? '\n\n💡 提示：列表较长可能截断。如需查找特定工具，请使用 search_capabilities 关键词搜索。'
      : '\n\n💡 提示：如需查看每个工具的详细描述，请再次调用 get_all_tools 并设置 detail=true。'

    return {
      success: true,
      message: `已获取全部 ${defs.length} 个工具（${detail ? '详细' : '摘要'}模式）`,
      data: {
        count: defs.length,
        detail,
        list: lines.join('\n') + hint
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: 'GET_ALL_TOOLS_FAILED',
      message: `获取工具列表失败: ${msg}`
    }
  }
}

function getToolCategory(name: string): string {
  if (name.includes('article')) return '文章管理'
  if (name.includes('file')) return '文件管理'
  if (name.includes('web') || name.includes('fetch') || name.includes('url')) return '网络工具'
  if (name.includes('code') || name.includes('execute') || name.includes('analyze')) return '代码工具'
  if (name.includes('text') || name.includes('summarize') || name.includes('format') || name.includes('translate')) return '文本处理'
  if (name.includes('note')) return '笔记工具'
  if (name.includes('knowledge') || name.includes('kb_')) return '知识库'
  if (name.includes('time') || name.includes('weather') || name.includes('calculate')) return '系统工具'
  if (name.includes('arxiv') || name.includes('openreview')) return '学术平台'
  if (name.includes('huggingface')) return 'AI模型平台'
  if (name.includes('github')) return '代码平台'
  if (name.includes('feishu')) return '飞书集成'
  if (name.includes('skill') || name.includes('load_skill')) return 'Skill系统'
  if (name.includes('all_')) return '元信息'
  return '其他'
}
