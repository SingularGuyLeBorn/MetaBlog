/**
 * ============================================================================
 * 后端服务 - skillIntegratedService
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/services
 */


import {
  buildFullPrompt,
  matchSkillsWithContext
} from '@/theme/skills'
import type { ActiveSkill, SkillMatchResult, SkillMetadata } from '@/theme/skills/types'
import { CORE_TOOL_NAMES, getRegisteredToolNames, getToolDefinitions } from '@/theme/tools/index'
import type { ChatMessage, SessionConfig, Skill, ThinkingStep, ToolCallRecord } from '@/theme/types'
import { aiService } from './aiService'

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

/**
 * SkillIntegratedConfig 接口定义
 *
 */
export interface SkillIntegratedConfig extends Omit<SessionConfig, 'availableSkills'> {
  /** 可用 Skills (元数据) */
  availableSkills?: SkillMetadata[]
  /** 当前激活的 Skills */
  activeSkills?: ActiveSkill[]
  /** Skill 匹配阈值 (默认 0.3) */
  skillMatchThreshold?: number
  /** 最大激活 Skills 数量 (默认 3) */
  maxActiveSkills?: number
  /** 是否启用 Skills 系统 */
  enableSkills?: boolean
}

/**
 * SkillActivationResult 接口定义
 *
 */
export interface SkillActivationResult {
  matches: SkillMatchResult[]
  activated: ActiveSkill[]
  deactivated: string[]
}

/**
 * EnhancedStreamCallbacks 接口定义
 *
 */
export interface EnhancedStreamCallbacks {
  onContent: (text: string) => void
  onReasoning: (text: string) => void
  onComplete: () => void
  onError: (error: Error) => void
  onToolRecord?: (record: ToolCallRecord) => void
  onThinkingStep?: (step: ThinkingStep) => void
  /** Skill 激活回调 */
  onSkillActivation?: (result: SkillActivationResult) => void
}

// ═══════════════════════════════════════════════════════════════
// Skills 上下文管理
// ═══════════════════════════════════════════════════════════════

class SkillsContextManager {
  private availableSkills: SkillMetadata[] = []
  private activeSkills: ActiveSkill[] = []
  private lastInput: string = ''

  /**
   * 设置可用 Skills
   */
  setAvailableSkills(skills: SkillMetadata[]): void {
    this.availableSkills = skills
  }

  getAvailableSkills(): SkillMetadata[] {
    return this.availableSkills
  }

  getActiveSkills(): ActiveSkill[] {
    return this.activeSkills
  }

  /**
   * 根据用户输入匹配并激活 Skills
   */
  activateSkillsForInput(
    userInput: string,
    options?: {
      threshold?: number
      maxMatches?: number
      clearPrevious?: boolean
    }
  ): SkillActivationResult {
    const {
      threshold = 0.2,
      maxMatches = 3,
      clearPrevious = false
    } = options || {}

    // 清空之前的激活
    const deactivated = clearPrevious
      ? this.activeSkills.map(s => s.id)
      : []
    if (clearPrevious) {
      this.activeSkills = []
    }

    // 匹配 Skills
    const matches = matchSkillsWithContext(
      userInput,
      this.availableSkills,
      this.activeSkills,
      { threshold, maxMatches }
    )

    // 激活高匹配的 Skills (score > 0.3)
    const newlyActivated: ActiveSkill[] = []
    for (const match of matches) {
      if (match.score > 0.3 && !this.activeSkills.find(s => s.id === match.skill.id)) {
        // 从可用 Skills 中查找完整定义
        const fullSkill = this.availableSkills.find(s => s.id === match.skill.id)
        if (fullSkill) {
          // SkillMetadata 没有 content,使用空字符串作为默认值
          // 实际内容应该从完整的 Skill 对象或缓存中获取
          const activeSkill: ActiveSkill = {
            ...fullSkill,
            content: '', // 需要从完整 Skill 对象获取内容
            createdAt: Date.now(),
            updatedAt: Date.now(),
            activatedAt: Date.now(),
            activationSource: 'auto',
            matchScore: match.score
          }
          this.activeSkills.push(activeSkill)
          newlyActivated.push(activeSkill)
        }
      }
    }

    this.lastInput = userInput

    return {
      matches,
      activated: newlyActivated,
      deactivated
    }
  }

  /**
   * 手动激活 Skill
   */
  activateSkill(skillId: string): boolean {
    if (this.activeSkills.find(s => s.id === skillId)) {
      return true // 已激活
    }

    const skill = this.availableSkills.find(s => s.id === skillId)
    if (!skill) {
      return false
    }

    const activeSkill: ActiveSkill = {
      ...skill,
      content: '', // 需要从完整 Skill 对象获取内容
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activatedAt: Date.now(),
      activationSource: 'manual'
    }

    this.activeSkills.push(activeSkill)
    return true
  }

  /**
   * 停用 Skill
   */
  deactivateSkill(skillId: string): void {
    const index = this.activeSkills.findIndex(s => s.id === skillId)
    if (index > -1) {
      this.activeSkills.splice(index, 1)
    }
  }

  /**
   * 清空所有激活的 Skills
   */
  clearActiveSkills(): void {
    this.activeSkills = []
  }

  /**
   * 获取当前激活的 Skill 声明的所有工具
   */
  getActiveTools(): string[] {
    const toolSet = new Set<string>()
    for (const skill of this.activeSkills) {
      for (const tool of skill.tools) {
        toolSet.add(tool)
      }
    }
    return Array.from(toolSet)
  }

  /**
   * 构建 System Prompt
   */
  buildSystemPrompt(baseRole: string, userInput: string): string {
    const allTools = getToolDefinitions()

    // 不再传入 activeSkills,System Prompt 只包含 Catalog(LOD-0)
    // Skill 完整内容通过 Agent 调用 loadSkill 工具后注入
    return buildFullPrompt(
      baseRole,
      userInput,
      this.availableSkills,
      [], // activeSkills: 空数组,不预注入 LOD-2
      allTools
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// 增强版 AI Service
// ═══════════════════════════════════════════════════════════════

const skillsContext = new SkillsContextManager()

export const skillIntegratedService = {
  /**
   * 初始化 Skills 系统
   */
  initializeSkills(skills: SkillMetadata[]): void {
    skillsContext.setAvailableSkills(skills)
    console.log(`[SkillIntegratedService] Initialized with ${skills.length} skills`)
  },

  /**
   * 获取 Skills 上下文管理器 (用于高级操作)
   */
  getSkillsContext(): SkillsContextManager {
    return skillsContext
  },

  /**
   * 手动激活/停用 Skill
   */
  toggleSkill(skillId: string): boolean {
    if (skillsContext.getActiveSkills().find(s => s.id === skillId)) {
      skillsContext.deactivateSkill(skillId)
      return false
    } else {
      return skillsContext.activateSkill(skillId)
    }
  },

  /**
   * 获取当前激活的 Skills
   */
  getActiveSkills(): ActiveSkill[] {
    return skillsContext.getActiveSkills()
  },

  /**
   * 清空所有激活的 Skills
   */
  clearActiveSkills(): void {
    skillsContext.clearActiveSkills()
  },

  /**
   * 增强版对话流 (集成 Skills)
   * 
   * 流程:
   * 1. 匹配并激活 Skills
   * 2. 构建渐进式 System Prompt
   * 3. 过滤工具列表
   * 4. 调用 aiService.chatStream
   */
  async chatStream(
    messages: ChatMessage[],
    config: SkillIntegratedConfig,
    callbacks: EnhancedStreamCallbacks,
    signal?: AbortSignal,
    sessionId?: string
  ): Promise<{ toolRecords?: ToolCallRecord[]; skillActivation?: SkillActivationResult; injectedMessages?: Array<{ role: string; content: string }> }> {

    // 提取最后一条用户消息
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    const userInput = lastUserMessage?.content || ''

    // ═══════════════════════════════════════════════════════════════
    // Step 1: 构建 System Prompt(仅 LOD-0 Catalog + LOD-1 工具列表)
    // ═══════════════════════════════════════════════════════════════

    let enhancedSystemPrompt = config.systemPrompt

    if (config.enableSkills !== false) {
      const baseRole = config.systemPrompt?.split('\n')[0] || 'MetaBlog AI 助手'
      // 不再传入 activeSkills,System Prompt 只包含 Skill Catalog
      enhancedSystemPrompt = skillsContext.buildSystemPrompt(baseRole, userInput)

      console.log('[SkillIntegratedService] Built system prompt (catalog only):', {
        length: enhancedSystemPrompt.length
      })
    }

    // ═══════════════════════════════════════════════════════════════
    // Step 2: 所有工具都可用(Agent 通过 loadSkill 自主加载 Skill 后使用)
    // ═══════════════════════════════════════════════════════════════

    // 不再按 activeSkills 过滤工具,所有注册工具都可用
    const allToolNames = getRegisteredToolNames()

    // ═══════════════════════════════════════════════════════════════
    // Step 3: 调用底层 aiService
    // ═══════════════════════════════════════════════════════════════

    // 排除 SkillIntegratedConfig 特有的属性,只保留 SessionConfig 的属性
    const { availableSkills, activeSkills, skillMatchThreshold, maxActiveSkills, enableSkills, ...sessionConfig } = config
    const enhancedConfig: SessionConfig = {
      ...sessionConfig,
      systemPrompt: enhancedSystemPrompt,
      // 渐进式披露：默认只暴露核心工具 schema
      availableTools: undefined
    }

    const result = await aiService.chatStream(
      messages,
      enhancedConfig,
      callbacks,
      signal,
      100, // maxToolRounds
      sessionId,
      {
        // 渐进式披露：默认只暴露核心工具,领域工具通过 search/load 动态激活
        availableTools: CORE_TOOL_NAMES,
        availableSkills: skillsContext.getAvailableSkills().map(s => s.id)
      }
    )

    return {
      ...result,
      skillActivation: undefined // 不再由前端自动激活
    }
  },

  /**
   * 快速模式 (无 Skills)
   * 
   * 直接调用底层 aiService,不经过 Skills 处理
   */
  async chatStreamSimple(
    messages: ChatMessage[],
    config: SessionConfig,
    callbacks: EnhancedStreamCallbacks,
    signal?: AbortSignal,
    sessionId?: string
  ): Promise<{ toolRecords?: ToolCallRecord[] }> {
    return aiService.chatStream(
      messages,
      config,
      callbacks,
      signal,
      10,
      sessionId
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════

/**
 * 从 Skill 定义创建元数据
 */
export function createSkillMetadata(skill: Skill): SkillMetadata {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    icon: skill.icon,
    category: skill.category,
    version: skill.version,
    tags: skill.tags,
    author: skill.author,
    isBuiltIn: skill.isBuiltIn,
    enabled: skill.enabled,
    tools: skill.tools,
    usageScenarios: skill.usageScenarios
  }
}

/**
 * 分析 Prompt 构成
 */
export function analyzePrompt(
  userInput: string,
  activeSkills: ActiveSkill[]
): {
  hasSkills: boolean
  activeCount: number
  toolCount: number
  estimatedTokens: number
} {
  return {
    hasSkills: activeSkills.length > 0,
    activeCount: activeSkills.length,
    toolCount: activeSkills.reduce((sum, s) => sum + s.tools.length, 0),
    estimatedTokens: Math.ceil(userInput.length / 4) +
      activeSkills.reduce((sum, s) => sum + (s.content?.length || 0) / 4, 0)
  }
}
