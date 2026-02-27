/**
 * Storage Service - 后端API数据源（支持消息版本 v2）
 * 
 * 数据格式：v2 - 消息组版本化管理
 * 数据源：后端API（唯一数据源）
 */

import type { ChatSession, ChatMessage, MessageGroup } from '../types'
import * as chatStorage from './chatStorage'

// 重新导出 API 函数
export {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  getMessageGroups,
  saveMessageGroup,
  updateMessageGroup,
  deleteMessageGroup,
  saveAllMessageGroups,
  clearCache,
  initializeStorage,
} from './chatStorage'

// ==================== 工具函数 ====================

/**
 * 将消息列表转换为消息组
 */
export function convertMessagesToGroups(messages: ChatMessage[]): MessageGroup[] {
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

// ==================== 兼容层（保留 storage 对象接口）====================

export const storage = {
  /** 
   * 保存完整数据 - 不再使用，保留兼容
   * @deprecated 使用各个 save 方法替代
   */
  save(data: { sessions: ChatSession[]; messageGroups: Record<string, MessageGroup[]> }): boolean {
    // 异步保存所有数据
    Promise.all([
      // 会话单独保存
      ...data.sessions.map(s => chatStorage.updateSession(s.id, s)),
      // 消息组批量保存
      ...Object.entries(data.messageGroups).map(([sessionId, groups]) => 
        chatStorage.saveAllMessageGroups(sessionId, groups)
      )
    ]).catch(e => console.error('[Storage] Batch save failed:', e))
    
    return true
  },

  /** 
   * 加载数据 - 从后端加载
   */
  async load(): Promise<{ sessions: ChatSession[]; messageGroups: Record<string, MessageGroup[]>; lastSessionId: string | null; version: 2 }> {
    const sessions = await chatStorage.getSessions()
    const messageGroups: Record<string, MessageGroup[]> = {}
    
    // 加载所有会话的消息组
    for (const session of sessions) {
      const groups = await chatStorage.getMessageGroups(session.id)
      if (groups.length > 0) {
        messageGroups[session.id] = groups
      }
    }
    
    return { 
      sessions, 
      messageGroups, 
      lastSessionId: sessions[0]?.id || null, 
      version: 2 
    }
  },

  /** 保存会话 */
  async saveSession(session: ChatSession): Promise<boolean> {
    const existing = await chatStorage.getSession(session.id)
    if (existing) {
      await chatStorage.updateSession(session.id, session)
    }
    return true
  },

  /** 删除会话 */
  async deleteSession(sessionId: string): Promise<boolean> {
    return chatStorage.deleteSession(sessionId)
  },

  /** 保存消息组 */
  async saveMessageGroups(sessionId: string, groups: MessageGroup[]): Promise<boolean> {
    return chatStorage.saveAllMessageGroups(sessionId, groups)
  },

  /** 加载消息组 */
  async loadMessageGroups(sessionId: string): Promise<MessageGroup[]> {
    return chatStorage.getMessageGroups(sessionId)
  },

  /** 保存最后活跃的会话 - 不再使用 localStorage */
  saveLastSession(sessionId: string | null): boolean {
    // 后端自动管理，无需手动保存
    return true
  },

  /** 添加 AI 响应版本 */
  async addAiVersion(sessionId: string, userMessageId: string, aiMessage: ChatMessage): Promise<boolean> {
    const groups = await chatStorage.getMessageGroups(sessionId)
    
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
    
    return chatStorage.saveAllMessageGroups(sessionId, groups)
  },

  /** 切换当前显示的版本 */
  async switchVersion(sessionId: string, userMessageId: string, versionIndex: number): Promise<boolean> {
    const groups = await chatStorage.getMessageGroups(sessionId)
    
    const group = groups.find(g => g.userMessage.id === userMessageId)
    if (group && versionIndex >= 0 && versionIndex < group.aiVersions.length) {
      group.currentVersionIndex = versionIndex
      group.aiVersions.forEach((v, i) => {
        v.isActiveVersion = (i === versionIndex)
      })
      return chatStorage.saveAllMessageGroups(sessionId, groups)
    }
    
    return false
  },

  /** 删除特定版本 */
  async deleteVersion(sessionId: string, userMessageId: string, versionId: string): Promise<boolean> {
    const groups = await chatStorage.getMessageGroups(sessionId)
    
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
        
        return chatStorage.saveAllMessageGroups(sessionId, groups)
      }
    }
    
    return false
  },

  /** 获取消息统计 */
  async getStats(sessionId: string): Promise<{ totalVersions: number; currentIndex: number } | null> {
    const groups = await chatStorage.getMessageGroups(sessionId)
    
    let totalVersions = 0
    let currentIndex = 0
    
    for (const group of groups) {
      totalVersions += group.aiVersions.length
      currentIndex += group.currentVersionIndex + 1
    }
    
    return { totalVersions, currentIndex }
  }
}
