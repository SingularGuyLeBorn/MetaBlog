/**
 * ============================================================================
 * Batch Result Store
 * ============================================================================
 *
 * 管理批量操作结果（如批量创建文档、大量搜索内容等），
 * 避免大段内容直接堆积在 MessageBubble 中。
 */

import { reactive, ref } from 'vue'

export interface BatchResultItem {
  id: string
  title: string
  type: 'document' | 'search' | 'code' | 'generic'
  content: string
  summary: string
  timestamp: number
  meta?: Record<string, string>
}

const isOpen = ref(false)
const items = reactive<BatchResultItem[]>([])

export function useBatchResultStore() {
  function addItem(item: Omit<BatchResultItem, 'id' | 'timestamp'>) {
    // 去重：如果已有相同 title + content 的 item，不再重复添加
    const existingIndex = items.findIndex(
      (i) => i.title === item.title && i.content === item.content
    )
    if (existingIndex > -1) {
      // 已存在，移到顶部并返回现有 ID
      const existing = items[existingIndex]
      items.splice(existingIndex, 1)
      items.unshift(existing)
      isOpen.value = true
      return existing.id
    }
    const newItem: BatchResultItem = {
      ...item,
      id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    }
    items.unshift(newItem)
    // 自动打开面板
    isOpen.value = true
    return newItem.id
  }

  function removeItem(id: string) {
    const idx = items.findIndex(i => i.id === id)
    if (idx > -1) items.splice(idx, 1)
  }

  function clear() {
    items.splice(0, items.length)
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    items,
    addItem,
    removeItem,
    clear,
    toggle,
    open,
    close,
  }
}
