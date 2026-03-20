/**
 * 工具系统类型定义
 * 
 * 定义工具相关的所有类型，包括工具定义、工具调用、执行器等
 */

/** 工具定义（给AI的schema） */
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

/** 工具调用请求（来自AI） */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 工具执行器函数类型 */
export type ToolExecutor = (args: Record<string, any>) => Promise<string> | string

/** 工具注册项 */
export interface ToolRegistration {
  definition: ToolDefinition
  executor: ToolExecutor
}

/** 工具调用记录（用于UI展示和日志） */
export interface ToolCallRecord {
  id: string
  name: string
  description?: string
  arguments: Record<string, any>
  result: string
  status: 'pending' | 'running' | 'success' | 'error'
  startTime: number
  endTime?: number
  duration?: number
  error?: string
}

/** 思考步骤（用于分步展示） */
export interface ThinkingStep {
  id: string
  /** 步骤类型
   * - thinking: AI 思考过程
   * - tool_call: 工具调用
   * - tool_result: 工具执行结果
   * - final_response: 最终回复
   */
  type: 'thinking' | 'tool_call' | 'tool_result' | 'final_response'
  /** 轮次号（用于区分多轮对话） */
  round: number
  /** 步骤序号（用于排序） */
  index: number
  /** 步骤标题（显示在头部） */
  title?: string
  /** 内容（thinking 和 final_response 时使用） */
  content?: string
  /** 工具调用记录（tool_call/tool_result 时使用） */
  toolRecord?: ToolCallRecord
  /** 步骤状态 */
  status?: 'running' | 'success' | 'error' | 'completed'
  /** 创建时间 */
  createdAt: number
  /** 更新时间（用于流式更新） */
  updatedAt?: number
}
