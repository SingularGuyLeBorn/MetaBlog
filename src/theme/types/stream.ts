/**
 * ============================================================================
 * 流式状态机类型定义
 * ============================================================================
 *
 * 本文件定义 Chat 流式输出的状态机类型,解决以下问题：
 * 1. 全局 isStreaming 布尔值无法表达多工具并行/等待的复杂状态
 * 2. 工具中间文本混入 message.content 导致"先像最终回复再消失"
 * 3. 缺少工具执行过程的可视化状态
 *
 * @module src/theme/types
 */

import type { ToolCallRecord } from '@/theme/tools'

// ═══════════════════════════════════════════════════════════════
// StreamPhase - 流式状态机
// ═══════════════════════════════════════════════════════════════

/**
 * 流式阶段
 *
 * 从用户发送消息到 AI 完成回复的完整生命周期：
 *
 * idle → connecting → reasoning → thinking → tool_calling → tool_running → responding → complete
 *                                          ↓                    ↓
 *                                    (循环回 thinking)    (循环回 thinking)
 *
 * 说明：
 * - 一个完整对话可能经历多轮 tool_calling → tool_running → thinking 循环
 * - responding 阶段的内容才是真正的"最终回复"
 * - 只有 responding 阶段的内容才会写入 message.content
 */
export type StreamPhase =
  | 'idle'           // 空闲,没有活跃的流
  | 'connecting'     // 正在建立 SSE 连接
  | 'reasoning'      // AI 正在输出推理过程(DeepSeek reasoning_content)
  | 'thinking'       // AI 正在生成中间文本(工具调用前的说明文字)
  | 'tool_calling'   // AI 正在输出 tool_calls JSON 参数
  | 'tool_running'   // 工具正在服务端执行中
  | 'responding'     // AI 正在生成最终回复(写入 message.content)
  | 'complete'       // 对话完成
  | 'error'          // 出错
  | 'interrupted'    // 被用户中断

/** StreamPhase 的人类可读描述 */
export const STREAM_PHASE_LABELS: Record<StreamPhase, string> = {
  idle: '就绪',
  connecting: '连接中',
  reasoning: '深度思考中',
  thinking: '思考中',
  tool_calling: '准备调用工具',
  tool_running: '工具执行中',
  responding: '生成回复中',
  complete: '已完成',
  error: '出错了',
  interrupted: '已中断'
}

// ═══════════════════════════════════════════════════════════════
// ToolChain - 工具调用链
// ═══════════════════════════════════════════════════════════════

/**
 * 工具链中的单个工具项
 *
 * 与 ToolCallRecord 的区别：
 * - ToolCallRecord 是持久化到消息中的历史记录
 * - ToolChainItem 是实时状态,用于 UI 展示当前活跃的工具调用
 */
export interface ToolChainItem {
  /** tool_call_id(来自 LLM API) */
  id: string
  /** thinkingStep 中的唯一标识 */
  stepId: string
  /** 工具名称 */
  name: string
  /** 解析后的参数 */
  arguments: Record<string, any>
  /** 执行状态 */
  status: 'pending' | 'calling' | 'running' | 'success' | 'error'
  /** 开始时间 */
  startTime: number
  /** 结束时间 */
  endTime?: number
  /** 执行耗时(ms) */
  duration?: number
  /** 执行结果 */
  result?: any
  /** 错误信息 */
  error?: string
  /** 所在轮次 */
  round: number
  /** 在轮次中的索引 */
  index: number
  /** 进度描述(用于实时更新,如"已找到 3/10 条结果") */
  progressText?: string
}

/**
 * 工具链(一个 AI 消息的所有工具调用)
 */
export interface ToolChain {
  /** 消息组ID */
  groupId: string
  /** 会话ID */
  sessionId: string
  /** 工具调用列表 */
  items: ToolChainItem[]
  /** 当前活跃(正在执行或最后执行)的工具ID */
  activeItemId: string | null
  /** 工具链创建时间 */
  createdAt: number
  /** 最后更新时间 */
  updatedAt: number
}

// ═══════════════════════════════════════════════════════════════
// StreamState - 流式状态(用于 Store)
// ═══════════════════════════════════════════════════════════════

/**
 * 单个会话的流式状态
 */
export interface SessionStreamState {
  /** 当前阶段 */
  phase: StreamPhase
  /** 上一阶段(用于检测阶段变化) */
  prevPhase: StreamPhase
  /** 当前 AI 消息ID */
  currentAiMessageId: string | null
  /** 当前用户消息ID */
  currentUserMessageId: string | null
  /** 推理内容累积(实时) */
  reasoningBuffer: string
  /** 最终回复内容累积(实时,仅在 responding 阶段有效) */
  contentBuffer: string
  /** 中间文本累积(thinking 阶段,不写入 message.content) */
  intermediateBuffer: string
  /** 当前轮次 */
  currentRound: number
  /** 开始时间 */
  startTime: number
  /** 是否已被中断 */
  isAborted: boolean
  /** 错误信息 */
  error?: string
}

/**
 * 流式进度更新(用于实时回调)
 */
export interface StreamProgress {
  /** 当前阶段 */
  phase: StreamPhase
  /** 推理内容增量(如有) */
  reasoningDelta?: string
  /** 推理内容全文 */
  reasoningFull?: string
  /** 最终回复增量(仅在 responding 阶段,如有) */
  contentDelta?: string
  /** 最终回复全文 */
  contentFull?: string
  /** 中间文本增量(仅在 thinking 阶段,如有) */
  intermediateDelta?: string
  /** 当前轮次 */
  round: number
}

// ═══════════════════════════════════════════════════════════════
// 扩展的流式回调
// ═══════════════════════════════════════════════════════════════

/**
 * 扩展的流式回调接口
 *
 * 与旧的 StreamCallbacks 兼容,新增 phase 和工具相关的回调.
 * 新旧回调可以同时存在,由调用方选择使用.
 */
export interface StreamCallbacksV2 {
  /** 阶段变化 */
  onPhaseChange?: (phase: StreamPhase, prevPhase: StreamPhase) => void
  /** 流式进度(包含所有 buffer 的实时更新) */
  onStreamProgress?: (progress: StreamProgress) => void
  /** 推理内容更新(增量) */
  onReasoningDelta?: (delta: string, full: string) => void
  /** 最终回复内容更新(增量,仅在 responding 阶段回调) */
  onContentDelta?: (delta: string, full: string) => void
  /** 中间文本更新(增量,仅在 thinking 阶段回调) */
  onIntermediateDelta?: (delta: string, full: string) => void
  /** 工具调用开始 */
  onToolCallStart?: (item: ToolChainItem) => void
  /** 工具调用更新(进度/状态) */
  onToolCallUpdate?: (item: ToolChainItem) => void
  /** 工具调用完成 */
  onToolCallComplete?: (item: ToolChainItem) => void
  /** Token 用量 */
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  /** Token 估算 */
  onTokenEstimate?: (estimate: number) => void
  /** 完成 */
  onComplete: () => void
  /** 错误 */
  onError: (error: Error) => void
}

/**
 * 注：StreamCallbacks 定义在 chat.ts 中，此处不重复定义以避免冲突.
 * stream.ts 中新增的字段已合并到 chat.ts 的 StreamCallbacks 接口.
 */

// ═══════════════════════════════════════════════════════════════
// 工具结果视图类型(为 ToolResultSidebar 准备)
// ═══════════════════════════════════════════════════════════════

/**
 * 搜索结果项
 */
export interface SearchResultItem {
  /** 标题 */
  title: string
  /** 摘要/描述 */
  snippet?: string
  /** URL */
  url: string
  /** 来源域名 */
  domain?: string
  /** favicon URL */
  favicon?: string
  /** 来源名称 */
  source?: string
}

/**
 * 文档链接项
 */
export interface DocumentLinkItem {
  /** 链接类型 */
  type: 'feishu' | 'yuque' | 'github' | 'notion' | 'generic'
  /** 标题 */
  title: string
  /** URL */
  url: string
  /** 图标(emoji 或 URL) */
  icon?: string
  /** 描述 */
  description?: string
}

/**
 * 代码执行结果
 */
export interface CodeExecutionResult {
  /** 执行的代码 */
  code?: string
  /** 语言 */
  language?: string
  /** 标准输出 */
  stdout?: string
  /** 标准错误 */
  stderr?: string
  /** 退出码 */
  exitCode?: number
}

/**
 * 工具结果的统一视图类型
 */
export type ToolResultView =
  | { type: 'search'; results: SearchResultItem[] }
  | { type: 'documents'; links: DocumentLinkItem[] }
  | { type: 'code'; execution: CodeExecutionResult }
  | { type: 'generic'; data: any }
