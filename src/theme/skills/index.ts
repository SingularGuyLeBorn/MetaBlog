/**
 * ============================================================================
 * Skill 系统 - index
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/skills
 */


// ═══════════════════════════════════════════════════════════════
// 类型导出
// ═══════════════════════════════════════════════════════════════

export type {
  ActiveSkill,
  // 运行时相关
  ParsedSkillFile,
  // Prompt 构建相关
  PromptBuildContext,
  PromptBuildOptions, Skill, SkillCategory, SkillLoaderConfig, SkillMatchOptions, SkillMatchRecord,
  // 匹配相关
  SkillMatchResult,
  // 基础类型
  SkillMetadata, SkillRuntimeState,
  // 工具相关
  ToolDefinition
} from './types'

export type { SkillLoaderAPI } from './skillLoader'

// ═══════════════════════════════════════════════════════════════
// 核心功能导出
// ═══════════════════════════════════════════════════════════════

// Skill 解析器 - 解析 Markdown 文件
export {
  buildSkillFromContent, BUILTIN_SKILL_IDS, extractSkillIdFromPath, loadAllSkillsFromFS, loadSkillsFromDirectory, parseSkillFile, SKILL_CATEGORY_MAP
} from './skillParser'

// Skill 匹配器 - 意图匹配
export {
  debugMatch, matchSkills,
  matchSkillsWithContext,
  quickMatchSkills
} from './skillMatcher'

// Prompt 构建器 - System Prompt 生成
export {
  analyzePromptTokens, buildFullPrompt, buildMinimalPrompt, buildSystemPrompt, buildToolsOnlyPrompt,
  estimateTokens
} from './promptBuilder'

// Skill Loader - 主入口
export {
  addGlobalActiveSkill, autoActivateSkills, createSkillFromContent, getGlobalActiveSkills, getGlobalSkills, loadBuiltinSkills, setGlobalActiveSkills, setGlobalSkills, suggestSkills, useSkillLoader
} from './skillLoader'

// ═══════════════════════════════════════════════════════════════
// 便捷入口
// ═══════════════════════════════════════════════════════════════

import { buildFullPrompt, buildSystemPrompt } from './promptBuilder'
import { autoActivateSkills, suggestSkills, useSkillLoader } from './skillLoader'
import { matchSkills, quickMatchSkills } from './skillMatcher'

/**
 * 快速使用 Skills 系统的便捷函数
 * 
 * 适用于简单的使用场景,无需管理 Vue 响应式状态
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

