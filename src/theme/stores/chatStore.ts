/**
 * ============================================================================
 * Pinia Store - chatStore
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/stores
 */


import { aiService } from '@/theme/api/services/aiService'
import { addLog } from '@/theme/api/services/logger'
import { convertGroupsToMessages, storage } from '@/theme/api/services/storage'
import { useAgentConfig } from '@/theme/stores/agentStore'
import { CORE_TOOL_NAMES } from '@/theme/tools'
import type { ChatMessage, ChatSession, MessageAttachment, MessageGroup, SessionConfig, ThinkingStep, ToolCallRecord } from '@/theme/types'
import { calculateUsagePercent, estimateChatTokens, estimateTextTokens, formatTokenCount, getUsageStatus } from '@/theme/utils/tokenEstimator'
import { computed, ref, watch } from 'vue'
import { useBatchResultStore } from './batchResultStore'
import { useStreamStore } from './streamStore'
import { useToolStore } from './toolStore'

const DEFAULT_CONFIG: SessionConfig = {
  model: 'deepseek-v4-flash',
  temperature: 0.7,
  maxTokens: 8192,
  systemPrompt: '',
  enableReasoning: true,
  reasoningEffort: 'high',
  streaming: true
}

// ==================== 状态 ====================
const sessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)
// 按会话存储消息组(支持版本)
const messageGroups = ref<Record<string, MessageGroup[]>>({})
const streamingSessions = ref<Record<string, boolean>>({})
const isStreaming = computed(() => streamingSessions.value[currentSessionId.value || ''] || false)
const isInitialized = ref(false)
// 每个会话独立的 AbortController(切换会话不中断)
const sessionControllers = new Map<string, AbortController>()
// 消息发送队列(AI 执行期间用户发送的消息暂存于此)
const pendingMessages = ref<Record<string, Array<{
  content: string
  attachments?: MessageAttachment[]
  skillInfo?: { id: string; name: string; icon: string; content: string }
}>>>({})

// Token 用量追踪(按会话)
interface TokenUsage {
  estimatedInput: number      // 估算的输入 token
  estimatedOutput: number     // 估算的输出 token
  apiReportedPrompt: number   // API 返回的 prompt_tokens
  apiReportedCompletion: number // API 返回的 completion_tokens
  apiReportedTotal: number    // API 返回的 total_tokens
  lastUpdated: number         // 最后更新时间
}

const tokenUsageMap = ref<Record<string, TokenUsage>>({})

// 获取当前会话的 token 用量
function getCurrentTokenUsage(sessionId: string | null): TokenUsage {
  if (!sessionId) return { estimatedInput: 0, estimatedOutput: 0, apiReportedPrompt: 0, apiReportedCompletion: 0, apiReportedTotal: 0, lastUpdated: 0 }
  return tokenUsageMap.value[sessionId] || { estimatedInput: 0, estimatedOutput: 0, apiReportedPrompt: 0, apiReportedCompletion: 0, apiReportedTotal: 0, lastUpdated: 0 }
}

// 估算当前会话的输入 token(基于消息历史)
function estimateSessionInputTokens(sessionId: string): number {
  const groups = messageGroups.value[sessionId] || []
  const messages: Array<{ role: string; content?: string }> = []

  for (const group of groups) {
    messages.push({ role: 'user', content: group.userMessage.content })
    const activeVersion = group.aiVersions[group.currentVersionIndex]
    if (activeVersion) {
      messages.push({ role: 'assistant', content: activeVersion.content })
    }
  }

  return estimateChatTokens(messages)
}

/**
 * useAIChat 函数
 *
 * @returns 返回值
 */
export function useAIChat() {
  // 获取 Agent 配置(用于工具权限校验)
  const { activeAgent, skills } = useAgentConfig()

  // 流式状态机和工具链 Store(Phase 1 新增)
  const streamStore = useStreamStore()
  const toolStore = useToolStore()

  // ==================== 初始化 ====================
  async function initialize() {
    if (isInitialized.value) return

    const data = await storage.load()
    sessions.value = data.sessions
    messageGroups.value = data.messageGroups
    currentSessionId.value = data.lastSessionId

    if (sessions.value.length === 0) {
      await createSession('新对话')
    }
    isInitialized.value = true
  }

  // 立即执行初始化
  initialize()

  // ==================== Computed ====================
  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || null
  })

  /**
   * 当前会话的消息列表(将消息组转换为消息数组用于显示)
   * 使用 ref 替代 computed,避免流式输出时全量重新计算
   */
  const currentMessages = ref<ChatMessage[]>([])

  function syncCurrentMessages() {
    if (!currentSessionId.value) {
      currentMessages.value = []
      return
    }
    const groups = messageGroups.value[currentSessionId.value] || []
    currentMessages.value = convertGroupsToMessages(groups)
  }

  // 会话切换时同步消息列表
  watch(currentSessionId, syncCurrentMessages)

  /**
   * 当前会话的消息组(用于版本管理)
   */
  const currentMessageGroups = computed(() => {
    if (!currentSessionId.value) return []
    return messageGroups.value[currentSessionId.value] || []
  })

  // ==================== 会话管理 ====================
  async function createSession(title: string = '新对话') {
    const now = Date.now()
    const session: ChatSession = {
      id: `session-${now}-${Math.random().toString(36).slice(2, 9)}`,
      title,
      config: {
        ...DEFAULT_CONFIG,
        // 如果有激活的 Agent,自动绑定
        agentId: activeAgent.value?.id
      },
      stats: { messageCount: 0, totalTokens: 0 },
      createdAt: now,
      updatedAt: now
    }

    sessions.value.unshift(session)
    currentSessionId.value = session.id
    messageGroups.value[session.id] = []

    // 异步保存到服务器
    await storage.saveSession(session)

    return session
  }

  function switchSession(id: string) {
    currentSessionId.value = id
    storage.saveLastSession(id)
  }

  async function renameSession(id: string, newTitle: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = newTitle
      session.updatedAt = Date.now()
      await storage.saveSession(session)
    }
  }

  async function deleteSession(id: string): Promise<boolean> {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index === -1) return false

    // 先调用后端删除，确认成功后再清理前端状态
    const success = await storage.deleteSession(id)
    if (!success) {
      console.warn(`[chatStore] 删除会话失败: ${id}`)
      return false
    }

    // 清理前端状态
    sessions.value.splice(index, 1)
    delete messageGroups.value[id]
    delete pendingMessages.value[id]
    delete tokenUsageMap.value[id]
    sessionControllers.delete(id)

    // 清理流式和工具状态
    streamStore.resetStream(id)
    toolStore.clearSessionToolChains(id)

    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id || null
    }

    if (sessions.value.length === 0) {
      await createSession('新对话')
    }

    return true
  }

  async function autoRenameSession(sessionId: string, firstMessage: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.title !== '新对话') return

    let title = firstMessage.trim().slice(0, 20)
    if (firstMessage.length > 20) title += '...'
    if (!title) title = '新对话'

    session.title = title
    session.updatedAt = Date.now()
    await storage.saveSession(session)
  }

  // ==================== 消息发送 ====================
  async function sendMessage(content: string, attachments?: MessageAttachment[], skillInfo?: { id: string; name: string; icon: string; content: string }, _isQueued = false): Promise<boolean> {
    if (!currentSession.value || (!content.trim() && (!attachments || attachments.length === 0))) return false

    const sessionId = currentSessionId.value!
    const config = currentSession.value.config
    const groups = messageGroups.value[sessionId] || []

    // 如果当前会话正在流式输出,将消息加入队列并立即显示用户消息
    if (streamingSessions.value[sessionId] && !_isQueued) {
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        role: 'user',
        content: content.trim(),
        status: 'completed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        metadata: skillInfo ? { skill: skillInfo } : undefined
      }
      groups.push({
        userMessage: userMsg,
        aiVersions: [],
        currentVersionIndex: 0
      })
      messageGroups.value[sessionId] = groups
      if (sessionId === currentSessionId.value) {
        syncCurrentMessages()
      }

      const queue = pendingMessages.value[sessionId] || []
      queue.push({ content: content.trim(), attachments, skillInfo })
      pendingMessages.value[sessionId] = queue

      addLog({
        level: 'info',
        category: 'chat',
        event: 'message_queued',
        message: '用户消息已加入队列',
        sessionId,
        data: { content: content.slice(0, 200), queueLength: queue.length }
      })
      return true
    }

    // 自动重命名(第一条消息)—— 仅非队列消息
    if (groups.length === 0 && !_isQueued) {
      await autoRenameSession(sessionId, content.trim())
    }

    // 估算输入 token(发送前)
    const inputTokens = estimateSessionInputTokens(sessionId) + estimateTextTokens(content.trim())
    const existingUsage = getCurrentTokenUsage(sessionId)
    tokenUsageMap.value[sessionId] = {
      ...existingUsage,
      estimatedInput: inputTokens,
      lastUpdated: Date.now()
    }

    let userMsg: ChatMessage

    if (_isQueued) {
      // 队列消费模式：复用最后一个没有 aiVersions 的消息组
      const lastGroup = groups[groups.length - 1]
      if (!lastGroup || lastGroup.aiVersions.length > 0) {
        console.error('[sendMessage] Queued message group not found')
        return false
      }
      userMsg = lastGroup.userMessage
    } else {
      // 创建用户消息(@引用已经直接包含在 content 中)
      userMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        role: 'user',
        content: content.trim(),
        status: 'completed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        metadata: skillInfo ? { skill: skillInfo } : undefined
      }
    }

    // 创建第一个 AI 响应版本
    const aiMsg: ChatMessage = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parentMessageId: userMsg.id,
      isActiveVersion: true
    }

    if (_isQueued) {
      // 队列消费模式：为现有组添加 AI 响应
      groups[groups.length - 1].aiVersions = [aiMsg]
      groups[groups.length - 1].currentVersionIndex = 0
      messageGroups.value[sessionId] = groups
    } else {
      // 创建消息组
      const newGroup: MessageGroup = {
        userMessage: userMsg,
        aiVersions: [aiMsg],
        currentVersionIndex: 0
      }
      groups.push(newGroup)
      messageGroups.value[sessionId] = groups
    }

    // 同步 currentMessages 反映新消息
    if (sessionId === currentSessionId.value) {
      syncCurrentMessages()
    }

    // 设置当前会话的流式状态
    streamingSessions.value[sessionId] = true

    // 创建或获取当前会话的 AbortController
    let controller = sessionControllers.get(sessionId)
    if (controller) {
      // 如果已有 controller,先中断之前的请求
      controller.abort()
    }
    controller = new AbortController()
    sessionControllers.set(sessionId, controller)

    // 创建对话追踪
    addLog({
      level: 'info',
      category: 'chat',
      event: 'message_start',
      message: '用户发送消息',
      sessionId,
      messageId: userMsg.id,
      data: { content: content.slice(0, 500), skill: skillInfo?.name }
    })

    try {
      // 构建历史记录(不再前端预注入 Skill 内容)
      // Skill 内容改为由 Agent 主动调用 loadSkill 工具后注入
      const history = buildHistoryFromGroups(groups)

      // 用于存储工具调用记录
      let toolRecords: ToolCallRecord[] = []

      // 构建工具上下文：渐进式披露
      // 默认只暴露核心工具(~7个),领域工具通过 searchCapabilities / loadSkill 动态激活
      const agent = activeAgent.value
      const skillIds = agent?.capabilities?.skillIds || []
      const toolContext = agent ? {
        agentId: agent.id,
        availableSkills: skillIds,
        declaredTools: skills.value
          .filter(s => skillIds.includes(s.id))
          .flatMap(s => s.tools || []),
        availableTools: CORE_TOOL_NAMES
      } : undefined

      // 【Phase 1】启动流式状态机
      const groupId = userMsg.id
      streamStore.startStream(sessionId, userMsg.id, aiMsg.id)

      const { toolRecords: records, injectedMessages } = await aiService.chatStream(
        history,
        config,
        {
          onContent: (text) => {
            const currentProxyGroups = messageGroups.value[sessionId]
            if (!currentProxyGroups) return
            const targetMsg = currentProxyGroups[currentProxyGroups.length - 1].aiVersions[0]
            targetMsg.content = text
            targetMsg.updatedAt = Date.now()
            // 直接同步 currentMessages,避免全量 convertGroupsToMessages
            const lastMsg = currentMessages.value[currentMessages.value.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.content = text
              lastMsg.updatedAt = Date.now()
            }
            // 【Phase 1】同步到流式状态机
            streamStore.setContentBuffer(sessionId, text)
          },
          onReasoning: (text) => {
            const currentProxyGroups = messageGroups.value[sessionId]
            if (!currentProxyGroups) return
            const targetMsg = currentProxyGroups[currentProxyGroups.length - 1].aiVersions[0]
            // 如果已经有 thinkingSteps,不再更新传统 reasoning(避免覆盖串行显示)
            if (!targetMsg.metadata?.thinkingSteps?.length) {
              targetMsg.reasoning = { content: text, isVisible: true }
            }
            targetMsg.updatedAt = Date.now()
            // 同步 currentMessages
            const lastMsg = currentMessages.value[currentMessages.value.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              if (!lastMsg.metadata?.thinkingSteps?.length) {
                lastMsg.reasoning = { content: text, isVisible: true }
              }
              lastMsg.updatedAt = Date.now()
            }
            // 【Phase 1】同步到流式状态机
            streamStore.setReasoningBuffer(sessionId, text)
          },
          onThinkingStep: (step: ThinkingStep) => {
            const currentProxyGroups = messageGroups.value[sessionId]
            if (!currentProxyGroups) return
            const targetMsg = currentProxyGroups[currentProxyGroups.length - 1].aiVersions[0]
            if (!targetMsg.metadata) {
              targetMsg.metadata = {}
            }
            if (!targetMsg.metadata.thinkingSteps) {
              targetMsg.metadata.thinkingSteps = []
            }
            // 检查是否已存在相同ID的步骤,存在则更新,否则添加
            const existingIndex = targetMsg.metadata.thinkingSteps.findIndex(s => s.id === step.id)
            if (existingIndex >= 0) {
              targetMsg.metadata.thinkingSteps.splice(existingIndex, 1, step)
            } else {
              targetMsg.metadata.thinkingSteps.push(step)
            }
            targetMsg.updatedAt = Date.now()
            // 同步 currentMessages(不再做整数组替换)
            const lastMsg = currentMessages.value[currentMessages.value.length - 1]
            if (lastMsg && lastMsg.role === 'assistant') {
              if (!lastMsg.metadata) lastMsg.metadata = {}
              if (!lastMsg.metadata.thinkingSteps) lastMsg.metadata.thinkingSteps = []
              const lastExistingIndex = lastMsg.metadata.thinkingSteps.findIndex(s => s.id === step.id)
              if (lastExistingIndex >= 0) {
                lastMsg.metadata.thinkingSteps.splice(lastExistingIndex, 1, step)
              } else {
                lastMsg.metadata.thinkingSteps.push(step)
              }
              lastMsg.updatedAt = Date.now()
            }
            // 【Phase 1】中间文本同步到流式状态机
            if (step.type === 'text' && step.content) {
              streamStore.setIntermediateBuffer(sessionId, step.content)
            }
          },
          onUsage: (usage) => {
            const existingUsage = getCurrentTokenUsage(sessionId)
            tokenUsageMap.value[sessionId] = {
              ...existingUsage,
              apiReportedPrompt: usage.prompt_tokens,
              apiReportedCompletion: usage.completion_tokens,
              apiReportedTotal: usage.total_tokens,
              lastUpdated: Date.now()
            }
          },
          onPhaseChange: (phase, prevPhase) => {
            // 【Phase 1】同步到流式状态机
            streamStore.updatePhase(sessionId, phase)
          },
          onToolCallStart: (item) => {
            // 【Phase 1】同步到工具链 Store
            toolStore.startToolCall(sessionId, groupId, {
              id: item.id,
              stepId: item.stepId,
              name: item.name,
              arguments: item.arguments,
              round: item.round,
              index: item.index
            })
          },
          onToolCallUpdate: (item) => {
            toolStore.updateToolCall(sessionId, groupId, item.id, {
              status: item.status,
              progressText: item.progressText
            })
          },
          onToolCallComplete: (item) => {
            toolStore.completeToolCall(sessionId, groupId, item.id, item.result)

            // 【批量结果抽屉】大量结果自动收纳,避免堆积在 MessageBubble
            const result = item.result
            if (result && typeof result === 'object' && result.success) {
              const resultStr = typeof result.data === 'string'
                ? result.data
                : JSON.stringify(result.data, null, 2)
              const isBulkTool = item.name.includes('search') || item.name.includes('list') || item.name.includes('batch') || item.name.includes('create') || item.name.includes('append')
              const isLargeResult = resultStr.length > 3000 || (Array.isArray(result.data) && result.data.length > 10)
              if (isBulkTool && isLargeResult) {
                const batchStore = useBatchResultStore()
                batchStore.addItem({
                  title: result.message || `${item.name} 结果`,
                  type: item.name.includes('search') ? 'search' : item.name.includes('doc') || item.name.includes('wiki') ? 'document' : 'generic',
                  content: resultStr,
                  summary: `${Array.isArray(result.data) ? result.data.length + ' 条' : resultStr.length + ' 字符'}`,
                  meta: { tool: item.name, duration: String(item.duration || 0) + 'ms' }
                })
              }
            }
          },
          onComplete: () => {
            const currentProxyGroups = messageGroups.value[sessionId]
            if (!currentProxyGroups) return
            const targetMsg = currentProxyGroups[currentProxyGroups.length - 1].aiVersions[0]
            targetMsg.status = 'completed'
            targetMsg.updatedAt = Date.now()
            // 保留现有的 metadata(包括 thinkingSteps),只添加新字段
            targetMsg.metadata = {
              ...targetMsg.metadata,  // 保留 thinkingSteps 等
              model: config.model,
              toolRecords  // 保存工具调用记录到消息
            }
            // 重置当前会话的流式状态
            streamingSessions.value[sessionId] = false
            storage.saveMessageGroups(sessionId, currentProxyGroups)
            // 清理 controller
            sessionControllers.delete(sessionId)
            // 同步 currentMessages 确保最终状态一致
            syncCurrentMessages()

            // 【Phase 1】流式状态机完成
            streamStore.completeStream(sessionId)

            // 更新 Token 用量：估算输出 token
            const existingUsage = getCurrentTokenUsage(sessionId)
            const outputTokens = estimateTextTokens(targetMsg.content)
            tokenUsageMap.value[sessionId] = {
              ...existingUsage,
              estimatedOutput: existingUsage.estimatedOutput + outputTokens,
              lastUpdated: Date.now()
            }

            // 记录完成日志
            addLog({
              level: 'info',
              category: 'chat',
              event: 'message_complete',
              message: 'AI 回复完成',
              sessionId,
              messageId: targetMsg.id,
              data: {
                contentLength: targetMsg.content.length,
                estimatedOutputTokens: outputTokens,
                hasToolCalls: (toolRecords?.length || 0) > 0
              }
            })

            // 消费队列中的下一条消息
            const queue = pendingMessages.value[sessionId]
            if (queue && queue.length > 0) {
              const next = queue.shift()!
              pendingMessages.value[sessionId] = queue
              sendMessage(next.content, next.attachments, next.skillInfo, true)
            }
          },
          onError: (err) => {
            const currentProxyGroups = messageGroups.value[sessionId]
            if (!currentProxyGroups) return
            const targetMsg = currentProxyGroups[currentProxyGroups.length - 1].aiVersions[0]
            const hasToolCalls = toolRecords.length > 0
            const errorMessage = err.message || String(err)

            targetMsg.status = 'error'

            // 如果工具调用成功但后续失败,显示更详细的错误
            if (hasToolCalls) {
              targetMsg.content = `⚠️ 工具调用成功,但获取 AI 回复时出错\n\n错误：${errorMessage}\n\n可能原因：\n1. 网络连接中断\n2. API 服务暂时不可用\n3. 请求超时\n\n建议：检查网络连接后重试,工具操作可能已完成`
            } else {
              targetMsg.content = `错误：${errorMessage}`
            }

            targetMsg.updatedAt = Date.now()
            targetMsg.metadata = {
              ...targetMsg.metadata,
              model: config.model,
              toolRecords,
              error: errorMessage
            }
            // 重置当前会话的流式状态
            streamingSessions.value[sessionId] = false
            // 清理 controller
            sessionControllers.delete(sessionId)
            storage.saveMessageGroups(sessionId, currentProxyGroups)
            // 同步 currentMessages 确保错误状态一致
            syncCurrentMessages()

            // 【Phase 1】流式状态机错误
            streamStore.errorStream(sessionId, err)

            // 记录错误日志
            addLog({
              level: 'error',
              category: 'error',
              event: 'message_error',
              message: hasToolCalls ? '工具成功但AI回复失败' : 'AI 回复失败',
              sessionId,
              messageId: targetMsg.id,
              data: {
                error: errorMessage,
                hasToolCalls,
                toolCount: toolRecords.length,
                type: err.name || 'UnknownError'
              }
            })

            // 消费队列中的下一条消息(即使出错也继续)
            const queue = pendingMessages.value[sessionId]
            if (queue && queue.length > 0) {
              const next = queue.shift()!
              pendingMessages.value[sessionId] = queue
              sendMessage(next.content, next.attachments, next.skillInfo, true)
            }
          },
          onToolRecord: (record) => {
            // 保存到本地数组
            const existingIndex = toolRecords.findIndex(r => r.id === record.id)
            if (existingIndex >= 0) {
              toolRecords[existingIndex] = record
            } else {
              toolRecords.push(record)
            }

            // 实时更新工具调用记录到消息
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            if (!targetMsg.metadata) {
              targetMsg.metadata = {}
            }
            if (!targetMsg.metadata.toolRecords) {
              targetMsg.metadata.toolRecords = []
            }
            // 查找是否已存在该记录
            const msgExistingIndex = targetMsg.metadata.toolRecords.findIndex(r => r.id === record.id)
            if (msgExistingIndex >= 0) {
              targetMsg.metadata.toolRecords[msgExistingIndex] = record
            } else {
              targetMsg.metadata.toolRecords.push(record)
            }
          }
        },
        controller.signal,
        10,
        sessionId,
        toolContext
      )

      // ========== 保存 loadSkill 注入的消息到对话历史 ==========
      const currentProxyGroups = messageGroups.value[sessionId]
      if (currentProxyGroups) {
        const lastGroup = currentProxyGroups[currentProxyGroups.length - 1]

        // 补充更新 toolRecords(aiService 返回的完整记录)
        if (records && records.length > 0) {
          const targetMsg = lastGroup.aiVersions[0]
          targetMsg.metadata = {
            ...targetMsg.metadata,
            toolRecords: records
          }
        }

        // 保存注入消息到 MessageGroup,使其在后续对话中持久化
        if (injectedMessages && injectedMessages.length > 0) {
          const existingInjected = lastGroup.injectedMessages || []
          // 去重：避免同一轮次中重复注入相同内容
          const existingContents = new Set(existingInjected.map(m => m.content))
          const newInjected: ChatMessage[] = injectedMessages
            .filter(msg => !existingContents.has(msg.content))
            .map((msg, i) => ({
              id: `inject_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
              sessionId,
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content,
              status: 'completed',
              createdAt: Date.now(),
              updatedAt: Date.now()
            }))
          if (newInjected.length > 0) {
            lastGroup.injectedMessages = [...existingInjected, ...newInjected]

            // 持久化到存储
            storage.saveMessageGroups(sessionId, currentProxyGroups)
            syncCurrentMessages()

            addLog({
              level: 'info',
              category: 'chat',
              event: 'skill_injected',
              message: `保存 ${newInjected.length} 条注入消息到对话历史`,
              sessionId,
              data: { count: newInjected.length }
            })
          }
        }
      }

      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      // 重置当前会话的流式状态
      streamingSessions.value[sessionId] = false
      // 清理 controller
      sessionControllers.delete(sessionId)

      // 更新最后一条消息为错误状态
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.aiVersions.length > 0) {
        const targetMsg = lastGroup.aiVersions[lastGroup.aiVersions.length - 1]
        targetMsg.status = 'error'
        targetMsg.content = `错误：${error.message}`
        targetMsg.updatedAt = Date.now()
        storage.saveMessageGroups(sessionId, groups)
      }

      // 消费队列中的下一条消息(即使异常也继续)
      const queue = pendingMessages.value[sessionId]
      if (queue && queue.length > 0) {
        const next = queue.shift()!
        pendingMessages.value[sessionId] = queue
        sendMessage(next.content, next.attachments, next.skillInfo, true)
      }

      // 记录详细错误日志
      addLog({
        level: 'error',
        category: 'error',
        event: 'message_error',
        message: `发送消息异常: ${error.message}`,
        sessionId,
        data: {
          error: error.message,
          stack: error.stack,
          name: error.name,
          type: error.name === 'TypeError' && error.message.includes('fetch')
            ? 'NetworkError'
            : error.name
        }
      })

      return false
    }
  }

  // ==================== 重新生成(添加新版本)====================
  async function regenerateResponse(userMessageId?: string): Promise<boolean> {
    if (!currentSessionId.value || streamingSessions.value[currentSessionId.value]) return false

    const sessionId = currentSessionId.value
    const groups = messageGroups.value[sessionId]
    if (!groups || groups.length === 0) return false

    // 找到目标消息组
    let targetGroupIndex: number
    if (userMessageId) {
      targetGroupIndex = groups.findIndex(g => g.userMessage.id === userMessageId)
      if (targetGroupIndex === -1) return false
    } else {
      // 默认重新生成最后一个用户查询的响应
      targetGroupIndex = groups.length - 1
    }

    const targetGroup = groups[targetGroupIndex]
    const config = currentSession.value?.config || DEFAULT_CONFIG

    // 创建新版本
    const newVersion: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      parentMessageId: targetGroup.userMessage.id,
      isActiveVersion: false // 暂时不激活,等完成后再激活
    }

    // 将之前的版本设为非激活
    targetGroup.aiVersions.forEach(v => v.isActiveVersion = false)
    targetGroup.aiVersions.push(newVersion)
    targetGroup.currentVersionIndex = targetGroup.aiVersions.length - 1
    newVersion.isActiveVersion = true

    streamingSessions.value[sessionId] = true
    const versionIndex = targetGroup.aiVersions.length - 1

    // 同步 currentMessages 反映新版本
    syncCurrentMessages()

    try {
      // 构建历史记录(截断到目标用户消息)
      const history = buildHistoryForRegenerate(groups, targetGroupIndex)

      // 用于存储工具调用记录
      let toolRecords: ToolCallRecord[] = []

      // 构建工具上下文：渐进式披露(默认只暴露核心工具)
      const agent = activeAgent.value
      const skillIds = agent?.capabilities?.skillIds || []
      const toolContext = agent ? {
        agentId: agent.id,
        availableSkills: skillIds,
        declaredTools: skills.value
          .filter(s => skillIds.includes(s.id))
          .flatMap(s => s.tools || []),
        availableTools: CORE_TOOL_NAMES
      } : undefined

      // 【Phase 1】启动流式状态机(重新生成)
      const regenGroupId = targetGroup.userMessage.id
      streamStore.startStream(sessionId, targetGroup.userMessage.id, newVersion.id)

      const { toolRecords: records, injectedMessages } = await aiService.chatStream(
        history,
        config,
        {
          onContent: (text) => {
            targetGroup.aiVersions[versionIndex].content = text
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
            // 直接同步 currentMessages
            const msg = currentMessages.value.find(m => m.role === 'assistant' && m.parentMessageId === targetGroup.userMessage.id)
            if (msg) {
              msg.content = text
              msg.updatedAt = Date.now()
            }
            streamStore.setContentBuffer(sessionId, text)
          },
          onReasoning: (text) => {
            targetGroup.aiVersions[versionIndex].reasoning = {
              content: text,
              isVisible: true
            }
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
            const msg = currentMessages.value.find(m => m.role === 'assistant' && m.parentMessageId === targetGroup.userMessage.id)
            if (msg) {
              msg.reasoning = { content: text, isVisible: true }
              msg.updatedAt = Date.now()
            }
            streamStore.setReasoningBuffer(sessionId, text)
          },
          onThinkingStep: (step: ThinkingStep) => {
            const targetMsg = targetGroup.aiVersions[versionIndex]
            if (!targetMsg.metadata) {
              targetMsg.metadata = {}
            }
            if (!targetMsg.metadata.thinkingSteps) {
              targetMsg.metadata.thinkingSteps = []
            }
            const existingIndex = targetMsg.metadata.thinkingSteps.findIndex(s => s.id === step.id)
            if (existingIndex >= 0) {
              targetMsg.metadata.thinkingSteps.splice(existingIndex, 1, step)
            } else {
              targetMsg.metadata.thinkingSteps.push(step)
            }
            targetMsg.updatedAt = Date.now()
            // 同步 currentMessages(不再整数组替换)
            const msg = currentMessages.value.find(m => m.role === 'assistant' && m.parentMessageId === targetGroup.userMessage.id)
            if (msg) {
              if (!msg.metadata) msg.metadata = {}
              if (!msg.metadata.thinkingSteps) msg.metadata.thinkingSteps = []
              const msgExistingIndex = msg.metadata.thinkingSteps.findIndex(s => s.id === step.id)
              if (msgExistingIndex >= 0) {
                msg.metadata.thinkingSteps.splice(msgExistingIndex, 1, step)
              } else {
                msg.metadata.thinkingSteps.push(step)
              }
              msg.updatedAt = Date.now()
            }
            if (step.type === 'text' && step.content) {
              streamStore.setIntermediateBuffer(sessionId, step.content)
            }
          },
          onUsage: (usage) => {
            const existingUsage = getCurrentTokenUsage(sessionId)
            tokenUsageMap.value[sessionId] = {
              ...existingUsage,
              apiReportedPrompt: usage.prompt_tokens,
              apiReportedCompletion: usage.completion_tokens,
              apiReportedTotal: usage.total_tokens,
              lastUpdated: Date.now()
            }
          },
          onPhaseChange: (phase) => {
            streamStore.updatePhase(sessionId, phase)
          },
          onToolCallStart: (item) => {
            toolStore.startToolCall(sessionId, regenGroupId, {
              id: item.id,
              stepId: item.stepId,
              name: item.name,
              arguments: item.arguments,
              round: item.round,
              index: item.index
            })
          },
          onToolCallComplete: (item) => {
            toolStore.completeToolCall(sessionId, regenGroupId, item.id, item.result)
          },
          onComplete: () => {
            targetGroup.aiVersions[versionIndex].status = 'completed'
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
            streamingSessions.value[sessionId] = false
            storage.saveMessageGroups(sessionId, groups)
            syncCurrentMessages()
            streamStore.completeStream(sessionId)

            // 更新 Token 用量：估算输出 token
            const existingUsage = getCurrentTokenUsage(sessionId)
            const outputTokens = estimateTextTokens(targetGroup.aiVersions[versionIndex].content)
            tokenUsageMap.value[sessionId] = {
              ...existingUsage,
              estimatedOutput: existingUsage.estimatedOutput + outputTokens,
              lastUpdated: Date.now()
            }
          },
          onError: (err) => {
            targetGroup.aiVersions[versionIndex].status = 'error'
            targetGroup.aiVersions[versionIndex].content = `错误：${err.message}`
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
            streamingSessions.value[sessionId] = false
            storage.saveMessageGroups(sessionId, groups)
            syncCurrentMessages()
            streamStore.errorStream(sessionId, err)
          }
        },
        undefined,  // signal
        20,         // maxToolRounds
        sessionId,  // sessionId
        toolContext
      )

      // 补充更新 toolRecords 和注入消息
      if (records && records.length > 0) {
        targetGroup.aiVersions[versionIndex].metadata = {
          ...targetGroup.aiVersions[versionIndex].metadata,
          toolRecords: records
        }
      }
      if (injectedMessages && injectedMessages.length > 0) {
        const existingInjected = targetGroup.injectedMessages || []
        const existingContents = new Set(existingInjected.map(m => m.content))
        const newInjected: ChatMessage[] = injectedMessages
          .filter(msg => !existingContents.has(msg.content))
          .map((msg, i) => ({
            id: `inject_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            sessionId,
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
            status: 'completed',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }))
        if (newInjected.length > 0) {
          targetGroup.injectedMessages = [...existingInjected, ...newInjected]
          storage.saveMessageGroups(sessionId, groups)
          syncCurrentMessages()
        }
      }

      return true
    } catch (err) {
      streamingSessions.value[sessionId] = false
      return false
    }
  }

  // ==================== 版本管理 ====================

  /**
   * 切换到指定版本
   */
  function switchVersion(userMessageId: string, versionIndex: number): boolean {
    if (!currentSessionId.value) return false

    const sessionId = currentSessionId.value
    const groups = messageGroups.value[sessionId]
    if (!groups) return false

    const group = groups.find(g => g.userMessage.id === userMessageId)
    if (!group || versionIndex < 0 || versionIndex >= group.aiVersions.length) {
      return false
    }

    group.currentVersionIndex = versionIndex
    group.aiVersions.forEach((v, i) => {
      v.isActiveVersion = (i === versionIndex)
    })

    syncCurrentMessages()
    storage.switchVersion(sessionId, userMessageId, versionIndex)
    return true
  }

  /**
   * 获取指定用户消息的版本列表
   */
  function getVersions(userMessageId: string): ChatMessage[] {
    if (!currentSessionId.value) return []

    const groups = messageGroups.value[currentSessionId.value]
    if (!groups) return []

    const group = groups.find(g => g.userMessage.id === userMessageId)
    return group?.aiVersions || []
  }

  /**
   * 获取当前激活的版本索引
   */
  function getCurrentVersionIndex(userMessageId: string): number {
    if (!currentSessionId.value) return 0

    const groups = messageGroups.value[currentSessionId.value]
    if (!groups) return 0

    const group = groups.find(g => g.userMessage.id === userMessageId)
    return group?.currentVersionIndex || 0
  }

  /**
   * 删除特定版本
   */
  async function deleteVersion(userMessageId: string, versionId: string): Promise<boolean> {
    if (!currentSessionId.value) return false

    const sessionId = currentSessionId.value
    const result = await storage.deleteVersion(sessionId, userMessageId, versionId)

    if (result) {
      // 重新加载
      messageGroups.value[sessionId] = await storage.loadMessageGroups(sessionId)
      syncCurrentMessages()
    }

    return result
  }

  // ==================== 辅助函数 ====================

  /**
   * 从消息组构建历史记录(用于发送消息)
   * 确保包含 tool_calls 和 tool_call_id 等字段,符合 DeepSeek API 要求
   */
  function buildHistoryFromGroups(groups: MessageGroup[]): ChatMessage[] {
    const history: ChatMessage[] = []
    for (const group of groups) {
      // 添加用户消息
      history.push(group.userMessage)

      // 只使用当前激活的版本
      const activeVersion = group.aiVersions[group.currentVersionIndex]
      if (activeVersion) {
        // 确保 metadata 中的 toolCalls 被正确保留
        history.push(activeVersion)
      }

      // 添加系统注入的消息(如 loadSkill 加载的 skill 内容)
      if (group.injectedMessages && group.injectedMessages.length > 0) {
        history.push(...group.injectedMessages)
      }
    }
    return history
  }

  /**
   * 为重新生成构建历史记录
   * 截断到指定用户消息之前
   */
  function buildHistoryForRegenerate(groups: MessageGroup[], targetIndex: number): ChatMessage[] {
    const history: ChatMessage[] = []
    for (let i = 0; i < targetIndex; i++) {
      const group = groups[i]
      history.push(group.userMessage)
      const activeVersion = group.aiVersions[group.currentVersionIndex]
      if (activeVersion) {
        history.push(activeVersion)
      }
      if (group.injectedMessages && group.injectedMessages.length > 0) {
        history.push(...group.injectedMessages)
      }
    }
    // 添加目标用户消息
    history.push(groups[targetIndex].userMessage)
    return history
  }

  function interruptGeneration(sessionId?: string) {
    const targetSessionId = sessionId || currentSessionId.value
    if (!targetSessionId) return

    // 获取该会话的 controller 并中断
    const controller = sessionControllers.get(targetSessionId)
    if (controller) {
      controller.abort()
      sessionControllers.delete(targetSessionId)
    }

    // 重置目标会话的流式状态
    streamingSessions.value[targetSessionId] = false

    // 【Phase 1】通知流式状态机中断
    streamStore.interruptStream(targetSessionId)
  }

  function clearMessages() {
    if (!currentSessionId.value) return
    messageGroups.value[currentSessionId.value] = []
    storage.saveMessageGroups(currentSessionId.value, [])
    syncCurrentMessages()
  }

  async function updateSessionConfig(id: string, config: Partial<SessionConfig>) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.config = { ...session.config, ...config }
      session.updatedAt = Date.now()
      await storage.saveSession(session)
    }
  }

  // ==================== 返回值 ====================
  return {
    // 状态
    sessions,
    currentSessionId,
    currentSession,
    isStreaming,
    defaultConfig: DEFAULT_CONFIG,

    // 消息(兼容旧接口)
    messages: currentMessages,
    messageGroups: currentMessageGroups,

    // 会话管理
    createSession,
    switchSession,
    renameSession,
    deleteSession,

    // 消息发送
    sendMessage,
    interruptGeneration,
    clearMessages,

    // 重新生成(新版本)
    regenerateResponse,

    // 版本管理
    switchVersion,
    getVersions,
    getCurrentVersionIndex,
    deleteVersion,

    // 配置
    updateSessionConfig,

    // 消息队列
    pendingMessages,

    // Token 用量追踪
    tokenUsage: computed(() => getCurrentTokenUsage(currentSessionId.value)),
    getSessionTokenUsage: getCurrentTokenUsage,
    estimateSessionInputTokens,

    // 格式化辅助
    formatTokenCount,
    calculateUsagePercent,
    getUsageStatus
  }
}
