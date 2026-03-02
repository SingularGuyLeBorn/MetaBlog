/**
 * MCP Storage Service - 后端API数据源
 * 
 * 数据源：后端API（唯一数据源）
 * 原则：
 * - 不包含任何硬编码数据
 * - 内存只做临时缓存
 * - 所有操作通过API持久化到后端
 * - 空状态由UI处理
 */

import type { MCPServerConfig, MCPTool, MCPResource, MCPPrompt } from '../mcp/types'
import { API_ENDPOINTS, API_CONFIG } from '../config/dataSource'

// API响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 服务器状态（运行时）
export interface MCPServerState {
  id: string
  config: MCPServerConfig
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  error?: string
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
  connectAttempts: number
}

// 内存缓存（临时存储，页面刷新后重置）
const cache = {
  servers: null as MCPServerState[] | null,
}

// ==================== API请求工具 ====================

let apiAvailable = true

// 端点级别的404不应该禁用整个API
function isEndpointNotFound(url: string, status: number): boolean {
  if (status !== 404) return false
  const baseEndpoints = ['/api/mcp/servers']
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
        console.warn('[MCPStorage] API endpoint not available (404):', url)
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        apiAvailable = false
        console.warn('[MCPStorage] API returned HTML instead of JSON')
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

// ==================== MCP Server API ====================

export async function getMCPServers(): Promise<MCPServerState[]> {
  if (cache.servers) return cache.servers
  
  try {
    const servers = await apiRequest<MCPServerState[]>(API_ENDPOINTS.MCP_SERVERS)
    cache.servers = servers
    return servers
  } catch (e) {
    console.error('[MCPStorage] Failed to get MCP servers:', e)
    return []
  }
}

export async function getMCPServer(id: string): Promise<MCPServerState | null> {
  try {
    return await apiRequest<MCPServerState>(API_ENDPOINTS.MCP_SERVER_DETAIL(id))
  } catch (e) {
    console.error('[MCPStorage] Failed to get MCP server:', e)
    return null
  }
}

export async function createMCPServer(config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<MCPServerState | null> {
  try {
    const server = await apiRequest<MCPServerState>(API_ENDPOINTS.MCP_SERVERS, {
      method: 'POST',
      body: JSON.stringify(config),
    })
    
    // 刷新缓存
    cache.servers = null
    return server
  } catch (e) {
    console.error('[MCPStorage] Failed to create MCP server:', e)
    return null
  }
}

export async function updateMCPServer(id: string, updates: Partial<MCPServerConfig>): Promise<MCPServerState | null> {
  try {
    const server = await apiRequest<MCPServerState>(API_ENDPOINTS.MCP_SERVER_UPDATE, {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    })
    
    // 刷新缓存
    cache.servers = null
    return server
  } catch (e) {
    console.error('[MCPStorage] Failed to update MCP server:', e)
    return null
  }
}

export async function deleteMCPServer(id: string): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.MCP_SERVER_DELETE, {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
    
    // 刷新缓存
    cache.servers = null
    return true
  } catch (e) {
    console.error('[MCPStorage] Failed to delete MCP server:', e)
    return false
  }
}

// ==================== 连接管理 ====================

export async function connectMCPServer(id: string): Promise<MCPServerState | null> {
  try {
    const server = await apiRequest<MCPServerState>(API_ENDPOINTS.MCP_SERVER_CONNECT(id), {
      method: 'POST',
    })
    
    // 刷新缓存
    cache.servers = null
    return server
  } catch (e) {
    console.error('[MCPStorage] Failed to connect MCP server:', e)
    return null
  }
}

export async function disconnectMCPServer(id: string): Promise<MCPServerState | null> {
  try {
    const server = await apiRequest<MCPServerState>(API_ENDPOINTS.MCP_SERVER_DISCONNECT(id), {
      method: 'POST',
    })
    
    // 刷新缓存
    cache.servers = null
    return server
  } catch (e) {
    console.error('[MCPStorage] Failed to disconnect MCP server:', e)
    return null
  }
}

// ==================== 工具调用 ====================

export async function executeMCPTool(
  serverId: string,
  toolName: string,
  args: Record<string, any>
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    return await apiRequest<{ success: boolean; result?: string; error?: string }>(
      `${API_ENDPOINTS.MCP_SERVER_DETAIL(serverId)}/tools/${toolName}/execute`,
      {
        method: 'POST',
        body: JSON.stringify(args),
      }
    )
  } catch (e) {
    console.error('[MCPStorage] Failed to execute MCP tool:', e)
    return { success: false, error: String(e) }
  }
}

// ==================== 缓存管理 ====================

export function clearCache(): void {
  cache.servers = null
}

export function invalidateServersCache(): void {
  cache.servers = null
}

// ==================== 初始化 ====================

export function initializeStorage(): void {
  clearCache()
}
