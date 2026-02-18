/**
 * Article Skills - AI 可执行的文章操作技能
 * 让 Agent 能够创建、删除、移动、更新文章
 */
import type { Skill, SkillContext, SkillResult } from '../core/types'
import { getLLMManager, type LLMMessage } from '../llm'

// ============================================
// 辅助函数
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

async function deleteFile(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    })
    if (res.ok) {
      return { success: true }
    }
    return { success: false, error: await res.text() }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

async function listFiles(path: string = ''): Promise<{ success: boolean; files?: any[]; error?: string }> {
  try {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`)
    if (res.ok) {
      const files = await res.json()
      return { success: true, files }
    }
    return { success: false, error: await res.text() }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
}

function generateFileName(title: string): string {
  const dateStr = new Date().toISOString().split('T')[0]
  return `${dateStr}-${slugify(title)}.md`
}

// ============================================
// Skill 1: CreateArticleSkill
// ============================================

export const CreateArticleSkill: Skill = {
  name: 'CreateArticle',
  description: '创建新文章或博客内容',
  intentPattern: /(?:创建|新建|写|生成).{0,5}(?:文章|博客|文档|内容)/i,
  requiredParams: ['topic'],
  optionalParams: ['section', 'tags', 'style', 'length', 'targetPath'],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { 
      topic, 
      section = 'posts', 
      tags = [], 
      style = '技术博客', 
      length = 'medium',
      targetPath 
    } = params
    
    ctx.logger.info('Starting article creation', { topic, section, style })
    
    // 1. 构建上下文 - 获取相关文章
    const context = await ctx.memory.buildContext(topic)
    const relatedArticles = context.map(c => c.metadata.title || c.source).slice(0, 3)
    
    // 2. 生成大纲
    ctx.logger.info('Generating outline', { topic })
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
    ctx.logger.info('Generating content', { topic })
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
    const frontmatter = `---
title: ${topic}
date: ${date}
tags:
${tags.map((t: string) => `  - ${t}`).join('\n')}
wikiLinks:
${relatedArticles.map(r => `  - ${r}`).join('\n')}
---`
    
    // 5. 保存文件
    const fullContent = `${frontmatter}\n\n${content.content}`
    const fileName = generateFileName(topic)
    const filePath = targetPath || `${section}/${fileName}`
    
    ctx.logger.info('Saving file', { path: filePath })
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
// Skill 2: DeleteArticleSkill
// ============================================

export const DeleteArticleSkill: Skill = {
  name: 'DeleteArticle',
  description: '删除指定文章',
  intentPattern: /(?:删除|移除).{0,5}(?:文章|文档|文件)/i,
  requiredParams: ['path'],
  optionalParams: ['confirm'],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { path, confirm = false } = params
    
    if (!path) {
      return {
        success: false,
        error: '未指定要删除的文件路径',
        tokensUsed: 0,
        cost: 0
      }
    }
    
    // 转换路径
    const mdPath = path.replace(/\.html$/, '.md')
    
    ctx.logger.info('Attempting to delete article', { path: mdPath })
    
    // 如果没有确认，先询问
    if (!confirm) {
      return {
        success: true,
        data: {
          message: `确定要删除文章 ${mdPath} 吗？此操作不可恢复。`,
          requiresConfirmation: true,
          path: mdPath
        },
        tokensUsed: 0,
        cost: 0
      }
    }
    
    // 执行删除
    const deleteResult = await deleteFile(mdPath)
    
    if (!deleteResult.success) {
      return {
        success: false,
        error: deleteResult.error,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    ctx.logger.info('Article deleted successfully', { path: mdPath })
    
    return {
      success: true,
      data: {
        message: `文章 ${mdPath} 已删除`,
        path: mdPath
      },
      tokensUsed: 0,
      cost: 0
    }
  }
}

// ============================================
// Skill 3: ListArticlesSkill
// ============================================

export const ListArticlesSkill: Skill = {
  name: 'ListArticles',
  description: '列出所有文章或特定目录下的文章',
  intentPattern: /(?:列出|查看|显示).{0,5}(?:文章|文档|文件)/i,
  requiredParams: [],
  optionalParams: ['path', 'filter'],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { path = '', filter } = params
    
    ctx.logger.info('Listing articles', { path, filter })
    
    const listResult = await listFiles(path)
    
    if (!listResult.success) {
      return {
        success: false,
        error: listResult.error,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    // 只返回 Markdown 文件
    let files = listResult.files?.filter(f => 
      f.type === 'file' && f.name.endsWith('.md')
    ) || []
    
    // 应用过滤器
    if (filter) {
      const filterLower = filter.toLowerCase()
      files = files.filter(f => 
        f.name.toLowerCase().includes(filterLower)
      )
    }
    
    return {
      success: true,
      data: {
        message: `找到 ${files.length} 篇文章`,
        articles: files.map(f => ({
          name: f.name,
          path: f.path,
          modifiedAt: f.modifiedAt
        })),
        count: files.length
      },
      tokensUsed: 0,
      cost: 0
    }
  }
}

// ============================================
// Skill 4: MoveArticleSkill
// ============================================

export const MoveArticleSkill: Skill = {
  name: 'MoveArticle',
  description: '移动文章到不同目录',
  intentPattern: /(?:移动|迁移|转移).{0,5}(?:文章|文档|文件)/i,
  requiredParams: ['from', 'to'],
  optionalParams: [],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { from, to } = params
    
    if (!from || !to) {
      return {
        success: false,
        error: '需要指定源路径和目标路径',
        tokensUsed: 0,
        cost: 0
      }
    }
    
    ctx.logger.info('Moving article', { from, to })
    
    try {
      const res = await fetch('/api/files/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
      })
      
      if (!res.ok) {
        throw new Error(await res.text())
      }
      
      return {
        success: true,
        data: {
          message: `文章已从 ${from} 移动到 ${to}`,
          from,
          to
        },
        tokensUsed: 0,
        cost: 0
      }
    } catch (error) {
      return {
        success: false,
        error: `移动失败: ${(error as Error).message}`,
        tokensUsed: 0,
        cost: 0
      }
    }
  }
}

// ============================================
// Skill 5: UpdateArticleMetadataSkill
// ============================================

export const UpdateArticleMetadataSkill: Skill = {
  name: 'UpdateArticleMetadata',
  description: '更新文章的 frontmatter 元数据',
  intentPattern: /(?:更新|修改|设置).{0,5}(?:元数据|标签|分类|标题)/i,
  requiredParams: ['path'],
  optionalParams: ['title', 'tags', 'category', 'date', 'description'],
  
  handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
    const { path, ...metadata } = params
    
    if (!path) {
      return {
        success: false,
        error: '未指定文件路径',
        tokensUsed: 0,
        cost: 0
      }
    }
    
    ctx.logger.info('Updating article metadata', { path, metadata })
    
    try {
      // 1. 读取现有内容
      const readRes = await fetch(`/api/files/read?path=${encodeURIComponent(path)}`)
      if (!readRes.ok) {
        throw new Error('无法读取文件')
      }
      
      let content = await readRes.text()
      
      // 2. 解析现有的 frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
      let existingMeta: Record<string, any> = {}
      
      if (frontmatterMatch) {
        // 解析 YAML (简化版)
        const yamlContent = frontmatterMatch[1]
        yamlContent.split('\n').forEach(line => {
          const match = line.match(/^(\w+):\s*(.+)$/)
          if (match) {
            existingMeta[match[1]] = match[2].trim()
          }
        })
        // 移除旧的 frontmatter
        content = content.slice(frontmatterMatch[0].length)
      }
      
      // 3. 合并元数据
      const newMeta = { ...existingMeta, ...metadata }
      
      // 4. 构建新的 frontmatter
      const newFrontmatter = `---\n${Object.entries(newMeta)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`
          }
          return `${key}: ${value}`
        })
        .join('\n')}\n---\n`
      
      // 5. 保存
      const fullContent = newFrontmatter + content
      const saveResult = await saveFile(path, fullContent)
      
      if (!saveResult.success) {
        throw new Error(saveResult.error)
      }
      
      return {
        success: true,
        data: {
          message: `文章元数据已更新`,
          path,
          metadata: newMeta
        },
        tokensUsed: 0,
        cost: 0
      }
    } catch (error) {
      return {
        success: false,
        error: `更新失败: ${(error as Error).message}`,
        tokensUsed: 0,
        cost: 0
      }
    }
  }
}

// ============================================
// 导出所有文章技能
// ============================================

export const articleSkills = [
  CreateArticleSkill,
  DeleteArticleSkill,
  ListArticlesSkill,
  MoveArticleSkill,
  UpdateArticleMetadataSkill
]
