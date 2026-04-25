/**
 * Skill Matcher - Skill 意图匹配器
 * 
 * 基于 Claude Code 的启发式匹配算法：
 * 1. 关键词匹配 (标签、工具名、场景描述)
 * 2. 语义相似度 (简单向量空间模型)
 * 3. 上下文连续性 (优先保持已激活的 Skill)
 * 
 * 设计原则：
 * - 简单可解释 (不需要神经网络)
 * - 快速响应 (O(n) 复杂度)
 * - 可调试 (输出匹配原因)
 */

import type { SkillMetadata, SkillMatchResult, SkillMatchOptions, ActiveSkill } from './types'

// ═══════════════════════════════════════════════════════════════
// 文本预处理
// ═══════════════════════════════════════════════════════════════

/**
 * 中文分词 (简单实现)
 * 
 * 策略:
 * 1. 保留 2-4 字词组
 * 2. 保留英文单词
 * 3. 过滤停用词
 */
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '这些', '那些', '这个', '那个', '之', '与', '及', '或', '但是', '如果', '因为', '所以', 'help', 'me', 'please', 'the', 'a', 'an', 'to', 'for', 'with'
])

function tokenize(text: string): string[] {
  const tokens: string[] = []
  const normalized = text.toLowerCase()
  
  // 提取英文单词
  const englishWords = normalized.match(/[a-z]+/g) || []
  tokens.push(...englishWords)
  
  // 提取中文字符和数字
  const chars = normalized.replace(/[^\u4e00-\u9fa5a-z0-9]/g, '').split('')
  
  // 生成 2-4 字词组
  for (let i = 0; i < chars.length; i++) {
    for (let len = 2; len <= 4 && i + len <= chars.length; len++) {
      const word = chars.slice(i, i + len).join('')
      if (!STOP_WORDS.has(word)) {
        tokens.push(word)
      }
    }
  }
  
  return [...new Set(tokens)]
}

/**
 * 计算文本相似度 (Jaccard 系数)
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return union.size === 0 ? 0 : intersection.size / union.size
}

// ═══════════════════════════════════════════════════════════════
// 匹配规则
// ═══════════════════════════════════════════════════════════════

interface MatchRule {
  name: string
  weight: number
  match: (input: string, tokens: Set<string>, skill: SkillMetadata) => { score: number; keywords: string[] }
}

const MATCH_RULES: MatchRule[] = [
  // 规则 1: 使用场景匹配 (最高权重)
  {
    name: 'scenario',
    weight: 1.0,
    match: (input, tokens, skill) => {
      let score = 0
      const keywords: string[] = []
      
      for (const scenario of skill.usageScenarios) {
        const scenarioTokens = new Set(tokenize(scenario))
        const similarity = jaccardSimilarity(tokens, scenarioTokens)
        if (similarity > 0.1) {
          score = Math.max(score, similarity)
          keywords.push(scenario)
        }
      }
      
      return { score, keywords }
    }
  },
  
  // 规则 2: 标签匹配
  {
    name: 'tag',
    weight: 0.8,
    match: (input, tokens, skill) => {
      const keywords: string[] = []
      
      for (const tag of skill.tags) {
        const tagTokens = tokenize(tag)
        for (const token of tagTokens) {
          if (tokens.has(token)) {
            keywords.push(tag)
            break
          }
        }
      }
      
      // 计算覆盖比例
      const tagCoverage = skill.tags.length > 0 
        ? keywords.length / Math.min(skill.tags.length, 3) 
        : 0
      
      return { score: Math.min(tagCoverage, 1), keywords }
    }
  },
  
  // 规则 3: 工具名匹配
  {
    name: 'tool',
    weight: 0.7,
    match: (input, tokens, skill) => {
      const keywords: string[] = []
      
      for (const tool of skill.tools) {
        // 工具名直接出现在输入中
        if (input.includes(tool)) {
          keywords.push(tool)
          continue
        }
        
        // 工具名的词匹配
        const toolTokens = tokenize(tool.replace(/_/g, ' '))
        for (const token of toolTokens) {
          if (tokens.has(token)) {
            keywords.push(tool)
            break
          }
        }
      }
      
      return { 
        score: keywords.length > 0 ? 0.5 + (keywords.length * 0.1) : 0,
        keywords 
      }
    }
  },
  
  // 规则 4: 名称匹配
  {
    name: 'name',
    weight: 0.6,
    match: (input, tokens, skill) => {
      const nameTokens = tokenize(skill.name)
      const nameSet = new Set(nameTokens)
      const similarity = jaccardSimilarity(tokens, nameSet)
      
      // ID 匹配 (如 article-manager 匹配 article)
      const idParts = skill.id.split(/[-_]/)
      for (const part of idParts) {
        if (tokens.has(part) || input.includes(part)) {
          return { score: 0.8, keywords: [skill.id] }
        }
      }
      
      return { 
        score: similarity > 0.3 ? similarity : 0,
        keywords: similarity > 0.3 ? [skill.name] : []
      }
    }
  },
  
  // 规则 5: 描述匹配
  {
    name: 'description',
    weight: 0.4,
    match: (input, tokens, skill) => {
      const descTokens = new Set(tokenize(skill.description))
      const similarity = jaccardSimilarity(tokens, descTokens)
      
      return { 
        score: similarity > 0.2 ? similarity * 0.4 : 0,
        keywords: similarity > 0.2 ? [skill.description] : []
      }
    }
  }
]

// ═══════════════════════════════════════════════════════════════
// 核心匹配函数
// ═══════════════════════════════════════════════════════════════

/**
 * 计算单个 Skill 的匹配分数
 */
function calculateMatchScore(
  input: string,
  skill: SkillMetadata
): { score: number; reasons: Map<string, string[]> } {
  const tokens = new Set(tokenize(input))
  let totalScore = 0
  let totalWeight = 0
  const reasons = new Map<string, string[]>()
  
  for (const rule of MATCH_RULES) {
    const result = rule.match(input, tokens, skill)
    if (result.score > 0) {
      totalScore += result.score * rule.weight
      totalWeight += rule.weight
      reasons.set(rule.name, result.keywords)
    }
  }
  
  // 归一化
  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0
  
  return { score: normalizedScore, reasons }
}

/**
 * 匹配 Skills
 * 
 * @param userInput 用户输入
 * @param skills 所有可用 Skills
 * @param options 匹配选项
 * @returns 按分数排序的匹配结果
 */
export function matchSkills(
  userInput: string,
  skills: SkillMetadata[],
  options: SkillMatchOptions = {}
): SkillMatchResult[] {
  const {
    threshold = 0.15,
    maxMatches = 3,
    include = [],
    exclude = []
  } = options
  
  // 过滤掉禁用的 skill 和排除列表
  const candidates = skills.filter(s => 
    s.enabled && 
    !exclude.includes(s.id)
  )
  
  // 计算匹配分数
  const results: SkillMatchResult[] = []
  
  for (const skill of candidates) {
    // 强制包含
    if (include.includes(skill.id)) {
      results.push({
        skill,
        score: 1.0,
        reason: '强制包含',
        matchedKeywords: ['manual-include']
      })
      continue
    }
    
    const { score, reasons } = calculateMatchScore(userInput, skill)
    
    if (score >= threshold) {
      // 构建匹配原因字符串
      const reasonParts: string[] = []
      const allKeywords: string[] = []
      
      for (const [ruleName, keywords] of reasons) {
        if (keywords.length > 0) {
          reasonParts.push(`${ruleName}(${keywords.join(', ')})`)
          allKeywords.push(...keywords)
        }
      }
      
      results.push({
        skill,
        score,
        reason: reasonParts.join(' + '),
        matchedKeywords: [...new Set(allKeywords)]
      })
    }
  }
  
  // 按分数排序，返回前 N 个
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches)
}

// ═══════════════════════════════════════════════════════════════
// 高级匹配策略
// ═══════════════════════════════════════════════════════════════

/**
 * 上下文感知匹配
 * 
 * 考虑已激活的 Skills，给予连续性奖励
 */
export function matchSkillsWithContext(
  userInput: string,
  skills: SkillMetadata[],
  activeSkills: ActiveSkill[],
  options: SkillMatchOptions = {}
): SkillMatchResult[] {
  // 基础匹配
  const results = matchSkills(userInput, skills, options)
  
  // 连续性奖励: 已激活的 Skill 获得分数加成
  const activeIds = new Set(activeSkills.map(s => s.id))
  
  for (const result of results) {
    if (activeIds.has(result.skill.id)) {
      // 已激活的 Skill 获得 20% 加成
      result.score = Math.min(1, result.score * 1.2)
      result.reason += ' + context-active'
    }
  }
  
  // 重新排序
  return results.sort((a, b) => b.score - a.score)
}

/**
 * 快速匹配 (用于实时建议)
 * 
 * 只使用高效的规则，牺牲准确性换取速度
 */
export function quickMatchSkills(
  userInput: string,
  skills: SkillMetadata[],
  limit = 5
): SkillMatchResult[] {
  const results: SkillMatchResult[] = []
  const inputLower = userInput.toLowerCase()
  
  for (const skill of skills) {
    if (!skill.enabled) continue
    
    let score = 0
    const keywords: string[] = []
    
    // 只检查标签和场景 (最快的规则)
    for (const tag of skill.tags) {
      if (inputLower.includes(tag.toLowerCase())) {
        score = 0.8
        keywords.push(tag)
        break
      }
    }
    
    if (score === 0) {
      for (const scenario of skill.usageScenarios) {
        const scenarioTokens = tokenize(scenario)
        for (const token of scenarioTokens) {
          if (inputLower.includes(token)) {
            score = 0.6
            keywords.push(scenario)
            break
          }
        }
        if (score > 0) break
      }
    }
    
    if (score > 0) {
      results.push({
        skill,
        score,
        reason: 'quick-match',
        matchedKeywords: keywords
      })
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ═══════════════════════════════════════════════════════════════
// 调试工具
// ═══════════════════════════════════════════════════════════════

/**
 * 输出匹配过程的调试信息
 */
export function debugMatch(
  userInput: string,
  skills: SkillMetadata[],
  options?: SkillMatchOptions
): string {
  const results = matchSkills(userInput, skills, options)
  
  const lines: string[] = [
    `输入: "${userInput}"`,
    `阈值: ${options?.threshold ?? 0.15}`,
    `最多匹配: ${options?.maxMatches ?? 3} 个`,
    '─'.repeat(50),
    ''
  ]
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    lines.push(
      `${i + 1}. ${r.skill.icon} ${r.skill.name} (${r.skill.id})`,
      `   分数: ${(r.score * 100).toFixed(1)}%`,
      `   原因: ${r.reason}`,
      `   关键词: ${r.matchedKeywords.join(', ')}`,
      ''
    )
  }
  
  if (results.length === 0) {
    lines.push('没有匹配的 Skill')
  }
  
  return lines.join('\n')
}
