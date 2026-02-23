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
  type: 'thinking' | 'tool_call'
  index: number
  content?: string
  toolRecord?: ToolCallRecord
  createdAt: number
}
