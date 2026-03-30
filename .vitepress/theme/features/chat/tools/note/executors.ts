/**
 * 笔记工具执行器
 * 包含：创建笔记、列出笔记等功能
 */

import type { ToolExecutor, ToolResult } from '../types'
import { createSuccessResult, createErrorResult } from '../types'

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
      '示例: create_note(title="笔记标题", content="笔记内容", tags=["tag1"])'
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
      'create_note'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '创建笔记失败',
      '请检查网络连接'
    )
  }
}

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

/**
 * 查询知识（搜索本地文章）
 */
export const queryKnowledge: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query } = args
  
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供查询内容',
      '示例: query_knowledge(query="Docker 使用方法")'
    )
  }
  
  // 搜索本地文章作为知识库
  return createSuccessResult(
    { query },
    `知识库查询: ${query}`,
    'query_knowledge',
    '建议使用 search_articles 搜索本地文章'
  )
}
