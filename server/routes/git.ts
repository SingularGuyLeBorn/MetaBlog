/**
 * Git API Routes - Git 操作服务端路由
 * 
 * **N1 修复**: 统一使用 GitOperator，避免与 Agent 层的 Git 操作竞争
 */
import { Router } from 'express'
import { gitOperator } from '../utils/GitOperator'

const router = Router()

// ============================================
// 状态与信息
// ============================================

// 获取状态
router.get('/status', async (req, res) => {
  try {
    const status = await gitOperator.getStatus()
    res.json({
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified,
      added: status.staged,
      deleted: status.modified.filter(f => !status.staged.includes(f)),
      untracked: status.untracked
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get git status' })
  }
})

// 获取提交日志
router.get('/log', async (req, res) => {
  try {
    const { maxCount = 50, path, author } = req.query
    
    const commits = await gitOperator.getLog(
      parseInt(maxCount as string),
      path as string | undefined
    )
    
    // 按作者过滤
    if (author) {
      const filtered = commits.filter(c => c.author.name === author)
      res.json(filtered)
    } else {
      res.json(commits)
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get git log' })
  }
})

// 获取 Diff
router.get('/diff', async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from) return res.status(400).json({ error: 'From commit required' })
    
    const diff = await gitOperator.getDiff(from as string, to as string)
    res.send(diff)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get diff' })
  }
})

// ============================================
// 提交操作
// ============================================

// Stage 文件
router.post('/add', async (req, res) => {
  try {
    const { path } = req.body
    
    await gitOperator.add(path)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to stage' })
  }
})

// 提交
router.post('/commit', async (req, res) => {
  try {
    const { path, message, author } = req.body
    
    const result = await gitOperator.commit({
      message,
      files: path,
      author
    })
    
    if (result.success) {
      res.json({ success: true, hash: result.hash })
    } else {
      res.status(500).json({ success: false, error: result.error })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to commit' })
  }
})

// ============================================
// 分支操作
// ============================================

// 获取分支列表
router.get('/branches', async (req, res) => {
  try {
    const branches = await gitOperator.getBranches()
    res.json(branches)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get branches' })
  }
})

// 创建分支
router.post('/branch', async (req, res) => {
  try {
    const { name, from } = req.body
    
    await gitOperator.createBranch(name, from)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create branch' })
  }
})

// 切换分支
router.post('/checkout', async (req, res) => {
  try {
    const { ref } = req.body
    await gitOperator.checkout(ref)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to checkout' })
  }
})

// ============================================
// 撤销与重置
// ============================================

// Reset
router.post('/reset', async (req, res) => {
  try {
    const { path, hard = false } = req.body
    
    await gitOperator.reset(path, hard)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset' })
  }
})

// Revert
router.post('/revert', async (req, res) => {
  try {
    const { hash } = req.body
    await gitOperator.revert(hash)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to revert' })
  }
})

// ============================================
// 检查点（断点续作）- 使用文件存储
// ============================================

import { FileStorage } from '../../.vitepress/agent/memory/FileStorage'

const checkpointStorage = new FileStorage({
  name: 'checkpoints',
  defaultData: { checkpoints: {} }
})

interface Checkpoint {
  id: string
  taskId: string
  name: string
  commitHash: string
  createdAt: number
}

// 初始化存储
let storageInitialized = false
async function initStorage() {
  if (!storageInitialized) {
    await checkpointStorage.load()
    storageInitialized = true
  }
}

// 创建检查点
router.post('/checkpoint', async (req, res) => {
  try {
    await initStorage()
    const { taskId, name } = req.body
    
    // 先提交当前更改
    await gitOperator.add()
    const result = await gitOperator.commit({
      message: `[checkpoint] ${name} for task ${taskId}`
    })
    
    if (!result.success || !result.hash) {
      return res.status(500).json({ error: 'Failed to commit checkpoint' })
    }
    
    const checkpoint: Checkpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      name,
      commitHash: result.hash,
      createdAt: Date.now()
    }
    
    // 持久化到文件
    checkpointStorage.updateData(data => {
      data.checkpoints[checkpoint.id] = checkpoint
    })
    await checkpointStorage.save()
    
    res.json(checkpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checkpoint' })
  }
})

// 列出检查点
router.get('/checkpoints', async (req, res) => {
  try {
    await initStorage()
    const { taskId } = req.query
    
    const data = checkpointStorage.getData()
    let results = Object.values(data.checkpoints) as Checkpoint[]
    
    if (taskId) {
      results = results.filter((cp: Checkpoint) => cp.taskId === taskId)
    }
    
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list checkpoints' })
  }
})

// 恢复检查点
router.post('/checkpoint/:id/restore', async (req, res) => {
  try {
    await initStorage()
    const { id } = req.params
    
    const data = checkpointStorage.getData()
    const checkpoint = data.checkpoints[id] as Checkpoint | undefined
    
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' })
    }
    
    await gitOperator.checkout(checkpoint.commitHash)
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore checkpoint' })
  }
})

// ============================================
// 统计信息
// ============================================

router.get('/stats', async (req, res) => {
  try {
    const stats = await gitOperator.getStats()
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

export default router
