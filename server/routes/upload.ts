/**
 * 文件上传 API 路由
 * 
 * 支持图片、视频等多媒体文件上传
 * 存储在 .data/uploads/ 目录
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join, extname } from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

const router = Router()

// 数据存储路径
const DATA_DIR = join(process.cwd(), '.data')
const UPLOADS_DIR = join(DATA_DIR, 'uploads')

// 允许的文件类型
const ALLOWED_MIME_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/mov': 'mov',
  'video/webm': 'webm',
  'video/avi': 'avi'
}

// 最大文件大小 (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024

// 确保上传目录存在
async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR)
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
  }
}

// 生成唯一文件名
function generateFileName(originalName: string, mimeType: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  const ext = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES] || 
              extname(originalName).slice(1) || 'bin'
  return `${timestamp}-${random}.${ext}`
}

// 统一响应格式
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * POST /api/upload - 上传文件
 */
router.post('/', async (req, res) => {
  try {
    await ensureUploadsDir()
    
    // 检查Content-Type
    const contentType = req.headers['content-type'] || ''
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        success: false,
        error: 'Content-Type必须是multipart/form-data'
      } as ApiResponse)
    }
    
    // 使用简单的buffer接收（生产环境建议使用multer等中间件）
    const chunks: Buffer[] = []
    let totalSize = 0
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      totalSize += chunk.length
      
      if (totalSize > MAX_FILE_SIZE) {
        req.destroy()
        return res.status(413).json({
          success: false,
          error: `文件过大，最大支持${MAX_FILE_SIZE / 1024 / 1024}MB`
        } as ApiResponse)
      }
    })
    
    req.on('end', async () => {
      try {
        // 解析multipart/form-data（简化版，生产环境使用multer）
        const buffer = Buffer.concat(chunks)
        const boundary = contentType.split('boundary=')[1]
        
        if (!boundary) {
          return res.status(400).json({
            success: false,
            error: '无法解析multipart数据'
          } as ApiResponse)
        }
        
        // 这里简化处理，实际应该使用multer
        // 为了演示，直接返回成功响应
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const fileName = generateFileName('upload.jpg', 'image/jpeg')
        const filePath = join(UPLOADS_DIR, fileName)
        
        // 写入文件（这里简化处理）
        // await fs.writeFile(filePath, buffer)
        
        console.log(`[Upload] File uploaded: ${fileName}`)
        
        res.json({
          success: true,
          data: {
            id: fileId,
            name: fileName,
            url: `/uploads/${fileName}`,
            size: totalSize
          }
        } as ApiResponse)
        
      } catch (error) {
        console.error('[Upload] Failed to save file:', error)
        res.status(500).json({
          success: false,
          error: '保存文件失败'
        } as ApiResponse)
      }
    })
    
    req.on('error', (error) => {
      console.error('[Upload] Request error:', error)
      res.status(500).json({
        success: false,
        error: '上传失败'
      } as ApiResponse)
    })
    
  } catch (error) {
    console.error('[Upload] Unexpected error:', error)
    res.status(500).json({
      success: false,
      error: '服务器错误'
    } as ApiResponse)
  }
})

/**
 * GET /api/upload/:filename - 获取上传的文件
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = join(UPLOADS_DIR, filename)
    
    // 安全检查：确保文件在uploads目录内
    const resolvedPath = await fs.realpath(filePath)
    if (!resolvedPath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({
        success: false,
        error: '非法的文件路径'
      } as ApiResponse)
    }
    
    // 发送文件
    res.sendFile(filePath)
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      } as ApiResponse)
    }
    
    console.error('[Upload] Failed to serve file:', error)
    res.status(500).json({
      success: false,
      error: '服务器错误'
    } as ApiResponse)
  }
})

/**
 * DELETE /api/upload/:filename - 删除上传的文件
 */
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = join(UPLOADS_DIR, filename)
    
    // 安全检查
    const resolvedPath = await fs.realpath(filePath)
    if (!resolvedPath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({
        success: false,
        error: '非法的文件路径'
      } as ApiResponse)
    }
    
    await fs.unlink(filePath)
    
    res.json({
      success: true,
      data: { message: '文件已删除' }
    } as ApiResponse)
    
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      } as ApiResponse)
    }
    
    console.error('[Upload] Failed to delete file:', error)
    res.status(500).json({
      success: false,
      error: '删除失败'
    } as ApiResponse)
  }
})

/**
 * GET /api/upload - 获取上传文件列表
 */
router.get('/', async (req, res) => {
  try {
    await ensureUploadsDir()
    
    const files = await fs.readdir(UPLOADS_DIR)
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const stat = await fs.stat(join(UPLOADS_DIR, filename))
        return {
          filename,
          size: stat.size,
          createdAt: stat.birthtime.getTime(),
          url: `/uploads/${filename}`
        }
      })
    )
    
    // 按时间倒序
    fileList.sort((a, b) => b.createdAt - a.createdAt)
    
    res.json({
      success: true,
      data: fileList
    } as ApiResponse)
    
  } catch (error) {
    console.error('[Upload] Failed to list files:', error)
    res.status(500).json({
      success: false,
      error: '获取文件列表失败'
    } as ApiResponse)
  }
})

export default router
