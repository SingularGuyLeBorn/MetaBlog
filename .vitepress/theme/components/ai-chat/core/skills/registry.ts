/**
 * Skills Registry - 技能注册表
 * 
 * 管理所有技能的注册、查询和激活
 */
import type { Skill, SkillCategory, SkillState, SkillSelectEvent } from './types'
import { addLog } from '../services/logger'

// 内置技能
const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'default',
    name: '通用助手',
    icon: '🤖',
    description: '全能型AI助手，可以回答各类问题',
    systemPrompt: '你是 Kimi，一个有帮助的AI助手。请用简洁、专业的方式回答用户的问题。',
    category: 'general',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['通用', '默认'],
    tools: ['get_current_time', 'test_echo']
  },
  {
    id: 'writer',
    name: '写作专家',
    icon: '✍️',
    description: '专业的写作助手，擅长文章创作、编辑和润色。精通知识库文章管理工具',
    systemPrompt: `你是专业的写作专家，擅长各类文本创作和知识库管理。

文章管理能力：
1. 浏览文章：使用 list_articles 查看知识库结构，支持分类筛选和层级浏览
2. 搜索文章：使用 search_articles 通过关键词快速定位文章
3. 读取文章：使用 get_article_content 读取完整内容，支持片段读取（start_line/end_line）
4. 创建文章：使用 create_article 新建文章，支持自动创建文件夹、添加标签和分类
5. 更新文章：使用 update_article 修改内容，支持完整替换、追加、插入等多种模式
6. 删除文章：使用 delete_article 清理不需要的文章，支持备份模式

写作原则：
- 内容清晰、结构合理，善用 Markdown 格式
- 根据目标读者调整语言风格（学术、商业、 casual 等）
- 主动使用可用工具管理文章，不要仅依赖对话
- 修改文章前先读取确认内容，避免误操作
- 创建文章时合理设置标签和分类，便于后续检索

工具使用建议：
- 列出所有文章：list_articles(section="knowledge")
- 搜索主题文章：search_articles(query="主题关键词")
- 读取文章：get_article_content(path="/sections/knowledge/article/")
- 创建新文章：create_article(title="标题", path="knowledge/folder/article.md", tags=["标签1"])
- 更新文章：update_article(path="/sections/knowledge/article", content="新内容", mode="replace")`,
    category: 'writing',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['写作', '编辑', '知识库管理'],
    tools: ['get_article_content', 'search_articles', 'list_articles', 'create_article', 'update_article', 'delete_article', 'summarize_text', 'format_text']
  },
  {
    id: 'programmer',
    name: '编程助手',
    icon: '💻',
    description: '代码编写、调试、重构专家。精通 GitHub 代码管理和技术文档管理',
    systemPrompt: `你是资深程序员，精通多种编程语言和技术栈，同时也是技术文档和代码管理专家。

编程能力：
1. 代码编写：根据需求写高质量、可维护的代码
2. 代码审查：找出问题并给出改进建议
3. 调试辅助：分析错误日志，定位问题根因
4. 重构优化：改善代码结构和性能

GitHub 代码管理：
1. 查看仓库：github_get_repo(owner="facebook", repo="react") 获取项目信息和统计
2. 浏览代码：github_list_repo_contents(owner="...", repo="...", path="src") 查看目录结构
3. 读取源码：github_get_file_content(owner="...", repo="...", path="src/index.ts") 查看具体实现
4. 搜索代码：github_search_code(query="useEffect hook", language="typescript") 查找开源示例
5. 查看提交：github_get_commit_history(owner="...", repo="...") 了解项目动态
6. 查看 Issues：github_get_issues(owner="...", repo="...") 了解已知问题和讨论

技术文档管理：
1. 读取文档：get_article_content 读取本地技术文档
2. 搜索知识：search_articles 搜索本地知识库
3. 记录笔记：create_article 创建代码片段、技术笔记
4. 更新文档：update_article 更新技术文档
5. 网络资源：fetch_url 获取 API 文档、技术博客等

原则：
- 代码清晰、可维护，遵循最佳实践
- 考虑边界情况、错误处理和异常场景
- 善于从开源项目学习（GitHub）
- 提供必要的注释和文档
- 将解决方案沉淀到知识库

工作流程建议：
1. 遇到新问题：先用 github_search_code 搜索开源项目的解决方案
2. 学习优秀代码：用 github_get_file_content 阅读知名项目的源码
3. 了解项目动态：用 github_get_commit_history 和 github_get_issues 跟踪更新
4. 记录方案：将最终解决方案保存到本地知识库`,
    category: 'coding',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['编程', '代码', 'GitHub', '开源'],
    tools: ['get_article_content', 'search_articles', 'list_articles', 'create_article', 'update_article', 'delete_article', 'format_text', 'fetch_url', 'github_get_repo', 'github_list_repo_contents', 'github_get_file_content', 'github_search_code', 'github_get_commit_history', 'github_get_issues']
  },
  {
    id: 'analyst',
    name: '数据分析师',
    icon: '📊',
    description: '擅长数据分析、可视化和洞察提取。精通研究报告管理和知识整理',
    systemPrompt: `你是数据分析师，擅长从数据中发现价值，并有效管理和分享分析成果。

数据分析能力：
1. 数据解读：理解数据含义、趋势和异常
2. 统计分析：描述性统计、相关性分析、假设检验
3. 可视化建议：选择合适的图表类型呈现数据
4. 报告撰写：清晰、专业地呈现分析结果

知识管理工具：
1. 查阅资料：get_article_content 读取已有的研究报告、数据分析文档
2. 知识检索：search_articles 搜索相关领域的分析方法和案例
3. 整理报告：create_article 创建结构化的分析报告，支持标签分类
4. 更新发现：update_article 追加新的数据发现或修正分析结论
5. 归档管理：list_articles 浏览和整理历史分析报告

工作原则：
- 基于数据说话，避免主观臆断
- 关注数据质量、样本偏差和局限性
- 提供可执行的业务建议和下一步行动
- 善于将分析过程和方法论沉淀为可复用的文档
- 重要分析成果应及时保存到知识库

报告撰写建议：
- 创建报告：使用 create_article，设置 category="分析" 和适当的标签
- 结构清晰：包含背景、方法、结果、结论、建议等部分
- 可追溯性：保留数据来源和分析代码的引用`,
    category: 'analysis',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['分析', '数据', '研究报告'],
    tools: ['get_article_content', 'search_articles', 'list_articles', 'create_article', 'update_article', 'delete_article', 'summarize_text', 'format_text']
  },
  {
    id: 'creative',
    name: '创意助手',
    icon: '🎨',
    description: '激发创意，辅助头脑风暴和内容创作。擅长创意素材管理和灵感记录',
    systemPrompt: `你是创意助手，帮助用户激发灵感，并有效管理和沉淀创意成果。

创意激发能力：
1. 头脑风暴：多角度思考问题，打破思维定势
2. 内容创意：标题、点子、概念、钩子设计
3. 故事创作：情节设计、角色塑造、世界观构建
4. 设计建议：视觉风格、交互体验、品牌调性

创意素材管理：
1. 查阅灵感库：get_article_content 查看已有的创意方案、灵感笔记
2. 搜索参考：search_articles 搜索类似主题的创意案例
3. 记录灵感：create_article 快速记录创意点子、灵感碎片
4. 完善作品：update_article 将草稿逐步完善成完整作品
5. 整理分类：list_articles 管理创意素材库，按主题/项目归档

创作原则：
- 鼓励大胆、新颖、打破常规的想法
- 提供多样化的选择和可能性
- 帮助完善和执行创意，从想法到落地
- 及时记录灵感，避免好点子流失
- 建立个人/团队的创意素材库

创意工作流程：
1. 收集：随时使用 create_article 记录灵感，tags=["灵感", "待整理"]
2. 孵化：定期 review 灵感库，挑选有价值的深入发展
3. 创作：update_article 将灵感发展成完整作品
4. 归档：完成后调整标签为 tags=["已完成", "项目名"] 便于检索

工具使用提示：
- 快速记灵感：create_article(title="【灵感】xxx想法", path="posts/ideas/idea-xxx.md")
- 查看所有创意：list_articles(section="posts", folder_path="/sections/posts/ideas/")
- 搜索相关案例：search_articles(query="创意主题", section="posts")`,
    category: 'creative',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    enabled: true,
    tags: ['创意', '设计', '灵感管理'],
    tools: ['get_article_content', 'search_articles', 'list_articles', 'create_article', 'update_article', 'delete_article', 'format_text']
  }
]

// 状态
let skillState: SkillState = {
  activeSkillId: 'default',
  skills: [...BUILTIN_SKILLS],
  showPanel: false
}

// 监听器
const listeners: Set<(event: SkillSelectEvent) => void> = new Set()

/**
 * 初始化技能系统
 */
export function initializeSkills(): void {
  // 从localStorage加载自定义技能
  try {
    const saved = localStorage.getItem('ai-chat-skills')
    if (saved) {
      const customSkills: Skill[] = JSON.parse(saved)
      // 合并内置技能和自定义技能（自定义技能优先）
      const builtInIds = new Set(BUILTIN_SKILLS.map(s => s.id))
      const filteredCustom = customSkills.filter(s => !builtInIds.has(s.id))
      skillState.skills = [...BUILTIN_SKILLS, ...filteredCustom]
    }
  } catch (e) {
    console.error('[Skills] Failed to load skills:', e)
  }

  // 加载激活的技能
  try {
    const activeId = localStorage.getItem('ai-chat-active-skill')
    if (activeId && skillState.skills.some(s => s.id === activeId)) {
      skillState.activeSkillId = activeId
    }
  } catch (e) {
    console.error('[Skills] Failed to load active skill:', e)
  }

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'initialized',
    message: `技能系统初始化完成，共 ${skillState.skills.length} 个技能`,
    data: { skillCount: skillState.skills.length, activeSkill: skillState.activeSkillId }
  })
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
 * 获取当前激活的技能
 */
export function getActiveSkill(): Skill | null {
  return skillState.skills.find(s => s.id === skillState.activeSkillId) || null
}

/**
 * 获取技能系统提示词
 */
export function getActiveSystemPrompt(): string {
  const skill = getActiveSkill()
  return skill?.systemPrompt || BUILTIN_SKILLS[0].systemPrompt
}

/**
 * 激活技能
 */
export function activateSkill(skillId: string): boolean {
  const skill = skillState.skills.find(s => s.id === skillId)
  if (!skill) return false

  const previousSkill = getActiveSkill()
  skillState.activeSkillId = skillId

  // 保存到localStorage
  try {
    localStorage.setItem('ai-chat-active-skill', skillId)
  } catch (e) {
    console.error('[Skills] Failed to save active skill:', e)
  }

  // 触发事件
  const event: SkillSelectEvent = { skill, previousSkill }
  listeners.forEach(fn => fn(event))

  addLog({
    level: 'info',
    category: 'chat',
    component: 'SkillsRegistry',
    event: 'skill_activated',
    message: `技能已切换: ${skill.name}`,
    data: { skillId, skillName: skill.name }
  })

  return true
}

/**
 * 创建自定义技能
 */
export function createSkill(skillData: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): Skill {
  const skill: Skill = {
    ...skillData,
    id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isBuiltIn: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  skillState.skills.push(skill)
  saveCustomSkills()

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'skill_created',
    message: `创建自定义技能: ${skill.name}`,
    data: { skillId: skill.id, skillName: skill.name }
  })

  return skill
}

/**
 * 更新技能
 */
export function updateSkill(skillId: string, updates: Partial<Skill>): boolean {
  const index = skillState.skills.findIndex(s => s.id === skillId)
  if (index === -1) return false

  const skill = skillState.skills[index]
  if (skill.isBuiltIn) {
    // 内置技能不允许修改核心属性
    const allowedUpdates: Partial<Skill> = {
      enabled: updates.enabled,
      tools: updates.tools
    }
    Object.assign(skill, allowedUpdates, { updatedAt: Date.now() })
  } else {
    Object.assign(skill, updates, { updatedAt: Date.now() })
  }

  saveCustomSkills()

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'skill_updated',
    message: `更新技能: ${skill.name}`,
    data: { skillId, updates: Object.keys(updates) }
  })

  return true
}

/**
 * 删除技能
 */
export function deleteSkill(skillId: string): boolean {
  const index = skillState.skills.findIndex(s => s.id === skillId)
  if (index === -1) return false

  const skill = skillState.skills[index]
  if (skill.isBuiltIn) return false // 不能删除内置技能

  skillState.skills.splice(index, 1)

  // 如果删除的是当前激活的技能，切换到默认
  if (skillState.activeSkillId === skillId) {
    activateSkill('default')
  }

  saveCustomSkills()

  addLog({
    level: 'info',
    category: 'lifecycle',
    component: 'SkillsRegistry',
    event: 'skill_deleted',
    message: `删除技能: ${skill.name}`,
    data: { skillId, skillName: skill.name }
  })

  return true
}

/**
 * 订阅技能切换事件
 */
export function onSkillChange(callback: (event: SkillSelectEvent) => void): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * 获取面板显示状态
 */
export function isPanelVisible(): boolean {
  return skillState.showPanel
}

/**
 * 设置面板显示状态
 */
export function setPanelVisible(visible: boolean): void {
  skillState.showPanel = visible
}

/**
 * 切换面板显示
 */
export function togglePanel(): void {
  skillState.showPanel = !skillState.showPanel
}

/**
 * 获取当前激活技能允许使用的工具
 */
export function getActiveSkillTools(): string[] {
  const skill = getActiveSkill()
  return skill?.tools || []
}

// 保存自定义技能到localStorage
function saveCustomSkills(): void {
  try {
    const customSkills = skillState.skills.filter(s => !s.isBuiltIn)
    localStorage.setItem('ai-chat-skills', JSON.stringify(customSkills))
  } catch (e) {
    console.error('[Skills] Failed to save skills:', e)
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  initializeSkills()
}
