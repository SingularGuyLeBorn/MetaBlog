/**
 * Agent 系统事件总线
 * 用于 AgentRuntime 与 UI 组件之间的通信
 * 
 * 使用简单的事件处理器映射实现，支持错误隔离
 */

// Agent 完成事件数据
export interface AgentCompletionEvent {
  /** 生成的文件路径 */
  path: string
  /** 文章标题 */
  title: string
  /** 所属栏目 (posts | knowledge | resources) */
  section: string
  /** 完成时间戳 */
  timestamp: number
  /** 使用的 token 数 */
  tokensUsed?: number
  /** 成本 */
  cost?: number
}

// Agent 失败事件数据
export interface AgentFailureEvent {
  /** 任务 ID */
  taskId: string
  /** 错误信息 */
  error: string
  /** 失败时间戳 */
  timestamp: number
}

// Toast 显示事件数据
export interface ToastShowEvent {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: () => void
  actionText?: string
}

// 事件定义映射
interface EventMap {
  'agent:taskCompleted': AgentCompletionEvent
  'agent:taskFailed': AgentFailureEvent
  'sidebar:expand': { path: string }
  'sidebar:refresh': { section: string }
  'toast:show': ToastShowEvent
}

type EventKey = keyof EventMap
type EventHandler<T extends EventKey> = (data: EventMap[T]) => void

/**
 * 简单的事件总线实现
 * 使用 Map 管理监听器，支持错误隔离
 */
class SimpleEventBus {
  private listeners: Map<EventKey, Set<EventHandler<any>>> = new Map()

  /**
   * 监听事件
   */
  on<T extends EventKey>(event: T, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    const handlers = this.listeners.get(event)!
    handlers.add(handler)
    
    // 返回取消订阅函数
    return () => {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  /**
   * 触发事件
   * 使用 try-catch 隔离处理器错误，避免一个处理器失败影响其他处理器
   */
  emit<T extends EventKey>(event: T, data: EventMap[T]): void {
    const handlers = this.listeners.get(event)
    if (!handlers || handlers.size === 0) {
      return
    }
    
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`[EventBus] Error in handler for '${event}':`, error)
      }
    })
  }

  /**
   * 只监听一次事件
   */
  once<T extends EventKey>(event: T, handler: EventHandler<T>): () => void {
    const unsubscribe = this.on(event, (data) => {
      try {
        handler(data)
      } catch (error) {
        console.error(`[EventBus] Error in once handler for '${event}':`, error)
      }
      unsubscribe()
    })
    return unsubscribe
  }
  
  /**
   * 清理所有监听器（用于测试或服务关闭时）
   */
  clear(): void {
    this.listeners.clear()
  }
  
  /**
   * 获取指定事件的监听器数量
   */
  listenerCount<T extends EventKey>(event: T): number {
    return this.listeners.get(event)?.size ?? 0
  }
}

/**
 * Agent 系统全局事件总线
 * 用于跨层通信（Agent层 → UI层）
 */
export const eventBus = new SimpleEventBus()

// 为了兼容性，同时导出 EventBus 类型
export type AgentEvents = EventMap

export default eventBus
