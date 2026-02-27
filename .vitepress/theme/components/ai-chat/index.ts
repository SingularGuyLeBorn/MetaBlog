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

// ===== Core Types =====
export type {
  MessageRole,
  MessageStatus,
  ModelType,
  ReasoningContent,
  MessageAttachment,
  TokenUsage,
  MessageMetadata,
  MessageVersion,
  ChatMessage,
  MessageGroup,
  SessionConfig,
  SessionStats,
  ChatSession,
  GroupedSessions,
  DeepSeekRequest,
  DeepSeekStreamChunk,
  StreamCallbacks,
  ChatState,
  PersistedData,
  PersistedDataV2,
  StreamState,
  LogLevel,
  LogEntry
} from './core/types'

// ===== Core Types（新统一 Agent 类型） =====
export {
  CONFIG_MODES
} from './core/types/agent'

export type {
  Agent,
  AgentLevel,
  AgentStatus,
  AgentCapabilities,
  AgentConfigMode,
  AgentCreateParams,
  AgentUpdateParams,
  Skill,
  SkillCategory,
  SkillCreateParams,
  Tool,
  CapabilityGraph,
  CapabilityNode,
  ConfigModeInfo
} from './core/types/agent'

// ===== Modules - Agent =====
// 注意：CapabilityGraph 已经包含在下面的导出中
export { 
  AgentConfig,
  AgentAdmin, 
  AgentConfigPanel,
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
