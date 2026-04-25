/**
 * Meta 工具定义 — get_all_skills
 *
 * 用于查询系统级别的元信息：获取所有可用 Skills 的完整列表
 */

import type { ToolDefinition } from '../types'
import type { ToolResult } from '../types'

export const getAllSkillsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_all_skills',
    description: `获取当前系统中所有可用 Skills 的列表。

当你不确定有哪些 Skills 可用，或用户要求查看系统能力领域时，调用此工具。
默认返回摘要模式（仅名称+ID+简述），避免输出过长被截断。
如需查看每个 Skill 的完整描述、关联工具和适用场景，请设置 detail=true。`,
    parameters: {
      type: 'object',
      properties: {
        detail: {
          type: 'boolean',
          description: '是否返回每个 Skill 的完整信息。默认为 false（摘要模式）',
          default: false
        }
      },
      required: []
    }
  }
}

/**
 * 获取所有 Skills 的列表（支持摘要/详细模式）
 *
 * 默认返回精简摘要，避免思考过程截断。
 * 如需查看每个 Skill 的完整信息，使用 detail=true 参数。
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
        // 摘要模式：一行一个 Skill
        const shortDesc = skill.description.length > 60
          ? skill.description.slice(0, 60) + '...'
          : skill.description
        lines.push(`- ${skill.icon || ''} ${skill.name} [${skill.id}]: ${shortDesc}`)
      }
    })

    const hint = detail
      ? '\n\n💡 提示：列表较长可能截断。如需查找特定 Skill，请使用 search_capabilities 关键词搜索。'
      : '\n\n💡 提示：如需查看每个 Skill 的完整描述、关联工具和适用场景，请再次调用 get_all_skills 并设置 detail=true。'

    return {
      success: true,
      message: `已获取全部 ${skills.length} 个 Skills（${detail ? '详细' : '摘要'}模式）`,
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
