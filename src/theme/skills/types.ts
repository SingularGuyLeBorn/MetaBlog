/**
 * Skill System - 类型定义
 * 
 * Claude Code 风格的 Skills + Tools 整合系统
 * 核心概念：渐进式披露 (Progressive Disclosure)
 */

// ═══════════════════════════════════════════════════════════════
// LOD-0: 轻量级元数据 (始终保留在 System Prompt 中)
// ═══════════════════════════════════════════════════════════════

/** Skill 元数据 - LOD-0 层级 */
export interface SkillMetadata {
  /** Skill 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 一句话描述 */
  description: string
  /** 图标 emoji */
  icon: string
  /** 分类 */
  category: SkillCategory
  /** 版本 */
  version: string
  /** 标签/关键词 */
  tags: string[]
  /** 作者 */
  author: string
  /** 是否内置 */
  isBuiltIn: boolean
  /** 是否启用 */
  enabled: boolean
  /** 该 Skill 声明的工具列表 */
  tools: string[]
  /** 使用场景（用于匹配） */
  usageScenarios: string[]
}

/** Skill 分类 */
export type SkillCategory = 
  | 'content'      // 内容管理
  | 'research'     // 学术研究
  | 'code'         // 代码开发
  | 'coding'       // 编程开发（兼容旧代码）
  | 'file'         // 文件管理
  | 'system'       // 系统工具
  | 'multimedia'   // 多媒体处理
  | 'general'      // 通用
  | 'writing'      // 写作
  | 'analysis'     // 分析
  | 'creative'     // 创意
  | 'custom'       // 自定义

// ═══════════════════════════════════════════════════════════════
// LOD-1: 工具定义 (通过 Function Calling 提供)
// ═══════════════════════════════════════════════════════════════

/** 工具定义 - 符合 OpenAI Function Calling 规范 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// LOD-2: 完整 Skill 内容 (匹配时注入)
// ═══════════════════════════════════════════════════════════════

/** 完整 Skill 定义 */
export interface Skill extends SkillMetadata {
  /** 完整 Prompt 内容 (LOD-2) */
  content: string
  /** 附加资源文件路径 */
  resources?: string[]
  /** 创建时间 */
  createdAt: number
  /** 更新时间 */
  updatedAt: number
  /**
   * 工具的详细定义（从 SKILL.md 解析）
   * { toolName: { description, params: [{ name, type, description }] } }
   */
  toolDefinitions?: Record<string, {
    name: string
    description: string
    params: { name: string; type: string; description: string }[]
  }>
  /** 
   * 资源基路径
   * 用于定位 Skill 关联的脚本、模板等资源
   */
  basePath?: string
  /** 作者 */
  author?: string
}

/** 激活的 Skill (已加载到上下文中) */
export interface ActiveSkill extends Skill {
  /** 激活时间 */
  activatedAt: number
  /** 激活原因/来源 */
  activationSource: 'auto' | 'manual' | 'ai_request'
  /** 匹配分数 (如果是自动匹配) */
  matchScore?: number
}

// ═══════════════════════════════════════════════════════════════
// Skill 匹配相关类型
// ═══════════════════════════════════════════════════════════════

/** Skill 匹配结果 */
export interface SkillMatchResult {
  skill: SkillMetadata
  /** 匹配分数 0-1 */
  score: number
  /** 匹配原因 */
  reason: string
  /** 匹配的关键词 */
  matchedKeywords: string[]
}

/** Skill 匹配选项 */
export interface SkillMatchOptions {
  /** 匹配阈值 (默认 0.3) */
  threshold?: number
  /** 最大匹配数量 (默认 3) */
  maxMatches?: number
  /** 强制包含的 Skill IDs */
  include?: string[]
  /** 强制排除的 Skill IDs */
  exclude?: string[]
}

// ═══════════════════════════════════════════════════════════════
// System Prompt 构建相关类型
// ═══════════════════════════════════════════════════════════════

/** System Prompt 构建上下文 */
export interface PromptBuildContext {
  /** 基础角色定义 */
  baseRole: string
  /** 用户输入 */
  userInput: string
  /** 所有可用 Skill 元数据 */
  availableSkills: SkillMetadata[]
  /** 已激活的 Skills */
  activeSkills: ActiveSkill[]
  /** 是否显示工具列表 */
  showTools?: boolean
  /** 可用的工具定义 */
  availableTools?: ToolDefinition[]
}

/** Prompt 构建选项 */
export interface PromptBuildOptions {
  /** 是否包含 LOD-0 (Skill 列表) */
  includeLOD0?: boolean
  /** 是否包含 LOD-1 (工具定义摘要) */
  includeLOD1?: boolean
  /** 是否包含 LOD-2 (激活 Skill 的完整内容) */
  includeLOD2?: boolean
  /** 是否显示工具说明 */
  showToolInstructions?: boolean
}

// ═══════════════════════════════════════════════════════════════
// Skill 存储/加载相关类型
// ═══════════════════════════════════════════════════════════════

/** Skill 文件解析结果 */
export interface ParsedSkillFile {
  metadata: SkillMetadata
  /** 正文内容 (不含 frontmatter) */
  content: string
  /** 提取的 Prompt 部分 */
  prompt: string
}

/** Skill 加载器配置 */
export interface SkillLoaderConfig {
  /** Skill 文件目录 */
  skillsDir: string
  /** 是否自动加载所有 Skill */
  autoLoad?: boolean
  /** 缓存过期时间 (ms) */
  cacheTTL?: number
}

// ═══════════════════════════════════════════════════════════════
// 运行时状态类型
// ═══════════════════════════════════════════════════════════════

/** Skill 运行时状态 */
export interface SkillRuntimeState {
  /** 所有可用 Skills */
  availableSkills: SkillMetadata[]
  /** 当前激活的 Skills */
  activeSkills: ActiveSkill[]
  /** Skill 匹配历史 */
  matchHistory: SkillMatchRecord[]
  /** 最后更新时间 */
  lastUpdated: number
}

/** Skill 匹配记录 */
export interface SkillMatchRecord {
  timestamp: number
  userInput: string
  matchedSkills: string[]
  activationSource: 'auto' | 'manual' | 'ai_request'
}
