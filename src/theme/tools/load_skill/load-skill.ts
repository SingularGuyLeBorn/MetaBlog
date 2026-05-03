/**
 * ============================================================================
 * Skill 加载工具
 * ============================================================================
 *
 * 【渐进式披露架构的 LOD-2 加载器】
 *
 * 职责：将指定 Skill 的完整工作流指导加载到当前对话上下文中. 
 *
 * 渐进式披露的三层模型：
 * - LOD-0(始终)：System Prompt 中的 Skill 元数据目录(名称+描述)
 * - LOD-1(始终)：System Prompt 中的工具分类摘要
 * - LOD-2(按需)：通过本工具加载的 Skill 完整内容(工作流指导、最佳实践)
 *
 * 执行后产生两个关键副作用：
 * 1. injectMessages：将 Skill 完整内容作为新消息注入对话,Agent 在下一轮可见
 * 2. activateTools：自动暴露该 Skill 关联的所有工具 schema
 *
 * 典型使用场景：
 * - "帮我做一个完整的 GitHub PR 审查" → loadSkill("github-pr-review")
 * - "怎么排版飞书文档？" → loadSkill("feishu-doc-format")
 * - "写一篇学术论文" → loadSkill("academic-writing")
 *
 * @module src/theme/tools/load_skill/load-skill
 */

import type { ToolDefinition, ToolResult } from '../types'

/**
 * 加载 Skill 工具定义
 */
export const loadSkillDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'loadSkill',
    description: `加载指定 Skill 的完整工作流程指导到当前对话上下文. \n\n【什么时候调用】\n- 用户的请求超出了你的常规能力范围,需要借助专业工作流指导时\n- System Prompt 中列出的某个 Skill 描述与当前任务高度匹配\n- 用户要求完成复杂任务(如"做一个完整的 GitHub PR 审查"、"写一篇学术论文")\n- 你不确定如何处理某个领域的问题,想获取该领域的标准化流程\n\n【什么时候不调用】\n- 任务很简单,不需要专业指导就能完成\n- 用户只是闲聊,没有具体任务需求\n- 所需能力已经通过已加载的 Skill 覆盖\n\n【加载后的效果】\n- Skill 的完整工作流程、最佳实践、注意事项会作为新消息注入对话\n- 该 Skill 关联的工具会自动激活,下轮可直接调用\n- 你应在后续回复中遵循该 Skill 的指导\n\n【示例用法】\n- loadSkill(skill_id="github-pr-review") → 加载 PR 审查工作流\n- loadSkill(skill_id="academic-research") → 加载学术研究流程\n- loadSkill(skill_id="feishu-assistant") → 加载飞书文档处理指导\n\n【注意事项】\n- 不要猜测 Skill ID,只使用 System Prompt 中明确列出的 Skill\n- 一个任务可能涉及多个领域,可多次调用加载多个 Skill\n- 已加载的 Skill 在当前对话中持续有效,无需重复加载`,
    parameters: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: '要加载的 Skill ID. 必须是 System Prompt 中列出的有效 ID. 示例："article-manager"、"academic-research"、"feishu-assistant"、"github-pr-review". 禁止猜测不存在的 ID. '
        }
      },
      required: ['skill_id']
    }
  }
}

/**
 * 加载指定 Skill 的完整内容并注入对话上下文
 *
 * 执行流程：
 * 1. 参数校验：skill_id 必须是非空字符串
 * 2. 调用后端 API 获取 Skill 完整数据
 * 3. 构建注入内容：Skill 正文 + 关联工具列表 + 适用场景
 * 4. 返回 ToolResult,携带 injectMessages 和 activateTools
 *
 * @param args.skill_id - 要加载的 Skill ID(如 "github-pr-review"、"feishu-doc-format")
 * @returns ToolResult,包含：
 *   - message: 加载成功/失败的提示
 *   - data: { skillId, skillName, loadedAt }
 *   - injectMessages: Skill 内容注入消息(Agent 下一轮可见)
 *   - activateTools: 该 Skill 关联的工具名称数组(触发 schema 暴露)
 */
export async function executeLoadSkill(args: Record<string, any>): Promise<ToolResult> {
  const { skill_id } = args

  // 参数校验：skill_id 为必填项
  if (!skill_id || typeof skill_id !== 'string') {
    return {
      success: false,
      error: 'MISSING_SKILL_ID',
      message: '请提供要加载的 Skill ID'
    }
  }

  try {
    // 从后端 API 获取 Skill 完整数据
    const response = await fetch(`/api/skills/${skill_id}`)

    // HTTP 错误处理：404 表示 Skill 不存在
    if (!response.ok) {
      return {
        success: false,
        error: `SKILL_NOT_FOUND (${response.status})`,
        message: `Skill "${skill_id}" 不存在或无法加载`
      }
    }

    const result = await response.json()

    // 接口返回格式校验：expect { success: true, data: SkillObject }
    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'INVALID_SKILL_RESPONSE',
        message: `Skill "${skill_id}" 接口返回异常`
      }
    }

    const skill = result.data

    // ─────────────────────────────────────────────────────────────
    // 构建 Skill 注入内容(LOD-2 级别完整工作流指导)
    // ─────────────────────────────────────────────────────────────
    // 注入内容结构：
    //   [Skill 已加载: <名称>]
    //   <Skill 正文(工作流指导、最佳实践、注意事项)>
    //   ## 关联工具
    //   - <tool1>
    //   - <tool2>
    //   ## 适用场景
    //   - <场景1>
    //   - <场景2>
    //   ---
    //   请根据以上 Skill 指导完成用户请求. 

    // 关联工具列表：让 Agent 知道该 Skill 推荐用什么工具
    const toolList = (skill.tools || []).length
      ? `\n\n## 关联工具\n${skill.tools.map((t: string) => `- ${t}`).join('\n')}`
      : ''

    // 适用场景列表：帮助 Agent 判断 Skill 的使用时机
    const scenarios = (skill.usageScenarios || []).length
      ? `\n\n## 适用场景\n${skill.usageScenarios.map((s: string) => `- ${s}`).join('\n')}`
      : ''

    // 组合完整注入内容
    const injectContent = `[Skill 已加载: ${skill.name}]\n\n${skill.content || skill.systemPrompt || ''}${toolList}${scenarios}\n\n---\n请根据以上 Skill 指导完成用户请求. `

    return {
      success: true,
      message: `Skill "${skill.name}" 已加载到对话上下文`,
      data: {
        skillId: skill.id,
        skillName: skill.name,
        loadedAt: Date.now()
      },
      // ─────────────────────────────────────────────────────────────
      // injectMessages：将 Skill 内容注入到对话上下文中
      // ─────────────────────────────────────────────────────────────
      // 原理：以 'user' 角色添加一条新消息到对话历史,
      // 模型在下一轮会将这条消息视为上下文的一部分,
      // 从而"看到" Skill 的完整工作流指导. 
      // 这是 LOD-2 渐进式披露的核心实现机制. 
      injectMessages: [
        {
          role: 'user',
          content: injectContent
        }
      ],
      // ─────────────────────────────────────────────────────────────
      // activateTools：自动激活 Skill 关联的工具 schema
      // ─────────────────────────────────────────────────────────────
      // 加载 Skill 后,自动将该 Skill 声明的工具加入可用列表. 
      // 例如加载 "github-pr-review" Skill 后,
      // githubGetPull、githubListPulls 等工具自动变为可调用. 
      activateTools: skill.tools || []
    }
  } catch (error) {
    // 网络异常或 JSON 解析失败等不可预期错误
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: 'LOAD_SKILL_FAILED',
      message: `加载 Skill "${skill_id}" 失败: ${msg}`
    }
  }
}
