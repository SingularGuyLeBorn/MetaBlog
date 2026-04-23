/**
 * search_capabilities 工具定义
 *
 * 让 Agent 通过关键词主动搜索自己拥有的工具和 Skills，
 * 解决"工具太多不知道用哪个"的问题。
 */

import type { ToolDefinition } from '../types'

export const searchCapabilitiesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_capabilities',
    description: `通过关键词搜索系统中可用的工具和 Skills，找到最适合当前任务的能力。

使用场景：
1. 用户提出需求后，你不确定有哪些工具可以帮上忙
2. 想确认某个领域（如 GitHub、飞书、学术）有哪些可用能力
3. 工具调用失败后，想找替代方案
4. 用户问"你能做什么"时，提供精准回答

示例：
- 搜索 GitHub 相关：keyword="github"
- 搜索文档处理：keyword="文档"
- 搜索代码分析：keyword="code analyze"
- 搜索平台解析：keyword="知乎 小红书"`,
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: '搜索关键词，支持中英文、空格分隔多个词'
        },
        type: {
          type: 'string',
          enum: ['all', 'tools', 'skills'],
          description: '搜索范围：all（工具和Skills）、tools（仅工具）、skills（仅Skills）',
          default: 'all'
        },
        limit: {
          type: 'number',
          description: '返回结果数量，默认 10',
          default: 10
        }
      },
      required: ['keyword']
    }
  }
}
