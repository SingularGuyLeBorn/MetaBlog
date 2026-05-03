/**
 * ============================================================================
 * 后端服务 - sessionLogger
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/services
 */


export interface LogEntry {
  timestamp: number
  type: 'user' | 'ai' | 'tool' | 'error' | 'system'
  content: string
  metadata?: Record<string, any>
}

/**
 * SessionLog 接口定义
 *
 */
export interface SessionLog {
  sessionId: string
  startTime: number
  config?: Record<string, any>
  entries: LogEntry[]
}

const sessionLogs = new Map<string, SessionLog>()
let currentSessionId: string | null = null

/**
 * startSessionLog 函数
 *
 * @param sessionId - 参数(string)
 * @param config - 参数
 * @returns 返回值(SessionLog)
 */
export function startSessionLog(sessionId: string, config?: Record<string, any>): SessionLog {
  const log: SessionLog = {
    sessionId,
    startTime: Date.now(),
    config,
    entries: []
  }
  sessionLogs.set(sessionId, log)
  currentSessionId = sessionId
  return log
}

/**
 * addLogEntry 函数
 *
 * @param sessionId - 参数(string)
 * @param entry - 参数(Omit<LogEntry, 'timestamp'>)
 * @returns 返回值
 */
export function addLogEntry(sessionId: string, entry: Omit<LogEntry, 'timestamp'>) {
  const log = sessionLogs.get(sessionId)
  if (log) {
    log.entries.push({
      ...entry,
      timestamp: Date.now()
    })
  }
}

/**
 * logUserInput 函数
 *
 * @param content - 参数(string)
 * @param metadata - 参数
 * @returns 返回值
 */
export function logUserInput(content: string, metadata?: Record<string, any>) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, { type: 'user', content, metadata })
}

/**
 * logAIRequest 函数
 *
 * @param endpoint - 参数(string)
 * @param request - 参数
 * @returns 返回值
 */
export function logAIRequest(endpoint: string, request: any) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, {
    type: 'system',
    content: `AI Request: ${endpoint}`,
    metadata: { request }
  })
}

/**
 * logAIContent 函数
 *
 * @param content - 参数(string)
 * @param metadata - 参数
 * @returns 返回值
 */
export function logAIContent(content: string, metadata?: any) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, {
    type: 'ai',
    content,
    metadata
  })
}

/**
 * logThinkingStep 函数
 *
 * @param round - 参数(number)
 * @param type - 参数(string)
 * @param content - 参数(string)
 * @param metadata - 参数
 * @returns 返回值
 */
export function logThinkingStep(round: number, type: string, content: string, metadata?: any) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, {
    type: 'system',
    content: `Thinking Step [Round ${round}] (${type})`,
    metadata: { round, stepType: type, content, ...metadata }
  })
}

/**
 * logToolResult 函数
 *
 * @param toolName - 参数(string)
 * @param result - 参数
 * @returns 返回值
 */
export function logToolResult(toolName: string, result: any) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, {
    type: 'tool',
    content: `Tool Result: ${toolName}`,
    metadata: { result }
  })
}

/**
 * logHumanNote 函数
 *
 * @param note - 参数(string)
 * @returns 返回值
 */
export function logHumanNote(note: string) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, {
    type: 'system',
    content: `Note: ${note}`
  })
}

/**
 * logAIResponse 函数
 *
 * @param content - 参数(string)
 * @returns 返回值
 */
export function logAIResponse(content: string) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, { type: 'ai', content })
}

/**
 * logToolCall 函数
 *
 * @param toolName - 参数(string)
 * @param params - 参数
 * @returns 返回值
 */
export function logToolCall(toolName: string, params: any) {
  if (!currentSessionId) return
  addLogEntry(currentSessionId, {
    type: 'tool',
    content: `Tool: ${toolName}`,
    metadata: { params }
  })
}

/**
 * logError 函数
 *
 * @param error - 参数(Error | string)
 * @param note - 参数
 * @returns 返回值
 */
export function logError(error: Error | string, note?: string) {
  if (!currentSessionId) return
  const message = error instanceof Error ? error.message : error
  const stack = error instanceof Error ? error.stack : undefined
  addLogEntry(currentSessionId, {
    type: 'error',
    content: note ? `${note}: ${message}` : message,
    metadata: { stack }
  })
}

/**
 * 获取SessionLog
 *
 * @param sessionId - 参数(string)
 * @returns 返回值(SessionLog | undefined)
 */
export function getSessionLog(sessionId: string): SessionLog | undefined {
  return sessionLogs.get(sessionId)
}

/**
 * endSessionLog 函数
 *
 * @param sessionId - 参数
 * @returns 返回值
 */
export function endSessionLog(sessionId?: string) {
  const id = sessionId || currentSessionId
  if (!id) return undefined
  const log = sessionLogs.get(id)
  sessionLogs.delete(id)
  if (id === currentSessionId) {
    currentSessionId = null
  }
  return log
}
