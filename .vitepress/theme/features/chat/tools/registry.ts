/**
 * 工具注册表
 * 
 * 管理所有工具的注册、查询和执行
 * 统一处理工具返回格式和错误处理
 */

import type {
  ToolRegistration,
  ToolDefinition,
  ToolExecutor,
  ToolResult,
  ToolCall,
  ToolCallRecord
} from './types'
import { createErrorResult, createSuccessResult } from './types'

// 工具存储
const toolRegistry = new Map<string, ToolRegistration>()

// 工具调用记录（用于UI展示）
const toolCallRecords = new Map<string, ToolCallRecord>()

/**
 * 注册单个工具
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
 */
export function registerTools(tools: ToolRegistration[]): void {
  tools.forEach(tool => {
    registerTool(tool.name, tool.definition, tool.executor)
  })
}

/**
 * 获取工具
 */
export function getTool(name: string): ToolRegistration | undefined {
  return toolRegistry.get(name)
}

/**
 * 检查工具是否存在
 */
export function hasTool(name: string): boolean {
  return toolRegistry.has(name)
}

/**
 * 获取所有工具定义（用于Function Calling）
 */
export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map(t => t.definition)
}

/**
 * 获取已注册工具名称列表
 */
export function getRegisteredToolNames(): string[] {
  return Array.from(toolRegistry.keys())
}

/**
 * 获取工具数量
 */
export function getToolCount(): number {
  return toolRegistry.size
}

/**
 * 注销工具
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

/**
 * 生成工具调用记录ID
 */
function generateRecordId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 执行工具
 * 
 * 统一处理：
 * 1. 参数解析
 * 2. 执行调用
 * 3. 返回格式统一
 * 4. 错误处理
 */
export async function executeTool(
  toolCall: ToolCall
): Promise<ToolResult> {
  const { name } = toolCall.function
  const tool = getTool(name)
  
  if (!tool) {
    return createErrorResult(
      `工具 "${name}" 不存在`,
      `抱歉，我暂时无法执行这个操作（${name}）`,
      `可用的工具包括: ${getRegisteredToolNames().slice(0, 5).join(', ')}...`
    )
  }
  
  // 解析参数
  let args: Record<string, any>
  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch (e: any) {
    return createErrorResult(
      `参数解析失败: ${e?.message || String(e)}`,
      '参数格式不正确',
      '请检查输入参数是否为有效的JSON格式'
    )
  }
  
  try {
    // 执行工具
    const result = await tool.executor(args)
    
    // 统一返回格式
    if (typeof result === 'string') {
      // 字符串结果转换为标准格式
      return createSuccessResult(
        result,
        result,
        name
      )
    }
    
    // 已经是ToolResult格式
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
 * 执行工具并记录（带可视化支持）
 */
export async function executeToolWithRecord(
  toolCall: ToolCall
): Promise<{ result: ToolResult; record: ToolCallRecord }> {
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
    
    return { result, record }
  } catch (error: any) {
    // 更新记录为错误状态
    record.status = 'error'
    record.error = error?.message || String(error)
    record.endTime = Date.now()
    
    return {
      result: createErrorResult(record.error || 'Unknown error'),
      record
    }
  }
}

/**
 * 获取工具调用记录
 */
export function getToolCallRecord(id: string): ToolCallRecord | undefined {
  return toolCallRecords.get(id)
}

/**
 * 获取所有工具调用记录
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
