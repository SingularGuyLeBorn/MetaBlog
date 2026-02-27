/**
 * Memory Store - 记忆存储管理
 * 
 * 数据源：后端API（唯一数据源）
 * 原则：
 * - 所有数据通过API持久化到后端
 * - 内存只做临时缓存
 * - 空状态由UI处理
 */

import type { Memory, MemoryCategory, MemorySearchOptions, MemoryFormatOptions } from './types'
import * as memoryStorage from '../services/memoryStorage'

// 重新导出 API 函数
export {
  getMemories,
  getMemory,
  createMemory,
  updateMemory,
  deleteMemory,
  searchMemories,
  getMemoryStats,
  clearAllMemories,
  formatMemoriesForPrompt,
  getMemoryPrompt,
  clearCache,
  initializeStorage,
} from '../services/memoryStorage'

// 为兼容性保留的简单导出
export { memoryStorage }

// 从对话中提取记忆（简化版，实际可能需要AI分析）
export function extractMemoryFromMessage(message: string): { content: string; category: MemoryCategory } | null {
  // 简单的启发式规则：如果用户明确说了"记住"、"我是"等
  const patterns = [
    { pattern: /(?:记住|请记住).*(?:我(?:叫|是)|我的名字是)\s*(.+)/i, category: 'user_info' as const },
    { pattern: /(?:记住|请记住).*(?:我喜欢|偏好|习惯)\s*(.+)/i, category: 'preferences' as const },
    { pattern: /(?:记住|请记住)\s*(.+)/i, category: 'facts' as const }
  ]

  for (const { pattern, category } of patterns) {
    const match = message.match(pattern)
    if (match) {
      return { content: match[1] || match[0], category }
    }
  }

  return null
}
