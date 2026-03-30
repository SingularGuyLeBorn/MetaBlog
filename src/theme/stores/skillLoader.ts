/**
 * Skill Loader - 渐进式披露实现
 * 
 * 设计原则（基于 Claude Code Best Practices）：
 * 1. 第一层（~100 tokens）：只加载 name + description
 * 2. 第二层（激活时）：加载完整 SKILL.md 内容
 * 3. 第三层（按需）：加载 resources/ 下的资源
 */

import type { Skill } from '@/theme/types/agent'

// Skill 元数据（轻量级，始终保留在上下文中）
export interface SkillMetadata {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tools: string[]
}

// 激活的 Skill（完整内容已加载）
export interface ActiveSkill extends Skill {
  loadedAt: number
}

// 加载标记解析正则
const LOAD_SKILL_REGEX = /\[LOAD_SKILL:(\w+)\]/g

/**
 * 解析用户输入和 AI 回复，检测 Skill 加载请求
 */
export function parseSkillLoadRequests(text: string): string[] {
  const matches: string[] = []
  let match
  
  while ((match = LOAD_SKILL_REGEX.exec(text)) !== null) {
    matches.push(match[1])
  }
  
  // 去重
  return [...new Set(matches)]
}

/**
 * 从回复中移除加载标记（在发送给用户前）
 */
export function removeSkillLoadMarkers(text: string): string {
  return text.replace(LOAD_SKILL_REGEX, '').trim()
}

/**
 * 构建系统提示词（渐进式披露）
 */
export function buildProgressiveSystemPrompt(
  baseRole: string,
  availableSkills: SkillMetadata[],
  activeSkills: ActiveSkill[]
): string {
  const parts: string[] = []
  
  // === 第一层：角色定义 ===
  parts.push(`# ${baseRole}

你是一个智能 AI 助手。你具备以下基础能力：
- 自然对话和问答
- 代码编写和分析  
- 文章创作和编辑
- 学术研究和信息检索
- 文件和知识管理

**核心原则**：理解需求后再行动，不确定时主动询问。`)

  // === 第二层：可用 Skills 列表（仅元数据）===
  if (availableSkills.length > 0) {
    parts.push(`\n## 可用技能

你可以通过加载技能来获得专门能力。可用技能：

${availableSkills.map(s => `- **${s.name}** (${s.id}): ${s.description}`).join('\n')}

**加载方式**：当你判断需要使用某个技能时，在回复中输出：
\`\`\`
[LOAD_SKILL:skill_id]
\`\`\`

例如：\`[LOAD_SKILL:article-manager]\``)
  }

  // === 第三层：已激活的 Skills（完整内容）===
  if (activeSkills.length > 0) {
    parts.push(`\n## 当前已加载的技能

${activeSkills.map(s => `### ${s.name}
${s.content}`).join('\n\n')}`)
  }

  // === 使用指南 ===
  parts.push(`\n## 使用指南

1. **默认模式**：直接回答用户，不需要加载技能
2. **技能模式**：当任务需要专门能力时，输出 [LOAD_SKILL:xxx] 加载对应技能
3. **自我发现**：不确定时可以询问用户需要什么帮助

**决策流程**：
- 理解用户请求 → 判断是否需要特殊技能 → 如需则加载 → 执行`)

  return parts.join('\n')
}

/**
 * 加载 Skill 的完整内容
 */
export async function loadSkillContent(skillId: string): Promise<string | null> {
  try {
    // 从文件系统加载 Skill 内容
    const response = await fetch(`/api/files/read?path=src/theme/components/ai-chat/prompts/skills/${skillId}.md`)
    if (response.ok) {
      return await response.text()
    }
  } catch (e) {
    console.error(`[SkillLoader] Failed to load skill ${skillId}:`, e)
  }
  return null
}

/**
 * Skill 加载器 Hook（用于 Vue 组件）
 */
import { ref, computed } from 'vue'

export function useSkillLoader(availableSkills: Skill[]) {
  // 当前激活的 skills
  const activeSkills = ref<ActiveSkill[]>([])
  
  // 已激活的 skill IDs
  const activeSkillIds = computed(() => 
    new Set(activeSkills.value.map(s => s.id))
  )
  
  // Skill 元数据列表（轻量级）
  const skillMetadata = computed<SkillMetadata[]>(() => 
    availableSkills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      icon: s.icon,
      category: s.category,
      tools: s.tools || []
    }))
  )
  
  /**
   * 激活一个 Skill
   */
  async function activateSkill(skillId: string): Promise<boolean> {
    // 检查是否已激活
    if (activeSkillIds.value.has(skillId)) {
      return true
    }
    
    // 查找 skill 定义
    const skill = availableSkills.find(s => s.id === skillId)
    if (!skill) {
      console.error(`[SkillLoader] Skill not found: ${skillId}`)
      return false
    }
    
    // 加载完整内容
    const fullContent = await loadSkillContent(skillId)
    
    // 添加到激活列表
    activeSkills.value.push({
      ...skill,
      content: fullContent || skill.content,
      loadedAt: Date.now()
    })
    
    return true
  }
  
  /**
   * 处理 AI 回复，检测并应用 skill 加载请求
   */
  async function processSkillLoadRequests(aiResponse: string): Promise<{
    processedResponse: string
    loadedSkills: string[]
  }> {
    const requests = parseSkillLoadRequests(aiResponse)
    const loaded: string[] = []
    
    for (const skillId of requests) {
      const success = await activateSkill(skillId)
      if (success) {
        loaded.push(skillId)
      }
    }
    
    return {
      processedResponse: removeSkillLoadMarkers(aiResponse),
      loadedSkills: loaded
    }
  }
  
  /**
   * 清空所有激活的 skills
   */
  function clearActiveSkills() {
    activeSkills.value = []
  }
  
  return {
    activeSkills,
    activeSkillIds,
    skillMetadata,
    activateSkill,
    processSkillLoadRequests,
    clearActiveSkills,
    buildSystemPrompt: (baseRole: string) => 
      buildProgressiveSystemPrompt(baseRole, skillMetadata.value, activeSkills.value)
  }
}

// 导出单例用于非 Vue 环境
let globalActiveSkills: ActiveSkill[] = []

export function getGlobalActiveSkills(): ActiveSkill[] {
  return globalActiveSkills
}

export function setGlobalActiveSkills(skills: ActiveSkill[]) {
  globalActiveSkills = skills
}

export function addGlobalActiveSkill(skill: ActiveSkill) {
  if (!globalActiveSkills.find(s => s.id === skill.id)) {
    globalActiveSkills.push(skill)
  }
}
