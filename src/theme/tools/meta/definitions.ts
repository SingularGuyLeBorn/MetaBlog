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
    description: `获取当前系统中所有可用工具的完整列表。

当你不确定有哪些工具可用，或用户要求查看系统能力时，调用此工具。
返回结果包含每个工具的名称、描述和所属分类。`,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

export const getAllSkillsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_all_skills',
    description: `获取当前系统中所有可用 Skills 的完整列表。

当你不确定有哪些 Skills 可用，或用户要求查看系统能力领域时，调用此工具。
返回结果包含每个 Skill 的名称、ID、描述、关联工具和使用场景。`,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
