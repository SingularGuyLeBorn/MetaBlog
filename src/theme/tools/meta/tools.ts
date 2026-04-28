/**
 * Meta 工具定义 — getAllTools
 *
 * 用于查询系统级别的元信息：获取所有可用工具的完整列表
 */

import { getToolDefinitions } from '../registry'
import type { ToolDefinition, ToolResult } from '../types'

export const getAllToolsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'getAllTools',
    description: `获取当前系统中所有可用工具的列表。

当你不确定有哪些工具可用，或用户要求查看系统能力时，调用此工具。
返回所有工具的完整分类列表和描述，方便 AI 全面理解系统能力。`,
    parameters: {
      type: 'object',
      properties: {
        detail: {
          type: 'boolean',
          description: '是否返回每个工具的完整描述。默认为 false(摘要模式)',
          default: false
        }
      },
      required: []
    }
  }
}

/**
 * 获取所有工具的列表(支持摘要/详细模式)
 *
 * 返回所有工具的完整分类列表和描述。
 * detail=true 时格式更详细(适合首次了解系统)。
 */
export async function executeGetAllTools(args?: { detail?: boolean }): Promise<ToolResult> {
  try {
    const defs = getToolDefinitions()
    const detail = args?.detail === true

    // 按类别分组
    const categoryMap: Record<string, { name: string; desc: string }[]> = {
      '文章管理': [], '文件管理': [], '网络工具': [], '代码工具': [],
      '文本处理': [], '笔记工具': [], '知识库': [], '系统工具': [],
      '学术平台': [], 'AI模型平台': [], '🐙 GitHub': [], '飞书集成': [],
      '语雀集成': [], 'Skill系统': [], '元信息': [], '其他': []
    }

    defs.forEach(d => {
      const name = d.function.name
      const desc = d.function.description
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
        // 摘要模式：每行显示工具名 + 完整描述(不截断)
        items.forEach(item => {
          lines.push(`  • ${item.name} — ${item.desc}`)
        })
      }
    })

    const hint = '\n\n💡 提示：如需查找特定工具，请使用 searchCapabilities 关键词搜索。'

    return {
      success: true,
      message: `已获取全部 ${defs.length} 个工具(${detail ? '详细' : '摘要'}模式)`,
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
  // github 必须在 code 之前判断，否则 github* 会被误判为代码工具
  if (name.includes('github')) return '🐙 GitHub'
  if (name.includes('code') || name.includes('execute') || name.includes('analyze')) return '代码工具'
  if (name.includes('text') || name.includes('summarize') || name.includes('format') || name.includes('translate')) return '文本处理'
  if (name.includes('note')) return '笔记工具'
  if (name.includes('knowledge') || name.includes('kb_')) return '知识库'
  if (name.includes('time') || name.includes('weather') || name.includes('calculate')) return '系统工具'
  if (name.includes('arxiv') || name.includes('openreview')) return '学术平台'
  if (name.includes('huggingface')) return 'AI模型平台'
  if (name.includes('feishu')) return '飞书集成'
  if (name.includes('yuque')) return '语雀集成'
  if (name.includes('skill') || name.includes('loadSkill')) return 'Skill系统'
  if (name.includes('all_')) return '元信息'
  return '其他'
}
