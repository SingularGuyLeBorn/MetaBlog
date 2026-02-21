/**
 * Skill Engine - 技能引擎
 * 管理和执行所有 Agent 技能
 */
import type { Skill, SkillContext, SkillResult } from '../core/types'

export class SkillEngine {
  private skills: Map<string, Skill> = new Map()
  private middlewares: Array<(context: SkillContext, params: any, next: () => Promise<SkillResult>) => Promise<SkillResult>> = []

  /**
   * 注册技能
   */
  register(skill: Skill): void {
    // 包装技能处理器，添加中间件支持
    const originalHandler = skill.handler
    skill.handler = async (context: SkillContext, params: any) => {
      return this.runMiddlewares(context, params, originalHandler)
    }

    this.skills.set(skill.name, skill)
    console.log(`[SkillEngine] Registered: ${skill.name}`)
  }

  /**
   * 批量注册技能
   */
  registerMany(skills: Skill[]): void {
    for (const skill of skills) {
      this.register(skill)
    }
  }

  /**
   * 获取技能
   */
  get(name: string): Skill | undefined {
    return this.skills.get(name)
  }

  /**
   * 列出所有技能
   */
  list(): Skill[] {
    return Array.from(this.skills.values())
  }

  /**
   * 执行技能
   */
  async execute(name: string, context: SkillContext, params: any): Promise<SkillResult> {
    const skill = this.skills.get(name)
    if (!skill) {
      return {
        success: false,
        error: `Skill not found: ${name}`,
        tokensUsed: 0,
        cost: 0
      }
    }

    // 验证必需参数
    const missingParams = skill.requiredParams.filter(p => !(p in params))
    if (missingParams.length > 0) {
      return {
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`,
        tokensUsed: 0,
        cost: 0
      }
    }

    context.logger.info(`Executing skill: ${name}`, { params })

    try {
      const result = await skill.handler(context, params)
      context.logger.info(`Skill completed: ${name}`, { 
        success: result.success,
        tokens: result.tokensUsed,
        cost: result.cost
      })
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      context.logger.error(`Skill failed: ${name}`, { error: errorMsg })
      return {
        success: false,
        error: errorMsg,
        tokensUsed: 0,
        cost: 0
      }
    }
  }

  /**
   * 添加中间件
   */
  use(middleware: (context: SkillContext, params: any, next: () => Promise<SkillResult>) => Promise<SkillResult>): void {
    this.middlewares.push(middleware)
  }

  /**
   * 查找匹配意图的技能
   */
  findByIntent(intentType: string): Skill | null {
    for (const skill of this.skills.values()) {
      // 基于技能名称和意图类型的映射
      const mapping: Record<string, string[]> = {
        'WRITE_ARTICLE': ['WriteArticle'],
        'EDIT_CONTENT': ['EditContent'],
        'RESEARCH_WEB': ['ResearchWeb', 'ResearchWithFallback'],
        'UPDATE_GRAPH': ['UpdateGraph'],
        'CODE_EXPLAIN': ['CodeExplain'],
        'ANSWER_QUESTION': ['AnswerQuestion'],
        'SUMMARIZE': ['Summarize'],
        'FETCH_CONTENT': ['FetchContentWithRetry']
      }

      const compatibleSkills = mapping[intentType] || []
      if (compatibleSkills.includes(skill.name)) {
        return skill
      }
    }
    return null
  }

  private async runMiddlewares(
    context: SkillContext, 
    params: any, 
    finalHandler: (context: SkillContext, params: any) => Promise<SkillResult>
  ): Promise<SkillResult> {
    let index = 0

    const next = async (): Promise<SkillResult> => {
      if (index >= this.middlewares.length) {
        return finalHandler(context, params)
      }
      const middleware = this.middlewares[index++]
      return middleware(context, params, next)
    }

    return next()
  }
}

// 单例导出
export const skillEngine = new SkillEngine()
