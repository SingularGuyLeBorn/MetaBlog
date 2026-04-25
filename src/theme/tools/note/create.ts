/**
 * 笔记工具定义 — createNote
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

export const createNoteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'createNote',
    description: '创建一条笔记。当用户需要记录信息、保存想法或创建备忘录时使用。',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '笔记标题'
        },
        content: {
          type: 'string',
          description: '笔记内容'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表',
          default: []
        }
      },
      required: ['title', 'content']
    }
  }
}

const API_BASE = '/api'

/**
 * 创建笔记
 */
export const createNote: ToolExecutor = async (args): Promise<ToolResult> => {
  const { title, content, tags = [] } = args
  
  if (!title || !content) {
    return createErrorResult(
      'Missing required parameters',
      '请提供标题和内容',
      '示例: createNote(title="笔记标题", content="笔记内容", tags=["tag1"])'
    )
  }
  
  try {
    const noteContent = `# ${title}\n\n${content}\n\n---\n标签: ${tags.join(', ') || '无'}\n创建时间: ${new Date().toLocaleString('zh-CN')}\n`
    
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `.notes/${Date.now()}-${title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.md`,
        content: noteContent
      })
    })
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '保存笔记失败',
        '请稍后重试'
      )
    }
    
    return createSuccessResult(
      { title, tags },
      `笔记创建成功: ${title}`,
      'createNote'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '创建笔记失败',
      '请检查网络连接'
    )
  }
}
