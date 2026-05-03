/**
 * ============================================================================
 * huggingface 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/academic
 */


/**
 * ============================================================================
 * HuggingFace 模型搜索与详情获取工具
 * ============================================================================
 *
 * 提供 HuggingFace Hub 上预训练模型的搜索和详情查询功能. 
 * 使用 HuggingFace 公开 API,无需认证. 
 *
 * @module src/theme/tools/academic/huggingface
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { proxyFetch } from './other'

// ==================== 工具定义 ====================

/**
 * 搜索 HuggingFace 模型的工具定义
 */
export const searchHuggingFaceDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchHuggingface',
    description: '搜索 HuggingFace 模型库,查找预训练模型. \n\n使用场景：当用户需要查找特定任务的预训练模型、对比同类模型、或获取模型的下载量和社区评分时使用. 例如用户问「推荐一个中文情感分析模型」「有哪些轻量级的文本生成模型」「bert 相关的最新模型」. \n\n示例用法：searchHuggingface(query="bert", task="text-classification", limit=5)\n\n注意事项：\n- query 必须提供,支持模型名称、作者名或关键词模糊匹配\n- task 可选,常见值如 text-classification、text-generation、question-answering、image-classification 等\n- 返回结果包含模型下载量、点赞数、任务标签,可作为选型参考\n- 如需查看某个模型的完整详情,使用 fetchHuggingfaceModel(model_id="模型ID")',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词,支持模型名、作者或相关术语. 示例："bert"、"llama"、"gpt"、"facebook"' },
        task: { type: 'string', description: '按任务类型过滤,可选. 常见值：text-classification、text-generation、question-answering、image-classification、object-detection、token-classification. 默认不过滤. ', default: '' },
        limit: { type: 'number', description: '返回结果的最大数量,范围 1~50. 默认值：10. ', default: 10 }
      },
      required: ['query']
    }
  }
}

/**
 * 获取 HuggingFace 模型详情的工具定义
 */
export const fetchHuggingFaceModelDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetchHuggingfaceModel',
    description: '获取 HuggingFace 上指定模型的完整详情. \n\n使用场景：当用户需要深入了解某个具体模型的信息时使用,如查看模型描述、作者、标签、创建时间、最后修改时间等. 通常在使用 searchHuggingface 找到目标模型 ID 后调用. \n\n示例用法：fetchHuggingfaceModel(model_id="bert-base-chinese")\n\n注意事项：\n- model_id 必须是完整的模型 ID,格式为 "作者/模型名" 或 "模型名"(如 "bert-base-chinese" 无作者前缀时)\n- 不要传入模糊关键词,必须是确切的模型 ID\n- 如果模型不存在,会返回 404 错误',
    parameters: {
      type: 'object',
      properties: {
        model_id: { type: 'string', description: '模型完整 ID,格式为 "作者/模型名" 或单独的模型名. 示例："bert-base-chinese"、"microsoft/DialoGPT-medium"、"hfl/chinese-roberta-wwm-ext"' }
      },
      required: ['model_id']
    }
  }
}

// ==================== 执行器 ====================

/**
 * 搜索 HuggingFace 模型
 *
 * 通过 HuggingFace API 搜索预训练模型,支持按任务类型过滤. 
 * 返回结果包含下载量、点赞数等选型参考指标. 
 *
 * @param args - 工具参数
 * @param args.query - 搜索关键词
 * @param args.task - 任务类型过滤(可选)
 * @param args.limit - 返回数量上限(默认 10)
 * @returns 搜索结果或错误信息
 */
export const searchHuggingFace: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, task = '', limit = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: searchHuggingface(query="bert")'
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
        'searchHuggingface',
        '尝试使用不同的关键词'
      )
    }

    const formattedModels = models.slice(0, limit).map((m: any) => ({
      id: m.id,
      downloads: m.downloads || 0,
      likes: m.likes || 0,
      pipeline_tag: m.pipeline_tag || 'unknown',
      tags: m.tags?.slice(0, 5) || [],
      created_at: m.createdAt || '',
      url: `https://huggingface.co/${m.id}`
    }))

    // 格式化输出(给 AI 看)
    let formatted = `🔍 HuggingFace 模型搜索: "${query}" (${models.length}个)\n\n`
    formattedModels.forEach((m: any, i: number) => {
      formatted += `${i + 1}. **${m.id}**\n`
      formatted += `   🏷️ ${m.pipeline_tag} · ⬇️ ${m.downloads.toLocaleString()} · ❤️ ${m.likes}\n`
      if (m.tags.length) formatted += `   #${m.tags.join(' #')}\n`
      formatted += `   🔗 ${m.url}\n\n`
    })

    return createSuccessResult(
      formattedModels,
      formatted,
      'searchHuggingface',
      '使用 fetchHuggingfaceModel(model_id="xxx") 获取模型详情'
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

/**
 * 获取 HuggingFace 模型详情
 *
 * 通过 HuggingFace API 获取指定模型的完整元数据,
 * 包括描述、作者、标签、下载量等信息. 
 *
 * @param args - 工具参数
 * @param args.model_id - 模型完整 ID
 * @returns 模型详情或错误信息
 */
export const fetchHuggingFaceModel: ToolExecutor = async (args): Promise<ToolResult> => {
  const { model_id } = args

  if (!model_id) {
    return createErrorResult(
      'Missing model_id parameter',
      '请提供模型 ID',
      '示例: fetchHuggingfaceModel(model_id="bert-base-chinese")'
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
      downloads: m.downloads || 0,
      likes: m.likes || 0,
      pipeline_tag: m.pipeline_tag || 'unknown',
      url: `https://huggingface.co/${m.id}`,
      description: m.cardData?.description || '',
      tags: m.tags?.slice(0, 10) || [],
      created_at: m.createdAt || '',
      last_modified: m.lastModified || ''
    }

    const formatted = `🤖 **${m.id}**

👤 **作者**: ${modelData.author}
🏷️ **任务**: ${modelData.pipeline_tag}
⬇️ **下载**: ${modelData.downloads.toLocaleString()} · ❤️ **点赞**: ${modelData.likes}
🔗 **链接**: ${modelData.url}
${modelData.tags.length ? '\n🏷️ **标签**: ' + modelData.tags.join(', ') : ''}

📝 **简介**:
${modelData.description || '(暂无描述)'}`

    return createSuccessResult(
      modelData,
      formatted,
      'fetchHuggingfaceModel'
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
