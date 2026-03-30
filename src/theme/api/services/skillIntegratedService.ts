/**
 * Skill Integrated AI Service
 * 
 * 集成 Skills + Tools 的增强版 AI Service
 * 
 * 核心流程:
 * 1. 接收用户输入
 * 2. 匹配并激活相关 Skills
 * 3. 构建渐进式 System Prompt (LOD-0/1/2)
 * 4. 过滤可用工具 (仅激活 Skills 声明的工具)
 * 5. 执行 AI 对话 (支持工具调用)
 * 
 * 对比原版 aiService.ts 的增强:
 * - Skills 上下文感知
 * - 工具权限控制
 * - 渐进式 Prompt 构建
 * - Skill 匹配可视化
 */

import type { ChatMessage, SessionConfig, ToolCallRecord, ThinkingStep, Skill } from '@/theme/types'
import type { SkillMetadata, ActiveSkill, SkillMatchResult } from '@/theme/skills/types'
import { aiService } from './aiService'
import { 
  matchSkills, 
  matchSkillsWithContext,
  buildFullPrompt,
  autoActivateSkills
} from '@/theme/skills'
import { getToolDefinitions, type ToolDefinition } from '@/theme/tools/index'

// ═══════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════

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

export interface SkillActivationResult {
  matches: SkillMatchResult[]
  activated: ActiveSkill[]
  deactivated: string[]
}

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
          const activeSkill: ActiveSkill = {
            ...fullSkill,
            content: fullSkill.content || '', // 使用已加载的内容
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
      prompt: '',
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
    
    return buildFullPrompt(
      baseRole,
      userInput,
      this.availableSkills,
      this.activeSkills,
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
  ): Promise<{ toolRecords?: ToolCallRecord[]; skillActivation?: SkillActivationResult }> {
    
    // 提取最后一条用户消息
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    const userInput = lastUserMessage?.content || ''
    
    // ═══════════════════════════════════════════════════════════════
    // Step 1: Skills 匹配和激活
    // ═══════════════════════════════════════════════════════════════
    
    let skillActivation: SkillActivationResult | undefined
    
    if (config.enableSkills !== false && userInput) {
      skillActivation = skillsContext.activateSkillsForInput(userInput, {
        threshold: config.skillMatchThreshold ?? 0.2,
        maxMatches: config.maxActiveSkills ?? 3,
        clearPrevious: false // 保持上下文连续性
      })
      
      // 触发回调
      if (skillActivation.activated.length > 0) {
        callbacks.onSkillActivation?.(skillActivation)
        console.log('[SkillIntegratedService] Activated skills:', 
          skillActivation.activated.map(s => s.id))
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Step 2: 构建增强的 System Prompt
    // ═══════════════════════════════════════════════════════════════
    
    let enhancedSystemPrompt = config.systemPrompt
    
    if (config.enableSkills !== false) {
      const baseRole = config.systemPrompt?.split('\n')[0] || 'MetaBlog AI 助手'
      enhancedSystemPrompt = skillsContext.buildSystemPrompt(baseRole, userInput)
      
      console.log('[SkillIntegratedService] Built enhanced system prompt:', {
        length: enhancedSystemPrompt.length,
        activeSkills: skillsContext.getActiveSkills().map(s => s.id)
      })
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Step 3: 确定可用工具
    // ═══════════════════════════════════════════════════════════════
    
    const activeTools = skillsContext.getActiveTools()
    const availableTools = activeTools.length > 0 ? activeTools : undefined
    
    if (availableTools) {
      console.log('[SkillIntegratedService] Available tools:', availableTools)
    }
    
    // ═══════════════════════════════════════════════════════════════
    // Step 4: 调用底层 aiService
    // ═══════════════════════════════════════════════════════════════
    
    const enhancedConfig: SessionConfig = {
      ...config,
      systemPrompt: enhancedSystemPrompt,
      // 传递工具上下文
      availableTools
    }
    
    const result = await aiService.chatStream(
      messages,
      enhancedConfig,
      callbacks,
      signal,
      10, // maxToolRounds
      sessionId,
      {
        availableTools,
        availableSkills: skillsContext.getActiveSkills().map(s => s.id)
      }
    )
    
    return {
      ...result,
      skillActivation
    }
  },
  
  /**
   * 快速模式 (无 Skills)
   * 
   * 直接调用底层 aiService，不经过 Skills 处理
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
