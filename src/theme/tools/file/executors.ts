/**
 * 文件工具执行器
 * 包含：文件读写、列表等功能
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api'

/**
 * 读取文件
 */
export const readFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { path: filePath } = args
  
  if (!filePath) {
    return createErrorResult(
      'Missing path parameter',
      '请提供文件路径',
      '示例: read_file(path="docs/readme.md")'
    )
  }
  
  try {
    const response = await fetch(`${API_BASE}/files/read?path=${encodeURIComponent(filePath)}`)
    
    if (response.status === 404) {
      return createErrorResult(
        'File not found',
        `文件未找到: ${filePath}`,
        '请检查路径是否正确'
      )
    }
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '读取文件失败',
        '请稍后重试'
      )
    }
    
    const content = await response.text()
    
    return createSuccessResult(
      {
        path: filePath,
        content,
        size: content.length
      },
      `成功读取文件 (${content.length} 字符)`,
      'read_file'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '读取文件失败',
      '请检查网络连接'
    )
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
