/**
 * Built-in Skills - 内置技能集
 * 核心技能实现，与原有 BFF API 集成
 */
import type { Skill, SkillContext, SkillResult } from '../core/types'

// ============================================
// WriteArticle - 撰写文章
// ============================================

export const WriteArticleSkill: Skill = {
  name: 'WriteArticle',
  description: '撰写新文章或创建内容',
  intentPattern: /(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i,
  requiredParams: ['topic'],
  optionalParams: ['outline', 'style', 'length', 'targetPath'],
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { topic, style = '技术博客', length = 'medium', targetPath } = params
    
    ctx.logger.info('Starting article writing', { topic, style, length })

    // 1. 构建上下文
    const context = await ctx.memory.buildContext(topic)
    const relatedArticles = context.map(c => c.metadata.title || c.source).slice(0, 3)

    // 2. 生成大纲（模拟 LLM 调用）
    const outline = await generateOutline(topic, style, context)
    
    // 3. 生成内容（模拟）
    const content = await generateContent(topic, outline, style)

    // 4. 生成 frontmatter
    const frontmatter = generateFrontmatter(topic, relatedArticles)

    // 5. 保存文件
    const fullContent = `${frontmatter}\n\n${content}`
    const filePath = targetPath || `posts/${slugify(topic)}.md`

    const saveResult = await saveFile(filePath, fullContent)
    
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
        tokensUsed: outline.tokens + content.tokens,
        cost: outline.cost + content.cost
      }
    }

    // 6. 提取实体并更新知识图谱
    await ctx.memory.extractEntitiesFromContent(fullContent, filePath)

    return {
      success: true,
      data: {
        message: `已创建文章「${topic}」，保存至 ${filePath}`,
        path: filePath,
        outline: outline.data,
        wordCount: content.data.length
      },
      tokensUsed: outline.tokens + content.tokens,
      cost: outline.cost + content.cost,
      nextSteps: ['添加更多章节', '插入代码示例', '创建相关文章']
    }
  }
}

// ============================================
// EditContent - 编辑内容
// ============================================

export const EditContentSkill: Skill = {
  name: 'EditContent',
  description: '编辑现有文章或内容',
  intentPattern: /(?:编辑|修改|调整|优化|重写).{0,10}(?:内容|文章|段落|这部分)/i,
  requiredParams: ['action'],
  optionalParams: ['targetPath', 'selectedText', 'instruction'],
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { action, targetPath = ctx.currentFile, selectedText, instruction } = params

    if (!targetPath) {
      return {
        success: false,
        error: '未指定目标文件',
        tokensUsed: 0,
        cost: 0
      }
    }

    // 读取现有内容
    const existingContent = await readFile(targetPath)
    if (!existingContent) {
      return {
        success: false,
        error: `无法读取文件: ${targetPath}`,
        tokensUsed: 0,
        cost: 0
      }
    }

    // 根据 action 执行不同的编辑
    let editedContent = existingContent
    let editDescription = ''

    switch (action) {
      case 'improve':
        editDescription = '优化表达和结构'
        editedContent = await improveContent(existingContent)
        break
      case 'expand':
        editDescription = '扩写内容'
        editedContent = await expandContent(existingContent, selectedText)
        break
      case 'simplify':
        editDescription = '简化表达'
        editedContent = await simplifyContent(existingContent)
        break
      case 'rewrite':
        editDescription = instruction || '重写'
        editedContent = await rewriteContent(existingContent, instruction)
        break
      default:
        editedContent = existingContent
    }

    // 保存修改
    const saveResult = await saveFile(targetPath, editedContent)

    // 创建 Git 提交
    await gitCommit(targetPath, `agent(${ctx.taskId}): ${editDescription}`)

    return {
      success: true,
      data: {
        message: `已${editDescription}，保存至 ${targetPath}`,
        path: targetPath
      },
      tokensUsed: 500, // 模拟
      cost: 0.01
    }
  }
}

// ============================================
// ResearchWeb - 网络研究
// ============================================

export const ResearchWebSkill: Skill = {
  name: 'ResearchWeb',
  description: '搜索网络资料进行研究',
  intentPattern: /(?:搜索|查找|调研|研究).{0,5}(?:关于|资料|信息|最新)/i,
  requiredParams: ['query'],
  optionalParams: ['sources', 'maxResults', 'timeRange'],
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { query, sources = ['arxiv', 'google'], maxResults = 5 } = params

    ctx.logger.info('Starting web research', { query, sources })

    // 模拟搜索结果
    const searchResults = await mockSearch(query, sources, maxResults)

    // 总结搜索结果
    const summary = await summarizeResults(searchResults)

    return {
      success: true,
      data: {
        message: `找到 ${searchResults.length} 条相关结果`,
        query,
        results: searchResults,
        summary: summary.data
      },
      tokensUsed: summary.tokens + 200,
      cost: summary.cost + 0.005,
      nextSteps: ['基于搜索结果写文章', '保存到知识库', '深入某个主题']
    }
  }
}

// ============================================
// UpdateGraph - 更新知识图谱
// ============================================

export const UpdateGraphSkill: Skill = {
  name: 'UpdateGraph',
  description: '更新知识图谱和实体关系',
  intentPattern: /(?:更新|完善|补充).{0,5}(?:知识图谱|图谱|链接|关系)/i,
  requiredParams: [],
  optionalParams: ['targetPath', 'discoverNew'],
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { targetPath = ctx.currentFile, discoverNew = true } = params

    if (!targetPath) {
      return {
        success: false,
        error: '未指定目标文件',
        tokensUsed: 0,
        cost: 0
      }
    }

    // 读取内容
    const content = await readFile(targetPath)
    if (!content) {
      return {
        success: false,
        error: `无法读取文件: ${targetPath}`,
        tokensUsed: 0,
        cost: 0
      }
    }

    // 提取实体
    const entities = await ctx.memory.extractEntitiesFromContent(content, targetPath)

    // 如果发现新链接建议
    let suggestions: string[] = []
    if (discoverNew) {
      suggestions = await discoverMissingLinks(content, entities)
    }

    return {
      success: true,
      data: {
        message: `知识图谱已更新，提取了 ${entities.length} 个实体`,
        entities: entities.map(e => ({ name: e.name, type: e.type })),
        suggestions
      },
      tokensUsed: 100,
      cost: 0.002
    }
  }
}

// ============================================
// CodeExplain - 代码解释
// ============================================

export const CodeExplainSkill: Skill = {
  name: 'CodeExplain',
  description: '为代码生成解释文档',
  intentPattern: /(?:解释|说明|讲解).{0,5}(?:代码|这段|函数|类)/i,
  requiredParams: ['code'],
  optionalParams: ['language', 'targetPath', 'detailLevel'],
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { code, language = 'python', targetPath, detailLevel = 'detailed' } = params

    // 分析代码结构
    const analysis = analyzeCode(code, language)

    // 生成解释文档
    const explanation = await generateCodeExplanation(code, language, analysis, detailLevel)

    // 如果提供了目标路径，保存文档
    let savedPath: string | null = null
    if (targetPath) {
      const docContent = formatCodeDocumentation(code, language, explanation.data)
      const saveResult = await saveFile(targetPath, docContent)
      if (saveResult.success) {
        savedPath = targetPath
      }
    }

    return {
      success: true,
      data: {
        message: savedPath 
          ? `已生成代码解释文档，保存至 ${savedPath}`
          : '代码解释生成完成',
        explanation: explanation.data,
        analysis,
        savedPath
      },
      tokensUsed: explanation.tokens,
      cost: explanation.cost
    }
  }
}

// ============================================
// AnswerQuestion - 回答问题
// ============================================

export const AnswerQuestionSkill: Skill = {
  name: 'AnswerQuestion',
  description: '基于知识库回答问题',
  intentPattern: /(?:什么是|为什么|怎么|如何).+?/i,
  requiredParams: ['question'],
  optionalParams: ['context'],
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { question, context } = params

    // 构建 RAG 上下文
    const ragContext = await ctx.memory.buildContext(question, ctx.currentFile)

    // 生成答案（模拟）
    const answer = await generateAnswer(question, ragContext)

    return {
      success: true,
      data: {
        message: answer.data,
        sources: ragContext.map(r => r.source),
        confidence: ragContext.length > 0 ? Math.max(...ragContext.map(r => r.score)) : 0.5
      },
      tokensUsed: answer.tokens,
      cost: answer.cost
    }
  }
}

// ============================================
// Summarize - 生成摘要
// ============================================

export const SummarizeSkill: Skill = {
  name: 'Summarize',
  description: '为文章生成摘要',
  intentPattern: /(?:总结|概括|摘要|TL;DR).{0,5}/i,
  requiredParams: [],
  optionalParams: ['targetPath', 'maxLength', 'style'],
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { targetPath = ctx.currentFile, maxLength = 200, style = 'concise' } = params

    if (!targetPath) {
      return {
        success: false,
        error: '未指定目标文件',
        tokensUsed: 0,
        cost: 0
      }
    }

    const content = await readFile(targetPath)
    if (!content) {
      return {
        success: false,
        error: `无法读取文件: ${targetPath}`,
        tokensUsed: 0,
        cost: 0
      }
    }

    const summary = await generateSummary(content, maxLength, style)

    return {
      success: true,
      data: {
        message: '摘要生成完成',
        summary: summary.data,
        originalLength: content.length,
        summaryLength: summary.data.length
      },
      tokensUsed: summary.tokens,
      cost: summary.cost
    }
  }
}

// ============================================
// 辅助函数（模拟 LLM 调用）
// ============================================

async function generateOutline(topic: string, style: string, context: any[]): Promise<any> {
  // 模拟 LLM 生成大纲
  await delay(500)
  return {
    data: {
      title: topic,
      sections: [
        '引言',
        '核心概念',
        '实现原理',
        '应用场景',
        '总结'
      ]
    },
    tokens: 200,
    cost: 0.004
  }
}

async function generateContent(topic: string, outline: any, style: string): Promise<any> {
  // 模拟 LLM 生成内容
  await delay(1000)
  const content = `# ${topic}\n\n## 引言\n\n这是关于 ${topic} 的文章...\n\n## 核心概念\n\n详细介绍核心概念...\n`
  return {
    data: content,
    tokens: 1500,
    cost: 0.03
  }
}

function generateFrontmatter(title: string, related: string[]): string {
  const date = new Date().toISOString().split('T')[0]
  return `---\ntitle: ${title}\ndate: ${date}\nwikiLinks:\n${related.map(r => `  - ${r}`).join('\n')}\n---`
}

async function improveContent(content: string): Promise<string> {
  await delay(500)
  return content + '\n\n<!-- 已优化 -->'
}

async function expandContent(content: string, selectedText?: string): Promise<string> {
  await delay(500)
  if (selectedText) {
    return content.replace(selectedText, selectedText + '\n\n[扩展内容...]')
  }
  return content + '\n\n[扩展内容...]'
}

async function simplifyContent(content: string): Promise<string> {
  await delay(500)
  return content.replace(/复杂/g, '简单')
}

async function rewriteContent(content: string, instruction?: string): Promise<string> {
  await delay(500)
  return `<!-- 根据指令重写: ${instruction} -->\n${content}`
}

async function mockSearch(query: string, sources: string[], maxResults: number): Promise<any[]> {
  await delay(800)
  return sources.flatMap((source, i) => [
    {
      title: `${query} - ${source} Result 1`,
      url: `https://${source}.com/result1`,
      snippet: `关于 ${query} 的相关信息...`,
      source
    },
    {
      title: `${query} - ${source} Result 2`,
      url: `https://${source}.com/result2`,
      snippet: `更多关于 ${query} 的资料...`,
      source
    }
  ]).slice(0, maxResults)
}

async function summarizeResults(results: any[]): Promise<any> {
  await delay(300)
  return {
    data: `搜索到 ${results.length} 条结果，主要关于...`,
    tokens: 150,
    cost: 0.003
  }
}

async function discoverMissingLinks(content: string, entities: any[]): Promise<string[]> {
  return [
    `建议添加与 "${entities[0]?.name || '相关主题'}" 的链接`,
    '可以补充更多参考资料'
  ]
}

function analyzeCode(code: string, language: string): any {
  return {
    functions: (code.match(/function|def/g) || []).length,
    classes: (code.match(/class/g) || []).length,
    lines: code.split('\n').length
  }
}

async function generateCodeExplanation(code: string, language: string, analysis: any, detailLevel: string): Promise<any> {
  await delay(600)
  return {
    data: {
      overview: `这段 ${language} 代码包含 ${analysis.functions} 个函数和 ${analysis.classes} 个类`,
      details: '详细解释...'
    },
    tokens: 800,
    cost: 0.016
  }
}

function formatCodeDocumentation(code: string, language: string, explanation: any): string {
  return `# 代码解释\n\n## 概述\n${explanation.overview}\n\n## 详细解释\n${explanation.details}\n\n## 源代码\n\`\`\`${language}\n${code}\n\`\`\``
}

async function generateAnswer(question: string, context: any[]): Promise<any> {
  await delay(400)
  return {
    data: `基于知识库，${question} 的答案是...`,
    tokens: 300,
    cost: 0.006
  }
}

async function generateSummary(content: string, maxLength: number, style: string): Promise<any> {
  await delay(400)
  return {
    data: content.substring(0, maxLength) + '...',
    tokens: 250,
    cost: 0.005
  }
}

// ============================================
// 文件和 Git 操作（与现有 BFF API 集成）
// ============================================

async function readFile(path: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`)
    if (res.ok) {
      return await res.text()
    }
  } catch (e) {
    console.error('Failed to read file:', e)
  }
  return null
}

async function saveFile(path: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    })
    if (res.ok) {
      return { success: true }
    }
    return { success: false, error: await res.text() }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

async function gitCommit(path: string, message: string): Promise<void> {
  // 现有的 BFF API 已经会在 save 时自动 commit
  // 这里可以添加额外的 Agent 特定标记
  console.log(`[Git] ${message}: ${path}`)
}

// ============================================
// 工具函数
// ============================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 导出所有内置技能
export const builtinSkills = [
  WriteArticleSkill,
  EditContentSkill,
  ResearchWebSkill,
  UpdateGraphSkill,
  CodeExplainSkill,
  AnswerQuestionSkill,
  SummarizeSkill
]
