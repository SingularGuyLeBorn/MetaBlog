/**
 * HuggingFace 学术工具
 */

import type { ToolDefinition } from '@/theme/tools/types'
import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'
import { proxyFetch } from './other'

// ==================== 工具定义 ====================

export const searchHuggingFaceDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_huggingface',
    description: '搜索 HuggingFace 模型库。支持模型名称、任务类型过滤',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，如 bert, llama, gpt' },
        task: { type: 'string', description: '任务类型过滤，如 text-classification', default: '' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const fetchHuggingFaceModelDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_huggingface_model',
    description: '获取 HuggingFace 模型详情',
    parameters: {
      type: 'object',
      properties: {
        model_id: { type: 'string', description: '模型ID，如 bert-base-chinese' }
      },
      required: ['model_id']
    }
  }
}

// ==================== 执行器 ====================

export const searchHuggingFace: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, task = '', limit = 10 } = args
  
  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: search_huggingface(query="bert")'
    )
  }
  
  try {
    let url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`
    if (task) url += `&filter=${task}`
    
    const response = await proxyFetch(url)
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'HuggingFace 搜索失败',
        '请稍后重试'
      )
    }
    
    const models = await response.json()
    
    if (!models?.length) {
      return createSuccessResult(
        [],
        `未找到与 "${query}" 相关的模型`,
        'search_huggingface',
        '尝试使用不同的关键词'
      )
    }
    
    const formattedModels = models.slice(0, limit).map((m: any) => ({
      id: m.id,
      downloads: m.downloads,
      likes: m.likes || 0,
      pipeline_tag: m.pipeline_tag,
      url: `https://huggingface.co/${m.id}`
    }))
    
    return createSuccessResult(
      formattedModels,
      `找到 ${models.length} 个相关模型`,
      'search_huggingface',
      '使用 fetch_huggingface_model(model_id="xxx") 获取模型详情'
    )
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return createErrorResult(
        'Request timeout',
        '请求超时',
        '请稍后重试'
      )
    }
    return createErrorResult(
      error.message,
      '搜索失败',
      '请检查网络连接'
    )
  }
}

export const fetchHuggingFaceModel: ToolExecutor = async (args): Promise<ToolResult> => {
  const { model_id } = args
  
  if (!model_id) {
    return createErrorResult(
      'Missing model_id parameter',
      '请提供模型 ID',
      '示例: fetch_huggingface_model(model_id="bert-base-chinese")'
    )
  }
  
  try {
    const url = `https://huggingface.co/api/models/${model_id}`
    
    const response = await proxyFetch(url)
    
    if (response.status === 404) {
      return createErrorResult(
        'Model not found',
        `未找到模型: ${model_id}`,
        '请检查模型 ID 是否正确'
      )
    }
    
    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取模型详情失败',
        '请稍后重试'
      )
    }
    
    const m = await response.json()
    
    const modelData = {
      id: m.id,
      author: m.author || 'Unknown',
      downloads: m.downloads,
      likes: m.likes || 0,
      pipeline_tag: m.pipeline_tag,
      url: `https://huggingface.co/${m.id}`,
      description: m.cardData?.description || ''
    }
    
    return createSuccessResult(
      modelData,
      `成功获取模型: ${m.id}`,
      'fetch_huggingface_model'
    )
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return createErrorResult(
        'Request timeout',
        '请求超时',
        '请稍后重试'
      )
    }
    return createErrorResult(
      error.message,
      '获取模型详情失败',
      '请检查网络连接'
    )
  }
}
