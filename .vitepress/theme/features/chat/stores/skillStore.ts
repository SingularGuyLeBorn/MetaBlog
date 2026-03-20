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
  },
  {
    id: 'academic-research',
    name: '学术研究',
    description: '访问ArXiv、OpenReview、Hugging Face等学术平台',
    icon: '🎓',
    category: 'research',
    content: `# 学术研究助手

## 能力范围

你是一个学术研究助手，擅长查找论文、研究成果和AI模型。

## ArXiv 论文库
- search_arxiv(query, category, max_results) - 搜索论文
- fetch_arxiv(paper_id) - 获取论文详情
- 分类：cs.AI, cs.CL, cs.CV, cs.LG等

## OpenReview 会议论文
- search_openreview(query, venue) - 搜索会议论文
- fetch_openreview(paper_id, include_reviews) - 获取论文及评审
- 支持：ICLR, NeurIPS, ICML等

## Hugging Face 模型库
- search_huggingface(query, type, task) - 搜索模型/数据集
- fetch_huggingface_model(repo_id, type) - 获取模型详情

## 使用原则
1. 主动使用工具获取最新信息
2. 提供论文/模型的关键信息摘要
3. 给出相关建议和链接`,
    usageScenarios: [
      '查找学术论文',
      '搜索AI模型',
      '了解研究进展',
      '获取会议论文评审'
    ],
    tools: ['search_arxiv', 'fetch_arxiv', 'search_openreview', 'fetch_openreview', 'search_huggingface', 'fetch_huggingface_model'],
    version: '1.0.0',
    tags: ['学术', '论文', 'ArXiv', 'OpenReview', 'Hugging Face'],
    isBuiltIn: true,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'article-manager',
    name: '文章管理',
    description: '创建、查看、编辑、删除个人文章和笔记',
    icon: '📝',
    category: 'writing',
    content: `# 文章管理助手

## 能力范围

你是一个文章管理助手，帮助用户管理个人文章和笔记。

## 可用工具

### 创建文章
- create_article(title, content, tags, category, status)
- 自动提取摘要
- 支持草稿(draft)和发布(published)状态

### 查看文章
- get_article(article_id) - 获取单篇文章
- list_articles(category, tag, status, limit) - 列出文章
- search_articles(query, limit) - 搜索文章

### 更新文章
- update_article(article_id, title, content, tags, category, status)
- 支持部分更新

### 删除文章
- delete_article(article_id)
- 永久删除，谨慎使用

## 使用原则
1. 为用户自动提取合适的摘要
2. 建议合适的标签和分类
3. 帮助整理文章结构
4. 使用 Markdown 格式`,
    usageScenarios: [
      '创建新文章或笔记',
      '查看已有文章',
      '编辑文章内容',
      '删除不需要的文章',
      '整理文章分类'
    ],
    tools: ['create_article', 'get_article', 'update_article', 'delete_article', 'list_articles', 'search_articles'],
    version: '1.0.0',
    tags: ['文章', '笔记', '管理', '写作'],
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
 * 创建新的 skill（使用后端 API）
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
 * 更新 skill（使用后端 API）
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
 * 删除 skill（使用后端 API）
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
 * 导入 skill 文件（使用后端 API）
 */
async function importSkillFile(file: File): Promise<Skill | null> {
  try {
    const fileContent = await file.text()
    
    // 验证格式
    if (!fileContent.match(/^---\n[\s\S]*?\n---/)) {
      throw new Error('Invalid skill file format: missing frontmatter')
    }
    
    // 解析 frontmatter
    const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return null
    
    const frontmatter = frontmatterMatch[1]
    const content = fileContent.replace(/^---\n[\s\S]*?\n---\n*/, '').trim()
    
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
      const inlineMatch = frontmatter.match(new RegExp(`^${name}:\\s*\\[(.+?)\\]`, 'm'))
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
    
    // 合并：内置 skills + 后端 skills（后端 skills 优先级更高）
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
// 导出渐进式披露相关函数（从 skillLoader.ts 导入）
export {
  useSkillLoader,
  parseSkillLoadRequests,
  removeSkillLoadMarkers,
  buildProgressiveSystemPrompt,
  loadSkillContent,
  getGlobalActiveSkills,
  setGlobalActiveSkills,
  addGlobalActiveSkill,
  type SkillMetadata,
  type ActiveSkill
} from './skillLoader'

/**
 * 构建渐进式披露的系统提示词
 * 
 * 使用方式：
 * ```ts
 * const { buildSystemPrompt, processSkillLoadRequests } = useSkillLoader(skills.value)
 * const systemPrompt = buildSystemPrompt('你是一个AI助手')
 * 
 * // AI 回复后处理
 * const { processedResponse, loadedSkills } = await processSkillLoadRequests(aiResponse)
 * ```
 */
