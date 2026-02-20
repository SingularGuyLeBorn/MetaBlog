/**
 * Built-in Skills - 内置技能集
 * 核心技能实现，使用真实 LLM 调用
 * 
 * P0-R2 修复：统一使用 api/files.ts 封装
 */
import type { Skill, SkillContext, SkillResult } from '../core/types'
import { getLLMManager, type LLMMessage } from '../llm'
import { saveFile } from '../api/files'

// ============================================
// 辅助函数：调用 LLM
// ============================================

async function callLLM(
  messages: LLMMessage[],
  options?: { stream?: boolean; onChunk?: (chunk: string) => void }
): Promise<{ content: string; tokens: number; cost: number }> {
  const llm = getLLMManager()
  
  if (options?.stream && options.onChunk) {
    let fullContent = ''
    const { usage, cost } = await llm.chatStream(
      { messages, stream: true },
      (chunk) => {
        fullContent += chunk.content
        options.onChunk?.(chunk.content)
      }
    )
    return { content: fullContent, tokens: usage.totalTokens, cost }
  }
  
  const response = await llm.chat({ messages })
  return { 
    content: response.content, 
    tokens: response.usage.totalTokens, 
    cost: response.cost 
  }
}

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

    // 2. 生成大纲
    const outlinePrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的技术博客作者。为给定的主题生成文章大纲。大纲应该结构清晰，逻辑连贯。只返回大纲，使用 Markdown 格式。`
      },
      {
        role: 'user',
        content: `主题为："${topic}"\n风格：${style}\n长度：${length}\n\n${context.length > 0 ? `相关文章：\n${context.map(c => `- ${c.metadata.title || c.source}`).join('\n')}` : ''}\n\n请生成文章大纲：`
      }
    ]

    const outline = await callLLM(outlinePrompt)
    ctx.logger.info('Outline generated', { tokens: outline.tokens })

    // 3. 生成内容
    const contentPrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的技术博客作者。根据大纲撰写完整的文章内容。使用 Markdown 格式，包含适当的代码示例和解释。`
      },
      {
        role: 'user',
        content: `主题：${topic}\n大纲：\n${outline.content}\n\n请撰写完整的文章内容：`
      }
    ]

    const content = await callLLM(contentPrompt)
    ctx.logger.info('Content generated', { tokens: content.tokens })

    // 4. 生成 frontmatter
    const date = new Date().toISOString().split('T')[0]
    const frontmatter = `---\ntitle: ${topic}\ndate: ${date}\nwikiLinks:\n${relatedArticles.map(r => `  - ${r}`).join('\n')}\n---`

    // 5. 保存文件
    const fullContent = `${frontmatter}\n\n${content.content}`
    const filePath = targetPath || `posts/${await slugifyAsync(topic)}.md`

    try {
      await saveFile(filePath, fullContent, ctx.taskId)
    } catch (saveError) {
      const errorMsg = saveError instanceof Error ? saveError.message : String(saveError)
      return {
        success: false,
        error: errorMsg,
        tokensUsed: outline.tokens + content.tokens,
        cost: outline.cost + content.cost
      }
    }

    // 6. 提取实体并更新知识图谱
    await ctx.memory.entities.extractFromContent(fullContent, filePath)

    return {
      success: true,
      data: {
        message: `已创建文章「${topic}」，保存至 ${filePath}`,
        path: filePath,
        outline: outline.content,
        wordCount: content.content.length
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

    ctx.logger.info('Starting content edit', { action, targetPath, hasSelectedText: !!selectedText })

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

    // 构建编辑提示
    const actionMap: Record<string, string> = {
      improve: '优化表达和结构，使内容更清晰、更专业',
      expand: '扩写内容，添加更多细节和解释',
      simplify: '简化表达，使其更易懂',
      rewrite: instruction || '重写内容'
    }

    ctx.logger.info('Preparing LLM edit prompt', { editAction: actionMap[action] || action })

    const editPrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的内容编辑。根据用户要求编辑以下内容。只返回编辑后的内容，不要添加额外解释。`
      },
      {
        role: 'user',
        content: `编辑要求：${actionMap[action] || action}\n\n${selectedText ? `仅编辑以下段落：\n\n${selectedText}` : `编辑以下内容：\n\n${existingContent}`}\n\n请返回编辑后的内容：`
      }
    ]

    let result
    try {
      result = await callLLM(editPrompt)
      ctx.logger.info('Content edited via LLM', { tokensUsed: result.tokens })
    } catch (e) {
      return {
        success: false,
        error: `LLM 调用失败: ${String(e)}`,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    // 应用编辑
    let editedContent: string
    if (selectedText) {
      if (!existingContent.includes(selectedText)) {
        return {
          success: false,
          error: '无法在原文中找到需替换的段落',
          tokensUsed: result.tokens,
          cost: result.cost
        }
      }
      editedContent = existingContent.replace(selectedText, result.content)
    } else {
      editedContent = result.content
    }

    // 保存修改
    try {
      await saveFile(targetPath, editedContent, ctx.taskId)
    } catch (saveError) {
      const errorMsg = saveError instanceof Error ? saveError.message : String(saveError)
      return {
        success: false,
        error: errorMsg,
        tokensUsed: result.tokens,
        cost: result.cost
      }
    }

    ctx.logger.info('Saved edited content to file', { path: targetPath })

    // 创建 Git 提交
    ctx.logger.info('Committing changes to git', { path: targetPath })
    await gitCommit(targetPath, `agent(${ctx.taskId}): ${actionMap[action] || action}`)

    return {
      success: true,
      data: {
        message: `已${actionMap[action] || '编辑'}，保存至 ${targetPath}`,
        path: targetPath
      },
      tokensUsed: result.tokens,
      cost: result.cost
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

    // 注意：实际实现需要集成搜索 API（如 SerpAPI、Google Custom Search）
    // 这里使用 LLM 生成模拟搜索结果
    const researchPrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个研究助手。基于用户的查询，提供相关的研究信息和资料。以结构化格式返回结果。`
      },
      {
        role: 'user',
        content: `研究主题：${query}\n\n请提供以下信息：\n1. 核心概念解释\n2. 相关技术和方法\n3. 最新进展（如有）\n4. 推荐的学习资源\n\n请以 Markdown 格式返回：`}
    ]

    const result = await callLLM(researchPrompt)

    // 解析结果
    const sections = result.content.split('\n## ').filter(Boolean)
    const findings = sections.map(s => {
      const lines = s.trim().split('\n')
      return {
        title: lines[0].replace(/^#+\s*/, ''),
        content: lines.slice(1).join('\n').trim()
      }
    })

    return {
      success: true,
      data: {
        message: `研究完成，找到 ${findings.length} 个相关主题`,
        query,
        findings,
        summary: findings[0]?.content || ''
      },
      tokensUsed: result.tokens,
      cost: result.cost,
      nextSteps: ['基于研究结果写文章', '深入研究某个子主题', '保存到知识库']
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
    const entities = await ctx.memory.entities.extractFromContent(content, targetPath)

    // 使用 LLM 发现潜在的知识关联
    let suggestions: string[] = []
    if (discoverNew && entities.length > 0) {
      const discoveryPrompt: LLMMessage[] = [
        {
          role: 'system',
          content: `你是一个知识图谱专家。基于提取的实体，建议可能的知识关联和缺失的链接。`
        },
        {
          role: 'user',
          content: `已提取的实体：\n${entities.map(e => `- ${e.name} (${e.type})`).join('\n')}\n\n请建议：\n1. 可能的知识关联\n2. 缺失的内部链接\n3. 建议创建的新文章\n\n以列表格式返回：`
        }
      ]

      const result = await callLLM(discoveryPrompt)
      suggestions = result.content.split('\n').filter(s => s.trim().startsWith('-') || s.trim().startsWith('*'))
    }

    return {
      success: true,
      data: {
        message: `知识图谱已更新，提取了 ${entities.length} 个实体`,
        entities: entities.map(e => ({ name: e.name, type: e.type })),
        suggestions: suggestions.slice(0, 5)
      },
      tokensUsed: discoverNew ? 200 : 0, // 估算值
      cost: discoverNew ? 0.004 : 0
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

    const explainPrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的代码解释专家。为给定的代码生成清晰的教学文档。使用 ${detailLevel} 详细程度。`
      },
      {
        role: 'user',
        content: `语言：${language}\n\n代码：\n\`\`\`${language}\n${code}\n\`\`\`\n\n请生成包含以下内容的技术文档：\n1. 代码功能概述\n2. 关键函数/类解释\n3. 算法或逻辑说明\n4. 使用示例\n5. 与相关知识点的联系\n\n使用 Markdown 格式：`
      }
    ]

    const result = await callLLM(explainPrompt)

    // 如果提供了目标路径，保存文档
    let savedPath: string | null = null
    if (targetPath) {
      const docContent = `# 代码解释\n\n${result.content}\n\n## 源代码\n\n\`\`\`${language}\n${code}\n\`\`\``
      try {
        await saveFile(targetPath, docContent, ctx.taskId)
        savedPath = targetPath
      } catch {
        // 保存失败不影响返回结果
      }
    }

    return {
      success: true,
      data: {
        message: savedPath 
          ? `已生成代码解释文档，保存至 ${savedPath}`
          : '代码解释生成完成',
        explanation: result.content,
        savedPath
      },
      tokensUsed: result.tokens,
      cost: result.cost
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
    const contextText = ragContext.map(r => r.content).join('\n\n---\n\n')

    const answerPrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个知识助手。基于提供的上下文回答问题。如果上下文中没有相关信息，请明确说明。`
      },
      {
        role: 'user',
        content: `${contextText ? `相关上下文：\n\n${contextText}\n\n---\n\n` : ''}问题：${question}\n\n请回答：`
      }
    ]

    const result = await callLLM(answerPrompt)

    return {
      success: true,
      data: {
        message: result.content,
        sources: ragContext.map(r => r.source),
        confidence: ragContext.length > 0 ? Math.max(...ragContext.map(r => r.score)) : 0.5
      },
      tokensUsed: result.tokens,
      cost: result.cost
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

    const styleMap: Record<string, string> = {
      concise: '简洁版，一句话概括核心内容',
      detailed: '详细版，包含主要观点和结论',
      bullet: '要点版，使用 bullet points 列出关键信息',
      tweet: 'Twitter 风格，限制在 280 字符内'
    }

    const summarizePrompt: LLMMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的内容摘要专家。为给定的文章生成摘要。${styleMap[style] || styleMap.concise}`
      },
      {
        role: 'user',
        content: `文章内容：\n\n${content.substring(0, 8000)}${content.length > 8000 ? '\n...(内容已截断)' : ''}\n\n请生成${styleMap[style] || '摘要'}（约 ${maxLength} 字）：`
      }
    ]

    const result = await callLLM(summarizePrompt)

    return {
      success: true,
      data: {
        message: '摘要生成完成',
        summary: result.content,
        originalLength: content.length,
        summaryLength: result.content.length
      },
      tokensUsed: result.tokens,
      cost: result.cost
    }
  }
}

// ============================================
// 文件和 Git 操作
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

async function gitCommit(path: string, message: string): Promise<void> {
  try {
    const res = await fetch('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: path, message })
    })
    if (!res.ok) {
      console.warn(`[Git] Commit failed: ${await res.text()}`)
    } else {
      console.log(`[Git] ${message}: ${path}`)
    }
  } catch (e) {
    console.warn(`[Git] Fetch failed: ${String(e)}`)
  }
}

async function slugifyAsync(text: string): Promise<string> {
  try {
    const res = await fetch('/api/utils/slugify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (res.ok) {
      const data = await res.json()
      if (data.slug) return data.slug
    }
  } catch (e) {
    // silently fallback
  }
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

// 导入文章操作技能
import { 
  CreateArticleSkill, 
  DeleteArticleSkill, 
  ListArticlesSkill,
  MoveArticleSkill,
  UpdateArticleMetadataSkill 
} from './articleSkills'

// 导入降级技能
import { 
  ResearchWithFallbackSkill,
  FetchContentWithRetrySkill
} from './ResearchWithFallbackSkill'

// 导出所有内置技能
export const builtinSkills = [
  WriteArticleSkill,
  EditContentSkill,
  ResearchWebSkill,
  UpdateGraphSkill,
  CodeExplainSkill,
  AnswerQuestionSkill,
  SummarizeSkill,
  // 文章操作技能
  CreateArticleSkill,
  DeleteArticleSkill,
  ListArticlesSkill,
  MoveArticleSkill,
  UpdateArticleMetadataSkill,
  // 降级技能（带优雅错误处理）
  ResearchWithFallbackSkill,
  FetchContentWithRetrySkill
]
