/**
 * AI Chat 组件入口
 * 
 * 完全自包含的 AI Chat 模块：
 * - features: UI 组件
 * - layouts: 布局组件
 * - ui: 基础 UI 组件
 * - composables: 逻辑层
 * - services: API 和存储层
 * - styles: 样式
 */

// UI 基础组件
export { Avatar, Button, Icon } from './ui'

// 功能组件
export {
  SessionPanel,
  MessageList,
  MessageBubble,
  ChatInput,
  SettingsPanel
} from './features'

// 布局组件
export { default as ChatLayout } from './layouts/ChatLayout.vue'

// Composables
export { useAIChat } from './composables'

// Services（如需外部使用）
export { aiService, storage } from './services'

// 类型导出
export type {
  ChatSession,
  ChatMessage,
  SessionConfig,
  ModelType,
  MessageRole,
  MessageStatus,
  ReasoningContent,
  StreamCallbacks
} from './composables/types'
