/**
 * 文件列表工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api'

export const listFilesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_files',
    description: '列出指定目录中的文件和文件夹。当用户需要查看目录结构或浏览文件时使用。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '目录路径，默认为当前目录',
          default: ''
        },
        recursive: {
          type: 'boolean',
          description: '是否递归列出子目录，默认 false',
          default: false
        }
      },
      required: []
    }
  }
}

/**
 * 列出文件
 */
export const listFiles: ToolExecutor = async (args): Promise<ToolResult> => {
  const { path: dirPath = '', recursive = false } = args
  
  // 基础参数验证
  if (dirPath && (dirPath.includes('**') || dirPath.includes('*'))) {
    return createErrorResult(
      'Glob patterns not supported',
      '暂不支持 glob 通配符',
      '请提供具体的文件夹路径'
    )
  }

  try {
    const response = await fetch(`${API_BASE}/sidebar`)
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取文件列表失败',
        '请稍后重试'
      )
    }
    
    const data = await response.json()
    
    if (!data.success) {
      return createErrorResult(
        data.error || 'Unknown error',
        '获取文件列表失败',
        '请联系管理员'
      )
    }
    
    const sections = data.data || {}
    
    if (Object.keys(sections).length === 0) {
      return createSuccessResult(
        [],
        '暂无文件',
        'list_files',
        '使用 write_file 创建新文件'
      )
    }
    
    return createSuccessResult(
      sections,
      `获取到文件列表`,
      'list_files'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '获取文件列表失败',
      '请检查网络连接'
    )
  }
}
