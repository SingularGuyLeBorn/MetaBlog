/**
 * ============================================================================
 * 组件逻辑 - index
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/components
 */


// ===== API =====
export { BaseProvider } from '@/theme/api/providers/BaseProvider'
export { DeepSeekProvider } from '@/theme/api/providers/DeepSeekProvider'
export * from '@/theme/api/providers/models'
export { aiService } from '@/theme/api/services/aiService'
export { storage } from '@/theme/api/services/storage'

// Provider types (避免与 tools/types 和 chat/types 重复导出)
export type {
  ChatOptions, ContentPart, IProvider, ModelCapabilities, ModelInfo, ModelPricing, ProviderInfo, StreamCallbacks as ProviderStreamCallbacks,
  ToolCall as ProviderToolCall,
  ToolDefinition as ProviderToolDefinition, StandardMessage, ToolResult
} from '@/theme/api/providers/types'

// ===== Stores =====
export * from '@/theme/stores'

// ===== Tools (避免与 provider types 冲突) =====
export {
  clearTools, executeTool,
  executeToolWithRecord, getRegisteredToolNames, getTool, getToolCount, getToolDefinitions, hasTool, initializeDefaultTools, registerTool,
  registerTools, unregisterTool
} from '@/theme/tools'

// 平台解析工具(从子模块导出)
export {
  ocrImageDef, readArticleDef
} from '@/theme/tools/platform'

export type {
  ThinkingStep, ToolCallRecord, ToolDefinition,
  ToolExecutor,
  ToolRegistration
} from '@/theme/tools/types'

// ===== Types (避免与其他导出冲突) =====
export type {
  AttachmentType, ChatMessage, ChatSession, ChatState, DeepSeekRequest,
  DeepSeekStreamChunk, GroupedSessions, MessageAttachment, MessageGroup, MessageMetadata, MessageRole,
  MessageStatus, MessageVersion, ModelType, PersistedData,
  PersistedDataV2, ReasoningContent, SessionConfig,
  SessionStats, StreamState, TokenUsage
} from '@/theme/types/chat'

export type {
  Agent, AgentCapabilities,
  AgentConfigMode,
  AgentCreateParams, AgentLevel, AgentMemory, AgentPermission, AgentStatus, AgentUpdateParams, CapabilityEdge,
  CapabilityGraph, CapabilityNode, Skill,
  SkillCategory,
  SkillCreateParams, SystemPromptContext, Tool
} from '@/theme/types/agent'

// ===== Utils =====
export * from '@/theme/utils'

// ===== Components =====
// Chat 组件
export { default as ChatHeader } from './ChatHeader.vue'
export { default as ChatInput } from './ChatInput.vue'
export { default as ChatLayout } from './ChatLayout.vue'
export { default as FinalResponse } from './FinalResponse.vue'
export { default as MessageBubble } from './MessageBubble.vue'
export { default as MessageList } from './MessageList.vue'
export { default as SessionManager } from './SessionManager.vue'
export { default as SessionPanel } from './SessionPanel.vue'
export { default as SettingsPanel } from './SettingsPanel.vue'
export { default as StreamStatusIndicator } from './StreamStatusIndicator.vue'
export { default as SystemPromptEditor } from './SystemPromptEditor.vue'
export { default as ThinkingTimeline } from './ThinkingTimeline.vue'
export { default as ToolResultSidebar } from './ToolResultSidebar.vue'

// Agent 组件
export {
  AgentAdmin,
  AgentCard,
  AgentConfigPanel,
  AgentDetail,
  SkillsPanel
} from '@/theme/components/agent'

