/**
 * useAIChat - AI Chat 核心 Composable (支持消息版本 v2)
 * 
 * 关键特性：
 * 1. 一个用户消息对应多个 AI 响应版本
 * 2. 重新生成时保留历史版本
 * 3. 支持版本切换、删除
 */
import { ref, computed } from 'vue'
import type { ChatSession, ChatMessage, SessionConfig, MessageGroup } from './types'
import { storage, convertGroupsToMessages } from '../services/storage'
import { aiService } from '../services/aiService'

const DEFAULT_CONFIG: SessionConfig = {
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 4096,
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

export function useAIChat() {
  // ==================== 初始化 ====================
  if (!isInitialized.value) {
    const data = storage.load()
    sessions.value = data.sessions
    messageGroups.value = data.messageGroups
    currentSessionId.value = data.lastSessionId
    
    if (sessions.value.length === 0) {
      createSession('新对话')
    }
    isInitialized.value = true
  }

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
      messageGroups: messageGroups.value,
      lastSessionId: currentSessionId.value,
      version: 2
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
  async function sendMessage(content: string): Promise<boolean> {
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
      updatedAt: Date.now()
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
    
    isStreaming.value = true
    
    try {
      // 构建历史记录（使用当前激活版本的消息）
      const history = buildHistoryFromGroups(groups)
      
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
            targetMsg.reasoning = { content: text, isVisible: true }
            targetMsg.updatedAt = Date.now()
          },
          onComplete: () => {
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            targetMsg.status = 'completed'
            targetMsg.updatedAt = Date.now()
            targetMsg.metadata = { model: config.model }
            isStreaming.value = false
            storage.saveMessageGroups(sessionId, groups)
          },
          onError: (err) => {
            const targetMsg = groups[groups.length - 1].aiVersions[0]
            targetMsg.status = 'error'
            targetMsg.content = `错误：${err.message}`
            targetMsg.updatedAt = Date.now()
            isStreaming.value = false
            storage.saveMessageGroups(sessionId, groups)
          }
        }
      )
      
      return true
    } catch (err) {
      isStreaming.value = false
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
          onComplete: () => {
            targetGroup.aiVersions[versionIndex].status = 'completed'
            targetGroup.aiVersions[versionIndex].updatedAt = Date.now()
            targetGroup.aiVersions[versionIndex].metadata = { model: config.model }
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
        }
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
  function deleteVersion(userMessageId: string, versionId: string): boolean {
    if (!currentSessionId.value) return false
    
    const sessionId = currentSessionId.value
    const result = storage.deleteVersion(sessionId, userMessageId, versionId)
    
    if (result) {
      // 重新加载
      messageGroups.value[sessionId] = storage.loadMessageGroups(sessionId)
    }
    
    return result
  }

  // ==================== 辅助函数 ====================
  
  /**
   * 从消息组构建历史记录（用于发送消息）
   */
  function buildHistoryFromGroups(groups: MessageGroup[]): ChatMessage[] {
    const history: ChatMessage[] = []
    for (const group of groups) {
      history.push(group.userMessage)
      // 只使用当前激活的版本
      const activeVersion = group.aiVersions[group.currentVersionIndex]
      if (activeVersion) {
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

  function interruptGeneration() {
    isStreaming.value = false
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
