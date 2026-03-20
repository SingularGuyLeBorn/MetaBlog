/**
 * Composables 入口文件
 * 
 * 导出通用组合式函数
 * 
 * 注意：AI Chat 相关请从 'components/ai-chat' 导入
 */

// Chat 相关（旧版兼容）
export { 
  useChat, 
  useChatInput, 
  useChatHistory,
  type UseChatOptions 
} from './useChat'

// 虚拟滚动
export { 
  useVirtualScroll, 
  useAutoScroll,
  type VirtualScrollOptions,
  type VirtualItem 
} from './useVirtualScroll'

// 动画
export { default as useAnimations } from './useAnimations'

// 动态侧边栏
export { useDynamicSidebar } from './useDynamicSidebar'

// 日志
export { useLogger } from './useLogger'

// Toast
export { useToast } from './useToast'

// 默认导出
export { useChat as default } from './useChat'
