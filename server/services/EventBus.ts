/**
 * EventBus Service - 全局事件总线
 * 
 * 负责管理系统内的事件，当特定事件发生时触发对应的 Agent
 * 支持的事件：文章创建/更新/删除、文件变化、Git 提交等
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { join } from 'path'
import chokidar from 'chokidar'

// 数据存储路径
const DATA_DIR = join(process.cwd(), '.data')
const AGENTS_FILE = join(DATA_DIR, 'agents.json')
const DOCS_DIR = join(process.cwd(), 'docs')

// 事件类型
export type SystemEventType = 
  | 'article.created'
  | 'article.updated'
  | 'article.deleted'
  | 'file.created'
  | 'file.modified'
  | 'file.deleted'
  | 'git.commit'
  | 'agent.triggered'
  | 'chat.mentioned'
  | 'system.startup'
  | 'system.shutdown'

export interface SystemEvent {
  type: SystemEventType
  timestamp: number
  source: string
  payload: Record<string, any>
}

// Agent 和触发器类型
export interface Trigger {
  id: string
  type: 'event'
  name: string
  enabled: boolean
  config: {
    eventName?: string
    eventFilter?: {
      path?: string
      pattern?: string
    }
  }
}

export interface Agent {
  id: string
  name: string
  status: string
  triggers?: Trigger[]
  [key: string]: any
}

/**
 * EventBus 类
 * 
 * 全局事件管理器，负责：
 * 1. 监听系统事件（文件变化、文章操作等）
 * 2. 根据 Agent 的触发器配置匹配事件
 * 3. 触发对应的 Agent
 */
export class EventBus extends EventEmitter {
  private fileWatcher: chokidar.FSWatcher | null = null
  private isRunning = false
  private eventQueue: SystemEvent[] = []
  private processingQueue = false

  constructor() {
    super()
    this.setMaxListeners(100)
  }

  /**
   * 启动 EventBus
   */
  async start(): Promise<void> {
    if (this.isRunning) return
    
    console.log('[EventBus] Starting...')
    
    // 启动文件监听
    await this.startFileWatcher()
    
    this.isRunning = true
    console.log('[EventBus] Started')
    
    // 发出系统启动事件
    this.emitEvent('system.startup', {
      timestamp: Date.now()
    })
  }

  /**
   * 停止 EventBus
   */
  async stop(): Promise<void> {
    console.log('[EventBus] Stopping...')
    
    // 停止文件监听
    if (this.fileWatcher) {
      await this.fileWatcher.close()
      this.fileWatcher = null
    }
    
    this.isRunning = false
    console.log('[EventBus] Stopped')
  }

  /**
   * 发出系统事件
   */
  emitEvent(type: SystemEventType, payload: Record<string, any> = {}): void {
    const event: SystemEvent = {
      type,
      timestamp: Date.now(),
      source: 'system',
      payload
    }
    
    console.log(`[EventBus] Event emitted: ${type}`, payload)
    
    // 加入队列
    this.eventQueue.push(event)
    
    // 处理队列
    this.processQueue()
    
    // 同时发出通用事件
    this.emit('event', event)
    this.emit(type, payload)
  }

  /**
   * 处理事件队列
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) return
    
    this.processingQueue = true
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!
      await this.handleEvent(event)
    }
    
    this.processingQueue = false
  }

  /**
   * 处理单个事件
   */
  private async handleEvent(event: SystemEvent): Promise<void> {
    try {
      // 查找匹配的 Agent 触发器
      const matchingAgents = await this.findMatchingAgents(event)
      
      for (const { agent, trigger } of matchingAgents) {
        console.log(`[EventBus] Triggering agent ${agent.id} for event ${event.type}`)
        
        // 更新触发统计
        trigger.lastTriggered = new Date().toISOString()
        trigger.triggerCount = (trigger.triggerCount || 0) + 1
        
        // 更新 Agent 状态
        await this.updateAgentStatus(agent.id, {
          status: 'running',
          lastRunAt: Date.now(),
          trigger
        })
        
        // 发出触发事件
        this.emit('trigger', {
          agentId: agent.id,
          triggerId: trigger.id,
          event,
          timestamp: Date.now()
        })
        
        // 调用 Agent
        await this.invokeAgent(agent, trigger, event)
        
        // 恢复状态
        await this.updateAgentStatus(agent.id, {
          status: 'idle'
        })
      }
      
    } catch (error) {
      console.error('[EventBus] Failed to handle event:', error)
    }
  }

  /**
   * 查找匹配的 Agent 触发器
   */
  private async findMatchingAgents(event: SystemEvent): Promise<Array<{ agent: Agent, trigger: Trigger }>> {
    const matching: Array<{ agent: Agent, trigger: Trigger }> = []
    
    try {
      const agents = await this.readAgents()
      
      for (const agent of agents) {
        if (!agent.triggers) continue
        if (agent.status === 'paused' || agent.status === 'error') continue
        
        for (const trigger of agent.triggers) {
          if (trigger.type !== 'event') continue
          if (!trigger.enabled) continue
          
          // 检查事件名称匹配
          if (trigger.config.eventName && trigger.config.eventName !== event.type) {
            continue
          }
          
          // 检查路径过滤
          if (trigger.config.eventFilter?.path) {
            const filterPath = trigger.config.eventFilter.path
            const eventPath = event.payload.path || ''
            
            // 支持通配符匹配
            if (filterPath.includes('*')) {
              const regex = new RegExp('^' + filterPath.replace(/\*/g, '.*') + '$')
              if (!regex.test(eventPath)) continue
            } else if (!eventPath.includes(filterPath)) {
              continue
            }
          }
          
          // 检查模式匹配（正则）
          if (trigger.config.eventFilter?.pattern) {
            const pattern = trigger.config.eventFilter.pattern
            const eventPath = event.payload.path || ''
            const regex = new RegExp(pattern)
            if (!regex.test(eventPath)) continue
          }
          
          matching.push({ agent, trigger })
        }
      }
      
    } catch (error) {
      console.error('[EventBus] Failed to find matching agents:', error)
    }
    
    return matching
  }

  /**
   * 调用 Agent 执行
   */
  private async invokeAgent(agent: Agent, trigger: Trigger, event: SystemEvent): Promise<void> {
    this.emit('invoke', {
      agentId: agent.id,
      triggerId: trigger.id,
      agent,
      trigger,
      event
    })
    
    console.log(`[EventBus] Invoking agent ${agent.id} for event ${event.type}`)
  }

  /**
   * 更新 Agent 状态
   */
  private async updateAgentStatus(agentId: string, updates: Partial<Agent>): Promise<void> {
    try {
      const agents = await this.readAgents()
      const index = agents.findIndex(a => a.id === agentId)
      
      if (index !== -1) {
        agents[index] = {
          ...agents[index],
          ...updates,
          updatedAt: Date.now()
        }
        
        await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8')
      }
    } catch (error) {
      console.error('[EventBus] Failed to update agent status:', error)
    }
  }

  /**
   * 启动文件监听器
   */
  private async startFileWatcher(): Promise<void> {
    try {
      // 使用 chokidar 监听 docs 目录
      this.fileWatcher = chokidar.watch(
        [
          join(DOCS_DIR, '**/*.md'),
          join(DOCS_DIR, '**/*.mdx')
        ],
        {
          ignored: /(^|[\/\\])\../, // 忽略隐藏文件
          persistent: true,
          ignoreInitial: true
        }
      )
      
      // 文件创建
      this.fileWatcher.on('add', (path) => {
        const relativePath = path.replace(DOCS_DIR, '')
        this.emitEvent('article.created', {
          path: relativePath,
          fullPath: path
        })
        this.emitEvent('file.created', {
          path: relativePath,
          fullPath: path
        })
      })
      
      // 文件修改
      this.fileWatcher.on('change', (path) => {
        const relativePath = path.replace(DOCS_DIR, '')
        this.emitEvent('article.updated', {
          path: relativePath,
          fullPath: path
        })
        this.emitEvent('file.modified', {
          path: relativePath,
          fullPath: path
        })
      })
      
      // 文件删除
      this.fileWatcher.on('unlink', (path) => {
        const relativePath = path.replace(DOCS_DIR, '')
        this.emitEvent('article.deleted', {
          path: relativePath,
          fullPath: path
        })
        this.emitEvent('file.deleted', {
          path: relativePath,
          fullPath: path
        })
      })
      
      console.log('[EventBus] File watcher started for docs directory')
      
    } catch (error) {
      console.error('[EventBus] Failed to start file watcher:', error)
    }
  }

  /**
   * 读取所有 Agents
   */
  private async readAgents(): Promise<Agent[]> {
    try {
      const data = await fs.readFile(AGENTS_FILE, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  /**
   * 获取事件统计
   */
  getStats(): {
    queueLength: number
    isRunning: boolean
  } {
    return {
      queueLength: this.eventQueue.length,
      isRunning: this.isRunning
    }
  }
}

// 导出单例
export const eventBus = new EventBus()
