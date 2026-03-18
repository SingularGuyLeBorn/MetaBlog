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

import type { Agent, Skill, AgentCreateParams, AgentUpdateParams } from '../../types/agent'
import { API_ENDPOINTS, API_CONFIG } from '../config'

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
    // 转换前端字段为后端期望格式
    // 前端: skills -> 后端: capabilities.skillIds
    // 前端: systemPrompt -> 后端: capabilities.customSystemPrompt
    // 前端: memoryEnabled/memoryContent -> 后端: memory.enabled/memory.content
    const body: any = {
      name: params.name,
      avatar: params.avatar,
      description: params.description,
      level: params.level,
      status: params.status || 'online',
      seat: params.seat || 1,
      isDefault: params.isDefault || false,
      permissions: params.permissions || [],
    }
    
    // 映射 capabilities（支持两种字段名）
    const skillIds = (params as any).skills ?? params.capabilities?.skillIds ?? []
    const customSystemPrompt = (params as any).systemPrompt ?? params.capabilities?.customSystemPrompt ?? ''
    const toolIds = params.capabilities?.toolIds ?? []
    
    body.capabilities = {
      mode: 'raw' as const,
      skillIds,
      toolIds,
      customSystemPrompt,
    }
    
    // 映射 memory（支持两种字段名）
    const memoryEnabled = (params as any).memoryEnabled ?? params.memory?.enabled ?? true
    const memoryContent = (params as any).memoryContent ?? params.memory?.content ?? ''
    const autoExtract = params.memory?.autoExtract ?? true
    const maxTokens = params.memory?.maxTokens ?? 2000
    
    body.memory = {
      enabled: memoryEnabled,
      content: memoryContent,
      autoExtract,
      maxTokens,
    }
    
    const agent = await apiRequest<Agent>(API_ENDPOINTS.AGENTS, {
      method: 'POST',
      body: JSON.stringify(body),
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
    // 转换前端字段为后端期望格式（与 createAgent 一致）
    const body: any = { id }
    
    // 复制基本字段
    if (updates.name !== undefined) body.name = updates.name
    if (updates.avatar !== undefined) body.avatar = updates.avatar
    if (updates.description !== undefined) body.description = updates.description
    if (updates.level !== undefined) body.level = updates.level
    if (updates.status !== undefined) body.status = updates.status
    if (updates.seat !== undefined) body.seat = updates.seat
    if (updates.isDefault !== undefined) body.isDefault = updates.isDefault
    if (updates.permissions !== undefined) body.permissions = updates.permissions
    if (updates.lastActiveAt !== undefined) body.lastActiveAt = updates.lastActiveAt
    if (updates.callCount !== undefined) body.callCount = updates.callCount
    
    // 映射 capabilities（支持两种字段名）
    const hasCapabilityUpdates = (updates as any).skills !== undefined || 
                                 (updates as any).systemPrompt !== undefined ||
                                 updates.capabilities !== undefined
    
    if (hasCapabilityUpdates) {
      const skillIds = (updates as any).skills ?? updates.capabilities?.skillIds
      const customSystemPrompt = (updates as any).systemPrompt ?? updates.capabilities?.customSystemPrompt
      const toolIds = updates.capabilities?.toolIds
      
      body.capabilities = {
        mode: 'raw' as const,
      }
      if (skillIds !== undefined) body.capabilities.skillIds = skillIds
      if (customSystemPrompt !== undefined) body.capabilities.customSystemPrompt = customSystemPrompt
      if (toolIds !== undefined) body.capabilities.toolIds = toolIds
    }
    
    // 映射 memory（支持两种字段名）
    const hasMemoryUpdates = (updates as any).memoryEnabled !== undefined ||
                            (updates as any).memoryContent !== undefined ||
                            updates.memory !== undefined
    
    if (hasMemoryUpdates) {
      body.memory = {}
      const enabled = (updates as any).memoryEnabled ?? updates.memory?.enabled
      const content = (updates as any).memoryContent ?? updates.memory?.content
      const autoExtract = updates.memory?.autoExtract
      const maxTokens = updates.memory?.maxTokens
      
      if (enabled !== undefined) body.memory.enabled = enabled
      if (content !== undefined) body.memory.content = content
      if (autoExtract !== undefined) body.memory.autoExtract = autoExtract
      if (maxTokens !== undefined) body.memory.maxTokens = maxTokens
    }
    
    const agent = await apiRequest<Agent>(API_ENDPOINTS.AGENT_UPDATE, {
      method: 'POST',
      body: JSON.stringify(body),
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
    const skill = await apiRequest<Skill>(API_ENDPOINTS.SKILLS, {
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
