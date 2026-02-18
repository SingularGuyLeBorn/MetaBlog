/**
 * Memory Module - 记忆管理模块
 * 统一导出所有记忆管理子模块
 * 
 * 目录结构：
 * - entities/EntityManager.ts    知识实体管理
 * - tasks/TaskManager.ts         任务历史管理
 * - context/SessionManager.ts    会话上下文管理
 * - skills/SkillMemoryManager.ts 技能记忆管理
 */

// 子模块导出
export { EntityManager, getEntityManager } from './entities/EntityManager'
export { TaskManager, getTaskManager } from './tasks/TaskManager'
export { SessionManager, getSessionManager } from './context/SessionManager'
export { SkillMemoryManager, getSkillMemoryManager } from './skills/SkillMemoryManager'

// 类型导出
export type { KnowledgeEntity, EntityType, TaskHistory, SessionMemory } from '../core/types'
export type { ContextOptions } from './context/SessionManager'
export type { SkillExecutionRecord, SkillPreference } from './skills/SkillMemoryManager'

// 统一记忆管理器 - 实现 MemoryManager 接口
import { getEntityManager } from './entities/EntityManager'
import { getTaskManager } from './tasks/TaskManager'
import { getSessionManager } from './context/SessionManager'
import { getSkillMemoryManager } from './skills/SkillMemoryManager'
import type { 
  KnowledgeEntity, 
  TaskHistory, 
  SessionMemory,
  EntityType,
  RAGResult
} from '../core/types'

/**
 * 统一记忆管理器
 * 提供子模块实例，开发者可直接访问
 */
export class MemoryManager {
  // 子模块实例 - 直接访问
  entities = getEntityManager()
  tasks = getTaskManager()
  sessions = getSessionManager()
  skills = getSkillMemoryManager()

  // ============ 初始化 ============

  async initialize(): Promise<void> {
    console.log('[MemoryManager] Initializing...')
    
    await Promise.all([
      this.entities.loadFromServer(),
      this.tasks.loadFromServer(),
      this.sessions.loadFromServer()
    ])
    
    console.log('[MemoryManager] Initialized successfully')
  }

  // ============ RAG 上下文构建 ============

  async buildContext(query: string, currentFile?: string): Promise<RAGResult[]> {
    const [entityResults, taskResults] = await Promise.all([
      this.entities.search(query),
      this.tasks.search(query)
    ])

    // 合并结果
    return [...entityResults, ...taskResults.map(t => ({
      content: t.description,
      source: `task:${t.id}`,
      score: 0.5,
      metadata: { title: `Task: ${t.id}` }
    }))].sort((a, b) => b.score - a.score)
  }
}

// 导出单例
let instance: MemoryManager | null = null
export function getMemoryManager(): MemoryManager {
  if (!instance) {
    instance = new MemoryManager()
  }
  return instance
}

// 默认导出
export default MemoryManager
