/**
 * Agent Storage Service - 后端API数据源
 * 
 * 数据源：后端API（唯一数据源）
 * 原则：
 * - 不包含任何硬编码数据
 * - 内存只做临时缓存
 * - 所有操作通过API持久化到后端
 * - 空状态由UI处理
 */

import type { Agent, Skill, AgentCreateParams, AgentUpdateParams } from '../types/agent'
import { API_ENDPOINTS, API_CONFIG } from '../config/dataSource'

// API响应格式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  id?: string
}

// 内存缓存（临时存储，页面刷新后重置）
const cache = {
  agents: null as Agent[] | null,
  skills: null as Skill[] | null,
  activeAgentId: null as string | null,
}

// ==================== API请求工具 ====================

let apiAvailable = true

// 端点级别的404不应该禁用整个API
function isEndpointNotFound(url: string, status: number): boolean {
  if (status !== 404) return false
  const baseEndpoints = ['/api/agents', '/api/skills']
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
        console.warn('[AgentStorage] API endpoint not available (404):', url)
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    // 检查内容类型
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        apiAvailable = false
        console.warn('[AgentStorage] API returned HTML instead of JSON, falling back to empty data')
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

// ==================== Agent API ====================

export async function getAgents(): Promise<Agent[]> {
  if (cache.agents) return cache.agents
  
  try {
    const agents = await apiRequest<Agent[]>(API_ENDPOINTS.AGENTS)
    cache.agents = agents
    return agents
  } catch (e) {
    console.error('[AgentStorage] Failed to get agents:', e)
    return []
  }
}

export async function getAgent(id: string): Promise<Agent | null> {
  try {
    return await apiRequest<Agent>(API_ENDPOINTS.AGENT_DETAIL(id))
  } catch (e) {
    console.error('[AgentStorage] Failed to get agent:', e)
    return null
  }
}

export async function createAgent(params: AgentCreateParams): Promise<Agent | null> {
  try {
    const agent = await apiRequest<Agent>(API_ENDPOINTS.AGENT_CREATE, {
      method: 'POST',
      body: JSON.stringify(params),
    })
    
    // 刷新缓存
    cache.agents = null
    return agent
  } catch (e) {
    console.error('[AgentStorage] Failed to create agent:', e)
    return null
  }
}

export async function updateAgent(id: string, updates: AgentUpdateParams): Promise<Agent | null> {
  try {
    const agent = await apiRequest<Agent>(API_ENDPOINTS.AGENT_UPDATE, {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    })
    
    // 刷新缓存
    cache.agents = null
    return agent
  } catch (e) {
    console.error('[AgentStorage] Failed to update agent:', e)
    return null
  }
}

export async function deleteAgent(id: string): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.AGENT_DELETE, {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
    
    // 刷新缓存
    cache.agents = null
    return true
  } catch (e) {
    console.error('[AgentStorage] Failed to delete agent:', e)
    return false
  }
}

// ==================== Active Agent API ====================

export async function getActiveAgentId(): Promise<string | null> {
  if (cache.activeAgentId) return cache.activeAgentId
  
  try {
    const result = await apiRequest<{ id: string }>(API_ENDPOINTS.ACTIVE_AGENT)
    cache.activeAgentId = result.id
    return result.id
  } catch (e) {
    // 如果API不可用，返回第一个agent的ID
    const agents = await getAgents()
    return agents[0]?.id || null
  }
}

export async function setActiveAgentId(id: string): Promise<void> {
  try {
    await apiRequest(API_ENDPOINTS.ACTIVE_AGENT, {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
    cache.activeAgentId = id
  } catch (e) {
    console.error('[AgentStorage] Failed to set active agent:', e)
  }
}

// ==================== Skill API ====================

export async function getSkills(): Promise<Skill[]> {
  if (cache.skills) return cache.skills
  
  try {
    const skills = await apiRequest<Skill[]>(API_ENDPOINTS.SKILLS)
    cache.skills = skills
    return skills
  } catch (e) {
    console.error('[AgentStorage] Failed to get skills:', e)
    return []
  }
}

export async function getSkill(id: string): Promise<Skill | null> {
  try {
    return await apiRequest<Skill>(API_ENDPOINTS.SKILL_DETAIL(id))
  } catch (e) {
    console.error('[AgentStorage] Failed to get skill:', e)
    return null
  }
}

export async function createSkill(skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): Promise<Skill | null> {
  try {
    const skill = await apiRequest<Skill>(API_ENDPOINTS.SKILL_CREATE, {
      method: 'POST',
      body: JSON.stringify(skillData),
    })
    
    // 刷新缓存
    cache.skills = null
    return skill
  } catch (e) {
    console.error('[AgentStorage] Failed to create skill:', e)
    return null
  }
}

export async function updateSkill(id: string, updates: Partial<Skill>): Promise<Skill | null> {
  try {
    const skill = await apiRequest<Skill>(API_ENDPOINTS.SKILL_UPDATE, {
      method: 'POST',
      body: JSON.stringify({ id, ...updates }),
    })
    
    // 刷新缓存
    cache.skills = null
    return skill
  } catch (e) {
    console.error('[AgentStorage] Failed to update skill:', e)
    return null
  }
}

export async function deleteSkill(id: string): Promise<boolean> {
  try {
    await apiRequest(API_ENDPOINTS.SKILL_DELETE, {
      method: 'POST',
      body: JSON.stringify({ id }),
    })
    
    // 刷新缓存
    cache.skills = null
    return true
  } catch (e) {
    console.error('[AgentStorage] Failed to delete skill:', e)
    return false
  }
}

// ==================== 缓存管理 ====================

export function clearCache(): void {
  cache.agents = null
  cache.skills = null
  cache.activeAgentId = null
}

export function invalidateAgentsCache(): void {
  cache.agents = null
}

export function invalidateSkillsCache(): void {
  cache.skills = null
}

// ==================== 初始化 ====================

export function initializeStorage(): void {
  // 不再创建任何默认数据，所有数据从后端加载
  clearCache()
}
