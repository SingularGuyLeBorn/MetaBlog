/**
 * Meta 工具定义 — getAllSkills
 *
 * 用于查询系统级别的元信息：获取所有可用 Skills 的完整列表
 */

import type { ToolDefinition, ToolResult } from '../types'

export const getAllSkillsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'getAllSkills',
    description: `获取当前系统中所有可用 Skills 的列表。

当你不确定有哪些 Skills 可用，或用户要求查看系统能力领域时，调用此工具。
返回所有 Skills 的完整列表和描述，方便 AI 全面理解系统能力。`,
    parameters: {
      type: 'object',
      properties: {
        detail: {
          type: 'boolean',
          description: '是否返回每个 Skill 的完整信息。默认为 false(摘要模式)',
          default: false
        }
      },
      required: []
    }
  }
}

/**
 * 获取所有 Skills 的列表(支持摘要/详细模式)
 *
 * 返回所有 Skills 的完整列表和描述。
 */
export async function executeGetAllSkills(args?: { detail?: boolean }): Promise<ToolResult> {
  try {
    const response = await fetch('/api/skills')
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP_${response.status}`,
        message: `获取 Skills 列表失败: HTTP ${response.status}`
      }
    }

    const result = await response.json()
    const skills = result.data

    if (!Array.isArray(skills)) {
      return {
        success: false,
        error: 'INVALID_RESPONSE',
        message: `Skills 接口返回格式不正确: ${JSON.stringify(result).slice(0, 200)}`
      }
    }

    const detail = args?.detail === true
    const lines: string[] = []
    lines.push(`系统共有 ${skills.length} 个 Skills：\n`)

    skills.forEach((skill: any) => {
      const toolCount = (skill.tools || []).length
      if (detail) {
        const toolNames = (skill.tools || []).join(', ') || '无'
        const scenarios = (skill.usageScenarios || []).join('; ') || '未定义'
        lines.push(`\n- ${skill.icon || ''} **${skill.name}** \`${skill.id}\``)
        lines.push(`  描述: ${skill.description}`)
        lines.push(`  关联工具(${toolCount}): ${toolNames}`)
        lines.push(`  适用场景: ${scenarios}`)
      } else {
        // 摘要模式：一行一个 Skill，描述不截断
        lines.push(`- ${skill.icon || ''} ${skill.name} [${skill.id}]: ${skill.description}`)
      }
    })

    const hint = '\n\n💡 提示：如需查找特定 Skill，请使用 searchCapabilities 关键词搜索。'

    return {
      success: true,
      message: `已获取全部 ${skills.length} 个 Skills(${detail ? '详细' : '摘要'}模式)`,
      data: {
        count: skills.length,
        detail,
        list: lines.join('\n') + hint
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: 'GET_ALL_SKILLS_FAILED',
      message: `获取 Skills 列表失败: ${msg}`
    }
  }
}
