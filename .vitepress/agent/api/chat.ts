/**
 * Chat Sessions API - 对话会话持久化接口
 * P4-Session: 后端持久化存储
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  reasoning?: string
  attachedArticles?: { path: string; title: string }[]
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

const API_BASE = '/api/chat/sessions'

/**
 * 获取会话列表（摘要信息，不包含完整消息）
 */
export async function listSessions(): Promise<SessionSummary[]> {
  const response = await fetch(API_BASE)
  if (!response.ok) {
    throw new Error('Failed to load sessions')
  }
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to load sessions')
  }
  return data.data
}

/**
 * 获取单个会话详情（包含完整消息）
 */
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const response = await fetch(`${API_BASE}/detail?id=${encodeURIComponent(sessionId)}`)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error('Failed to load session')
  }
  const data = await response.json()
  if (!data.success || !data.data) {
    return null
  }
  // FIX: 安全处理可能缺失的字段
  const sessionData = data.data
  return {
    id: sessionData.id || '',
    title: sessionData.title || '未命名会话',
    messages: Array.isArray(sessionData.messages) 
      ? sessionData.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now()
        }))
      : [],
    createdAt: sessionData.createdAt ? new Date(sessionData.createdAt).getTime() : Date.now(),
    updatedAt: sessionData.updatedAt ? new Date(sessionData.updatedAt).getTime() : Date.now()
  }
}

/**
 * 保存会话（创建或更新）
 */
export async function saveSession(session: ChatSession): Promise<void> {
  // FIX: 确保 session.id 存在
  if (!session.id) {
    throw new Error('Session ID is required')
  }
  
  // FIX: 确保消息格式正确
  const safeMessages = (session.messages || []).map(m => {
    const timestamp = m.timestamp || Date.now()
    const timestampNum = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp)
    return {
      role: m.role || 'user',
      content: m.content || '',
      timestamp: new Date(timestampNum || Date.now()).toISOString(),
      reasoning: m.reasoning || undefined,
      attachedArticles: m.attachedArticles || undefined
    }
  })
  
  const requestBody = {
    id: session.id,
    title: session.title || '未命名会话',
    messages: safeMessages,
    createdAt: new Date(session.createdAt || Date.now()).toISOString(),
    updatedAt: new Date(session.updatedAt || Date.now()).toISOString()
  }
  
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to save session: ${response.status} ${errorText}`)
  }
  
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to save session')
  }
}

/**
 * 删除会话
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: sessionId })
  })
  if (!response.ok) {
    throw new Error('Failed to delete session')
  }
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete session')
  }
}

/**
 * 批量保存多个会话
 */
export async function saveAllSessions(sessions: ChatSession[]): Promise<void> {
  // 并发保存所有会话
  await Promise.all(sessions.map(s => saveSession(s)))
}
