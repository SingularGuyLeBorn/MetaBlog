/**
 * Skills System - 技能系统
 * 
 * 设计原则：
 * - Skill 不定义"你是谁"（身份），只定义"你能做什么"（能力）
 * - Skill 提供工具使用场景、方法论、输入输出格式
 * - 身份由 Agent 的 baseRole 定义
 */

// 类型导出
export type {
  Skill,
  SkillCategory,
  SkillExample,
  SkillState,
  SkillSelectEvent
} from './types'

// 功能导出
export {
  initializeSkills,
  getAllSkills,
  getSkillsByCategory,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  onSkillSelect,
  setSkillsPanelVisible,
  isSkillsPanelVisible,
  toggleSkillsPanel,
  getCombinedCapabilityDescription
} from './registry'
