/**
 * Provider 类型定义
 * 统一的模型厂商接口规范
 */

import type { ChatMessage, SessionConfig } from '../../types'

/** 模型能力标识 */
export interface ModelCapabilities {
  /** 支持视觉/图片理解 */
  vision: boolean
  /** 支持视频理解 */
  video: boolean
  /** 支持函数调用 */
  functionCalling: boolean
  /** 支持流式输出 */
  streaming: boolean
  /** 支持思考/推理 */
  reasoning: boolean
}

/** 模型定价信息（每1K tokens） */
export interface ModelPricing {
  /** 输入价格（元/1K tokens） */
  input: number
  /** 输出价格（元/1K tokens） */
  output: number
}

/** 模型信息 */
export interface ModelInfo {
  /** 模型唯一ID */
  id: string
  /** 显示名称 */
  name: string
  /** 简短描述 */
  description: string
  /** 详细描述 */
  fullDescription?: string
  /** 所属厂商ID */
  providerId: string
  /** 模型能力 */
  capabilities: ModelCapabilities
  /** 上下文窗口大小 */
  contextWindow: number
  /** 最大输出tokens */
  maxOutputTokens: number
  /** 定价信息 */
  pricing?: ModelPricing
  /** 推荐温度 */
  defaultTemperature: number
  /** 是否推荐 */
  recommended?: boolean
  /** 模型标签 */
  tags?: string[]
  /** 图标/颜色主题 */
  theme?: {
    primaryColor: string
    secondaryColor?: string
    icon?: string
  }
}

/** 厂商信息 */
export interface ProviderInfo {
  /** 厂商唯一ID */
  id: string
  /** 显示名称 */
  name: string
  /** 厂商描述 */
  description: string
  /** 厂商图标 */
  icon?: string
  /** 主题色 */
  themeColor: string
  /** 官网链接 */
  website?: string
}

/** 流式回调 */
export interface StreamCallbacks {
  /** 收到内容片段 */
  onContent: (text: string) => void
  /** 收到思考内容（如 DeepSeek Reasoner） */
  onReasoning?: (text: string) => void
  /** 收到工具调用 */
  onToolCall?: (toolCall: ToolCall) => void
  /** 完成 */
  onComplete?: () => void
  /** 出错 */
  onError?: (error: Error) => void
}

/** 工具调用定义 */
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

/** 工具定义 */
export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required?: string[]
  }
}

/** 聊天选项 */
export interface ChatOptions {
  /** 消息历史 */
  messages: ChatMessage[]
  /** 会话配置 */
  config: SessionConfig
  /** 可用工具 */
  tools?: ToolDefinition[]
  /** 信号（用于取消） */
  signal?: AbortSignal
}

/** 工具调用结果 */
export interface ToolResult {
  toolCallId: string
  name: string
  result: any
  error?: string
}

/** Provider 接口 - 所有模型厂商必须实现 */
export interface IProvider {
  /** 厂商信息 */
  readonly info: ProviderInfo
  
  /** 获取该厂商支持的所有模型 */
  getModels(): ModelInfo[]
  
  /** 获取指定模型信息 */
  getModel(modelId: string): ModelInfo | undefined
  
  /** 检查模型是否支持 */
  supportsModel(modelId: string): boolean
  
  /** 
   * 流式对话
   * 统一的聊天接口，内部处理厂商差异
   */
  chatStream(options: ChatOptions, callbacks: StreamCallbacks): Promise<void>
  
  /**
   * 非流式对话
   * 用于需要完整响应的场景（如工具调用）
   */
  chat(options: ChatOptions): Promise<{
    content: string
    reasoning?: string
    toolCalls?: ToolCall[]
  }>
}

/** 标准化消息格式（内部使用） */
export interface StandardMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | ContentPart[]
  /** 工具调用 */
  toolCalls?: ToolCall[]
  /** 工具调用ID（用于 tool 角色） */
  toolCallId?: string
  /** 思考内容 */
  reasoning?: string
}

/** 多模态内容片段 */
export type ContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
  | { type: 'video_url'; video_url: { url: string } }
