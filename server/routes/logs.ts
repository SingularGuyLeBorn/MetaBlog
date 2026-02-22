/**
 * 日志服务 API
 * 
 * 提供服务端日志存储和查询
 * - 日志文件按日期存储在 .logs/ 目录
 * - 支持日志级别筛选
 * - 支持关键词搜索
 * - 支持导出
 */

import { Router } from 'express'
import * as fs from 'fs/promises'
import * as path from 'path'
import { existsSync, mkdirSync } from 'fs'

const router = Router()
const LOGS_DIR = path.resolve(process.cwd(), '.logs')
const MAX_LOG_AGE_DAYS = 30 // 保留30天日志

// 确保日志目录存在
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true })
}

/** 获取今天的日志文件名 */
function getTodayLogFile(): string {
  const date = new Date().toISOString().split('T')[0]
  return path.join(LOGS_DIR, `${date}.jsonl`)
}

/** 获取所有日志文件 */
async function getLogFiles(): Promise<string[]> {
  const files = await fs.readdir(LOGS_DIR)
  return files
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .reverse()
}

/** 清理旧日志 */
async function cleanupOldLogs() {
  try {
    const files = await fs.readdir(LOGS_DIR)
    const now = Date.now()
    
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue
      
      const filePath = path.join(LOGS_DIR, file)
      const stats = await fs.stat(filePath)
      const ageDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
      
      if (ageDays > MAX_LOG_AGE_DAYS) {
        await fs.unlink(filePath)
        console.log(`[Logs] Deleted old log file: ${file}`)
      }
    }
  } catch (error) {
    console.error('[Logs] Cleanup error:', error)
  }
}

// 定期清理旧日志（每天一次）
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000)
cleanupOldLogs() // 启动时执行一次

/**
 * POST /api/logs/write - 写入日志
 */
router.post('/write', async (req, res) => {
  try {
    const logEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...req.body
    }
    
    const logFile = getTodayLogFile()
    const logLine = JSON.stringify(logEntry) + '\n'
    
    await fs.appendFile(logFile, logLine, 'utf-8')
    
    res.json({ success: true, id: logEntry.id })
  } catch (error) {
    console.error('[Logs] Write error:', error)
    res.status(500).json({ success: false, error: 'Failed to write log' })
  }
})

/**
 * POST /api/logs/batch - 批量写入日志
 */
router.post('/batch', async (req, res) => {
  try {
    const entries = req.body.entries || []
    const logFile = getTodayLogFile()
    
    const lines = entries.map((entry: any) => 
      JSON.stringify({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        ...entry
      }) + '\n'
    ).join('')
    
    await fs.appendFile(logFile, lines, 'utf-8')
    
    res.json({ success: true, count: entries.length })
  } catch (error) {
    console.error('[Logs] Batch write error:', error)
    res.status(500).json({ success: false, error: 'Failed to write logs' })
  }
})

/**
 * GET /api/logs/query - 查询日志
 */
router.get('/query', async (req, res) => {
  try {
    const {
      level,
      category,
      component,
      keyword,
      startTime,
      endTime,
      limit = '1000',
      offset = '0'
    } = req.query
    
    const logFiles = await getLogFiles()
    const results: any[] = []
    let skipped = 0
    const maxResults = parseInt(limit as string)
    const skipCount = parseInt(offset as string)
    
    // 读取日志文件
    for (const file of logFiles) {
      if (results.length >= maxResults) break
      
      const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      
      // 倒序读取（最新的在前）
      for (let i = lines.length - 1; i >= 0; i--) {
        if (results.length >= maxResults) break
        
        try {
          const log = JSON.parse(lines[i])
          
          // 时间范围筛选
          if (startTime && log.timestamp < parseInt(startTime as string)) continue
          if (endTime && log.timestamp > parseInt(endTime as string)) continue
          
          // 级别筛选
          if (level && log.level !== level) continue
          
          // 类别筛选
          if (category && log.category !== category) continue
          
          // 组件筛选
          if (component && log.component !== component) continue
          
          // 关键词搜索
          if (keyword) {
            const searchText = `${log.message} ${JSON.stringify(log.data)}`.toLowerCase()
            if (!searchText.includes((keyword as string).toLowerCase())) continue
          }
          
          // 跳过偏移量
          if (skipped < skipCount) {
            skipped++
            continue
          }
          
          results.push(log)
        } catch {
          // 忽略解析错误的行
        }
      }
    }
    
    res.json({
      success: true,
      data: results,
      total: results.length,
      hasMore: results.length >= maxResults
    })
  } catch (error) {
    console.error('[Logs] Query error:', error)
    res.status(500).json({ success: false, error: 'Failed to query logs' })
  }
})

/**
 * GET /api/logs/stats - 获取统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    const logFiles = await getLogFiles()
    let totalLogs = 0
    let todayLogs = 0
    let errorCount = 0
    const componentSet = new Set<string>()
    
    const today = new Date().toISOString().split('T')[0]
    
    for (const file of logFiles) {
      const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      
      for (const line of lines) {
        try {
          const log = JSON.parse(line)
          totalLogs++
          
          if (file.startsWith(today)) {
            todayLogs++
          }
          
          if (log.level === 'error') {
            errorCount++
          }
          
          if (log.component) {
            componentSet.add(log.component)
          }
        } catch {}
      }
    }
    
    res.json({
      success: true,
      data: {
        totalLogs,
        todayLogs,
        errorCount,
        uniqueComponents: Array.from(componentSet).sort()
      }
    })
  } catch (error) {
    console.error('[Logs] Stats error:', error)
    res.status(500).json({ success: false, error: 'Failed to get stats' })
  }
})

/**
 * GET /api/logs/export - 导出日志
 */
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const logFiles = await getLogFiles()
    const results: any[] = []
    
    for (const file of logFiles) {
      // 日期范围筛选
      const fileDate = file.replace('.jsonl', '')
      if (startDate && fileDate < (startDate as string)) continue
      if (endDate && fileDate > (endDate as string)) continue
      
      const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      
      for (const line of lines) {
        try {
          results.push(JSON.parse(line))
        } catch {}
      }
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="logs-export-${Date.now()}.json"`)
    res.json(results)
  } catch (error) {
    console.error('[Logs] Export error:', error)
    res.status(500).json({ success: false, error: 'Failed to export logs' })
  }
})

/**
 * DELETE /api/logs/clear - 清空日志
 */
router.delete('/clear', async (req, res) => {
  try {
    const { days } = req.query
    const logFiles = await getLogFiles()
    let deletedCount = 0
    
    if (days) {
      // 删除指定天数前的日志
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days as string))
      
      for (const file of logFiles) {
        const fileDate = file.replace('.jsonl', '')
        if (fileDate < cutoffDate.toISOString().split('T')[0]) {
          await fs.unlink(path.join(LOGS_DIR, file))
          deletedCount++
        }
      }
    } else {
      // 删除所有日志
      for (const file of logFiles) {
        await fs.unlink(path.join(LOGS_DIR, file))
        deletedCount++
      }
    }
    
    res.json({ success: true, deletedCount })
  } catch (error) {
    console.error('[Logs] Clear error:', error)
    res.status(500).json({ success: false, error: 'Failed to clear logs' })
  }
})

export default router
