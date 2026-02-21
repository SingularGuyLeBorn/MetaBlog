/**
 * Chat 状态管理 - 类型定义
 * 
 * 本文件包含所有 Chat 相关的类型定义
 */

// ═══════════════════════════════════════════════════════════════
// 基础类型
// ═══════════════════════════════════════════════════════════════

/** 消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

/** 消息状态 */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'error' | 'interrupted'

/** 会话状态 */
export type SessionStatus = 'active' | 'archived' | 'deleted'

/** 会话类型 */
export type SessionType = 'chat' | 'writing' | 'code' | 'debug'

// ═══════════════════════════════════════════════════════════════
// 消息类型
// ═══════════════════════════════════════════════════════════════

/**
 * 消息附件
 */
export interface MessageAttachment {
  /** 附件类型 */
  type: 'file' | 'image' | 'link' | 'article'
  /** 附件名称/标题 */
  name: string
  /** 附件 URL 或 ID */
  url: string
  /** 附件大小（字节） */
  size?: number
  /** MIME 类型 */
  mimeType?: string
}

/**
 * 消息元数据
 */
export interface MessageMetadata {
  /** Token 使用量 */
  tokens?: {
    prompt: number
    completion: number
    total: number
  }
  /** 模型名称 */
  model?: string
  /** 生成时间（毫秒） */
  generationTime?: number
  /** 费用估算 */
  cost?: number
  /** 温度设置 */
  temperature?: number
}

/**
 * 消息
 */
export interface Message {
  /** 唯一标识 */
  id: string
  /** 所属会话 */
  sessionId: string
  /** 消息角色 */
  role: MessageRole
  /** 消息内容 */
  content: string
  /** 深度思考过程 */
  reasoning?: string
  /** 消息状态 */
  status: MessageStatus
  /** 附件列表 */
  attachments?: MessageAttachment[]
  /** 引用文章 */
  attachedArticles?: { path: string; title: string }[]
  /** 元数据 */
  metadata?: MessageMetadata
  /** 错误信息 */
  error?: string
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 父消息 ID（用于引用） */
  parentId?: string
  /** 版本号（用于编辑历史） */
  version?: number
}

// ═══════════════════════════════════════════════════════════════
// 会话类型
// ═══════════════════════════════════════════════════════════════

/**
 * 会话配置
 */
export interface SessionConfig {
  /** 模型名称 */
  model?: string
  /** 温度 */
  temperature?: number
  /** 最大 Token */
  maxTokens?: number
  /** 系统提示词 */
  systemPrompt?: string
  /** 是否启用流式 */
  streaming?: boolean
}

/**
 * 会话统计
 */
export interface SessionStats {
  /** 消息总数 */
  messageCount: number
  /** Token 使用总数 */
  totalTokens: number
  /** 预估费用 */
  totalCost: number
}

/**
 * 会话
 */
export interface Session {
  /** 唯一标识 */
  id: string
  /** 会话标题 */
  title: string
  /** 会话类型 */
  type: SessionType
  /** 会话状态 */
  status: SessionStatus
  /** 会话配置 */
  config: SessionConfig
  /** 会话统计 */
  stats: SessionStats
  /** 创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
  /** 是否置顶 */
  isPinned?: boolean
  /** 标签 */
  tags?: string[]
}

// ═══════════════════════════════════════════════════════════════
// 流式类型
// ═══════════════════════════════════════════════════════════════

/**
 * 流式缓冲区块
 */
export interface StreamChunk {
  /** 块内容 */
  content: string
  /** 块类型 */
  type: 'text' | 'tool_call' | 'tool_result' | 'error'
  /** 块索引 */
  index: number
  /** 是否为最后一块 */
  isFinal?: boolean
}

/**
 * 流式缓冲区
 */
export interface StreamBuffer {
  /** 缓冲区 ID */
  id: string
  /** 关联消息 ID */
  messageId: string
  /** 缓冲内容 */
  content: string
  /** 缓冲的块 */
  chunks: StreamChunk[]
  /** 开始时间 */
  startTime: number
  /** 最后更新时间 */
  lastUpdate: number
}

// ═══════════════════════════════════════════════════════════════
// 错误类型
// ═══════════════════════════════════════════════════════════════

/**
 * Chat 错误类型
 */
export type ChatErrorType = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'INVALID_INPUT'
  | 'SESSION_NOT_FOUND'
  | 'MESSAGE_NOT_FOUND'
  | 'STREAM_ERROR'
  | 'UNKNOWN'

/**
 * Chat 错误
 */
export interface ChatError {
  /** 错误类型 */
  type: ChatErrorType
  /** 错误消息 */
  message: string
  /** 原始错误 */
  originalError?: Error
  /** 重试次数 */
  retryCount?: number
  /** 是否可重试 */
  retryable: boolean
}

// ═══════════════════════════════════════════════════════════════
// 选项类型
// ═══════════════════════════════════════════════════════════════

/**
 * Chat 全局选项
 */
export interface ChatOptions {
  /** 默认模型 */
  defaultModel: string
  /** 默认温度 */
  defaultTemperature: number
  /** 最大重试次数 */
  maxRetries: number
  /** 超时时间（毫秒） */
  timeout: number
  /** 是否启用流式 */
  streaming: boolean
  /** 自动保存间隔（毫秒） */
  autoSaveInterval: number
}

/**
 * 发送消息选项
 */
export interface SendMessageOptions {
  /** 是否使用流式 */
  stream?: boolean
  /** 附件列表 */
  attachments?: MessageAttachment[]
  /** 自定义配置 */
  config?: Partial<SessionConfig>
  /** 父消息 ID（用于引用） */
  parentId?: string
}

/**
 * 创建会话选项
 */
export interface CreateSessionOptions {
  /** 会话标题 */
  title?: string
  /** 会话类型 */
  type?: SessionType
  /** 初始配置 */
  config?: Partial<SessionConfig>
  /** 初始标签 */
  tags?: string[]
}

// ═══════════════════════════════════════════════════════════════
// API 响应类型
// ═══════════════════════════════════════════════════════════════

/**
 * API 响应
 */
export interface ApiResponse<T> {
  /** 是否成功 */
  success: boolean
  /** 响应数据 */
  data?: T
  /** 错误信息 */
  error?: ChatError
  /** 响应时间戳 */
  timestamp: number
}

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 页码（从 1 开始） */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[]
  /** 总数量 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总页数 */
  totalPages: number
  /** 是否有下一页 */
  hasNext: boolean
  /** 是否有上一页 */
  hasPrev: boolean
}

// ═══════════════════════════════════════════════════════════════
// 事件类型
// ═══════════════════════════════════════════════════════════════

/**
 * Chat 事件类型
 */
export type ChatEventType =
  | 'message:created'
  | 'message:updated'
  | 'message:deleted'
  | 'session:created'
  | 'session:switched'
  | 'session:deleted'
  | 'stream:start'
  | 'stream:chunk'
  | 'stream:end'
  | 'stream:error'
  | 'state:change'
  | 'error'

/**
 * Chat 事件
 */
export interface ChatEvent<T = unknown> {
  /** 事件类型 */
  type: ChatEventType
  /** 事件数据 */
  payload: T
  /** 时间戳 */
  timestamp: number
}

// ═══════════════════════════════════════════════════════════════
// 工具类型
// ═══════════════════════════════════════════════════════════════

/**
 * 分组会话
 */
export interface GroupedSessions {
  /** 今天的会话 */
  today: Session[]
  /** 昨天的会话 */
  yesterday: Session[]
  /** 最近7天的会话 */
  thisWeek: Session[]
  /** 更早的会话 */
  older: Session[]
}

/**
 * 消息分组
 */
export interface MessageGroup {
  /** 分组日期 */
  date: string
  /** 该日期的消息 */
  messages: Message[]
}

/**
 * 搜索过滤器
 */
export interface SessionFilter {
  /** 关键词 */
  query?: string
  /** 类型过滤 */
  type?: SessionType
  /** 标签过滤 */
  tags?: string[]
  /** 日期范围 */
  dateRange?: {
    start: number
    end: number
  }
}
