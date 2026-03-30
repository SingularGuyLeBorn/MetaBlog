/**
 * Skill Loader - Claude Code 风格的 Skills + Tools 整合
 * 
 * 核心功能:
 * 1. 加载和解析 .skills/ 目录下的 Skill 文件
 * 2. 基于用户输入匹配相关 Skills
 * 3. 构建渐进式披露的 System Prompt
 * 4. 管理 Skill 激活状态
 * 
 * 渐进式披露层级:
 * - LOD-0: 所有 Skill 元数据 (始终包含)
 * - LOD-1: 工具定义 (通过 Function Calling 提供)
 * - LOD-2: 激活 Skill 的完整内容 (动态注入)
 */

import { ref, computed, type Ref } from 'vue'
import type { 
  Skill, 
  SkillMetadata, 
  ActiveSkill,
  SkillMatchResult,
  SkillMatchOptions,
  PromptBuildContext,
  PromptBuildOptions,
  SkillRuntimeState,
  ToolDefinition
} from './types'
import { 
  parseSkillFile, 
  buildSkillFromContent,
  BUILTIN_SKILL_IDS 
} from './skillParser'
import { matchSkills, matchSkillsWithContext, quickMatchSkills } from './skillMatcher'
import { buildSystemPrompt, buildFullPrompt, estimateTokens } from './promptBuilder'

// ═══════════════════════════════════════════════════════════════
// Skill 加载
// ═══════════════════════════════════════════════════════════════

/**
 * 从项目 .skills/ 目录加载所有内置 Skills
 * 
 * 注意: 在浏览器环境中运行，使用相对路径 fetch
 */
export async function loadBuiltinSkills(): Promise<Skill[]> {
  const skills: Skill[] = []
  const basePath = '/.skills'
  
  for (const id of BUILTIN_SKILL_IDS) {
    try {
      const response = await fetch(`${basePath}/${id}/SKILL.md`)
      
      if (!response.ok) {
        console.warn(`[SkillLoader] Failed to load skill "${id}": ${response.status}`)
        continue
      }
      
      const content = await response.text()
      
      // 检查内容是否为空或 404 页面
      if (!content || content.includes('<!DOCTYPE html>') || content.length < 100) {
        console.warn(`[SkillLoader] Invalid content for skill "${id}"`)
        continue
      }
      
      const skill = buildSkillFromContent(content, `${basePath}/${id}/SKILL.md`)
      skills.push(skill)
      
    } catch (error) {
      console.error(`[SkillLoader] Error loading skill "${id}":`, error)
    }
  }
  
  console.log(`[SkillLoader] Loaded ${skills.length} builtin skills`)
  return skills
}

/**
 * 从字符串内容创建 Skill (用于动态加载)
 */
export function createSkillFromContent(content: string, id?: string): Skill {
  const skill = buildSkillFromContent(content)
  if (id) {
    skill.id = id
  }
  return skill
}

// ═══════════════════════════════════════════════════════════════
// Skill 运行时管理 (Vue Composition API)
// ═══════════════════════════════════════════════════════════════

export interface SkillLoaderAPI {
  // 状态
  availableSkills: Ref<SkillMetadata[]>
  activeSkills: Ref<ActiveSkill[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  
  // 计算属性
  activeSkillIds: ReturnType<typeof computed<Set<string>>>
  activeTools: ReturnType<typeof computed<string[]>>
  
  // 方法
  loadSkills: () => Promise<void>
  matchSkills: (userInput: string, options?: SkillMatchOptions) => SkillMatchResult[]
  activateSkill: (skillId: string, source?: 'auto' | 'manual' | 'ai_request', score?: number) => boolean
  deactivateSkill: (skillId: string) => void
  toggleSkill: (skillId: string) => boolean
  clearActiveSkills: () => void
  buildSystemPrompt: (baseRole: string, userInput: string, availableTools?: ToolDefinition[], options?: PromptBuildOptions) => string
  getPromptTokenEstimate: (baseRole: string, userInput: string, availableTools?: ToolDefinition[]) => { total: number; breakdown: Record<string, number> }
  
  // 调试
  getDebugInfo: () => SkillRuntimeState
}

/**
 * Skill Loader Vue Hook
 * 
 * 在 Vue 组件中使用:
 * ```ts
 * const { availableSkills, activeSkills, matchSkills, buildSystemPrompt } = useSkillLoader()
 * 
 * // 初始化加载
 * onMounted(() => loadSkills())
 * 
 * // 发送消息时
 * const matches = matchSkills(userInput)
 * matches.forEach(m => activateSkill(m.skill.id, 'auto', m.score))
 * const systemPrompt = buildSystemPrompt('AI 助手', userInput, availableTools)
 * ```
 */
export function useSkillLoader(): SkillLoaderAPI {
  // ═══════════════════════════════════════════════════════════════
  // 响应式状态
  // ═══════════════════════════════════════════════════════════════
  
  const availableSkills = ref<SkillMetadata[]>([])
  const activeSkills = ref<ActiveSkill[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const matchHistory = ref<SkillRuntimeState['matchHistory']>([])
  
  // ═══════════════════════════════════════════════════════════════
  // 计算属性
  // ═══════════════════════════════════════════════════════════════
  
  const activeSkillIds = computed(() => 
    new Set(activeSkills.value.map(s => s.id))
  )
  
  // 收集所有激活 Skill 声明的工具
  const activeTools = computed(() => {
    const toolSet = new Set<string>()
    for (const skill of activeSkills.value) {
      for (const tool of skill.tools) {
        toolSet.add(tool)
      }
    }
    return Array.from(toolSet)
  })
  
  // ═══════════════════════════════════════════════════════════════
  // 方法
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * 加载所有 Skills
   */
  async function loadSkills(): Promise<void> {
    isLoading.value = true
    error.value = null
    
    try {
      const skills = await loadBuiltinSkills()
      availableSkills.value = skills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        category: s.category,
        version: s.version,
        tags: s.tags,
        author: s.author,
        builtin: s.builtin,
        enabled: s.enabled,
        tools: s.tools,
        scenarios: s.scenarios
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      console.error('[SkillLoader] Failed to load skills:', err)
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 匹配 Skills
   */
  function _matchSkills(userInput: string, options?: SkillMatchOptions): SkillMatchResult[] {
    // 转换 SkillMetadata 数组用于匹配
    const fullSkills = availableSkills.value.map(s => {
      // 查找是否已激活以获取完整信息
      const active = activeSkills.value.find(a => a.id === s.id)
      return active || s
    })
    
    return matchSkillsWithContext(
      userInput,
      availableSkills.value,
      activeSkills.value,
      options
    )
  }
  
  /**
   * 激活一个 Skill
   */
  function activateSkill(
    skillId: string, 
    source: 'auto' | 'manual' | 'ai_request' = 'manual',
    score?: number
  ): boolean {
    // 检查是否已激活
    if (activeSkillIds.value.has(skillId)) {
      return true
    }
    
    // 查找 Skill 定义
    const metadata = availableSkills.value.find(s => s.id === skillId)
    if (!metadata) {
      console.error(`[SkillLoader] Skill not found: ${skillId}`)
      return false
    }
    
    // 异步加载完整内容
    loadSkillFullContent(skillId).then(fullSkill => {
      const activeSkill: ActiveSkill = {
        ...fullSkill,
        activatedAt: Date.now(),
        activationSource: source,
        matchScore: score
      }
      
      activeSkills.value.push(activeSkill)
      
      // 记录匹配历史
      matchHistory.value.push({
        timestamp: Date.now(),
        userInput: '', // 由调用者填充
        matchedSkills: [skillId],
        activationSource: source
      })
      
      console.log(`[SkillLoader] Activated skill: ${skillId} (${source})`)
    })
    
    return true
  }
  
  /**
   * 异步加载 Skill 完整内容
   */
  async function loadSkillFullContent(skillId: string): Promise<Skill> {
    const basePath = '/.skills'
    const response = await fetch(`${basePath}/${skillId}/SKILL.md`)
    
    if (!response.ok) {
      throw new Error(`Failed to load skill content: ${response.status}`)
    }
    
    const content = await response.text()
    return buildSkillFromContent(content)
  }
  
  /**
   * 停用 Skill
   */
  function deactivateSkill(skillId: string): void {
    const index = activeSkills.value.findIndex(s => s.id === skillId)
    if (index > -1) {
      activeSkills.value.splice(index, 1)
      console.log(`[SkillLoader] Deactivated skill: ${skillId}`)
    }
  }
  
  /**
   * 切换 Skill 激活状态
   */
  function toggleSkill(skillId: string): boolean {
    if (activeSkillIds.value.has(skillId)) {
      deactivateSkill(skillId)
      return false
    } else {
      return activateSkill(skillId, 'manual')
    }
  }
  
  /**
   * 清空所有激活的 Skills
   */
  function clearActiveSkills(): void {
    activeSkills.value = []
    console.log('[SkillLoader] Cleared all active skills')
  }
  
  /**
   * 构建 System Prompt
   */
  function _buildSystemPrompt(
    baseRole: string,
    userInput: string,
    availableTools?: ToolDefinition[],
    options?: PromptBuildOptions
  ): string {
    const context: PromptBuildContext = {
      baseRole,
      userInput,
      availableSkills: availableSkills.value,
      activeSkills: activeSkills.value,
      availableTools
    }
    
    return buildSystemPrompt(context, options)
  }
  
  /**
   * 获取 Prompt Token 估算
   */
  function _getPromptTokenEstimate(
    baseRole: string,
    userInput: string,
    availableTools?: ToolDefinition[]
  ): { total: number; breakdown: Record<string, number> } {
    const prompt = _buildSystemPrompt(baseRole, userInput, availableTools)
    const lod0Tokens = estimateTokens(buildSystemPrompt({
      baseRole, userInput, availableSkills: availableSkills.value, activeSkills: []
    }, { includeLOD0: true, includeLOD1: false, includeLOD2: false }))
    
    const lod1Tokens = availableTools 
      ? estimateTokens(buildSystemPrompt({
          baseRole, userInput, availableSkills: [], activeSkills: [], availableTools
        }, { includeLOD0: false, includeLOD1: true, includeLOD2: false }))
      : 0
    
    const lod2Tokens = estimateTokens(buildSystemPrompt({
      baseRole, userInput, availableSkills: [], activeSkills: activeSkills.value
    }, { includeLOD0: false, includeLOD1: false, includeLOD2: true }))
    
    return {
      total: estimateTokens(prompt),
      breakdown: {
        'LOD-0 (Skills)': lod0Tokens,
        'LOD-1 (Tools)': lod1Tokens,
        'LOD-2 (Active)': lod2Tokens,
        'Base': estimateTokens(prompt) - lod0Tokens - lod1Tokens - lod2Tokens
      }
    }
  }
  
  /**
   * 获取调试信息
   */
  function getDebugInfo(): SkillRuntimeState {
    return {
      availableSkills: availableSkills.value,
      activeSkills: activeSkills.value,
      matchHistory: matchHistory.value,
      lastUpdated: Date.now()
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 返回 API
  // ═══════════════════════════════════════════════════════════════
  
  return {
    // 状态
    availableSkills,
    activeSkills,
    isLoading,
    error,
    
    // 计算属性
    activeSkillIds,
    activeTools,
    
    // 方法
    loadSkills,
    matchSkills: _matchSkills,
    activateSkill,
    deactivateSkill,
    toggleSkill,
    clearActiveSkills,
    buildSystemPrompt: _buildSystemPrompt,
    getPromptTokenEstimate: _getPromptTokenEstimate,
    getDebugInfo
  }
}

// ═══════════════════════════════════════════════════════════════
// 全局单例 (用于非 Vue 环境)
// ═══════════════════════════════════════════════════════════════

let globalSkills: SkillMetadata[] = []
let globalActiveSkills: ActiveSkill[] = []

export function setGlobalSkills(skills: SkillMetadata[]): void {
  globalSkills = skills
}

export function getGlobalSkills(): SkillMetadata[] {
  return globalSkills
}

export function setGlobalActiveSkills(skills: ActiveSkill[]): void {
  globalActiveSkills = skills
}

export function getGlobalActiveSkills(): ActiveSkill[] {
  return globalActiveSkills
}

export function addGlobalActiveSkill(skill: ActiveSkill): void {
  if (!globalActiveSkills.find(s => s.id === skill.id)) {
    globalActiveSkills.push(skill)
  }
}

// ═══════════════════════════════════════════════════════════════
// 便捷函数 (无需 Vue 上下文)
// ═══════════════════════════════════════════════════════════════

/**
 * 基于用户输入自动匹配并激活 Skills
 * 
 * 这是完整的 Skill 匹配和激活流程：
 * 1. 分析用户输入
 * 2. 匹配相关 Skills
 * 3. 自动激活高匹配的 Skills
 * 4. 返回匹配结果供 UI 显示
 */
export function autoActivateSkills(
  userInput: string,
  availableSkills: SkillMetadata[],
  currentActiveSkills: ActiveSkill[],
  onActivate?: (skillId: string, score: number) => void
): { 
  matches: SkillMatchResult[]
  activated: string[]
  promptContext: string 
} {
  // 匹配 Skills
  const matches = matchSkillsWithContext(userInput, availableSkills, currentActiveSkills, {
    threshold: 0.2,
    maxMatches: 3
  })
  
  // 自动激活高匹配的 (score > 0.5)
  const activated: string[] = []
  for (const match of matches) {
    if (match.score > 0.5) {
      activated.push(match.skill.id)
      onActivate?.(match.skill.id, match.score)
    }
  }
  
  // 构建 Prompt 上下文说明
  const promptContext = matches.length > 0
    ? `\n[系统] 根据输入自动匹配到以下技能: ${matches.map(m => 
        `${m.skill.name}(${(m.score * 100).toFixed(0)}%)`
      ).join(', ')}`
    : ''
  
  return { matches, activated, promptContext }
}

/**
 * 快速建议 Skills (用于输入时的实时提示)
 */
export function suggestSkills(
  partialInput: string,
  availableSkills: SkillMetadata[]
): SkillMatchResult[] {
  if (!partialInput || partialInput.length < 2) {
    return []
  }
  
  return quickMatchSkills(partialInput, availableSkills, 3)
}
