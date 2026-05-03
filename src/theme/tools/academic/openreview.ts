/**
 * ============================================================================
 * openreview 模块
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/tools/academic
 */


/**
 * ============================================================================
 * OpenReview 顶会论文搜索与获取工具
 * ============================================================================
 *
 * 提供 OpenReview 学术平台上顶会论文的搜索和详情获取功能. 
 * 覆盖 ICLR、NeurIPS、ICML 等顶级会议,使用公开 API. 
 *
 * @module src/theme/tools/academic/openreview
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'
import { proxyFetch } from './other'

// ==================== 工具定义 ====================

/**
 * 搜索 OpenReview 论文的工具定义
 */
export const searchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchOpenreview',
    description: '搜索 OpenReview 学术平台上的会议论文. \n\n使用场景：当用户需要查找顶会论文(如 ICLR、NeurIPS、ICML 等)时使用. 适合查找经过同行评审的高质量学术论文,尤其是机器学习和深度学习领域. 例如用户问「NeurIPS 上关于强化学习的最新论文」「ICLR 2024 有没有关于 Transformer 改进的工作」. \n\n示例用法：searchOpenreview(query="reinforcement learning", venue="NeurIPS", limit=10)\n\n注意事项：\n- venue 可选,常见值如 ICLR、NeurIPS、ICML、AAAI、ACL 等\n- 如果不指定 venue,会跨所有会议搜索\n- 返回结果仅包含标题、作者、会议和 Forum ID,如需摘要等详情需再调用 fetchOpenreview(forum_id="xxx")\n- 搜索词用英文效果通常更好',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词. 建议使用英文术语以获得更准确的结果. 示例："reinforcement learning"、"transformer architecture"、"graph neural networks"' },
        venue: { type: 'string', description: '会议名称过滤,可选. 常见值：ICLR、NeurIPS、ICML、AAAI、ACL、CVPR. 默认不过滤,跨所有会议搜索. ', default: '' },
        limit: { type: 'number', description: '返回结果的最大数量,范围 1~50. 默认值：10. ', default: 10 }
      },
      required: ['query']
    }
  }
}

/**
 * 获取 OpenReview 论文详情的工具定义
 */
export const fetchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetchOpenreview',
    description: '获取 OpenReview 上指定论文的完整详情. \n\n使用场景：当用户需要查看某篇论文的摘要、作者列表、完整元数据时使用. 通常在 searchOpenreview 获得 Forum ID 后调用. 例如用户问「这篇论文讲了什么」「给我这篇论文的摘要」. \n\n示例用法：fetchOpenreview(forum_id="H1gaxp4Fwr")\n\n注意事项：\n- forum_id 是 OpenReview 为每篇论文分配的唯一标识符,不是论文标题\n- forum_id 必须通过 searchOpenreview 获取,不能猜测或编造\n- 如果 Forum ID 无效,会返回 "未找到论文" 错误',
    parameters: {
      type: 'object',
      properties: {
        forum_id: { type: 'string', description: 'OpenReview 论文的唯一 Forum ID. 示例："H1gaxp4Fwr". 必须通过 searchOpenreview 搜索结果获取,不可编造. ' }
      },
      required: ['forum_id']
    }
  }
}

// ==================== 执行器 ====================

/**
 * 搜索 OpenReview 论文
 *
 * 通过 OpenReview API 搜索顶会论文,支持按会议名称过滤. 
 * 返回结果包含 Forum ID,可用于后续获取论文详情. 
 *
 * @param args - 工具参数
 * @param args.query - 搜索关键词
 * @param args.venue - 会议名称过滤(可选)
 * @param args.limit - 返回数量上限(默认 10)
 * @returns 搜索结果或错误信息
 */
export const searchOpenReview: ToolExecutor = async (args): Promise<ToolResult> => {
  const { query, venue = '', limit = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: searchOpenreview(query="reinforcement learning")'
    )
  }

  try {
    const url = `https://api.openreview.net/notes/search?term=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`

    const response = await proxyFetch(url)

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        'OpenReview 搜索失败',
        '请稍后重试'
      )
    }

    const data = await response.json()
    let notes = data.notes || []

    // 如果指定了 venue,在客户端过滤(OpenReview API 不支持 venue 参数过滤)
    if (venue) {
      notes = notes.filter((n: any) =>
        (n.content?.venue?.value || '').toLowerCase().includes(venue.toLowerCase())
      )
    }

    if (!notes.length) {
      return createSuccessResult(
        [],
        `未找到与 "${query}" 相关的 OpenReview 论文`,
        'searchOpenreview',
        '尝试使用不同的关键词或移除会议过滤'
      )
    }

    const papers = notes.slice(0, limit).map((n: any) => ({
      title: n.content?.title?.value || n.content?.title || 'Untitled',
      authors: n.content?.authors?.value || n.content?.authors || [],
      venue: n.content?.venue?.value || 'Unknown',
      forum: n.forum || n.id
    }))

    return createSuccessResult(
      papers,
      `找到 ${notes.length} 篇论文`,
      'searchOpenreview',
      '使用 fetchOpenreview(forum_id="xxx") 获取详情'
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
 * 获取 OpenReview 论文详情
 *
 * 通过 Forum ID 获取论文的完整元数据,包括摘要、作者、会议等信息. 
 *
 * @param args - 工具参数
 * @param args.forum_id - OpenReview 论文的 Forum ID
 * @returns 论文详情或错误信息
 */
export const fetchOpenReview: ToolExecutor = async (args): Promise<ToolResult> => {
  const { forum_id } = args

  if (!forum_id) {
    return createErrorResult(
      'Missing forum_id parameter',
      '请提供 Forum ID',
      '示例: fetchOpenreview(forum_id="xxxxxxxx")'
    )
  }

  try {
    const url = `https://api.openreview.net/notes?id=${forum_id}`

    const response = await proxyFetch(url)

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '获取论文详情失败',
        '请稍后重试'
      )
    }

    const data = await response.json()
    const note = data.notes?.[0]

    if (!note) {
      return createErrorResult(
        'Paper not found',
        `未找到论文: ${forum_id}`,
        '请检查 Forum ID 是否正确'
      )
    }

    const paperData = {
      title: note.content?.title?.value || note.content?.title || 'Untitled',
      authors: note.content?.authors?.value || note.content?.authors || [],
      abstract: note.content?.abstract?.value || note.content?.abstract || '',
      venue: note.content?.venue?.value || 'Unknown',
      forum: note.forum || note.id,
      url: `https://openreview.net/forum?id=${note.forum || note.id}`
    }

    return createSuccessResult(
      paperData,
      `成功获取论文: ${paperData.title}`,
      'fetchOpenreview'
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
      '获取论文详情失败',
      '请检查网络连接'
    )
  }
}
