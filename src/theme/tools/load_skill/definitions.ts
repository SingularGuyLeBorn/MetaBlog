/**
 * load_skill 工具定义
 * 
 * Agent 主动调用此工具来加载指定 Skill 的完整内容到对话上下文。
 * 这是 MetaBlog Skill 系统"渐进式披露"的核心机制：
 * - System Prompt 只包含 Skill Catalog（名称+描述）
 * - Agent 判断需要使用某个 Skill 时，调用 load_skill
 * - Skill 完整内容作为新消息注入后续对话
 */

import type { ToolDefinition } from '../types'

export const loadSkillDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'load_skill',
    description: `加载指定 Skill 的完整内容到当前对话上下文。

当你判断需要使用某个 Skill 来完成用户任务时，调用此工具。
System Prompt 中已列出所有可用 Skills（仅名称和描述），
你需要根据用户请求主动选择并加载合适的 Skill。

加载后，Skill 的完整工作流程和指导会作为新消息注入对话，
你在后续回复中应遵循该 Skill 的指导。

重要：
- 不要猜测 Skill ID，只使用 System Prompt 中列出的 Skill
- 如果用户请求涉及多个领域，可以多次调用加载多个 Skill
- 已加载的 Skill 在当前对话中持续有效`,
    parameters: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'string',
          description: '要加载的 Skill ID，如 "article-manager", "academic-research", "feishu-assistant" 等'
        }
      },
      required: ['skill_id']
    }
  }
}
