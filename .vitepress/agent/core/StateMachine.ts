/**
 * State Machine - 状态机
 * 管理 Agent 的状态转换和断点续作
 * 
 * **P0-6 修复**: 添加 Watchdog TTL，防止 EXECUTING 状态永久锁死
 */
import type { AgentState, TaskState } from './types'

type StateTransition = {
  from: AgentState | AgentState[]
  to: AgentState
  condition?: (data: any) => boolean
  action?: (data: any) => void
}

export class StateMachine {
  private currentState: AgentState = 'IDLE'
  private listeners: Map<AgentState, Set<(data: any) => void>> = new Map()
  private transitionListeners: Set<(from: AgentState, to: AgentState, data: any) => void> = new Set()

  // P0-6: Watchdog 相关
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null
  private readonly WATCHDOG_TIMEOUT_MS = 5 * 60 * 1000 // 5分钟超时
  private lastStateChangeTime: number = Date.now()

  // 有效的状态转换规则
  private transitions: StateTransition[] = [
    { from: 'IDLE', to: 'UNDERSTANDING' },
    { from: 'UNDERSTANDING', to: 'PLANNING' },
    { from: 'PLANNING', to: 'EXECUTING' },
    { from: 'PLANNING', to: 'WAITING_INPUT' },
    { from: 'EXECUTING', to: 'WAITING_INPUT' },
    { from: 'EXECUTING', to: 'PAUSED' },
    { from: 'EXECUTING', to: 'COMPLETED' },
    { from: 'EXECUTING', to: 'ERROR' },
    { from: 'WAITING_INPUT', to: 'EXECUTING' },
    { from: 'WAITING_INPUT', to: 'PAUSED' },
    { from: 'PAUSED', to: 'EXECUTING' },
    { from: 'PAUSED', to: 'COMPLETED' },
    { from: 'ERROR', to: 'EXECUTING' },
    { from: 'ERROR', to: 'IDLE' },
    // P0-SM: 添加 CANCELLED 状态转换规则（P1-SM-PAUSED: 包含 PAUSED）
    { from: ['UNDERSTANDING', 'PLANNING', 'EXECUTING', 'WAITING_INPUT', 'PAUSED'], to: 'CANCELLED' },
    { from: 'CANCELLED', to: 'IDLE' },
    { from: ['UNDERSTANDING', 'PLANNING', 'EXECUTING', 'WAITING_INPUT', 'PAUSED', 'ERROR', 'CANCELLED'], to: 'IDLE' }
  ]

  /**
   * 状态转换
   */
  transition(to: AgentState, data?: any): boolean {
    const from = this.currentState

    if (!this.isValidTransition(from, to)) {
      console.warn(`Invalid state transition: ${from} -> ${to}`)
      return false
    }

    this.currentState = to
    this.lastStateChangeTime = Date.now()
    
    // P0-6 加强：管理 Watchdog（扩展到 UNDERSTANDING/PLANNING/EXECUTING）
    this.manageWatchdog(to)
    
    // 触发状态监听器
    this.emit(to, data)
    
    // 触发转换监听器
    this.transitionListeners.forEach(listener => {
      try {
        listener(from, to, data)
      } catch (e) {
        console.error('Transition listener error:', e)
      }
    })

    return true
  }

  /**
   * P0-6: 管理 Watchdog 定时器
   * 
   * 当进入 UNDERSTANDING/PLANNING/EXECUTING 状态时启动 Watchdog，
   * 如果超过5分钟没有状态变更，强制转换到 ERROR
   */
  private manageWatchdog(state: AgentState): void {
    // 清除现有 Watchdog
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }

    // P0-6 加强：保护 UNDERSTANDING/PLANNING/EXECUTING 三个状态
    if (['UNDERSTANDING', 'PLANNING', 'EXECUTING'].includes(state)) {
      console.log(`[StateMachine] 启动 Watchdog (${state})，${this.WATCHDOG_TIMEOUT_MS / 1000}秒后超时`)
      this.watchdogTimer = setTimeout(() => {
        this.forceTimeout()
      }, this.WATCHDOG_TIMEOUT_MS)
    }
  }

  /**
   * P0-6: Watchdog 超时处理
   */
  private forceTimeout(): void {
    const previousState = this.currentState
    console.error(`[StateMachine] Watchdog 超时！状态 '${previousState}' 超过 ${this.WATCHDOG_TIMEOUT_MS / 1000} 秒，强制转换为 ERROR`)
    
    // 强制转换到 ERROR 状态（先改状态，再触发一次事件）
    this.currentState = 'ERROR'
    this.lastStateChangeTime = Date.now()
    
    // 触发 ERROR 监听器（只触发一次）
    this.emit('ERROR', { 
      reason: 'WATCHDOG_TIMEOUT',
      message: `状态 '${previousState}' 执行超时，系统强制终止`,
      timeoutMs: this.WATCHDOG_TIMEOUT_MS,
      timestamp: Date.now(),
      forced: true,
      previousState
    })
  }

  /**
   * 获取当前状态
   */
  getState(): AgentState {
    return this.currentState
  }

  /**
   * 检查是否处于特定状态
   */
  is(state: AgentState): boolean {
    return this.currentState === state
  }

  /**
   * 获取当前状态持续时间（毫秒）
   */
  getStateDuration(): number {
    return Date.now() - this.lastStateChangeTime
  }

  /**
   * 检查当前状态是否即将超时
   */
  isNearTimeout(): boolean {
    if (this.currentState !== 'EXECUTING') return false
    const remaining = this.WATCHDOG_TIMEOUT_MS - this.getStateDuration()
    return remaining < 30000 // 剩余30秒认为即将超时
  }

  /**
   * 获取 Watchdog 剩余时间
   */
  getWatchdogRemainingTime(): number | null {
    if (this.currentState !== 'EXECUTING' || !this.watchdogTimer) {
      return null
    }
    return Math.max(0, this.WATCHDOG_TIMEOUT_MS - this.getStateDuration())
  }

  /**
   * 检查状态转换是否有效
   */
  isValidTransition(from: AgentState, to: AgentState): boolean {
    return this.transitions.some(t => {
      const fromMatch = Array.isArray(t.from) 
        ? t.from.includes(from) 
        : t.from === from
      return fromMatch && t.to === to
    })
  }

  /**
   * 监听状态进入
   */
  on(state: AgentState, callback: (data: any) => void): () => void
  on(state: 'transition', callback: (from: AgentState, to: AgentState, data: any) => void): () => void
  on(state: AgentState | 'transition', callback: ((data: any) => void) | ((from: AgentState, to: AgentState, data: any) => void)): () => void {
    if (state === 'transition') {
      this.transitionListeners.add(callback as (from: AgentState, to: AgentState, data: any) => void)
      return () => {
        this.transitionListeners.delete(callback as (from: AgentState, to: AgentState, data: any) => void)
      }
    }

    if (!this.listeners.has(state)) {
      this.listeners.set(state, new Set())
    }
    this.listeners.get(state)!.add(callback as (data: any) => void)

    return () => {
      this.listeners.get(state)?.delete(callback as (data: any) => void)
    }
  }

  /**
   * 创建检查点（用于断点续作）
   */
  createCheckpoint(taskState: TaskState): any {
    return {
      state: this.currentState,
      taskState,
      timestamp: Date.now(),
      watchdogRemaining: this.getWatchdogRemainingTime()
    }
  }

  /**
   * 从检查点恢复
   */
  restoreFromCheckpoint(checkpoint: any): boolean {
    if (!checkpoint || !checkpoint.state) {
      return false
    }

    this.currentState = checkpoint.state
    this.lastStateChangeTime = Date.now()
    
    // 恢复 Watchdog
    this.manageWatchdog(this.currentState)
    
    // 触发恢复事件
    this.emit('IDLE', { restored: true, checkpoint })
    
    return true
  }

  /**
   * 销毁状态机（清理资源）
   */
  destroy(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer)
      this.watchdogTimer = null
    }
    this.listeners.clear()
    this.transitionListeners.clear()
  }

  /**
   * 获取状态描述
   */
  getStateDescription(state?: AgentState): string {
    const descriptions: Record<AgentState, string> = {
      'IDLE': '等待指令',
      'UNDERSTANDING': '理解意图',
      'PLANNING': '规划步骤',
      'EXECUTING': '执行任务',
      'WAITING_INPUT': '等待输入',
      'PAUSED': '任务暂停',
      'COMPLETED': '任务完成',
      'CANCELLED': '已取消',  // P1-AG
      'ERROR': '发生错误'
    }

    return descriptions[state || this.currentState] || '未知状态'
  }

  /**
   * 获取状态图标
   */
  getStateIcon(state?: AgentState): string {
    const icons: Record<AgentState, string> = {
      'IDLE': '⏸️',
      'UNDERSTANDING': '🤔',
      'PLANNING': '📋',
      'EXECUTING': '⚡',
      'WAITING_INPUT': '⏳',
      'PAUSED': '⏸️',
      'COMPLETED': '✅',
      'CANCELLED': '🚫',  // P1-AG
      'ERROR': '❌'
    }

    return icons[state || this.currentState] || '❓'
  }

  private emit(state: AgentState, data: any): void {
    this.listeners.get(state)?.forEach(callback => {
      try {
        callback(data)
      } catch (e) {
        console.error(`State listener error for ${state}:`, e)
      }
    })
  }
}

export default StateMachine
