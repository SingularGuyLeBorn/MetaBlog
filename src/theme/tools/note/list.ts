/**
 * 笔记工具定义 — list_notes
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const listNotesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_notes',
    description: '列出所有笔记。当用户需要查看笔记列表或查找特定笔记时使用。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

const API_BASE = '/api'

/**
 * 列出笔记
 */
export const listNotes: ToolExecutor = async (): Promise<ToolResult> => {
  try {
    const response = await fetch(`${API_BASE}/files/list?path=.notes`)
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取笔记列表失败',
        '请稍后重试'
      )
    }
    
    const data = await response.json()
    
    return createSuccessResult(
      data.data || [],
      `获取笔记列表`,
      'list_notes'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '获取笔记列表失败',
      '请检查网络连接'
    )
  }
}
