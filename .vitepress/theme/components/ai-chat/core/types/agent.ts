/**
 * Agent 系统 - 统一类型定义
 * 
 * 架构设计：
 * - Capability（能力）：Skills 和 Tools 的统称
 * - Skill（技能包）：角色定义 + 关联工具集合
 * - Tool（工具）：可执行的功能函数
 * - Agent：通过四种模式组合 Capability
 */

import type { ToolDefinition } from '../tools/types'

// ==================== 基础类型 ====================

/** 能力类型 */
export type CapabilityType = 'skill' | 'tool'

/** Agent 配置模式 */
export type AgentConfigMode = 'raw' | 'skills-only' | 'tools-only' | 'hybrid'

/** 技能分类 */
export type SkillCategory = 
  | 'general'      // 通用
  | 'writing'      // 写作
  | 'coding'       // 编程
  | 'analysis'     // 分析
  | 'creative'     // 创意
  | 'custom'       // 自定义

// ==================== Skill 定义 ====================

/** 技能定义 - 能力的集合 */
export interface Skill {
  id: string
  name: string
  icon: string
  description: string
  /** 系统提示词 - 定义 AI 角色 */
  systemPrompt: string
  category: SkillCategory
  version: string
  isBuiltIn: boolean
  enabled: boolean
  createdAt: number
  updatedAt: number
  tags: string[]
  /** 关联的工具列表 */
  tools: string[]
  /** 作者 */
  author?: string
}

/** Skill 创建参数 */
export interface SkillCreateParams {
  name: string
  icon?: string
  description: string
  systemPrompt: string
  category?: SkillCategory
  tags?: string[]
  tools?: string[]
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
 * Agent 能力配置 - 核心数据结构
 * 
 * 四种模式：
 * 1. RAW: skillIds=[], toolIds=[], customSystemPrompt 必须提供
 * 2. SKILLS_ONLY: skillIds=[...], toolIds=[] - 工具从 skills 继承
 * 3. TOOLS_ONLY: skillIds=[], toolIds=[...] - 纯工具模式
 * 4. HYBRID: skillIds=[...], toolIds=[...] - 技能 + 额外工具
 */
export interface AgentCapabilities {
  mode: AgentConfigMode
  skillIds: string[]
  toolIds: string[]
  /** 自定义系统提示词（可选，用于 RAW 和补充模式） */
  customSystemPrompt?: string
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
}

/** Agent 创建参数 */
export interface AgentCreateParams {
  name: string
  avatar?: string
  description: string
  level: AgentLevel
  capabilities?: Partial<AgentCapabilities>
  memory?: Partial<AgentMemory>
}

/** Agent 更新参数 */
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
  triggers?: Array<{
    id: string
    type: 'manual' | 'scheduled' | 'event' | 'webhook'
    name: string
    enabled: boolean
    config: Record<string, unknown>
  }>
  runtime?: {
    model: string
    temperature: number
    maxTokens: number
    topP?: number
    frequencyPenalty?: number
    timeout: number
    retryCount: number
    retryDelay: number
  }
}

// ==================== 四种模式说明 ====================

export interface ConfigModeInfo {
  id: AgentConfigMode
  name: string
  icon: string
  shortDesc: string
  description: string
  features: string[]
  useCases: string[]
  /** 是否显示 skill 选择器 */
  showSkillSelector: boolean
  /** 是否显示 tool 选择器 */
  showToolSelector: boolean
  /** 是否显示系统提示词编辑器 */
  showSystemPrompt: boolean
}

export const CONFIG_MODES: ConfigModeInfo[] = [
  {
    id: 'raw',
    name: '纯提示词模式',
    icon: '📝',
    shortDesc: '仅使用自定义提示词',
    description: '不使用任何预设技能和工具，完全通过自定义系统提示词定义 AI 角色',
    features: [
      '完全自定义角色定义',
      '无工具调用能力',
      '适合创意写作、简单问答'
    ],
    useCases: ['创意写作', '角色扮演', '简单问答'],
    showSkillSelector: false,
    showToolSelector: false,
    showSystemPrompt: true
  },
  {
    id: 'skills-only',
    name: '纯技能模式',
    icon: '🎯',
    shortDesc: '选择预设技能包',
    description: '选择一个或多个技能包，AI 将继承技能包中定义的角色和关联工具',
    features: [
      '标准化能力组合',
      '自动继承技能工具',
      '适合特定专业场景'
    ],
    useCases: ['专业写作', '代码开发', '数据分析'],
    showSkillSelector: true,
    showToolSelector: false,
    showSystemPrompt: false
  },
  {
    id: 'tools-only',
    name: '纯工具模式',
    icon: '🔧',
    shortDesc: '直接配置工具',
    description: '不通过技能包，直接选择要使用的工具，灵活组合',
    features: [
      '细粒度工具控制',
      '灵活组合实验',
      '自定义提示词可选'
    ],
    useCases: ['工具实验', '自定义工作流', '特定任务'],
    showSkillSelector: false,
    showToolSelector: true,
    showSystemPrompt: true
  },
  {
    id: 'hybrid',
    name: '混合模式',
    icon: '⚡',
    shortDesc: '技能 + 额外工具',
    description: '选择技能包作为基础，再额外添加特定工具进行能力扩展',
    features: [
      '技能包作为基础',
      '额外工具扩展',
      '最灵活的配置方式'
    ],
    useCases: ['复杂任务', '跨领域工作', '能力扩展'],
    showSkillSelector: true,
    showToolSelector: true,
    showSystemPrompt: false
  }
]

// ==================== 能力图谱类型 ====================

/** 能力节点 - 用于神经网络可视化 */
export interface CapabilityNode {
  id: string
  type: 'skill' | 'tool' | 'root'
  name: string
  icon: string
  description: string
  /** 父节点 ID（skill 的 tools 为子节点） */
  parentId?: string
  /** 层级 */
  level: number
  /** 横向位置 */
  x: number
  /** 纵向位置 */
  y: number
  /** 是否为额外工具（混合模式下） */
  isExtra?: boolean
}

/** 能力连接 */
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

// ==================== 系统提示词构建 ====================

export interface SystemPromptContext {
  agentName: string
  mode: AgentConfigMode
  skills: Skill[]
  tools: Tool[]
  customSystemPrompt?: string
}

// ==================== 存储键名 ====================

export const STORAGE_KEYS = {
  AGENTS: 'ai-agents-v2',
  ACTIVE_AGENT: 'ai-active-agent-id',
  SKILLS: 'ai-skills-v2',
  MEMORY_PREFIX: 'ai-memory-'
} as const
