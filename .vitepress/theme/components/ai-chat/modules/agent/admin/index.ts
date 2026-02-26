/**
 * Agent Admin - Agent 管理中心组件（重构版）
 */

// 新的统一配置面板（推荐）
export { default as AgentAdmin } from './AgentAdmin.vue'
export { default as AgentConfigPanel } from './AgentConfigPanel.vue'
export { default as CapabilityGraph } from './CapabilityGraph.vue'
export { default as TriggerConfig } from './TriggerConfig.vue'
export { default as GlassSelect } from './GlassSelect.vue'

// 旧组件（保留兼容）
export { default as AgentHome } from './AgentHome.vue'
export { default as AgentDetail } from './AgentDetail.vue'
export { default as AgentCard } from './AgentCard.vue'
export { default as LogDashboard } from './LogDashboard.vue'
