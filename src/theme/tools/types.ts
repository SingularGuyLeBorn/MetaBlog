/**
 * 工具系统类型定义
 * 
 * 本文件定义了工具系统的核心类型，确保整个工具系统的类型安全。
 * 
 * @module ToolTypes
 */

/**
 * 工具定义（Function Calling 格式）
 * 
 * 这是 OpenAI / DeepSeek 等 LLM 使用的函数调用格式。
 * 当 AI 决定调用工具时，会根据这个定义生成参数。
 * 
 * @example
 * ```typescript
 * const getWeatherDef: ToolDefinition = {
 *   type: 'function',
 *   function: {
 *     name: 'get_weather',
 *     description: '获取指定城市的天气',
 *     parameters: {
 *       type: 'object',
 *       properties: {
 *         city: { type: 'string', description: '城市名称' }
 *       },
 *       required: ['city']
 *     }
 *   }
 * }
 * ```
 */
export interface ToolDefinition {
  type: 'function'
  function: {
    /** 工具名称，必须唯一，使用 snake_case */
    name: string
    /** 
     * 工具描述，告诉 AI 什么时候应该使用这个工具
     * 描述越清晰，AI 调用越准确
     */
    description: string
    /** 参数定义（支持 anyOf、oneOf 等 JSON Schema 扩展） */
    parameters: {
      type: 'object'
      /** 每个参数的定义 */
      properties: Record<string, any>
      /** 必填参数列表 */
      required?: string[]
      /** 允许 JSON Schema 扩展字段 */
      [key: string]: any
    }
  }
}

/**
 * 统一工具返回格式
 * 
 * 所有工具必须返回这个格式，确保 AI 能正确处理工具执行结果。
 * 
 * 为什么需要统一格式？
 * 1. AI 不需要处理各种不同格式的返回
 * 2. 统一的错误处理机制
 * 3. 便于在 UI 中展示工具执行状态
 * 
 * @example
 * 成功返回：
 * ```typescript
 * return {
 *   success: true,
 *   data: { articles: [...] },
 *   message: '找到 5 篇文章'
 * }
 * ```
 * 
 * 错误返回：
 * ```typescript
 * return {
 *   success: false,
 *   error: 'FileNotFound',
 *   message: '文件不存在',
 *   suggestion: '请检查路径是否正确'
 * }
 * ```
 */
export interface ToolResult<T = any> {
  /** 是否成功 */
  success: boolean
  /** 返回数据，成功时必填 */
  data?: T
  /** 错误信息（技术细节），失败时必填 */
  error?: string
  /** 用户友好的提示消息 */
  message?: string
  /** 操作类型描述 */
  action?: string
  /** 建议的下一步操作 */
  suggestion?: string
  /**
   * 要注入到对话上下文中的额外消息
   * 
   * 用于 load_skill 等工具：调用后需要将 skill 内容
   * 作为新消息注入到后续对话中，让 Agent 可以看到完整指导
   */
  injectMessages?: Array<{ role: string; content: string }>
  /**
   * 执行此工具后应激活的其他工具名称列表
   * 
   * 用于渐进式披露：search_capabilities、load_skill 等元工具
   * 执行后，将匹配的工具 schema 加入下轮对话的可用工具列表
   */
  activateTools?: string[]
}

/**
 * 工具执行器类型
 * 
 * 工具执行器是一个函数，接收参数，返回 ToolResult 或字符串。
 * 支持异步和同步两种模式。
 * 
 * 为什么支持返回字符串？
 * 为了向后兼容，旧的工具可能直接返回字符串。
 * 但新工具应该始终返回 ToolResult。
 */
export type ToolExecutor = (
  args: Record<string, any>
) => Promise<ToolResult | string> | ToolResult | string

/**
 * 工具注册信息
 * 
 * 注册工具时需要提供：
 * - name: 工具唯一标识
 * - definition: 工具定义（给 AI 看）
 * - executor: 执行器（实际执行代码）
 */
export interface ToolRegistration {
  name: string
  definition: ToolDefinition
  executor: ToolExecutor
}

/**
 * 工具调用记录（用于 UI 展示）
 * 
 * 每次工具调用都会生成一条记录，用于：
 * 1. 在 UI 中展示工具调用过程
 * 2. 调试和日志记录
 * 3. 重放工具调用
 */
export interface ToolCallRecord {
  id: string
  toolName?: string
  name?: string
  args?: Record<string, any>
  arguments?: any
  status: 'pending' | 'running' | 'success' | 'error'
  startTime: number
  endTime?: number
  duration?: number
  result?: ToolResult | string
  error?: string
}

/**
 * AI 返回的工具调用
 * 
 * 这是 LLM API 返回的工具调用格式。
 * 
 * @example
 * ```json
 * {
 *   "id": "call_abc123",
 *   "type": "function",
 *   "function": {
 *     "name": "get_weather",
 *     "arguments": "{\"city\": \"北京\"}"
 *   }
 * }
 * ```
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string  // JSON 字符串
  }
}

/**
 * 思考步骤（用于展示推理过程）
 * 
 * 在多轮工具调用中，展示 AI 的思考过程。
 */
export interface ThinkingStep {
  id: string
  index: number
  step?: number
  round?: number
  title?: string
  content?: string
  type: 'thought' | 'plan' | 'action' | 'observation' | 'thinking' | 'text' | 'tool_call'
  timestamp?: number
  createdAt?: number
  duration?: number
  status?: 'pending' | 'running' | 'success' | 'error' | 'completed'
  toolRecord?: ToolCallRecord
}

// ==================== 辅助函数 ====================

/**
 * 创建成功结果
 * 
 * @param data - 返回的数据
 * @param message - 用户友好的消息
 * @param action - 操作类型
 * @param suggestion - 下一步建议
 * @returns ToolResult
 * 
 * @example
 * ```typescript
 * return createSuccessResult(
 *   articles,
 *   `找到 ${articles.length} 篇文章`,
 *   'search_articles',
 *   '使用 get_article_content 读取文章详情'
 * )
 * ```
 */
export function createSuccessResult<T>(
  data: T,
  message?: string,
  action?: string,
  suggestion?: string
): ToolResult<T> {
  return {
    success: true,
    data,
    message,
    action,
    suggestion
  }
}

/**
 * 创建错误结果
 * 
 * @param error - 错误信息（技术细节）
 * @param message - 用户友好的错误消息
 * @param suggestion - 如何解决或重试的建议
 * @returns ToolResult
 * 
 * @example
 * ```typescript
 * return createErrorResult(
 *   'FileNotFound',
 *   '文件不存在',
 *   '请检查路径是否正确'
 * )
 * ```
 */
export function createErrorResult(
  error: string,
  message?: string,
  suggestion?: string
): ToolResult {
  return {
    success: false,
    error,
    message: message || `操作失败: ${error}`,
    suggestion: suggestion || '请检查参数后重试，或尝试其他方式'
  }
}
