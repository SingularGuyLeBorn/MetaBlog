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
    '以下技能包含各领域的**工作流指导**（最佳实践、标准流程、注意事项）。复杂任务加载对应 Skill 可以获得更专业的执行方案：',
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
  lines.push('**Skill 与工具的关系**：')
  lines.push('- Skill 加载的是**工作流指导**（告诉你这个领域该怎么组合工具、按什么顺序、注意什么）')
  lines.push('- **不是工具权限**：所有工具始终可用，不需要加载 Skill 就能调用')
  lines.push('- 简单任务（如查一个 GitHub 仓库）直接调工具即可')
  lines.push('- 复杂任务（如完整的 PR 审查、文档排版）加载 Skill 后遵循其指导')
  lines.push('')
  lines.push('**如何加载 Skill**：调用 `load_skill` 工具，传入 `skill_id`（上表中的代码标记）。')
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
    parts.push(`## 工具与 Skill 使用指南

### 核心设计：三层能力模型

1. **工具层（动态暴露）**: 
   - 默认只暴露**核心工具**（search_capabilities, load_skill, web_search 等约 7 个）的调用 schema。
   - **领域工具**（GitHub、飞书、学术等约 69 个）的 schema 默认隐藏，需要**激活**后才能调用。
   - 激活方式：调用 <search_capabilities> 搜索相关工具 → 系统自动暴露其 schema；或调用 <load_skill> 加载 Skill → 自动暴露关联工具 schema。
   - 注：下文的"工具分类摘要"列出了所有可用工具的目录（供你参考），但只有被激活的工具才能真正调用。

2. **Skill 层（按需加载）**: Skill 加载的不是"工具权限"，而是**工作流指导**（告诉你这个领域该怎么组合工具、按什么顺序、注意什么）。加载 Skill 后会自动激活其关联工具的 schema。

3. **搜索层（发现入口）**: 
   - <search_capabilities> 是"能力发现器"，搜索后会自动暴露匹配工具的 schema。
   - <get_all_tools> 可查看完整工具目录（文本形式，不暴露 schema）。

### 决策流程
1. **分析用户需求**
2. **如果需要领域工具 → 先调用 <search_capabilities> 搜索并激活相关工具 schema**
3. **如果是复杂领域任务 → 调用 <load_skill> 加载 Skill（同时激活关联工具 + 注入工作流指导）**
4. **工具 schema 激活后 → 直接调用具体工具**
5. **构建正确参数 → 执行 → 基于结果回复**

### 重要提示
- **schema 分层暴露**: 默认只有核心工具的 schema 可用。想调用 github_get_repo 等工具？先 search_capabilities("github repo") 激活其 schema。
- **Skill 加载自动激活工具**: load_skill 不仅注入工作流，还会自动暴露该 Skill 关联的所有工具 schema。
- **search_capabilities 是入口**: 不确定有什么工具时，用它搜索；搜索后匹配的工具会自动变为可调用。
- **不需要工具时**: 直接回答，不要强行调用。
- **工具失败时**: 告知用户并提供替代方案，或调用 <search_capabilities> 找替代工具。
- **多步骤任务**: 分步执行，每步确认结果。`)
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
