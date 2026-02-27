/**
 * useSkills - Skill 管理系统
 * 
 * 架构：参考 Claude Code Skills
 * - Skill 是 prompt 模板，不是身份定义
 * - Skill 内容在调用时注入对话上下文
 * - 系统提示词只包含 Skills 列表（name + description）
 * 
 * 功能：
 * 1. 从文件系统加载 skills（SKILL.md 文件）
 * 2. 支持用户上传/创建/编辑/删除 skills
 * 3. 运行时动态调用 skill（inject 到对话上下文）
 */
import { ref, computed } from 'vue'
import type { Skill, SkillCategory, SkillInvocation } from '../types/agent'

// Skill 存储目录
const SKILLS_DIR = '/.skills'

// 内置 Skills - 新的格式（content + usageScenarios + tools）
const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'write',
    name: '写作助手',
    description: '基于提示词生成高质量文章，优化结构和表达',
    icon: '✍️',
    category: 'writing',
    content: `# 写作助手

## 能力范围

你是一个专业的写作助手，擅长根据用户需求创作高质量文章。

## 写作原则

1. 结构清晰，逻辑连贯
2. 语言流畅，表达准确
3. 根据主题选择合适的写作风格
4. 适当使用标题、列表等格式化元素

## 工作流程

1. 理解用户的写作需求和目标受众
2. 确定文章结构和大纲
3. 撰写内容，保持段落简洁
4. 检查语法和表达

## 输出格式

- 使用 Markdown 格式
- 合理使用标题层级
- 适当添加列表和表格`,
    usageScenarios: [
      '用户要求撰写文章',
      '需要内容创作帮助',
      '写作建议和指导'
    ],
    tools: [],
    version: '1.0.0',
    tags: ['写作', '内容创作'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'summarize',
    name: '文章总结',
    description: '总结文章内容，提取核心观点和关键信息',
    icon: '📋',
    category: 'analysis',
    content: `# 文章总结专家

## 能力范围

你是一个总结专家，擅长提炼文章核心观点和关键信息。

## 总结原则

1. 提取核心观点和关键信息
2. 保持客观，不添加个人观点
3. 结构清晰，层次分明
4. 适当保留重要细节和数据

## 输出格式

- 简明扼要的摘要
- 要点列表
- 关键数据保留`,
    usageScenarios: [
      '总结文章内容',
      '提取关键信息',
      '生成摘要',
      '分析文章要点'
    ],
    tools: ['summarize_text'],
    version: '1.0.0',
    tags: ['总结', '分析'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'translate',
    name: '中英翻译',
    description: '准确流畅进行中英互译，保持原文语气和风格',
    icon: '🌐',
    category: 'general',
    content: `# 专业翻译

## 能力范围

你是一个专业翻译，能够准确流畅地进行中英互译。

## 翻译原则

1. 准确传达原文意思
2. 符合目标语言的习惯表达
3. 保持原文的语气和风格
4. 专业术语翻译准确

## 注意事项

- 注意文化差异
- 保持原文格式
- 专有名词保持一致`,
    usageScenarios: [
      '翻译内容',
      '中英互译',
      '英文翻译中文',
      '中文翻译英文'
    ],
    tools: ['translate_text'],
    version: '1.0.0',
    tags: ['翻译', '语言'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'polish',
    name: '润色优化',
    description: '优化文章表达，提升可读性和专业性',
    icon: '✨',
    category: 'writing',
    content: `# 文字润色专家

## 能力范围

你是一个文字润色专家，擅长优化表达、修正语法错误。

## 润色原则

1. 修正语法和拼写错误
2. 优化句子结构，提升流畅度
3. 改进用词，增强表达力
4. 保持原文的核心意思和风格

## 润色维度

- 语法正确性
- 表达流畅度
- 用词准确性
- 专业性和一致性`,
    usageScenarios: [
      '润色文章',
      '优化表达',
      '提升可读性',
      '修改语法错误'
    ],
    tools: ['format_text'],
    version: '1.0.0',
    tags: ['润色', '编辑'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'code',
    name: '代码生成',
    description: '生成清晰高效的代码，提供详细解释和使用示例',
    icon: '💻',
    category: 'coding',
    content: `# 编程专家

## 能力范围

你是一个编程专家，能够编写清晰、高效的代码并提供详细解释。

## 编程原则

1. 编写简洁、可读性强的代码
2. 添加必要的注释说明
3. 考虑边界情况和错误处理
4. 提供代码解释和使用示例

## 输出要求

- 代码清晰规范
- 包含注释说明
- 提供使用示例
- 解释关键逻辑`,
    usageScenarios: [
      '编写代码',
      '生成代码示例',
      '代码解释',
      '编程帮助'
    ],
    tools: ['execute_code', 'analyze_code'],
    version: '1.0.0',
    tags: ['编程', '代码'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'review',
    name: '代码审查',
    description: '审查代码，发现潜在问题和改进点',
    icon: '🔍',
    category: 'coding',
    content: `# 代码审查员

## 能力范围

你是一个经验丰富的代码审查员，擅长发现代码中的问题和改进点。

## 审查维度

1. 代码风格和规范
2. 潜在的 bug 和错误
3. 性能优化建议
4. 安全漏洞检查
5. 可维护性评估

## 输出格式

- 问题分类（严重/警告/建议）
- 具体代码位置
- 改进建议
- 参考示例`,
    usageScenarios: [
      '审查代码',
      '代码评审',
      '发现代码问题',
      '代码质量检查'
    ],
    tools: ['analyze_code'],
    version: '1.0.0',
    tags: ['代码审查', '质量'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'explain',
    name: '概念解释',
    description: '将复杂概念解释得通俗易懂，使用类比和例子',
    icon: '💡',
    category: 'general',
    content: `# 概念解释专家

## 能力范围

你是一个优秀的教育者，擅长将复杂概念解释得通俗易懂。

## 解释原则

1. 使用类比和例子帮助理解
2. 从简单到复杂，循序渐进
3. 避免过多专业术语，必要时解释
4. 鼓励提问和互动

## 解释技巧

- 从已知概念引入
- 使用生活化类比
- 提供具体例子
- 总结关键点`,
    usageScenarios: [
      '解释概念',
      '讲解知识点',
      '科普说明',
      '教学辅导'
    ],
    tools: [],
    version: '1.0.0',
    tags: ['教育', '解释'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'brainstorm',
    name: '头脑风暴',
    description: '生成创意点子和创新解决方案',
    icon: '🧠',
    category: 'creative',
    content: `# 创意专家

## 能力范围

你是一个创意专家，擅长头脑风暴和生成创新点子。

## 创意原则

1. 数量优先，先产生大量点子
2. 鼓励 unconventional 的想法
3. 从不同角度思考问题
4. 结合点子，产生新的组合

## 输出格式

- 多个不同方向的点子
- 每个点子简要说明
- 可行性评估
- 推荐方案`,
    usageScenarios: [
      '头脑风暴',
      '创意生成',
      '方案构思',
      '创新思考'
    ],
    tools: [],
    version: '1.0.0',
    tags: ['创意', '头脑风暴'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
]

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
          .map(line => line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean)
      }
      
      // 支持内联格式：key: ["item1", "item2"]
      const inlineMatch = frontmatter.match(new RegExp(`^${name}:\\s*\\[(.+?)\\]`, 'm'))
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
 * 创建新的 skill
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
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)
    
    const now = Date.now()
    
    const frontmatter = `---
name: "${params.name}"
description: "${params.description}"
icon: "${params.icon || '🔧'}"
category: "${params.category || 'custom'}"
version: "1.0.0"
createdAt: ${now}
updatedAt: ${now}
usageScenarios:
${(params.usageScenarios || []).map(s => `  - "${s}"`).join('\n')}
tools:
${(params.tools || []).map(t => `  - "${t}"`).join('\n')}
tags:
${(params.tags || []).map(t => `  - "${t}"`).join('\n')}
---

${params.content}`
    
    // 保存到文件系统
    const response = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `.skills/${id}.md`,
        content: frontmatter,
        overwrite: false
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }
    
    const skill: Skill = {
      id,
      name: params.name,
      description: params.description,
      icon: params.icon || '🔧',
      category: (params.category || 'custom') as SkillCategory,
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
    
    // 添加到列表
    skills.value.push(skill)
    
    return skill
  } catch (e) {
    console.error('[useSkills] Failed to create skill:', e)
    return null
  }
}

/**
 * 更新 skill
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
    
    // 重新生成文件内容
    const frontmatter = `---
name: "${updatedSkill.name}"
description: "${updatedSkill.description}"
icon: "${updatedSkill.icon}"
category: "${updatedSkill.category}"
version: "${updatedSkill.version}"
author: "${updatedSkill.author || ''}"
createdAt: ${updatedSkill.createdAt}
updatedAt: ${updatedSkill.updatedAt}
usageScenarios:
${(updatedSkill.usageScenarios || []).map(s => `  - "${s}"`).join('\n')}
tools:
${(updatedSkill.tools || []).map(t => `  - "${t}"`).join('\n')}
tags:
${(updatedSkill.tags || []).map(t => `  - "${t}"`).join('\n')}
---

${updatedSkill.content}`
    
    const response = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: updatedSkill.basePath || `.skills/${id}.md`,
        content: frontmatter,
        overwrite: true
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to save skill file')
    }
    
    skills.value[index] = updatedSkill
    return true
  } catch (e) {
    console.error('[useSkills] Failed to update skill:', e)
    return false
  }
}

/**
 * 删除 skill
 */
async function deleteSkill(id: string): Promise<boolean> {
  try {
    const skill = skills.value.find(s => s.id === id)
    if (!skill) return false
    
    // 不允许删除内置 skill
    if (skill.isBuiltIn) {
      throw new Error('Cannot delete built-in skills')
    }
    
    // 删除文件
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: skill.basePath || `.skills/${id}.md`
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to delete skill file')
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
 * 导入 skill 文件
 */
async function importSkillFile(file: File): Promise<Skill | null> {
  try {
    const content = await file.text()
    
    // 验证格式
    if (!content.match(/^---\n[\s\S]*?\n---/)) {
      throw new Error('Invalid skill file format: missing frontmatter')
    }
    
    // 生成文件名
    const id = file.name.replace('.md', '')
    
    // 上传文件
    const response = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `.skills/${id}.md`,
        content,
        overwrite: false
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }
    
    // 解析并返回
    const skill = await parseSkillFile(`${id}.md`)
    if (skill) {
      // 检查是否已存在
      const existingIndex = skills.value.findIndex(s => s.id === skill.id)
      if (existingIndex >= 0) {
        skills.value[existingIndex] = skill
      } else {
        skills.value.push(skill)
      }
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
      const keywords = scenario.toLowerCase().split(/\s+/)
      return keywords.some(keyword => keyword.length > 2 && input.includes(keyword))
    })
    
    if (matches) {
      matchedSkillIds.push(skill.id)
    }
  }
  
  return matchedSkillIds
}

/**
 * 初始化：加载所有 skills
 */
async function initSkills() {
  isLoading.value = true
  error.value = null
  
  try {
    // 先确保 skills 目录存在
    await fetch('/api/files/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '.skills' })
    }).catch(() => {/* 目录可能已存在 */})
    
    // 加载文件系统的 skills
    const fileSkills = await loadSkillsFromFilesystem()
    
    // 合并：内置 skills + 文件 skills（文件 skills 优先级更高）
    const builtinIds = new Set(BUILTIN_SKILLS.map(s => s.id))
    const customSkills = fileSkills.filter(s => !builtinIds.has(s.id))
    
    skills.value = [...BUILTIN_SKILLS, ...customSkills]
  } catch (e) {
    error.value = 'Failed to load skills'
    console.error(e)
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
    refreshSkills: loadSkillsFromFilesystem,
    
    // Invocation
    invokeSkill,
    matchSkills
  }
}
