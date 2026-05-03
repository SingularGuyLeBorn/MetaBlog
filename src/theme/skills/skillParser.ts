/**
 * ============================================================================
 * Skill 系统 - skillParser
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/skills
 */


import type { ParsedSkillFile, Skill, SkillMetadata } from './types'

// ═══════════════════════════════════════════════════════════════
// YAML Frontmatter 解析
// ═══════════════════════════════════════════════════════════════

const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/

/**
 * 简单 YAML 解析器 (不支持嵌套对象)
 */
function parseYAML(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split('\n')
  let currentKey: string | null = null
  let currentList: string[] = []
  let isInList = false

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#')) continue

    // 列表项
    if (trimmed.startsWith('- ')) {
      if (isInList && currentKey) {
        currentList.push(trimmed.slice(2).trim())
      }
      continue
    }

    // 键值对
    const match = trimmed.match(/^([^:]+):\s*(.*)$/)
    if (match) {
      // 保存之前的列表
      if (isInList && currentKey) {
        result[currentKey] = currentList
        currentList = []
        isInList = false
      }

      const [, key, value] = match
      currentKey = key.trim()
      const trimmedValue = value.trim()

      if (trimmedValue === '') {
        // 可能是列表的开始
        isInList = true
        currentList = []
      } else {
        // 移除引号
        result[currentKey] = trimmedValue.replace(/^["']|["']$/g, '')
        isInList = false
      }
    }
  }

  // 处理最后的列表
  if (isInList && currentKey) {
    result[currentKey] = currentList
  }

  return result
}

/**
 * 将 YAML 值转换为数组
 */
function parseList(value: string | string[] | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  // 逗号分隔的字符串
  return value.split(',').map(s => s.trim()).filter(Boolean)
}

// ═══════════════════════════════════════════════════════════════
// Skill 文件解析
// ═══════════════════════════════════════════════════════════════

/**
 * 解析单个 Skill 文件内容
 */
export function parseSkillFile(content: string, filePath?: string): ParsedSkillFile {
  const match = content.match(FRONTMATTER_REGEX)

  if (!match) {
    throw new Error(`Invalid skill file format: missing frontmatter${filePath ? ` in ${filePath}` : ''}`)
  }

  const [, yamlContent, markdownContent] = match
  const yaml = parseYAML(yamlContent)

  // 提取 metadata
  const metadata: SkillMetadata = {
    id: yaml.id || '',
    name: yaml.name || yaml.id || '',
    description: yaml.description || '',
    icon: yaml.icon || '📦',
    category: yaml.category || 'custom',
    version: yaml.version || '1.0.0',
    tags: parseList(yaml.tags),
    author: yaml.author || 'system',
    isBuiltIn: yaml.builtin === 'true' || yaml.builtin === true,
    enabled: yaml.enabled !== 'false' && yaml.enabled !== false,
    tools: parseList(yaml.tools),
    usageScenarios: parseList(yaml.scenarios)
  }

  // 验证必要字段
  if (!metadata.id) {
    throw new Error(`Skill missing required field: id${filePath ? ` in ${filePath}` : ''}`)
  }

  // 提取 Prompt 部分 (从 ## Prompt 开始)
  let prompt = markdownContent
  const promptMatch = markdownContent.match(/##\s*Prompt\s*\n([\s\S]*)/i)
  if (promptMatch) {
    prompt = promptMatch[1].trim()
  }

  return {
    metadata,
    content: markdownContent.trim(),
    prompt
  }
}

/**
 * 从文件路径提取 Skill ID
 */
export function extractSkillIdFromPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  const filename = parts[parts.length - 1]
  // 如果是 SKILL.md,取父目录名
  if (filename === 'SKILL.md') {
    return parts[parts.length - 2] || ''
  }
  // 否则去掉扩展名
  return filename.replace(/\.md$/i, '')
}

// ═══════════════════════════════════════════════════════════════
// Skill 文件加载
// ═══════════════════════════════════════════════════════════════

/**
 * 从字符串构建完整 Skill 对象
 */
export function buildSkillFromContent(content: string, filePath?: string): Skill {
  const parsed = parseSkillFile(content, filePath)
  const now = Date.now()

  return {
    ...parsed.metadata,
    content: parsed.prompt,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 加载所有 Skill 文件
 * 
 * 注意: 这个函数在浏览器环境中使用 fetch,
 * 在 Node 环境中需要传入自定义的 readFile 函数
 */
export async function loadSkillsFromDirectory(
  baseUrl: string,
  skillIds: string[]
): Promise<Skill[]> {
  const skills: Skill[] = []

  for (const id of skillIds) {
    try {
      const url = `${baseUrl}/${id}/SKILL.md`
      const response = await fetch(url)

      if (!response.ok) {
        console.warn(`[SkillParser] Failed to load skill ${id}: ${response.status}`)
        continue
      }

      const content = await response.text()
      const skill = buildSkillFromContent(content, url)
      skills.push(skill)
    } catch (error) {
      console.error(`[SkillParser] Error loading skill ${id}:`, error)
    }
  }

  return skills
}

/**
 * 从本地文件系统加载所有 Skill (用于开发/构建时)
 * 
 * @param readFile - 文件读取函数 (fs.promises.readFile 的封装)
 * @param skillsDir - Skill 目录路径
 */
export async function loadAllSkillsFromFS(
  readFile: (path: string) => Promise<string>,
  skillsDir: string,
  subDirs: string[]
): Promise<Skill[]> {
  const skills: Skill[] = []

  for (const dir of subDirs) {
    try {
      const filePath = `${skillsDir}/${dir}/SKILL.md`
      const content = await readFile(filePath)
      const skill = buildSkillFromContent(content, filePath)
      skills.push(skill)
    } catch (error) {
      console.warn(`[SkillParser] Failed to load skill from ${dir}:`, error)
    }
  }

  return skills
}

// ═══════════════════════════════════════════════════════════════
// 预设 Skill IDs (与 .skills/ 目录对应)
// ═══════════════════════════════════════════════════════════════

/** 内置 Skill ID 列表 */
export const BUILTIN_SKILL_IDS = [
  'article-manager',
  'academic-research',
  'code-craft',
  'content-analyst',
  'creative-designer',
  'data-analyst',
  'file-manager',
  'fullstack-developer',
  'project-manager',
  'research-assistant',
  'translate-expert',
  'weather-assistant',
  'writing-master',
  'feishu-assistant',
  'image-research'
] as const

/** 内置 Skill 分类映射 */
export const SKILL_CATEGORY_MAP: Record<string, string> = {
  'article-manager': 'content',
  'academic-research': 'research',
  'code-craft': 'code',
  'content-analyst': 'content',
  'creative-designer': 'content',
  'data-analyst': 'system',
  'file-manager': 'file',
  'fullstack-developer': 'code',
  'project-manager': 'system',
  'research-assistant': 'research',
  'translate-expert': 'system',
  'weather-assistant': 'system',
  'writing-master': 'content',
  'image-research': 'research'
}
