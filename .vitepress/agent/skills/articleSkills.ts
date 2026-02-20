/**
 * Article Skills - AI 可执行的文章操作技能
 * 让 Agent 能够创建、删除、移动、更新文章
 * 
 * 类型安全：所有技能参数都有严格的 TypeScript 接口定义
 * 
 * P0-R2 修复：统一使用 api/files.ts 封装，确保文件锁机制生效
 */
import type { Skill, SkillContext, SkillResult } from '../core/types'
import { getLLMManager, type LLMMessage } from '../llm'
import { saveFile, deleteFile, checkFileExists, generateFileNameAsync, listDirectory, type FileInfo } from '../api/files'

// ============================================
// 类型定义
// ============================================

/**
 * 创建文章技能参数
 */
interface CreateArticleParams {
  /** 文章主题/标题 */
  topic: string
  /** 目标栏目 */
  section?: string
  /** 标签列表 */
  tags?: string[]
  /** 写作风格 */
  style?: string
  /** 文章长度 */
  length?: 'short' | 'medium' | 'long'
  /** 指定目标路径 */
  targetPath?: string
  /** 参考文章路径 */
  referenceArticles?: string[]
  /** 是否确认覆盖已存在的文件 */
  confirmOverwrite?: boolean
}

/**
 * 删除文章技能参数
 */
interface DeleteArticleParams {
  /** 要删除的文件路径 */
  path: string
  /** 是否已确认删除 */
  confirm?: boolean
  /** 是否永久删除（否则软删除到回收站） */
  permanent?: boolean
}

/**
 * 列出文章技能参数
 */
interface ListArticlesParams {
  /** 目录路径 */
  path?: string
  /** 过滤关键词 */
  filter?: string
}

/**
 * 移动文章技能参数
 */
interface MoveArticleParams {
  /** 源路径 */
  from: string
  /** 目标路径 */
  to: string
}

/**
 * 更新元数据技能参数
 */
interface UpdateMetadataParams {
  /** 文件路径 */
  path: string
  /** 新标题 */
  title?: string
  /** 新标签 */
  tags?: string[]
  /** 新分类 */
  category?: string
  /** 新日期 */
  date?: string
  /** 新描述 */
  description?: string
  /** 其他元数据 */
  [key: string]: any
}

/**
 * 编辑文章内容技能参数
 */
interface EditContentParams {
  /** 文件路径 */
  path: string
  /** 编辑指令 */
  instruction: string
  /** 选中的文本 */
  selectedText?: string
}

// ============================================
// 参数校验辅助函数
// ============================================

/**
 * 校验必需参数
 */
function validateRequiredParams<T extends Record<string, any>>(
  params: T,
  required: string[],
  skillName: string
): { valid: boolean; error?: string } {
  for (const key of required) {
    if (params[key] === undefined || params[key] === null || params[key] === '') {
      return {
        valid: false,
        error: `[${skillName}] 缺少必需参数: ${key}`
      }
    }
  }
  return { valid: true }
}

/**
 * 安全获取字符串参数
 */
function safeString(value: unknown, defaultValue: string = ''): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return defaultValue
  return String(value)
}

/**
 * 安全获取字符串数组
 */
function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  return []
}

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

// ============================================
// Skill 1: CreateArticleSkill
// ============================================

export const CreateArticleSkill: Skill = {
  name: 'CreateArticle',
  description: '创建新文章或博客内容',
  intentPattern: /(?:创建|新建|写|生成).{0,5}(?:文章|博客|文档|内容)/i,
  requiredParams: ['topic'],
  optionalParams: ['section', 'tags', 'style', 'length', 'targetPath', 'referenceArticles'],
  
  handler: async (ctx: SkillContext, rawParams: unknown): Promise<SkillResult> => {
    // 参数类型转换和默认值
    const params: CreateArticleParams = {
      topic: safeString((rawParams as Record<string, unknown>)?.topic),
      section: safeString((rawParams as Record<string, unknown>)?.section, 'posts'),
      tags: safeStringArray((rawParams as Record<string, unknown>)?.tags),
      style: safeString((rawParams as Record<string, unknown>)?.style, '技术博客'),
      length: ((rawParams as Record<string, unknown>)?.length as 'short' | 'medium' | 'long') || 'medium',
      targetPath: safeString((rawParams as Record<string, unknown>)?.targetPath),
      referenceArticles: safeStringArray((rawParams as Record<string, unknown>)?.referenceArticles),
      confirmOverwrite: (rawParams as Record<string, unknown>)?.confirmOverwrite === true
    }
    
    // 参数校验
    const validation = validateRequiredParams(params, ['topic'], 'CreateArticle')
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    const { topic, section, tags, style, targetPath, referenceArticles } = params
    
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
        content: `主题为："${topic}"\n风格：${style}\n长度：${params.length}\n\n${context.length > 0 ? `相关文章：\n${context.map(c => `- ${c.metadata.title || c.source}`).join('\n')}` : ''}\n\n请生成文章大纲：`
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
${(tags || []).map((t: string) => `  - ${t}`).join('\n')}
wikiLinks:
${relatedArticles.map(r => `  - ${r}`).join('\n')}
---`
    
    // 5. 保存文件
    const fullContent = `${frontmatter}\n\n${content.content}`
    const fileName = await generateFileNameAsync(topic)
    const filePath = targetPath || `${section}/${fileName}`
    
    // P1-2: 检查文件是否已存在
    const fileExists = await checkFileExists(filePath)
    if (fileExists && !params.confirmOverwrite) {
      return {
        success: true, // 返回成功但要求确认
        data: {
          message: `文件 ${filePath} 已存在。是否覆盖？`,
          requiresConfirmation: true,
          confirmAction: 'overwrite',
          filePath
        },
        tokensUsed: outline.tokens + content.tokens,
        cost: outline.cost + content.cost
      }
    }
    
    // P0-R2 修复：使用 api/files.ts 的 saveFile，支持 taskId 和文件锁
    ctx.logger.info('Saving file', { path: filePath, overwrite: params.confirmOverwrite })
    try {
      await saveFile(filePath, fullContent, ctx.taskId, params.confirmOverwrite)
    } catch (saveError) {
      const errorMsg = saveError instanceof Error ? saveError.message : String(saveError)
      return {
        success: false,
        error: errorMsg,
        tokensUsed: outline.tokens + content.tokens,
        cost: outline.cost + content.cost
      }
    }
    
    // 6. 文件保存成功后，提取实体并更新知识图谱
    // P0-4 修复：实体提取移至保存成功后
    try {
      await ctx.memory.entities.extractFromContent(fullContent, filePath)
      ctx.logger.info('Entities extracted', { path: filePath })
    } catch (entityError) {
      // 实体提取失败不影响主流程，仅记录警告
      ctx.logger.warn('Failed to extract entities', { 
        path: filePath, 
        error: String(entityError) 
      })
    }
    
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
  description: '删除指定文章（支持软删除和永久删除）',
  intentPattern: /(?:删除|移除).{0,5}(?:文章|文档|文件)/i,
  requiredParams: ['path'],
  optionalParams: ['confirm', 'permanent'],
  
  handler: async (ctx: SkillContext, rawParams: unknown): Promise<SkillResult> => {
    // 参数类型转换和默认值
    const params: DeleteArticleParams = {
      path: safeString((rawParams as Record<string, unknown>)?.path),
      confirm: Boolean((rawParams as Record<string, unknown>)?.confirm),
      permanent: Boolean((rawParams as Record<string, unknown>)?.permanent)
    }
    
    // 参数校验
    const validation = validateRequiredParams(params, ['path'], 'DeleteArticle')
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    const { path, confirm, permanent } = params
    
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
    
    ctx.logger.info('Attempting to delete article', { path: mdPath, permanent })
    
    // 如果没有确认，先询问
    if (!confirm) {
      const actionText = permanent ? '永久删除' : '删除（移至回收站）'
      return {
        success: true,
        data: {
          message: `确定要${actionText}文章 ${mdPath} 吗？${permanent ? '此操作不可恢复。' : '可在 30 天内从回收站恢复。'}`,
          requiresConfirmation: true,
          path: mdPath
        },
        tokensUsed: 0,
        cost: 0
      }
    }
    
    // P0-R2 修复：使用 api/files.ts 的 deleteFile
    let trashId: string | undefined
    try {
      const result = await deleteFile(mdPath, permanent)
      trashId = result.trashId
    } catch (deleteError) {
      const errorMsg = deleteError instanceof Error ? deleteError.message : String(deleteError)
      return {
        success: false,
        error: errorMsg,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    ctx.logger.info('Article deleted successfully', { 
      path: mdPath, 
      permanent, 
      trashId 
    })
    
    const successMessage = permanent 
      ? `文章 ${mdPath} 已永久删除`
      : `文章 ${mdPath} 已删除并移至回收站（ID: ${trashId}）`
    
    return {
      success: true,
      data: {
        message: successMessage,
        path: mdPath,
        trashId
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
  
  handler: async (ctx: SkillContext, rawParams: unknown): Promise<SkillResult> => {
    // 参数类型转换和默认值
    const params: ListArticlesParams = {
      path: safeString((rawParams as Record<string, unknown>)?.path, ''),
      filter: safeString((rawParams as Record<string, unknown>)?.filter)
    }
    
    const { path, filter } = params
    
    ctx.logger.info('Listing articles', { path, filter })
    
    let files: FileInfo[]
    try {
      files = await listDirectory(path)
    } catch (listError) {
      return {
        success: false,
        error: listError instanceof Error ? listError.message : String(listError),
        tokensUsed: 0,
        cost: 0
      }
    }
    
    // 只返回 Markdown 文件
    let markdownFiles = files.filter((f: FileInfo) => 
      f.type === 'file' && f.name.endsWith('.md')
    )
    
    // 应用过滤器
    if (filter) {
      const filterLower = filter.toLowerCase()
      markdownFiles = markdownFiles.filter((f: FileInfo) => 
        f.name.toLowerCase().includes(filterLower)
      )
    }
    
    return {
      success: true,
      data: {
        message: `找到 ${markdownFiles.length} 篇文章`,
        articles: markdownFiles.map((f: FileInfo) => ({
          name: f.name,
          path: f.path,
          modifiedAt: f.modifiedAt
        })),
        count: markdownFiles.length
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
  
  handler: async (ctx: SkillContext, rawParams: unknown): Promise<SkillResult> => {
    // 参数类型转换
    const params: MoveArticleParams = {
      from: safeString((rawParams as Record<string, unknown>)?.from),
      to: safeString((rawParams as Record<string, unknown>)?.to)
    }
    
    // 参数校验
    const validation = validateRequiredParams(params, ['from', 'to'], 'MoveArticle')
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    const { from, to } = params
    
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
  
  handler: async (ctx: SkillContext, rawParams: unknown): Promise<SkillResult> => {
    // 参数类型转换
    const params: UpdateMetadataParams = {
      path: safeString((rawParams as Record<string, unknown>)?.path),
      title: safeString((rawParams as Record<string, unknown>)?.title),
      tags: safeStringArray((rawParams as Record<string, unknown>)?.tags),
      category: safeString((rawParams as Record<string, unknown>)?.category),
      date: safeString((rawParams as Record<string, unknown>)?.date),
      description: safeString((rawParams as Record<string, unknown>)?.description)
    }
    
    // 参数校验
    const validation = validateRequiredParams(params, ['path'], 'UpdateArticleMetadata')
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        tokensUsed: 0,
        cost: 0
      }
    }
    
    const { path, ...metadata } = params
    
    // 过滤掉 undefined 的值
    const filteredMetadata: Record<string, any> = {}
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== '') {
        filteredMetadata[key] = value
      }
    }
    
    if (Object.keys(filteredMetadata).length === 0) {
      return {
        success: false,
        error: '没有提供要更新的元数据字段',
        tokensUsed: 0,
        cost: 0
      }
    }
    
    ctx.logger.info('Updating article metadata', { path, metadata: filteredMetadata })
    
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
      const newMeta = { ...existingMeta, ...filteredMetadata }
      
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
      await saveFile(path, fullContent, ctx.taskId)
      
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

// 导出类型（供外部使用）
export type {
  CreateArticleParams,
  DeleteArticleParams,
  ListArticlesParams,
  MoveArticleParams,
  UpdateMetadataParams
}
