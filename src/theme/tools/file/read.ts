/**
 * ============================================================================
 * 文件读取工具
 * ============================================================================
 *
 * 读取博客项目中指定文件的完整内容,支持长度限制防止大文件挤占上下文. 
 *
 * @module src/theme/tools/file/read
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/** 后端 API 基础路径 */
const API_BASE = '/api'

/**
 * 读取文件的工具定义
 */
export const readFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'readFile',
    description: '读取指定文件的完整内容或部分内容. \n\n使用场景：当用户需要「查看某个文件的内容」「读取配置文件」「看看这段代码怎么写的」「打开某个文档」时调用. 支持通过 max_length 限制读取长度,防止大文件挤占上下文. \n\n示例用法：readFile(path="docs/guide/getting-started.md", max_length=50000)\n\n注意事项：\n- 路径格式为相对路径,如 "docs/readme.md"、"src/config.ts",禁止使用绝对路径或路径穿越(如 ../etc/passwd)\n- 大文件(如日志、数据文件)建议设置合理的 max_length,或分多次读取\n- 如果文件超过 max_length,返回内容会被截断,并在末尾提示如何续读\n- 只能读取项目目录内的文件,无法访问系统文件或网络资源\n- 读取前建议先用 listFiles 确认文件存在和路径正确',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件的相对路径,相对于项目根目录. 示例："docs/readme.md"、"src/config.ts"、".env.example". 禁止使用绝对路径或包含 ".." 的路径穿越. '
        },
        max_length: {
          type: 'number',
          description: '最大读取字符数,用于防止大文件占用过多上下文. 默认值：200000. 如果文件实际内容超过此值,返回内容会被截断并在末尾附带领取剩余内容的提示. ',
          default: 200000
        }
      },
      required: ['path']
    }
  }
}

/**
 * 读取文件
 *
 * 通过后端 API 读取文件内容,支持长度限制. 
 * 如果内容超过 max_length,会截断并在末尾提示如何续读. 
 *
 * @param args - 工具参数
 * @param args.path - 文件相对路径
 * @param args.max_length - 最大读取字符数(默认 200000)
 * @returns 文件内容或错误信息
 */
export const readFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { path: filePath, max_length = 200000 } = args

  if (!filePath) {
    return createErrorResult(
      'Missing path parameter',
      '请提供文件路径',
      '示例: readFile(path="docs/readme.md")'
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
      `\n[内容已截断] 文件共 ${rawContent.length} 字符,当前限制 ${max_length} 字符. ` +
      `\n如需读取更多内容,可重新调用 readFile(path="${filePath}", max_length=${max_length * 2})`
      : rawContent

    return createSuccessResult(
      {
        path: filePath,
        content,
        size: rawContent.length,
        truncated: isTruncated
      },
      `成功读取文件 (${rawContent.length} 字符${isTruncated ? ',已截断至 ' + max_length : ''})`,
      'readFile'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '读取文件失败',
      '请检查网络连接'
    )
  }
}
