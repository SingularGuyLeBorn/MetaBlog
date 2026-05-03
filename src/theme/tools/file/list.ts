/**
 * ============================================================================
 * 文件列表工具
 * ============================================================================
 *
 * 列出博客项目中的文件和目录结构,用于在读取或写入文件前了解目录布局. 
 *
 * @module src/theme/tools/file/list
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/** 后端 API 基础路径 */
const API_BASE = '/api'

/**
 * 列出文件的工具定义
 */
export const listFilesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'listFiles',
    description: '列出博客项目中的文件和目录结构. \n\n使用场景：当用户需要「查看项目结构」「列出某个目录下的文件」「博客里有哪些文章/知识库」时调用. 适合在读取或写入文件前先了解目录布局. \n\n示例用法：listFiles(path="docs", recursive=true)\n\n注意事项：\n- 路径格式为相对路径,如 "docs/guide"、"src/theme",不要使用绝对路径(如 /home/user/xxx)\n- 不支持 glob 通配符(如 **/*),只能列出具体目录\n- recursive 为 true 时会递归列出所有子目录,可能产生大量输出,建议谨慎使用\n- 默认列出的是博客内容目录结构,不包含 node_modules 等系统目录\n- 返回结果可用于确定后续 readFile 或 writeFile 的目标路径',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '目录的相对路径,相对于项目根目录. 示例："docs"、"src/theme"、"sections/posts". 默认为空字符串(列出根目录下的内容). ',
          default: ''
        },
        recursive: {
          type: 'boolean',
          description: '是否递归列出所有子目录内容. 默认 false(仅列出直接子项). 设为 true 可能产生大量输出,大型目录慎用. ',
          default: false
        }
      },
      required: []
    }
  }
}

/**
 * 列出文件
 *
 * 获取博客项目的目录结构,目前通过 sidebar API 获取所有内容. 
 * 不支持 glob 模式,只能列出具体目录. 
 *
 * @param args - 工具参数
 * @param args.path - 目录相对路径(默认空字符串)
 * @param args.recursive - 是否递归列出(默认 false)
 * @returns 文件列表或错误信息
 */
export const listFiles: ToolExecutor = async (args): Promise<ToolResult> => {
  const { path: dirPath = '', recursive = false } = args

  // 基础参数验证：不支持 glob 通配符
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
        'listFiles',
        '使用 writeFile 创建新文件'
      )
    }

    return createSuccessResult(
      sections,
      `获取到文件列表`,
      'listFiles'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '获取文件列表失败',
      '请检查网络连接'
    )
  }
}
