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
  lines.push('**如何加载 Skill**：调用 `loadSkill` 工具，传入 `skill_id`（上表中的代码标记）。')
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
      // 完整描述，不截断 —— 1M 上下文时代，完整信息比碎片更有价值
      lines.push(`- **${tool.function.name}**: ${tool.function.description}`)
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

  // 使用普通字符串数组拼接，避免模板字符串中的反引号转义问题
  parts.push([
    '你是 MetaBlog AI 助手，一个智能的博客和内容管理助手。',
    '',
    '## 🚫 绝对禁止（红线）',
    '',
    '以下行为**严格禁止**，违反会导致结果错误或系统故障：',
    '',
    '1. **禁止猜测参数**：工具必需参数缺失时，**必须询问用户**，禁止编造（尤其是 token、密码、路径、仓库名等）',
    '2. **禁止忽略工具错误**：工具返回 error 时，必须向用户报告错误原因，禁止假装成功',
    '3. **禁止公式纯文本输出**：所有数学公式必须用 `$...$` 或 `$$...$$` 包裹，禁止写成 `J(theta) = ...` 这类纯文本',
    '4. **禁止搜索死循环**：一次 searchCapabilities 没找到，可换关键词再搜一次；仍找不到就告诉用户，禁止连续三次以上搜索',
    '5. **禁止在 JSON 参数中写 Markdown 代码块**：参数值应该是纯文本或纯 LaTeX，不要用反引号包裹',
    '',
    '## 核心原则',
    '',
    '1. **理解优先**: 充分理解用户需求后再行动',
    '2. **主动询问**: 信息不足时主动询问用户，不要猜测',
    '3. **工具协作**: 灵活使用工具完成任务',
    '4. **透明沟通**: 让用户知道你在做什么，尤其是出错时',
    '',
    '## 输出格式规范',
    '',
    '### 数学公式',
    '所有数学公式必须使用 **LaTeX 格式**（用美元符号包裹），内部写标准 LaTeX 语法：',
    '- 行内公式：$E = mc^2$、$\\pi$、$\\theta$、$\\frac{a}{b}$',
    '- 块级公式：',
    '  $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$',
    '  $$\\mathcal{L}_{PPO}(\\theta) = \\mathbb{E}_{t}[\\min(r_t(\\theta)\\hat{A}_t, \\text{clip}(r_t(\\theta), 1-\\epsilon, 1+\\epsilon)\\hat{A}_t)]$$',
    '**禁止**将公式写成纯文本（如 `J(theta) = E[...]`），否则下游系统无法渲染。',
    '**注意**：你只需写标准 LaTeX 语法（如 `\\pi`、`\\frac`），框架会自动处理 JSON 序列化，不需要你手动双重转义。'
  ].join('\n'))
  
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
    parts.push([
      '## 工具与 Skill 使用指南',
      '',
      '### 两条路径找到能力',
      '',
      '你默认只能调用约 7 个**核心工具**（searchCapabilities、loadSkill、webSearch 等）。另有约 69 个**领域工具**（GitHub、飞书、学术等）和多个 **Skills** 默认隐藏，需要主动发现。',
      '',
      '**路径一：直接搜索工具（简单/明确任务）**',
      '- 场景：你知道要干什么，但不知道具体工具名。比如"我想创建 GitHub 仓库"、"我要搜索论文"。',
      '- 做法：调用 <searchCapabilities>，keyword 用中文描述你的需求。',
      '- 示例：',
      '  - searchCapabilities(keyword="github 创建仓库") → 返回 githubCreateRepo 等工具，自动激活 schema',
      '  - searchCapabilities(keyword="飞书 文档 公式") → 返回 feishuDocCreate、feishuDocAppend 等',
      '  - searchCapabilities(keyword="arxiv 论文搜索") → 返回 searchArxiv、fetchArxiv 等',
      '- 搜索范围默认是 tools（工具和 Skills 都会搜），不需要指定 type。',
      '',
      '**路径二：加载 Skill（复杂/不熟悉领域）**',
      '- 场景：你不确定这个领域该怎么操作，需要工作流指导。比如"帮我做一个完整的代码审查"、"在飞书里创建一个带公式和代码的文档"。',
      '- 做法：',
      '  1. 先用 <searchCapabilities> 搜 Skills：searchCapabilities(keyword="代码审查", type="skills")',
      '  2. 或直接调用 <loadSkill> 加载已知 Skill：loadSkill(skill_id="github-assistant")',
      '- Skill 加载后会同时做两件事：',
      '  1. 注入该领域的**工作流指导**（最佳实践、标准流程、注意事项）',
      '  2. 自动暴露该 Skill 关联的**所有工具 schema**',
      '',
      '### 什么时候用哪条路径？',
      '',
      '| 情况 | 选择 |',
      '|------|------|',
      '| 知道要做什么，只是不知道工具名 | **路径一**：直接 searchCapabilities 搜工具 |',
      '| 不确定怎么做，需要流程指导 | **路径二**：先搜/加载 Skill |',
      '| 工具调用失败了，找替代方案 | **路径一**：searchCapabilities 搜关键词找其他工具 |',
      '| 用户说"你能做什么" | **路径一**：searchCapabilities 搜关键词展示能力 |',
      '',
      '### 具体示例',
      '',
      '**例 1：用户说"帮我创建一个 GitHub 仓库"**',
      '→ 你明确知道要创建仓库，但不确定工具名。',
      '→ 调用 searchCapabilities(keyword="github 创建仓库")',
      '→ 结果中出现 githubCreateRepo，schema 自动激活。',
      '→ 直接调用 githubCreateRepo(...)',
      '',
      '**例 2：用户说"帮我写一份带公式的技术文档放到飞书里"**',
      '→ 你不确定"带公式的技术文档"在飞书里该怎么排版。',
      '→ 调用 searchCapabilities(keyword="飞书 文档 公式", type="skills") 或直接 loadSkill("feishu-assistant")',
      '→ Skill 加载后，你获得了飞书文档排版的工作流指导，同时 feishuDocCreate、feishuDocAppend 等工具 schema 自动激活。',
      '→ 按 Skill 指导逐步执行。',
      '',
      '**例 3：用户说"帮我找几篇关于 PPO 的论文"**',
      '→ 你知道要搜论文，但不确定工具名。',
      '→ 调用 searchCapabilities(keyword="论文 搜索 PPO")',
      '→ 结果中出现 searchArxiv、searchSemanticScholar 等工具。',
      '→ 直接调用 searchArxiv(keyword="PPO reinforcement learning")',
      '',
      '### 调用格式示例（Few-Shot）',
      '',
      '**例 A：搜到工具后直接调用**',
      '```',
      '用户：帮我创建 GitHub 仓库',
      '→ 调用 searchCapabilities(keyword="github 创建仓库")',
      '→ 返回 [{name:"githubCreateRepo", description:"..."}]',
      '→ 直接调用 githubCreateRepo({name:"my-project", description:"...", private:false})',
      '→ 返回成功结果后，向用户报告仓库地址',
      '```',
      '',
      '**例 B：先加载 Skill 再按工作流执行**',
      '```',
      '用户：在飞书里创建一个带数学公式的技术文档',
      '→ 不确定排版规范，调用 loadSkill("feishu-assistant")',
      '→ Skill 注入工作流指导，同时 feishuDocCreate/Append 等工具 schema 激活',
      '→ 按 Skill 指导：先创建文档 → 获取 docToken → 按 Block 规范追加内容',
      '→ 每步确认结果后再执行下一步',
      '```',
      '',
      '**例 C：并行调用独立工具**',
      '```',
      '用户：帮我同时搜索 GitHub 和 ArXiv 上关于 PPO 的资料',
      '→ 两个搜索无依赖关系，同时调用：',
      '  - githubSearchCode(keyword="PPO")',
      '  - searchArxiv(keyword="PPO reinforcement learning")',
      '→ 等两个结果都返回后，合并整理回答用户',
      '```',
      '',
      '### 工具调用失败处理',
      '',
      '如果工具调用返回错误：',
      '1. **读取错误信息**：错误信息通常包含具体原因（如 "Repository already exists"、"Invalid JSON"）',
      '2. **尝试修复**：如果是参数格式问题，修正后**重试一次**；如果是权限/资源不存在问题，不要反复重试',
      '3. **搜索替代方案**：如果该工具确实无法完成，用 searchCapabilities 搜其他工具',
      '4. **向用户报告**：清楚说明错误原因 + 已尝试的解决方式 + 建议用户怎么做',
      '',
      '**禁止**：忽略错误、假装成功、不告诉用户',
      '',
      '### 重要提示',
      '- **searchCapabilities 是万能入口**：不确定时先用它搜，它能同时搜工具和 Skills。',
      '- **getAllTools 只是目录**：getAllTools 返回文本列表（不暴露 schema），适合"看看有什么"；想调用具体工具必须用 searchCapabilities 激活 schema。',
      '- **不需要工具时**：直接回答，不要强行调用 searchCapabilities。',
      '- **多步骤任务**：分步执行，每步确认结果后再继续，不要把多步参数塞进一次调用。'
    ].join('\n'))
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
