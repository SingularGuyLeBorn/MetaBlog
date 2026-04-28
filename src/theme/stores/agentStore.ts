/**
 * useAgentConfig - 统一的 Agent 配置管理
 * 
 * 数据源：后端API(唯一数据源)
 * 原则：
 * - 内存只做临时存储
 * - 所有数据通过API持久化到后端
 * - 空状态由UI处理
 */

import {
  createAgent as createAgentStorage,
  createSkill as createSkillStorage,
  deleteAgent as deleteAgentStorage,
  deleteSkill as deleteSkillStorage,
  getActiveAgentId,
  getAgents,
  getSkills,
  setActiveAgentId,
  updateAgent as updateAgentStorage,
  updateSkill as updateSkillStorage
} from '@/theme/api/services/agentStorage'
import { getToolDefinitions } from '@/theme/tools'
import type {
  Agent,
  AgentCreateParams,
  AgentUpdateParams,
  CapabilityEdge,
  CapabilityGraph,
  CapabilityNode,
  Skill,
  Tool
} from '@/theme/types/agent'
import { computed, ref } from 'vue'

// ==================== 状态(内存临时存储)====================

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
    const defs = getToolDefinitions()
    const iconMap: Record<string, string> = {
      getCurrentTime: '⏰',
      getArticleContent: '📄',
      listArticles: '📚',
      createArticle: '✨',
      updateArticle: '✏️',
      deleteArticle: '🗑️',
      searchArticles: '🔍',
      testEcho: '🔊',
      summarizeText: '📝',
      formatText: '📐',
      readFile: '📂',
      writeFile: '💾',
      listFiles: '📁',
      webSearch: '🌐',
      fetchUrl: '🔗',
      calculate: '🧮',
      translateText: '🌏',
      executeCode: '▶️',
      analyzeCode: '🔍',
      queryKnowledge: '🧠',
      getWeather: '🌤️',
      createNote: '📓',
      listNotes: '📔',
      // 学术平台工具
      searchArxiv: '📚',
      fetchArxiv: '📄',
      searchOpenreview: '🎓',
      fetchOpenreview: '📋',
      searchHuggingface: '🤗',
      fetchHuggingfaceModel: '🔧'
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

  // ==================== 初始化(异步)====================

  async function init() {
    isLoading.value = true
    try {
      const [agentsData, skillsData, activeId] = await Promise.all([
        getAgents(),
        getSkills(),
        getActiveAgentId()
      ])

      skills.value = skillsData

      // 自动同步：每个 Agent 拥有所有可用 Skills
      const allSkillIds = skillsData.map(s => s.id)
      agents.value = agentsData.map(agent => ({
        ...agent,
        capabilities: {
          ...agent.capabilities,
          skillIds: allSkillIds
        }
      }))

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

  // ==================== Agent CRUD(异步)====================

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

  // ==================== Skill CRUD(异步)====================

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
   * 获取技能的详细内容(用于动态加载)
   */
  function getSkillContent(skillId: string): string | null {
    const skill = skills.value.find(s => s.id === skillId)
    return skill?.content || null
  }

  /**
   * 构建工具简要描述(用于系统提示词)
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
   * 核心设计：System Prompt 告诉 LLM "你有工具、你可以调用、怎么调用"
   * 工具详细定义通过 API 的 tools 参数传递(Function Calling schema)
   * Skill 详细内容(工作流)通过 Agent 调用 loadSkill 后按需注入
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

    // 2. 只展示少量高频 Skill 作为示例(完整列表通过 getAllSkills 获取)
    const showcaseSkills = agentSkills.slice(0, 5)
    const skillsShowcase = showcaseSkills.map(skill => {
      const toolNames = (skill.tools || []).join(', ')
      return `- ${skill.icon} **${skill.name}** \`${skill.id}\`: ${skill.description} [工具: ${toolNames || '无'}]`
    }).join('\n')

    // 3. 只展示少量高频工具作为示例(完整列表通过 getAllTools 获取)
    const showcaseToolNames = new Set([
      'searchArticles', 'createArticle', 'webSearch', 'fetchUrl',
      'readFile', 'writeFile', 'executeCode', 'getCurrentTime',
      'getWeather', 'calculate', 'summarizeText', 'translateText',
      'loadSkill', 'getAllTools', 'getAllSkills'
    ])
    const showcaseTools = allTools.value.filter(t => showcaseToolNames.has(t.name))
    const toolsShowcase = showcaseTools.map(t => `- **${t.name}**: ${t.description}`).join('\n')

    // 4. 组合完整提示词
    const sections: string[] = []
    sections.push(roleSection)
    sections.push('')
    sections.push('## 你的核心能力：Function Calling(工具调用)')
    sections.push('')
    sections.push('你配备了工具调用能力。API 请求中已经附带了所有可用工具的 schema 定义(参数类型、必填项等)。')
    sections.push('')
    sections.push('### 工具调用流程')
    sections.push('1. **判断需求**：分析用户请求，判断是否需要工具辅助')
    sections.push('2. **输出 tool_calls**：当需要调用工具时，在 assistant 消息中输出 tool_calls(而非普通文本)')
    sections.push('3. **接收结果**：工具执行结果会以 tool 角色的消息返回给你')
    sections.push('4. **继续处理**：基于工具结果，继续思考或直接回复用户')
    sections.push('5. **多轮调用**：复杂任务可以进行多轮工具调用')
    sections.push('')
    sections.push('### 关键规则')
    sections.push('- **不需要工具时**：直接回答，不要强行调用')
    sections.push('- **loadSkill 是第一入口**：当用户请求涉及某个 Skill 时，必须先调用 loadSkill 加载该 Skill 的完整指导')
    sections.push('- **参数准确**：确保传入的参数符合工具的 schema 要求')
    sections.push('- **工具失败时**：告知用户并提供替代方案')
    sections.push('- **禁止编造**：不要编造工具调用结果，必须等待真实的 tool 结果消息')
    sections.push('')
    sections.push('## 你的 Skills(能力领域)')
    sections.push(`你有 ${agentSkills.length} 个已启用的 Skills。以下是部分示例：`)
    sections.push(skillsShowcase || '(暂无已启用 Skills)')
    if (agentSkills.length > 5) {
      sections.push(`\n... 还有 ${agentSkills.length - 5} 个 Skills 未展示。如需完整列表，调用 **getAllSkills** 工具。`)
    }
    sections.push('')
    sections.push('## 常用工具示例')
    sections.push(toolsShowcase || '(暂无可用工具)')
    sections.push('')
    sections.push('> **提示**：系统共有大量工具。如需查看完整工具列表(含分类和详细描述)，调用 **getAllTools** 工具。')
    sections.push('')
    sections.push('## 如何加载 Skill(重要！)')
    sections.push('')
    sections.push('当你判断用户请求涉及某个 Skill 时，第一步是调用 loadSkill 工具：')
    sections.push('')
    sections.push('```')
    sections.push('function loadSkill:0 {"skill_id": "article-manager"}')
    sections.push('```')
    sections.push('')
    sections.push('加载后，该 Skill 的完整工作流程会作为一条新消息注入对话上下文，你在后续回复中必须遵循其指导。')
    sections.push('')
    sections.push('### 完整工作流程示例')
    sections.push('')
    sections.push('**示例 1 - 文章管理：**')
    sections.push('```')
    sections.push('用户: "找一下 React 的文章"')
    sections.push('-> 判断：涉及 article-manager Skill')
    sections.push('-> 调用 loadSkill({"skill_id": "article-manager"})')
    sections.push('-> 接收 Skill 完整指导(注入对话)')
    sections.push('-> 按指导调用 searchArticles({"keyword": "React"})')
    sections.push('-> 基于搜索结果回复用户')
    sections.push('```')
    sections.push('')
    sections.push('**示例 2 - 学术研究：**')
    sections.push('```')
    sections.push('用户: "搜索一下 GPT-4 的论文"')
    sections.push('-> 判断：涉及 academic-research Skill')
    sections.push('-> 调用 loadSkill({"skill_id": "academic-research"})')
    sections.push('-> 接收 Skill 完整指导(注入对话)')
    sections.push('-> 按指导调用 searchArxiv({"query": "GPT-4"})')
    sections.push('-> 基于搜索结果回复用户')
    sections.push('```')
    sections.push('')
    sections.push('### 注意事项')
    sections.push('- 不要在没有加载 Skill 的情况下直接调用 Skill 关联的工具')
    sections.push('- loadSkill 只需调用一次，加载后该 Skill 的内容会在后续对话中持续有效')
    sections.push('- 如果用户请求不涉及任何 Skill，你可以直接调用通用工具或直接用文本回复')

    return sections.join('\n')
  }

  // ==================== 工具管理 ====================

  function getEffectiveTools(agent: Agent): Tool[] {
    // Agent 自动拥有所有注册的工具
    return allTools.value
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

    // 根节点(Agent)
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
   * - LOD-0: Skills 元数据在 System Prompt 中(已包含)
   * - LOD-1: 工具定义通过 Function Calling 传递(已包含)
   * - LOD-2: Skill 详细内容(工作流、最佳实践)按需注入
   * 
   * 当 Agent 匹配到 Skill 后，通过此方法加载完整 Skill 指导
   */
  function invokeSkill(skillId: string): { role: 'user', content: string } | null {
    const skill = skills.value.find(s => s.id === skillId)
    if (!skill || !skill.enabled) return null

    // 构建完整的 Skill 指导内容(LOD-2)
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
