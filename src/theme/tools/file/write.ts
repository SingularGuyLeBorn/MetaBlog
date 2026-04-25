/**
 * 文件写入工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api'

export const writeFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'write_file',
    description: '写入内容到指定文件。当用户需要创建新文件或覆盖现有文件时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径'
        },
        content: {
          type: 'string',
          description: '要写入的文件内容'
        }
      },
      required: ['path', 'content']
    }
  }
}

/**
 * 写入文件
 */
export const writeFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { path: filePath, content } = args
  
  if (!filePath) {
    return createErrorResult(
      'Missing path parameter',
      '请提供文件路径',
      '示例: write_file(path="docs/file.md", content="内容")'
    )
  }
  
  if (content === undefined) {
    return createErrorResult(
      'Missing content parameter',
      '请提供文件内容',
      '示例: write_file(path="file.md", content="内容")'
    )
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content })
    })
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '写入文件失败',
        '请稍后重试'
      )
    }
    
    return createSuccessResult(
      { path: filePath, size: content.length },
      `文件写入成功 (${content.length} 字符)`,
      'write_file'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '写入文件失败',
      '请检查网络连接'
    )
  }
}
