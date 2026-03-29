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
  CapabilityNode,
  CapabilityEdge,
  CapabilityGraph
} from '../types/agent'
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
} from '../api/services/agentStorage'
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
      list_notes: '📔',
      // 学术平台工具
      search_arxiv: '📚',
      fetch_arxiv: '📄',
      search_openreview: '🎓',
      fetch_openreview: '📋',
      search_huggingface: '🤗',
      fetch_huggingface_model: '🔧'
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
    if (name.includes('arxiv') || name.includes('openreview')) return '学术平台'
    if (name.includes('huggingface')) return 'AI模型平台'
    if (name.includes('github')) return '代码平台'
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
   * 获取技能的详细内容（用于动态加载）
   */
  function getSkillContent(skillId: string): string | null {
    const skill = skills.value.find(s => s.id === skillId)
    return skill?.content || null
  }

  /**
   * 构建工具简要描述（用于系统提示词）
   */
  function buildToolsDescription(tools: Tool[]): string {
    if (tools.length === 0) return ''
    
    const lines: string[] = []
    lines.push('\n## 可用工具')
    lines.push(`你有以下 ${tools.length} 个工具可供调用：\n`)
    
    // 按类别分组
    const toolsByCategory = new Map<string, Tool[]>()
    tools.forEach(tool => {
      const category = tool.category || '其他'
      if (!toolsByCategory.has(category)) {
        toolsByCategory.set(category, [])
      }
      toolsByCategory.get(category)!.push(tool)
    })
    
    toolsByCategory.forEach((categoryTools, category) => {
      lines.push(`\n### ${category}`)
      categoryTools.forEach(tool => {
        lines.push(`- **${tool.name}**: ${tool.description}`)
      })
    })
    
    lines.push('\n当需要调用工具时，系统会自动提供完整的参数定义。')
    return lines.join('\n')
  }

  /**
   * 构建系统提示词 - Claude Code 风格渐进式披露 (LOD-0)
   * 
   * 只包含 Skills 元数据（name + description + 工具名列表）
   * 工具详细定义通过 Function Calling 传递（不在 System Prompt 中）
   * Skill 详细内容（工作流）通过 invokeSkill 按需注入
   */
  function buildSystemPrompt(agent: Agent): string {
    const capabilities = agent.capabilities
    if (!capabilities) {
      return '你是一个 helpful 的 AI 助手。'
    }
    
    const skillIds = capabilities.skillIds || []
    const agentSkills = skills.value.filter(s => skillIds.includes(s.id))
    
    // 1. 基础角色
    const roleSection = capabilities.customSystemPrompt || 
      `你是 ${agent.name}，${agent.description}`
    
    // 2. LOD-0: Skills 元数据列表（极简，只包含名称、描述、工具名）
    const skillsMetadata = agentSkills.map(skill => {
      const toolNames = (skill.tools || []).join(', ')
      return `- ${skill.icon} **${skill.name}**: ${skill.description} [工具: ${toolNames || '无'}]`
    }).join('\n')
    
    // 3. 组合完整提示词（LOD-0 层）
    const fullPrompt = `${roleSection}

## 你的 Skills（能力领域）
你有 ${agentSkills.length} 个已启用的 Skills：
${skillsMetadata}

## 使用规则
1. **自动触发**: 当用户请求匹配 Skill 描述时，自动调用对应工具
2. **工具调用**: 你有权调用上述 Skills 中的工具来完成任务
3. **路径格式**: 文章路径使用 "section/filename.md" 格式
4. **搜索优先**: 不知道具体路径时，先用 search_articles 搜索

## 示例
- 用户: "找一下 React 的文章" → 调用 search_articles
- 用户: "创建 Vue 指南" → 调用 create_article
`
    
    return fullPrompt
  }
  


  // ==================== 工具管理 ====================

  function getEffectiveTools(agent: Agent): Tool[] {
    const capabilities = agent.capabilities
    if (!capabilities) return []
    
    const skillIds = capabilities.skillIds || []
    const effectiveToolNames = new Set<string>()
    
    // 从启用的 Skills 继承工具
    const agentSkills = skills.value.filter(s => skillIds.includes(s.id))
    agentSkills.forEach(skill => {
      skill.tools?.forEach((toolName: string) => effectiveToolNames.add(toolName))
    })
    
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
    const skillIds = capabilities?.skillIds || []
    
    // 技能节点
    if (skillIds.length > 0) {
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
    
    return { nodes, edges }
  }

  // ==================== Skill 调用/注入 (LOD-2 层) ====================
  
  /**
   * 调用 Skill - 获取要在对话中注入的内容 (LOD-2 层渐进式披露)
   * 
   * 根据 Claude Code Skills 设计：
   * - LOD-0: Skills 元数据在 System Prompt 中（已包含）
   * - LOD-1: 工具定义通过 Function Calling 传递（已包含）
   * - LOD-2: Skill 详细内容（工作流、最佳实践）按需注入
   * 
   * 当 Agent 匹配到 Skill 后，通过此方法加载完整 Skill 指导
   */
  function invokeSkill(skillId: string): { role: 'user', content: string } | null {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill || !skill.enabled) return null
    
    // 构建完整的 Skill 指导内容（LOD-2）
    const toolNames = skill.tools || []
    const toolList = toolNames.length > 0 
      ? `\n## 可用工具\n${toolNames.map(t => `- ${t}`).join('\n')}` 
      : ''
    
    const usageScenarios = (skill.usageScenarios || []).length > 0
      ? `\n## 使用场景\n${skill.usageScenarios?.map(s => `- ${s}`).join('\n')}`
      : ''
    
    const fullContent = `[Skill 激活: ${skill.name}]

${skill.content}${toolList}${usageScenarios}

---
请根据以上 Skill 指导，使用提供的工具完成用户请求。
`
    
    return {
      role: 'user',
      content: fullContent
    }
  }
  
  /**
   * 根据用户输入匹配应该调用的 Skills
   * 
   * 简单实现：检查用户输入是否包含 usageScenarios 中的关键词
   * 实际可以使用更复杂的语义匹配
   */
  function matchSkills(userInput: string, agent: Agent): string[] {
    const skillIds = agent.capabilities?.skillIds || []
    
    // 没有可用 Skills
    if (skillIds.length === 0) return []
    
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
