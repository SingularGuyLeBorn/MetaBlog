/**
 * 工具系统类型定义
 * 
 * 统一工具返回格式，解决AI难以处理不同格式结果的问题
 */

// 工具定义（Function Calling格式）
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

// 统一工具返回格式
export interface ToolResult<T = any> {
  /** 是否成功 */
  success: boolean
  /** 返回数据 */
  data?: T
  /** 错误信息（技术细节） */
  error?: string
  /** 用户友好的提示消息 */
  message?: string
  /** 操作类型描述 */
  action?: string
  /** 建议的下一步操作 */
  suggestion?: string
}

// 工具执行器类型（支持返回字符串或ToolResult，用于向后兼容）
export type ToolExecutor = (args: Record<string, any>) => Promise<ToolResult | string> | ToolResult | string

// 工具注册信息
export interface ToolRegistration {
  name: string
  definition: ToolDefinition
  executor: ToolExecutor
}

// 工具调用记录（用于展示和日志）
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

// AI返回的工具调用
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string  // JSON字符串
  }
}

// 思考步骤（用于展示推理过程）
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

// 创建成功结果的帮助函数
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

// 创建错误结果的帮助函数
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
