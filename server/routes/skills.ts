/**
 * Skills API Routes - 技能管理服务端路由
 * 
 * 数据持久化存储在 .data/skills.json
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'

const router = Router()

// 数据存储路径
const DATA_DIR = join(process.cwd(), '.data')
const SKILLS_FILE = join(DATA_DIR, 'skills.json')

// Skill 类型
export type SkillCategory = 'general' | 'writing' | 'coding' | 'analysis' | 'creative' | 'custom'

export interface Skill {
  id: string
  name: string
  icon: string
  description: string
  content: string  // SKILL.md 完整内容
  category: SkillCategory
  version: string
  isBuiltIn: boolean
  enabled: boolean
  createdAt: number
  updatedAt: number
  tags: string[]
  tools: string[]
  usageScenarios: string[]
  author?: string
}

// 统一响应类型
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// 读取所有 Skills
async function readSkills(): Promise<Skill[]> {
  await ensureDataDir()
  try {
    const data = await fs.readFile(SKILLS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    // 文件不存在，返回空数组
    return []
  }
}

// 写入所有 Skills
async function writeSkills(skills: Skill[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(SKILLS_FILE, JSON.stringify(skills, null, 2), 'utf-8')
}

// GET /api/skills - 获取所有 Skills
router.get('/', async (req, res) => {
  try {
    const skills = await readSkills()
    res.json({ success: true, data: skills } as ApiResponse<Skill[]>)
  } catch (error) {
    console.error('[Skills API] Failed to read:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read skills data' 
    } as ApiResponse)
  }
})

// GET /api/skills/:id - 获取单个 Skill
router.get('/:id', async (req, res) => {
  try {
    const skills = await readSkills()
    const skill = skills.find(s => s.id === req.params.id)
    
    if (!skill) {
      return res.status(404).json({ 
        success: false, 
        error: 'Skill not found' 
      } as ApiResponse)
    }
    
    res.json({ success: true, data: skill } as ApiResponse<Skill>)
  } catch (error) {
    console.error('[Skills API] Failed to get skill:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get skill' 
    } as ApiResponse)
  }
})

// POST /api/skills - 创建 Skill
router.post('/', async (req, res) => {
  try {
    const params = req.body
    const skills = await readSkills()
    
    const now = Date.now()
    const newSkill: Skill = {
      id: `skill-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name || '未命名技能',
      icon: params.icon || '🔧',
      description: params.description || '',
      content: params.content || '',
      category: params.category || 'custom',
      version: params.version || '1.0.0',
      isBuiltIn: false,
      enabled: params.enabled ?? true,
      createdAt: now,
      updatedAt: now,
      tags: params.tags || [],
      tools: params.tools || [],
      usageScenarios: params.usageScenarios || [],
      author: params.author
    }
    
    skills.push(newSkill)
    await writeSkills(skills)
    
    res.json({ success: true, data: newSkill } as ApiResponse<Skill>)
  } catch (error) {
    console.error('[Skills API] Failed to create:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create skill' 
    } as ApiResponse)
  }
})

// PATCH /api/skills/:id - 更新 Skill
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const skills = await readSkills()
    
    const index = skills.findIndex(s => s.id === id)
    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Skill not found' 
      } as ApiResponse)
    }
    
    // 不允许修改内置技能标记
    delete updates.isBuiltIn
    delete updates.id
    
    skills[index] = {
      ...skills[index],
      ...updates,
      updatedAt: Date.now()
    }
    
    await writeSkills(skills)
    res.json({ success: true, data: skills[index] } as ApiResponse<Skill>)
  } catch (error) {
    console.error('[Skills API] Failed to update:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update skill' 
    } as ApiResponse)
  }
})

// DELETE /api/skills/:id - 删除 Skill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const skills = await readSkills()
    
    const skill = skills.find(s => s.id === id)
    if (!skill) {
      return res.status(404).json({ 
        success: false, 
        error: 'Skill not found' 
      } as ApiResponse)
    }
    
    // 不允许删除内置技能
    if (skill.isBuiltIn) {
      return res.status(403).json({ 
        success: false, 
        error: 'Cannot delete built-in skill' 
      } as ApiResponse)
    }
    
    const filtered = skills.filter(s => s.id !== id)
    await writeSkills(filtered)
    
    res.json({ success: true } as ApiResponse)
  } catch (error) {
    console.error('[Skills API] Failed to delete:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete skill' 
    } as ApiResponse)
  }
})

export default router
