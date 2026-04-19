/**
 * load_skill 工具执行器
 *
 * 从后端 API 加载指定 Skill 的完整内容，
 * 并通过 injectMessages 将内容注入到对话上下文中。
 */

import type { ToolResult } from '../types'

/**
 * 加载指定 Skill 的完整内容
 */
export async function executeLoadSkill(args: Record<string, any>): Promise<ToolResult> {
  const { skill_id } = args

  if (!skill_id || typeof skill_id !== 'string') {
    return {
      success: false,
      error: 'MISSING_SKILL_ID',
      message: '请提供要加载的 Skill ID'
    }
  }

  try {
    const response = await fetch(`/api/skills/${skill_id}`)

    if (!response.ok) {
      return {
        success: false,
        error: `SKILL_NOT_FOUND (${response.status})`,
        message: `Skill "${skill_id}" 不存在或无法加载`
      }
    }

    const result = await response.json()
    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'INVALID_SKILL_RESPONSE',
        message: `Skill "${skill_id}" 接口返回异常`
      }
    }

    const skill = result.data

    // 构建 Skill 注入内容（LOD-2 级别）
    const toolList = (skill.tools || []).length
      ? `\n\n## 关联工具\n${skill.tools.map((t: string) => `- ${t}`).join('\n')}`
      : ''

    const scenarios = (skill.usageScenarios || []).length
      ? `\n\n## 适用场景\n${skill.usageScenarios.map((s: string) => `- ${s}`).join('\n')}`
      : ''

    const injectContent = `[Skill 已加载: ${skill.name}]

${skill.content || skill.systemPrompt || ''}${toolList}${scenarios}

---
请根据以上 Skill 指导完成用户请求。`

    return {
      success: true,
      message: `Skill "${skill.name}" 已加载到对话上下文`,
      data: {
        skillId: skill.id,
        skillName: skill.name,
        loadedAt: Date.now()
      },
      // 将 Skill 内容注入到对话上下文中（Agent 在下一轮可见）
      injectMessages: [
        {
          role: 'user',
          content: injectContent
        }
      ]
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: 'LOAD_SKILL_FAILED',
      message: `加载 Skill "${skill_id}" 失败: ${msg}`
    }
  }
}
