/**
 * Prompt Builder - System Prompt 构建器
 * 
 * 实现 Claude Code 风格的渐进式披露：
 * - LOD-0: 轻量级 Skill 元数据 (~100 tokens)
 * - LOD-1: 工具定义 (通过 Function Calling)
 * - LOD-2: 激活 Skill 的完整 Prompt (按需注入)
 */

import type { 
  SkillMetadata, 
  ActiveSkill, 
  PromptBuildContext, 
  PromptBuildOptions,
  ToolDefinition
} from './types'

// ═══════════════════════════════════════════════════════════════
// LOD-0: Skill 列表 (轻量级元数据)
// ═══════════════════════════════════════════════════════════════

/**
 * 构建 LOD-0 Skill 列表
 * 
 * 格式:
 * ## 可用 Skills
 * - 📝 article-manager: 管理 VitePress 博客文章
 * - 🎓 academic-research: 学术研究助手
 * ...
 */
function buildLOD0SkillList(skills: SkillMetadata[]): string {
  if (skills.length === 0) {
    return ''
  }
  
  const lines: string[] = [
    '## 可用 Skills',
    '',
    '以下技能可供使用。当你判断需要使用某个技能时，调用 `load_skill` 工具加载其完整内容：',
    ''
  ]
  
  // 按分类分组
  const byCategory = new Map<string, SkillMetadata[]>()
  for (const skill of skills) {
    if (!skill.enabled) continue
    const list = byCategory.get(skill.category) || []
    list.push(skill)
    byCategory.set(skill.category, list)
  }
  
  const categoryNames: Record<string, string> = {
    content: '📚 内容管理',
    research: '🔬 学术研究',
    code: '💻 代码开发',
    file: '📁 文件管理',
    system: '⚙️ 系统工具',
    multimedia: '🎬 多媒体',
    custom: '✨ 其他'
  }
  
  for (const [category, categorySkills] of byCategory) {
    lines.push(`### ${categoryNames[category] || category}`)
    lines.push('')
    
    for (const skill of categorySkills) {
      const toolHint = skill.tools?.length ? ` [工具: ${skill.tools.join(', ')}]` : ''
      lines.push(`- ${skill.icon} **${skill.name}** \`${skill.id}\``)
      lines.push(`  ${skill.description}${toolHint}`)
    }
    
    lines.push('')
  }
  
  lines.push('---')
  lines.push('')
  lines.push('**如何加载 Skill**：当你需要使用某个技能时，调用 `load_skill` 工具，传入 `skill_id`（上表中的代码标记）。')
  lines.push('加载后，该技能的完整工作流程会注入到对话中，你在后续回复中应遵循其指导。')
  lines.push('')
  
  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// LOD-1: 工具定义摘要
// ═══════════════════════════════════════════════════════════════

/**
 * 构建 LOD-1 工具定义摘要
 * 
 * 这个不是真正的 Function Calling schema，
 * 而是给 AI 看的工具能力说明，帮助 AI 决策
 */
function buildLOD1ToolSummary(tools: ToolDefinition[]): string {
  if (tools.length === 0) {
    return ''
  }
  
  const lines: string[] = [
    '## 可用工具',
    '',
    '你可以调用以下工具来协助用户：',
    ''
  ]
  
  // 按类别分组 (基于工具名前缀)
  const byPrefix = new Map<string, ToolDefinition[]>()
  for (const tool of tools) {
    const name = tool.function.name
    const prefix = name.split('_')[0] || 'other'
    const list = byPrefix.get(prefix) || []
    list.push(tool)
    byPrefix.set(prefix, list)
  }
  
  const prefixNames: Record<string, string> = {
    article: '📝 文章管理',
    kb: '📚 知识库',
    note: '📔 笔记',
    file: '📁 文件',
    github: '🐙 GitHub',
    platform: '📱 平台解析',
    search: '🔍 搜索',
    fetch: '🌐 获取',
    arxiv: '📄 ArXiv',
    openreview: '🎓 OpenReview',
    huggingface: '🤗 HuggingFace',
    text: '📖 文本',
    code: '💻 代码',
    system: '⚙️ 系统',
    network: '🌐 网络',
    other: '📦 其他'
  }
  
  for (const [prefix, prefixTools] of byPrefix) {
    lines.push(`### ${prefixNames[prefix] || prefix}`)
    lines.push('')
    
    for (const tool of prefixTools) {
      lines.push(`- **${tool.function.name}**: ${tool.function.description.slice(0, 60)}...`)
    }
    
    lines.push('')
  }
  
  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// LOD-2: 激活 Skill 的完整内容
// ═══════════════════════════════════════════════════════════════

/**
 * 构建 LOD-2 激活 Skill 内容
 * 
 * 仅注入匹配到的 Skills 的完整 Prompt
 */
function buildLOD2ActiveSkills(activeSkills: ActiveSkill[]): string {
  if (activeSkills.length === 0) {
    return ''
  }
  
  const lines: string[] = [
    '## 当前激活的技能',
    '',
    '以下技能已根据用户请求自动激活。请遵循这些技能的工作流程：',
    ''
  ]
  
  for (const skill of activeSkills) {
    const activationInfo = skill.activationSource === 'auto' 
      ? `(自动匹配，置信度 ${((skill.matchScore || 0) * 100).toFixed(0)}%)`
      : skill.activationSource === 'manual'
      ? '(用户手动激活)'
      : '(AI 请求激活)'
    
    lines.push(`### ${skill.icon} ${skill.name} ${activationInfo}`)
    lines.push('')
    lines.push(skill.content)
    lines.push('')
    lines.push('─'.repeat(40))
    lines.push('')
  }
  
  return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 核心构建函数
// ═══════════════════════════════════════════════════════════════

/**
 * 构建完整的 System Prompt
 * 
 * 渐进式披露层级:
 * - LOD-0: 始终包含 (所有 Skill 元数据)
 * - LOD-1: 可选 (工具摘要)
 * - LOD-2: 动态 (仅激活的 Skills)
 */
export function buildSystemPrompt(
  context: PromptBuildContext,
  options: PromptBuildOptions = {}
): string {
  const {
    includeLOD0 = true,
    includeLOD1 = true,
    includeLOD2 = false,
    showToolInstructions = true
  } = options
  
  const parts: string[] = []
  
  // ═══════════════════════════════════════════════════════════════
  // 基础角色定义
  // ═══════════════════════════════════════════════════════════════
  
  parts.push(`# ${context.baseRole}`)
  parts.push('')
  parts.push(`你是 MetaBlog AI 助手，一个智能的博客和内容管理助手。

## 核心原则

1. **理解优先**: 充分理解用户需求后再行动
2. **主动询问**: 信息不足时主动询问用户
3. **工具协作**: 灵活使用工具完成任务
4. **透明沟通**: 让用户知道你在做什么`)
  
  // ═══════════════════════════════════════════════════════════════
  // LOD-0: 可用 Skills (轻量级)
  // ═══════════════════════════════════════════════════════════════
  
  if (includeLOD0 && context.availableSkills.length > 0) {
    parts.push('')
    parts.push(buildLOD0SkillList(context.availableSkills))
  }
  
  // ═══════════════════════════════════════════════════════════════
  // LOD-1: 工具摘要 (可选)
  // ═══════════════════════════════════════════════════════════════
  
  if (includeLOD1 && context.availableTools && context.availableTools.length > 0) {
    parts.push('')
    parts.push(buildLOD1ToolSummary(context.availableTools))
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 工具使用说明
  // ═══════════════════════════════════════════════════════════════
  
  if (showToolInstructions && context.availableTools && context.availableTools.length > 0) {
    parts.push('')
    parts.push(`## 工具使用指南

### 决策流程
1. 分析用户需求
2. 判断是否需要工具
3. 如果需要，选择合适的工具
4. 构建正确的参数
5. 等待工具执行结果
6. 基于结果回复用户

### 重要提示
- **不需要工具时**: 直接回答，不要强行调用
- **工具失败时**: 告知用户并提供替代方案
- **多步骤任务**: 分步执行，每步确认结果
- **参数准确性**: 确保参数符合 schema 要求`)
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 用户输入上下文
  // ═══════════════════════════════════════════════════════════════
  
  if (context.userInput) {
    parts.push('')
    parts.push(`## 当前用户输入

用户说: "${context.userInput}"

请基于以上信息和激活的技能，提供最佳帮助。`)
  }
  
  return parts.join('\n')
}

// ═══════════════════════════════════════════════════════════════
// 快捷构建函数
// ═══════════════════════════════════════════════════════════════

/**
 * 构建最小化 System Prompt (仅 LOD-0)
 * 
 * 用于节省 Token 的场景
 */
export function buildMinimalPrompt(
  baseRole: string,
  availableSkills: SkillMetadata[]
): string {
  return buildSystemPrompt(
    { baseRole, userInput: '', availableSkills, activeSkills: [] },
    { includeLOD0: true, includeLOD1: false, includeLOD2: false, showToolInstructions: false }
  )
}

/**
 * 构建完整 System Prompt (LOD-0 + LOD-1 + LOD-2)
 * 
 * 用于常规对话
 */
export function buildFullPrompt(
  baseRole: string,
  userInput: string,
  availableSkills: SkillMetadata[],
  activeSkills: ActiveSkill[],
  availableTools: ToolDefinition[]
): string {
  return buildSystemPrompt(
    { baseRole, userInput, availableSkills, activeSkills, availableTools },
    { includeLOD0: true, includeLOD1: true, includeLOD2: true, showToolInstructions: true }
  )
}

/**
 * 构建仅工具模式的 Prompt
 * 
 * 用于不需要 Skill 指导的简单工具调用
 */
export function buildToolsOnlyPrompt(
  baseRole: string,
  availableTools: ToolDefinition[]
): string {
  return buildSystemPrompt(
    { 
      baseRole, 
      userInput: '', 
      availableSkills: [], 
      activeSkills: [], 
      availableTools 
    },
    { includeLOD0: false, includeLOD1: true, includeLOD2: false, showToolInstructions: true }
  )
}

// ═══════════════════════════════════════════════════════════════
// Token 估算 (粗略)
// ═══════════════════════════════════════════════════════════════

/**
 * 估算 Token 数量 (粗略: 1 token ≈ 4 字符)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * 分析 Prompt 各部分的 Token 使用
 */
export function analyzePromptTokens(context: PromptBuildContext): {
  lod0: number
  lod1: number
  lod2: number
  total: number
  breakdown: Record<string, number>
} {
  const lod0Prompt = buildLOD0SkillList(context.availableSkills)
  const lod1Prompt = context.availableTools 
    ? buildLOD1ToolSummary(context.availableTools) 
    : ''
  const lod2Prompt = buildLOD2ActiveSkills(context.activeSkills)
  
  return {
    lod0: estimateTokens(lod0Prompt),
    lod1: estimateTokens(lod1Prompt),
    lod2: estimateTokens(lod2Prompt),
    total: estimateTokens(lod0Prompt) + estimateTokens(lod1Prompt) + estimateTokens(lod2Prompt),
    breakdown: {
      'LOD-0 (Skills)': estimateTokens(lod0Prompt),
      'LOD-1 (Tools)': estimateTokens(lod1Prompt),
      'LOD-2 (Active)': estimateTokens(lod2Prompt)
    }
  }
}
