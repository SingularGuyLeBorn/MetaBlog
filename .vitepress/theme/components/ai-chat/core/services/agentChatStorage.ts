/**
 * Agent Chat Storage Service - 后端API数据源
 * 
 * 存储每个 Agent 的独立聊天会话
 * 数据源：后端API（唯一数据源）
 */

import type { ChatMessage } from '../types'
import { API_ENDPOINTS, API_CONFIG } from '../config/dataSource'

// API响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 内存缓存
const cache: Record<string, ChatMessage[]> = {}

// ==================== API请求工具 ====================

let apiAvailable = true

// 端点级别的404不应该禁用整个API
function isEndpointNotFound(url: string, status: number): boolean {
  if (status !== 404) return false
  const baseEndpoints = ['/api/agent-chat/sessions']
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
      if (response.status === 404 && isEndpointNotFound(url, response.status)) {
        apiAvailable = false
        console.warn('[AgentChatStorage] API endpoint not available (404):', url)
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

// ==================== Agent Chat API ====================

export async function getAgentChatMessages(agentId: string): Promise<ChatMessage[]> {
  if (cache[agentId]) return cache[agentId]
  
  try {
    const messages = await apiRequest<ChatMessage[]>(API_ENDPOINTS.AGENT_CHAT_MESSAGES(agentId))
    cache[agentId] = messages
    return messages
  } catch (e) {
    console.error('[AgentChatStorage] Failed to get messages:', e)
    return []
  }
}

export async function saveAgentChatMessages(agentId: string, messages: ChatMessage[]): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.AGENT_CHAT_MESSAGES(agentId), {
      method: 'POST',
      body: JSON.stringify({ messages }),
    })
    
    cache[agentId] = messages
    return true
  } catch (e) {
    console.error('[AgentChatStorage] Failed to save messages:', e)
    return false
  }
}

export async function clearAgentChatSession(agentId: string): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.AGENT_CHAT_SESSION(agentId), {
      method: 'DELETE',
    })
    
    delete cache[agentId]
    return true
  } catch (e) {
    console.error('[AgentChatStorage] Failed to clear session:', e)
    return false
  }
}

export async function getAllAgentChatSessions(): Promise<{ agentId: string; messageCount: number; lastUpdated: number }[]> {
  try {
    return await apiRequest<{ agentId: string; messageCount: number; lastUpdated: number }[]>(API_ENDPOINTS.AGENT_CHAT_SESSIONS)
  } catch (e) {
    console.error('[AgentChatStorage] Failed to get sessions:', e)
    return []
  }
}

// ==================== 缓存管理 ====================

export function clearCache(agentId?: string): void {
  if (agentId) {
    delete cache[agentId]
  } else {
    Object.keys(cache).forEach(key => delete cache[key])
  }
}

export function invalidateCache(agentId: string): void {
  delete cache[agentId]
}
