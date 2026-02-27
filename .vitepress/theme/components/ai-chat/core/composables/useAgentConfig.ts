/**
 * useAgentConfig - 统一的 Agent 配置管理
 * 
 * 数据源：后端API（唯一数据源）
 * 原则：
 * - 内存只做临时存储
 * - 所有数据通过API持久化到后端
 * - 空状态由UI处理
 */

import { ref, computed } from 'vue'
import type { 
  Agent, 
  Skill, 
  Tool,
  AgentCreateParams, 
  AgentUpdateParams,
  AgentConfigMode,
  CapabilityNode,
  CapabilityEdge,
  CapabilityGraph,
  SystemPromptContext
} from '../types/agent'
import { CONFIG_MODES } from '../types/agent'
import { 
  getAgents, 
  createAgent as createAgentStorage,
  updateAgent as updateAgentStorage,
  deleteAgent as deleteAgentStorage,
  getActiveAgentId,
  setActiveAgentId,
  getSkills,
  createSkill as createSkillStorage,
  updateSkill as updateSkillStorage,
  deleteSkill as deleteSkillStorage
} from '../services/agentStorage'
import { allToolDefinitions } from '../tools/definitions'

// ==================== 状态（内存临时存储）====================

const agents = ref<Agent[]>([])
const skills = ref<Skill[]>([])
const activeAgentId = ref<string | null>(null)
const isLoading = ref(false)

// ==================== 计算属性 ====================

export function useAgentConfig() {
  // ----- Agents -----
  const activeAgent = computed(() => 
    agents.value.find(a => a.id === activeAgentId.value) || agents.value[0] || null
  )

  const sortedAgents = computed(() => {
    return [...agents.value].sort((a, b) => {
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      return b.lastActiveAt - a.lastActiveAt
    })
  })

  // ----- Skills -----
  const builtInSkills = computed(() => skills.value.filter(s => s.isBuiltIn))
  const customSkills = computed(() => skills.value.filter(s => !s.isBuiltIn))

  const skillsByCategory = computed(() => {
    const result: Record<string, Skill[]> = {}
    skills.value.forEach(skill => {
      if (!result[skill.category]) result[skill.category] = []
      result[skill.category].push(skill)
    })
    return result
  })

  // ----- Tools -----
  const allTools = computed((): Tool[] => {
    const defs = allToolDefinitions
    const iconMap: Record<string, string> = {
      get_current_time: '⏰',
      get_article_content: '📄',
      list_articles: '📚',
      create_article: '✨',
      update_article: '✏️',
      delete_article: '🗑️',
      search_articles: '🔍',
      test_echo: '🔊',
      summarize_text: '📝',
      format_text: '📐',
      read_file: '📂',
      write_file: '💾',
      list_files: '📁',
      web_search: '🌐',
      fetch_url: '🔗',
      calculate: '🧮',
      translate_text: '🌏',
      execute_code: '▶️',
      analyze_code: '🔍',
      query_knowledge: '🧠',
      get_weather: '🌤️',
      create_note: '📓',
      list_notes: '📔'
    }
    return defs.map(d => ({
      name: d.function.name,
      description: d.function.description.split('\n')[0],
      icon: iconMap[d.function.name] || '🔧',
      definition: d,
      category: getToolCategory(d.function.name)
    }))
  })

  function getToolCategory(name: string): string {
    if (name.includes('article')) return '文章管理'
    if (name.includes('file')) return '文件管理'
    if (name.includes('web') || name.includes('fetch') || name.includes('url')) return '网络工具'
    if (name.includes('code') || name.includes('execute') || name.includes('analyze')) return '代码工具'
    if (name.includes('text') || name.includes('summarize') || name.includes('format') || name.includes('translate')) return '文本处理'
    if (name.includes('note')) return '笔记工具'
    if (name.includes('knowledge')) return '知识库'
    if (name.includes('time') || name.includes('weather') || name.includes('calculate')) return '系统工具'
    return '其他'
  }

  // ==================== 初始化（异步）====================

  async function init() {
    isLoading.value = true
    try {
      const [agentsData, skillsData, activeId] = await Promise.all([
        getAgents(),
        getSkills(),
        getActiveAgentId()
      ])
      
      agents.value = agentsData
      skills.value = skillsData
      activeAgentId.value = activeId
      
      // 如果没有活跃 Agent，默认第一个
      if (!activeAgentId.value && agents.value.length > 0) {
        activeAgentId.value = agents.value[0].id
        await setActiveAgentId(agents.value[0].id)
      }
    } finally {
      isLoading.value = false
    }
  }

  // ==================== Agent CRUD（异步）====================

  async function createAgent(params: AgentCreateParams): Promise<Agent | null> {
    const agent = await createAgentStorage(params)
    if (agent) {
      agents.value = await getAgents()
    }
    return agent
  }

  async function updateAgent(id: string, updates: AgentUpdateParams): Promise<Agent | null> {
    const agent = await updateAgentStorage(id, updates)
    if (agent) {
      agents.value = await getAgents()
    }
    return agent
  }

  async function deleteAgent(id: string): Promise<boolean> {
    const success = await deleteAgentStorage(id)
    if (success) {
      agents.value = await getAgents()
      // 如果删除的是活跃 Agent，切换到第一个
      if (activeAgentId.value === id) {
        const defaultAgent = agents.value.find(a => a.isDefault) || agents.value[0]
        activeAgentId.value = defaultAgent?.id || null
        if (activeAgentId.value) {
          await setActiveAgentId(activeAgentId.value)
        }
      }
    }
    return success
  }

  async function setActive(id: string) {
    activeAgentId.value = id
    await setActiveAgentId(id)
    await updateAgent(id, { lastActiveAt: Date.now() })
  }

  // ==================== Skill CRUD（异步）====================

  async function createSkill(skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): Promise<Skill | null> {
    const skill = await createSkillStorage(skillData)
    if (skill) {
      skills.value = await getSkills()
    }
    return skill
  }

  async function updateSkill(id: string, updates: Partial<Skill>): Promise<Skill | null> {
    const skill = await updateSkillStorage(id, updates)
    if (skill) {
      skills.value = await getSkills()
    }
    return skill
  }

  async function deleteSkill(id: string): Promise<boolean> {
    const success = await deleteSkillStorage(id)
    if (success) {
      skills.value = await getSkills()
    }
    return success
  }

  // ==================== 系统提示词构建 ====================

  /**
   * 构建系统提示词
   * 
   * 参考 Claude Code Skills 设计：
   * - 系统提示词只包含 Skills 列表（name + description）
   * - Skill 详细内容在调用时注入对话上下文
   * - 工具定义通过 JSON Schema 传递，不在提示词中重复
   */
  function buildSystemPrompt(agent: Agent): string {
    const capabilities = agent.capabilities
    if (!capabilities) {
      return '你是一个 helpful 的 AI 助手。'
    }
    
    const { mode, skillIds, toolIds, baseRole, roleSupplement } = capabilities
    
    // RAW 模式：只使用基础角色 + 补充
    if (mode === 'raw') {
      const parts = [baseRole || '你是一个 helpful 的 AI 助手。']
      if (roleSupplement) {
        parts.push('\n## 补充说明')
        parts.push(roleSupplement)
      }
      return parts.join('\n')
    }
    
    // 收集系统提示词
    const sections: string[] = []
    
    // 1. 基础角色 - "你是谁"
    sections.push(baseRole || `你是 ${agent.name}，${agent.description}`)
    
    // 2. 可用工具列表（只包含名称和简短描述）
    const effectiveTools = getEffectiveTools(agent)
    if (effectiveTools.length > 0) {
      sections.push('\n\n你可以使用以下工具来完成任务：')
      effectiveTools.forEach(tool => {
        sections.push(`- ${tool.name}: ${tool.description}`)
      })
    }
    
    // 3. 可用 Skills 列表（只包含 name 和 description，供 Agent 决策）
    if (skillIds.length > 0 && (mode === 'skills-only' || mode === 'hybrid')) {
      const agentSkills = skills.value.filter(s => skillIds.includes(s.id))
      if (agentSkills.length > 0) {
        sections.push('\n\n<available_skills>')
        sections.push('当你需要执行特定任务时，可以调用以下 Skills：')
        
        agentSkills.forEach(skill => {
          sections.push(`\n  <skill>`)
          sections.push(`    <name>${skill.id}</name>`)
          sections.push(`    <description>${skill.description}</description>`)
          sections.push(`  </skill>`)
        })
        
        sections.push('\n</available_skills>')
        sections.push('\n当你判断需要使用某个 Skill 时，请先调用该 Skill 获取详细指导。')
      }
    }
    
    // 4. 角色补充 - 用户自定义微调
    if (roleSupplement) {
      sections.push('\n# 补充说明')
      sections.push(roleSupplement)
    }
    
    return sections.join('\n')
  }

  // ==================== 工具管理 ====================

  function getEffectiveTools(agent: Agent): Tool[] {
    const capabilities = agent.capabilities
    if (!capabilities) return []
    
    const { mode, skillIds, toolIds } = capabilities
    const effectiveToolNames = new Set<string>()
    
    // 从技能继承工具
    if (mode === 'skills-only' || mode === 'hybrid' || mode === 'raw') {
      const agentSkills = skills.value.filter(s => skillIds?.includes(s.id))
      agentSkills.forEach(skill => {
        skill.tools?.forEach((toolName: string) => effectiveToolNames.add(toolName))
      })
    }
    
    // 直接配置的工具
    if (mode === 'tools-only' || mode === 'hybrid') {
      toolIds?.forEach((toolName: string) => effectiveToolNames.add(toolName))
    }
    
    return allTools.value.filter(t => effectiveToolNames.has(t.name))
  }

  function getAvailableExtraTools(selectedSkillIds: string[]): Tool[] {
    // 获取已选技能中包含的工具
    const skillToolIds = new Set<string>()
    const selectedSkills = skills.value.filter(s => selectedSkillIds.includes(s.id))
    selectedSkills.forEach(skill => {
      skill.tools.forEach(toolId => skillToolIds.add(toolId))
    })
    
    // 返回不在技能中的工具
    return allTools.value.filter(t => !skillToolIds.has(t.name))
  }

  // ==================== 能力图谱生成 ====================

  function generateCapabilityGraph(agent: Agent): CapabilityGraph {
    const nodes: CapabilityNode[] = []
    const edges: CapabilityEdge[] = []
    
    // 根节点（Agent）
    nodes.push({
      id: agent.id,
      type: 'root',
      name: agent.name,
      icon: agent.avatar,
      description: agent.description,
      level: 0,
      x: 400,
      y: 50
    })
    
    const capabilities = agent.capabilities
    const mode = capabilities?.mode || 'raw'
    const skillIds = capabilities?.skillIds || []
    const toolIds = capabilities?.toolIds || []
    
    // 技能节点
    if (mode === 'skills-only' || mode === 'hybrid' || mode === 'raw') {
      const agentSkills = skills.value.filter(s => skillIds.includes(s.id))
      agentSkills.forEach((skill, index) => {
        const skillNode: CapabilityNode = {
          id: skill.id,
          type: 'skill',
          name: skill.name,
          icon: skill.icon,
          description: skill.description,
          parentId: agent.id,
          level: 1,
          x: 150 + index * 200,
          y: 150
        }
        nodes.push(skillNode)
        edges.push({ from: agent.id, to: skill.id, type: 'contains' })
        
        // 该技能的工具节点
        skill.tools.forEach((toolName, tIndex) => {
          const tool = allTools.value.find(t => t.name === toolName)
          if (tool) {
            nodes.push({
              id: `${skill.id}-${toolName}`,
              type: 'tool',
              name: toolName,
              icon: tool.icon || '🔧',
              description: tool.description,
              parentId: skill.id,
              level: 2,
              x: 100 + index * 200 + tIndex * 80,
              y: 250
            })
            edges.push({ from: skill.id, to: `${skill.id}-${toolName}`, type: 'contains' })
          }
        })
      })
    }
    
    // 额外工具节点（混合模式）
    if ((mode === 'tools-only' || mode === 'hybrid') && toolIds.length > 0) {
      toolIds.forEach((toolName, index) => {
        const tool = allTools.value.find(t => t.name === toolName)
        if (tool) {
          nodes.push({
            id: `extra-${toolName}`,
            type: 'tool',
            name: toolName,
            icon: tool.icon || '🔧',
            description: tool.description,
            level: 1,
            x: 100 + index * 120,
            y: mode === 'hybrid' ? 280 : 150,
            isExtra: true
          })
          edges.push({ from: agent.id, to: `extra-${toolName}`, type: 'extends' })
        }
      })
    }
    
    return { nodes, edges }
  }

  // ==================== Skill 调用/注入 ====================
  
  /**
   * 调用 Skill - 获取要在对话中注入的内容
   * 
   * 根据 Claude Code Skills 设计：
   * - Skill 内容不放入系统提示词
   * - 在需要时通过 invokeSkill 获取内容
   * - 将内容作为用户消息注入对话上下文
   */
  function invokeSkill(skillId: string): { role: 'user' | 'system', content: string } | null {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill || !skill.enabled) return null
    
    return {
      role: 'user',
      content: skill.content
    }
  }
  
  /**
   * 根据用户输入匹配应该调用的 Skills
   * 
   * 简单实现：检查用户输入是否包含 usageScenarios 中的关键词
   * 实际可以使用更复杂的语义匹配
   */
  function matchSkills(userInput: string, agent: Agent): string[] {
    const { skillIds, mode } = agent.capabilities || { skillIds: [], mode: 'raw' }
    
    // RAW 模式或没有 Skills
    if (mode === 'raw' || skillIds.length === 0) return []
    
    const input = userInput.toLowerCase()
    const matchedSkillIds: string[] = []
    
    const agentSkills = skills.value.filter(s => skillIds.includes(s.id))
    
    for (const skill of agentSkills) {
      if (!skill.enabled) continue
      
      // 检查是否匹配任何使用场景
      const matches = skill.usageScenarios.some(scenario => {
        const keywords = scenario.toLowerCase().split(/\s+/)
        return keywords.some(keyword => input.includes(keyword))
      })
      
      if (matches) {
        matchedSkillIds.push(skill.id)
      }
    }
    
    return matchedSkillIds
  }

  // ==================== 导出 ====================

  return {
    // State
    agents,
    skills,
    activeAgentId,
    isLoading,
    
    // Computed
    activeAgent,
    sortedAgents,
    builtInSkills,
    customSkills,
    skillsByCategory,
    allTools,
    
    // Init
    init,
    
    // Agent CRUD
    createAgent,
    updateAgent,
    deleteAgent,
    setActive: setActive,
    
    // Skill CRUD
    createSkill,
    updateSkill,
    deleteSkill,
    
    // Tools
    getEffectiveTools,
    getAvailableExtraTools,
    
    // System Prompt
    buildSystemPrompt,
    
    // Skill Invocation
    invokeSkill,
    matchSkills,
    
    // Graph
    generateCapabilityGraph
  }
}
