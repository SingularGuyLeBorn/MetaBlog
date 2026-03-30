/**
 * 知识库工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const kbListDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'kb_list',
    description: '列出所有知识库。',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
}

export const kbCreateDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'kb_create',
    description: '创建新知识库。',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '知识库唯一标识'
        },
        name: {
          type: 'string',
          description: '知识库名称（可选，默认使用 id）'
        }
      },
      required: ['id']
    }
  }
}

export const kbDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'kb_delete',
    description: '删除知识库。',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '知识库 ID'
        }
      },
      required: ['id']
    }
  }
}

export const kbQueryDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'kb_query',
    description: '在知识库中搜索文档。',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '知识库 ID'
        },
        query: {
          type: 'string',
          description: '搜索关键词'
        }
      },
      required: ['id', 'query']
    }
  }
}

export const kbListDocumentsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'kb_list_documents',
    description: '列出知识库中的所有文档。',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '知识库 ID'
        }
      },
      required: ['id']
    }
  }
}

export const kbDocumentAddDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'kb_document_add',
    description: '向知识库添加文档。',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '知识库 ID'
        },
        doc_id: {
          type: 'string',
          description: '文档 ID'
        },
        content: {
          type: 'string',
          description: '文档内容'
        }
      },
      required: ['id', 'doc_id', 'content']
    }
  }
}

export const kbDocumentDeleteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'kb_document_delete',
    description: '从知识库删除文档。',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '知识库 ID'
        },
        doc_id: {
          type: 'string',
          description: '文档 ID'
        }
      },
      required: ['id', 'doc_id']
    }
  }
}
