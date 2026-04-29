/**
 * 工具注册表
 * 
 * 管理所有工具的注册、查询和执行。
 * 这是工具系统的核心模块，负责：
 * 1. 工具注册和管理
 * 2. 工具执行调度
 * 3. 工具调用记录
 * 4. 错误处理和返回格式统一
 * 
 * @module ToolRegistry
 */

import type {
  ToolCall,
  ToolCallRecord,
  ToolDefinition,
  ToolExecutor,
  ToolRegistration,
  ToolResult
} from './types'
import { createErrorResult } from './types'

// ==================== 存储 ====================

/** 工具注册表 - 存储所有已注册的工具 */
const toolRegistry = new Map<string, ToolRegistration>()

/** 工具调用记录 - 用于 UI 展示和调试 */
const toolCallRecords = new Map<string, ToolCallRecord>()

// ==================== 工具注册 ====================

/**
 * 注册单个工具
 * 
 * @param name - 工具名称(必须唯一)
 * @param definition - 工具定义(给 AI 看的)
 * @param executor - 执行器(实际实现)
 * 
 * @example
 * ```typescript
 * registerTool(
 *   'readArticle',
 *   readArticleDef,
 *   readArticle
 * )
 * ```
 */
export function registerTool(
  name: string,
  definition: ToolDefinition,
  executor: ToolExecutor
): void {
  if (toolRegistry.has(name)) {
    console.warn(`[ToolRegistry] 工具 "${name}" 已存在，将被覆盖`)
  }

  toolRegistry.set(name, { name, definition, executor })
  console.log(`[ToolRegistry] 注册工具: ${name}`)
}

/**
 * 批量注册工具
 * 
 * @param tools - 工具注册信息数组
 * 
 * @example
 * ```typescript
 * registerTools([
 *   { name: 'tool1', definition: def1, executor: exec1 },
 *   { name: 'tool2', definition: def2, executor: exec2 }
 * ])
 * ```
 */
export function registerTools(tools: ToolRegistration[]): void {
  tools.forEach(tool => {
    registerTool(tool.name, tool.definition, tool.executor)
  })
}

// ==================== 工具查询 ====================

/**
 * 获取工具
 * 
 * @param name - 工具名称
 * @returns 工具注册信息，如果不存在返回 undefined
 */
export function getTool(name: string): ToolRegistration | undefined {
  return toolRegistry.get(name)
}

/**
 * 检查工具是否存在
 * 
 * @param name - 工具名称
 * @returns 是否存在
 */
export function hasTool(name: string): boolean {
  return toolRegistry.has(name)
}

/**
 * 获取所有工具定义(用于 Function Calling)
 * 
 * @returns 所有工具的定义数组
 */
export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map(t => t.definition)
}

/**
 * 获取已注册工具名称列表
 * 
 * @returns 工具名称数组
 */
export function getRegisteredToolNames(): string[] {
  return Array.from(toolRegistry.keys())
}

/**
 * 获取工具数量
 * 
 * @returns 已注册工具数量
 */
export function getToolCount(): number {
  return toolRegistry.size
}

// ==================== 工具注销 ====================

/**
 * 注销工具
 * 
 * @param name - 工具名称
 * @returns 是否成功注销
 */
export function unregisterTool(name: string): boolean {
  return toolRegistry.delete(name)
}

/**
 * 清空所有工具
 */
export function clearTools(): void {
  toolRegistry.clear()
  toolCallRecords.clear()
}

// ==================== 工具执行 ====================

/**
 * 生成工具调用记录 ID
 */
function generateRecordId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 执行工具
 * 
 * 这是工具执行的核心函数，负责：
 * 1. 查找工具
 * 2. 解析参数
 * 3. 执行调用
 * 4. 统一返回格式
 * 5. 错误处理
 * 
 * @param toolCall - AI 返回的工具调用
 * @returns ToolResult
 * 
 * @example
 * ```typescript
 * const result = await executeTool({
 *   id: 'call_123',
 *   type: 'function',
 *   function: {
 *     name: 'readArticle',
 *     arguments: '{"url": "https://example.com"}'
 *   }
 * })
 * ```
 */
export async function executeTool(
  toolCall: ToolCall
): Promise<ToolResult> {
  const { name } = toolCall.function
  const tool = getTool(name)

  // 1. 检查工具是否存在
  if (!tool) {
    return createErrorResult(
      `工具 "${name}" 不存在`,
      `抱歉，我暂时无法执行这个操作(${name})`,
      `可用的工具包括: ${getRegisteredToolNames().slice(0, 5).join(', ')}...`
    )
  }
  // 2. 解析参数
  let args: Record<string, any>
  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch (e: any) {
    return createErrorResult(
      `参数解析失败: ${e?.message || String(e)}`,
      '参数格式不正确',
      '请检查输入参数是否为有效的 JSON 格式。如果参数中包含 LaTeX 公式(如 \\pi、\\theta)，请确保反斜杠已正确转义为 \\\\pi、\\\\theta'
    )
  }

  // 3. 执行工具
  try {
    const result = await tool.executor(args)

    // 4. 统一返回格式
    if (typeof result === 'string') {
      // 字符串结果转换为标准格式
      return {
        success: true,
        data: result,
        message: result,
        action: name
      }
    }

    // 已经是 ToolResult 格式
    return result
  } catch (error: any) {
    console.error(`[ToolRegistry] 工具 "${name}" 执行失败:`, error)
    return createErrorResult(
      error?.message || String(error),
      `执行操作 "${name}" 时发生错误`,
      '请稍后重试，或联系管理员'
    )
  }
}

/**
 * 执行工具并记录(带可视化支持)
 * 
 * 本函数是工具执行的核心编排层，职责包括：
 * 1. 解析 AI 返回的工具调用参数(JSON 反序列化)
 * 2. 创建 ToolCallRecord 记录(running 状态，用于 UI 实时展示)
 * 3. 调用实际工具执行器(executeTool)
 * 4. 更新记录状态(success/error)并补全执行时间
 * 5. 传递 injectMessages(Skill 内容注入)和 activateTools(动态工具激活)
 * 
 * 错误处理：
 * - 参数解析失败：返回参数解析错误，记录 error 状态
 * - 执行器抛出异常：捕获后返回通用错误，记录 error 状态
 * - 执行器正常返回：按 result.success 更新记录状态
 * 
 * @param toolCall - AI 返回的工具调用对象，包含工具名和参数 JSON
 * @returns 包含以下字段的对象：
 *   - result: ToolResult，工具执行结果(成功/失败、数据、消息等)
 *   - record: ToolCallRecord，调用记录(含状态、时间戳，用于 UI 展示)
 *   - injectMessages: 可选，需要注入对话上下文的额外消息(如 Skill 内容)
 *   - activateTools: 可选，执行后应激活的工具名称列表(渐进式披露)
 */
export async function executeToolWithRecord(
  toolCall: ToolCall
): Promise<{ result: ToolResult; record: ToolCallRecord; injectMessages?: Array<{ role: string; content: string }>; activateTools?: string[] }> {
  const recordId = generateRecordId()
  const { name } = toolCall.function

  // 解析参数
  let args: Record<string, any>
  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch (e: any) {
    args = { parseError: e?.message || String(e) }
  }

  // 创建记录
  const record: ToolCallRecord = {
    id: recordId,
    toolName: name,
    args,
    status: 'running',
    startTime: Date.now()
  }

  toolCallRecords.set(recordId, record)

  try {
    // 执行工具
    const result = await executeTool(toolCall)

    // 更新记录
    record.status = result.success ? 'success' : 'error'
    record.result = result
    record.endTime = Date.now()

    return { result, record, injectMessages: result.injectMessages, activateTools: result.activateTools }
  } catch (error: any) {
    // 更新记录为错误状态
    record.status = 'error'
    record.error = error?.message || String(error)
    record.endTime = Date.now()

    return {
      result: createErrorResult(record.error || 'Unknown error'),
      record,
      injectMessages: undefined,
      activateTools: undefined
    }
  }
}

// ==================== 记录查询 ====================

/**
 * 获取工具调用记录
 * 
 * @param id - 记录 ID
 * @returns 调用记录
 */
export function getToolCallRecord(id: string): ToolCallRecord | undefined {
  return toolCallRecords.get(id)
}

/**
 * 获取所有工具调用记录
 * 
 * @returns 调用记录数组
 */
export function getAllToolCallRecords(): ToolCallRecord[] {
  return Array.from(toolCallRecords.values())
}

/**
 * 清除工具调用记录
 */
export function clearToolCallRecords(): void {
  toolCallRecords.clear()
}
