/**
 * Skills Registry - 技能注册表
 * 
 * 管理所有技能的注册、查询和激活
 */
import type { Skill, SkillCategory, SkillState, SkillSelectEvent } from './types'
import { addLog } from '../services/logger'

// 内置技能
const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'default',
    name: '通用助手',
    icon: '🤖',
    description: '全能型AI助手，可以回答各类问题',
    systemPrompt: '你是 Kimi，一个有帮助的AI助手。请用简洁、专业的方式回答用户的问题。',
    category: 'general',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['通用', '默认'],
    tools: ['get_current_time', 'test_echo']
  },
  {
    id: 'writer',
    name: '写作专家',
    icon: '✍️',
    description: '专业的写作助手，擅长文章创作、编辑和润色',
    systemPrompt: `你是专业的写作专家，擅长各类文本创作。

能力：
1. 文章创作：博客、技术文档、故事等
2. 文本编辑：润色、改写、校对
3. 结构化写作：大纲、段落组织
4. 风格调整：学术、商业、 casual 等

原则：
- 内容清晰、结构合理
- 根据目标读者调整风格
- 主动使用可用工具管理文章`,
    category: 'writing',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['写作', '编辑'],
    tools: ['get_article_content', 'search_articles', 'list_articles', 'create_article', 'update_article', 'summarize_text', 'format_text']
  },
  {
    id: 'programmer',
    name: '编程助手',
    icon: '💻',
    description: '代码编写、调试、重构专家',
    systemPrompt: `你是资深程序员，精通多种编程语言和技术栈。

能力：
1. 代码编写：根据需求写高质量代码
2. 代码审查：找出问题并给出改进建议
3. 调试辅助：分析错误，定位问题
4. 重构优化：改善代码结构和性能

原则：
- 代码清晰、可维护
- 考虑边界情况和错误处理
- 提供必要的注释和文档`,
    category: 'coding',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['编程', '代码'],
    tools: ['get_article_content', 'search_articles', 'create_article', 'update_article', 'format_text']
  },
  {
    id: 'analyst',
    name: '数据分析师',
    icon: '📊',
    description: '擅长数据分析、可视化和洞察提取',
    systemPrompt: `你是数据分析师，擅长从数据中发现价值。

能力：
1. 数据解读：理解数据含义和趋势
2. 统计分析：描述性统计、相关性分析
3. 可视化建议：选择合适的图表类型
4. 报告撰写：清晰呈现分析结果

原则：
- 基于数据说话，避免主观臆断
- 关注数据质量和局限性
- 提供可执行的建议`,
    category: 'analysis',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['分析', '数据'],
    tools: ['get_article_content', 'search_articles', 'summarize_text', 'format_text']
  },
  {
    id: 'creative',
    name: '创意助手',
    icon: '🎨',
    description: '激发创意，辅助头脑风暴和内容创作',
    systemPrompt: `你是创意助手，帮助用户激发灵感。

能力：
1. 头脑风暴：多角度思考问题
2. 内容创意：标题、点子、概念
3. 故事创作：情节、角色、世界观
4. 设计建议：视觉、交互、体验

原则：
- 鼓励大胆、新颖的想法
- 提供多样化的选择
- 帮助完善和执行创意`,
    category: 'creative',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['创意', '设计'],
    tools: ['create_article', 'update_article', 'format_text']
  }
]

// 状态
let skillState: SkillState = {
  activeSkillId: 'default',
  skills: [...BUILTIN_SKILLS],
  showPanel: false
}

// 监听器
const listeners: Set<(event: SkillSelectEvent) => void> = new Set()

/**
 * 初始化技能系统
 */
export function initializeSkills(): void {
  // 从localStorage加载自定义技能
  try {
    const saved = localStorage.getItem('ai-chat-skills')
    if (saved) {
      const customSkills: Skill[] = JSON.parse(saved)
      // 合并内置技能和自定义技能（自定义技能优先）
      const builtInIds = new Set(BUILTIN_SKILLS.map(s => s.id))
      const filteredCustom = customSkills.filter(s => !builtInIds.has(s.id))
      skillState.skills = [...BUILTIN_SKILLS, ...filteredCustom]
    }
  } catch (e) {
    console.error('[Skills] Failed to load skills:', e)
  }

  // 加载激活的技能
  try {
    const activeId = localStorage.getItem('ai-chat-active-skill')
    if (activeId && skillState.skills.some(s => s.id === activeId)) {
      skillState.activeSkillId = activeId
    }
  } catch (e) {
    console.error('[Skills] Failed to load active skill:', e)
  }

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'initialized',
    message: `技能系统初始化完成，共 ${skillState.skills.length} 个技能`,
    data: { skillCount: skillState.skills.length, activeSkill: skillState.activeSkillId }
  })
}

/**
 * 获取所有技能
 */
export function getAllSkills(): Skill[] {
  return [...skillState.skills]
}

/**
 * 获取技能分类
 */
export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return skillState.skills.filter(s => s.category === category)
}

/**
 * 获取当前激活的技能
 */
export function getActiveSkill(): Skill | null {
  return skillState.skills.find(s => s.id === skillState.activeSkillId) || null
}

/**
 * 获取技能系统提示词
 */
export function getActiveSystemPrompt(): string {
  const skill = getActiveSkill()
  return skill?.systemPrompt || BUILTIN_SKILLS[0].systemPrompt
}

/**
 * 激活技能
 */
export function activateSkill(skillId: string): boolean {
  const skill = skillState.skills.find(s => s.id === skillId)
  if (!skill) return false

  const previousSkill = getActiveSkill()
  skillState.activeSkillId = skillId

  // 保存到localStorage
  try {
    localStorage.setItem('ai-chat-active-skill', skillId)
  } catch (e) {
    console.error('[Skills] Failed to save active skill:', e)
  }

  // 触发事件
  const event: SkillSelectEvent = { skill, previousSkill }
  listeners.forEach(fn => fn(event))

  addLog({
    level: 'info',
    category: 'chat',
    component: 'SkillsRegistry',
    event: 'skill_activated',
    message: `技能已切换: ${skill.name}`,
    data: { skillId, skillName: skill.name }
  })

  return true
}

/**
 * 创建自定义技能
 */
export function createSkill(skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): Skill {
  const skill: Skill = {
    ...skillData,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  skillState.skills.push(skill)
  saveCustomSkills()

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'skill_created',
    message: `创建自定义技能: ${skill.name}`,
    data: { skillId: skill.id, skillName: skill.name }
  })

  return skill
}

/**
 * 更新技能
 */
export function updateSkill(skillId: string, updates: Partial<Skill>): boolean {
  const index = skillState.skills.findIndex(s => s.id === skillId)
  if (index === -1) return false

  const skill = skillState.skills[index]
  if (skill.isBuiltIn) {
    // 内置技能不允许修改核心属性
    const allowedUpdates: Partial<Skill> = {
      enabled: updates.enabled,
      tools: updates.tools
    }
    Object.assign(skill, allowedUpdates, { updatedAt: Date.now() })
  } else {
    Object.assign(skill, updates, { updatedAt: Date.now() })
  }

  saveCustomSkills()

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'skill_updated',
    message: `更新技能: ${skill.name}`,
    data: { skillId, updates: Object.keys(updates) }
  })

  return true
}

/**
 * 删除技能
 */
export function deleteSkill(skillId: string): boolean {
  const index = skillState.skills.findIndex(s => s.id === skillId)
  if (index === -1) return false

  const skill = skillState.skills[index]
  if (skill.isBuiltIn) return false // 不能删除内置技能

  skillState.skills.splice(index, 1)

  // 如果删除的是当前激活的技能，切换到默认
  if (skillState.activeSkillId === skillId) {
    activateSkill('default')
  }

  saveCustomSkills()

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'skill_deleted',
    message: `删除技能: ${skill.name}`,
    data: { skillId, skillName: skill.name }
  })

  return true
}

/**
 * 订阅技能切换事件
 */
export function onSkillChange(callback: (event: SkillSelectEvent) => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * 获取面板显示状态
 */
export function isPanelVisible(): boolean {
  return skillState.showPanel
}

/**
 * 设置面板显示状态
 */
export function setPanelVisible(visible: boolean): void {
  skillState.showPanel = visible
}

/**
 * 切换面板显示
 */
export function togglePanel(): void {
  skillState.showPanel = !skillState.showPanel
}

/**
 * 获取当前激活技能允许使用的工具
 */
export function getActiveSkillTools(): string[] {
  const skill = getActiveSkill()
  return skill?.tools || []
}

// 保存自定义技能到localStorage
function saveCustomSkills(): void {
  try {
    const customSkills = skillState.skills.filter(s => !s.isBuiltIn)
    localStorage.setItem('ai-chat-skills', JSON.stringify(customSkills))
  } catch (e) {
    console.error('[Skills] Failed to save skills:', e)
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  initializeSkills()
}
