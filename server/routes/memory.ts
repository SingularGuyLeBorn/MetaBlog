/**
 * Memory API Routes - 记忆管理服务端路由
 * 提供实体、任务、会话的 CRUD API
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, dirname } from 'path'

const router = Router()

// 记忆存储路径
const MEMORY_PATH = join(process.cwd(), 'docs', '.vitepress', 'memory')

// 确保目录存在
async function ensureDir(path: string): Promise<void> {
  try {
    await fs.mkdir(path, { recursive: true })
  } catch (e) {
    // 忽略已存在错误
  }
}

// 初始化目录（按分类：context/entities/skills/tasks）
ensureDir(join(MEMORY_PATH, 'context'))
ensureDir(join(MEMORY_PATH, 'entities'))
ensureDir(join(MEMORY_PATH, 'skills'))
ensureDir(join(MEMORY_PATH, 'tasks'))

// ============================================
// Entities API - /entities
// ============================================

// 获取所有实体
router.get('/entities', async (req, res) => {
  try {
    const entitiesDir = join(MEMORY_PATH, 'entities')
    const files = await fs.readdir(entitiesDir).catch(() => [])
    
    const entities: any[] = []
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(entitiesDir, file), 'utf-8')
      entities.push(...JSON.parse(content))
    }
    
    res.json(entities)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load entities' })
  }
})

// 获取单个实体
router.get('/entities/:id', async (req, res) => {
  try {
    const { id } = req.params
    const files = await fs.readdir(join(MEMORY_PATH, 'entities'))
    
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const content = await fs.readFile(join(MEMORY_PATH, 'entities', file), 'utf-8')
      const entities = JSON.parse(content)
      const entity = entities.find((e: any) => e.id === id)
      if (entity) {
        return res.json(entity)
      }
    }
    
    res.status(404).json({ error: 'Entity not found' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get entity' })
  }
})

// 保存实体
router.put('/entities/:id', async (req, res) => {
  try {
    const { id } = req.params
    const entity = req.body
    const type = entity.type || 'concept'
    const filePath = join(MEMORY_PATH, 'entities', `${type}s.json`)
    
    // 读取现有数据
    let entities: any[] = []
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      entities = JSON.parse(content)
    } catch (e) {
      // 文件不存在，创建新数组
    }
    
    // 更新或添加
    const index = entities.findIndex((e: any) => e.id === id)
    if (index >= 0) {
      entities[index] = { ...entity, updatedAt: Date.now() }
    } else {
      entities.push({ ...entity, createdAt: Date.now(), updatedAt: Date.now() })
    }
    
    // 保存
    await fs.writeFile(filePath, JSON.stringify(entities, null, 2))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save entity' })
  }
})

// 删除实体
router.delete('/entities/:id', async (req, res) => {
  try {
    const { id } = req.params
    const files = await fs.readdir(join(MEMORY_PATH, 'entities'))
    
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const filePath = join(MEMORY_PATH, 'entities', file)
      const content = await fs.readFile(filePath, 'utf-8')
      const entities = JSON.parse(content)
      const filtered = entities.filter((e: any) => e.id !== id)
      
      if (filtered.length !== entities.length) {
        await fs.writeFile(filePath, JSON.stringify(filtered, null, 2))
        return res.json({ success: true })
      }
    }
    
    res.status(404).json({ error: 'Entity not found' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entity' })
  }
})

// 搜索实体
router.get('/entities/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q) return res.json([])
    
    const query = (q as string).toLowerCase()
    const allEntities = await getAllEntities()
    
    const results = allEntities.filter((e: any) => 
      e.name.toLowerCase().includes(query) ||
      (e.description && e.description.toLowerCase().includes(query))
    )
    
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: 'Failed to search entities' })
  }
})

// ============================================
// 任务历史 API
// ============================================

// 获取所有任务
router.get('/tasks', async (req, res) => {
  try {
    const tasksDir = join(MEMORY_PATH, 'tasks')
    const files = await fs.readdir(tasksDir).catch(() => [])
    
    const tasks: any[] = []
    for (const file of files.filter(f => f.startsWith('task_') && f.endsWith('.json'))) {
      const content = await fs.readFile(join(tasksDir, file), 'utf-8')
      tasks.push(JSON.parse(content))
    }
    
    // 按时间排序
    tasks.sort((a, b) => b.startedAt - a.startedAt)
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' })
  }
})

// 获取单个任务
router.get('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const filePath = join(MEMORY_PATH, 'tasks', `${id}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    res.json(JSON.parse(content))
  } catch (error) {
    res.status(404).json({ error: 'Task not found' })
  }
})

// 保存任务
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const task = req.body
    const filePath = join(MEMORY_PATH, 'tasks', `${id}.json`)
    
    await ensureDir(dirname(filePath))
    await fs.writeFile(filePath, JSON.stringify(task, null, 2))
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save task' })
  }
})

// 删除任务
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params
    const filePath = join(MEMORY_PATH, 'tasks', `${id}.json`)
    await fs.unlink(filePath)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// ============================================
// Context API - /context (sessions stored here)
// ============================================

// 获取所有会话
router.get('/context', async (req, res) => {
  try {
    const sessionsDir = join(MEMORY_PATH, 'sessions')
    const files = await fs.readdir(sessionsDir).catch(() => [])
    
    const sessions: any[] = []
    for (const file of files.filter(f => f.startsWith('sess_') && f.endsWith('.json'))) {
      const content = await fs.readFile(join(sessionsDir, file), 'utf-8')
      sessions.push(JSON.parse(content))
    }
    
    res.json(sessions)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load sessions' })
  }
})

// 获取单个会话
router.get('/context/:id', async (req, res) => {
  try {
    const { id } = req.params
    const filePath = join(MEMORY_PATH, 'context', `${id}.json`)
    const content = await fs.readFile(filePath, 'utf-8')
    res.json(JSON.parse(content))
  } catch (error) {
    res.status(404).json({ error: 'Session not found' })
  }
})

// 保存会话
router.put('/context/:id', async (req, res) => {
  try {
    const { id } = req.params
    const session = req.body
    const filePath = join(MEMORY_PATH, 'context', `${id}.json`)
    
    await ensureDir(dirname(filePath))
    await fs.writeFile(filePath, JSON.stringify(session, null, 2))
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save session' })
  }
})

// 删除会话
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const filePath = join(MEMORY_PATH, 'sessions', `${id}.json`)
    await fs.unlink(filePath)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

// ============================================
// 辅助函数
// ============================================

async function getAllEntities(): Promise<any[]> {
  const entitiesDir = join(MEMORY_PATH, 'entities')
  const files = await fs.readdir(entitiesDir).catch(() => [])
  
  const entities: any[] = []
  for (const file of files.filter(f => f.endsWith('.json'))) {
    const content = await fs.readFile(join(entitiesDir, file), 'utf-8')
    entities.push(...JSON.parse(content))
  }
  
  return entities
}

export default router
