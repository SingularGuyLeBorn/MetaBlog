/**
 * State Machine - 状态机
 * 管理 Agent 的状态转换和断点续作
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
    { from: ['UNDERSTANDING', 'PLANNING', 'EXECUTING', 'WAITING_INPUT', 'PAUSED', 'ERROR'], to: 'IDLE' }
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
  on(state: AgentState | 'transition', callback: (data: any) => void): () => void
  on(state: AgentState, callback: (data: any) => void): () => void {
    if (state === 'transition') {
      this.transitionListeners.add(callback as any)
      return () => {
        this.transitionListeners.delete(callback as any)
      }
    }

    if (!this.listeners.has(state)) {
      this.listeners.set(state, new Set())
    }
    this.listeners.get(state)!.add(callback)

    return () => {
      this.listeners.get(state)?.delete(callback)
    }
  }

  /**
   * 创建检查点（用于断点续作）
   */
  createCheckpoint(taskState: TaskState): any {
    return {
      state: this.currentState,
      taskState,
      timestamp: Date.now()
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
    
    // 触发恢复事件
    this.emit('IDLE', { restored: true, checkpoint })
    
    return true
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
