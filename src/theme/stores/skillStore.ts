/**
 * useSkills - Skill 管理系统
 * 
 * 架构：参考 Claude Code Skills
 * - Skill 是 prompt 模板，不是身份定义
 * - Skill 内容在调用时注入对话上下文
 * - 系统提示词只包含 Skills 列表(name + description)
 * 
 * 功能：
 * 1. 从文件系统加载 skills(SKILL.md 文件)
 * 2. 支持用户上传/创建/编辑/删除 skills
 * 3. 运行时动态调用 skill(inject 到对话上下文)
 */
import type { Skill, SkillCategory, SkillInvocation } from '@/theme/types/agent'
import { computed, ref } from 'vue'

// Skill 存储目录
const SKILLS_DIR = '/.skills'

// 内置 Skills - 已清空，所有 skills 统一从 .skills/ 目录加载
export const BUILTIN_SKILLS: Skill[] = []

// ==================== State ====================
const skills = ref<Skill[]>([...BUILTIN_SKILLS])
const isLoading = ref(false)
const error = ref<string | null>(null)
const categories = computed(() => {
  const cats = new Set(skills.value.map(s => s.category).filter(Boolean))
  return Array.from(cats).sort()
})

// ==================== API Functions ====================

/**
 * 从文件系统加载所有 skills
 * SKILL.md 格式：
 * ---
 * name: "Skill名称"
 * description: "简短描述"
 * usageScenarios:
 *   - "场景1"
 *   - "场景2"
 * tools:
 *   - "tool1"
 *   - "tool2"
 * ---
 * 
 * # Skill 内容
 * ...
 */
async function loadSkillsFromFilesystem(): Promise<Skill[]> {
  const loadedSkills: Skill[] = []

  try {
    // 1. 获取 skills 目录下的所有 .md 文件
    const response = await fetch(`/api/files/list?path=${encodeURIComponent('.skills')}`)
    if (!response.ok) {
      return loadedSkills
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return loadedSkills
    }

    const result = await response.json()
    if (!result.success || !Array.isArray(result.data)) {
      return loadedSkills
    }

    // 2. 读取每个 .md 文件
    const mdFiles = result.data.filter((f: any) =>
      f.type === 'file' && f.name.endsWith('.md')
    )

    for (const file of mdFiles) {
      try {
        const skill = await parseSkillFile(file.name)
        if (skill) {
          loadedSkills.push(skill)
        }
      } catch (e) {
        console.error(`[useSkills] Failed to parse skill file: ${file.name}`, e)
      }
    }
  } catch (e) {
    console.error('[useSkills] Failed to load skills from filesystem:', e)
  }

  return loadedSkills
}

/**
 * 解析 SKILL.md 文件
 * 格式参考：SKILL.md = YAML frontmatter + Markdown content
 */
async function parseSkillFile(filename: string): Promise<Skill | null> {
  try {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent('.skills/' + filename)}`)
    if (!response.ok) return null

    const fileContent = await response.text()

    // 解析 frontmatter
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return null

    const frontmatter = frontmatterMatch[1]
    const content = fileContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trim()

    // 解析 frontmatter 字段
    const parseField = (name: string, defaultValue: string = ''): string => {
      const match = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))
      return match ? match[1].trim().replace(/^["']|["']$/g, '') : defaultValue
    }

    const parseArray = (name: string): string[] => {
      // 支持 YAML 数组格式：
      // key:
      //   - item1
      //   - item2
      const indentMatch = frontmatter.match(new RegExp(`^${name}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'))
      if (indentMatch) {
        return indentMatch[1]
          .trim()
          .split('\n')
          .map(line => line.replace(/^\\s+-\\\\s+/, '').trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      }

      // 支持内联格式：key: ["item1", "item2"]
      const inlineMatch = frontmatter.match(new RegExp(`^${name}:\\s*\[(.+?)\]`, 'm'))
      if (inlineMatch) {
        return inlineMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      }

      return []
    }

    const parseNumber = (name: string, defaultValue: number): number => {
      const val = parseField(name, String(defaultValue))
      return parseInt(val, 10) || defaultValue
    }

    const id = filename.replace('.md', '')
    const now = Date.now()

    return {
      id,
      name: parseField('name', id),
      description: parseField('description'),
      icon: parseField('icon', '🔧'),
      category: parseField('category', 'custom') as SkillCategory,
      content: content,
      usageScenarios: parseArray('usageScenarios'),
      tools: parseArray('tools'),
      version: parseField('version', '1.0.0'),
      author: parseField('author'),
      basePath: `.skills/${filename}`,
      createdAt: parseNumber('createdAt', now),
      updatedAt: parseNumber('updatedAt', now),
      tags: parseArray('tags'),
      isBuiltIn: false,
      enabled: true
    }
  } catch (e) {
    console.error('[useSkills] Parse error:', e)
    return null
  }
}

/**
 * 创建新的 skill(使用后端 API)
 */
async function createSkill(params: {
  name: string
  description: string
  content: string
  icon?: string
  category?: SkillCategory
  usageScenarios?: string[]
  tools?: string[]
  tags?: string[]
}): Promise<Skill | null> {
  try {
    const id = params.name
      .toLowerCase()
      .replace(/[^\\w\\s]/g, '')
      .replace(/\\s+/g, '-')
      .substring(0, 50)

    const now = Date.now()

    // 构建符合后端 API 期望的 skill 数据
    const skillData = {
      id,
      name: params.name,
      description: params.description,
      icon: params.icon || '🔧',
      category: params.category || 'custom',
      content: params.content,
      usageScenarios: params.usageScenarios || [],
      tools: params.tools || [],
      version: '1.0.0',
      author: '',
      basePath: `.skills/${id}.md`,
      createdAt: now,
      updatedAt: now,
      tags: params.tags || [],
      isBuiltIn: false,
      enabled: true
    }

    // 调用后端 API 创建 skill
    const response = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skillData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to create skill')
    }

    // 使用后端返回的数据
    const skill: Skill = result.data

    // 添加到列表
    skills.value.push(skill)

    return skill
  } catch (e) {
    console.error('[useSkills] Failed to create skill:', e)
    return null
  }
}

/**
 * 更新 skill(使用后端 API)
 */
async function updateSkill(id: string, updates: Partial<Skill>): Promise<boolean> {
  try {
    const index = skills.value.findIndex(s => s.id === id)
    if (index === -1) return false

    const skill = skills.value[index]

    // 不允许修改内置 skill
    if (skill.isBuiltIn) {
      throw new Error('Cannot modify built-in skills')
    }

    const updatedSkill = {
      ...skill,
      ...updates,
      updatedAt: Date.now()
    }

    // 调用后端 API 更新 skill
    const response = await fetch('/api/skills/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        ...updates,
        updatedAt: Date.now()
      })
    })

    if (!response.ok) {
      throw new Error('Failed to update skill')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to update skill')
    }

    // 使用后端返回的最新数据
    skills.value[index] = result.data || updatedSkill
    return true
  } catch (e) {
    console.error('[useSkills] Failed to update skill:', e)
    return false
  }
}

/**
 * 删除 skill(使用后端 API)
 */
async function deleteSkill(id: string): Promise<boolean> {
  try {
    const skill = skills.value.find(s => s.id === id)
    if (!skill) return false

    // 不允许删除内置 skill
    if (skill.isBuiltIn) {
      throw new Error('Cannot delete built-in skills')
    }

    // 调用后端 API 删除 skill
    const response = await fetch('/api/skills/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })

    if (!response.ok) {
      throw new Error('Failed to delete skill')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete skill')
    }

    // 从列表移除
    skills.value = skills.value.filter(s => s.id !== id)
    return true
  } catch (e) {
    console.error('[useSkills] Failed to delete skill:', e)
    return false
  }
}

/**
 * 导入 skill 文件(使用后端 API)
 */
async function importSkillFile(file: File): Promise<Skill | null> {
  try {
    const fileContent = await file.text()

    // 验证格式
    if (!fileContent.match(/^---\\n[\\s\\S]*?\\n---/)) {
      throw new Error('Invalid skill file format: missing frontmatter')
    }

    // 解析 frontmatter
    const frontmatterMatch = fileContent.match(/^---\\n([\\s\\S]*?)\\n---/)
    if (!frontmatterMatch) return null

    const frontmatter = frontmatterMatch[1]
    const content = fileContent.replace(/^---\\n[\\s\\S]*?\\n---\\n*/, '').trim()

    // 解析字段
    const parseField = (name: string, defaultValue: string = ''): string => {
      const match = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))
      return match ? match[1].trim().replace(/^["']|["']$/g, '') : defaultValue
    }

    const parseArray = (name: string): string[] => {
      const indentMatch = frontmatter.match(new RegExp(`^${name}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'))
      if (indentMatch) {
        return indentMatch[1]
          .trim()
          .split('\\n')
          .map(line => line.replace(/^\\s+-\\s+/, '').trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      }
      const inlineMatch = frontmatter.match(new RegExp(`^${name}:\\s*\[(.+?)\]`, 'm'))
      if (inlineMatch) {
        return inlineMatch[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      }
      return []
    }

    const id = file.name.replace('.md', '')
    const now = Date.now()

    // 构建 skill 数据
    const skillData = {
      id,
      name: parseField('name', id),
      description: parseField('description'),
      icon: parseField('icon', '🔧'),
      category: parseField('category', 'custom'),
      content: content,
      usageScenarios: parseArray('usageScenarios'),
      tools: parseArray('tools'),
      version: parseField('version', '1.0.0'),
      author: parseField('author'),
      basePath: `.skills/${id}.md`,
      createdAt: now,
      updatedAt: now,
      tags: parseArray('tags'),
      isBuiltIn: false,
      enabled: true
    }

    // 调用后端 API 创建 skill
    const response = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skillData)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to import skill')
    }

    const skill: Skill = result.data

    // 检查是否已存在，更新或添加
    const existingIndex = skills.value.findIndex(s => s.id === skill.id)
    if (existingIndex >= 0) {
      skills.value[existingIndex] = skill
    } else {
      skills.value.push(skill)
    }

    return skill
  } catch (e) {
    console.error('[useSkills] Failed to import skill:', e)
    return null
  }
}

/**
 * 导出 skill 为文件内容
 */
function exportSkill(skill: Skill): string {
  const frontmatter = `---
name: "${skill.name}"
description: "${skill.description}"
icon: "${skill.icon}"
category: "${skill.category}"
version: "${skill.version}"
author: "${skill.author || ''}"
createdAt: ${skill.createdAt}
updatedAt: ${skill.updatedAt}
usageScenarios:
${(skill.usageScenarios || []).map(s => `  - "${s}"`).join('\n')}
tools:
${(skill.tools || []).map(t => `  - "${t}"`).join('\n')}
tags:
${(skill.tags || []).map(t => `  - "${t}"`).join('\n')}
---

${skill.content}`

  return frontmatter
}

/**
 * 调用 Skill - 获取要注入对话的内容
 * 
 * 参考 Claude Code Skills 设计：
 * - Skill 内容不放入系统提示词
 * - 在对话中作为用户消息注入
 */
function invokeSkill(skillId: string): SkillInvocation | null {
  const skill = skills.value.find(s => s.id === skillId)
  if (!skill || !skill.enabled) return null

  return {
    skillId: skill.id,
    skillName: skill.name,
    content: skill.content,
    basePath: skill.basePath,
    tools: skill.tools || [],
    invokedAt: Date.now()
  }
}

/**
 * 根据用户输入匹配应该调用的 Skills
 * 
 * 简单关键词匹配实现
 * 实际可以使用更复杂的语义匹配
 */
function matchSkills(userInput: string, availableSkillIds: string[]): string[] {
  if (availableSkillIds.length === 0) return []

  const input = userInput.toLowerCase()
  const matchedSkillIds: string[] = []

  const availableSkills = skills.value.filter(s => availableSkillIds.includes(s.id))

  for (const skill of availableSkills) {
    if (!skill.enabled) continue

    // 检查描述是否匹配
    if (skill.description && input.includes(skill.description.toLowerCase())) {
      matchedSkillIds.push(skill.id)
      continue
    }

    // 检查使用场景是否匹配
    const matches = skill.usageScenarios?.some(scenario => {
      const keywords = scenario.toLowerCase().split(/\\s+/)
      return keywords.some(keyword => keyword.length > 2 && input.includes(keyword))
    })

    if (matches) {
      matchedSkillIds.push(skill.id)
    }
  }

  return matchedSkillIds
}

/**
 * 初始化：从后端 API 加载所有 skills
 */
async function initSkills() {
  isLoading.value = true
  error.value = null

  try {
    // 调用后端 API 加载 skills
    const response = await fetch('/api/skills')
    if (!response.ok) {
      throw new Error('Failed to fetch skills')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to load skills')
    }

    // 后端返回的自定义 skills
    const apiSkills: Skill[] = result.data || []

    // 合并：内置 skills + 后端 skills(后端 skills 优先级更高)
    const builtinIds = new Set(BUILTIN_SKILLS.map(s => s.id))
    const customSkills = apiSkills.filter(s => !builtinIds.has(s.id))

    skills.value = [...BUILTIN_SKILLS, ...customSkills]
  } catch (e) {
    error.value = 'Failed to load skills'
    console.error(e)
    // 如果加载失败，至少显示内置 skills
    skills.value = [...BUILTIN_SKILLS]
  } finally {
    isLoading.value = false
  }
}

// ==================== Composable Export ====================
export function useSkills() {
  return {
    // State
    skills,
    isLoading,
    error,
    categories,

    // Getters
    builtinSkills: computed(() => skills.value.filter(s => s.isBuiltIn)),
    customSkills: computed(() => skills.value.filter(s => !s.isBuiltIn)),
    getSkillById: (id: string) => skills.value.find(s => s.id === id),
    getSkillsByCategory: (category: string) =>
      skills.value.filter(s => s.category === category),

    // Actions
    initSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    importSkillFile,
    exportSkill,
    refreshSkills: initSkills,  // 使用同样的函数从后端刷新

    // Invocation
    invokeSkill,
    matchSkills
  }
}

// ==================== Progressive Disclosure Export ====================
// 导出渐进式披露相关函数(从 skillLoader.ts 导入)
export {
  addGlobalActiveSkill, getGlobalActiveSkills,
  setGlobalActiveSkills, useSkillLoader
} from '@/theme/skills/skillLoader'

// 从 types 重新导出类型
export type { ActiveSkill, SkillMetadata } from '@/theme/skills/types'

