/**
 * ============================================================================
 * 笔记列表工具
 * ============================================================================
 *
 * 提供列出系统中已保存笔记文件的能力,返回 .notes/ 目录下的文件元信息. 
 * 如需查看某条笔记的完整内容,需要结合文件读取工具. 
 *
 * @module src/theme/tools/note/list
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/**
 * 列出笔记工具定义
 */
export const listNotesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'listNotes',
    description: `列出系统中已保存的所有笔记文件. \n\n【什么时候调用】\n- 用户说"看看我的笔记"、"有哪些笔记"\n- 用户想查找之前保存的某条笔记,但记不清标题\n- 在创建新笔记前,想确认是否已有同类笔记避免重复\n- 需要向用户展示笔记库的整体情况\n\n【不调用的情况】\n- 用户明确知道笔记标题并要求打开某条特定笔记(当前无按标题读取单条笔记的工具,可建议用户通过其他方式查看)\n\n【示例用法】\n- listNotes() → 返回笔记文件列表(含文件名、路径、修改时间等)\n\n【注意事项】\n- 本工具无需参数\n- 返回的是 .notes/ 目录下的文件元信息,不含完整内容\n- 如需查看某条笔记的完整内容,需要结合文件读取工具`,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

/** 后端 API 基础路径 */
const API_BASE = '/api'

/**
 * 列出系统中的笔记文件
 *
 * 调用 /api/files/list?path=.notes 获取笔记目录下的文件列表. 
 *
 * @returns 笔记文件元信息数组
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
      'listNotes'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '获取笔记列表失败',
      '请检查网络连接'
    )
  }
}
