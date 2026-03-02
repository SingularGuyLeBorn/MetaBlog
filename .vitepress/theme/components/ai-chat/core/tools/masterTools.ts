/**
 * Master Tools - Master Agent 专属系统管理工具
 * 
 * 功能：
 * - sys_list_agents: 列出所有 Agent
 * - sys_create_agent: 创建新 Agent
 * - sys_update_agent: 更新 Agent 配置
 * - sys_delete_agent: 删除 Agent
 * - sys_update_trigger: 更新触发器
 */

import type { ToolDefinition } from './types'
import type { Agent, AgentLevel } from '../types/agent'

// Master Tool 定义
export const masterToolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'sys_list_agents',
      description: '列出系统中所有 Agent 的名称、ID、状态等摘要信息',
      parameters: {
        type: 'object',
        properties: {
          includeInactive: {
            type: 'boolean',
            description: '是否包含非活跃的 Agent',
            default: true
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sys_create_agent',
      description: `创建一个新的 Agent。你需要根据用户的需求推断合理的配置。
示例：
- "创建一个写作助手" -> name="写作助手", description="帮助用户撰写和编辑文章", level="custom", skills=["write"]
- "创建一个每天9点检查GitHub热榜的助手" -> 还需配置 triggers 为 scheduled, cron="0 9 * * *"`,
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Agent 名称，如"写作助手"、"代码审查员"'
          },
          description: {
            type: 'string',
            description: 'Agent 的用途描述'
          },
          avatar: {
            type: 'string',
            description: 'Emoji 头像，如"✍️"、"💻"、"🤖"',
            default: '🤖'
          },
          level: {
            type: 'string',
            enum: ['meta', 'core', 'fixed', 'custom'],
            description: 'Agent 等级，普通助手用 "custom"',
            default: 'custom'
          },
          capabilities: {
            type: 'object',
            description: '能力配置',
            properties: {
              availableSkills: {
                type: 'array',
                items: { type: 'string' },
                description: '可用的 Skills 列表（Claude Code 模式）'
              },
              baseRole: {
                type: 'string',
                description: '基础角色定义'
              },
              roleSupplement: {
                type: 'string',
                description: '角色补充说明'
              },
              customSystemPrompt: {
                type: 'string',
                description: '自定义系统提示词'
              }
            }
          },
          triggers: {
            type: 'array',
            description: '触发器配置',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['manual', 'scheduled', 'event', 'webhook'],
                  description: '触发类型'
                },
                cron: {
                  type: 'string',
                  description: 'Cron 表达式（scheduled 类型使用）'
                },
                eventName: {
                  type: 'string',
                  description: '事件名称（event 类型使用）'
                }
              }
            }
          }
        },
        required: ['name', 'description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sys_update_agent',
      description: '更新现有 Agent 的配置',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'Agent ID'
          },
          updates: {
            type: 'object',
            description: '要更新的字段',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              avatar: { type: 'string' },
              capabilities: {
                type: 'object',
                properties: {
                  baseRole: { type: 'string' },
                  roleSupplement: { type: 'string' },
                  availableSkills: { type: 'array', items: { type: 'string' } }
                }
              },
              status: {
                type: 'string',
                enum: ['online', 'offline', 'busy', 'idle']
              }
            }
          }
        },
        required: ['agentId', 'updates']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sys_delete_agent',
      description: '删除指定的 Agent（meta 级 Agent 不可删除）',
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: '要删除的 Agent ID'
          },
          confirm: {
            type: 'boolean',
            description: '确认删除',
            default: false
          }
        },
        required: ['agentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sys_update_trigger',
      description: `为指定 Agent 更新触发方式。
示例：
- "把助手的工作时间改成每天10点" -> agentId="xxx", triggerType="scheduled", config={cron:"0 10 * * *"}
- "让助手在文章创建时自动执行" -> triggerType="event", config={eventName:"article.created"}`,
      parameters: {
        type: 'object',
        properties: {
          agentId: {
            type: 'string',
            description: 'Agent ID'
          },
          triggerType: {
            type: 'string',
            enum: ['manual', 'scheduled', 'event', 'webhook'],
            description: '触发类型'
          },
          config: {
            type: 'object',
            description: '触发器配置',
            properties: {
              cron: {
                type: 'string',
                description: 'Cron 表达式（scheduled 使用）'
              },
              timezone: {
                type: 'string',
                description: '时区',
                default: 'Asia/Shanghai'
              },
              eventName: {
                type: 'string',
                description: '事件名称（event 使用）'
              },
              eventFilter: {
                type: 'object',
                description: '事件过滤条件'
              },
              webhookSecret: {
                type: 'string',
                description: 'Webhook 密钥'
              }
            }
          }
        },
        required: ['agentId', 'triggerType']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sys_list_skills',
      description: '列出所有可用的技能',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: '按分类筛选'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'sys_get_system_status',
      description: '获取系统整体状态',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
]

// Master Tool 执行器类型
export interface MasterToolExecutor {
  (args: Record<string, unknown>, context: MasterToolContext): Promise<string>
}

export interface MasterToolContext {
  agents: Agent[]
  createAgent: (params: unknown) => Promise<Agent | null>
  updateAgent: (id: string, updates: unknown) => Promise<Agent | null>
  deleteAgent: (id: string) => Promise<boolean>
}

// Master Tool 执行器实现
export const masterToolExecutors: Record<string, MasterToolExecutor> = {
  async sys_list_agents(args, context) {
    const { includeInactive = true } = args as { includeInactive?: boolean }
    
    let agents = context.agents
    if (!includeInactive) {
      agents = agents.filter(a => a.status === 'online' || a.status === 'busy')
    }
    
    const list = agents.map(a => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      level: a.level,
      status: a.status,
      description: a.description.slice(0, 50) + '...',
      skillCount: a.capabilities?.availableSkills?.length || 0,
      toolCount: 0, // Claude Code 模式：工具通过 Skill 包含
      isDefault: a.isDefault
    }))
    
    return `系统中有 ${list.length} 个 Agent：\n\n${JSON.stringify(list, null, 2)}`
  },

  async sys_create_agent(args, context) {
    const { name, description, avatar = '🤖', level = 'custom', capabilities, triggers } = args as {
      name: string
      description: string
      avatar?: string
      level?: AgentLevel
      capabilities?: {
        baseRole?: string
        roleSupplement?: string
        availableSkills?: string[]
      }
      triggers?: Array<{
        type: string
        cron?: string
        eventName?: string
      }>
    }

    if (!name || !description) {
      return '错误：name 和 description 是必需的'
    }

    const agent = await context.createAgent({
      name,
      description,
      avatar,
      level,
      capabilities: capabilities || { baseRole: `你是 ${name}，${description}`, availableSkills: [] }
    })

    if (!agent) {
      return '创建 Agent 失败'
    }

    // 如果有触发器配置，更新触发器
    if (triggers && triggers.length > 0) {
      const trigger = triggers[0]
      await context.updateAgent(agent.id, {
        triggers: [{
          id: `trigger-${Date.now()}`,
          type: trigger.type,
          name: getTriggerName(trigger.type),
          enabled: true,
          config: {
            cron: trigger.cron,
            eventName: trigger.eventName
          }
        }]
      })
    }

    return `✅ 成功创建 Agent「${name}」\n\nID: ${agent.id}\n等级: ${level}\n状态: ${agent.status}\n\n你可以使用此 ID 进行后续操作。`
  },

  async sys_update_agent(args, context) {
    const { agentId, updates } = args as { agentId: string; updates: Record<string, unknown> }

    if (!agentId) {
      return '错误：agentId 是必需的'
    }

    const agent = context.agents.find(a => a.id === agentId)
    if (!agent) {
      return `错误：找不到 ID 为 ${agentId} 的 Agent`
    }

    if (agent.level === 'meta') {
      return '错误：meta 级 Agent 不可修改'
    }

    const updated = await context.updateAgent(agentId, updates)
    if (!updated) {
      return '更新失败'
    }

    return `✅ 成功更新 Agent「${updated.name}」\n\n更新字段: ${Object.keys(updates).join(', ')}`
  },

  async sys_delete_agent(args, context) {
    const { agentId, confirm = false } = args as { agentId: string; confirm?: boolean }

    if (!agentId) {
      return '错误：agentId 是必需的'
    }

    const agent = context.agents.find(a => a.id === agentId)
    if (!agent) {
      return `错误：找不到 ID 为 ${agentId} 的 Agent`
    }

    if (agent.level === 'meta') {
      return '❌ 无法删除 meta 级 Agent（系统保护）'
    }

    if (!confirm) {
      return `⚠️ 确认删除 Agent「${agent.name}」？\n此操作不可撤销。\n\n如需确认，请再次调用此工具，并设置 confirm: true`
    }

    const success = await context.deleteAgent(agentId)
    if (!success) {
      return '删除失败'
    }

    return `✅ 已删除 Agent「${agent.name}」`
  },

  async sys_update_trigger(args, context) {
    const { agentId, triggerType, config = {} } = args as {
      agentId: string
      triggerType: string
      config: Record<string, unknown>
    }

    if (!agentId) {
      return '错误：agentId 是必需的'
    }

    const agent = context.agents.find(a => a.id === agentId)
    if (!agent) {
      return `错误：找不到 ID 为 ${agentId} 的 Agent`
    }

    const updated = await context.updateAgent(agentId, {
      triggers: [{
        id: `trigger-${Date.now()}`,
        type: triggerType,
        name: getTriggerName(triggerType),
        enabled: true,
        config
      }]
    })

    if (!updated) {
      return '更新触发器失败'
    }

    let configDesc = ''
    if (triggerType === 'scheduled' && config.cron) {
      configDesc = `\nCron: ${config.cron}`
    } else if (triggerType === 'event' && config.eventName) {
      configDesc = `\n事件: ${config.eventName}`
    }

    return `✅ 已更新 Agent「${agent.name}」的触发器\n\n类型: ${triggerType}${configDesc}`
  },

  async sys_list_skills(args, context) {
    // 技能列表会在实际调用时从 useAgentConfig 获取
    return '技能列表功能已注册，具体实现依赖于 AgentStorage'
  },

  async sys_get_system_status(args, context) {
    const stats = {
      totalAgents: context.agents.length,
      onlineAgents: context.agents.filter(a => a.status === 'online').length,
      busyAgents: context.agents.filter(a => a.status === 'busy').length,
      metaAgents: context.agents.filter(a => a.level === 'meta').length,
      customAgents: context.agents.filter(a => a.level === 'custom').length
    }

    return `📊 系统状态\n\n${JSON.stringify(stats, null, 2)}`
  }
}

function getTriggerName(type: string): string {
  const names: Record<string, string> = {
    manual: '手动触发',
    scheduled: '定时触发',
    event: '事件触发',
    webhook: 'Webhook'
  }
  return names[type] || type
}

// 导出 Master Tools 注册信息
export const masterTools = masterToolDefinitions.map(def => ({
  name: def.function.name,
  definition: def,
  executor: masterToolExecutors[def.function.name]
}))
