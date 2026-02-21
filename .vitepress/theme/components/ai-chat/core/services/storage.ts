/**
 * Storage Service - 本地存储（支持消息版本 v2）
 * 
 * 数据格式升级：v1 → v2
 * v1: Record<sessionId, ChatMessage[]> 一对一关系
 * v2: Record<sessionId, MessageGroup[]> 一对多关系
 */
import type { ChatSession, ChatMessage, MessageGroup } from '../types'

const STORAGE_KEY = 'ai-chat:v2'
const LEGACY_KEY = 'ai-chat:v1'

interface StorageDataV2 {
  sessions: ChatSession[]
  /** 按会话存储的消息组（版本化管理） */
  messageGroups: Record<string, MessageGroup[]>
  lastSessionId: string | null
  version: 2
}

/** 旧版数据结构 */
interface StorageDataV1 {
  sessions: ChatSession[]
  messages: Record<string, ChatMessage[]>
  lastSessionId: string | null
  version: 1
}

function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * 将 v1 消息数组转换为 v2 消息组
 */
function migrateV1ToV2(v1Data: StorageDataV1): StorageDataV2 {
  const messageGroups: Record<string, MessageGroup[]> = {}
  
  for (const [sessionId, messages] of Object.entries(v1Data.messages)) {
    messageGroups[sessionId] = convertMessagesToGroups(messages)
  }
  
  return {
    sessions: v1Data.sessions,
    messageGroups,
    lastSessionId: v1Data.lastSessionId,
    version: 2
  }
}

/**
 * 将消息列表转换为消息组
 */
function convertMessagesToGroups(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = []
  let currentUserMsg: ChatMessage | null = null
  let currentAiVersions: ChatMessage[] = []
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      // 保存之前的组
      if (currentUserMsg && currentAiVersions.length > 0) {
        groups.push({
          userMessage: currentUserMsg,
          aiVersions: currentAiVersions,
          currentVersionIndex: currentAiVersions.findIndex(v => v.isActiveVersion) || 0
        })
      }
      currentUserMsg = msg
      currentAiVersions = []
    } else if (msg.role === 'assistant' && currentUserMsg) {
      // 标记第一个版本为激活状态
      if (currentAiVersions.length === 0) {
        msg.isActiveVersion = true
      }
      msg.parentMessageId = currentUserMsg.id
      currentAiVersions.push(msg)
    }
  }
  
  // 保存最后一组
  if (currentUserMsg && currentAiVersions.length > 0) {
    groups.push({
      userMessage: currentUserMsg,
      aiVersions: currentAiVersions,
      currentVersionIndex: currentAiVersions.findIndex(v => v.isActiveVersion) || 0
    })
  }
  
  return groups
}

/**
 * 将消息组转换为消息列表（用于显示）
 * 只返回当前激活的版本
 */
export function convertGroupsToMessages(groups: MessageGroup[]): ChatMessage[] {
  const messages: ChatMessage[] = []
  
  for (const group of groups) {
    messages.push(group.userMessage)
    // 只添加当前激活的版本
    const activeVersion = group.aiVersions[group.currentVersionIndex]
    if (activeVersion) {
      messages.push({ ...activeVersion, isActiveVersion: true })
    }
  }
  
  return messages
}

export const storage = {
  /** 保存完整数据 */
  save(data: StorageDataV2): boolean {
    if (!isClient()) return false
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      return true
    } catch {
      return false
    }
  },

  /** 加载数据（自动迁移旧版本） */
  load(): StorageDataV2 {
    if (!isClient()) {
      return { sessions: [], messageGroups: {}, lastSessionId: null, version: 2 }
    }
    
    try {
      // 尝试加载 v2
      const v2Data = localStorage.getItem(STORAGE_KEY)
      if (v2Data) {
        return JSON.parse(v2Data)
      }
      
      // 尝试迁移 v1
      const v1Data = localStorage.getItem(LEGACY_KEY)
      if (v1Data) {
        const parsed = JSON.parse(v1Data) as StorageDataV1
        const migrated = migrateV1ToV2(parsed)
        // 保存迁移后的数据
        this.save(migrated)
        return migrated
      }
    } catch (e) {
      console.error('[Storage] Failed to load data:', e)
    }
    
    return { sessions: [], messageGroups: {}, lastSessionId: null, version: 2 }
  },

  /** 保存会话 */
  saveSession(session: ChatSession): boolean {
    const data = this.load()
    const index = data.sessions.findIndex(s => s.id === session.id)
    if (index >= 0) {
      data.sessions[index] = session
    } else {
      data.sessions.unshift(session)
    }
    return this.save(data)
  },

  /** 删除会话 */
  deleteSession(sessionId: string): boolean {
    const data = this.load()
    data.sessions = data.sessions.filter(s => s.id !== sessionId)
    delete data.messageGroups[sessionId]
    if (data.lastSessionId === sessionId) {
      data.lastSessionId = data.sessions[0]?.id || null
    }
    return this.save(data)
  },

  /** 保存消息组 */
  saveMessageGroups(sessionId: string, groups: MessageGroup[]): boolean {
    const data = this.load()
    data.messageGroups[sessionId] = groups
    return this.save(data)
  },

  /** 加载消息组 */
  loadMessageGroups(sessionId: string): MessageGroup[] {
    const data = this.load()
    return data.messageGroups[sessionId] || []
  },

  /** 保存最后活跃的会话 */
  saveLastSession(sessionId: string | null): boolean {
    const data = this.load()
    data.lastSessionId = sessionId
    return this.save(data)
  },

  /** 添加 AI 响应版本 */
  addAiVersion(sessionId: string, userMessageId: string, aiMessage: ChatMessage): boolean {
    const data = this.load()
    const groups = data.messageGroups[sessionId] || []
    
    // 找到对应的用户消息组
    const group = groups.find(g => g.userMessage.id === userMessageId)
    if (group) {
      // 将之前的版本标记为非激活
      group.aiVersions.forEach(v => v.isActiveVersion = false)
      // 添加新版本并标记为激活
      aiMessage.isActiveVersion = true
      aiMessage.parentMessageId = userMessageId
      group.aiVersions.push(aiMessage)
      group.currentVersionIndex = group.aiVersions.length - 1
    } else {
      // 如果没有找到组，创建新组（异常情况）
      groups.push({
        userMessage: { id: userMessageId } as ChatMessage,
        aiVersions: [{ ...aiMessage, isActiveVersion: true, parentMessageId: userMessageId }],
        currentVersionIndex: 0
      })
    }
    
    data.messageGroups[sessionId] = groups
    return this.save(data)
  },

  /** 切换当前显示的版本 */
  switchVersion(sessionId: string, userMessageId: string, versionIndex: number): boolean {
    const data = this.load()
    const groups = data.messageGroups[sessionId] || []
    
    const group = groups.find(g => g.userMessage.id === userMessageId)
    if (group && versionIndex >= 0 && versionIndex < group.aiVersions.length) {
      group.currentVersionIndex = versionIndex
      group.aiVersions.forEach((v, i) => {
        v.isActiveVersion = (i === versionIndex)
      })
      return this.save(data)
    }
    
    return false
  },

  /** 删除特定版本 */
  deleteVersion(sessionId: string, userMessageId: string, versionId: string): boolean {
    const data = this.load()
    const groups = data.messageGroups[sessionId] || []
    
    const group = groups.find(g => g.userMessage.id === userMessageId)
    if (group) {
      const versionIndex = group.aiVersions.findIndex(v => v.id === versionId)
      if (versionIndex >= 0) {
        group.aiVersions.splice(versionIndex, 1)
        
        // 调整当前索引
        if (group.aiVersions.length === 0) {
          // 如果没有版本了，删除整个组
          const groupIndex = groups.findIndex(g => g.userMessage.id === userMessageId)
          groups.splice(groupIndex, 1)
        } else {
          if (group.currentVersionIndex >= group.aiVersions.length) {
            group.currentVersionIndex = group.aiVersions.length - 1
          }
          group.aiVersions[group.currentVersionIndex].isActiveVersion = true
        }
        
        return this.save(data)
      }
    }
    
    return false
  },

  /** 获取消息统计 */
  getStats(sessionId: string): { totalVersions: number; currentIndex: number } | null {
    const data = this.load()
    const groups = data.messageGroups[sessionId] || []
    
    let totalVersions = 0
    let currentIndex = 0
    
    for (const group of groups) {
      totalVersions += group.aiVersions.length
      currentIndex += group.currentVersionIndex + 1
    }
    
    return { totalVersions, currentIndex }
  }
}
