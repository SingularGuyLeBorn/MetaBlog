/**
 * Stores 入口文件
 * 
 * 导出所有 Store 和相关类型
 */

// ═══════════════════════════════════════════════════════════════
// Stores
// ═══════════════════════════════════════════════════════════════

export { useChatStore } from './chatStore'
export { useSessionStore } from './sessionStore'
export { useMessageStore } from './messageStore'
export { useStreamStore } from './streamStore'

// ═══════════════════════════════════════════════════════════════
// State Machine
// ═══════════════════════════════════════════════════════════════

export { ChatStateMachine } from './machines/ChatStateMachine'
export type { ChatState, ChatStateEvent } from './machines/ChatStateMachine'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type {
  Message,
  MessageRole,
  MessageStatus,
  Session,
  SessionStatus,
  StreamBuffer,
  ChatError,
  ChatOptions,
  SendMessageOptions
} from './types'

// ═══════════════════════════════════════════════════════════════
// Composable - 统一访问所有 Stores
// ═══════════════════════════════════════════════════════════════

import { useChatStore } from './chatStore'
import { useSessionStore } from './sessionStore'
import { useMessageStore } from './messageStore'
import { useStreamStore } from './streamStore'

/**
 * 使用所有 Chat 相关的 Store
 * 
 * 使用示例:
 * ```typescript
 * const { chat, session, message, stream } = useChatStores()
 * ```
 */
export function useChatStores() {
  return {
    chat: useChatStore(),
    session: useSessionStore(),
    message: useMessageStore(),
    stream: useStreamStore()
  }
}

// 默认导出
export { useChatStores as default }
