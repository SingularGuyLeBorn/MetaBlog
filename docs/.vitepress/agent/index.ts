/**
 * MetaUniverse Agent Runtime
 * 人机共生的 AI-Native 博客系统
 * 
 * 架构层级:
 * L5: 人机共生界面层 (Human-AI Interface)
 * L4: 智能编排层 (AI Orchestration)
 * L3: 工具与感知层 (Tools & Senses)
 * L2: 运行时与观察层 (Runtime & Observability)
 * L1: 记忆存储层 (Memory Storage)
 */

// Core
export { AgentRuntime } from './core/AgentRuntime'
export { IntentRouter } from './core/IntentRouter'
export { StateMachine } from './core/StateMachine'
export type * from './core/types'

// Skills
export { skillEngine, SkillEngine } from './skills/SkillEngine'
export { builtinSkills } from './skills/builtin'

// Memory
export { MemoryManagerImpl } from './memory/MemoryManager'

// Runtime
export { LoggerImpl } from './runtime/Logger'
export { CostTrackerImpl, CostTracker } from './runtime/CostTracker'

// Vue Components
// import AIChatOrb from '../theme/components/agent/AIChatOrb.vue'
// import GlobalPageEditorAGI from '../theme/components/agent/GlobalPageEditorAGI.vue'
// export { AIChatOrb, GlobalPageEditorAGI }

/**
 * 初始化 Agent Runtime
 * 
 * @example
 * ```typescript
 * import { AgentRuntime, skillEngine, builtinSkills } from './agent'
 * 
 * const agent = AgentRuntime.getInstance({ mode: 'COLLAB' })
 * await agent.initialize()
 * 
 * // 注册技能
 * for (const skill of builtinSkills) {
 *   agent.registerSkill(skill)
 * }
 * ```
 */

/**
 * 使用 Agent Runtime 进行内容创作
 * 
 * @example
 * ```typescript
 * // 在 COLLAB 模式下分析编辑器内容
 * const suggestions = await agent.analyzeEditorContent(content, cursorPosition)
 * 
 * // 通过 ChatOrb 发送指令
 * const response = await agent.processInput('写一篇关于Transformer的文章', {
 *   currentFile: 'posts/transformer.md'
 * })
 * ```
 */

// 版本信息
export const VERSION = '1.0.0'
export const CODENAME = 'Digital Life'

/**
 * 检查系统健康状态
 */
export async function checkHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, boolean>
}> {
  const components: Record<string, boolean> = {
    agentRuntime: true,
    memoryManager: true,
    skillEngine: true,
    gitIntegration: true
  }

  // 检查 Git 状态
  try {
    const { execSync } = await import('child_process')
    execSync('git status', { stdio: 'ignore' })
    components.gitIntegration = true
  } catch {
    components.gitIntegration = false
  }

  const allHealthy = Object.values(components).every(v => v)
  
  return {
    status: allHealthy ? 'healthy' : 'degraded',
    components
  }
}
