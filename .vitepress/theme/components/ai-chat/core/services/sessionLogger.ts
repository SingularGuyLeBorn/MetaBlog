/**
 * Session Logger - Session 级别的详细日志记录
 * 
 * 每个 Session 一个独立的 JSON 文件，包含：
 * - 人类可读的注释（与AI回复区分开）
 * - UI展示标记
 * - 完整的对话链路
 */

import { addLog } from './logger'

/** 日志条目类型 */
export type SessionLogEntryType = 
  | 'user_input'      // 用户输入
  | 'ai_request'      // AI请求（发送到API）
  | 'ai_response'     // AI响应（API返回）
  | 'ai_content'      // AI生成的内容（展示给用户）
  | 'thinking_step'   // 思考步骤
  | 'tool_call'       // 工具调用
  | 'tool_result'     // 工具结果
  | 'human_note'      // 人类可读注释
  | 'error'           // 错误
  | 'system'          // 系统事件

/** Session 日志条目 */
export interface SessionLogEntry {
  /** 时间戳 */
  timestamp: string
  /** 条目类型 */
  type: SessionLogEntryType
  /** 轮次（用于多轮对话） */
  round?: number
  /** 标题/摘要（人类可读） */
  title?: string
  /** 详细内容 */
  content?: string
  /** 原始数据（API请求/响应等） */
  rawData?: any
  /** 是否在UI上展示 */
  uiVisible?: boolean
  /** UI展示位置 */
  uiLocation?: string
  /** 元数据 */
  metadata?: Record<string, any>
  /** 耗时（毫秒） */
  duration?: number
  /** 备注（人类可读的解释） */
  note?: string
}

/** Session 日志 */
export interface SessionLog {
  /** Session ID */
  sessionId: string
  /** 开始时间 */
  startTime: string
  /** 结束时间 */
  endTime?: string
  /** 模型信息 */
  model: string
  /** 是否启用思考模式 */
  reasoningEnabled: boolean
  /** 日志条目 */
  entries: SessionLogEntry[]
  /** 统计信息 */
  stats: {
    totalRounds: number
    totalTokens?: number
    toolCallCount: number
    errorCount: number
  }
}

// 当前 Session 日志
let currentSessionLog: SessionLog | null = null

/**
 * 开始新的 Session 日志
 */
export function startSessionLog(sessionId: string, config: { model: string; reasoningEnabled: boolean }): void {
  // 如果之前有未完成的日志，先保存
  if (currentSessionLog) {
    endSessionLog()
  }

  currentSessionLog = {
    sessionId,
    startTime: new Date().toISOString(),
    model: config.model,
    reasoningEnabled: config.reasoningEnabled,
    entries: [],
    stats: {
      totalRounds: 0,
      toolCallCount: 0,
      errorCount: 0
    }
  }

  addLogEntry({
    type: 'system',
    title: '🚀 Session 开始',
    note: `模型: ${config.model}, 思考模式: ${config.reasoningEnabled ? '开启' : '关闭'}`,
    metadata: { model: config.model, reasoningEnabled: config.reasoningEnabled }
  })
}

/**
 * 添加日志条目
 */
export function addLogEntry(entry: Omit<SessionLogEntry, 'timestamp'>): void {
  if (!currentSessionLog) return

  const fullEntry: SessionLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  }

  currentSessionLog.entries.push(fullEntry)

  // 更新统计
  if (entry.type === 'tool_call') {
    currentSessionLog.stats.toolCallCount++
  }
  if (entry.type === 'error') {
    currentSessionLog.stats.errorCount++
  }
}

/**
 * 记录用户输入
 */
export function logUserInput(content: string, metadata?: any): void {
  addLogEntry({
    type: 'user_input',
    title: '👤 用户输入',
    content,
    uiVisible: true,
    uiLocation: 'chat_input',
    note: '用户在聊天界面输入的消息',
    metadata
  })
}

/**
 * 记录 AI 请求（发送到 API 的内容）
 */
export function logAIRequest(round: number, requestData: any, note?: string): void {
  const messageCount = requestData.messages?.length || 0
  const hasTools = !!requestData.tools
  
  addLogEntry({
    type: 'ai_request',
    round,
    title: `📤 AI 请求 (Round ${round})`,
    note: note || `发送 ${messageCount} 条消息到 API${hasTools ? ' (包含工具定义)' : ''}`,
    rawData: {
      model: requestData.model,
      messageCount,
      hasTools,
      toolCount: requestData.tools?.length,
      maxTokens: requestData.max_tokens,
      temperature: requestData.temperature
    },
    uiVisible: false,
    metadata: { requestSize: JSON.stringify(requestData).length }
  })
}

/**
 * 记录 AI 响应（API 返回的原始数据）
 */
export function logAIResponse(round: number, responseData: any, duration: number): void {
  const message = responseData.choices?.[0]?.message
  const hasToolCalls = !!message?.tool_calls
  const hasReasoning = !!message?.reasoning_content

  addLogEntry({
    type: 'ai_response',
    round,
    title: `📥 AI 响应 (Round ${round})`,
    note: `API 返回响应 (${duration}ms)${hasToolCalls ? ' - 包含工具调用请求' : ''}${hasReasoning ? ' - 包含思考内容' : ''}`,
    rawData: {
      id: responseData.id,
      model: responseData.model,
      finishReason: responseData.choices?.[0]?.finish_reason,
      usage: responseData.usage,
      hasToolCalls,
      hasReasoning,
      contentLength: message?.content?.length,
      reasoningLength: message?.reasoning_content?.length
    },
    duration,
    uiVisible: false
  })
}

/**
 * 记录 AI 生成的内容（展示给用户的内容）
 */
export function logAIContent(content: string, metadata?: any): void {
  addLogEntry({
    type: 'ai_content',
    title: '🤖 AI 回复',
    content,
    note: '展示给用户的最终回复内容',
    uiVisible: true,
    uiLocation: 'message_bubble',
    metadata
  })
}

/**
 * 记录思考步骤
 */
export function logThinkingStep(round: number, stepType: 'thinking' | 'tool_call', content: string, metadata?: any): void {
  addLogEntry({
    type: 'thinking_step',
    round,
    title: stepType === 'thinking' ? '💭 思考过程' : '🔧 工具调用',
    content,
    note: stepType === 'thinking' 
      ? 'AI 的思考过程（绿色气泡展示）'
      : 'AI 请求调用工具（黄色气泡展示）',
    uiVisible: true,
    uiLocation: stepType === 'thinking' ? 'thinking_bubble' : 'tool_bubble',
    metadata
  })
}

/**
 * 记录工具调用
 */
export function logToolCall(round: number, toolName: string, args: any): void {
  addLogEntry({
    type: 'tool_call',
    round,
    title: `🔨 执行工具: ${toolName}`,
    content: JSON.stringify(args, null, 2),
    note: `执行工具 "${toolName}"`,
    uiVisible: true,
    uiLocation: 'tool_panel',
    metadata: { toolName, args }
  })
}

/**
 * 记录工具结果
 */
export function logToolResult(round: number, toolName: string, result: string, duration: number, status: 'success' | 'error'): void {
  addLogEntry({
    type: 'tool_result',
    round,
    title: `✅ 工具结果: ${toolName}`,
    content: result,
    note: `工具 "${toolName}" 执行${status === 'success' ? '成功' : '失败'} (${duration}ms)`,
    duration,
    uiVisible: true,
    uiLocation: 'tool_panel',
    metadata: { toolName, status, resultLength: result.length }
  })
}

/**
 * 记录人类可读注释
 */
export function logHumanNote(note: string, metadata?: any): void {
  addLogEntry({
    type: 'human_note',
    title: '📝 注释',
    note,
    uiVisible: false,
    metadata
  })
}

/**
 * 记录错误
 */
export function logError(error: Error, context?: string): void {
  addLogEntry({
    type: 'error',
    title: '❌ 错误',
    content: error.message,
    note: context || '发生错误',
    uiVisible: false,
    metadata: { 
      stack: error.stack,
      context 
    }
  })

  // 同时记录到主日志
  addLog({
    level: 'error',
    category: 'error',
    component: 'SessionLogger',
    event: 'error',
    message: error.message,
    data: { stack: error.stack, context }
  })
}

/**
 * 结束 Session 日志并保存
 */
export async function endSessionLog(): Promise<void> {
  if (!currentSessionLog) return

  currentSessionLog.endTime = new Date().toISOString()
  currentSessionLog.stats.totalRounds = Math.max(
    ...currentSessionLog.entries
      .filter(e => e.round)
      .map(e => e.round || 0),
    0
  )

  // 添加结束条目
  addLogEntry({
    type: 'system',
    title: '🏁 Session 结束',
    note: `总计 ${currentSessionLog.stats.totalRounds} 轮对话, ${currentSessionLog.stats.toolCallCount} 次工具调用`,
    metadata: { stats: currentSessionLog.stats }
  })

  try {
    // 发送到服务端保存
    const response = await fetch('/api/logs/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentSessionLog)
    })

    if (!response.ok) {
      console.error('[SessionLogger] Failed to save session log:', await response.text())
    }
  } catch (e) {
    console.error('[SessionLogger] Error saving session log:', e)
  }

  currentSessionLog = null
}

/**
 * 获取当前 Session 日志（用于调试）
 */
export function getCurrentSessionLog(): SessionLog | null {
  return currentSessionLog
}

/**
 * 导出当前 Session 日志为 JSON 字符串
 */
export function exportSessionLog(): string {
  if (!currentSessionLog) return ''
  return JSON.stringify(currentSessionLog, null, 2)
}
