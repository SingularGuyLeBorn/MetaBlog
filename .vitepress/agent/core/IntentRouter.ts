/**
 * Intent Router - 意图解析与路由
 * 将自然语言输入映射到具体的技能和参数
 * 
 * P2-IR-1 修复：添加 LRU 缓存，避免重复解析相同输入
 */
import type { IntentType, ParsedIntent, Skill } from './types'
import { getLLMManager } from '../llm'
import { getStructuredLogger } from '../runtime/StructuredLogger'

interface IntentPattern {
  type: IntentType
  patterns: RegExp[]
  description: string
  parameterExtractors: Record<string, (match: RegExpMatchArray) => any>
}

/**
 * LRU 缓存实现
 */
class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }> = new Map()
  private maxSize: number
  private ttlMs: number

  constructor(maxSize: number, ttlMs: number) {
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return undefined
    }

    // 更新访问时间
    entry.timestamp = Date.now()
    return entry.value
  }

  set(key: K, value: V): void {
    // 如果已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.entries().next().value
      if (oldest) {
        this.cache.delete(oldest[0])
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() })
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

export class IntentRouter {
  private skills: Map<string, Skill> = new Map()
  private logger = getStructuredLogger()
  
  // P2-IR-1: LRU 缓存 - 缓存 50 条，TTL 10 分钟
  private intentCache = new LRUCache<string, ParsedIntent>(50, 10 * 60 * 1000)
  
  private intentPatterns: IntentPattern[] = [
    {
      type: 'WRITE_ARTICLE',
      patterns: [
        /(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i,
        /(?:write|create|generate).{0,10}(?:article|blog|post|content)/i,
        /关于.+?(?:的)?(?:文章|博客)/i
      ],
      description: '撰写新文章',
      parameterExtractors: {
        topic: (m) => m[0].replace(/(?:写|创作|生成|创建|关于|的|文章|博客)/g, '').trim()
      }
    },
    {
      type: 'EDIT_CONTENT',
      patterns: [
        /(?:编辑|修改|调整|优化|重写).{0,10}(?:内容|文章|段落|这部分)/i,
        /(?:edit|modify|adjust|optimize|rewrite).{0,10}(?:content|article|paragraph)/i
      ],
      description: '编辑现有内容',
      parameterExtractors: {
        action: (m) => 'edit'
      }
    },
    {
      type: 'RESEARCH_WEB',
      patterns: [
        /(?:搜索|查找|调研|研究).{0,5}(?:关于|资料|信息|最新)/i,
        /(?:search|find|research|look\s+up).{0,10}(?:for|about)/i
      ],
      description: '网络搜索研究',
      parameterExtractors: {
        query: (m) => m[0].replace(/(?:搜索|查找|调研|研究|关于|资料)/g, '').trim()
      }
    },
    {
      type: 'UPDATE_GRAPH',
      patterns: [
        /(?:更新|完善|补充).{0,5}(?:知识图谱|图谱|链接|关系)/i,
        /(?:update|improve|complete).{0,10}(?:knowledge\s+graph|graph|links)/i
      ],
      description: '更新知识图谱',
      parameterExtractors: {}
    },
    {
      type: 'CODE_EXPLAIN',
      patterns: [
        /(?:解释|说明|讲解).{0,5}(?:代码|这段|函数|类)/i,
        /(?:explain|describe|document).{0,10}(?:code|this|function|class)/i
      ],
      description: '解释代码',
      parameterExtractors: {}
    },
    {
      type: 'ANSWER_QUESTION',
      patterns: [
        /(?:什么是|为什么|怎么|如何).+?/i,
        /(?:what\s+is|why|how\s+to|how\s+do).+?/i,
        /\?$/
      ],
      description: '回答问题',
      parameterExtractors: {
        question: (m) => m[0]
      }
    },
    {
      type: 'SUMMARIZE',
      patterns: [
        /(?:总结|概括|摘要|TL;DR).{0,5}/i,
        /(?:summarize|summary|TL;DR).{0,5}/i
      ],
      description: '生成摘要',
      parameterExtractors: {}
    },
    {
      type: 'EXPLORE_KNOWLEDGE',
      patterns: [
        /(?:探索|发现|查找).{0,5}(?:知识|关联|联系|相关内容)/i,
        /(?:explore|discover|find).{0,10}(?:knowledge|connections|related)/i
      ],
      description: '探索知识关联',
      parameterExtractors: {}
    }
  ]

  registerSkill(skill: Skill): void {
    this.skills.set(skill.name, skill)
  }

  // 否定词列表
  private readonly NEGATION_WORDS = [
    '不', '别', '不要', '不能', '别要', '无需', '不用', '不必',
    'no', 'not', 'don\'t', 'cannot', 'donot', 'no need to'
  ]

  /**
   * 检测输入是否包含否定词
   */
  private hasNegation(input: string): boolean {
    const normalizedInput = input.toLowerCase()
    return this.NEGATION_WORDS.some(word => normalizedInput.includes(word.toLowerCase()))
  }

  /**
   * 检测否定词是否在关键动词附近（2个词内）
   */
  private isNegationNearKeyword(input: string, matchText: string): boolean {
    const normalizedInput = input.toLowerCase()
    const normalizedMatch = matchText.toLowerCase()
    
    // 找到匹配位置
    const matchIndex = normalizedInput.indexOf(normalizedMatch)
    if (matchIndex === -1) return false
    
    // 检查匹配位置前后 10 个字符内是否有否定词
    const contextStart = Math.max(0, matchIndex - 10)
    const contextEnd = Math.min(normalizedInput.length, matchIndex + normalizedMatch.length + 10)
    const context = normalizedInput.substring(contextStart, contextEnd)
    
    return this.NEGATION_WORDS.some(word => context.includes(word.toLowerCase()))
  }

  /**
   * 解析用户输入，识别意图
   * P2-IR-1: 添加 LRU 缓存支持
   */
  async parse(input: string, context?: any): Promise<ParsedIntent> {
    const normalizedInput = input.toLowerCase().trim()
    
    // P2-IR-1: 检查缓存
    const cacheKey = `${normalizedInput}:${JSON.stringify(context)}`
    const cached = this.intentCache.get(cacheKey)
    if (cached) {
      this.logger.debug('router.cache.hit', `Cache hit for intent parsing`, { input: input.substring(0, 50) })
      return cached
    }
    
    this.logger.debug('router.parse', `Parsing intent for: "${input}"`)
    
    let result: ParsedIntent
    
    // 1. 基于规则匹配
    for (const intentPattern of this.intentPatterns) {
      for (const pattern of intentPattern.patterns) {
        const match = normalizedInput.match(pattern) || input.match(pattern)
        if (match) {
          const matchedText = match[0]
          
          // 检测否定词
          if (this.isNegationNearKeyword(input, matchedText)) {
            this.logger.info('router.negation', `Detected negation near keyword "${matchedText}"`)
            // 否定意图，降低置信度或询问确认
            result = {
              type: 'ANSWER_QUESTION', // 降级为问答意图
              confidence: 0.3,
              entities: this.extractEntities(input),
              parameters: { 
                question: input,
                negationDetected: true,
                originalMatch: matchedText,
                suggestedIntent: intentPattern.type
              },
              raw: input
            }
            this.intentCache.set(cacheKey, result)
            return result
          }
          
          const parameters = this.extractParameters(intentPattern, match, input, context)
          result = {
            type: intentPattern.type,
            confidence: this.calculateConfidence(match, input, intentPattern.type),
            entities: this.extractEntities(input),
            parameters,
            raw: input
          }
          this.intentCache.set(cacheKey, result)
          return result
        }
      }
    }
    
    this.logger.debug('router.parse', `No rule matched, falling back to skills and LLM`)

    // 2. 基于技能的意图匹配
    for (const [name, skill] of this.skills) {
      if (typeof skill.intentPattern === 'object' && skill.intentPattern instanceof RegExp) {
        if (skill.intentPattern.test(input)) {
          result = {
            type: this.inferIntentType(skill.name),
            confidence: 0.7,
            entities: this.extractEntities(input),
            parameters: this.extractSkillParameters(skill, input),
            raw: input
          }
          this.intentCache.set(cacheKey, result)
          return result
        }
      } else if (Array.isArray(skill.intentPattern)) {
        for (const pattern of skill.intentPattern) {
          if (input.toLowerCase().includes(pattern.toLowerCase())) {
            result = {
              type: this.inferIntentType(skill.name),
              confidence: 0.75,
              entities: this.extractEntities(input),
              parameters: this.extractSkillParameters(skill, input),
              raw: input
            }
            this.intentCache.set(cacheKey, result)
            return result
          }
        }
      }
    }

    // 3. LLM 兜底意图分类（当 regex 和 skill 都不匹配时）
    try {
      const llmIntent = await this.classifyWithLLM(input)
      if (llmIntent) {
        this.logger.info('router.llm', `LLM classified intent as ${llmIntent.type}`)
        this.intentCache.set(cacheKey, llmIntent)
        return llmIntent
      }
    } catch (e) {
      // LLM 不可用，回退到默认意图
      this.logger.warn('router.error', `LLM classification failed: ${String(e)}`)
    }
    
    // 4. 最终默认意图
    result = {
      type: 'ANSWER_QUESTION',
      confidence: 0.4,
      entities: this.extractEntities(input),
      parameters: { question: input },
      raw: input
    }
    this.intentCache.set(cacheKey, result)
    return result
  }
  
  /**
   * 使用 LLM 做意图分类（few-shot）
   */
  private async classifyWithLLM(input: string): Promise<ParsedIntent | null> {
    const llm = getLLMManager()
    
    const intentList = this.intentPatterns.map(p => `- ${p.type}: ${p.description}`).join('\n')
    
    const response = await llm.chat({
      messages: [
        {
          role: 'system',
          content: `你是一个意图分类器。根据用户输入，返回最匹配的意图类型。只返回意图类型名称，不要其他内容。\n\n可用意图：\n${intentList}`
        },
        { role: 'user', content: '帮我把这段笔记整理成一篇 post' },
        { role: 'assistant', content: 'WRITE_ARTICLE' },
        { role: 'user', content: '最近 Transformer 有什么新进展？' },
        { role: 'assistant', content: 'RESEARCH_WEB' },
        { role: 'user', content: input }
      ],
      temperature: 0,
      maxTokens: 20
    })
    
    const predicted = response.content.trim().toUpperCase() as IntentType
    const validTypes = this.intentPatterns.map(p => p.type)
    
    if (validTypes.includes(predicted)) {
      return {
        type: predicted,
        confidence: 0.7,
        entities: this.extractEntities(input),
        parameters: { rawInput: input },
        raw: input
      }
    }
    
    return null
  }

  /**
   * 根据意图找到匹配的技能
   */
  findSkill(intent: ParsedIntent): Skill | null {
    // 查找能处理该意图类型的技能
    for (const [name, skill] of this.skills) {
      if (this.skillMatchesIntent(skill, intent)) {
        return skill
      }
    }
    return null
  }

  /**
   * 获取相似的意图选项（用于低置信度时询问用户）
   */
  getSimilarIntents(intent: ParsedIntent, limit: number = 3): Array<{ description: string; confidence: number }> {
    const candidates = this.intentPatterns.map(pattern => ({
      description: pattern.description,
      confidence: pattern.type === intent.type ? intent.confidence : 0.3
    }))

    // 按置信度排序并返回前 N 个
    return candidates
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit)
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  private extractParameters(
    pattern: IntentPattern,
    match: RegExpMatchArray,
    input: string,
    context?: any
  ): Record<string, any> {
    const params: Record<string, any> = {}

    // 使用参数提取器
    for (const [key, extractor] of Object.entries(pattern.parameterExtractors)) {
      try {
        params[key] = extractor(match)
      } catch (e) {
        params[key] = null
      }
    }

    // 添加上下文信息
    if (context?.currentFile) {
      params.currentFile = context.currentFile
    }
    if (context?.selectedText) {
      params.selectedText = context.selectedText
    }

    // 通用参数提取
    params.rawInput = input
    
    return params
  }

  private extractEntities(input: string): string[] {
    const entities: string[] = []

    // 提取 [[WikiLinks]]
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
    let match
    while ((match = wikiLinkRegex.exec(input)) !== null) {
      entities.push(match[1].split('|')[0])
    }

    // 提取 "代码块" 或文件引用
    const codeRefRegex = /`([^`]+)`|『([^』]+)』/g
    while ((match = codeRefRegex.exec(input)) !== null) {
      entities.push(match[1] || match[2])
    }

    // 提取可能的专有名词（简单启发式）
    const properNouns = input.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g)
    if (properNouns) {
      entities.push(...properNouns)
    }

    return [...new Set(entities)]
  }

  private calculateConfidence(match: RegExpMatchArray, input: string, intentType: IntentType): number {
    let confidence = 0.5

    // 匹配长度越长，置信度越高
    const matchRatio = match[0].length / input.length
    confidence += matchRatio * 0.2

    // 特定关键词提高置信度
    const highConfidenceKeywords: Record<string, string[]> = {
      'WRITE_ARTICLE': ['写一篇', '创建文章', 'generate article'],
      'RESEARCH_WEB': ['搜索', '查找资料', 'research on'],
      'EDIT_CONTENT': ['修改', '编辑', 'rewrite this'],
      'SUMMARIZE': ['总结', '概括', 'summarize']
    }

    const keywords = highConfidenceKeywords[intentType] || []
    for (const kw of keywords) {
      if (input.toLowerCase().includes(kw.toLowerCase())) {
        confidence += 0.15
        break
      }
    }

    return Math.min(confidence, 0.95)
  }

  private skillMatchesIntent(skill: Skill, intent: ParsedIntent): boolean {
    // 基于技能名称和意图类型的映射
    const skillIntentMap: Record<string, IntentType[]> = {
      'WriteArticle': ['WRITE_ARTICLE'],
      'EditContent': ['EDIT_CONTENT'],
      'ResearchWeb': ['RESEARCH_WEB'],
      'UpdateGraph': ['UPDATE_GRAPH'],
      'CodeExplain': ['CODE_EXPLAIN'],
      'AnswerQuestion': ['ANSWER_QUESTION'],
      'Summarize': ['SUMMARIZE']
    }

    const compatibleIntents = skillIntentMap[skill.name] || []
    return compatibleIntents.includes(intent.type)
  }

  private inferIntentType(skillName: string): IntentType {
    const map: Record<string, IntentType> = {
      'WriteArticle': 'WRITE_ARTICLE',
      'EditContent': 'EDIT_CONTENT',
      'ResearchWeb': 'RESEARCH_WEB',
      'UpdateGraph': 'UPDATE_GRAPH',
      'CodeExplain': 'CODE_EXPLAIN',
      'AnswerQuestion': 'ANSWER_QUESTION',
      'Summarize': 'SUMMARIZE'
    }
    return map[skillName] || 'ANSWER_QUESTION'
  }

  private extractSkillParameters(skill: Skill, input: string): Record<string, any> {
    const params: Record<string, any> = {}
    
    // 尝试从输入中提取必需参数
    for (const param of skill.requiredParams) {
      // 简单的参数提取：寻找 "param: value" 或 "param is value" 模式
      const regex = new RegExp(`${param}[:是]\\s*([^\\s,，。]+)`, 'i')
      const match = input.match(regex)
      if (match) {
        params[param] = match[1]
      }
    }

    return params
  }
}
