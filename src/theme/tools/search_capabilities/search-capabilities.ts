/**
 * searchCapabilities 工具定义 + 执行器
 *
 * 让 Agent 通过关键词主动搜索自己拥有的工具和 Skills，
 * 解决"工具太多不知道用哪个"的问题。
 *
 * 【渐进式披露架构的核心入口工具】
 *
 * 当 Agent 不确定某个领域有哪些工具可用时，调用此工具进行搜索。
 * 搜索范围覆盖：
 * - 所有已注册的工具（通过 getToolDefinitions() 获取）
 * - 所有已加载的 Skills（通过 getGlobalSkills() 获取）
 *
 * 关键特性：
 * 1. 多维度匹配：名称、ID、描述、标签、使用场景同时参与评分
 * 2. 分数归一化：最高分 3.0，多关键词命中有加成
 * 3. 结果排序：按匹配分数降序排列
 * 4. 动态激活：返回的 activateTools 字段会将匹配工具加入下轮可用列表
 */

import type { ToolDefinition, ToolResult } from '../types'
import { createSuccessResult, createErrorResult } from '../types'
import { getToolDefinitions } from '../registry'
import { getGlobalSkills } from '@/theme/skills/skillLoader'

/* -------------------------------------------------------------------------- */
/*                                 工具定义                                    */
/* -------------------------------------------------------------------------- */

export const searchCapabilitiesDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'searchCapabilities',
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
          description: '返回结果数量上限，0 表示不限制（返回全部）',
          default: 0
        }
      },
      required: ['keyword']
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                 内部类型                                    */
/* -------------------------------------------------------------------------- */

/**
 * 匹配项数据结构
 *
 * 统一 Tools 和 Skills 的匹配结果格式，方便后续排序和展示。
 */
interface MatchItem {
  name: string
  id: string
  description: string
  category: string
  type: 'tool' | 'skill'
  score: number
  reason: string
}

/* -------------------------------------------------------------------------- */
/*                                内部辅助函数                                 */
/* -------------------------------------------------------------------------- */

/**
 * 计算关键词与目标的匹配分数
 *
 * 评分算法（加权求和，最高分 3.0）：
 * ┌─────────────────┬────────┬─────────────────────────────────────┐
 * │ 匹配维度        │ 权重   │ 说明                                │
 * ├─────────────────┼────────┼─────────────────────────────────────┤
 * │ 名称完全匹配    │ +1.0   │ 名称等于关键词或包含关键词          │
 * │ ID 包含关键词   │ +0.9   │ 工具/Skill 的 ID 包含关键词         │
 * │ 标签匹配        │ +0.7   │ tags 数组中有匹配项                 │
 * │ 描述包含        │ +0.6   │ description 包含关键词              │
 * │ 场景匹配        │ +0.5   │ usageScenarios 包含关键词           │
 * │ 模糊字符匹配    │ +0.2   │ 名称包含 ≥50% 的关键词字符          │
 * └─────────────────┴────────┴─────────────────────────────────────┘
 *
 * 多关键词加成：
 * - 多个关键词同时命中名称：额外 +0.3
 * - 多个关键词同时命中描述：额外 +0.2
 *
 * @param keyword - 用户输入的搜索关键词（支持空格分隔多关键词）
 * @param target  - 待匹配的目标对象（工具或 Skill）
 * @returns 包含 score（匹配分数）和 reason（匹配理由说明）的对象
 */
function calculateMatchScore(
  keyword: string,
  target: { name: string; description: string; id?: string; tags?: string[]; usageScenarios?: string[] }
): { score: number; reason: string } {
  const keywordLower = keyword.toLowerCase().trim()
  const keywords = keywordLower.split(/\s+/).filter((k) => k.length > 0)
  const nameLower = target.name.toLowerCase()
  const descLower = target.description.toLowerCase()
  const idLower = (target.id || '').toLowerCase()
  const tagsLower = (target.tags || []).map((t) => t.toLowerCase())
  const scenariosLower = (target.usageScenarios || []).map((s) => s.toLowerCase())

  let score = 0
  const reasons: string[] = []

  for (const kw of keywords) {
    // 1. 名称完全匹配（最高权重）
    if (nameLower === kw || nameLower.includes(kw)) {
      score += 1.0
      reasons.push(`名称匹配"${kw}"`)
      continue
    }

    // 2. ID 匹配
    if (idLower.includes(kw)) {
      score += 0.9
      reasons.push(`ID 包含"${kw}"`)
      continue
    }

    // 3. 描述匹配
    if (descLower.includes(kw)) {
      score += 0.6
      reasons.push(`描述包含"${kw}"`)
      continue
    }

    // 4. 标签匹配
    const matchedTags = tagsLower.filter((t) => t.includes(kw))
    if (matchedTags.length > 0) {
      score += 0.7
      reasons.push(`标签匹配: ${matchedTags.join(', ')}`)
      continue
    }

    // 5. 使用场景匹配
    const matchedScenarios = scenariosLower.filter((s) => s.includes(kw))
    if (matchedScenarios.length > 0) {
      score += 0.5
      reasons.push(`场景匹配: ${matchedScenarios[0]}`)
      continue
    }

    // 6. 模糊匹配（字符包含）- 针对中文场景优化
    const kwChars = kw.split('')
    const nameMatchCount = kwChars.filter((c) => nameLower.includes(c)).length
    if (nameMatchCount >= kw.length * 0.5) {
      score += 0.2
      reasons.push(`名称部分匹配"${kw}"`)
    } else {
      // 中文场景：描述字符匹配（解决"创建仓库"在"创建新的仓库"中不匹配的问题）
      const hasChinese = /[\u4e00-\u9fff]/.test(kw)
      if (hasChinese) {
        const descMatchCount = kwChars.filter((c) => descLower.includes(c)).length
        if (descMatchCount >= kw.length * 0.5) {
          const ratio = descMatchCount / kw.length
          score += 0.2 + ratio * 0.3 // 0.2~0.5，匹配比例越高分数越高
          reasons.push(`描述字符匹配"${kw}"(${Math.round(ratio * 100)}%)`)
        }
      }
    }
  }

  // 多个关键词同时命中的加成
  if (keywords.length > 1) {
    const nameHitCount = keywords.filter((kw) => nameLower.includes(kw)).length
    const descHitCount = keywords.filter((kw) => descLower.includes(kw)).length
    if (nameHitCount > 1) score += 0.3
    if (descHitCount > 1) score += 0.2
  }

  return {
    score: Math.min(score, 3.0),
    reason: reasons.length > 0 ? reasons.join('；') : '无直接匹配'
  }
}

/**
 * 获取工具分类
 */
function getToolCategory(name: string): string {
  if (name.includes('article')) return '文章管理'
  if (name.includes('file')) return '文件管理'
  if (name.includes('web') || name.includes('fetch') || name.includes('url')) return '网络工具'
  // github 必须在 code 之前判断，否则 github* 会被误判为代码工具
  if (name.includes('github')) return '🐙 GitHub'
  if (name.includes('code') || name.includes('execute') || name.includes('analyze')) return '代码工具'
  if (name.includes('text') || name.includes('summarize') || name.includes('format') || name.includes('translate'))
    return '文本处理'
  if (name.includes('note')) return '笔记工具'
  if (name.includes('knowledge') || name.includes('kb_')) return '知识库'
  if (name.includes('time') || name.includes('weather') || name.includes('calculate')) return '系统工具'
  if (name.includes('arxiv') || name.includes('openreview')) return '学术平台'
  if (name.includes('huggingface')) return 'AI模型平台'
  if (name.includes('feishu')) return '飞书集成'
  if (name.includes('yuque')) return '语雀集成'
  if (name.includes('skill') || name.includes('loadSkill') || name.includes('capabilities')) return 'Skill系统'
  if (name.includes('all_')) return '元信息'
  return '其他'
}

/**
 * 搜索工具
 */
function searchTools(keyword: string): MatchItem[] {
  const defs = getToolDefinitions()
  const results: MatchItem[] = []

  for (const def of defs) {
    const name = def.function.name
    const description = def.function.description
    const { score, reason } = calculateMatchScore(keyword, { name, description })

    if (score > 0.1) {
      results.push({
        name,
        id: name,
        description,
        category: getToolCategory(name),
        type: 'tool',
        score,
        reason
      })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

/**
 * 搜索已加载的 Skills
 *
 * 遍历所有已加载且启用的 Skills，使用 calculateMatchScore 计算每个 Skill
 * 与关键词的匹配分数，返回排序后的匹配结果。
 *
 * 过滤条件：只返回 score > 0.1 的 Skill（避免完全无关的结果干扰）。
 *
 * @param keyword - 搜索关键词
 * @returns 按匹配分数降序排列的 Skill 匹配项数组
 */
function searchSkills(keyword: string): MatchItem[] {
  const skills = getGlobalSkills()
  const results: MatchItem[] = []

  for (const skill of skills) {
    // 跳过已禁用的 Skill，避免返回不可用项
    if (!skill.enabled) continue

    const { score, reason } = calculateMatchScore(keyword, {
      name: skill.name,
      description: skill.description,
      id: skill.id,
      tags: skill.tags || [],
      usageScenarios: skill.usageScenarios || []
    })

    // 只有分数超过阈值的 Skill 才加入结果（过滤噪声）
    if (score > 0.1) {
      results.push({
        name: skill.name,
        id: skill.id,
        description: skill.description,
        category: skill.category || 'custom',
        type: 'skill',
        score,
        reason
      })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

/* -------------------------------------------------------------------------- */
/*                                 主执行器                                    */
/* -------------------------------------------------------------------------- */

/**
 * searchCapabilities 主执行器
 *
 * 执行流程：
 * 1. 参数校验：keyword 必须是非空字符串
 * 2. 根据 type 参数决定搜索范围：
 *    - 'all'（默认）：同时搜索 Tools 和 Skills
 *    - 'tools'：仅搜索 Tools
 *    - 'skills'：仅搜索 Skills
 * 3. 合并结果后按匹配分数全局排序
 * 4. 截断到 limit 数量（默认 10，防止结果过多）
 * 5. 构建格式化文本（Markdown 格式，便于 Agent 阅读）
 * 6. 提取匹配工具名称到 activateTools，触发渐进式披露
 *
 * 返回结构：
 * - message: 人类可读的 Markdown 格式搜索结果
 * - data: 结构化数据（keyword、count、tools[]、skills[]、results[]）
 * - activateTools: 匹配的工具名称数组（用于动态暴露 schema）
 *
 * @param args.keyword - 搜索关键词，支持空格分隔多词
 * @param args.type    - 搜索类型：'all' | 'tools' | 'skills'，默认 'all'
 * @param args.limit   - 返回结果数量上限，默认 10
 * @returns ToolResult，包含搜索结果和 activateTools
 */
export async function executeSearchCapabilities(args: Record<string, any>): Promise<ToolResult> {
  const { keyword, type = 'all', limit = 0 } = args

  // 参数校验：keyword 为必填项
  if (!keyword || typeof keyword !== 'string') {
    return createErrorResult('MISSING_KEYWORD', '请提供搜索关键词')
  }

  try {
    const allResults: MatchItem[] = []

    // 根据 type 参数搜索 Tools（当 type 为 'all' 或 'tools' 时）
    if (type === 'all' || type === 'tools') {
      allResults.push(...searchTools(keyword))
    }

    // 根据 type 参数搜索 Skills（当 type 为 'all' 或 'skills' 时）
    if (type === 'all' || type === 'skills') {
      allResults.push(...searchSkills(keyword))
    }

    // 全局排序：Tools 和 Skills 混合按分数降序排列
    // limit > 0 时截断，limit = 0 返回全部
    let sorted = allResults.sort((a, b) => b.score - a.score)
    if (limit > 0) {
      sorted = sorted.slice(0, limit)
    }

    // 无结果时返回友好提示
    if (sorted.length === 0) {
      return createSuccessResult(
        { results: [], count: 0 },
        `未找到与 "${keyword}" 相关的工具或 Skills`,
        'searchCapabilities'
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 构建返回文本（Markdown 格式，便于 Agent 阅读和理解）
    // ─────────────────────────────────────────────────────────────
    const lines: string[] = [`🔍 搜索 "${keyword}" 的结果（${sorted.length} 项）：\n`]

    // 按类型分组展示：先工具，后 Skills
    const tools = sorted.filter((r) => r.type === 'tool')
    const skills = sorted.filter((r) => r.type === 'skill')

    if (tools.length > 0) {
      lines.push(`\n## 工具 (${tools.length})`)
      tools.forEach((r, i) => {
        lines.push(`${i + 1}. **${r.name}** [${r.category}] — ${r.description}`)
        lines.push(`   匹配理由: ${r.reason}`)
      })
    }

    if (skills.length > 0) {
      lines.push(`\n## Skills (${skills.length})`)
      skills.forEach((r, i) => {
        lines.push(`${i + 1}. **${r.name}** \`${r.id}\` [${r.category}] — ${r.description}`)
        lines.push(`   匹配理由: ${r.reason}`)
        // 提示 Agent 可以调用 loadSkill 加载该 Skill
        lines.push(`   💡 需要时调用: loadSkill(skill_id="${r.id}")`)
      })
    }

    // ─────────────────────────────────────────────────────────────
    // 【渐进式披露】提取匹配工具名称，触发 schema 动态激活
    // ─────────────────────────────────────────────────────────────
    // searchCapabilities 的核心价值：不仅返回搜索结果文本，
    // 还通过 activateTools 告诉系统将匹配工具的 schema 暴露给模型。
    // 这样 Agent 在下一轮就可以调用这些工具，而不需要再次搜索。
    const activateTools = tools.map((r) => r.name)

    return {
      success: true,
      data: {
        keyword,
        count: sorted.length,
        tools: tools.map((r) => ({ name: r.name, category: r.category, score: r.score })),
        skills: skills.map((r) => ({ id: r.id, name: r.name, category: r.category, score: r.score })),
        results: sorted
      },
      message: lines.join('\n'),
      action: 'searchCapabilities',
      activateTools
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return createErrorResult('SEARCH_FAILED', `搜索失败: ${msg}`)
  }
}
