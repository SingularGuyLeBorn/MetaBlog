/**
 * ============================================================================
 * Pinia Store - useAgents
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/stores
 */


import type { Agent, AgentCapabilities, AgentLevel, AgentPermission } from '@/theme/types/agent';
import { computed, ref } from 'vue';
export type { Agent, AgentCapabilities, AgentLevel, AgentPermission };

export const LEVEL_CONFIG: Record<AgentLevel, { label: string; color: string; icon: string; maxSeat: number }> = {
  meta: { label: 'Meta', color: '#8b5cf6', icon: '👑', maxSeat: 1 },
  core: { label: '核心', color: '#3b82f6', icon: '⭐', maxSeat: 3 },
  fixed: { label: '固定', color: '#f59e0b', icon: '📌', maxSeat: 5 },
  custom: { label: '自定义', color: '#10b981', icon: '🎨', maxSeat: 10 },
  temp: { label: '临时', color: '#6b7280', icon: '⏳', maxSeat: 20 }
}

export const PERMISSION_TEMPLATES: Record<string, AgentPermission[]> = {
  default: [
    { id: 'use_skill', name: '使用技能', description: '允许使用已配置的技能', granted: true },
    { id: 'use_tool', name: '使用工具', description: '允许使用已配置的工具', granted: true }
  ]
}

// 重新导出完整的 useAgentConfig(从 agentStore)
export { useAgentConfig } from '@/theme/stores/agentStore';

const DEFAULT_CAPABILITIES: AgentCapabilities = {
  mode: 'raw',
  skillIds: [],
  toolIds: [],
  customSystemPrompt: ''
}

// 为了向后兼容,保留一个简化版的 useAgents
const agents = ref<Agent[]>([])
const activeAgentId = ref<string>('')

/**
 * useAgents 函数
 *
 * @returns 返回值
 */
export function useAgents() {
  const activeAgent = computed(() =>
    agents.value.find(a => a.id === activeAgentId.value)
  )

  const sortedAgents = computed(() =>
    [...agents.value].sort((a, b) => (b.callCount || 0) - (a.callCount || 0))
  )

  const groupedAgents = computed(() => {
    const groups: Record<AgentLevel, Agent[]> = { meta: [], core: [], fixed: [], custom: [], temp: [] }
    agents.value.forEach(agent => {
      if (groups[agent.level]) {
        groups[agent.level].push(agent)
      }
    })
    return groups
  })

  function setActive(id: string) {
    activeAgentId.value = id
  }

  function createAgent(data: Partial<Agent>) {
    const agent: Agent = {
      id: Date.now().toString(),
      name: data.name || 'New Agent',
      avatar: data.avatar || '🤖',
      level: (data.level as AgentLevel) || 'custom',
      status: 'offline',
      description: data.description || '',
      seat: data.seat || 1,
      capabilities: data.capabilities || { ...DEFAULT_CAPABILITIES },
      memory: data.memory || { enabled: true, content: '', autoExtract: true, maxTokens: 2000 },
      permissions: data.permissions || PERMISSION_TEMPLATES.default,
      callCount: 0,
      isDefault: false,
      lastActiveAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    agents.value.push(agent)
    return agent
  }

  function updateAgent(id: string, updates: Partial<Agent>) {
    const index = agents.value.findIndex(a => a.id === id)
    if (index > -1) {
      agents.value[index] = { ...agents.value[index], ...updates, updatedAt: Date.now() }
      return agents.value[index]
    }
    return null
  }

  function deleteAgent(id: string) {
    const index = agents.value.findIndex(a => a.id === id)
    if (index > -1) {
      agents.value.splice(index, 1)
      return true
    }
    return false
  }

  return {
    agents,
    activeAgentId,
    activeAgent,
    sortedAgents,
    groupedAgents,
    setActive,
    createAgent,
    updateAgent,
    deleteAgent
  }
}
