/**
 * Memory System - 记忆系统类型定义
 * 
 * 类似于Claude的Memory功能，存储用户信息和偏好
 * 在每次对话开始时自动注入到系统提示词中
 */

/** 记忆项 */
export interface Memory {
  /** 唯一ID */
  id: string
  /** 记忆内容 */
  content: string
  /** 记忆分类 */
  category: MemoryCategory
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /** 是否启用 */
  enabled: boolean
  /** 重要性（1-5） */
  importance: number
  /** 来源（用户明确告知/AI推断） */
  source: 'user' | 'inferred'
  /** 关联的会话ID（如果是从特定会话提取的） */
  sessionId?: string
}

/** 记忆分类 */
export type MemoryCategory =
  | 'user_info'      // 用户基本信息（姓名、职业等）
  | 'preferences'    // 偏好设置（语言、风格等）
  | 'facts'          // 事实信息
  | 'goals'          // 目标和计划
  | 'context'        // 上下文信息

/** 记忆搜索选项 */
export interface MemorySearchOptions {
  category?: MemoryCategory
  query?: string
  limit?: number
  minImportance?: number
}

/** 记忆状态 */
export interface MemoryState {
  memories: Memory[]
  isLoading: boolean
  lastSyncedAt: number | null
}

/** 记忆格式化选项 */
export interface MemoryFormatOptions {
  maxLength?: number
  includeTimestamp?: boolean
  groupByCategory?: boolean
}
