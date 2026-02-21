/**
 * API Index - 统一导出所有 API 模块
 * 
 * 注意：避免命名冲突，显式导出或重命名
 */

// Chat API - 显式导出以避免与 memory.ts 冲突
export {
  listSessions as listChatSessions,
  getSession as getChatSession,
  saveSession as saveChatSession,
  deleteSession as deleteChatSession,
  saveAllSessions
} from './chat'

// Files API
export * from './files'

// Articles API
export * from './articles'

// Memory API - 显式导出以避免冲突
export {
  // 实体
  getAllEntities,
  getEntity,
  saveEntity,
  deleteEntity,
  searchEntities,
  // 任务
  getAllTasks,
  getTask,
  saveTask,
  deleteTask,
  // 会话
  getAllSessions,
  // 执行记录
  saveSkillExecution,
  getSkillExecutions
} from './memory'

// Git API
export * from './git'

// Balance API
export * from './balance'

// 类型重导出
export type { 
  ChatMessage, 
  ChatSession, 
  SessionSummary 
} from './chat'

export type { 
  FileInfo, 
  FileContent, 
  TrashItem,
  LockStatus 
} from './files'

export type {
  SkillExecutionRecord
} from './memory'

// 从 core/types 重新导出 Memory 相关类型
export type {
  KnowledgeEntity,
  TaskHistory,
  SessionMemory
} from '../core/types'
