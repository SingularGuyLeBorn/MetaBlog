/**
 * Agent Runtime Manager - Agent 运行时管理系统
 * 
 * 功能：
 * 1. Agent 生命周期管理(启动、暂停、恢复、停止)
 * 2. 心跳检测
 * 3. 任务调度
 * 4. 状态持久化
 * 5. 自动恢复
 */

import type {
  AgentControlCommand,
  AgentHeartbeat,
  AgentIntervention,
  AgentMessage,
  AgentRuntime,
  AgentRuntimeQueryOptions,
  AgentRuntimeStats,
  CreateAgentRuntimeParams,
  UpdateAgentRuntimeParams
} from '../../src/theme/types/agent-runtime'

import * as fs from 'fs'
import * as path from 'path'
import type { Task } from '../../src/theme/types/task'

// 数据目录
const DATA_DIR = path.join(process.cwd(), '.data')
const RUNTIME_DIR = path.join(DATA_DIR, 'runtime')
const RUNTIME_INDEX_FILE = path.join(RUNTIME_DIR, 'index.json')
const RUNTIME_LOGS_DIR = path.join(DATA_DIR, 'logs', 'runtime')

// 确保目录存在
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

ensureDir(RUNTIME_DIR)
ensureDir(RUNTIME_LOGS_DIR)

// 生成唯一ID
function generateId(): string {
  return `runtime_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Agent Runtime Manager 类
class AgentRuntimeManager {
  private runtimes: Map<string, AgentRuntime> = new Map()
  private heartbeats: Map<string, AgentHeartbeat> = new Map()
  private activeTimers: Map<string, NodeJS.Timeout> = new Map()
  private commandHandlers: Map<string, (command: AgentControlCommand) => Promise<void>> = new Map()
  private interventionLog: AgentIntervention[] = []
  private initialized = false

  constructor() {
    this.loadRuntimes()
  }

  // 加载运行时索引
  private loadRuntimes() {
    try {
      if (fs.existsSync(RUNTIME_INDEX_FILE)) {
        const data = JSON.parse(fs.readFileSync(RUNTIME_INDEX_FILE, 'utf-8'))
        if (data.runtimes && Array.isArray(data.runtimes)) {
          for (const runtime of data.runtimes) {
            this.runtimes.set(runtime.id, runtime)
          }
        }
      }
      this.initialized = true
      console.log(`[AgentRuntimeManager] Loaded ${this.runtimes.size} runtimes`)
    } catch (error) {
      console.error('[AgentRuntimeManager] Failed to load runtimes:', error)
    }
  }

  // 保存运行时索引
  private saveRuntimes() {
    try {
      const data = {
        runtimes: Array.from(this.runtimes.values()),
        updatedAt: Date.now()
      }
      fs.writeFileSync(RUNTIME_INDEX_FILE, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[AgentRuntimeManager] Failed to save runtimes:', error)
    }
  }

  // 记录日志
  private log(runtimeId: string, event: string, message: string, data?: any) {
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      agentId: runtimeId,
      timestamp: Date.now(),
      level: 'info' as const,
      event,
      message,
      data
    }

    try {
      const date = new Date().toISOString().split('T')[0]
      const logFile = path.join(RUNTIME_LOGS_DIR, `${date}.jsonl`)
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n')
    } catch (error) {
      console.error('[AgentRuntimeManager] Failed to save log:', error)
    }
  }

  // 创建运行时
  createRuntime(params: CreateAgentRuntimeParams): AgentRuntime {
    const now = Date.now()
    const runtime: AgentRuntime = {
      id: generateId(),
      agentId: params.agentId,
      status: 'created',
      config: {
        agentId: params.agentId,
        mode: params.mode || 'manual',
        recovery: {
          enabled: true,
          maxRetries: 3,
          retryDelay: 5000,
          ...params.config?.recovery
        },
        heartbeat: {
          enabled: true,
          interval: 30000,
          timeout: 120000,
          ...params.config?.heartbeat
        },
        scheduler: {
          enabled: true,
          maxConcurrentTasks: 5,
          taskTimeout: 300000,
          ...params.config?.scheduler
        },
        logging: {
          enabled: true,
          level: 'info',
          maxLogFiles: 30,
          ...params.config?.logging
        }
      },
      stats: {
        totalUptime: 0,
        errorCount: 0,
        recoveryCount: 0
      },
      activeTasks: [],
      queuedTasks: [],
      completedTasks: [],
      messages: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: '1.0.0'
      }
    }

    this.runtimes.set(runtime.id, runtime)
    this.saveRuntimes()

    this.log(runtime.id, 'runtime_created', `Runtime created for agent ${params.agentId}`, {
      mode: runtime.config.mode
    })

    return runtime
  }

  // 获取运行时
  getRuntime(id: string): AgentRuntime | undefined {
    return this.runtimes.get(id)
  }

  // 通过 Agent ID 获取运行时
  getRuntimeByAgentId(agentId: string): AgentRuntime | undefined {
    return Array.from(this.runtimes.values()).find(r => r.agentId === agentId)
  }

  // 查询运行时
  queryRuntimes(options: AgentRuntimeQueryOptions = {}): { runtimes: AgentRuntime[]; total: number } {
    let runtimes = Array.from(this.runtimes.values())

    // 应用过滤条件
    if (options.status && options.status.length > 0) {
      runtimes = runtimes.filter(r => options.status!.includes(r.status))
    }
    if (options.mode && options.mode.length > 0) {
      runtimes = runtimes.filter(r => options.mode!.includes(r.config.mode))
    }
    if (options.agentId) {
      runtimes = runtimes.filter(r => r.agentId === options.agentId)
    }

    // 排序：按创建时间倒序
    runtimes.sort((a, b) => b.metadata.createdAt - a.metadata.createdAt)

    const total = runtimes.length

    // 分页
    const offset = options.offset || 0
    const limit = options.limit || 50
    runtimes = runtimes.slice(offset, offset + limit)

    return { runtimes, total }
  }

  // 更新运行时
  updateRuntime(id: string, updates: UpdateAgentRuntimeParams): AgentRuntime | null {
    const runtime = this.runtimes.get(id)
    if (!runtime) return null

    // 只能更新 stopped 或 created 状态的运行时配置
    if (runtime.status !== 'stopped' && runtime.status !== 'created') {
      if (updates.mode !== undefined || updates.config !== undefined) {
        throw new Error('Can only update mode/config when runtime is stopped')
      }
    }

    if (updates.mode !== undefined) runtime.config.mode = updates.mode
    if (updates.config !== undefined) {
      runtime.config = { ...runtime.config, ...updates.config }
    }

    runtime.metadata.updatedAt = Date.now()
    this.saveRuntimes()

    this.log(runtime.id, 'runtime_updated', `Runtime updated`, updates)

    return runtime
  }

  // 删除运行时
  deleteRuntime(id: string): boolean {
    const runtime = this.runtimes.get(id)
    if (!runtime) return false

    // 如果正在运行，先停止
    if (runtime.status === 'running' || runtime.status === 'paused') {
      this.stopRuntime(id)
    }

    this.runtimes.delete(id)
    this.saveRuntimes()

    this.log(id, 'runtime_deleted', `Runtime deleted`)

    return true
  }

  // 启动运行时
  async startRuntime(id: string): Promise<AgentRuntime | null> {
    const runtime = this.runtimes.get(id)
    if (!runtime) return null

    if (runtime.status === 'running') {
      return runtime
    }

    if (runtime.status !== 'created' && runtime.status !== 'stopped' && runtime.status !== 'error') {
      throw new Error(`Cannot start runtime in ${runtime.status} status`)
    }

    runtime.status = 'starting'
    this.saveRuntimes()

    this.log(runtime.id, 'runtime_starting', `Runtime starting`)

    try {
      // 启动心跳检测
      if (runtime.config.heartbeat.enabled) {
        this.startHeartbeat(id)
      }

      // 启动任务调度器
      if (runtime.config.scheduler.enabled) {
        this.startScheduler(id)
      }

      runtime.status = 'running'
      runtime.stats.startedAt = Date.now()
      runtime.metadata.updatedAt = Date.now()
      this.saveRuntimes()

      this.log(runtime.id, 'runtime_started', `Runtime started`)

      return runtime
    } catch (error: any) {
      runtime.status = 'error'
      runtime.stats.errorCount++
      this.saveRuntimes()

      this.log(runtime.id, 'runtime_start_failed', `Runtime start failed: ${error.message}`)

      throw error
    }
  }

  // 暂停运行时
  pauseRuntime(id: string): AgentRuntime | null {
    const runtime = this.runtimes.get(id)
    if (!runtime) return null

    if (runtime.status !== 'running') {
      throw new Error(`Cannot pause runtime in ${runtime.status} status`)
    }

    runtime.status = 'paused'
    runtime.stats.pausedAt = Date.now()

    // 计算运行时间
    if (runtime.stats.startedAt) {
      runtime.stats.totalUptime += Date.now() - runtime.stats.startedAt
    }

    runtime.metadata.updatedAt = Date.now()
    this.saveRuntimes()

    this.log(runtime.id, 'runtime_paused', `Runtime paused`)

    // 记录干预
    this.interventionLog.push({
      id: `int_${Date.now()}`,
      agentId: runtime.agentId,
      type: 'pause',
      action: 'pause_runtime',
      performedBy: 'system',
      performedAt: Date.now()
    })

    return runtime
  }

  // 恢复运行时
  resumeRuntime(id: string): AgentRuntime | null {
    const runtime = this.runtimes.get(id)
    if (!runtime) return null

    if (runtime.status !== 'paused') {
      throw new Error(`Cannot resume runtime in ${runtime.status} status`)
    }

    runtime.status = 'running'
    runtime.stats.startedAt = Date.now()
    runtime.stats.pausedAt = undefined
    runtime.metadata.updatedAt = Date.now()
    this.saveRuntimes()

    this.log(runtime.id, 'runtime_resumed', `Runtime resumed`)

    // 记录干预
    this.interventionLog.push({
      id: `int_${Date.now()}`,
      agentId: runtime.agentId,
      type: 'resume',
      action: 'resume_runtime',
      performedBy: 'system',
      performedAt: Date.now()
    })

    return runtime
  }

  // 停止运行时
  stopRuntime(id: string, force = false): AgentRuntime | null {
    const runtime = this.runtimes.get(id)
    if (!runtime) return null

    if (runtime.status !== 'running' && runtime.status !== 'paused') {
      if (!force) {
        throw new Error(`Cannot stop runtime in ${runtime.status} status`)
      }
    }

    runtime.status = 'stopping'
    this.saveRuntimes()

    this.log(runtime.id, 'runtime_stopping', `Runtime stopping`, { force })

    // 停止心跳检测
    this.stopHeartbeat(id)

    // 停止任务调度器
    this.stopScheduler(id)

    // 取消所有活动任务
    for (const task of runtime.activeTasks) {
      // 将任务放回队列
      if (task.status === 'running') {
        task.status = 'pending'
        runtime.queuedTasks.unshift(task)
      }
    }
    runtime.activeTasks = []

    runtime.status = 'stopped'
    runtime.stats.stoppedAt = Date.now()

    // 计算运行时间
    if (runtime.stats.startedAt) {
      runtime.stats.totalUptime += Date.now() - runtime.stats.startedAt
    }

    runtime.metadata.updatedAt = Date.now()
    this.saveRuntimes()

    this.log(runtime.id, 'runtime_stopped', `Runtime stopped`)

    return runtime
  }

  // 发送消息到 Agent
  sendMessage(runtimeId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>): AgentMessage | null {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime) return null

    const fullMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now()
    }

    runtime.messages.push(fullMessage)

    // 只保留最近100条消息
    if (runtime.messages.length > 100) {
      runtime.messages = runtime.messages.slice(-100)
    }

    this.saveRuntimes()

    this.log(runtimeId, 'message_sent', `Message sent: ${message.type}`, {
      from: message.from,
      to: message.to
    })

    return fullMessage
  }

  // 获取消息
  getMessages(runtimeId: string, unreadOnly = false): AgentMessage[] {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime) return []

    let messages = runtime.messages
    if (unreadOnly) {
      messages = messages.filter(m => !m.read)
    }

    return messages.sort((a, b) => b.timestamp - a.timestamp)
  }

  // 标记消息已读
  markMessageRead(runtimeId: string, messageId: string): boolean {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime) return false

    const message = runtime.messages.find(m => m.id === messageId)
    if (!message) return false

    message.read = true
    this.saveRuntimes()

    return true
  }

  // 派发任务
  assignTask(runtimeId: string, task: Task): boolean {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime) return false

    if (runtime.status !== 'running') {
      throw new Error(`Cannot assign task to runtime in ${runtime.status} status`)
    }

    // 检查并发限制
    if (runtime.activeTasks.length >= runtime.config.scheduler.maxConcurrentTasks) {
      // 加入队列
      runtime.queuedTasks.push(task)
      this.log(runtimeId, 'task_queued', `Task queued: ${task.id}`, { taskId: task.id })
    } else {
      // 立即执行
      runtime.activeTasks.push(task)
      this.log(runtimeId, 'task_assigned', `Task assigned: ${task.id}`, { taskId: task.id })
    }

    this.saveRuntimes()
    return true
  }

  // 获取统计
  getStats(): AgentRuntimeStats {
    const runtimes = Array.from(this.runtimes.values())

    const byStatus = {
      created: 0,
      starting: 0,
      running: 0,
      paused: 0,
      stopping: 0,
      stopped: 0,
      error: 0,
      recovering: 0
    }

    const byMode = {
      manual: 0,
      auto: 0,
      daemon: 0
    }

    for (const runtime of runtimes) {
      byStatus[runtime.status]++
      byMode[runtime.config.mode]++
    }

    return {
      total: runtimes.length,
      byStatus,
      byMode,
      global: {
        totalTasksExecuted: runtimes.reduce((sum, r) => sum + r.completedTasks.length, 0),
        totalTasksFailed: runtimes.reduce((sum, r) => sum + r.stats.errorCount, 0),
        averageUptime: runtimes.length > 0
          ? runtimes.reduce((sum, r) => sum + r.stats.totalUptime, 0) / runtimes.length
          : 0,
        totalErrors: runtimes.reduce((sum, r) => sum + r.stats.errorCount, 0)
      }
    }
  }

  // 启动心跳检测
  private startHeartbeat(runtimeId: string) {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime) return

    const interval = runtime.config.heartbeat.interval

    const timer = setInterval(() => {
      this.checkHeartbeat(runtimeId)
    }, interval)

    this.activeTimers.set(`heartbeat_${runtimeId}`, timer)
  }

  // 停止心跳检测
  private stopHeartbeat(runtimeId: string) {
    const timer = this.activeTimers.get(`heartbeat_${runtimeId}`)
    if (timer) {
      clearInterval(timer)
      this.activeTimers.delete(`heartbeat_${runtimeId}`)
    }
  }

  // 检查心跳
  private checkHeartbeat(runtimeId: string) {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime || runtime.status !== 'running') return

    const lastHeartbeat = this.heartbeats.get(runtimeId)
    const timeout = runtime.config.heartbeat.timeout

    if (lastHeartbeat) {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeat.timestamp

      if (timeSinceLastHeartbeat > timeout) {
        // 心跳超时
        this.log(runtimeId, 'heartbeat_timeout', `Heartbeat timeout`, {
          lastHeartbeat: lastHeartbeat.timestamp,
          timeout
        })

        // 尝试恢复
        if (runtime.config.recovery.enabled) {
          this.recoverRuntime(runtimeId)
        }
      }
    }
  }

  // 接收心跳
  receiveHeartbeat(runtimeId: string, heartbeat: Omit<AgentHeartbeat, 'agentId' | 'timestamp'>): boolean {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime) return false

    const fullHeartbeat: AgentHeartbeat = {
      ...heartbeat,
      agentId: runtime.agentId,
      timestamp: Date.now()
    }

    this.heartbeats.set(runtimeId, fullHeartbeat)
    runtime.stats.lastHeartbeatAt = Date.now()

    return true
  }

  // 启动任务调度器
  private startScheduler(runtimeId: string) {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime) return

    // 简化实现：定期检查队列并分配任务
    const timer = setInterval(() => {
      this.processTaskQueue(runtimeId)
    }, 1000)

    this.activeTimers.set(`scheduler_${runtimeId}`, timer)
  }

  // 停止任务调度器
  private stopScheduler(runtimeId: string) {
    const timer = this.activeTimers.get(`scheduler_${runtimeId}`)
    if (timer) {
      clearInterval(timer)
      this.activeTimers.delete(`scheduler_${runtimeId}`)
    }
  }

  // 处理任务队列
  private processTaskQueue(runtimeId: string) {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime || runtime.status !== 'running') return

    // 检查是否有空闲槽位
    const availableSlots = runtime.config.scheduler.maxConcurrentTasks - runtime.activeTasks.length

    if (availableSlots > 0 && runtime.queuedTasks.length > 0) {
      // 从队列取出任务
      const tasksToStart = runtime.queuedTasks.splice(0, availableSlots)

      for (const task of tasksToStart) {
        runtime.activeTasks.push(task)
        this.log(runtimeId, 'task_started', `Task started: ${task.id}`, { taskId: task.id })
      }

      this.saveRuntimes()
    }
  }

  // 恢复运行时
  private async recoverRuntime(id: string) {
    const runtime = this.runtimes.get(id)
    if (!runtime) return

    if (runtime.stats.recoveryCount >= runtime.config.recovery.maxRetries) {
      this.log(id, 'recovery_failed', `Max recovery retries reached`, {
        recoveryCount: runtime.stats.recoveryCount
      })
      runtime.status = 'error'
      this.saveRuntimes()
      return
    }

    runtime.status = 'recovering'
    runtime.stats.recoveryCount++
    this.saveRuntimes()

    this.log(id, 'recovery_started', `Recovery started`, {
      attempt: runtime.stats.recoveryCount
    })

    try {
      // 停止当前运行
      this.stopRuntime(id)

      // 等待重试延迟
      await new Promise(resolve => setTimeout(resolve, runtime.config.recovery.retryDelay))

      // 重新启动
      await this.startRuntime(id)

      this.log(id, 'recovery_success', `Recovery successful`)
    } catch (error: any) {
      this.log(id, 'recovery_error', `Recovery failed: ${error.message}`)
      runtime.status = 'error'
      this.saveRuntimes()
    }
  }

  // 获取干预历史
  getInterventionHistory(agentId?: string): AgentIntervention[] {
    let history = this.interventionLog
    if (agentId) {
      history = history.filter(i => i.agentId === agentId)
    }
    return history.sort((a, b) => b.performedAt - a.performedAt)
  }
}

// 单例实例
let manager: AgentRuntimeManager | null = null

export function getAgentRuntimeManager(): AgentRuntimeManager {
  if (!manager) {
    manager = new AgentRuntimeManager()
  }
  return manager
}

export { AgentRuntimeManager }

