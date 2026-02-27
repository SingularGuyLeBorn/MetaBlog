/**
 * useAIChat - AI Chat 核心 Composable (支持消息版本 v2)
 * 
 * 关键特性：
 * 1. 一个用户消息对应多个 AI 响应版本
 * 2. 重新生成时保留历史版本
 * 3. 支持版本切换、删除
 */
import { ref, computed } from 'vue'
import type { ChatSession, ChatMessage, SessionConfig, MessageGroup, ToolCallRecord, ThinkingStep } from '../types'
import { storage, convertGroupsToMessages } from '../services/storage'
import { aiService } from '../services/aiService'
import { logger, addLog } from '../services/logger'
import { useAgentConfig } from './useAgentConfig'

const DEFAULT_CONFIG: SessionConfig = {
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 8192,
  systemPrompt: '',
  enableReasoning: false,
  streaming: true
}

// ==================== 状态 ====================
const sessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)
// 按会话存储消息组（支持版本）
const messageGroups = ref<Record<string, MessageGroup[]>>({})
const isStreaming = ref(false)
const isInitialized = ref(false)
// 每个会话独立的 AbortController（切换会话不中断）
const sessionControllers = new Map<string, AbortController>()

export function useAIChat() {
  // 获取 Agent 配置（用于工具权限校验）
  const { activeAgent, skills, getEffectiveTools } = useAgentConfig()
  
  // ==================== 初始化 ====================
  async function initialize() {
    if (isInitialized.value) return
    
    const data = await storage.load()
    sessions.value = data.sessions
    messageGroups.value = data.messageGroups
    currentSessionId.value = data.lastSessionId
    
    if (sessions.value.length === 0) {
      createSession('新对话')
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
   * 当前会话的消息列表（将消息组转换为消息数组用于显示）
   * 只返回当前激活版本的消息
   */
  const currentMessages = computed(() => {
    if (!currentSessionId.value) return []
    const groups = messageGroups.value[currentSessionId.value] || []
    return convertGroupsToMessages(groups)
  })

  /**
   * 当前会话的消息组（用于版本管理）
   */
  const currentMessageGroups = computed(() => {
    if (!currentSessionId.value) return []
    return messageGroups.value[currentSessionId.value] || []
  })

  // ==================== 会话管理 ====================
  function createSession(title: string = '新对话') {
    const now = Date.now()
    const session: ChatSession = {
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      config: { ...DEFAULT_CONFIG },
      stats: { messageCount: 0, totalTokens: 0 },
      createdAt: now,
      updatedAt: now
    }
    
    sessions.value.unshift(session)
    currentSessionId.value = session.id
    messageGroups.value[session.id] = []
    
    storage.save({
      sessions: sessions.value,
      messageGroups: messageGroups.value
    })
    
    return session
  }

  function switchSession(id: string) {
    currentSessionId.value = id
    storage.saveLastSession(id)
  }

  function renameSession(id: string, newTitle: string) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = newTitle
      session.updatedAt = Date.now()
      storage.saveSession(session)
    }
  }

  function deleteSession(id: string) {
    const index = sessions.value.findIndex(s => s.id === id)
    if (index === -1) return
    
    sessions.value.splice(index, 1)
    delete messageGroups.value[id]
    
    if (currentSessionId.value === id) {
      currentSessionId.value = sessions.value[0]?.id || null
    }
    
    storage.deleteSession(id)
    
    if (sessions.value.length === 0) {
      createSession('新对话')
    }
  }

  function autoRenameSession(sessionId: string, firstMessage: string) {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.title !== '新对话') return
    
    let title = firstMessage.trim().slice(0, 20)
    if (firstMessage.length > 20) title += '...'
    if (!title) title = '新对话'
    
    session.title = title
    session.updatedAt = Date.now()
    storage.saveSession(session)
  }

  // ==================== 消息发送 ====================
  async function sendMessage(content: string, skillInfo?: { id: string; name: string; icon: string; content: string }): Promise<boolean> {
    if (!currentSession.value || !content.trim()) return false
    
    const sessionId = currentSessionId.value!
    const config = currentSession.value.config
    const groups = messageGroups.value[sessionId] || []
    
    // 自动重命名（第一条消息）
    if (groups.length === 0) {
      autoRenameSession(sessionId, content.trim())
    }
    
    // 创建用户消息（@引用已经直接包含在 content 中）
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      role: 'user',
      content: content.trim(),
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: skillInfo ? { skill: skillInfo } : undefined
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
    
    // 创建消息组
    const newGroup: MessageGroup = {
      userMessage: userMsg,
      aiVersions: [aiMsg],
      currentVersionIndex: 0
    }
    
    groups.push(newGroup)
    messageGroups.value[sessionId] = groups
    
    // 只为当前会话设置 isStreaming
    if (sessionId === currentSessionId.value) {
      isStreaming.value = true
    }
    
    // 创建或获取当前会话的 AbortController
    let controller = sessionControllers.get(sessionId)
    if (controller) {
      // 如果已有 controller，先中断之前的请求
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
      data: { content: content.slice(0, 100), skill: skillInfo?.name }
    })
    
    try {
      // 构建历史记录（使用当前激活版本的消息）
      const history = buildHistoryFromGroups(groups)
      
      // 用于存储工具调用记录
      let toolRecords: ToolCallRecord[] = []
      
      // 构建工具上下文（用于权限校验）
      const agent = activeAgent.value
      const toolContext = agent ? {
        agentId: agent.id,
        skillIds: agent.capabilities?.skillIds || [],
        declaredTools: skills.value
          .filter(s => agent.capabilities?.skillIds?.includes(s.id))
          .flatMap(s => s.tools || []),
        availableTools: getEffectiveTools(agent).map(t => t.name)
      } : undefined
      
      await aiService.chatStream(
        history,
        config,
        {
          onContent: (text) => {
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            targetMsg.content = text
            targetMsg.updatedAt = Date.now()
          },
          onReasoning: (text) => {
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            // 如果已经有 thinkingSteps，不再更新传统 reasoning（避免覆盖串行显示）
            if (!targetMsg.metadata?.thinkingSteps?.length) {
              targetMsg.reasoning = { content: text, isVisible: true }
            }
            targetMsg.updatedAt = Date.now()
          },
          onThinkingStep: (step: ThinkingStep) => {
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            if (!targetMsg.metadata) {
              targetMsg.metadata = {}
            }
            if (!targetMsg.metadata.thinkingSteps) {
              targetMsg.metadata.thinkingSteps = []
            }
            // 检查是否已存在相同ID的步骤，存在则更新，否则添加
            const existingIndex = targetMsg.metadata.thinkingSteps.findIndex(s => s.id === step.id)
            if (existingIndex >= 0) {
              targetMsg.metadata.thinkingSteps[existingIndex] = step
            } else {
              targetMsg.metadata.thinkingSteps.push(step)
            }
            targetMsg.updatedAt = Date.now()
          },
          onComplete: () => {
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            targetMsg.status = 'completed'
            targetMsg.updatedAt = Date.now()
            // 保留现有的 metadata（包括 thinkingSteps），只添加新字段
            targetMsg.metadata = { 
              ...targetMsg.metadata,  // 保留 thinkingSteps 等
              model: config.model,
              toolRecords  // 保存工具调用记录到消息
            }
            // 只有当前会话才更新全局 isStreaming
            if (sessionId === currentSessionId.value) {
              isStreaming.value = false
            }
            storage.saveMessageGroups(sessionId, groups)
            // 清理 controller
            sessionControllers.delete(sessionId)
            
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
                hasToolCalls: (toolRecords?.length || 0) > 0
              }
            })
          },
          onError: (err) => {
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            const hasToolCalls = toolRecords.length > 0
            const errorMessage = err.message || String(err)
            
            targetMsg.status = 'error'
            
            // 如果工具调用成功但后续失败，显示更详细的错误
            if (hasToolCalls) {
              targetMsg.content = `⚠️ 工具调用成功，但获取 AI 回复时出错\n\n错误：${errorMessage}\n\n可能原因：\n1. 网络连接中断\n2. API 服务暂时不可用\n3. 请求超时\n\n建议：检查网络连接后重试，工具操作可能已完成`
            } else {
              targetMsg.content = `错误：${errorMessage}`
            }
            
            targetMsg.updatedAt = Date.now()
            targetMsg.metadata = { 
              model: config.model,
              toolRecords,
              error: errorMessage
            }
            // 只有当前会话才更新全局 isStreaming
            if (sessionId === currentSessionId.value) {
              isStreaming.value = false
            }
            // 清理 controller
            sessionControllers.delete(sessionId)
            storage.saveMessageGroups(sessionId, groups)
            
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
      
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      // 只有当前会话才更新全局 isStreaming
      if (sessionId === currentSessionId.value) {
        isStreaming.value = false
      }
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

  // ==================== 重新生成（添加新版本）====================
  async function regenerateResponse(userMessageId?: string): Promise<boolean> {
    if (!currentSessionId.value || isStreaming.value) return false
    
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
      isActiveVersion: false // 暂时不激活，等完成后再激活
    }
    
    // 将之前的版本设为非激活
    targetGroup.aiVersions.forEach(v => v.isActiveVersion = false)
    targetGroup.aiVersions.push(newVersion)
    targetGroup.currentVersionIndex = targetGroup.aiVersions.length - 1
    newVersion.isActiveVersion = true
    
    isStreaming.value = true
    const versionIndex = targetGroup.aiVersions.length - 1
    
    try {
      // 构建历史记录（截断到目标用户消息）
      const history = buildHistoryForRegenerate(groups, targetGroupIndex)
      
      // 用于存储工具调用记录
      let toolRecords: ToolCallRecord[] = []
      
      // 构建工具上下文（用于权限校验）
      const agent = activeAgent.value
      const toolContext = agent ? {
        agentId: agent.id,
        skillIds: agent.capabilities?.skillIds || [],
        declaredTools: skills.value
          .filter(s => agent.capabilities?.skillIds?.includes(s.id))
          .flatMap(s => s.tools || []),
        availableTools: getEffectiveTools(agent).map(t => t.name)
      } : undefined
      
      await aiService.chatStream(
        history,
        config,
        {
          onContent: (text) => {
            targetGroup.aiVersions[versionIndex].content = text
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
          },
          onReasoning: (text) => {
            targetGroup.aiVersions[versionIndex].reasoning = { 
              content: text, 
              isVisible: true 
            }
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
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
              targetMsg.metadata.thinkingSteps[existingIndex] = step
            } else {
              targetMsg.metadata.thinkingSteps.push(step)
            }
            targetMsg.updatedAt = Date.now()
          },
          onToolRecord: (record) => {
            toolRecords.push(record)
          },
          onComplete: () => {
            targetGroup.aiVersions[versionIndex].status = 'completed'
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
            targetGroup.aiVersions[versionIndex].metadata = { 
              model: config.model,
              toolRecords  // 保存工具调用记录
            }
            isStreaming.value = false
            storage.saveMessageGroups(sessionId, groups)
          },
          onError: (err) => {
            targetGroup.aiVersions[versionIndex].status = 'error'
            targetGroup.aiVersions[versionIndex].content = `错误：${err.message}`
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
            isStreaming.value = false
            storage.saveMessageGroups(sessionId, groups)
          }
        },
        undefined,  // signal
        10,         // maxToolRounds
        undefined,  // sessionId
        toolContext
      )
      
      return true
    } catch (err) {
      isStreaming.value = false
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
    }
    
    return result
  }

  // ==================== 辅助函数 ====================
  
  /**
   * 从消息组构建历史记录（用于发送消息）
   * 确保包含 tool_calls 和 tool_call_id 等字段，符合 DeepSeek API 要求
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
    
    // 只有当前会话才更新全局 isStreaming
    if (targetSessionId === currentSessionId.value) {
      isStreaming.value = false
    }
  }

  function clearMessages() {
    if (!currentSessionId.value) return
    messageGroups.value[currentSessionId.value] = []
    storage.saveMessageGroups(currentSessionId.value, [])
  }

  function updateSessionConfig(id: string, config: Partial<SessionConfig>) {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.config = { ...session.config, ...config }
      session.updatedAt = Date.now()
      storage.saveSession(session)
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
    
    // 消息（兼容旧接口）
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
    
    // 重新生成（新版本）
    regenerateResponse,
    
    // 版本管理
    switchVersion,
    getVersions,
    getCurrentVersionIndex,
    deleteVersion,
    
    // 配置
    updateSessionConfig
  }
}
