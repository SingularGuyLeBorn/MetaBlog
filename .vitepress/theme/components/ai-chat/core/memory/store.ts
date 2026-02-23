/**
 * Memory Store - 记忆存储管理
 * 
 * 提供记忆的CRUD、搜索和格式化功能
 */
import type { Memory, MemoryCategory, MemorySearchOptions, MemoryFormatOptions } from './types'
import { addLog } from '../services/logger'

// 存储键名
const STORAGE_KEY = 'ai-chat-memories'

// 内存缓存
let memoryCache: Memory[] | null = null

/**
 * 加载所有记忆
 */
export function loadMemories(): Memory[] {
  if (memoryCache !== null) return memoryCache

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      memoryCache = JSON.parse(saved)
      addLog({
        level: 'debug',
        category: 'lifecycle',
        component: 'MemoryStore',
        event: 'memories_loaded',
        message: `加载了 ${memoryCache!.length} 条记忆`,
        data: { count: memoryCache!.length }
      })
      return memoryCache!
    }
  } catch (e) {
    console.error('[Memory] Failed to load memories:', e)
    addLog({
      level: 'error',
      category: 'lifecycle',
      component: 'MemoryStore',
      event: 'memories_load_failed',
      message: '加载记忆失败',
      data: { error: String(e) }
    })
  }

  memoryCache = []
  return []
}

/**
 * 保存所有记忆
 */
export function saveMemories(memories: Memory[]): void {
  memoryCache = memories
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories))
  } catch (e) {
    console.error('[Memory] Failed to save memories:', e)
    addLog({
      level: 'error',
      category: 'lifecycle',
      component: 'MemoryStore',
      event: 'memories_save_failed',
      message: '保存记忆失败',
      data: { error: String(e) }
    })
  }
}

/**
 * 获取所有记忆
 */
export function getAllMemories(): Memory[] {
  return [...loadMemories()]
}

/**
 * 获取启用的记忆
 */
export function getEnabledMemories(): Memory[] {
  return loadMemories().filter(m => m.enabled)
}

/**
 * 按分类获取记忆
 */
export function getMemoriesByCategory(category: MemoryCategory): Memory[] {
  return loadMemories().filter(m => m.category === category)
}

/**
 * 创建记忆
 */
export function createMemory(
  content: string,
  category: MemoryCategory = 'facts',
  options: { importance?: number; source?: 'user' | 'inferred' } = {}
): Memory {
  const memory: Memory = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: content.trim(),
    category,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    importance: options.importance ?? 3,
    source: options.source ?? 'user'
  }

  const memories = loadMemories()
  memories.push(memory)
  saveMemories(memories)

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'MemoryStore',
    event: 'memory_created',
    message: `创建记忆: ${content.substring(0, 50)}...`,
    data: { memoryId: memory.id, category, importance: memory.importance }
  })

  return memory
}

/**
 * 更新记忆
 */
export function updateMemory(id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>): boolean {
  const memories = loadMemories()
  const index = memories.findIndex(m => m.id === id)
  if (index === -1) return false

  Object.assign(memories[index], updates, { updatedAt: Date.now() })
  saveMemories(memories)

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'MemoryStore',
    event: 'memory_updated',
    message: `更新记忆: ${id}`,
    data: { memoryId: id, updates: Object.keys(updates) }
  })

  return true
}

/**
 * 删除记忆
 */
export function deleteMemory(id: string): boolean {
  const memories = loadMemories()
  const index = memories.findIndex(m => m.id === id)
  if (index === -1) return false

  memories.splice(index, 1)
  saveMemories(memories)

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'MemoryStore',
    event: 'memory_deleted',
    message: `删除记忆: ${id}`,
    data: { memoryId: id }
  })

  return true
}

/**
 * 搜索记忆
 */
export function searchMemories(options: MemorySearchOptions = {}): Memory[] {
  let results = loadMemories()

  // 按分类过滤
  if (options.category) {
    results = results.filter(m => m.category === options.category)
  }

  // 按重要性过滤
  if (options.minImportance !== undefined) {
    results = results.filter(m => m.importance >= options.minImportance!)
  }

  // 按关键词搜索
  if (options.query) {
    const query = options.query.toLowerCase()
    results = results.filter(m => m.content.toLowerCase().includes(query))
  }

  // 按重要性排序，然后按时间排序
  results.sort((a, b) => {
    if (b.importance !== a.importance) {
      return b.importance - a.importance
    }
    return b.updatedAt - a.updatedAt
  })

  // 限制数量
  if (options.limit && options.limit > 0) {
    results = results.slice(0, options.limit)
  }

  return results
}

/**
 * 格式化记忆为文本（用于注入系统提示词）
 */
export function formatMemoriesForPrompt(options: MemoryFormatOptions = {}): string {
  const { maxLength = 2000, groupByCategory = true } = options
  const memories = getEnabledMemories()

  if (memories.length === 0) return ''

  let formatted = ''

  if (groupByCategory) {
    const categories: Record<MemoryCategory, string> = {
      user_info: '用户信息',
      preferences: '偏好设置',
      facts: '重要信息',
      goals: '目标计划',
      context: '上下文'
    }

    const grouped: Record<string, Memory[]> = {}
    for (const mem of memories) {
      if (!grouped[mem.category]) grouped[mem.category] = []
      grouped[mem.category].push(mem)
    }

    for (const [cat, mems] of Object.entries(grouped)) {
      if (mems.length === 0) continue
      const catName = categories[cat as MemoryCategory] || cat
      formatted += `\n【${catName}】\n`
      for (const mem of mems) {
        formatted += `- ${mem.content}\n`
      }
    }
  } else {
    formatted = '\n【关于用户】\n'
    for (const mem of memories) {
      formatted += `- ${mem.content}\n`
    }
  }

  // 截断到最大长度
  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength) + '\n...（更多记忆已省略）'
  }

  return formatted
}

/**
 * 获取用于系统提示词的记忆文本
 */
export function getMemoryPrompt(): string {
  const memoryText = formatMemoriesForPrompt({ maxLength: 1500 })
  if (!memoryText) return ''

  return `\n=== 用户记忆 ===${memoryText}===\n在回复时，请考虑上述记忆中的信息。`
}

/**
 * 清空所有记忆
 */
export function clearAllMemories(): void {
  saveMemories([])
  addLog({
    level: 'warn',
    category: 'lifecycle',
    component: 'MemoryStore',
    event: 'memories_cleared',
    message: '所有记忆已清空'
  })
}

/**
 * 统计记忆数量
 */
export function getMemoryStats(): { total: number; enabled: number; byCategory: Record<string, number> } {
  const memories = loadMemories()
  const byCategory: Record<string, number> = {}

  for (const mem of memories) {
    byCategory[mem.category] = (byCategory[mem.category] || 0) + 1
  }

  return {
    total: memories.length,
    enabled: memories.filter(m => m.enabled).length,
    byCategory
  }
}

/**
 * 从对话中提取记忆（简化版，实际可能需要AI分析）
 */
export function extractMemoryFromMessage(message: string): Memory | null {
  // 简单的启发式规则：如果用户明确说了"记住"、"我是"等
  const patterns = [
    { pattern: /(?:记住|请记住).*(?:我(?:叫|是)|我的名字是)\s*(.+)/i, category: 'user_info' as const },
    { pattern: /(?:记住|请记住).*(?:我喜欢|偏好|习惯)\s*(.+)/i, category: 'preferences' as const },
    { pattern: /(?:记住|请记住)\s*(.+)/i, category: 'facts' as const }
  ]

  for (const { pattern, category } of patterns) {
    const match = message.match(pattern)
    if (match) {
      return createMemory(match[1] || match[0], category, { source: 'user' })
    }
  }

  return null
}
