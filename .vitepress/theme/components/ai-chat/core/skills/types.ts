/**
 * Skills System - 技能系统类型定义
 * 
 * 设计原则：
 * - Skill 不定义"你是谁"（身份），只定义"你能做什么"（能力）
 * - Skill 提供工具使用场景、方法论、输入输出格式
 * - 身份由 Agent 的 baseRole 定义
 * 
 * 技能 vs 工具的区别：
 * - 工具（Tool）：AI可调用的功能函数，如获取文章、创建文件等
 * - 技能（Skill）：AI的能力模块，定义"在什么场景下使用什么工具"
 */

/** 技能定义 */
export interface Skill {
  /** 唯一ID */
  id: string
  /** 显示名称 */
  name: string
  /** 图标 */
  icon: string
  /** 简短描述 - 用于列表展示 */
  description: string
  /** 
   * 能力描述 - 告诉 AI 如何使用这项技能
   * 不是身份定义，而是场景说明、工具使用指南、方法论
   */
  capabilityDescription: string
  /** 使用场景示例 */
  usageScenarios?: string[]
  /** 技能分类 */
  category: SkillCategory
  /** 是否内置 */
  isBuiltIn: boolean
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 是否启用 */
  enabled: boolean
  /** 标签 */
  tags: string[]
  /** 示例对话 */
  examples?: SkillExample[]
  /** 关联的工具 */
  tools: string[]
  /** 作者 */
  author?: string
}

/** 技能分类 */
export type SkillCategory = 
  | 'general'      // 通用
  | 'writing'      // 写作
  | 'coding'       // 编程
  | 'analysis'     // 分析
  | 'creative'     // 创意
  | 'custom'       // 自定义

/** 技能示例对话 */
export interface SkillExample {
  user: string
  assistant: string
}

/** 技能状态 */
export interface SkillState {
  /** 当前激活的技能ID */
  activeSkillId: string | null
  /** 所有技能 */
  skills: Skill[]
  /** 是否显示技能面板 */
  showPanel: boolean
}

/** 技能选择事件 */
export interface SkillSelectEvent {
  skill: Skill | null
  previousSkill: Skill | null
}
