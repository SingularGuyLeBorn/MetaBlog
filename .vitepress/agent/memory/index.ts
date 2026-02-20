/**
 * Memory Module - 记忆管理模块
 * 统一导出所有记忆管理子模块
 * 
 * **已文件化**: 所有数据持久化到文件系统
 * 
 * 目录结构：
 * - entities/EntityManager.ts    知识实体管理（文件存储）
 * - tasks/TaskManager.ts         任务历史管理（文件存储）
 * - context/SessionManager.ts    会话上下文管理（文件存储）
 * - skills/SkillMemoryManager.ts 技能记忆管理
 * - data/                        数据存储目录
 *   - entities.json              实体数据
 *   - tasks.json                 任务历史
 *   - sessions.json              会话数据
 */

// 子模块导出
export { EntityManager, getEntityManager } from './entities/EntityManager'
export { TaskManager, getTaskManager } from './tasks/TaskManager'
export { SessionManager, getSessionManager } from './context/SessionManager'
export { SkillMemoryManager, getSkillMemoryManager } from './skills/SkillMemoryManager'

// 文件存储导出
export { FileStorage, createStorage } from './FileStorage'

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
 * 
 * 数据持久化：
 * - 实体：.vitepress/agent/memory/data/entities.json
 * - 任务：.vitepress/agent/memory/data/tasks.json
 * - 会话：.vitepress/agent/memory/data/sessions.json
 */
export class MemoryManager {
  // 子模块实例 - 直接访问
  entities = getEntityManager()
  tasks = getTaskManager()
  sessions = getSessionManager()
  skills = getSkillMemoryManager()

  private initialized: boolean = false

  // ============ 初始化 ============

  /**
   * 初始化所有记忆模块
   * 从文件加载数据到内存
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    console.log('[MemoryManager] 开始初始化...')
    
    await Promise.all([
      this.entities.initialize(),
      this.tasks.initialize(),
      this.sessions.initialize()
    ])
    
    // 清理过期会话
    await this.sessions.cleanupExpired()
    
    this.initialized = true
    console.log('[MemoryManager] 初始化完成')
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }

  // ============ RAG 上下文构建 ============

  /**
   * 构建 RAG 上下文
   * 从实体和任务历史中搜索相关内容
   */
  async buildContext(query: string, currentFile?: string): Promise<RAGResult[]> {
    // 确保已初始化
    if (!this.initialized) {
      await this.initialize()
    }

    const [entityResults, taskResults] = await Promise.all([
      this.entities.search(query),
      this.tasks.search(query)
    ])

    // 合并结果，过滤掉当前文件
    const results = [...entityResults, ...taskResults]
      .filter(r => !currentFile || !r.source.includes(currentFile))
      .sort((a, b) => b.score - a.score)

    return results
  }

  // ============ 数据导出/导入 ============

  /**
   * 导出所有记忆数据
   */
  async exportAll(): Promise<{
    entities: KnowledgeEntity[]
    tasks: TaskHistory[]
    sessions: SessionMemory[]
  }> {
    await this.initialize()
    
    return {
      entities: await this.entities.getAll(),
      tasks: await this.tasks.list(1000),
      sessions: await this.sessions.list()
    }
  }

  /**
   * 获取存储统计
   */
  async getStats(): Promise<{
    entities: number
    tasks: number
    sessions: number
  }> {
    await this.initialize()
    
    return {
      entities: (await this.entities.getAll()).length,
      tasks: (await this.tasks.list(1000)).length,
      sessions: (await this.sessions.list()).length
    }
  }

  /**
   * 清理所有数据（危险操作！）
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.entities.clear(),
      this.tasks.clear(),
      this.sessions.clear()
    ])
    console.log('[MemoryManager] 已清空所有数据')
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
