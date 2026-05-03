/**
 * ============================================================================
 * 文件写入工具
 * ============================================================================
 *
 * 将内容写入博客项目中的指定文件,支持创建新文件或完全覆盖已有文件. 
 *
 * @module src/theme/tools/file/write
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/** 后端 API 基础路径 */
const API_BASE = '/api'

/**
 * 写入文件的工具定义
 */
export const writeFileDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'writeFile',
    description: '将内容写入指定文件,创建新文件或完全覆盖已有文件. \n\n使用场景：当用户需要「创建一个新文件」「保存我生成的代码到文件」「更新配置文件」「写入一篇新文章」时调用. 支持写入任意文本内容(Markdown、代码、JSON、配置等). \n\n示例用法：writeFile(path="docs/guide/new-topic.md", content="# 新主题\n\n这是内容...")\n\n注意事项：\n- 路径格式为相对路径,如 "docs/file.md"、"src/utils.ts",禁止使用绝对路径或路径穿越(如 ../../etc/passwd)\n- 如果目标文件已存在,内容会被完全覆盖,无法撤销,操作前请确认\n- 如果目标目录不存在,系统会自动创建中间目录\n- 只能写入项目目录内的文件,无法修改系统文件\n- 写入后建议用 readFile 验证内容是否正确\n- 不要写入敏感信息(如密码、API Key)到会被提交的版本控制文件中',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '文件的相对路径,相对于项目根目录. 示例："docs/guide/getting-started.md"、"src/utils/helper.ts"、"data/config.json". 禁止使用绝对路径或包含 ".." 的路径穿越. '
        },
        content: {
          type: 'string',
          description: '要写入的完整文件内容字符串. 可以是 Markdown、代码、JSON、YAML 等任意纯文本格式. 写入时会完全覆盖原文件内容. '
        }
      },
      required: ['path', 'content']
    }
  }
}

/**
 * 写入文件
 *
 * 通过后端 API 将内容写入指定文件. 如果目标目录不存在会自动创建. 
 * 写入操作会完全覆盖原文件,无法撤销. 
 *
 * @param args - 工具参数
 * @param args.path - 文件相对路径
 * @param args.content - 文件内容
 * @returns 写入结果或错误信息
 */
export const writeFile: ToolExecutor = async (args): Promise<ToolResult> => {
  const { path: filePath, content } = args

  if (!filePath) {
    return createErrorResult(
      'Missing path parameter',
      '请提供文件路径',
      '示例: writeFile(path="docs/file.md", content="内容")'
    )
  }

  if (content === undefined) {
    return createErrorResult(
      'Missing content parameter',
      '请提供文件内容',
      '示例: writeFile(path="file.md", content="内容")'
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
      'writeFile'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '写入文件失败',
      '请检查网络连接'
    )
  }
}
