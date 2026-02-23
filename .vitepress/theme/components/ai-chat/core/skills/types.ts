/**
 * Skills System - 技能系统类型定义
 * 
 * 技能 vs 工具的区别：
 * - 工具（Tool）：AI可调用的功能函数，如获取文章、创建文件等
 * - 技能（Skill）：AI的角色配置，包含系统提示词和预设能力，影响AI的行为方式
 */

/** 技能定义 */
export interface Skill {
  /** 唯一ID */
  id: string
  /** 显示名称 */
  name: string
  /** 图标 */
  icon: string
  /** 描述 */
  description: string
  /** 系统提示词（定义AI角色） */
  systemPrompt: string
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
  tools?: string[]
  /** 模型配置覆盖 */
  modelConfig?: {
    temperature?: number
    maxTokens?: number
  }
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
