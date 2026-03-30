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
export { aiService } from '@/theme/api/services/aiService'
export { storage } from '@/theme/api/services/storage'
export { DeepSeekProvider } from '@/theme/api/providers/DeepSeekProvider'
export { BaseProvider } from '@/theme/api/providers/BaseProvider'
export * from '@/theme/api/providers/models'

// Provider types (避免与 tools/types 和 chat/types 重复导出)
export type {
  IProvider,
  ProviderInfo,
  ModelInfo,
  ModelCapabilities,
  ModelPricing,
  ChatOptions,
  ToolResult,
  StandardMessage,
  ContentPart,
  StreamCallbacks as ProviderStreamCallbacks,
  ToolCall as ProviderToolCall,
  ToolDefinition as ProviderToolDefinition,
} from '@/theme/api/providers/types'

// ===== Stores =====
export * from '@/theme/stores'

// ===== Tools (避免与 provider types 冲突) =====
export {
  registerTool,
  registerTools,
  getTool,
  hasTool,
  executeTool,
  executeToolWithRecord,
  getToolDefinitions,
  getRegisteredToolNames,
  getToolCount,
  unregisterTool,
  clearTools,
  initializeDefaultTools,
} from '@/theme/tools'

// 平台解析工具（从子模块导出）
export {
  parseZhihuDef,
  parseXiaohongshuDef,
  parseWechatDef,
  parsePlatformLinkDef,
  ocrImageDef,
  processImageDef,
} from '@/theme/tools/platform'

export type {
  ToolDefinition,
  ToolExecutor,
  ToolRegistration,
  ToolCallRecord,
  ThinkingStep,
} from '@/theme/tools/types'

// ===== Types (避免与其他导出冲突) =====
export type {
  MessageRole,
  MessageStatus,
  ModelType,
  ReasoningContent,
  AttachmentType,
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
  ChatState,
  PersistedData,
  PersistedDataV2,
  StreamState,
} from '@/theme/types/chat'

export type {
  Agent,
  AgentLevel,
  AgentStatus,
  AgentPermission,
  AgentMemory,
  AgentCapabilities,
  AgentConfigMode,
  AgentCreateParams,
  AgentUpdateParams,
  Skill,
  SkillCategory,
  SkillCreateParams,
  Tool,
  CapabilityNode,
  CapabilityEdge,
  CapabilityGraph,
  SystemPromptContext,
} from '@/theme/types/agent'

// ===== Utils =====
export * from '@/theme/utils'

// ===== Components =====
// Chat 组件
export { default as ChatLayout } from './ChatLayout.vue'
export { default as ChatInput } from './ChatInput.vue'
export { default as MessageList } from './MessageList.vue'
export { default as MessageBubble } from './MessageBubble.vue'
export { default as SessionPanel } from './SessionPanel.vue'
export { default as SessionManager } from './SessionManager.vue'
export { default as SettingsPanel } from './SettingsPanel.vue'

// Agent 组件
export {
  AgentAdmin,
  AgentCard,
  AgentConfigPanel,
  AgentDetail,
  SkillsPanel
} from '@/theme/components/agent'
