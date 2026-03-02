/**
 * 工具注册表
 * 
 * 管理所有工具的注册、查找和执行
 */
import type { ToolDefinition, ToolExecutor, ToolRegistration, ToolCallRecord } from './types'
import { addLog } from '../services/logger'

// 工具存储Map
const tools = new Map<string, ToolRegistration>()

/**
 * 注册工具
 * @param name 工具名称
 * @param definition 工具定义（给AI的schema）
 * @param executor 工具执行函数
 */
export function registerTool(
  name: string, 
  definition: ToolDefinition, 
  executor: ToolExecutor
): void {
  tools.set(name, { definition, executor })
  
  addLog({
    level: 'debug',
    category: 'tool',
    component: 'ToolRegistry',
    event: 'tool_registered',
    message: `工具已注册: ${name}`,
    data: { toolName: name }
  })
}

/**
 * 批量注册工具
 * @param toolList 工具列表
 */
export function registerTools(toolList: Array<{
  name: string
  definition: ToolDefinition
  executor: ToolExecutor
}>): void {
  toolList.forEach(({ name, definition, executor }) => {
    registerTool(name, definition, executor)
  })
}

/**
 * 获取工具
 * @param name 工具名称
 */
export function getTool(name: string): ToolRegistration | undefined {
  return tools.get(name)
}

/**
 * 检查工具是否存在
 * @param name 工具名称
 */
export function hasTool(name: string): boolean {
  return tools.has(name)
}

/**
 * 执行工具
 * @param name 工具名称
 * @param args 工具参数
 * @param context 执行上下文（用于校验工具权限）
 * @returns 工具执行结果字符串，始终不会抛出异常
 */
export async function executeTool(
  name: string, 
  args: Record<string, any>,
  context?: {
    agentId?: string
    availableSkills?: string[]
    declaredTools?: string[]
    availableTools?: string[]
  }
): Promise<string> {
  const tool = tools.get(name)
  
  // 工具未找到，进行详细错误分析
  if (!tool) {
    // 情况1：工具被 Skills 声明但 Agent 未启用
    if (context?.declaredTools?.includes(name) && !context?.availableTools?.includes(name)) {
      return `❌ 工具 "${name}" 被 Skill 声明但当前 Agent 未启用

该工具在当前 Agent 配置中不可用。请：
1. 进入 Agent 配置面板
2. 在"工具"选项中启用 "${name}"
3. 或者切换到包含该工具的 Agent

被声明但未启用的工具：${context.declaredTools.filter(t => !context.availableTools?.includes(t)).join(', ')}`
    }
    
    // 情况2：工具既未声明也未启用
    if (!context?.declaredTools?.includes(name)) {
      return `❌ 工具 "${name}" 未声明且不可用

该工具未被任何激活的 Skill 声明，且当前 Agent 也未启用。

可能原因：
1. 工具名称拼写错误
2. 需要激活声明该工具的 Skill
3. 需要在 Agent 配置中启用该工具

建议：
- 检查工具名称拼写
- 激活正确的 Skill（当前可用：${context?.availableSkills?.join(', ') || '无'}）
- 使用 ToolTester 查看所有可用工具`
    }
    
    // 默认错误（无上下文时）
    return `❌ 错误：工具 "${name}" 未找到

可能原因：
1. 工具名称拼写错误
2. 工具尚未注册到系统中
3. 工具正在开发中

建议：使用 ToolTester 查看所有可用工具列表`
  }
  
  try {
    const result = await tool.executor(args)
    // 确保返回字符串
    if (typeof result === 'string') {
      return result
    }
    return JSON.stringify(result, null, 2)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    
    return `❌ 工具执行失败

工具名称: ${name}
错误信息: ${errorMessage}

${errorStack ? `错误堆栈:\n${errorStack}\n\n` : ''}建议：
1. 检查参数是否正确
2. 查看工具文档了解参数要求
3. 如果是网络工具，检查网络连接
4. 如果是文件工具，检查文件路径是否存在`
  }
}

/**
 * 执行工具并创建完整记录
 * @param name 工具名称
 * @param args 工具参数
 * @param context 执行上下文
 * @param onRecord 记录回调
 */
export async function executeToolWithRecord(
  name: string, 
  args: Record<string, any>,
  context?: {
    agentId?: string
    availableSkills?: string[]
    declaredTools?: string[]
    availableTools?: string[]
  },
  onRecord?: (record: ToolCallRecord) => void
): Promise<{ result: string; record: ToolCallRecord }> {
  const tool = tools.get(name)
  const startTime = Date.now()
  
  const record: ToolCallRecord = {
    id: `tool_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: tool?.definition.function.description,
    arguments: args,
    result: '',
    status: 'running',
    startTime
  }
  
  // 记录工具调用开始
  logToolCall(name, args, 'start')
  onRecord?.(record)
  
  try {
    addLog({
      level: 'info',
      category: 'tool',
      component: 'ToolRegistry',
      event: 'tool_call_start',
      message: `执行工具: ${name}`,
      data: { toolName: name, arguments: args, context }
    })
    
    const result = await executeTool(name, args, context)
    const duration = Date.now() - startTime
    
    record.status = 'success'
    record.result = result
    record.endTime = Date.now()
    record.duration = duration
    
    // 记录工具调用成功
    logToolCall(name, args, 'complete', result, undefined, duration)
    onRecord?.(record)
    
    addLog({
      level: 'info',
      category: 'tool',
      component: 'ToolRegistry',
      event: 'tool_call_complete',
      message: `工具执行成功: ${name} (${duration}ms)`,
      data: { 
        toolName: name, 
        duration,
        result: typeof result === 'string' ? result : JSON.stringify(result)
      }
    })
    
    return { result, record }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : String(error)
    
    record.status = 'error'
    record.error = errorMsg
    record.result = `执行错误: ${errorMsg}`
    record.endTime = Date.now()
    record.duration = duration
    
    // 记录工具调用失败
    logToolCall(name, args, 'error', undefined, errorMsg, duration)
    onRecord?.(record)
    
    addLog({
      level: 'error',
      category: 'tool',
      component: 'ToolRegistry',
      event: 'tool_call_error',
      message: `工具执行失败: ${name} - ${errorMsg}`,
      data: { 
        toolName: name, 
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
        duration
      }
    })
    
    return { result: record.result, record }
  }
}

/**
 * 获取所有工具定义
 */
export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(tools.values()).map(t => t.definition)
}

/**
 * 获取已注册工具名称列表
 */
export function getRegisteredToolNames(): string[] {
  return Array.from(tools.keys())
}

/**
 * 获取已注册工具数量
 */
export function getToolCount(): number {
  return tools.size
}

/**
 * 注销工具
 * @param name 工具名称
 */
export function unregisterTool(name: string): boolean {
  const existed = tools.delete(name)
  if (existed) {
    addLog({
      level: 'debug',
      category: 'tool',
      component: 'ToolRegistry',
      event: 'tool_unregistered',
      message: `工具已注销: ${name}`,
      data: { toolName: name }
    })
  }
  return existed
}

/**
 * 清空所有工具
 */
export function clearTools(): void {
  tools.clear()
  addLog({
    level: 'info',
    category: 'tool',
    component: 'ToolRegistry',
    event: 'tools_cleared',
    message: '所有工具已清空'
  })
}

// 内部日志辅助函数
function logToolCall(
  name: string, 
  args: any, 
  status: 'start' | 'complete' | 'error', 
  result?: any, 
  error?: string, 
  duration?: number
) {
  addLog({
    level: status === 'error' ? 'error' : 'info',
    category: 'tool',
    component: 'ToolRegistry',
    event: status === 'start' ? 'tool_call_start' : status === 'complete' ? 'tool_call_complete' : 'tool_call_error',
    message: `Tool ${name} ${status}${duration ? ` (${duration}ms)` : ''}`,
    data: {
      toolName: name,
      arguments: args,
      result: status === 'complete' ? (typeof result === 'string' ? result.substring(0, 500) : result) : undefined,
      error,
      duration
    }
  })
}
