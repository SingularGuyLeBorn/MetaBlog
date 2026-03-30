/**
 * 知识库工具执行器
 * 包含：知识库 CRUD、文档管理等功能
 * 
 * ⚠️ 注意：当前使用内存存储，重启后数据丢失！
 * 建议：接入后端数据库实现持久化
 */

import type { ToolExecutor, ToolResult } from '../types'
import { createSuccessResult, createErrorResult } from '../types'

// 简单的内存知识库（注意：重启后数据丢失）
const knowledgeBases = new Map<string, { documents: Map<string, string> }>()

/**
 * 列出所有知识库
 */
export const kbList: ToolExecutor = async (): Promise<ToolResult> => {
  const kbs = Array.from(knowledgeBases.entries()).map(([id, data]) => ({
    id,
    documentCount: data.documents.size
  }))
  
  return createSuccessResult(
    kbs,
    `共有 ${kbs.length} 个知识库`,
    'kb_list'
  )
}

/**
 * 创建知识库
 */
export const kbCreate: ToolExecutor = async (args): Promise<ToolResult> => {
  const { id, name } = args
  
  if (!id) {
    return createErrorResult(
      'Missing id parameter',
      '请提供知识库 ID',
      '示例: kb_create(id="my-kb", name="我的知识库")'
    )
  }
  
  if (knowledgeBases.has(id)) {
    return createErrorResult(
      'Knowledge base already exists',
      `知识库 "${id}" 已存在`,
      '请使用其他 ID'
    )
  }
  
  knowledgeBases.set(id, { documents: new Map() })
  
  return createSuccessResult(
    { id, name: name || id },
    `知识库 "${id}" 创建成功`,
    'kb_create'
  )
}

/**
 * 删除知识库
 */
export const kbDelete: ToolExecutor = async (args): Promise<ToolResult> => {
  const { id } = args
  
  if (!id) {
    return createErrorResult(
      'Missing id parameter',
      '请提供知识库 ID',
      '示例: kb_delete(id="my-kb")'
    )
  }
  
  if (!knowledgeBases.has(id)) {
    return createErrorResult(
      'Knowledge base not found',
      `知识库 "${id}" 不存在`,
      '请检查 ID 是否正确'
    )
  }
  
  knowledgeBases.delete(id)
  
  return createSuccessResult(
    { id },
    `知识库 "${id}" 已删除`,
    'kb_delete'
  )
}

/**
 * 查询知识库
 */
export const kbQuery: ToolExecutor = async (args): Promise<ToolResult> => {
  const { id, query } = args
  
  if (!id || !query) {
    return createErrorResult(
      'Missing required parameters',
      '请提供知识库 ID 和查询内容',
      '示例: kb_query(id="my-kb", query="关键词")'
    )
  }
  
  const kb = knowledgeBases.get(id)
  if (!kb) {
    return createErrorResult(
      'Knowledge base not found',
      `知识库 "${id}" 不存在`,
      '请先创建知识库'
    )
  }
  
  // 简单的关键词匹配
  const results: Array<{ docId: string; content: string }> = []
  kb.documents.forEach((content, docId) => {
    if (content.toLowerCase().includes(query.toLowerCase())) {
      results.push({ docId, content: content.substring(0, 200) + '...' })
    }
  })
  
  return createSuccessResult(
    results,
    `找到 ${results.length} 个相关文档`,
    'kb_query'
  )
}

/**
 * 列出知识库中的文档
 */
export const kbListDocuments: ToolExecutor = async (args): Promise<ToolResult> => {
  const { id } = args
  
  if (!id) {
    return createErrorResult(
      'Missing id parameter',
      '请提供知识库 ID',
      '示例: kb_list_documents(id="my-kb")'
    )
  }
  
  const kb = knowledgeBases.get(id)
  if (!kb) {
    return createErrorResult(
      'Knowledge base not found',
      `知识库 "${id}" 不存在`,
      '请检查 ID 是否正确'
    )
  }
  
  const docs = Array.from(kb.documents.keys())
  
  return createSuccessResult(
    docs,
    `知识库 "${id}" 共有 ${docs.length} 个文档`,
    'kb_list_documents'
  )
}

/**
 * 添加文档到知识库
 */
export const kbDocumentAdd: ToolExecutor = async (args): Promise<ToolResult> => {
  const { id, doc_id, content } = args
  
  if (!id || !doc_id || !content) {
    return createErrorResult(
      'Missing required parameters',
      '请提供知识库 ID、文档 ID 和内容',
      '示例: kb_document_add(id="my-kb", doc_id="doc1", content="内容")'
    )
  }
  
  const kb = knowledgeBases.get(id)
  if (!kb) {
    return createErrorResult(
      'Knowledge base not found',
      `知识库 "${id}" 不存在`,
      '请先创建知识库'
    )
  }
  
  kb.documents.set(doc_id, content)
  
  return createSuccessResult(
    { id, doc_id },
    `文档 "${doc_id}" 已添加到知识库 "${id}"`,
    'kb_document_add'
  )
}

/**
 * 从知识库删除文档
 */
export const kbDocumentDelete: ToolExecutor = async (args): Promise<ToolResult> => {
  const { id, doc_id } = args
  
  if (!id || !doc_id) {
    return createErrorResult(
      'Missing required parameters',
      '请提供知识库 ID 和文档 ID',
      '示例: kb_document_delete(id="my-kb", doc_id="doc1")'
    )
  }
  
  const kb = knowledgeBases.get(id)
  if (!kb) {
    return createErrorResult(
      'Knowledge base not found',
      `知识库 "${id}" 不存在`,
      '请检查 ID 是否正确'
    )
  }
  
  kb.documents.delete(doc_id)
  
  return createSuccessResult(
    { id, doc_id },
    `文档 "${doc_id}" 已从知识库 "${id}" 删除`,
    'kb_document_delete'
  )
}
