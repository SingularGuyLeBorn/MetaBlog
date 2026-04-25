/**
 * 文件读取工具
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api'

export const readFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'read_file',
    description: '读取指定文件的内容。当用户需要查看文件内容、检查配置文件或读取代码文件时使用。支持限制读取长度避免大文件占用过多上下文。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件路径，例如 "docs/readme.md" 或 "src/config.ts"'
        },
        max_length: {
          type: 'number',
          description: '最大读取字符数，默认 8000。大文件建议分多次读取。',
          default: 8000
        }
      },
      required: ['path']
    }
  }
}

/**
 * 读取文件
 */
export const readFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { path: filePath, max_length = 8000 } = args
  
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
    
    const rawContent = await response.text()
    const isTruncated = rawContent.length > max_length
    
    // 截断时提示 AI 可以调大 max_length 重新读取
    const content = isTruncated
      ? rawContent.substring(0, max_length) +
        `\n\n---` +
        `\n[内容已截断] 文件共 ${rawContent.length} 字符，当前限制 ${max_length} 字符。` +
        `\n如需读取更多内容，可重新调用 read_file(path="${filePath}", max_length=${Math.min(max_length * 2, 50000)})`
      : rawContent
    
    return createSuccessResult(
      {
        path: filePath,
        content,
        size: rawContent.length,
        truncated: isTruncated
      },
      `成功读取文件 (${rawContent.length} 字符${isTruncated ? '，已截断至 ' + max_length : ''})`,
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
