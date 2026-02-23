/**
 * Agent Module - AI 智能体模块
 * 
 * 包含：
 * - AgentConfig: Agent 配置面板
 * - AgentAdmin: Agent 管理中心（新 - 统一配置）
 * - AgentControlCenter: Agent 控制中心
 * - Skills: 技能管理
 * - Memory: 记忆管理
 * - Tools: 工具管理
 */

export { default as AgentConfig } from './AgentConfig.vue'

// Admin（新设计）
export { 
  AgentAdmin, 
  AgentConfigPanel,
  CapabilityGraph,
  AgentHome,
  AgentCard, 
  AgentDetail 
} from './admin'

// Control Center
export { AgentControlCenter, useAgentControl } from './control'
export type { Agent, AgentStatus, Trigger, AgentCreateParams } from './control'

// Skills
export { 
  SkillManager, 
  SkillsManager,
  SkillDetailModal,
  SkillEditor, 
  SkillPreview, 
  SkillImport 
} from './skills'

// Memory
export { MemoryManager } from './memory'

// Tools
export { ToolsManager } from './tools'
