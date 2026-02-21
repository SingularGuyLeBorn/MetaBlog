/**
 * 结构化日志系统
 * 
 * 功能：
 * 1. 组件生命周期日志（挂载、更新、卸载）
 * 2. 对话完整链路追踪
 * 3. 工具调用记录
 * 4. 支持搜索和筛选
 * 5. 持久化到 localStorage
 */

import { ref, computed, type Ref } from 'vue'

// ==================== 类型定义 ====================

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 日志类别 */
export type LogCategory = 
  | 'lifecycle'    // 组件生命周期
  | 'chat'         // 对话相关
  | 'tool'         // 工具调用
  | 'api'          // API 请求
  | 'error'        // 错误
  | 'performance'  // 性能

/** 组件生命周期事件 */
export type LifecycleEvent = 
  | 'created'
  | 'mounted'
  | 'updated'
  | 'unmounted'
  | 'activated'
  | 'deactivated'

/** 对话事件 */
export type ChatEvent =
  | 'message_start'
  | 'message_stream'
  | 'message_complete'
  | 'message_error'
  | 'tool_call_start'
  | 'tool_call_complete'
  | 'session_switch'
  | 'session_create'

/** 日志条目 */
export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  category: LogCategory
  component?: string
  event?: LifecycleEvent | ChatEvent | string
  message: string
  data?: any
  sessionId?: string
  messageId?: string
  duration?: number
  parentId?: string  // 用于构建调用链
}

/** 对话链路节点 */
export interface ChatTraceNode {
  id: string
  type: 'user_message' | 'ai_response' | 'tool_call' | 'api_request'
  timestamp: number
  content?: string
  status: 'pending' | 'running' | 'success' | 'error'
  duration?: number
  metadata?: any
  children: string[]
  parentId?: string
}

/** 完整对话追踪 */
export interface ChatTrace {
  id: string
  sessionId: string
  startTime: number
  endTime?: number
  status: 'running' | 'completed' | 'error'
  nodes: Map<string, ChatTraceNode>
  rootNodeId: string
}

// ==================== 存储 ====================

const STORAGE_KEY = 'ai_chat_logs_v1'
const MAX_LOGS = 10000  // 最大日志条数

// ==================== 状态 ====================

const logs: Ref<LogEntry[]> = ref([])
const traces: Ref<Map<string, ChatTrace>> = ref(new Map())
const isRecording = ref(true)

// ==================== 核心函数 ====================

/** 生成唯一ID */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/** 添加日志 */
export function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
  if (!isRecording.value) return null as any
  
  const fullEntry: LogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    ...entry
  }
  
  logs.value.push(fullEntry)
  
  // 限制日志数量
  if (logs.value.length > MAX_LOGS) {
    logs.value = logs.value.slice(-MAX_LOGS)
  }
  
  // 持久化
  persistLogs()
  
  return fullEntry
}

/** 创建对话追踪 */
export function createTrace(sessionId: string, userMessageId: string): ChatTrace {
  const traceId = generateId()
  const rootNode: ChatTraceNode = {
    id: userMessageId,
    type: 'user_message',
    timestamp: Date.now(),
    status: 'success',
    children: []
  }
  
  const trace: ChatTrace = {
    id: traceId,
    sessionId,
    startTime: Date.now(),
    status: 'running',
    nodes: new Map([[rootNode.id, rootNode]]),
    rootNodeId: rootNode.id
  }
  
  traces.value.set(traceId, trace)
  
  // 记录日志
  addLog({
    level: 'info',
    category: 'chat',
    event: 'message_start',
    message: '对话开始',
    sessionId,
    data: { traceId, userMessageId }
  })
  
  return trace
}

/** 添加追踪节点 */
export function addTraceNode(
  traceId: string,
  parentId: string,
  node: Omit<ChatTraceNode, 'id' | 'timestamp' | 'children'>
): ChatTraceNode | null {
  const trace = traces.value.get(traceId)
  if (!trace) return null
  
  const newNode: ChatTraceNode = {
    id: generateId(),
    timestamp: Date.now(),
    children: [],
    ...node
  }
  
  trace.nodes.set(newNode.id, newNode)
  
  const parent = trace.nodes.get(parentId)
  if (parent) {
    parent.children.push(newNode.id)
    newNode.parentId = parentId
  }
  
  return newNode
}

/** 完成追踪 */
export function completeTrace(traceId: string, status: 'completed' | 'error' = 'completed') {
  const trace = traces.value.get(traceId)
  if (!trace) return
  
  trace.status = status
  trace.endTime = Date.now()
  
  // 记录日志
  addLog({
    level: status === 'error' ? 'error' : 'info',
    category: 'chat',
    event: 'message_complete',
    message: status === 'error' ? '对话失败' : '对话完成',
    sessionId: trace.sessionId,
    data: { 
      traceId, 
      duration: trace.endTime - trace.startTime,
      status 
    }
  })
}

/** 持久化日志 */
function persistLogs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      logs: logs.value,
      timestamp: Date.now()
    }))
  } catch (e) {
    console.error('[Logger] Failed to persist logs:', e)
  }
}

/** 加载日志 */
export function loadLogs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      logs.value = data.logs || []
    }
  } catch (e) {
    console.error('[Logger] Failed to load logs:', e)
  }
}

/** 清空日志 */
export function clearLogs() {
  logs.value = []
  traces.value.clear()
  localStorage.removeItem(STORAGE_KEY)
}

// ==================== 搜索和筛选 ====================

export interface LogFilter {
  level?: LogLevel
  category?: LogCategory
  component?: string
  sessionId?: string
  startTime?: number
  endTime?: number
  keyword?: string
}

/** 搜索日志 */
export function searchLogs(filter: LogFilter): LogEntry[] {
  return logs.value.filter(log => {
    if (filter.level && log.level !== filter.level) return false
    if (filter.category && log.category !== filter.category) return false
    if (filter.component && log.component !== filter.component) return false
    if (filter.sessionId && log.sessionId !== filter.sessionId) return false
    if (filter.startTime && log.timestamp < filter.startTime) return false
    if (filter.endTime && log.timestamp > filter.endTime) return false
    if (filter.keyword && !log.message.toLowerCase().includes(filter.keyword.toLowerCase())) return false
    return true
  })
}

/** 获取组件相关日志 */
export function getComponentLogs(componentName: string): LogEntry[] {
  return logs.value.filter(log => log.component === componentName)
}

/** 获取会话完整链路 */
export function getSessionTrace(sessionId: string): ChatTrace | undefined {
  return Array.from(traces.value.values()).find(t => t.sessionId === sessionId)
}

// ==================== Vue 组合式函数 ====================

/**
 * 组件生命周期日志钩子
 */
export function useComponentLogger(componentName: string) {
  const log = (event: LifecycleEvent, message?: string, data?: any) => {
    addLog({
      level: 'info',
      category: 'lifecycle',
      component: componentName,
      event,
      message: message || `Component ${event}`,
      data
    })
  }
  
  return {
    logCreated: (data?: any) => log('created', `${componentName} created`, data),
    logMounted: (data?: any) => log('mounted', `${componentName} mounted`, data),
    logUpdated: (data?: any) => log('updated', `${componentName} updated`, data),
    logUnmounted: (data?: any) => log('unmounted', `${componentName} unmounted`, data),
    logActivated: (data?: any) => log('activated', `${componentName} activated`, data),
    logDeactivated: (data?: any) => log('deactivated', `${componentName} deactivated`, data),
    logCustom: (event: string, message: string, data?: any) => addLog({
      level: 'info',
      category: 'lifecycle',
      component: componentName,
      event,
      message,
      data
    })
  }
}

/**
 * 对话追踪钩子
 */
export function useChatTracer() {
  let currentTrace: ChatTrace | null = null
  
  const startTrace = (sessionId: string, userMessageId: string) => {
    currentTrace = createTrace(sessionId, userMessageId)
    return currentTrace.id
  }
  
  const addNode = (parentId: string, node: Omit<ChatTraceNode, 'id' | 'timestamp' | 'children'>) => {
    if (!currentTrace) return null
    return addTraceNode(currentTrace.id, parentId, node)
  }
  
  const endTrace = (status: 'completed' | 'error' = 'completed') => {
    if (!currentTrace) return
    completeTrace(currentTrace.id, status)
    currentTrace = null
  }
  
  return {
    startTrace,
    addNode,
    endTrace,
    getCurrentTrace: () => currentTrace
  }
}

// ==================== 导出 ====================

export const logger = {
  logs: computed(() => logs.value),
  traces: computed(() => traces.value),
  isRecording: computed(() => isRecording.value),
  
  addLog,
  searchLogs,
  clearLogs,
  loadLogs,
  
  // 快捷方法
  debug: (message: string, data?: any) => addLog({ level: 'debug', category: 'chat', message, data }),
  info: (message: string, data?: any) => addLog({ level: 'info', category: 'chat', message, data }),
  warn: (message: string, data?: any) => addLog({ level: 'warn', category: 'chat', message, data }),
  error: (message: string, data?: any) => addLog({ level: 'error', category: 'error', message, data }),
  
  // 控制
  startRecording: () => { isRecording.value = true },
  stopRecording: () => { isRecording.value = false }
}

// 初始化时加载日志
loadLogs()
