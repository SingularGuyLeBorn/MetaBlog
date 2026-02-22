/**
 * AI Chat - 智能对话系统
 * 
 * 目录结构：
 * - core/       核心逻辑（composables, services, types）
 * - modules/    功能模块（agent, chat）
 * - ui/         通用 UI 组件
 * - styles/     样式文件
 * - layouts/    布局组件
 */

// ===== Core =====
export * from './core/composables'
export * from './core/services'

// ===== Modules - Agent =====
export { 
  AgentConfig,
  AgentAdmin, 
  AgentHome,
  AgentCard, 
  AgentDetail,
  SkillManager, 
  SkillEditor, 
  SkillPreview, 
  SkillImport,
  MemoryManager,
  ToolsManager
} from './modules/agent'

// ===== Modules - Chat =====
export { SessionPanel } from './modules/chat/session'
export { MessageList, MessageBubble, MessageVersions } from './modules/chat/messages'
export { ChatInput } from './modules/chat/input'
export { SettingsPanel } from './modules/chat/settings'

// ===== Layouts =====
export { default as ChatLayout } from './layouts/ChatLayout.vue'

// ===== UI =====
export * from './ui'
