/**
 * 文件工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

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
