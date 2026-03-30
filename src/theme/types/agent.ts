/**
 * Agent 系统 - 统一类型定义
 * 
 * 架构设计（参考 Claude Code Skills）：
 * - Agent Identity: "你是谁"（baseRole 定义）
 * - Skills: "你能做什么"（按需加载的能力模块）
 * - Tools: "你有什么工具"（可执行函数）
 * 
 * Skill 设计原则：
 * - Skill 不是身份定义，而是能力扩展
 * - Skill 详细内容在调用时注入对话上下文
 * - 系统提示词只包含 Skills 列表（name + description）
 */

import type { ToolDefinition } from '@/theme/tools/types'

// ==================== 基础类型 ====================

/** 能力类型 */
export type CapabilityType = 'skill' | 'tool'

/** 
 * Agent 配置模式（Claude Code 模式）
 * Agent 定义 availableSkills，AI 自行判断调用
 */
export type AgentConfigMode = 'claude-code'

/** 技能分类 */
export type SkillCategory = 
  | 'general'      // 通用
  | 'writing'      // 写作
  | 'coding'       // 编程
  | 'analysis'     // 分析
  | 'creative'     // 创意
  | 'research'     // 研究
  | 'custom'       // 自定义

// ==================== Skill 定义 ====================

/**
 * Skill 定义 - 能力扩展模块
 * 
 * 参考 Claude Code Skills 设计：
 * - description: 简短描述，用于列表展示和意图匹配
 * - content: SKILL.md 完整内容，调用时注入对话
 * - tools: 该 Skill 需要的工具
 */
export interface Skill {
  id: string
  name: string
  icon: string
  /** 
   * 简短描述 - 用于：
   * 1. UI 列表展示
   * 2. Agent 判断是否需要调用该 Skill
   * 3. 系统提示词中的 Skills 列表
   */
  description: string
  /** 
   * SKILL.md 完整内容 - 包含：
   * - 详细使用说明
   * - 场景示例
   * - 工具调用指南
   * - 脚本引用等
   * 
   * 调用时动态注入到对话上下文
   */
  content: string
  category: SkillCategory
  version: string
  isBuiltIn: boolean
  enabled: boolean
  createdAt: number
  updatedAt: number
  tags: string[]
  /** 
   * 该 Skill 需要的工具（工具名列表）
   * Agent 调用 Skill 时，这些工具必须可用
   */
  tools: string[]
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
   * 使用场景列表
   * 用于匹配用户意图，决定何时调用该 Skill
   */
  usageScenarios: string[]
  /** 
   * 资源基路径
   * 用于定位 Skill 关联的脚本、模板等资源
   */
  basePath?: string
  /** 作者 */
  author?: string
}

/** 
 * Skill 创建参数
 */
export interface SkillCreateParams {
  name: string
  icon?: string
  description: string
  content: string
  category?: SkillCategory
  tags?: string[]
  tools?: string[]
  basePath?: string
}

/** 
 * Skill 元数据（用于系统提示词）
 * 只包含基本信息，不包含详细内容
 */
export interface SkillMetadata {
  id: string
  name: string
  description: string
}

// ==================== Tool 定义 ====================

/** 工具定义 - 来自 definitions.ts */
export interface Tool {
  name: string
  description: string
  icon?: string
  definition: ToolDefinition
  category?: string
}

// ==================== Agent 定义 ====================

/** Agent 等级 */
export type AgentLevel = 'meta' | 'core' | 'fixed' | 'custom' | 'temp'

/** Agent 状态 */
export type AgentStatus = 'online' | 'offline' | 'busy' | 'idle'

/** Agent 权限 */
export interface AgentPermission {
  id: string
  name: string
  description: string
  granted: boolean
}

/** Agent 记忆配置 */
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
  
  // 系统提示词（运行时计算）
  systemPrompt?: string
  
  // 运行时配置
  runtime?: AgentRuntime
  
  // 触发器
  triggers?: AgentTrigger[]
}

/** Agent 创建参数 - 与后端完全一致 */
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

// ==================== 能力图谱 ====================

/** 能力节点 */
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
export interface CapabilityEdge {
  from: string
  to: string
  type: 'contains' | 'extends'
}

/** 能力图谱 */
export interface CapabilityGraph {
  nodes: CapabilityNode[]
  edges: CapabilityEdge[]
}

// ==================== 配置模式 ====================



// ==================== Skill 调用相关 ====================

/** 
 * Skill 调用上下文
 * 当 Agent 决定调用 Skill 时，将 Skill 内容注入到对话中
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
  availableSkills: SkillMetadata[]
  activeSkills?: Skill[]  // 已调用的 Skills（完整内容）
  availableTools: Tool[]
}
