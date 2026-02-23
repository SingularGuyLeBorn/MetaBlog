/**
 * Skills System - 技能系统
 * 
 * 技能是AI的角色配置，包含系统提示词和预设能力
 * 与工具（Tool）不同，技能影响AI的行为方式，而不是提供可调用的功能
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
  getActiveSkill,
  getActiveSystemPrompt,
  activateSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  onSkillChange,
  isPanelVisible,
  setPanelVisible,
  togglePanel,
  getActiveSkillTools
} from './registry'
