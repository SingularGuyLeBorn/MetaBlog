/**
 * Skills Registry - 技能注册表
 * 
 * 设计原则：
 * - Skill 不定义"你是谁"（身份），只定义"你能做什么"（能力）
 * - Skill 提供工具使用场景、方法论、输入输出格式
 * - 身份由 Agent 的 baseRole 定义
 * 
 * 数据源：后端API（唯一数据源）
 */

import type { Skill, SkillCategory } from '../types/agent'
import * as agentStorage from '../services/agentStorage'

// 内置技能 - 使用新的 content 架构
const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'writer',
    name: '文章管理',
    icon: '📄',
    description: '知识库文章的管理和写作能力',
    content: `当你需要处理知识库文章时，请遵循以下指南：

## 文章管理流程

1. **查找已有文章**
   - 使用 search_articles(query="关键词") 搜索相关文章
   - 使用 list_articles(section="knowledge") 浏览知识库结构
   - 使用 get_article_content(path="...") 读取文章内容

2. **创建新文章**
   - 使用 create_article(title="标题", path="knowledge/folder/article.md", content="内容")
   - 合理设置 tags 和 category 便于后续检索
   - 使用 Markdown 格式编写内容

3. **更新文章**
   - 使用 update_article(path="...", content="新内容", mode="replace|append|prepend")
   - 修改前先用 get_article_content 确认内容
   - 支持追加、插入、替换等多种模式

4. **删除文章**
   - 使用 delete_article(path="...") 删除不需要的文章
   - 重要文章建议先备份再删除

## 注意事项
- 文章路径格式：knowledge/folder/article.md
- 标签建议：["标签1", "标签2"]
- 分类建议：knowledge、tech、life 等`,
    usageScenarios: [
      '用户要求创建、编辑、删除知识库文章',
      '用户要求整理知识库结构',
      '用户要求搜索或查看已有文章',
      '用户要求总结或格式化文章内容'
    ],
    category: 'writing',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['文章管理', '知识库', '写作'],
    tools: ['get_article_content', 'search_articles', 'list_articles', 'create_article', 'update_article', 'delete_article', 'summarize_text', 'format_text'],
    version: '1.0.0'
  },
  {
    id: 'github',
    name: 'GitHub 代码管理',
    icon: '🐙',
    description: 'GitHub 代码仓库的浏览、搜索和管理能力',
    content: `当你需要处理 GitHub 代码相关任务时，请遵循以下指南：

## 代码浏览流程

1. **查看仓库信息**
   - 使用 github_get_repo(owner="facebook", repo="react") 获取项目信息
   - 了解项目描述、Star 数、Fork 数、主要语言等

2. **浏览目录结构**
   - 使用 github_list_repo_contents(owner="...", repo="...", path="src") 
   - 查看文件和目录结构，定位关键代码

3. **读取源代码**
   - 使用 github_get_file_content(owner="...", repo="...", path="src/index.ts")
   - 查看具体实现细节

4. **搜索代码示例**
   - 使用 github_search_code(query="useEffect hook", language="typescript")
   - 在开源项目中查找最佳实践和示例代码

5. **了解项目动态**
   - 使用 github_get_commit_history(owner="...", repo="...") 查看近期提交
   - 使用 github_get_issues(owner="...", repo="...") 了解已知问题

## 使用场景
- 学习开源项目的实现方式
- 查找特定功能的代码示例
- 了解项目的最新动态
- 分析项目架构和目录结构

## 注意事项
- 搜索时使用具体的关键词，如 "useEffect dependency"
- 优先参考知名项目的代码（高 Star 数）
- 注意代码的 License 信息`,
    usageScenarios: [
      '用户要求查看某个 GitHub 仓库的信息',
      '用户要求学习开源项目的代码实现',
      '用户要求搜索特定功能的代码示例',
      '用户要求了解项目的最新动态和 Issues'
    ],
    category: 'coding',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['GitHub', '代码管理', '开源'],
    tools: ['github_get_repo', 'github_list_repo_contents', 'github_get_file_content', 'github_search_code', 'github_get_commit_history', 'github_get_issues'],
    version: '1.0.0'
  },
  {
    id: 'file-ops',
    name: '文件操作',
    icon: '📁',
    description: '本地文件的读取、写入和管理能力',
    content: `当你需要处理本地文件时，请遵循以下指南：

## 文件操作流程

1. **读取文件**
   - 使用 read_file(path="/path/to/file") 读取文件内容
   - 支持文本文件、代码文件等

2. **写入文件**
   - 使用 write_file(path="...", content="内容") 创建或覆盖文件
   - 确保目录存在，路径正确

3. **列出目录**
   - 使用 list_files(directory="/path/to/dir") 查看目录内容
   - 了解文件结构和组织方式

## 注意事项
- 文件路径使用绝对路径
- 写入前确认路径和文件名
- 重要文件操作前建议备份`,
    usageScenarios: [
      '用户要求读取或查看本地文件',
      '用户要求创建或修改文件',
      '用户要求列出目录内容'
    ],
    category: 'coding',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['文件操作', '本地文件'],
    tools: ['read_file', 'write_file', 'list_files'],
    version: '1.0.0'
  },
  {
    id: 'web-search',
    name: '网络搜索',
    icon: '🔍',
    description: '网络搜索和信息获取能力',
    content: `当你需要搜索网络信息或获取网页内容时，请遵循以下指南：

## 信息获取流程

1. **搜索信息**
   - 使用 web_search(query="关键词") 搜索网络信息
   - 获取搜索结果摘要

2. **获取网页内容**
   - 使用 fetch_url(url="https://...") 获取完整网页内容
   - 提取关键信息

## 使用场景
- 查询最新的技术资讯
- 获取 API 文档或技术博客
- 搜索特定问题的解决方案
- 获取网页的完整内容进行分析

## 注意事项
- 搜索关键词要具体
- 优先参考权威来源
- 注意信息的时效性`,
    usageScenarios: [
      '用户要求搜索网络信息',
      '用户要求获取某个网页的内容',
      '用户要求查询最新资讯或文档'
    ],
    category: 'analysis',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['搜索', '网络', '信息获取'],
    tools: ['web_search', 'fetch_url'],
    version: '1.0.0'
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    icon: '📊',
    description: '数据计算、统计分析和格式化能力',
    content: `当你需要进行数据分析或计算时，请遵循以下指南：

## 数据分析流程

1. **执行计算**
   - 使用 calculate(expression="公式") 进行数学计算
   - 支持复杂表达式和函数

2. **文本分析**
   - 使用 summarize_text(text="...") 总结长文本
   - 使用 format_text(text="...", format="markdown|json|yaml") 格式化文本

3. **数据分析建议**
   - 提供统计分析方法和可视化建议
   - 帮助解读数据含义和趋势

## 使用场景
- 需要进行数学计算
- 需要总结长篇文章
- 需要格式化数据结构
- 需要进行数据分析

## 注意事项
- 计算表达式要准确
- 总结时保留关键信息
- 格式转换时注意数据完整性`,
    usageScenarios: [
      '用户要求进行数学计算',
      '用户要求总结文章内容',
      '用户要求格式化数据',
      '用户要求进行数据分析'
    ],
    category: 'analysis',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['数据分析', '计算', '统计'],
    tools: ['calculate', 'summarize_text', 'format_text'],
    version: '1.0.0'
  },
  {
    id: 'time-weather',
    name: '时间与天气',
    icon: '⏰',
    description: '获取当前时间和天气信息的能力',
    content: `当用户询问时间或天气时，请使用以下工具：

## 可用信息

1. **当前时间**
   - 使用 get_current_time() 获取当前时间
   - 提供时间相关的建议

2. **天气信息**
   - 使用 get_weather(location="城市") 获取天气信息
   - 提供天气相关的建议

## 使用场景
- 用户询问当前时间
- 用户询问某个城市的天气
- 用户需要基于时间或天气的建议`,
    usageScenarios: [
      '用户询问当前时间',
      '用户询问天气情况',
      '用户需要基于时间或天气的建议'
    ],
    category: 'general',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['时间', '天气', '实用工具'],
    tools: ['get_current_time', 'get_weather'],
    version: '1.0.0'
  }
]

// 状态
interface SkillState {
  activeSkillId: string | null
  skills: Skill[]
  showPanel: boolean
}

let skillState: SkillState = {
  activeSkillId: null,
  skills: [...BUILTIN_SKILLS],
  showPanel: false
}

// 监听器
const listeners: Set<(event: SkillSelectEvent) => void> = new Set()

/** Skill 选择事件 */
export interface SkillSelectEvent {
  skill: Skill
  timestamp: number
}

/**
 * 初始化技能系统
 */
export async function initializeSkills(): Promise<void> {
  try {
    // 从后端加载自定义技能
    const customSkills = await agentStorage.getSkills()
    
    // 合并内置技能和自定义技能（自定义技能优先）
    const builtInIds = new Set(BUILTIN_SKILLS.map(s => s.id))
    const filteredCustom = customSkills.filter(s => !builtInIds.has(s.id))
    
    skillState.skills = [...BUILTIN_SKILLS, ...filteredCustom]
    
    console.log(`[Skills] 技能系统初始化完成，共 ${skillState.skills.length} 个技能`)
  } catch (e) {
    console.error('[Skills] Failed to initialize:', e)
    // 使用内置技能作为回退
    skillState.skills = [...BUILTIN_SKILLS]
  }
}

/**
 * 获取所有技能
 */
export function getAllSkills(): Skill[] {
  return [...skillState.skills]
}

/**
 * 获取技能分类
 */
export function getSkillsByCategory(category: SkillCategory): Skill[] {
  return skillState.skills.filter(s => s.category === category)
}

/**
 * 根据ID获取技能
 */
export function getSkillById(id: string): Skill | undefined {
  return skillState.skills.find(s => s.id === id)
}

/**
 * 创建自定义技能
 */
export async function createSkill(skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): Promise<Skill | null> {
  const skill = await agentStorage.createSkill(skillData)
  
  if (skill) {
    skillState.skills.push(skill)
    console.log(`[Skills] 技能已创建: ${skill.name}`)
  }
  
  return skill
}

/**
 * 更新技能
 */
export async function updateSkill(id: string, updates: Partial<Skill>): Promise<Skill | null> {
  const skill = await agentStorage.updateSkill(id, updates)
  
  if (skill) {
    const index = skillState.skills.findIndex(s => s.id === id)
    if (index !== -1) {
      skillState.skills[index] = skill
    }
  }
  
  return skill
}

/**
 * 删除技能
 */
export async function deleteSkill(id: string): Promise<boolean> {
  const success = await agentStorage.deleteSkill(id)
  
  if (success) {
    skillState.skills = skillState.skills.filter(s => s.id !== id)
    console.log(`[Skills] 技能已删除: ${id}`)
  }
  
  return success
}

/**
 * 刷新技能列表
 */
export async function refreshSkills(): Promise<void> {
  await initializeSkills()
}

/**
 * 设置面板显示状态
 */
export function setSkillsPanelVisible(visible: boolean): void {
  skillState.showPanel = visible
}

/**
 * 获取面板显示状态
 */
export function isSkillsPanelVisible(): boolean {
  return skillState.showPanel
}

/**
 * 切换面板显示状态
 */
export function toggleSkillsPanel(): void {
  skillState.showPanel = !skillState.showPanel
}

/**
 * 订阅技能选择事件
 */
export function onSkillSelect(callback: (event: SkillSelectEvent) => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * 获取多个技能的组合能力描述
 * 用于构建系统提示词
 */
export function getCombinedCapabilityDescription(skillIds: string[]): string {
  const selectedSkills = skillState.skills.filter(s => skillIds.includes(s.id))
  
  if (selectedSkills.length === 0) {
    return ''
  }
  
  const sections: string[] = []
  
  selectedSkills.forEach(skill => {
    sections.push(`\n## ${skill.name}`)
    sections.push(skill.content)
    
    if (skill.usageScenarios && skill.usageScenarios.length > 0) {
      sections.push('\n适用场景：')
      skill.usageScenarios.forEach(scenario => {
        sections.push(`- ${scenario}`)
      })
    }
  })
  
  return sections.join('\n')
}

// 自动初始化（在浏览器环境）
if (typeof window !== 'undefined') {
  initializeSkills()
}

// 重新导出存储服务
export { agentStorage }
