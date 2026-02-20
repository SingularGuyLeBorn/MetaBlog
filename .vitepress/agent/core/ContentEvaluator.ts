/**
 * ContentEvaluator - AI 内容质量评估系统
 * 
 * 功能:
 * - 内容质量评分 (原创性/技术深度/实用性)
 * - 相关性评估 (与博客主题的匹配度)
 * - 去重检测 (避免重复内容)
 * - 自动分类与标签建议
 * - 存放位置建议
 */

import { getLLMManager, type LLMMessage } from '../llm'
import { getStructuredLogger } from '../runtime/StructuredLogger'
import { getMemoryManager } from '../memory'
import { promises as fs } from 'fs'
import { join } from 'path'

// 评估结果接口
export interface EvaluationResult {
  shouldCreate: boolean
  reason?: RejectionReason
  quality: QualityScore
  relevance: RelevanceScore
  duplication: DuplicationCheck
  classification: ContentClassification
  targetPath: string
  suggestedTitle: string
  priority: number // 0-10
  estimatedValue: number // 预期价值评分
}

export type RejectionReason = 
  | 'DUPLICATE' 
  | 'LOW_QUALITY' 
  | 'NOT_RELEVANT' 
  | 'TOO_SHORT'
  | 'SPAM'
  | 'ERROR'

export interface QualityScore {
  overall: number // 0-10
  dimensions: {
    originality: number // 原创性
    technicalDepth: number // 技术深度
    practicality: number // 实用性
    readability: number // 可读性
    completeness: number // 完整性
  }
  reasons: string[]
  improvements: string[]
}

export interface RelevanceScore {
  overall: number // 0-10
  categories: string[]
  keywords: string[]
  blogFit: number // 与博客定位的匹配度
}

export interface DuplicationCheck {
  isDuplicate: boolean
  similarity: number // 0-1
  similarArticles: Array<{
    path: string
    title: string
    similarity: number
  }>
}

export interface ContentClassification {
  primaryCategory: string
  secondaryCategories: string[]
  suggestedTags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  contentType: 'tutorial' | 'news' | 'opinion' | 'reference' | 'other'
}

// 评估配置
export interface EvaluatorConfig {
  minQualityScore: number
  minRelevanceScore: number
  maxSimilarity: number
  minWordCount: number
  maxWordCount: number
  blogTopics: string[]
}

const DEFAULT_CONFIG: EvaluatorConfig = {
  minQualityScore: 6.0,
  minRelevanceScore: 5.0,
  maxSimilarity: 0.8,
  minWordCount: 300,
  maxWordCount: 10000,
  blogTopics: ['AI', 'Machine Learning', 'Web Development', 'Technology']
}

export class ContentEvaluator {
  private logger = getStructuredLogger()
  private llm = getLLMManager()
  private memory = getMemoryManager()
  private config: EvaluatorConfig

  constructor(config: Partial<EvaluatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ============================================
  // 主要评估入口
  // ============================================

  /**
   * 评估内容质量
   */
  async evaluate(
    content: string,
    title: string,
    context?: {
      source?: string
      author?: string
      existingPath?: string
    }
  ): Promise<EvaluationResult> {
    const startTime = Date.now()
    
    this.logger.info('evaluator.start', 'Starting content evaluation', {
      title: title.substring(0, 50),
      contentLength: content.length,
      source: context?.source
    })

    try {
      // 1. 基础检查
      const basicCheck = this.performBasicChecks(content)
      if (!basicCheck.passed) {
        return this.createRejectionResult(basicCheck.reason as RejectionReason, content)
      }

      // 2. 去重检查
      const duplication = await this.checkDuplication(content, title)
      if (duplication.isDuplicate && duplication.similarity > this.config.maxSimilarity) {
        return this.createRejectionResult('DUPLICATE', content, { duplication })
      }

      // 3. 质量评估 (使用 LLM)
      const quality = await this.assessQuality(content, title)
      if (quality.overall < this.config.minQualityScore) {
        return this.createRejectionResult('LOW_QUALITY', content, { quality })
      }

      // 4. 相关性评估
      const relevance = await this.assessRelevance(content, title)
      if (relevance.overall < this.config.minRelevanceScore) {
        return this.createRejectionResult('NOT_RELEVANT', content, { relevance })
      }

      // 5. 分类与路径建议
      const classification = await this.classifyContent(content, title)
      const targetPath = this.suggestTargetPath(classification, title)

      // 6. 生成优化后的标题
      const suggestedTitle = await this.generateOptimizedTitle(content, title)

      // 7. 计算优先级和预期价值
      const { priority, estimatedValue } = this.calculatePriority(
        quality, relevance, duplication, classification
      )

      const result: EvaluationResult = {
        shouldCreate: true,
        quality,
        relevance,
        duplication,
        classification,
        targetPath,
        suggestedTitle,
        priority,
        estimatedValue
      }

      this.logger.success('evaluator.complete', 'Content evaluation completed', {
        title: suggestedTitle,
        quality: quality.overall,
        relevance: relevance.overall,
        priority,
        duration: Date.now() - startTime
      })

      return result

    } catch (error) {
      this.logger.error('evaluator.error', 'Evaluation failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      
      // 出错时返回保守的结果
      return this.createRejectionResult('ERROR', content)
    }
  }

  // ============================================
  // 评估步骤实现
  // ============================================

  private performBasicChecks(content: string): { passed: boolean; reason?: string } {
    const wordCount = content.split(/\s+/).length

    // 字数检查
    if (wordCount < this.config.minWordCount) {
      return { passed: false, reason: 'TOO_SHORT' }
    }

    if (wordCount > this.config.maxWordCount) {
      return { passed: false, reason: 'TOO_LONG' }
    }

    // 垃圾内容检查 (简单的启发式)
    const spamPatterns = [
      /\b(buy now|click here|limited time|act now)\b/gi,
      /(.)\1{10,}/, // 重复字符
      /https?:\/\/\S{100,}/ // 超长链接
    ]

    const spamScore = spamPatterns.reduce((score, pattern) => {
      return score + (content.match(pattern)?.length || 0)
    }, 0)

    if (spamScore > 5) {
      return { passed: false, reason: 'SPAM' }
    }

    return { passed: true }
  }

  private async checkDuplication(
    content: string,
    title: string
  ): Promise<DuplicationCheck> {
    // 提取关键句子用于比较
    const keySentences = this.extractKeySentences(content)
    
    // 获取所有现有文章
    const articles = await this.getAllArticles()
    
    const similarArticles: DuplicationCheck['similarArticles'] = []
    let maxSimilarity = 0

    for (const article of articles) {
      // 简单的相似度计算：共享的关键句子比例
      const articleSentences = this.extractKeySentences(article.content)
      const shared = keySentences.filter(s => 
        articleSentences.some(as => this.similarity(s, as) > 0.8)
      )
      
      const similarity = shared.length / Math.max(keySentences.length, articleSentences.length)
      
      if (similarity > 0.5) {
        similarArticles.push({
          path: article.path,
          title: article.title,
          similarity
        })
        maxSimilarity = Math.max(maxSimilarity, similarity)
      }
    }

    // 按相似度排序
    similarArticles.sort((a, b) => b.similarity - a.similarity)

    return {
      isDuplicate: maxSimilarity > this.config.maxSimilarity,
      similarity: maxSimilarity,
      similarArticles: similarArticles.slice(0, 5)
    }
  }

  private async assessQuality(content: string, title: string): Promise<QualityScore> {
    const prompt: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a content quality evaluator. Assess the following content on multiple dimensions.
Return a JSON object with this structure:
{
  "dimensions": {
    "originality": 0-10,
    "technicalDepth": 0-10,
    "practicality": 0-10,
    "readability": 0-10,
    "completeness": 0-10
  },
  "reasons": ["reason1", "reason2"],
  "improvements": ["suggestion1", "suggestion2"]
}
Be critical and objective.`
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nContent:\n${content.substring(0, 3000)}`
      }
    ]

    try {
      const response = await this.llm.chat({ messages: prompt, temperature: 0.3 })
      const result = this.extractJSON(response.content)
      
      const dimensions = result?.dimensions || {
        originality: 5,
        technicalDepth: 5,
        practicality: 5,
        readability: 5,
        completeness: 5
      }

      const overall = Math.round(
        (dimensions.originality + dimensions.technicalDepth + dimensions.practicality + 
         dimensions.readability + dimensions.completeness) / 5 * 10
      ) / 10

      return {
        overall,
        dimensions,
        reasons: result?.reasons || [],
        improvements: result?.improvements || []
      }
    } catch (error) {
      // LLM 失败时返回中等评分
      return {
        overall: 5.0,
        dimensions: {
          originality: 5,
          technicalDepth: 5,
          practicality: 5,
          readability: 5,
          completeness: 5
        },
        reasons: ['Evaluation failed, using default scores'],
        improvements: ['Please retry evaluation']
      }
    }
  }

  private async assessRelevance(content: string, title: string): Promise<RelevanceScore> {
    const prompt: LLMMessage[] = [
      {
        role: 'system',
        content: `Assess how relevant this content is to a tech blog focused on: ${this.config.blogTopics.join(', ')}.
Return JSON:
{
  "overall": 0-10,
  "categories": ["category1", "category2"],
  "keywords": ["keyword1", "keyword2"],
  "blogFit": 0-10
}`
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nContent:\n${content.substring(0, 2000)}`
      }
    ]

    try {
      const response = await this.llm.chat({ messages: prompt, temperature: 0.3 })
      const result = this.extractJSON(response.content)

      return {
        overall: result?.overall || 5,
        categories: result?.categories || [],
        keywords: result?.keywords || [],
        blogFit: result?.blogFit || 5
      }
    } catch {
      return {
        overall: 5,
        categories: [],
        keywords: [],
        blogFit: 5
      }
    }
  }

  private async classifyContent(content: string, title: string): Promise<ContentClassification> {
    const prompt: LLMMessage[] = [
      {
        role: 'system',
        content: `Classify this content. Return JSON:
{
  "primaryCategory": "category",
  "secondaryCategories": ["cat1", "cat2"],
  "suggestedTags": ["tag1", "tag2"],
  "difficulty": "beginner|intermediate|advanced",
  "contentType": "tutorial|news|opinion|reference|other"
}`
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nContent:\n${content.substring(0, 2000)}`
      }
    ]

    try {
      const response = await this.llm.chat({ messages: prompt, temperature: 0.3 })
      const result = this.extractJSON(response.content)

      return {
        primaryCategory: result?.primaryCategory || 'uncategorized',
        secondaryCategories: result?.secondaryCategories || [],
        suggestedTags: result?.suggestedTags || [],
        difficulty: result?.difficulty || 'intermediate',
        contentType: result?.contentType || 'other'
      }
    } catch {
      return {
        primaryCategory: 'uncategorized',
        secondaryCategories: [],
        suggestedTags: [],
        difficulty: 'intermediate',
        contentType: 'other'
      }
    }
  }

  private suggestTargetPath(classification: ContentClassification, title: string): string {
    const categoryMap: Record<string, string> = {
      'AI': 'posts/tech/ai/',
      'Machine Learning': 'posts/tech/ai/',
      'Web Development': 'posts/tech/web/',
      'Frontend': 'posts/tech/web/',
      'Backend': 'posts/tech/backend/',
      'Database': 'posts/tech/database/',
      'DevOps': 'posts/tech/devops/',
      'News': 'posts/news/',
      'Tutorial': 'posts/tutorials/',
      'uncategorized': 'posts/uncategorized/'
    }

    const primary = classification.primaryCategory
    const path = categoryMap[primary] || `posts/${primary.toLowerCase().replace(/\s+/g, '-')}/`
    
    return path
  }

  private async generateOptimizedTitle(content: string, originalTitle: string): Promise<string> {
    // 如果原标题已经不错，直接返回
    if (originalTitle.length > 10 && originalTitle.length < 100) {
      return originalTitle
    }

    const prompt: LLMMessage[] = [
      {
        role: 'system',
        content: 'Generate a concise, engaging title for this content. Return only the title, no quotes.'
      },
      {
        role: 'user',
        content: `Original title: ${originalTitle}\n\nContent:\n${content.substring(0, 1500)}`
      }
    ]

    try {
      const response = await this.llm.chat({ messages: prompt, maxTokens: 50 })
      return response.content.trim().replace(/^["']|["']$/g, '') || originalTitle
    } catch {
      return originalTitle
    }
  }

  private calculatePriority(
    quality: QualityScore,
    relevance: RelevanceScore,
    duplication: DuplicationCheck,
    classification: ContentClassification
  ): { priority: number; estimatedValue: number } {
    // 基础分数
    let score = quality.overall * 0.4 + relevance.overall * 0.4

    // 去重惩罚
    if (duplication.similarity > 0.5) {
      score *= (1 - duplication.similarity * 0.5)
    }

    // 内容类型加分
    const typeBonus: Record<string, number> = {
      'tutorial': 1.5,
      'news': 1.2,
      'reference': 1.3,
      'opinion': 1.0,
      'other': 0.8
    }
    score *= typeBonus[classification.contentType] || 1.0

    // 难度加分
    const difficultyBonus: Record<string, number> = {
      'advanced': 1.3,
      'intermediate': 1.1,
      'beginner': 0.9
    }
    score *= difficultyBonus[classification.difficulty] || 1.0

    return {
      priority: Math.min(Math.round(score), 10),
      estimatedValue: Math.round(score * 10) / 10
    }
  }

  // ============================================
  // 辅助方法
  // ============================================

  private createRejectionResult(
    reason: RejectionReason,
    content: string,
    partial?: Partial<EvaluationResult>
  ): EvaluationResult {
    return {
      shouldCreate: false,
      reason,
      quality: partial?.quality || {
        overall: 0,
        dimensions: {
          originality: 0,
          technicalDepth: 0,
          practicality: 0,
          readability: 0,
          completeness: 0
        },
        reasons: [`Rejected: ${reason}`],
        improvements: []
      },
      relevance: partial?.relevance || {
        overall: 0,
        categories: [],
        keywords: [],
        blogFit: 0
      },
      duplication: partial?.duplication || {
        isDuplicate: reason === 'DUPLICATE',
        similarity: 0,
        similarArticles: []
      },
      classification: {
        primaryCategory: 'rejected',
        secondaryCategories: [],
        suggestedTags: [],
        difficulty: 'intermediate',
        contentType: 'other'
      },
      targetPath: 'posts/rejected/',
      suggestedTitle: 'Rejected Content',
      priority: 0,
      estimatedValue: 0
    }
  }

  private extractKeySentences(content: string): string[] {
    // 提取关键句子 (简化版：长度适中的句子)
    return content
      .split(/[.!?。！？]+/)
      .map(s => s.trim())
      .filter(s => s.length > 30 && s.length < 200)
      .slice(0, 20)
  }

  private similarity(a: string, b: string): number {
    // 简化的相似度计算
    const aWords = new Set(a.toLowerCase().split(/\s+/))
    const bWords = new Set(b.toLowerCase().split(/\s+/))
    const intersection = new Set([...aWords].filter(x => bWords.has(x)))
    return intersection.size / Math.max(aWords.size, bWords.size)
  }

  private extractJSON(text: string): any {
    try {
      // 尝试提取 JSON 块
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // 解析失败
    }
    return null
  }

  private async getAllArticles(): Promise<Array<{ path: string; title: string; content: string }>> {
    // 从文件系统获取所有文章 (简化版)
    const articles: Array<{ path: string; title: string; content: string }> = []
    
    try {
      const sectionsPath = join(process.cwd(), 'docs', 'sections')
      const sections = await fs.readdir(sectionsPath)
      
      for (const section of sections) {
        const sectionPath = join(sectionsPath, section)
        const stat = await fs.stat(sectionPath)
        
        if (stat.isDirectory()) {
          // 递归读取 (简化处理)
          const files = await fs.readdir(sectionPath, { recursive: true })
          for (const file of files) {
            if (typeof file === 'string' && file.endsWith('.md')) {
              const filePath = join(sectionPath, file)
              const content = await fs.readFile(filePath, 'utf-8')
              const title = content.match(/^#\s+(.+)$/m)?.[1] || file
              articles.push({
                path: filePath,
                title,
                content
              })
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn('evaluator.read-articles-failed', `Failed to read articles: ${error}`)
    }
    
    return articles
  }

  // ============================================
  // 公共 API
  // ============================================

  updateConfig(config: Partial<EvaluatorConfig>): void {
    this.config = { ...this.config, ...config }
    this.logger.info('evaluator.config-updated', 'Evaluator config updated', this.config)
  }
}

// Singleton
let evaluatorInstance: ContentEvaluator | null = null

export function getContentEvaluator(): ContentEvaluator {
  if (!evaluatorInstance) {
    evaluatorInstance = new ContentEvaluator()
  }
  return evaluatorInstance
}

export function createContentEvaluator(config?: Partial<EvaluatorConfig>): ContentEvaluator {
  evaluatorInstance = new ContentEvaluator(config)
  return evaluatorInstance
}
