/**
 * Meta 工具定义
 *
 * 用于查询系统级别的元信息：
 * - get_all_tools: 获取所有可用工具的完整列表
 * - get_all_skills: 获取所有可用 Skills 的完整列表
 */

import type { ToolDefinition } from '../types'

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
