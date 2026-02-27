/**
 * Chat Storage Service - 后端API数据源
 * 
 * 数据源：后端API（唯一数据源）
 * 原则：
 * - 所有会话和消息通过API持久化到后端
 * - 内存只做临时缓存
 * - 空状态由UI处理
 */

import type { ChatSession, ChatMessage, MessageGroup, SessionConfig } from '../types'
import { API_ENDPOINTS, API_CONFIG } from '../config/dataSource'

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
      if (response.status === 404) {
        apiAvailable = false
        console.warn('[ChatStorage] API not available (404)')
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
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

export function isApiAvailable(): boolean {
  return apiAvailable
}

export function resetApiStatus(): void {
  apiAvailable = true
}

// ==================== Session API ====================

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

export async function getSession(id: string): Promise<ChatSession | null> {
  try {
    return await apiRequest<ChatSession>(API_ENDPOINTS.SESSION_DETAIL(id))
  } catch (e) {
    console.error('[ChatStorage] Failed to get session:', e)
    return null
  }
}

export async function createSession(params?: { title?: string; config?: Partial<SessionConfig> }): Promise<ChatSession | null> {
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

export async function updateSession(id: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
  try {
    const session = await apiRequest<ChatSession>(API_ENDPOINTS.SESSION_DETAIL(id), {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    
    cache.sessions = null
    return session
  } catch (e) {
    console.error('[ChatStorage] Failed to update session:', e)
    return null
  }
}

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

export async function saveMessageGroup(sessionId: string, group: MessageGroup): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.MESSAGES(sessionId), {
      method: 'POST',
      body: JSON.stringify(group),
    })
    
    cache.messageGroups[sessionId] = null as any
    return true
  } catch (e) {
    console.error('[ChatStorage] Failed to save message group:', e)
    return false
  }
}

export async function updateMessageGroup(sessionId: string, groupId: string, updates: Partial<MessageGroup>): Promise<boolean> {
  try {
    await apiRequest(`${API_ENDPOINTS.MESSAGES(sessionId)}/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    
    cache.messageGroups[sessionId] = null as any
    return true
  } catch (e) {
    console.error('[ChatStorage] Failed to update message group:', e)
    return false
  }
}

export async function deleteMessageGroup(sessionId: string, groupId: string): Promise<boolean> {
  try {
    await apiRequest(`${API_ENDPOINTS.MESSAGES(sessionId)}/${groupId}`, {
      method: 'DELETE',
    })
    
    cache.messageGroups[sessionId] = null as any
    return true
  } catch (e) {
    console.error('[ChatStorage] Failed to delete message group:', e)
    return false
  }
}

// ==================== 批量操作 ====================

export async function saveAllMessageGroups(sessionId: string, groups: MessageGroup[]): Promise<boolean> {
  try {
    await apiRequest(`${API_ENDPOINTS.MESSAGES(sessionId)}/batch`, {
      method: 'POST',
      body: JSON.stringify({ groups }),
    })
    
    cache.messageGroups[sessionId] = groups
    return true
  } catch (e) {
    console.error('[ChatStorage] Failed to save message groups:', e)
    return false
  }
}

// ==================== 缓存管理 ====================

export function clearCache(): void {
  cache.sessions = null
  cache.messageGroups = {}
}

export function invalidateSessionsCache(): void {
  cache.sessions = null
}

export function invalidateMessagesCache(sessionId?: string): void {
  if (sessionId) {
    delete cache.messageGroups[sessionId]
  } else {
    cache.messageGroups = {}
  }
}

// ==================== 初始化 ====================

export function initializeStorage(): void {
  clearCache()
}
