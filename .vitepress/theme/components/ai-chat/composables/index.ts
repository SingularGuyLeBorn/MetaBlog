/**
 * AI Chat Composables 入口
 * 
 * 统一导出：
 * - useAIChat: 核心聊天逻辑
 * - types: 所有类型定义
 */

export { useAIChat } from './useAIChat'

// 类型导出
export type {
  MessageRole,
  MessageStatus,
  ModelType,
  ReasoningContent,
  MessageAttachment,
  TokenUsage,
  MessageMetadata,
  ChatMessage,
  SessionConfig,
  SessionStats,
  ChatSession,
  GroupedSessions,
  DeepSeekRequest,
  DeepSeekStreamChunk,
  StreamCallbacks,
  ChatState,
  PersistedData,
  StreamState,
  LogLevel,
  LogEntry
} from './types'
