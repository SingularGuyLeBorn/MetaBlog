/**
 * Skills System - Claude Code 风格的 Skills + Tools 整合
 * 
 * 导出所有 Skills 相关功能
 * 
 * @example
 * ```typescript
 * // Vue 组件中使用
 * import { useSkillLoader } from './skills'
 * 
 * const { 
 *   availableSkills, 
 *   activeSkills,
 *   loadSkills,
 *   matchSkills,
 *   activateSkill,
 *   buildSystemPrompt 
 * } = useSkillLoader()
 * 
 * // 初始化
 * onMounted(loadSkills)
 * 
 * // 发送消息时
 * const matches = matchSkills(userInput)
 * matches.forEach(m => activateSkill(m.skill.id, 'auto', m.score))
 * const systemPrompt = buildSystemPrompt('AI 助手', userInput, tools)
 * ```
 */

// ═══════════════════════════════════════════════════════════════
// 类型导出
// ═══════════════════════════════════════════════════════════════

export type {
  // 基础类型
  SkillMetadata,
  Skill,
  ActiveSkill,
  SkillCategory,
  
  // 匹配相关
  SkillMatchResult,
  SkillMatchOptions,
  
  // Prompt 构建相关
  PromptBuildContext,
  PromptBuildOptions,
  
  // 工具相关
  ToolDefinition,
  
  // 运行时相关
  ParsedSkillFile,
  SkillLoaderConfig,
  SkillRuntimeState,
  SkillMatchRecord
} from './types'

export type { SkillLoaderAPI } from './skillLoader'

// ═══════════════════════════════════════════════════════════════
// 核心功能导出
// ═══════════════════════════════════════════════════════════════

// Skill 解析器 - 解析 Markdown 文件
export {
  parseSkillFile,
  buildSkillFromContent,
  loadSkillsFromDirectory,
  loadAllSkillsFromFS,
  extractSkillIdFromPath,
  BUILTIN_SKILL_IDS,
  SKILL_CATEGORY_MAP
} from './skillParser'

// Skill 匹配器 - 意图匹配
export {
  matchSkills,
  matchSkillsWithContext,
  quickMatchSkills,
  debugMatch
} from './skillMatcher'

// Prompt 构建器 - System Prompt 生成
export {
  buildSystemPrompt,
  buildMinimalPrompt,
  buildFullPrompt,
  buildToolsOnlyPrompt,
  estimateTokens,
  analyzePromptTokens
} from './promptBuilder'

// Skill Loader - 主入口
export {
  useSkillLoader,
  loadBuiltinSkills,
  createSkillFromContent,
  autoActivateSkills,
  suggestSkills,
  setGlobalSkills,
  getGlobalSkills,
  setGlobalActiveSkills,
  getGlobalActiveSkills,
  addGlobalActiveSkill
} from './skillLoader'

// ═══════════════════════════════════════════════════════════════
// 便捷入口
// ═══════════════════════════════════════════════════════════════

import { useSkillLoader, autoActivateSkills, suggestSkills } from './skillLoader'
import { matchSkills, quickMatchSkills } from './skillMatcher'
import { buildSystemPrompt, buildFullPrompt } from './promptBuilder'

/**
 * 快速使用 Skills 系统的便捷函数
 * 
 * 适用于简单的使用场景，无需管理 Vue 响应式状态
 */
export const SkillsAPI = {
  /**
   * 匹配 Skills (纯函数)
   */
  match: matchSkills,
  
  /**
   * 快速匹配 (用于实时建议)
   */
  quickMatch: quickMatchSkills,
  
  /**
   * 构建 System Prompt (纯函数)
   */
  buildPrompt: buildSystemPrompt,
  
  /**
   * 构建完整 Prompt (包含所有层级)
   */
  buildFullPrompt: buildFullPrompt,
  
  /**
   * 自动匹配并激活
   */
  autoActivate: autoActivateSkills,
  
  /**
   * 获取建议
   */
  suggest: suggestSkills
}

// ═══════════════════════════════════════════════════════════════
// 默认导出 Vue Hook
// ═══════════════════════════════════════════════════════════════

export { useSkillLoader as default }
