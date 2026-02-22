/**
 * Agent Module - AI 智能体模块
 * 
 * 包含：
 * - AgentConfig: Agent 配置面板
 * - AgentAdmin: Agent 管理中心
 * - AgentControlCenter: Agent 控制中心 (新)
 * - Skills: 技能管理
 * - Memory: 记忆管理
 * - Tools: 工具管理
 */

export { default as AgentConfig } from './AgentConfig.vue'

// Admin
export { AgentAdmin, AgentHome, AgentDetail, AgentCard } from './admin'

// Control Center (新)
export { AgentControlCenter, useAgentControl } from './control'
export type { Agent, AgentStatus, Trigger, AgentCreateParams } from './control'

// Skills
export { SkillManager, SkillEditor, SkillPreview, SkillImport } from './skills'

// Memory
export { MemoryManager } from './memory'

// Tools
export { ToolsManager } from './tools'
