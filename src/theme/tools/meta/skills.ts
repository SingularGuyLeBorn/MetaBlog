/**
 * ============================================================================
 * 元信息工具 — 获取所有 Skills
 * ============================================================================
 *
 * 用于查询系统级别的元信息：获取所有可用 Skills 的完整列表. 
 * 支持摘要模式和详细模式两种展示方式. 
 *
 * @module src/theme/tools/meta/skills
 */

import type { ToolDefinition, ToolResult } from '../types'

/**
 * 获取所有 Skills 的工具定义
 */
export const getAllSkillsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'getAllSkills',
    description: `元信息工具：获取当前系统中所有可用 Skills 的完整清单. \n\n【什么时候调用】\n- 用户问"你能做什么"、"系统有哪些能力"、"有什么 Skills"\n- 你需要全面了解系统具备哪些专业领域能力\n- 想确认某个 Skill 是否存在,再决定是否需要加载\n- 作为 searchCapabilities 的替代方案,一次性浏览全部 Skills\n\n【不调用的情况】\n- 已经知道具体 Skill ID,直接调用 loadSkill 加载即可\n- 只想搜索某个特定领域的 Skill,用 searchCapabilities 更高效\n\n【示例用法】\n- getAllSkills() → 摘要模式,快速浏览所有 Skills\n- getAllSkills(detail=true) → 详细模式,查看每个 Skill 的关联工具和适用场景\n\n【注意事项】\n- 本工具返回的是系统中已注册的所有 Skills 元信息,不加载 Skill 内容\n- 如需使用某个 Skill 的能力,还需调用 loadSkill(skill_id="xxx") 加载其完整工作流`,
    parameters: {
      type: 'object',
      properties: {
        detail: {
          type: 'boolean',
          description: '是否返回详细模式. false=摘要模式(默认),只显示 Skill 名称、ID 和描述;true=详细模式,额外显示关联工具列表和适用场景. 默认 false. ',
          default: false
        }
      },
      required: []
    }
  }
}

/**
 * 获取所有 Skills 的列表
 *
 * 支持摘要/详细两种模式：
 * - 摘要模式：一行一个 Skill,显示名称、ID 和描述
 * - 详细模式：显示关联工具列表和适用场景
 *
 * @param args - 包含 detail 参数(可选)
 * @returns Skills 列表及统计信息
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
        // 摘要模式：一行一个 Skill,描述不截断
        lines.push(`- ${skill.icon || ''} ${skill.name} [${skill.id}]: ${skill.description}`)
      }
    })

    const hint = '\n\n💡 提示：如需查找特定 Skill,请使用 searchCapabilities 关键词搜索. '

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
