/**
 * 笔记工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const createNoteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_note',
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

export const listNotesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_notes',
    description: '列出所有笔记。当用户需要查看笔记列表或查找特定笔记时使用。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

export const queryKnowledgeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'query_knowledge',
    description: '查询知识库中的信息。当用户询问项目知识、技术文档或概念解释时使用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '查询内容'
        }
      },
      required: ['query']
    }
  }
}
