/**
 * Memory System - 记忆系统
 * 
 * 存储用户信息和偏好，在每次对话时自动注入到系统提示词
 * 类似于Claude的Memory功能
 */

// 类型导出
export type {
  Memory,
  MemoryCategory,
  MemorySearchOptions,
  MemoryState,
  MemoryFormatOptions
} from './types'

// 功能导出
export {
  getMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
  searchMemories,
  formatMemoriesForPrompt,
  getMemoryPrompt,
  clearAllMemories,
  getMemoryStats,
  clearCache,
  initializeStorage,
  extractMemoryFromMessage
} from './store'
