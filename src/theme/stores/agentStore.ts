/**
 * ============================================================================
 * Pinia Store - agentStore
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/stores
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
import { modelSupports } from '@/theme/api/providers/models'
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

/**
 * useAgentConfig 函数
 *
 * @returns 返回值
 */
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
      readFile: '📂',
      writeFile: '💾',
      listFiles: '📁',
      webSearch: '🌐',
      calculate: '🧮',
      executeCode: '▶️',
      analyzeCode: '🔍',
      queryKnowledge: '🧠',
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

      // 如果没有活跃 Agent,默认第一个
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
      // 如果删除的是活跃 Agent,切换到第一个
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
   * 构建系统提示词 - Claude Code 风格渐进式披露 (LOD-0)
   * 
   * 核心设计：System Prompt 告诉 LLM "你有工具、你可以调用、怎么调用"
   * 工具详细定义通过 API 的 tools 参数传递(Function Calling schema)
   * Skill 详细内容(工作流)通过 Agent 调用 loadSkill 后按需注入
   */
  function buildSystemPrompt(agent: Agent): string {
    const capabilities = agent.capabilities
    if (!capabilities) {
      return '你是一个 helpful 的 AI 助手. '
    }

    const skillIds = capabilities.skillIds || []
    const agentSkills = skills.value.filter(s => skillIds.includes(s.id))

    // 1. 基础角色 + 模型能力声明
    const modelId = agent.runtime?.model || ''
    const isVisionModel = modelId ? modelSupports(modelId, 'vision') : false
    const visionHint = isVisionModel
      ? '【模型能力】你是 vision 多模态模型,可以直接理解图片内容. 当调用 readArticle 时,请传 fetch_image_files=true 让后端把文章图片转成 ms://file_id 供你查看. '
      : '【模型能力】你是文本模型,无法直接查看图片. 当调用 readArticle 时,请传 embed_ocr=true 让后端对文章图片做 OCR 识别文字. '

    const roleSection = capabilities.customSystemPrompt ||
      `你是 ${agent.name},${agent.description}\n\n${visionHint}`

    // 2. 只展示少量高频 Skill 作为示例(完整列表通过 getAllSkills 获取)
    const showcaseSkills = agentSkills.slice(0, 5)
    const skillsShowcase = showcaseSkills.map(skill => {
      const toolNames = (skill.tools || []).join(', ')
      return `- ${skill.icon} **${skill.name}** \`${skill.id}\`: ${skill.description} [工具: ${toolNames || '无'}]`
    }).join('\n')

    // 3. 只展示少量高频工具作为示例(完整列表通过 getAllTools 获取)
    const showcaseToolNames = new Set([
      'readArticle', 'ocrImage', 'searchArticles', 'createArticle', 'webSearch',
      'readFile', 'writeFile', 'executeCode', 'getCurrentTime',
      'calculate',
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
    sections.push('你配备了工具调用能力. API 请求中已经附带了所有可用工具的 schema 定义(参数类型、必填项等). ')
    sections.push('')
    sections.push('### 工具调用流程')
    sections.push('1. **判断需求**：分析用户请求,判断是否需要工具辅助')
    sections.push('2. **输出 tool_calls**：当需要调用工具时,在 assistant 消息中输出 tool_calls(而非普通文本)')
    sections.push('3. **接收结果**：工具执行结果会以 tool 角色的消息返回给你')
    sections.push('4. **继续处理**：基于工具结果,继续思考或直接回复用户')
    sections.push('5. **多轮调用**：复杂任务可以进行多轮工具调用')
    sections.push('')
    sections.push('### 关键规则')
    sections.push('- **不需要工具时**：直接回答,不要强行调用')
    sections.push('- **看到网页链接时**：直接调用 `readArticle(url=链接)` 获取内容,不需要加载任何 Skill')
    sections.push('- **readArticle 失败时**：如果 readArticle 返回的内容明显不完整或为空(特别是微信、知乎等反爬强的网站),重新调用 `readArticle({"url": "链接", "method": "playwright"})` 强制使用浏览器渲染获取')
    sections.push('- **loadSkill 是第一入口**：当用户请求涉及某个 Skill(如 GitHub、学术研究)时,必须先调用 loadSkill 加载该 Skill 的完整指导')
    sections.push('- **参数准确**：确保传入的参数符合工具的 schema 要求')
    sections.push('- **工具失败时**：告知用户并提供替代方案')
    sections.push('- **禁止编造**：不要编造工具调用结果,必须等待真实的 tool 结果消息')
    sections.push('')
    sections.push('## 你的 Skills(能力领域)')
    sections.push(`你有 ${agentSkills.length} 个已启用的 Skills. 以下是部分示例：`)
    sections.push(skillsShowcase || '(暂无已启用 Skills)')
    if (agentSkills.length > 5) {
      sections.push(`\n... 还有 ${agentSkills.length - 5} 个 Skills 未展示. 如需完整列表,调用 **getAllSkills** 工具. `)
    }
    sections.push('')
    sections.push('## 常用工具示例')
    sections.push(toolsShowcase || '(暂无可用工具)')
    sections.push('')
    sections.push('> **提示**：系统共有大量工具. 如需查看完整工具列表(含分类和详细描述),调用 **getAllTools** 工具. ')
    sections.push('')
    sections.push('## 如何加载 Skill(重要！)')
    sections.push('')
    sections.push('当你判断用户请求涉及某个 Skill 时,第一步是调用 loadSkill 工具：')
    sections.push('')
    sections.push('```')
    sections.push('function loadSkill:0 {"skill_id": "article-manager"}')
    sections.push('```')
    sections.push('')
    sections.push('加载后,该 Skill 的完整工作流程会作为一条新消息注入对话上下文,你在后续回复中必须遵循其指导. ')
    sections.push('')
    sections.push('### 完整工作流程示例')
    sections.push('')
    sections.push('**示例 0 - 用户分享链接(最重要)：**')
    sections.push('```')
    sections.push('用户: "https://mp.weixin.qq.com/s/xxx 这篇文章讲了什么？"')
    sections.push('-> 判断：用户分享了一个网页链接')
    sections.push('-> 直接调用 readArticle({"url": "https://mp.weixin.qq.com/s/xxx", "fetch_image_files": true})')
    sections.push('-> 基于返回的 Markdown 内容回复用户')
    sections.push('```')
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
    sections.push('- 看到网页链接时,不需要加载 Skill,直接调用 `readArticle(url=链接)` 即可')
    sections.push('- loadSkill 只需调用一次,加载后该 Skill 的内容会在后续对话中持续有效')
    sections.push('- 如果用户请求不涉及任何 Skill,你可以直接调用通用工具或直接用文本回复')
    sections.push('')
    sections.push('## Skill 自发现与导入(重要！)')
    sections.push('')
    sections.push('当你发现当前没有合适的 Skill 来处理用户请求时,你可以：')
    sections.push('')
    sections.push('1. **刷新索引**：调用 `refreshSkillRegistry()` 确认最新可用 Skill 列表')
    sections.push('2. **导入外部 Skill**：如果用户提供了 Skill 的 URL(如 GitHub raw 链接),调用 `manageSkill(action="import", url="链接")` 导入')
    sections.push('3. **创建新 Skill**：如果需求明确且重复出现,调用 `manageSkill(action="create", ...)` 创建自定义 Skill')
    sections.push('')
    sections.push('### 导入后必须刷新')
    sections.push('导入 Skill 成功后,**必须调用 `refreshSkillRegistry()`** 刷新索引,新 Skill 才会在后续对话中可用. ')
    sections.push('')
    sections.push('### 工作流示例')
    sections.push('```')
    sections.push('用户: "你能帮我管理数据库吗？"')
    sections.push('-> 调用 refreshSkillRegistry() 查看当前 Skills')
    sections.push('-> 发现没有数据库相关 Skill')
    sections.push('-> 告知用户: "当前没有数据库 Skill,但我可以帮你导入. 你有 Skill 的下载链接吗？"')
    sections.push('-> 用户提供了 URL')
    sections.push('-> 调用 manageSkill(action="import", url="https://raw.githubusercontent.com/.../SKILL.md")')
    sections.push('-> 调用 refreshSkillRegistry() 刷新索引')
    sections.push('-> 现在可以使用新导入的数据库 Skill 了')
    sections.push('```')

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
   * 当 Agent 匹配到 Skill 后,通过此方法加载完整 Skill 指导
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
请根据以上 Skill 指导,使用提供的工具完成用户请求. 
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
