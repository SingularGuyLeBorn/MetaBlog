/**
 * 工具/Function Call 类型定义
 */

/** 工具参数定义 */
export interface ToolParameter {
  type: string
  description: string
  enum?: string[]
}

/** 工具参数 Schema */
export interface ToolParameters {
  type: 'object'
  properties: Record<string, ToolParameter>
  required?: string[]
}

/** 工具定义 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: ToolParameters
  }
}

/** 工具调用请求 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 工具执行结果 */
export interface ToolResult {
  tool_call_id: string
  role: 'tool'
  name: string
  content: string
}

/** 工具执行函数类型 */
export type ToolExecutor = (args: Record<string, any>) => Promise<string> | string

/** 注册的工具 */
export interface RegisteredTool {
  definition: ToolDefinition
  executor: ToolExecutor
}
