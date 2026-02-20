/**
 * useToast - Toast 通知组合式函数
 */
import { eventBus } from '../../agent/core/EventBus'

interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: () => void
  actionText?: string
}

export function useToast() {
  function show(options: ToastOptions) {
    eventBus.emit('toast:show', {
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration ?? 5000,
      action: options.action,
      actionText: options.actionText
    })
  }

  function success(title: string, message?: string, action?: () => void) {
    show({ type: 'success', title, message, action })
  }

  function error(title: string, message?: string, action?: () => void) {
    show({ type: 'error', title, message, action })
  }

  function warning(title: string, message?: string, action?: () => void) {
    show({ type: 'warning', title, message, action })
  }

  function info(title: string, message?: string, action?: () => void) {
    show({ type: 'info', title, message, action })
  }

  // Agent 专用：写作完成提示
  function agentWriteCompleted(filePath: string, onNavigate?: () => void) {
    show({
      type: 'success',
      title: 'Agent 已完成写作',
      message: filePath,
      duration: 8000,
      actionText: '查看文件',
      action: onNavigate
    })
  }

  return {
    show,
    success,
    error,
    warning,
    info,
    agentWriteCompleted
  }
}

// 全局便捷函数（用于非组件环境）
export const toast = {
  show: (options: ToastOptions) => eventBus.emit('toast:show', options),
  success: (title: string, message?: string) => eventBus.emit('toast:show', { type: 'success', title, message }),
  error: (title: string, message?: string) => eventBus.emit('toast:show', { type: 'error', title, message }),
  warning: (title: string, message?: string) => eventBus.emit('toast:show', { type: 'warning', title, message }),
  info: (title: string, message?: string) => eventBus.emit('toast:show', { type: 'info', title, message }),
  agentWriteCompleted: (filePath: string) => eventBus.emit('toast:show', {
    type: 'success',
    title: 'Agent 已完成写作',
    message: filePath,
    duration: 8000,
    actionText: '查看文件'
  })
}
