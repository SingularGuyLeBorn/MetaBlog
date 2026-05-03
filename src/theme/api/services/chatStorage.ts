/**
 * ============================================================================
 * 后端服务 - chatStorage
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/services
 */


import { API_CONFIG, API_ENDPOINTS } from '@/theme/api/config'
import type { ChatSession, MessageGroup, SessionConfig } from '@/theme/types'

// API响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 内存缓存
const cache = {
  sessions: null as ChatSession[] | null,
  messageGroups: {} as Record<string, MessageGroup[]>,
}

// ==================== API请求工具 ====================

let apiAvailable = true

// 端点级别的404(如特定session不存在)不应该禁用整个API
// 只有基础API端点不存在时才禁用
function isEndpointNotFound(url: string, status: number): boolean {
  if (status !== 404) return false
  // 检查是否是基础端点(如 /api/sessions)而不是特定资源(如 /api/sessions/xxx)
  const baseEndpoints = ['/api/sessions', '/api/agents', '/api/skills']
  const isBaseEndpoint = baseEndpoints.some(endpoint => url === endpoint || url.startsWith(`${endpoint}?`))
  return isBaseEndpoint
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  if (!apiAvailable) {
    throw new Error('API not available')
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // 只有基础API端点返回404时才禁用API
      // 特定资源不存在(如某个session ID不存在)是正常的业务逻辑,不应禁用API
      if (response.status === 404 && isEndpointNotFound(url, response.status)) {
        apiAvailable = false
        console.warn('[ChatStorage] API endpoint not available (404):', url)
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        apiAvailable = false
        throw new Error('API returned HTML instead of JSON')
      }
      throw new Error('API did not return JSON')
    }

    const result = await response.json() as ApiResponse<T>

    if (!result.success) {
      throw new Error(result.error || 'API returned unsuccessful response')
    }

    return result.data as T
  } catch (error: any) {
    clearTimeout(timeoutId)
    // 处理超时错误
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${API_CONFIG.timeout}ms: ${url}`)
    }
    throw error
  }
}

/**
 * 判断是否为ApiAvailable
 *
 * @returns 返回值(boolean)
 */
export function isApiAvailable(): boolean {
  return apiAvailable
}

/**
 * resetApiStatus 函数
 *
 * @returns 返回值
 */
export function resetApiStatus(): void {
  apiAvailable = true
}

// ==================== Session API ====================

/**
 * 获取Sessions
 *
 * @returns 返回值(Promise<ChatSession[]>)
 */
export async function getSessions(): Promise<ChatSession[]> {
  if (cache.sessions) return cache.sessions

  try {
    const sessions = await apiRequest<ChatSession[]>(API_ENDPOINTS.SESSIONS)
    cache.sessions = sessions
    return sessions
  } catch (e) {
    console.error('[ChatStorage] Failed to get sessions:', e)
    return []
  }
}

/**
 * 获取Session
 *
 * @param id - 参数(string)
 * @returns 返回值(Promise<ChatSession | null>)
 */
export async function getSession(id: string): Promise<ChatSession | null> {
  try {
    return await apiRequest<ChatSession>(API_ENDPOINTS.SESSION_DETAIL(id))
  } catch (e: any) {
    // 404 表示 session 不存在,这是正常的业务逻辑,不记录为错误
    if (e.message?.includes('404')) {
      return null
    }
    console.error('[ChatStorage] Failed to get session:', e)
    return null
  }
}

/**
 * 创建Session
 *
 * @param params - 参数
 * @returns 返回值(Promise<ChatSession | null>)
 */
export async function createSession(params?: { id?: string; title?: string; config?: Partial<SessionConfig> }): Promise<ChatSession | null> {
  try {
    const session = await apiRequest<ChatSession>(API_ENDPOINTS.SESSIONS, {
      method: 'POST',
      body: JSON.stringify(params || {}),
    })

    cache.sessions = null
    return session
  } catch (e) {
    console.error('[ChatStorage] Failed to create session:', e)
    return null
  }
}

/**
 * 更新Session
 *
 * @param id - 参数(string)
 * @param updates - 参数(Partial<ChatSession>)
 * @returns 返回值(Promise<ChatSession | null>)
 */
export async function updateSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
  try {
    const session = await apiRequest<ChatSession>(API_ENDPOINTS.SESSION_DETAIL(id), {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    cache.sessions = null
    return session
  } catch (e: any) {
    // 404 表示 session 不存在,可能已被删除
    if (e.message?.includes('404')) {
      return null
    }
    console.error('[ChatStorage] Failed to update session:', e)
    return null
  }
}

/**
 * 删除Session
 *
 * @param id - 参数(string)
 * @returns 返回值(Promise<boolean>)
 */
export async function deleteSession(id: string): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.SESSION_DETAIL(id), {
      method: 'DELETE',
    })

    cache.sessions = null
    delete cache.messageGroups[id]
    return true
  } catch (e) {
    console.error('[ChatStorage] Failed to delete session:', e)
    return false
  }
}

// ==================== Message API ====================

/**
 * 获取MessageGroups
 *
 * @param sessionId - 参数(string)
 * @returns 返回值(Promise<MessageGroup[]>)
 */
export async function getMessageGroups(sessionId: string): Promise<MessageGroup[]> {
  if (cache.messageGroups[sessionId]) return cache.messageGroups[sessionId]

  try {
    const groups = await apiRequest<MessageGroup[]>(API_ENDPOINTS.MESSAGES(sessionId))
    cache.messageGroups[sessionId] = groups
    return groups
  } catch (e) {
    console.error('[ChatStorage] Failed to get messages:', e)
    return []
  }
}

/**
 * saveMessageGroup 函数
 *
 * @param sessionId - 参数(string)
 * @param group - 参数(MessageGroup)
 * @returns 返回值(Promise<boolean>)
 */
export async function saveMessageGroup(sessionId: string, group: MessageGroup): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.MESSAGES(sessionId), {
      method: 'POST',
      body: JSON.stringify({ group }),
    })

    cache.messageGroups[sessionId] = null as any
    return true
  } catch (e: any) {
    // 404 表示 session 不存在
    if (e.message?.includes('404')) {
      return false
    }
    console.error('[ChatStorage] Failed to save message group:', e)
    return false
  }
}

// 注意：后端不支持单个消息组的 PUT/DELETE 操作
// 这些操作通过 saveAllMessageGroups 批量替换实现

/**
 * 更新MessageGroup
 *
 * @param sessionId - 参数(string)
 * @param groupId - 参数(string)
 * @param updates - 参数(Partial<MessageGroup>)
 * @returns 返回值(Promise<boolean>)
 */
export async function updateMessageGroup(sessionId: string, groupId: string, updates: Partial<MessageGroup>): Promise<boolean> {
  // 先获取当前所有消息组
  const groups = await getMessageGroups(sessionId)

  // 找到并更新指定的消息组
  const index = groups.findIndex(g => g.userMessage.id === groupId || g.aiVersions.some(v => v.id === groupId))
  if (index === -1) return false

  // 应用更新
  groups[index] = { ...groups[index], ...updates } as MessageGroup

  // 批量保存所有消息组
  return saveAllMessageGroups(sessionId, groups)
}

/**
 * 删除MessageGroup
 *
 * @param sessionId - 参数(string)
 * @param groupId - 参数(string)
 * @returns 返回值(Promise<boolean>)
 */
export async function deleteMessageGroup(sessionId: string, groupId: string): Promise<boolean> {
  // 先获取当前所有消息组
  const groups = await getMessageGroups(sessionId)

  // 过滤掉要删除的消息组
  const filteredGroups = groups.filter(g => g.userMessage.id !== groupId && !g.aiVersions.some(v => v.id === groupId))

  // 如果数量没变,说明没找到
  if (filteredGroups.length === groups.length) return false

  // 批量保存剩余的消息组
  return saveAllMessageGroups(sessionId, filteredGroups)
}

// ==================== 批量操作 ====================

/**
 * saveAllMessageGroups 函数
 *
 * @param sessionId - 参数(string)
 * @param groups - 参数(MessageGroup[])
 * @returns 返回值(Promise<boolean>)
 */
export async function saveAllMessageGroups(sessionId: string, groups: MessageGroup[]): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.MESSAGES_BATCH(sessionId), {
      method: 'POST',
      body: JSON.stringify({ groups }),
    })

    cache.messageGroups[sessionId] = groups
    return true
  } catch (e: any) {
    // 404 表示 session 不存在,可能已被删除
    if (e.message?.includes('404')) {
      return false
    }
    console.error('[ChatStorage] Failed to save message groups:', e)
    return false
  }
}

// ==================== 缓存管理 ====================

/**
 * clearCache 函数
 *
 * @returns 返回值
 */
export function clearCache(): void {
  cache.sessions = null
  cache.messageGroups = {}
}

/**
 * invalidateSessionsCache 函数
 *
 * @returns 返回值
 */
export function invalidateSessionsCache(): void {
  cache.sessions = null
}

/**
 * invalidateMessagesCache 函数
 *
 * @param sessionId - 参数
 * @returns 返回值
 */
export function invalidateMessagesCache(sessionId?: string): void {
  if (sessionId) {
    delete cache.messageGroups[sessionId]
  } else {
    cache.messageGroups = {}
  }
}

// ==================== 初始化 ====================

/**
 * initializeStorage 函数
 *
 * @returns 返回值
 */
export function initializeStorage(): void {
  clearCache()
}
