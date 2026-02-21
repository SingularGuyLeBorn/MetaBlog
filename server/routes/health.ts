/**
 * Health API Routes - 系统健康检查
 * 
 * 提供:
 * - 服务状态检查 (LLM/内存/文件/Git)
 * - 系统资源监控 (CPU/内存/磁盘)
 * - 依赖服务健康检查
 */

import { Router } from 'express'
import { promises as fs } from 'fs'
import simpleGit from 'simple-git'
import { join } from 'path'
import { getLLMManager } from '../../.vitepress/agent/llm'

const router = Router()
const DOCS_PATH = join(process.cwd(), 'docs')

// 健康状态接口
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  services: {
    llm: ServiceHealth
    memory: ServiceHealth
    files: ServiceHealth
    git: ServiceHealth
  }
  resources?: ResourceUsage
  checks: HealthCheck[]
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  lastError?: string
  details?: Record<string, any>
}

interface ResourceUsage {
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    loadAvg: number[]
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
}

interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  responseTime?: number
}

// 系统启动时间
const SYSTEM_START_TIME = Date.now()

// ============================================
// 主要健康检查端点
// ============================================

router.get('/', async (req, res) => {
  const startTime = Date.now()
  
  try {
    // 并行执行所有健康检查
    const [
      llmHealth,
      memoryHealth,
      filesHealth,
      gitHealth,
      resources
    ] = await Promise.all([
      checkLLMHealth(),
      checkMemoryHealth(),
      checkFilesHealth(),
      checkGitHealth(),
      getResourceUsage()
    ])

    // 构建检查列表
    const checks: HealthCheck[] = [
      { name: 'llm', status: llmHealth.status === 'up' ? 'pass' : 'fail', message: `LLM ${llmHealth.status}`, responseTime: llmHealth.responseTime },
      { name: 'memory', status: memoryHealth.status === 'up' ? 'pass' : 'fail', message: `Memory ${memoryHealth.status}`, responseTime: memoryHealth.responseTime },
      { name: 'files', status: filesHealth.status === 'up' ? 'pass' : 'fail', message: `Files ${filesHealth.status}`, responseTime: filesHealth.responseTime },
      { name: 'git', status: gitHealth.status === 'up' ? 'pass' : gitHealth.status === 'degraded' ? 'warn' : 'fail', message: `Git ${gitHealth.status}`, responseTime: gitHealth.responseTime }
    ]

    // 确定整体状态
    const failedChecks = checks.filter(c => c.status === 'fail').length
    const warnChecks = checks.filter(c => c.status === 'warn').length
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (failedChecks === 0 && warnChecks === 0) {
      overallStatus = 'healthy'
    } else if (failedChecks === 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'unhealthy'
    }

    const health: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - SYSTEM_START_TIME,
      services: {
        llm: llmHealth,
        memory: memoryHealth,
        files: filesHealth,
        git: gitHealth
      },
      resources,
      checks
    }

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503
    
    res.status(statusCode).json({
      success: overallStatus !== 'unhealthy',
      data: health,
      meta: { responseTime: Date.now() - startTime }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : String(error)
    })
  }
})

// 简化版健康检查 (用于负载均衡)
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  })
})

// 详细服务状态
router.get('/services/:service', async (req, res) => {
  const { service } = req.params
  const startTime = Date.now()

  let health: ServiceHealth | null = null

  try {
    switch (service) {
      case 'llm':
        health = await checkLLMHealth()
        break
      case 'memory':
        health = await checkMemoryHealth()
        break
      case 'files':
        health = await checkFilesHealth()
        break
      case 'git':
        health = await checkGitHealth()
        break
      default:
        return res.status(404).json({
          success: false,
          error: `Unknown service: ${service}`
        })
    }

    res.json({
      success: health.status === 'up',
      data: health,
      meta: { responseTime: Date.now() - startTime }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Health check failed for ${service}`,
      details: error instanceof Error ? error.message : String(error)
    })
  }
})

// 资源使用情况
router.get('/resources', async (req, res) => {
  try {
    const resources = await getResourceUsage()
    res.json({
      success: true,
      data: resources
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get resource usage',
      details: error instanceof Error ? error.message : String(error)
    })
  }
})

// ============================================
// 健康检查实现
// ============================================

async function checkLLMHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    const llm = getLLMManager()
    
    // 尝试一个简单的 API 调用
    const response = await llm.chat({
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 5
    })

    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      details: {
        provider: response.model || 'unknown',
        responseReceived: true
      }
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastError: error instanceof Error ? error.message : String(error)
    }
  }
}

async function checkMemoryHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    // 检查内存目录可写
    const memoryPath = join(process.cwd(), '.vitepress', 'agent', 'memory')
    const testFile = join(memoryPath, '.health-check')
    
    await fs.mkdir(memoryPath, { recursive: true })
    await fs.writeFile(testFile, Date.now().toString())
    await fs.unlink(testFile)

    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      details: {
        path: memoryPath,
        writable: true
      }
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastError: error instanceof Error ? error.message : String(error)
    }
  }
}

async function checkFilesHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    // 检查 docs 目录可访问
    const stats = await fs.stat(DOCS_PATH)
    
    if (!stats.isDirectory()) {
      throw new Error('Docs path is not a directory')
    }

    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      details: {
        path: DOCS_PATH,
        readable: true
      }
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastError: error instanceof Error ? error.message : String(error)
    }
  }
}

async function checkGitHealth(): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    const git = simpleGit(DOCS_PATH)
    
    // 检查是否是 Git 仓库
    const isRepo = await git.checkIsRepo()
    
    if (!isRepo) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          isRepo: false,
          message: 'Not a git repository'
        }
      }
    }

    // 获取当前分支
    const branch = await git.branch()

    return {
      status: 'up',
      responseTime: Date.now() - startTime,
      details: {
        isRepo: true,
        currentBranch: branch.current,
        branches: branch.all.length
      }
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastError: error instanceof Error ? error.message : String(error)
    }
  }
}

// ============================================
// 资源使用获取
// ============================================

async function getResourceUsage(): Promise<ResourceUsage> {
  // 内存使用
  const memUsage = process.memoryUsage()
  const totalMem = require('os').totalmem()
  
  // CPU 负载
  const loadAvg = require('os').loadavg()
  const cpuCount = require('os').cpus().length
  
  // 磁盘使用 (简化版，仅检查 docs 目录所在磁盘)
  let diskUsage = { used: 0, total: 1, percentage: 0 }
  try {
    const { execSync } = require('child_process')
    // Windows 和 Linux/Mac 使用不同命令
    const isWindows = process.platform === 'win32'
    
    if (isWindows) {
      // Windows 磁盘检查
      const output = execSync('wmic logicaldisk get size,freespace,caption', { encoding: 'utf8' })
      // 简化处理
      diskUsage = { used: 0, total: 1, percentage: 0 }
    } else {
      // Unix 磁盘检查
      const output = execSync('df -k .', { encoding: 'utf8' })
      const lines = output.trim().split('\n')
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/)
        const total = parseInt(parts[1], 10) * 1024
        const used = parseInt(parts[2], 10) * 1024
        diskUsage = {
          used,
          total,
          percentage: Math.round((used / total) * 100)
        }
      }
    }
  } catch {
    // 忽略磁盘检查错误
  }

  return {
    memory: {
      used: memUsage.heapUsed,
      total: totalMem,
      percentage: Math.round((memUsage.heapUsed / totalMem) * 100)
    },
    cpu: {
      loadAvg,
      percentage: Math.round((loadAvg[0] / cpuCount) * 100)
    },
    disk: diskUsage
  }
}

export default router
