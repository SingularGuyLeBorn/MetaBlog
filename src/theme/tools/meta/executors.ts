/**
 * Meta 工具执行器
 *
 * get_all_tools: 从注册表获取所有工具定义
 * get_all_skills: 从后端 API 获取所有 Skills
 */

import type { ToolResult } from '../types'
import { getToolDefinitions } from '../registry'

/**
 * 获取所有工具的完整列表
 */
export async function executeGetAllTools(): Promise<ToolResult> {
  try {
    const defs = getToolDefinitions()

    // 按类别分组（复用 agentStore 的分类逻辑）
    const categoryMap: Record<string, string[]> = {
      '文章管理': [],
      '文件管理': [],
      '网络工具': [],
      '代码工具': [],
      '文本处理': [],
      '笔记工具': [],
      '知识库': [],
      '系统工具': [],
      '学术平台': [],
      'AI模型平台': [],
      '代码平台': [],
      '飞书集成': [],
      'Skill系统': [],
      '元信息': [],
      '其他': []
    }

    defs.forEach(d => {
      const name = d.function.name
      const desc = d.function.description.split('\n')[0]
      const category = getToolCategory(name)
      if (!categoryMap[category]) categoryMap[category] = []
      categoryMap[category].push(`- ${name}: ${desc}`)
    })

    const lines: string[] = []
    lines.push(`当前系统共有 ${defs.length} 个可用工具：\n`)

    Object.entries(categoryMap).forEach(([category, items]) => {
      if (items.length > 0) {
        lines.push(`\n### ${category} (${items.length})`)
        lines.push(...items)
      }
    })

    return {
      success: true,
      message: `已获取全部 ${defs.length} 个工具`,
      data: {
        count: defs.length,
        list: lines.join('\n')
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: 'GET_ALL_TOOLS_FAILED',
      message: `获取工具列表失败: ${msg}`
    }
  }
}

function getToolCategory(name: string): string {
  if (name.includes('article')) return '文章管理'
  if (name.includes('file')) return '文件管理'
  if (name.includes('web') || name.includes('fetch') || name.includes('url')) return '网络工具'
  if (name.includes('code') || name.includes('execute') || name.includes('analyze')) return '代码工具'
  if (name.includes('text') || name.includes('summarize') || name.includes('format') || name.includes('translate')) return '文本处理'
  if (name.includes('note')) return '笔记工具'
  if (name.includes('knowledge') || name.includes('kb_')) return '知识库'
  if (name.includes('time') || name.includes('weather') || name.includes('calculate')) return '系统工具'
  if (name.includes('arxiv') || name.includes('openreview')) return '学术平台'
  if (name.includes('huggingface')) return 'AI模型平台'
  if (name.includes('github')) return '代码平台'
  if (name.includes('feishu')) return '飞书集成'
  if (name.includes('skill') || name.includes('load_skill')) return 'Skill系统'
  if (name.includes('all_')) return '元信息'
  return '其他'
}

/**
 * 获取所有 Skills 的完整列表
 */
export async function executeGetAllSkills(): Promise<ToolResult> {
  try {
    const response = await fetch('/api/skills')
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP_${response.status}`,
        message: `获取 Skills 列表失败: HTTP ${response.status}`
      }
    }

    const result = await response.json()
    const skills = result.data

    if (!Array.isArray(skills)) {
      return {
        success: false,
        error: 'INVALID_RESPONSE',
        message: `Skills 接口返回格式不正确: ${JSON.stringify(result).slice(0, 200)}`
      }
    }

    const lines: string[] = []
    lines.push(`当前系统共有 ${skills.length} 个可用 Skills：\n`)

    skills.forEach((skill: any) => {
      const toolNames = (skill.tools || []).join(', ') || '无'
      const scenarios = (skill.usageScenarios || []).join('; ') || '未定义'
      lines.push(`\n- ${skill.icon || ''} **${skill.name}** \`${skill.id}\``)
      lines.push(`  描述: ${skill.description}`)
      lines.push(`  关联工具: ${toolNames}`)
      lines.push(`  适用场景: ${scenarios}`)
    })

    return {
      success: true,
      message: `已获取全部 ${skills.length} 个 Skills`,
      data: {
        count: skills.length,
        list: lines.join('\n')
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: 'GET_ALL_SKILLS_FAILED',
      message: `获取 Skills 列表失败: ${msg}`
    }
  }
}
