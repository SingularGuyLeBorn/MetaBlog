/**
 * Files API Routes - 文件系统操作服务端路由
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, dirname, basename } from 'path'

const router = Router()

// 基础路径
const DOCS_PATH = join(process.cwd(), 'docs')

// 路径安全检查
function sanitizePath(userPath: string): string {
  // 移除开头的斜杠和 dots
  const clean = userPath.replace(/^\/+/, '').replace(/\.\./g, '')
  return join(DOCS_PATH, clean)
}

// ============================================
// 文件操作
// ============================================

// 读取文件
router.get('/read', async (req, res) => {
  try {
    const { path } = req.query
    if (!path) return res.status(400).json({ error: 'Path required' })
    
    const filePath = sanitizePath(path as string)
    
    // 安全检查：确保在 docs 目录内
    if (!filePath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const content = await fs.readFile(filePath, 'utf-8')
    res.send(content)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' })
    } else {
      res.status(500).json({ error: 'Failed to read file' })
    }
  }
})

// 保存文件
router.post('/save', async (req, res) => {
  try {
    const { path: filePath, content } = req.body
    if (!filePath) return res.status(400).json({ error: 'Path required' })
    
    const targetPath = sanitizePath(filePath)
    
    // 安全检查
    if (!targetPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    // 确保目录存在
    await fs.mkdir(dirname(targetPath), { recursive: true })
    
    // 写入文件
    await fs.writeFile(targetPath, content, 'utf-8')
    
    res.json({ success: true, path: filePath })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save file' })
  }
})

// 删除文件
router.post('/delete', async (req, res) => {
  try {
    const { path: filePath } = req.body
    if (!filePath) return res.status(400).json({ error: 'Path required' })
    
    const targetPath = sanitizePath(filePath)
    
    if (!targetPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    await fs.unlink(targetPath)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' })
  }
})

// 移动文件
router.post('/move', async (req, res) => {
  try {
    const { from, to } = req.body
    if (!from || !to) return res.status(400).json({ error: 'From and to paths required' })
    
    const fromPath = sanitizePath(from)
    const toPath = sanitizePath(to)
    
    if (!fromPath.startsWith(DOCS_PATH) || !toPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    await fs.mkdir(dirname(toPath), { recursive: true })
    await fs.rename(fromPath, toPath)
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to move file' })
  }
})

// 重命名文件
router.post('/rename', async (req, res) => {
  try {
    const { path: filePath, newName } = req.body
    if (!filePath || !newName) return res.status(400).json({ error: 'Path and newName required' })
    
    const targetPath = sanitizePath(filePath)
    const newPath = join(dirname(targetPath), newName)
    
    if (!targetPath.startsWith(DOCS_PATH) || !newPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    await fs.rename(targetPath, newPath)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename file' })
  }
})

// ============================================
// 目录操作
// ============================================

// 列出目录
router.get('/list', async (req, res) => {
  try {
    const { path: dirPath = '' } = req.query
    const targetPath = sanitizePath(dirPath as string)
    
    if (!targetPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const items = await fs.readdir(targetPath, { withFileTypes: true })
    
    const result = await Promise.all(
      items.map(async (item) => {
        const fullPath = join(targetPath, item.name)
        const stat = await fs.stat(fullPath)
        
        return {
          name: item.name,
          path: join(dirPath as string, item.name).replace(/\\/g, '/'),
          type: item.isDirectory() ? 'directory' : 'file',
          size: stat.size,
          modifiedAt: stat.mtime.toISOString()
        }
      })
    )
    
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to list directory' })
  }
})

// 创建目录
router.post('/mkdir', async (req, res) => {
  try {
    const { path: dirPath } = req.body
    if (!dirPath) return res.status(400).json({ error: 'Path required' })
    
    const targetPath = sanitizePath(dirPath)
    
    if (!targetPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    await fs.mkdir(targetPath, { recursive: true })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create directory' })
  }
})

// 删除目录
router.post('/rmdir', async (req, res) => {
  try {
    const { path: dirPath, recursive = false } = req.body
    if (!dirPath) return res.status(400).json({ error: 'Path required' })
    
    const targetPath = sanitizePath(dirPath)
    
    if (!targetPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    await fs.rm(targetPath, { recursive: true })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete directory' })
  }
})

// ============================================
// 搜索与批量操作
// ============================================

// 搜索目录函数（定义在路由外部）
async function searchDirectory(
  dir: string, 
  baseDir: string, 
  query: string, 
  results: any[]
): Promise<void> {
  const items = await fs.readdir(dir, { withFileTypes: true })
  
  for (const item of items) {
    const fullPath = join(dir, item.name)
    const relativePath = fullPath.replace(baseDir, '').replace(/\\/g, '/')
    
    if (item.isDirectory()) {
      await searchDirectory(fullPath, baseDir, query, results)
    } else if (item.name.toLowerCase().includes(query.toLowerCase())) {
      const stat = await fs.stat(fullPath)
      results.push({
        name: item.name,
        path: relativePath,
        type: 'file',
        size: stat.size,
        modifiedAt: stat.mtime.toISOString()
      })
    }
  }
}

// 搜索文件
router.get('/search', async (req, res) => {
  try {
    const { q, path: searchPath = '' } = req.query
    if (!q) return res.json([])
    
    const targetPath = sanitizePath(searchPath as string)
    
    if (!targetPath.startsWith(DOCS_PATH)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const results: any[] = []
    await searchDirectory(targetPath, DOCS_PATH, q as string, results)
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: 'Failed to search files' })
  }
})

// 批量保存
router.post('/batch-save', async (req, res) => {
  try {
    const { files } = req.body
    if (!Array.isArray(files)) return res.status(400).json({ error: 'Files array required' })
    
    const results = await Promise.all(
      files.map(async (file: { path: string; content: string }) => {
        try {
          const targetPath = sanitizePath(file.path)
          
          if (!targetPath.startsWith(DOCS_PATH)) {
            return { path: file.path, success: false, error: 'Access denied' }
          }
          
          await fs.mkdir(dirname(targetPath), { recursive: true })
          await fs.writeFile(targetPath, file.content, 'utf-8')
          
          return { path: file.path, success: true }
        } catch (error) {
          return { path: file.path, success: false, error: (error as Error).message }
        }
      })
    )
    
    res.json({ results })
  } catch (error) {
    res.status(500).json({ error: 'Failed to batch save' })
  }
})

export default router
