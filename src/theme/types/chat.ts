/**
 * ============================================================================
 * 类型定义 - chat
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/types
 */


// ═══════════════════════════════════════════════════════════════
// 基础类型
// ═══════════════════════════════════════════════════════════════

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/** 消息状态 */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error' | 'interrupted'

/** 模型类型 - 精简为 DeepSeek V4 + Kimi K2.5 */
/**
 * ModelType 类型别名
 *
 */
export type ModelType =
  // DeepSeek V4 模型
  | 'deepseek-v4-pro'
  | 'deepseek-v4-flash'
  // Kimi K2.5 模型
  | 'kimi-k2.5'

/** 深度思考内容 */
/**
 * ReasoningContent 接口定义
 *
 */
export interface ReasoningContent {
  content: string
  isVisible: boolean
}

// ═══════════════════════════════════════════════════════════════
// 消息类型
// ═══════════════════════════════════════════════════════════════

/** 消息附件类型 */
/**
 * AttachmentType 类型别名
 *
 */
export type AttachmentType = 'file' | 'image' | 'video' | 'audio' | 'link'

/** 消息附件 */
/**
 * MessageAttachment 接口定义
 *
 */
export interface MessageAttachment {
  /** 附件唯一标识 */
  id?: string
  /** 附件类型 */
  type: AttachmentType
  /** 文件名/标题 */
  name: string
  /** 文件URL(本地blob URL或远程URL) */
  url: string
  /** 文件大小(字节) */
  size?: number
  /** MIME类型 */
  mimeType?: string
  /** 图片/视频宽度 */
  width?: number
  /** 图片/视频高度 */
  height?: number
  /** 视频时长(秒) */
  duration?: number
  /** 视频缩略图 */
  thumbnail?: string
  /** 上传状态 */
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error'
  /** 上传进度(0-100) */
  progress?: number
  /** 错误信息 */
  error?: string
  /** OCR 提取的文字(仅图片,由后端提取后注入,不展示给用户) */
  ocrText?: string
}

/** Token 使用统计 */
/**
 * TokenUsage 接口定义
 *
 */
export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

import type { ThinkingStep, ToolCall, ToolCallRecord } from '@/theme/tools'

/** 重新导出工具类型 */
export type { ThinkingStep, ToolCall, ToolCallRecord }

/** 消息元数据 */
export interface MessageMetadata {
  model?: string
  temperature?: number
  tokens?: TokenUsage
  generationTime?: number
  toolCalls?: ToolCall[]
  toolCallId?: string
  toolName?: string
  /** UI 显示用的技能信息 */
  skill?: {
    id: string
    name: string
    icon: string
    content?: string
  }
  /** 工具调用记录(用于展示完整调用过程) */
  toolRecords?: ToolCallRecord[]
  /** 思考步骤(用于分步展示思考过程) */
  thinkingSteps?: ThinkingStep[]
  /** 错误信息(当消息处理出错时) */
  error?: string
  /** 是否已经显示过打字机效果 */
  typewriterShown?: boolean
}

/** AI 响应版本 */
export interface MessageVersion {
  id: string
  content: string
  reasoning?: ReasoningContent
  status: MessageStatus
  metadata?: MessageMetadata
  createdAt: number
  model: string
}

/** 消息对象 */
/**
 * ChatMessage 接口定义
 *
 */
export interface ChatMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  reasoning?: ReasoningContent
  status: MessageStatus
  attachments?: MessageAttachment[]
  metadata?: MessageMetadata
  createdAt: number
  updatedAt: number

  // === 版本管理(仅 AI 消息使用)===
  /** 关联的用户消息 ID(AI 响应时必填) */
  parentMessageId?: string
  /** 是否为当前激活的版本 */
  isActiveVersion?: boolean
}

/** 消息组(一个用户查询 + 多个 AI 响应版本) */
/**
 * MessageGroup 接口定义
 *
 */
export interface MessageGroup {
  /** 用户消息 */
  userMessage: ChatMessage
  /** AI 响应版本数组 */
  aiVersions: ChatMessage[]
  /** 当前显示的版本索引 */
  currentVersionIndex: number
  /** 
   * 系统注入的消息(如 loadSkill 加载的 skill 内容)
   * 这些消息会包含在对话历史中,但不会显示为独立的消息组
   */
  injectedMessages?: ChatMessage[]
}

// ═══════════════════════════════════════════════════════════════
// 会话类型
// ═══════════════════════════════════════════════════════════════

/** 会话配置 */
/**
 * SessionConfig 接口定义
 *
 */
export interface SessionConfig {
  model: ModelType
  temperature: number
  maxTokens: number
  systemPrompt: string
  enableReasoning: boolean
  /** DeepSeek V4 Pro 推理强度: high(标准) / max(深度) */
  reasoningEffort?: 'high' | 'max'
  streaming: boolean
  /** 内部使用：标记 systemPrompt 是否已自定义 */
  _customSystemPrompt?: boolean
  /** Agent ID,用于工具权限校验 */
  agentId?: string
  /** 可用的 Skill IDs */
  availableSkills?: string[]
  /** Skills 声明的工具列表 */
  declaredTools?: string[]
  /** Agent 实际可用的工具列表 */
  availableTools?: string[]
}

/** 会话统计 */
/**
 * SessionStats 接口定义
 *
 */
export interface SessionStats {
  messageCount: number
  totalTokens: number
}

/** 会话对象 */
/**
 * ChatSession 接口定义
 *
 */
export interface ChatSession {
  id: string
  title: string
  config: SessionConfig
  stats: SessionStats
  createdAt: number
  updatedAt: number
}

/** 会话分组 */
/**
 * GroupedSessions 接口定义
 *
 */
export interface GroupedSessions {
  today: ChatSession[]
  yesterday: ChatSession[]
  thisWeek: ChatSession[]
  older: ChatSession[]
}

// ═══════════════════════════════════════════════════════════════
// API 相关类型
// ═══════════════════════════════════════════════════════════════

/** DeepSeek API 请求 */
/**
 * DeepSeekRequest 接口定义
 *
 */
export interface DeepSeekRequest {
  model: string
  messages: Array<{ role: MessageRole; content: string }>
  temperature: number
  max_tokens: number
  stream: boolean
}

/** DeepSeek 流式响应 Chunk */
/**
 * DeepSeekStreamChunk 接口定义
 *
 */
export interface DeepSeekStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: MessageRole
      content?: string
      reasoning_content?: string
    }
    finish_reason: string | null
  }>
}

/** 流式回调 */
/**
 * StreamCallbacks 接口定义
 *
 * V2 扩展：增加阶段变化、工具调用、增量更新等回调.
 * 旧字段(onContent/onReasoning)保持兼容,新字段均为可选.
 */
export interface StreamCallbacks {
  /** 传统内容回调(完整内容,非增量) */
  onContent: (content: string) => void
  /** 传统推理回调(完整推理内容) */
  onReasoning: (reasoning: string) => void
  /** 思考步骤回调(兼容旧接口) */
  onThinkingStep?: (step: ThinkingStep) => void
  /** 工具记录回调(兼容旧接口) */
  onToolRecord?: (record: ToolCallRecord) => void
  /** Token 用量回调 */
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  /** Token 估算回调 */
  onTokenEstimate?: (estimate: number) => void
  /** 完成回调 */
  onComplete: () => void
  /** 错误回调 */
  onError: (error: Error) => void

  // === V2 新增回调(可选) ===
  /** 阶段变化 */
  onPhaseChange?: (phase: import('./stream').StreamPhase, prevPhase: import('./stream').StreamPhase) => void
  /** 流式进度(包含所有 buffer 的实时更新) */
  onStreamProgress?: (progress: import('./stream').StreamProgress) => void
  /** 推理内容增量 */
  onReasoningDelta?: (delta: string, full: string) => void
  /** 最终回复增量(仅在 responding 阶段回调) */
  onContentDelta?: (delta: string, full: string) => void
  /** 中间文本增量(仅在 thinking 阶段回调) */
  onIntermediateDelta?: (delta: string, full: string) => void
  /** 工具调用开始 */
  onToolCallStart?: (item: import('./stream').ToolChainItem) => void
  /** 工具调用更新 */
  onToolCallUpdate?: (item: import('./stream').ToolChainItem) => void
  /** 工具调用完成 */
  onToolCallComplete?: (item: import('./stream').ToolChainItem) => void
}

// ═══════════════════════════════════════════════════════════════
// 状态管理类型
// ═══════════════════════════════════════════════════════════════

/** Chat 全局状态 */
/**
 * ChatState 接口定义
 *
 */
export interface ChatState {
  sessions: ChatSession[]
  currentSessionId: string | null
  messages: Record<string, ChatMessage[]>
  isStreaming: boolean
  error: string | null
}

/** 持久化数据结构 */
/**
 * PersistedData 接口定义
 *
 */
export interface PersistedData {
  sessions: ChatSession[]
  messages: Record<string, ChatMessage[]>
  lastSessionId: string | null
  version: number
}

/** 消息版本化的持久化数据结构(v2) */
/**
 * PersistedDataV2 接口定义
 *
 */
export interface PersistedDataV2 {
  sessions: ChatSession[]
  /** 按会话存储的消息组 */
  messageGroups: Record<string, MessageGroup[]>
  lastSessionId: string | null
  version: 2
}

/** 生成状态 */
export interface StreamState {
  isStreaming: boolean
  abortController: AbortController | null
  currentAiMsgId: string | null
}

// ═══════════════════════════════════════════════════════════════
// 日志类型
// ═══════════════════════════════════════════════════════════════

/**
 * LogLevel 类型别名
 *
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * LogEntry 接口定义
 *
 */
export interface LogEntry {
  level: LogLevel
  module: string
  message: string
  data?: any
  timestamp: number
}

// ═══════════════════════════════════════════════════════════════
// 重新导出 Agent 类型
// ═══════════════════════════════════════════════════════════════

export type {
  Agent, AgentCapabilities,
  AgentConfigMode,
  AgentCreateParams, AgentLevel, AgentMemory, AgentPermission, AgentStatus, AgentUpdateParams, CapabilityEdge,
  CapabilityGraph, CapabilityNode, Skill,
  SkillCategory,
  SkillCreateParams, SystemPromptContext, Tool
} from './agent'

