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
export { aiService } from '../../api/services/aiService'
export { storage } from '../../api/services/storage'
export { DeepSeekProvider } from '../../api/providers/DeepSeekProvider'
export { BaseProvider } from '../../api/providers/BaseProvider'
export * from '../../api/providers/models'

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
} from '../../api/providers/types'

// ===== Stores =====
export * from '../../stores'

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
} from '../../tools'

// 平台解析工具（从子模块导出）
export {
  parseZhihuDef,
  parseXiaohongshuDef,
  parseWechatDef,
  parsePlatformLinkDef,
  ocrImageDef,
  processImageDef,
} from '../../tools/platform'

export type {
  ToolDefinition,
  ToolExecutor,
  ToolRegistration,
  ToolCallRecord,
  ThinkingStep,
} from '../../tools/types'

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
} from '../../types/chat'

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
} from '../../types/agent'

// ===== Utils =====
export * from '../../utils'

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
} from '../agent'
