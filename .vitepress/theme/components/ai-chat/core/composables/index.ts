/**
 * Core Composables - 核心逻辑组合式函数
 */

export { useAIChat } from './useAIChat'

// 新的统一 Agent 配置系统（推荐）
export { useAgentConfig } from './useAgentConfig'

// 旧的实现（保留兼容性）
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

// 新的统一类型
export type {
  Agent as AgentV2,
  AgentConfigMode,
  AgentCapabilities,
  Skill as SkillV2,
  Tool,
  CapabilityGraph,
  CapabilityNode,
  ConfigModeInfo
} from '../types/agent'
