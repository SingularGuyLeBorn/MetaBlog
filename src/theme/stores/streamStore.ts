/**
 * ============================================================================
 * Pinia Store - streamStore
 * ============================================================================
 *
 * 流式状态机 Store,管理 Chat 界面中 SSE 流式输出的完整生命周期.
 *
 * 解决的问题：
 * 1. 全局 isStreaming 布尔值无法表达"等工具A的同时工具B在跑"的复杂状态
 * 2. content / reasoning / intermediate 文本混用导致 UI 混乱
 * 3. 缺少实时流式进度的统一管理
 *
 * 与 chatStore 的关系：
 * - chatStore 负责会话/消息的 CRUD 和持久化
 * - streamStore 负责流式输出的实时状态管理
 * - chatStore 调用 streamStore 的方法来推进流式状态
 *
 * @module src/theme/stores
 */

import { addLog } from '@/theme/api/services/logger'
import type { SessionStreamState, StreamCallbacksV2, StreamPhase, StreamProgress } from '@/theme/types'
import { computed, reactive, ref } from 'vue'

// ==================== 状态 ====================

/** 按会话ID存储流式状态 */
const streamStates = reactive<Record<string, SessionStreamState>>({})

/** 当前活跃的会话ID(正在流式输出的会话) */
const activeSessionId = ref<string | null>(null)

/** 全局锁：防止同一会话同时启动多个流 */
const sessionLocks = new Set<string>()

// ==================== 辅助函数 ====================

function createInitialState(): SessionStreamState {
  return {
    phase: 'idle',
    prevPhase: 'idle',
    currentAiMessageId: null,
    currentUserMessageId: null,
    reasoningBuffer: '',
    contentBuffer: '',
    intermediateBuffer: '',
    currentRound: 0,
    startTime: 0,
    isAborted: false
  }
}

function getOrCreateState(sessionId: string): SessionStreamState {
  if (!streamStates[sessionId]) {
    streamStates[sessionId] = createInitialState()
  }
  return streamStates[sessionId]
}

function safeCallback<T extends (...args: any[]) => void>(
  cb: T | undefined,
  ...args: Parameters<T>
) {
  if (cb) {
    try {
      cb(...args)
    } catch (e) {
      console.error('[streamStore] Callback error:', e)
    }
  }
}

// ==================== 核心逻辑 ====================

/**
 * 启动流式输出
 *
 * @param sessionId 会话ID
 * @param userMessageId 用户消息ID
 * @param aiMessageId AI 消息ID
 * @returns 是否成功启动(如果会话已锁定则返回 false)
 */
function startStream(
  sessionId: string,
  userMessageId: string,
  aiMessageId: string
): boolean {
  if (sessionLocks.has(sessionId)) {
    console.warn(`[streamStore] Session ${sessionId} is already streaming`)
    return false
  }

  sessionLocks.add(sessionId)
  activeSessionId.value = sessionId

  const state = getOrCreateState(sessionId)
  state.phase = 'connecting'
  state.prevPhase = 'idle'
  state.currentAiMessageId = aiMessageId
  state.currentUserMessageId = userMessageId
  state.reasoningBuffer = ''
  state.contentBuffer = ''
  state.intermediateBuffer = ''
  state.currentRound = 0
  state.startTime = Date.now()
  state.isAborted = false
  state.error = undefined

  addLog({
    level: 'debug',
    category: 'chat',
    event: 'stream_start',
    message: `流式输出启动: session=${sessionId}`,
    sessionId,
    data: { userMessageId, aiMessageId }
  })

  return true
}

/**
 * 更新流式阶段
 *
 * 这是状态机的核心转换方法. 合法的转换：
 * - idle → connecting → reasoning/thinking → tool_calling → tool_running → thinking → ...
 * - 任何阶段 → interrupted(用户中断)
 * - 任何阶段 → error(出错)
 * - responding → complete
 */
function updatePhase(sessionId: string, newPhase: StreamPhase): void {
  const state = streamStates[sessionId]
  if (!state) {
    console.warn(`[streamStore] No stream state for session ${sessionId}`)
    return
  }

  const prevPhase = state.phase
  if (prevPhase === newPhase) return

  state.prevPhase = prevPhase
  state.phase = newPhase

  // 阶段变化时的副作用处理
  if (newPhase === 'responding') {
    // 进入最终回复阶段,清空中间文本 buffer
    state.intermediateBuffer = ''
  } else if (newPhase === 'tool_calling') {
    // 进入工具调用阶段,增加轮次
    state.currentRound++
  } else if (newPhase === 'complete' || newPhase === 'error' || newPhase === 'interrupted') {
    // 流结束,释放锁
    sessionLocks.delete(sessionId)
    if (activeSessionId.value === sessionId) {
      activeSessionId.value = null
    }
  }

  addLog({
    level: 'debug',
    category: 'chat',
    event: 'stream_phase_change',
    message: `流式阶段变化: ${prevPhase} → ${newPhase}`,
    sessionId,
    data: { prevPhase, newPhase, round: state.currentRound }
  })
}

/**
 * 设置推理内容(完整内容,由回调传入)
 */
function setReasoningBuffer(sessionId: string, fullText: string): void {
  const state = streamStates[sessionId]
  if (!state) return

  state.reasoningBuffer = fullText

  // 自动进入 reasoning 阶段(如果还在 connecting)
  if (state.phase === 'connecting' || state.phase === 'idle') {
    updatePhase(sessionId, 'reasoning')
  }
}

/**
 * 设置最终回复内容(完整内容,仅在 responding 阶段有效)
 */
function setContentBuffer(sessionId: string, fullText: string): void {
  const state = streamStates[sessionId]
  if (!state) return

  // 安全检查：只有 responding 阶段才允许设置 content
  if (state.phase !== 'responding') {
    // 如果当前在 thinking/tool_calling 阶段,内容应该进 intermediateBuffer
    if (state.phase === 'thinking' || state.phase === 'tool_calling') {
      state.intermediateBuffer = fullText
      return
    }
    // 其他阶段忽略(或视为 intermediate)
    state.intermediateBuffer = fullText
    return
  }

  state.contentBuffer = fullText
}

/**
 * 设置中间文本(工具调用前的说明文字,完整内容)
 */
function setIntermediateBuffer(sessionId: string, fullText: string): void {
  const state = streamStates[sessionId]
  if (!state) return

  // 自动进入 thinking 阶段
  if (state.phase === 'connecting' || state.phase === 'reasoning') {
    updatePhase(sessionId, 'thinking')
  }

  state.intermediateBuffer = fullText
}

/**
 * 标记进入 responding 阶段(开始生成最终回复)
 */
function startResponding(sessionId: string): void {
  const state = streamStates[sessionId]
  if (!state) return

  updatePhase(sessionId, 'responding')
  // 清空中间文本,准备接收最终回复
  state.intermediateBuffer = ''
}

/**
 * 标记流式完成
 */
function completeStream(sessionId: string): void {
  updatePhase(sessionId, 'complete')

  const duration = streamStates[sessionId]?.startTime
    ? Date.now() - streamStates[sessionId].startTime
    : 0

  addLog({
    level: 'info',
    category: 'chat',
    event: 'stream_complete',
    message: `流式输出完成 (${duration}ms)`,
    sessionId,
    data: { duration }
  })
}

/**
 * 标记流式出错
 */
function errorStream(sessionId: string, error: Error): void {
  const state = streamStates[sessionId]
  if (!state) return

  state.error = error.message
  updatePhase(sessionId, 'error')

  addLog({
    level: 'error',
    category: 'chat',
    event: 'stream_error',
    message: `流式输出错误: ${error.message}`,
    sessionId,
    data: { error: error.message, stack: error.stack }
  })
}

/**
 * 中断流式输出(用户点击停止)
 */
function interruptStream(sessionId: string): void {
  const state = streamStates[sessionId]
  if (!state) return

  state.isAborted = true
  updatePhase(sessionId, 'interrupted')

  addLog({
    level: 'info',
    category: 'chat',
    event: 'stream_interrupted',
    message: '流式输出被用户中断',
    sessionId
  })
}

/**
 * 重置流式状态(清理会话数据)
 */
function resetStream(sessionId: string): void {
  sessionLocks.delete(sessionId)
  delete streamStates[sessionId]
  if (activeSessionId.value === sessionId) {
    activeSessionId.value = null
  }
}

/**
 * 构建 StreamProgress 对象(用于回调)
 */
function buildProgress(sessionId: string): StreamProgress | null {
  const state = streamStates[sessionId]
  if (!state) return null

  return {
    phase: state.phase,
    reasoningFull: state.reasoningBuffer,
    contentFull: state.contentBuffer,
    intermediateDelta: state.intermediateBuffer,
    round: state.currentRound
  }
}

// ==================== 查询 / Getter ====================

function getStreamState(sessionId: string): SessionStreamState | null {
  return streamStates[sessionId] || null
}

function getCurrentPhase(sessionId: string): StreamPhase {
  return streamStates[sessionId]?.phase || 'idle'
}

function isStreamActive(sessionId: string): boolean {
  return sessionLocks.has(sessionId)
}

function getActiveSessionId(): string | null {
  return activeSessionId.value
}

function getStreamDuration(sessionId: string): number {
  const state = streamStates[sessionId]
  if (!state || !state.startTime) return 0
  return Date.now() - state.startTime
}

// ==================== 导出 ====================

export function useStreamStore() {
  return {
    // 状态(只读)
    streamStates: computed(() => streamStates),
    activeSessionId: computed(() => activeSessionId.value),

    // 核心操作
    startStream,
    updatePhase,
    setReasoningBuffer,
    setContentBuffer,
    setIntermediateBuffer,
    startResponding,
    completeStream,
    errorStream,
    interruptStream,
    resetStream,
    buildProgress,

    // 查询
    getStreamState,
    getCurrentPhase,
    isStreamActive,
    getActiveSessionId,
    getStreamDuration
  }
}
