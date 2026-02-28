/**
 * Master Tools Service - Master Agent 专属系统工具
 * 
 * 提供系统级管理能力，包括：
 * - sys_list_agents: 列出所有 Agent
 * - sys_create_agent: 创建新 Agent
 * - sys_update_agent: 更新 Agent 配置
 * - sys_delete_agent: 删除 Agent（不能删除 meta 级）
 * - sys_update_trigger: 配置 Agent 触发器
 * - sys_list_skills: 列出所有技能
 * - sys_get_system_status: 获取系统状态
 */

import { promises as fs } from 'fs'
import { join } from 'path'
import { Agent, AgentLevel, Trigger, TriggerType } from '../routes/agents'

// 数据存储路径
const DATA_DIR = join(process.cwd(), '.data')
const AGENTS_FILE = join(DATA_DIR, 'agents.json')
const SKILLS_FILE = join(DATA_DIR, 'skills.json')

// 权限模板
const PERMISSION_TEMPLATES = [
  { id: 'chat', name: '对话权限', description: '可以进行对话交流' },
  { id: 'file_read', name: '文件读取', description: '可以读取项目文件' },
  { id: 'file_write', name: '文件写入', description: '可以修改项目文件' },
  { id: 'skill_use', name: '技能调用', description: '可以使用已配置的技能' },
  { id: 'skill_create', name: '技能创建', description: '可以创建新技能' },
  { id: 'agent_manage', name: 'Agent 管理', description: '可以管理其他 Agent' },
  { id: 'memory_access', name: '记忆访问', description: '可以访问长期记忆' },
  { id: 'web_search', name: '网络搜索', description: '可以进行网络搜索' },
  { id: 'code_execute', name: '代码执行', description: '可以执行代码' },
  { id: 'system_config', name: '系统配置', description: '可以修改系统配置' }
]

// 工具执行结果
interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * 读取所有 Agents
 */
async function readAgents(): Promise<Agent[]> {
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * 写入 Agents
 */
async function writeAgents(agents: Agent[]): Promise<void> {
  await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8')
}

/**
 * 读取所有 Skills
 */
async function readSkills(): Promise<any[]> {
  try {
    const data = await fs.readFile(SKILLS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * 系统工具定义
 */
export const masterToolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'sys_list_agents',
      description: '列出系统中的所有 Agent，返回它们的 ID、名称、状态等摘要信息',
      parameters: {
        type: 'object',
        properties: {
          includeDetails: {
            type: 'boolean',
            description: '是否包含详细信息（如 triggers、permissions 等）',
            default: false
          }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sys_create_agent',
      description: `创建一个新的 Agent。你需要提供：
- name: Agent 名称
- description: 描述
- systemPrompt: 系统提示词
- level: 级别（custom/fixed/core，默认 custom）
- skills: 技能 ID 列表
- triggers: 触发器配置（可选）

注意：
1. 不能创建 level 为 meta 的 Agent
2. 名称必须唯一且有意义
3. 系统提示词应该清晰地定义 Agent 的角色和能力`,
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Agent 名称' },
          description: { type: 'string', description: 'Agent 描述' },
          systemPrompt: { type: 'string', description: '系统提示词' },
          level: { 
            type: 'string', 
            enum: ['custom', 'fixed', 'core'],
            description: 'Agent 级别',
            default: 'custom'
          },
          avatar: { type: 'string', description: '头像 emoji', default: '🤖' },
          skills: { 
            type: 'array', 
            items: { type: 'string' },
            description: '技能 ID 列表',
            default: []
          },
          triggers: {
            type: 'array',
            description: '触发器配置',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['manual', 'scheduled', 'event', 'webhook'] },
                name: { type: 'string' },
                enabled: { type: 'boolean' },
                config: { type: 'object' }
              }
            },
            default: []
          }
        },
        required: ['name', 'description', 'systemPrompt']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sys_update_agent',
      description: `更新已有 Agent 的配置。你需要提供：
- id: Agent ID（必需）
- 其他要更新的字段

注意：
1. 不能修改 meta 级 Agent 的关键字段（如 level、isMaster）
2. Master Agent 的系统提示词和权限不能被修改
3. 只有存在的 Agent 才能被更新`,
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Agent ID' },
          name: { type: 'string', description: '新名称' },
          description: { type: 'string', description: '新描述' },
          systemPrompt: { type: 'string', description: '新系统提示词' },
          avatar: { type: 'string', description: '新头像' },
          skills: { type: 'array', items: { type: 'string' }, description: '新技能列表' },
          status: { type: 'string', enum: ['online', 'offline', 'idle', 'paused'], description: '新状态' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sys_delete_agent',
      description: `删除指定的 Agent。

注意：
1. 不能删除 meta 级或 Master Agent
2. 删除后不可恢复
3. 请确认 Agent ID 正确`,
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '要删除的 Agent ID' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sys_update_trigger',
      description: `为指定 Agent 配置触发器。支持：
- manual: 手动触发
- scheduled: 定时触发（需要 cron 表达式）
- event: 事件触发（需要 eventName）
- webhook: Webhook 触发

示例：
- 每天早上9点：{ type: 'scheduled', config: { cron: '0 9 * * *' } }
- 文章创建时：{ type: 'event', config: { eventName: 'article.created' } }`,
      parameters: {
        type: 'object',
        properties: {
          agentId: { type: 'string', description: 'Agent ID' },
          triggerId: { type: 'string', description: '触发器 ID（可选，不提供则创建新触发器）' },
          type: { 
            type: 'string', 
            enum: ['manual', 'scheduled', 'event', 'webhook'],
            description: '触发器类型'
          },
          name: { type: 'string', description: '触发器名称' },
          enabled: { type: 'boolean', description: '是否启用', default: true },
          config: { 
            type: 'object', 
            description: '触发器配置（如 cron、eventName 等）',
            default: {}
          }
        },
        required: ['agentId', 'type', 'name']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sys_list_skills',
      description: '列出系统中所有可用的技能',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'sys_get_system_status',
      description: '获取系统整体状态，包括：
- Agent 数量和状态统计
- 技能数量
- 系统运行时间
- 最近的错误日志',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
]

/**
 * 系统工具执行器
 */
export const masterToolExecutors: Record<string, (args: Record<string, any>) => Promise<ToolResult>> = {
  /**
   * 列出所有 Agents
   */
  async sys_list_agents(args: { includeDetails?: boolean } = {}): Promise<ToolResult> {
    try {
      const agents = await readAgents()
      
      const summary = agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar,
        description: agent.description.slice(0, 50) + '...',
        level: agent.level,
        status: agent.status,
        isMaster: agent.isMaster || false,
        skillCount: (agent.skills || []).length,
        triggerCount: (agent.triggers || []).length,
        lastActiveAt: agent.lastActiveAt,
        callCount: agent.callCount || 0,
        ...(args.includeDetails ? {
          skills: agent.skills,
          triggers: agent.triggers,
          permissions: agent.permissions
        } : {})
      }))
      
      return {
        success: true,
        data: {
          total: agents.length,
          agents: summary
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list agents: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  },

  /**
   * 创建新 Agent
   */
  async sys_create_agent(args: {
    name: string
    description: string
    systemPrompt: string
    level?: string
    avatar?: string
    skills?: string[]
    triggers?: any[]
  }): Promise<ToolResult> {
    try {
      // 验证级别
      if (args.level === 'meta') {
        return {
          success: false,
          error: 'Cannot create agent with level "meta"'
        }
      }
      
      const agents = await readAgents()
      const now = Date.now()
      
      const newAgent: Agent = {
        id: `agent-${now}-${Math.random().toString(36).substr(2, 9)}`,
        name: args.name,
        avatar: args.avatar || '🤖',
        description: args.description,
        level: (args.level as AgentLevel) || 'custom',
        status: 'idle',
        seat: agents.length + 1,
        skills: args.skills || [],
        permissions: PERMISSION_TEMPLATES.map(p => ({ 
          ...p, 
          granted: ['chat', 'file_read', 'skill_use'].includes(p.id)
        })),
        systemPrompt: args.systemPrompt,
        memoryEnabled: true,
        memoryContent: '',
        triggers: args.triggers?.map((t, i) => ({
          id: `trigger-${now}-${i}`,
          type: t.type as TriggerType,
          name: t.name,
          enabled: t.enabled ?? true,
          config: t.config || {},
          triggerCount: 0
        })) || [{
          id: `trigger-${now}`,
          type: 'manual' as TriggerType,
          name: '手动触发',
          enabled: true,
          config: {},
          triggerCount: 0
        }],
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now,
        callCount: 0,
        totalRuns: 0,
        errorCount: 0,
        isDefault: false
      }
      
      agents.push(newAgent)
      await writeAgents(agents)
      
      return {
        success: true,
        data: {
          message: `Agent "${args.name}" created successfully`,
          agent: {
            id: newAgent.id,
            name: newAgent.name,
            level: newAgent.level
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create agent: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  },

  /**
   * 更新 Agent
   */
  async sys_update_agent(args: {
    id: string
    [key: string]: any
  }): Promise<ToolResult> {
    try {
      const agents = await readAgents()
      const index = agents.findIndex(a => a.id === args.id)
      
      if (index === -1) {
        return {
          success: false,
          error: `Agent with ID "${args.id}" not found`
        }
      }
      
      const existing = agents[index]
      
      // 保护 meta 级 Agent
      if (existing.level === 'meta' || existing.isMaster) {
        if (args.level !== undefined || args.isMaster !== undefined) {
          return {
            success: false,
            error: 'Cannot modify level or isMaster of meta-level agent'
          }
        }
      }
      
      // 更新字段
      const updates: Partial<Agent> = {}
      const allowedFields = ['name', 'description', 'systemPrompt', 'avatar', 'skills', 'status']
      
      for (const field of allowedFields) {
        if (args[field] !== undefined) {
          (updates as any)[field] = args[field]
        }
      }
      
      agents[index] = {
        ...existing,
        ...updates,
        updatedAt: Date.now()
      }
      
      await writeAgents(agents)
      
      return {
        success: true,
        data: {
          message: `Agent "${existing.name}" updated successfully`,
          updates: Object.keys(updates)
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update agent: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  },

  /**
   * 删除 Agent
   */
  async sys_delete_agent(args: { id: string }): Promise<ToolResult> {
    try {
      const agents = await readAgents()
      const agent = agents.find(a => a.id === args.id)
      
      if (!agent) {
        return {
          success: false,
          error: `Agent with ID "${args.id}" not found`
        }
      }
      
      // 保护 meta 级和 Master Agent
      if (agent.level === 'meta' || agent.isMaster) {
        return {
          success: false,
          error: `Cannot delete meta-level or master agent "${agent.name}"`
        }
      }
      
      const filtered = agents.filter(a => a.id !== args.id)
      await writeAgents(filtered)
      
      return {
        success: true,
        data: {
          message: `Agent "${agent.name}" deleted successfully`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete agent: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  },

  /**
   * 更新触发器配置
   */
  async sys_update_trigger(args: {
    agentId: string
    triggerId?: string
    type: string
    name: string
    enabled?: boolean
    config?: Record<string, any>
  }): Promise<ToolResult> {
    try {
      const agents = await readAgents()
      const agent = agents.find(a => a.id === args.agentId)
      
      if (!agent) {
        return {
          success: false,
          error: `Agent with ID "${args.agentId}" not found`
        }
      }
      
      if (!agent.triggers) {
        agent.triggers = []
      }
      
      const now = Date.now()
      
      if (args.triggerId) {
        // 更新现有触发器
        const triggerIndex = agent.triggers.findIndex(t => t.id === args.triggerId)
        if (triggerIndex === -1) {
          return {
            success: false,
            error: `Trigger with ID "${args.triggerId}" not found`
          }
        }
        
        agent.triggers[triggerIndex] = {
          ...agent.triggers[triggerIndex],
          type: args.type as TriggerType,
          name: args.name,
          enabled: args.enabled ?? true,
          config: args.config || {}
        }
      } else {
        // 创建新触发器
        agent.triggers.push({
          id: `trigger-${now}`,
          type: args.type as TriggerType,
          name: args.name,
          enabled: args.enabled ?? true,
          config: args.config || {},
          triggerCount: 0
        })
      }
      
      agent.updatedAt = now
      await writeAgents(agents)
      
      return {
        success: true,
        data: {
          message: `Trigger "${args.name}" ${args.triggerId ? 'updated' : 'created'} successfully for agent "${agent.name}"`,
          triggerType: args.type,
          triggerConfig: args.config
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to update trigger: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  },

  /**
   * 列出所有 Skills
   */
  async sys_list_skills(): Promise<ToolResult> {
    try {
      const skills = await readSkills()
      
      return {
        success: true,
        data: {
          total: skills.length,
          skills: skills.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            icon: s.icon,
            category: s.category,
            isBuiltIn: s.isBuiltIn || false
          }))
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list skills: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  },

  /**
   * 获取系统状态
   */
  async sys_get_system_status(): Promise<ToolResult> {
    try {
      const agents = await readAgents()
      const skills = await readSkills()
      
      // Agent 统计
      const agentStats = {
        total: agents.length,
        online: agents.filter(a => a.status === 'online').length,
        offline: agents.filter(a => a.status === 'offline').length,
        busy: agents.filter(a => a.status === 'busy').length,
        idle: agents.filter(a => a.status === 'idle').length,
        error: agents.filter(a => a.status === 'error').length,
        meta: agents.filter(a => a.level === 'meta').length,
        custom: agents.filter(a => a.level === 'custom').length
      }
      
      // 触发器统计
      const triggerStats = agents.reduce((acc, agent) => {
        const triggers = agent.triggers || []
        return {
          total: acc.total + triggers.length,
          scheduled: acc.scheduled + triggers.filter(t => t.type === 'scheduled').length,
          event: acc.event + triggers.filter(t => t.type === 'event').length,
          manual: acc.manual + triggers.filter(t => t.type === 'manual').length,
          webhook: acc.webhook + triggers.filter(t => t.type === 'webhook').length
        }
      }, { total: 0, scheduled: 0, event: 0, manual: 0, webhook: 0 })
      
      // 总调用次数
      const totalCalls = agents.reduce((sum, a) => sum + (a.callCount || 0), 0)
      const totalErrors = agents.reduce((sum, a) => sum + (a.errorCount || 0), 0)
      
      return {
        success: true,
        data: {
          agents: agentStats,
          skills: {
            total: skills.length
          },
          triggers: triggerStats,
          calls: {
            total: totalCalls,
            errors: totalErrors,
            successRate: totalCalls > 0 ? ((totalCalls - totalErrors) / totalCalls * 100).toFixed(2) + '%' : 'N/A'
          },
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get system status: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}
