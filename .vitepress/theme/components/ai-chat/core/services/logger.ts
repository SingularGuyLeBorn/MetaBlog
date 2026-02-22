/**
 * 结构化日志系统（服务端存储版）
 * 
 * 功能：
 * 1. 组件生命周期日志（挂载、更新、卸载）
 * 2. 对话完整链路追踪
 * 3. 工具调用记录
 * 4. 支持搜索和筛选
 * 5. 日志存储到服务端文件系统
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
  parentId?: string
}

/** 工具调用记录 */
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

/** 日志统计 */
export interface LogStats {
  totalLogs: number
  todayLogs: number
  errorCount: number
  uniqueComponents: string[]
}

/** 日志筛选 */
export interface LogFilter {
  level?: LogLevel
  category?: LogCategory
  component?: string
  keyword?: string
  startTime?: number
  endTime?: number
  limit?: number
  offset?: number
}

// ==================== 状态 ====================

const logs: Ref<LogEntry[]> = ref([])
const stats: Ref<LogStats | null> = ref(null)
const isRecording = ref(true)
let logBuffer: Omit<LogEntry, 'id' | 'timestamp'>[] = []
let flushTimer: number | null = null

// ==================== 核心函数 ====================

/** 生成唯一ID */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/** 批量写入日志到服务端 */
async function flushLogs() {
  if (logBuffer.length === 0) return
  
  const entries = [...logBuffer]
  logBuffer = []
  
  try {
    const response = await fetch('/api/logs/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: entries })
    })
    
    if (!response.ok) {
      // 检查是否是 HTML 错误页面
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('[Logger] Server returned non-JSON response, logs may not be persisted')
        return
      }
      console.error('[Logger] Failed to flush logs:', await response.text())
    }
  } catch (error) {
    // 静默处理网络错误，避免影响用户体验
    console.debug('[Logger] Flush error (non-critical):', error)
  }
}

/** 延迟批量写入 */
function scheduleFlush() {
  if (flushTimer) return
  
  flushTimer = window.setTimeout(() => {
    flushLogs()
    flushTimer = null
  }, 1000) // 1秒批量写入一次
}

/** 添加日志 */
export function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
  if (!isRecording.value) return null as any
  
  const fullEntry: LogEntry = {
    id: generateId(),
    timestamp: Date.now(),
    ...entry
  }
  
  // 添加到本地缓存（用于实时显示）
  logs.value.push(fullEntry)
  
  // 限制本地缓存数量
  if (logs.value.length > 1000) {
    logs.value = logs.value.slice(-1000)
  }
  
  // 添加到批量写入缓冲区
  logBuffer.push(fullEntry)
  scheduleFlush()
  
  return fullEntry
}

/** 从服务端加载日志 */
export async function loadLogs(filter: LogFilter = {}): Promise<LogEntry[]> {
  try {
    const params = new URLSearchParams()
    if (filter.level) params.append('level', filter.level)
    if (filter.category) params.append('category', filter.category)
    if (filter.component) params.append('component', filter.component)
    if (filter.keyword) params.append('keyword', filter.keyword)
    if (filter.startTime) params.append('startTime', filter.startTime.toString())
    if (filter.endTime) params.append('endTime', filter.endTime.toString())
    if (filter.limit) params.append('limit', filter.limit.toString())
    if (filter.offset) params.append('offset', filter.offset.toString())
    
    const response = await fetch(`/api/logs/query?${params}`)
    
    // 检查 Content-Type，避免解析 HTML 错误页面
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Logger] Server returned non-JSON response, skipping log load')
      return []
    }
    
    const result = await response.json()
    
    if (result.success) {
      logs.value = result.data
      return result.data
    }
    return []
  } catch (error) {
    console.error('[Logger] Load error:', error)
    return []
  }
}

/** 加载统计信息 */
export async function loadStats(): Promise<LogStats | null> {
  try {
    const response = await fetch('/api/logs/stats')
    
    // 检查 Content-Type，避免解析 HTML 错误页面
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Logger] Server returned non-JSON response, skipping stats load')
      return null
    }
    
    const result = await response.json()
    
    if (result.success) {
      stats.value = result.data
      return result.data
    }
    return null
  } catch (error) {
    console.error('[Logger] Stats error:', error)
    return null
  }
}

/** 清空日志 */
export async function clearLogs(days?: number): Promise<boolean> {
  try {
    const response = await fetch('/api/logs/cleanup', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: days ?? 0 })  // days=0 表示清空所有
    })
    
    if (!response.ok) {
      console.error('[Logger] Clear failed:', response.status, response.statusText)
      return false
    }
    
    const result = await response.json()
    
    if (result.success) {
      logs.value = []
      await loadStats()
      return true
    }
    return false
  } catch (error) {
    console.error('[Logger] Clear error:', error)
    return false
  }
}

/** 导出日志 */
export function exportLogs(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  
  const url = `/api/logs/export?${params}`
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-export-${Date.now()}.json`
  a.click()
}

/** 搜索日志 */
export async function searchLogs(filter: LogFilter): Promise<LogEntry[]> {
  return loadLogs(filter)
}

/** 获取组件相关日志 */
export async function getComponentLogs(componentName: string): Promise<LogEntry[]> {
  return loadLogs({ component: componentName })
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

// ==================== 导出 ====================

export const logger = {
  logs: computed(() => logs.value),
  stats: computed(() => stats.value),
  isRecording: computed(() => isRecording.value),
  
  addLog,
  loadLogs,
  loadStats,
  clearLogs,
  exportLogs,
  searchLogs,
  
  // 快捷方法
  debug: (message: string, data?: any) => addLog({ level: 'debug', category: 'chat', message, data }),
  info: (message: string, data?: any) => addLog({ level: 'info', category: 'chat', message, data }),
  warn: (message: string, data?: any) => addLog({ level: 'warn', category: 'chat', message, data }),
  error: (message: string, data?: any) => addLog({ level: 'error', category: 'error', message, data }),
  
  // 控制
  startRecording: () => { isRecording.value = true },
  stopRecording: () => { isRecording.value = false }
}

// 页面卸载前确保日志写入
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (logBuffer.length > 0) {
      // 使用 sendBeacon 确保日志发送
      const blob = new Blob(
        [JSON.stringify({ entries: logBuffer })],
        { type: 'application/json' }
      )
      navigator.sendBeacon('/api/logs/batch', blob)
    }
  })
}
