/**
 * Git API Routes - Git 操作服务端路由
 */
import { Router } from 'express'
import simpleGit, { SimpleGit } from 'simple-git'
import { join } from 'path'

const router = Router()

// Git 实例
const git: SimpleGit = simpleGit(join(process.cwd(), 'docs'))

// ============================================
// 状态与信息
// ============================================

// 获取状态
router.get('/status', async (req, res) => {
  try {
    const status = await git.status()
    res.json({
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified,
      added: status.not_added,
      deleted: status.deleted,
      untracked: status.not_added
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get git status' })
  }
})

// 获取提交日志
router.get('/log', async (req, res) => {
  try {
    const { maxCount = 50, path, author } = req.query
    
    const options: any = { maxCount: parseInt(maxCount as string) }
    if (path) options.file = path as string
    
    const log = await git.log(options)
    
    const commits = log.all.map(commit => {
      const isAgent = commit.message.startsWith('[agent:')
      const agentMetadata = isAgent ? parseAgentMetadata(commit.message) : undefined
      
      return {
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        author: {
          name: commit.author_name,
          email: commit.author_email
        },
        date: commit.date,
        message: isAgent ? commit.message.split('\n')[0] : commit.message,
        isAgent,
        agentMetadata
      }
    })
    
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
    
    let diff: string
    if (to) {
      diff = await git.diff([from as string, to as string])
    } else {
      diff = await git.show([from as string, '--format=', '--patch'])
    }
    
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
    
    if (path) {
      await git.add(path)
    } else {
      await git.add('.')
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to stage' })
  }
})

// 提交
router.post('/commit', async (req, res) => {
  try {
    const { path, message, author } = req.body
    
    const options: any = {}
    if (author) {
      options['--author'] = `${author.name} <${author.email}>`
    }
    
    // 先 stage
    if (path) {
      await git.add(path)
      await git.commit(message, path, options)
    } else {
      await git.add('.')
      await git.commit(message, undefined, options)
    }
    
    // 获取最新 commit hash
    const log = await git.log({ maxCount: 1 })
    
    res.json({ success: true, hash: log.latest?.hash })
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
    const summary = await git.branch()
    res.json({
      current: summary.current,
      all: summary.all
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get branches' })
  }
})

// 创建分支
router.post('/branch', async (req, res) => {
  try {
    const { name, from } = req.body
    
    if (from) {
      await git.checkoutBranch(name, from)
    } else {
      await git.checkoutLocalBranch(name)
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create branch' })
  }
})

// 切换分支
router.post('/checkout', async (req, res) => {
  try {
    const { ref } = req.body
    await git.checkout(ref)
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
    
    if (path) {
      await git.reset(['HEAD', path])
    } else if (hard) {
      await git.reset(['--hard', 'HEAD'])
    } else {
      await git.reset(['--soft', 'HEAD~1'])
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset' })
  }
})

// Revert
router.post('/revert', async (req, res) => {
  try {
    const { hash } = req.body
    await git.revert(hash, { '--no-edit': null })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to revert' })
  }
})

// ============================================
// 检查点（断点续作）
// ============================================

interface Checkpoint {
  id: string
  taskId: string
  name: string
  commitHash: string
  createdAt: number
}

const checkpoints: Map<string, Checkpoint> = new Map()

// 创建检查点
router.post('/checkpoint', async (req, res) => {
  try {
    const { taskId, name } = req.body
    
    // 先提交当前更改
    await git.add('.')
    const commitResult = await git.commit(`[checkpoint] ${name} for task ${taskId}`)
    
    const checkpoint: Checkpoint = {
      id: `cp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      name,
      commitHash: commitResult.commit,
      createdAt: Date.now()
    }
    
    checkpoints.set(checkpoint.id, checkpoint)
    
    res.json(checkpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checkpoint' })
  }
})

// 列出检查点
router.get('/checkpoints', async (req, res) => {
  try {
    const { taskId } = req.query
    
    let results = Array.from(checkpoints.values())
    
    if (taskId) {
      results = results.filter(cp => cp.taskId === taskId)
    }
    
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list checkpoints' })
  }
})

// 恢复检查点
router.post('/checkpoint/:id/restore', async (req, res) => {
  try {
    const { id } = req.params
    const checkpoint = checkpoints.get(id)
    
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' })
    }
    
    await git.checkout(checkpoint.commitHash)
    
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
    const log = await git.log()
    
    const agentCommits = log.all.filter(c => c.message.startsWith('[agent:'))
    const humanCommits = log.all.filter(c => !c.message.startsWith('[agent:'))
    
    res.json({
      totalCommits: log.total,
      agentCommits: agentCommits.length,
      humanCommits: humanCommits.length,
      lastCommitAt: log.latest?.date
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

// ============================================
// 辅助函数
// ============================================

function parseAgentMetadata(message: string): any {
  const taskId = message.match(/\[agent:([^\]]+)\]/)?.[1]
  const model = message.match(/Agent-Model: (.+)/)?.[1]
  const tokens = parseInt(message.match(/Agent-Tokens: (\d+)/)?.[1] || '0')
  const cost = parseFloat(message.match(/Agent-Cost: \$([\d.]+)/)?.[1] || '0')
  const skill = message.match(/Agent-Skill: (.+)/)?.[1]
  
  return { taskId, model, tokens, cost, skill }
}

export default router
