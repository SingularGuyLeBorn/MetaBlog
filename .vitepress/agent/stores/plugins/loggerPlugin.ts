/**
 * Logger Plugin - Pinia 日志插件
 * 
 * 功能：
 * 1. 记录所有 state 变化
 * 2. 记录 action 调用
 * 3. 性能监控（action 执行时间）
 * 4. 支持过滤和采样
 * 5. 开发时可视化状态流转
 */
import type { PiniaPluginContext } from 'pinia'

export interface LoggerOptions {
  /** 是否启用 */
  enabled?: boolean
  /** 只在开发环境启用 */
  devOnly?: boolean
  /** 需要记录的 store（白名单） */
  includeStores?: string[]
  /** 排除的 store（黑名单） */
  excludeStores?: string[]
  /** 记录 state 变化 */
  logStateChanges?: boolean
  /** 记录 action 调用 */
  logActions?: boolean
  /** 记录 action 执行时间 */
  logTiming?: boolean
  /** 慢 action 阈值（ms） */
  slowActionThreshold?: number
  /** 自定义日志函数 */
  logger?: typeof console
  /** 是否展开 mutation 详情 */
  expandMutation?: boolean
}

const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: true,
  devOnly: true,
  logStateChanges: true,
  logActions: true,
  logTiming: true,
  slowActionThreshold: 100,
  logger: console,
  expandMutation: false
}

export function createLoggerPlugin(globalOptions: LoggerOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...globalOptions }
  
  // devOnly 检查
  if (options.devOnly && import.meta.env?.PROD) {
    return () => ({}) // 返回空插件
  }
  
  return ({ store }: PiniaPluginContext) => {
    // 检查 store 是否在白名单/黑名单中
    if (options.includeStores && !options.includeStores.includes(store.$id)) {
      return
    }
    if (options.excludeStores?.includes(store.$id)) {
      return
    }
    
    const logger = options.logger!
    const storeName = store.$id
    
    // 使用颜色区分不同 store
    const colors: Record<string, string> = {
      chat: '#3B82F6',      // blue
      message: '#10B981',   // green
      session: '#F59E0B',   // yellow
      stream: '#8B5CF6'     // purple
    }
    const color = colors[storeName] || '#6B7280'
    
    // ═══════════════════════════════════════════════════════════════
    // 记录 State 变化
    // ═══════════════════════════════════════════════════════════════
    
    if (options.logStateChanges) {
      store.$subscribe((mutation, state) => {
        const { type, storeId } = mutation as any
        
        if (options.expandMutation) {
          logger.groupCollapsed(
            `%c[${storeId}] %c${type}`,
            `color: ${color}; font-weight: bold`,
            'color: inherit'
          )
          logger.log('%cprev state', 'color: #9CA3AF; font-weight: bold', mutation)
          logger.log('%cnext state', 'color: #10B981; font-weight: bold', state)
          logger.groupEnd()
        } else {
          logger.log(
            `%c[${storeId}] %c${type}`,
            `color: ${color}; font-weight: bold`,
            'color: inherit'
          )
        }
      })
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 记录 Action 调用
    // ═══════════════════════════════════════════════════════════════
    
    if (options.logActions) {
      // 保存原始 actions
      const originalActions: Record<string, Function> = {}
      
      Object.keys(store.$state).forEach(key => {
        const value = (store as any)[key]
        if (typeof value === 'function' && !key.startsWith('_')) {
          originalActions[key] = value
          
          // 包装 action
          ;(store as any)[key] = async function(...args: any[]) {
            const startTime = performance.now()
            const actionName = `${storeName}.${key}`
            
            logger.groupCollapsed(
              `%c[Action] %c${actionName}`,
              `color: ${color}`,
              'color: inherit; font-weight: bold'
            )
            
            if (args.length > 0) {
              logger.log('%cargs', 'color: #9CA3AF; font-weight: bold', args)
            }
            
            try {
              const result = await originalActions[key].apply(this, args)
              
              if (options.logTiming) {
                const duration = performance.now() - startTime
                const isSlow = duration > (options.slowActionThreshold || 100)
                
                logger.log(
                  `%c${duration.toFixed(2)}ms`,
                  isSlow ? 'color: #DC2626; font-weight: bold' : 'color: #10B981',
                  isSlow ? '⚠️ 慢操作' : ''
                )
              }
              
              logger.log('%cresult', 'color: #10B981; font-weight: bold', result)
              logger.groupEnd()
              
              return result
            } catch (error) {
              const duration = performance.now() - startTime
              logger.log(
                `%c${duration.toFixed(2)}ms %c✗`,
                'color: #DC2626',
                'color: #DC2626; font-weight: bold'
              )
              logger.error('%cerror', 'color: #DC2626; font-weight: bold', error)
              logger.groupEnd()
              throw error
            }
          }
        }
      })
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 返回统计信息
    // ═══════════════════════════════════════════════════════════════
    
    return {
      $logger: {
        enabled: true,
        options
      }
    }
  }
}

// 默认导出
export default createLoggerPlugin
