/**
 * Memory Storage Service - 后端API数据源
 * 
 * 数据源：后端API（唯一数据源）
 * 原则：
 * - 不包含任何硬编码数据
 * - 内存只做临时缓存
 * - 所有操作通过API持久化到后端
 * - 空状态由UI处理
 */

import type { Memory, MemoryCategory, MemorySearchOptions } from '../memory/types'
import { API_ENDPOINTS, API_CONFIG } from '../config/dataSource'

// API响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 内存缓存（临时存储，页面刷新后重置）
const cache = {
  memories: null as Memory[] | null,
  stats: null as { total: number; enabled: number; byCategory: Record<string, number> } | null,
}

// ==================== API请求工具 ====================

let apiAvailable = true

// 端点级别的404不应该禁用整个API
function isEndpointNotFound(url: string, status: number): boolean {
  if (status !== 404) return false
  const baseEndpoints = ['/api/memories']
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
        console.warn('[MemoryStorage] API endpoint not available (404):', url)
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        apiAvailable = false
        console.warn('[MemoryStorage] API returned HTML instead of JSON')
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

// ==================== Memory API ====================

export async function getMemories(): Promise<Memory[]> {
  if (cache.memories) return cache.memories
  
  try {
    const memories = await apiRequest<Memory[]>(API_ENDPOINTS.MEMORIES)
    cache.memories = memories
    return memories
  } catch (e) {
    console.error('[MemoryStorage] Failed to get memories:', e)
    return []
  }
}

export async function getMemory(id: string): Promise<Memory | null> {
  try {
    return await apiRequest<Memory>(API_ENDPOINTS.MEMORY_DETAIL(id))
  } catch (e) {
    console.error('[MemoryStorage] Failed to get memory:', e)
    return null
  }
}

export async function createMemory(
  content: string,
  category: MemoryCategory = 'facts',
  options: { importance?: number; source?: 'user' | 'inferred' } = {}
): Promise<Memory | null> {
  try {
    const memory = await apiRequest<Memory>(API_ENDPOINTS.MEMORIES, {
      method: 'POST',
      body: JSON.stringify({
        content: content.trim(),
        category,
        importance: options.importance ?? 3,
        source: options.source ?? 'user'
      }),
    })
    
    // 刷新缓存
    cache.memories = null
    cache.stats = null
    return memory
  } catch (e) {
    console.error('[MemoryStorage] Failed to create memory:', e)
    return null
  }
}

export async function updateMemory(
  id: string, 
  updates: Partial<Omit<Memory, 'id' | 'createdAt'>>
): Promise<Memory | null> {
  try {
    const memory = await apiRequest<Memory>(API_ENDPOINTS.MEMORY_UPDATE, {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    })
    
    // 刷新缓存
    cache.memories = null
    cache.stats = null
    return memory
  } catch (e) {
    console.error('[MemoryStorage] Failed to update memory:', e)
    return null
  }
}

export async function deleteMemory(id: string): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.MEMORY_DELETE, {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
    
    // 刷新缓存
    cache.memories = null
    cache.stats = null
    return true
  } catch (e) {
    console.error('[MemoryStorage] Failed to delete memory:', e)
    return false
  }
}

export async function searchMemories(options: MemorySearchOptions = {}): Promise<Memory[]> {
  try {
    return await apiRequest<Memory[]>(API_ENDPOINTS.MEMORY_SEARCH, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  } catch (e) {
    console.error('[MemoryStorage] Failed to search memories:', e)
    return []
  }
}

export async function getMemoryStats(): Promise<{ total: number; enabled: number; byCategory: Record<string, number> }> {
  if (cache.stats) return cache.stats
  
  try {
    const stats = await apiRequest<{ total: number; enabled: number; byCategory: Record<string, number> }>(API_ENDPOINTS.MEMORY_STATS)
    cache.stats = stats
    return stats
  } catch (e) {
    console.error('[MemoryStorage] Failed to get memory stats:', e)
    return { total: 0, enabled: 0, byCategory: {} }
  }
}

export async function clearAllMemories(): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.MEMORY_CLEAR, {
      method: 'POST',
    })
    
    // 清空缓存
    cache.memories = null
    cache.stats = null
    return true
  } catch (e) {
    console.error('[MemoryStorage] Failed to clear memories:', e)
    return false
  }
}

// ==================== 格式化工具 ====================

export function formatMemoriesForPrompt(
  memories: Memory[],
  options: { maxLength?: number; groupByCategory?: boolean } = {}
): string {
  const { maxLength = 2000, groupByCategory = true } = options
  const enabledMemories = memories.filter(m => m.enabled)
  
  if (enabledMemories.length === 0) return ''
  
  let formatted = ''
  
  if (groupByCategory) {
    const categories: Record<MemoryCategory, string> = {
      user_info: '用户信息',
      preferences: '偏好设置',
      facts: '重要信息',
      goals: '目标计划',
      context: '上下文'
    }
    
    const grouped: Record<string, Memory[]> = {}
    for (const mem of enabledMemories) {
      if (!grouped[mem.category]) grouped[mem.category] = []
      grouped[mem.category].push(mem)
    }
    
    for (const [cat, mems] of Object.entries(grouped)) {
      if (mems.length === 0) continue
      const catName = categories[cat as MemoryCategory] || cat
      formatted += `\n【${catName}】\n`
      for (const mem of mems) {
        formatted += `- ${mem.content}\n`
      }
    }
  } else {
    formatted = '\n【关于用户】\n'
    for (const mem of enabledMemories) {
      formatted += `- ${mem.content}\n`
    }
  }
  
  // 截断到最大长度
  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength) + '\n...（更多记忆已省略）'
  }
  
  return formatted
}

export async function getMemoryPrompt(options: { maxLength?: number } = {}): Promise<string> {
  const memories = await getMemories()
  const memoryText = formatMemoriesForPrompt(memories, { maxLength: options.maxLength ?? 1500 })
  
  if (!memoryText) return ''
  
  return `\n=== 用户记忆 ===${memoryText}===\n在回复时，请考虑上述记忆中的信息。`
}

// ==================== 缓存管理 ====================

export function clearCache(): void {
  cache.memories = null
  cache.stats = null
}

export function invalidateMemoriesCache(): void {
  cache.memories = null
}

export function invalidateStatsCache(): void {
  cache.stats = null
}

// ==================== 初始化 ====================

export function initializeStorage(): void {
  clearCache()
}
