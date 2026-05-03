/**
 * ============================================================================
 * 类型定义 - agent
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/types
 */


import type { ToolDefinition } from '@/theme/tools/types'

// ═══════════════════════════════════════════════════════════════
// 从 Skills 系统重新导出类型
// ═══════════════════════════════════════════════════════════════

export type {
  ActiveSkill, Skill, SkillCategory, SkillMatchOptions, SkillMatchResult, SkillMetadata
} from '@/theme/skills/types'

// ═══════════════════════════════════════════════════════════════
// 基础类型
// ═══════════════════════════════════════════════════════════════

/** 能力类型 */
/**
 * CapabilityType 类型别名
 *
 */
export type CapabilityType = 'skill' | 'tool'

/** 
 * Agent 配置模式(Claude Code 模式)
 * Agent 定义 availableSkills,AI 自行判断调用
 */
export type AgentConfigMode = 'claude-code'

// ═══════════════════════════════════════════════════════════════
// Skill 创建参数(扩展 skills 系统的 Skill)
// ═══════════════════════════════════════════════════════════════

/**
 * SkillCreateParams 接口定义
 *
 */
export interface SkillCreateParams {
  name: string
  icon?: string
  description: string
  content: string
  category?: import('@/theme/skills/types').SkillCategory
  tags?: string[]
  tools?: string[]
  basePath?: string
}

// ═══════════════════════════════════════════════════════════════
// Tool 定义
// ═══════════════════════════════════════════════════════════════

/** 工具定义 - 来自 definitions.ts */
/**
 * Tool 接口定义
 *
 */
export interface Tool {
  name: string
  description: string
  icon?: string
  definition: ToolDefinition
  category?: string
}

// ═══════════════════════════════════════════════════════════════
// Agent 定义
// ═══════════════════════════════════════════════════════════════

/** Agent 等级 */
/**
 * AgentLevel 类型别名
 *
 */
export type AgentLevel = 'meta' | 'core' | 'fixed' | 'custom' | 'temp'

/** Agent 状态 */
/**
 * AgentStatus 类型别名
 *
 */
export type AgentStatus = 'online' | 'offline' | 'busy' | 'idle'

/** Agent 权限 */
/**
 * AgentPermission 接口定义
 *
 */
export interface AgentPermission {
  id: string
  name: string
  description: string
  granted: boolean
}

/** Agent 记忆配置 */
/**
 * AgentMemory 接口定义
 *
 */
export interface AgentMemory {
  enabled: boolean
  content: string
  autoExtract: boolean
  maxTokens: number
}

/** 
 * Agent 能力配置 - 与后端完全一致的数据结构
 */
export interface AgentCapabilities {
  /** 配置模式 */
  mode: 'raw'
  /** 技能ID列表 */
  skillIds: string[]
  /** 工具ID列表 */
  toolIds: string[]
  /** 自定义系统提示词 */
  customSystemPrompt: string
}

/** Agent 触发器 */
/**
 * AgentTrigger 接口定义
 *
 */
export interface AgentTrigger {
  id: string
  type: 'manual' | 'scheduled' | 'event' | 'webhook' | 'mention'
  name: string
  enabled: boolean
  config: {
    cron?: string
    timezone?: string
    eventName?: string
    eventFilter?: Record<string, any>
    webhookUrl?: string
    webhookSecret?: string
    mentionKeywords?: string[]
  }
  lastTriggered?: string
  triggerCount: number
}

/** Agent 运行时配置 */
/**
 * AgentRuntime 接口定义
 *
 */
export interface AgentRuntime {
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  enableReasoning?: boolean
  timeout?: number
  retryCount?: number
  retryDelay?: number
  context?: string
  state?: Record<string, any>
  /** Manager决策循环定时器ID */
  decisionIntervalId?: number
}

/** Agent 完整定义 */
export interface Agent {
  id: string
  name: string
  avatar: string
  description: string
  level: AgentLevel
  status: AgentStatus
  seat: number

  // 能力配置
  capabilities: AgentCapabilities

  // 记忆配置
  memory: AgentMemory

  // 权限
  permissions: AgentPermission[]

  // 统计
  callCount: number
  isDefault: boolean
  createdAt: number
  updatedAt: number
  lastActiveAt: number

  // 系统提示词(运行时计算)
  systemPrompt?: string

  // 运行时配置
  runtime?: AgentRuntime

  // 触发器
  triggers?: AgentTrigger[]
}

/** Agent 创建参数 - 与后端完全一致 */
/**
 * AgentCreateParams 接口定义
 *
 */
export interface AgentCreateParams {
  name: string
  avatar?: string
  description: string
  level: AgentLevel
  status?: AgentStatus
  seat?: number
  capabilities?: Partial<AgentCapabilities>
  memory?: Partial<AgentMemory>
  isDefault?: boolean
  runtime?: Partial<AgentRuntime>
  triggers?: AgentTrigger[]
  permissions?: AgentPermission[]
}

/** Agent 更新参数 - 与后端完全一致 */
/**
 * AgentUpdateParams 接口定义
 *
 */
export interface AgentUpdateParams {
  name?: string
  avatar?: string
  description?: string
  level?: AgentLevel
  seat?: number
  capabilities?: Partial<AgentCapabilities>
  memory?: Partial<AgentMemory>
  permissions?: AgentPermission[]
  lastActiveAt?: number
  callCount?: number
  status?: AgentStatus
  isDefault?: boolean
}

// ═══════════════════════════════════════════════════════════════
// 能力图谱
// ═══════════════════════════════════════════════════════════════

/** 能力节点 */
/**
 * CapabilityNode 接口定义
 *
 */
export interface CapabilityNode {
  id: string
  type: 'root' | 'skill' | 'tool'
  name: string
  icon?: string
  description?: string
  parentId?: string
  level: number
  x: number
  y: number
  isExtra?: boolean
}

/** 能力边 */
/**
 * CapabilityEdge 接口定义
 *
 */
export interface CapabilityEdge {
  from: string
  to: string
  type: 'contains' | 'extends'
}

/** 能力图谱 */
/**
 * CapabilityGraph 接口定义
 *
 */
export interface CapabilityGraph {
  nodes: CapabilityNode[]
  edges: CapabilityEdge[]
}

// ═══════════════════════════════════════════════════════════════
// Skill 调用相关
// ═══════════════════════════════════════════════════════════════

import type { Skill } from '@/theme/skills/types'

/** 
 * Skill 调用上下文
 * 当 Agent 决定调用 Skill 时,将 Skill 内容注入到对话中
 */
export interface SkillInvocation {
  skillId: string
  skillName: string
  content: string
  basePath?: string
  tools: string[]
  invokedAt: number
}

/** 
 * 系统提示词上下文
 * 用于构建最终发送给 LLM 的系统提示词
 */
export interface SystemPromptContext {
  agent: Agent
  availableSkills: import('@/theme/skills/types').SkillMetadata[]
  activeSkills?: Skill[]  // 已调用的 Skills(完整内容)
  availableTools: Tool[]
}

// ═══════════════════════════════════════════════════════════════
// 内容获取相关类型
// ═══════════════════════════════════════════════════════════════

/** 获取的内容基础接口 */
/**
 * FetchedContent 接口定义
 *
 */
export interface FetchedContent {
  title: string
  content: string
  url: string
  author?: string
  publishDate?: string
  tags: string[]
  images: string[]
}

/** 社交媒体内容 */
/**
 * SocialMediaContent 接口定义
 *
 */
export interface SocialMediaContent extends FetchedContent {
  platform: string
  originalUrl: string
  likes?: number
  comments?: number
  shares?: number
}

/** 文章内容 */
/**
 * ArticleContent 接口定义
 *
 */
export interface ArticleContent {
  title: string
  content: string
  frontmatter: Record<string, any>
  images: Array<{
    url: string
    filename: string
  }>
}
