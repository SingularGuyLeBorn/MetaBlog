/**
 * Core Composables - 核心逻辑组合式函数
 */

export { useAIChat } from './useAIChat'
// 统一使用 useAgentsUnified 替代 useAgents
export { useAgentsUnified as useAgents } from './useAgentsUnified'
export { generateAvatarUrl, getRandomAvatarId } from './useAgentsUnified'
export { useSkills } from './useSkills'

// Constants
export { LEVEL_CONFIG, PERMISSION_TEMPLATES, AVATAR_STYLES } from './useAgentsUnified'

// Types (从新模块导出)
export type {
  AgentLevel,
  AgentStatus,
  AgentPermission,
  Agent,
  AgentCreateParams,
  Trigger,
  TriggerType,
  FunctionCallConfig,
  MemoryConfig,
  LifecycleConfig,
  RuntimeConfig
} from './useAgentsUnified'

export type {
  Skill,
  SkillCreateParams,
  SkillCategory
} from './useSkills'
