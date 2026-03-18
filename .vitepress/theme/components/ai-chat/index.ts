/**
 * AI Chat - 智能对话系统
 * 
 * 新目录结构：
 * - api/        API 和服务
 * - components/ UI 组件
 * - stores/     状态管理
 * - tools/      工具系统
 * - types/      类型定义
 * - utils/      工具函数
 */

// ===== API =====
export * from './api/services'
export * from './api/providers/types'
export { DeepSeekProvider } from './api/providers/DeepSeekProvider'
export { BaseProvider } from './api/providers/BaseProvider'
export * from './api/providers/models'

// ===== Stores =====
export * from './stores'

// ===== Tools =====
export * from './tools'

// ===== Types =====
export * from './types'

// ===== Utils =====
export * from './utils'

// ===== Components =====
// Chat 组件
export { default as ChatLayout } from './components/chat/ChatLayout.vue'
export { default as ChatInput } from './components/chat/ChatInput.vue'
export { default as MessageList } from './components/chat/MessageList.vue'
export { default as MessageBubble } from './components/chat/MessageBubble.vue'
export { default as SessionPanel } from './components/chat/SessionPanel.vue'
export { default as SessionManager } from './components/chat/SessionManager.vue'
export { default as SettingsPanel } from './components/chat/SettingsPanel.vue'

// Agent 组件
export {
  AgentAdmin,
  AgentCard,
  AgentConfigPanel,
  AgentDetail,
  SkillsPanel
} from './components/agent'
