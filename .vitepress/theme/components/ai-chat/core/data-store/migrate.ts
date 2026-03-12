/**
 * 数据迁移脚本
 * 将旧格式的 .data/*.json 迁移到新结构
 */

import { configManager, agentStorage, sessionStorage, memoryStorage, mcpStorage, messageStorage } from './storage'
import type { StoredAgent, StoredSession, StoredMemory, StoredMessage } from './types'

interface OldAgent {
  id: string
  name: string
  avatar: string
  description: string
  level: string
  status: string
  capabilities: any
  memory: any
  permissions: any[]
  callCount: number
  isDefault: boolean
  createdAt: number
  updatedAt: number
  runtime?: any
}

interface OldSession {
  id: string
  title: string
  config: any
  stats: { messageCount: number; totalTokens: number }
  createdAt: number
  updatedAt: number
}

interface OldMemory {
  id: string
  content: string
  category: string
  createdAt: number
  updatedAt: number
  enabled: boolean
  importance: number
  source: string
}

export async function migrateData(): Promise<{ success: boolean; report: string[] }> {
  const report: string[] = []
  
  report.push('=== 数据迁移开始 ===')
  
  // 1. 迁移Agents
  try {
    const agentsMigrated = await migrateAgents()
    report.push(`✓ Agents: ${agentsMigrated} 个已迁移`)
  } catch (e) {
    report.push(`✗ Agents迁移失败: ${e}`)
  }
  
  // 2. 迁移Sessions
  try {
    const sessionsMigrated = await migrateSessions()
    report.push(`✓ Sessions: ${sessionsMigrated} 个已迁移`)
  } catch (e) {
    report.push(`✗ Sessions迁移失败: ${e}`)
  }
  
  // 3. 迁移Memories
  try {
    const memoriesMigrated = await migrateMemories()
    report.push(`✓ Memories: ${memoriesMigrated} 个已迁移`)
  } catch (e) {
    report.push(`✗ Memories迁移失败: ${e}`)
  }
  
  // 4. 迁移Messages
  try {
    const messagesMigrated = await migrateMessages()
    report.push(`✓ Messages: ${messagesMigrated} 条已迁移`)
  } catch (e) {
    report.push(`✗ Messages迁移失败: ${e}`)
  }
  
  // 5. 初始化配置
  try {
    await configManager.load()
    report.push('✓ 配置已初始化')
  } catch (e) {
    report.push(`✗ 配置初始化失败: ${e}`)
  }
  
  report.push('=== 数据迁移完成 ===')
  
  return { success: true, report }
}

async function migrateAgents(): Promise<number> {
  try {
    const res = await fetch('/api/files/read?path=.data/agents.json')
    if (!res.ok) return 0
    
    const oldAgents: OldAgent[] = JSON.parse(await res.text())
    let count = 0
    
    for (const old of oldAgents) {
      const agent: StoredAgent = {
        id: old.id,
        name: old.name,
        avatar: old.avatar,
        description: old.description,
        tier: mapTier(old.level),
        mode: 'passive',
        runtimeStatus: old.status === 'online' ? 'idle' : 'paused',
        capabilities: old.capabilities,
        memory: old.memory,
        stats: {
          totalTasks: old.callCount || 0,
          successfulTasks: 0,
          failedTasks: 0,
          totalExecutionTime: 0
        },
        createdAt: old.createdAt,
        updatedAt: old.updatedAt,
        createdBy: 'user'
      }
      
      await agentStorage.save(agent)
      count++
    }
    
    return count
  } catch {
    return 0
  }
}

async function migrateSessions(): Promise<number> {
  try {
    const res = await fetch('/api/files/read?path=.data/sessions.json')
    if (!res.ok) return 0
    
    const oldSessions: OldSession[] = JSON.parse(await res.text())
    let count = 0
    
    for (const old of oldSessions) {
      const session: StoredSession = {
        id: old.id,
        title: old.title,
        agentId: old.config?.agentId || '',
        agentName: old.config?.agentName || '',
        createdAt: old.createdAt,
        updatedAt: old.updatedAt,
        messageCount: old.stats?.messageCount || 0
      }
      
      await sessionStorage.save(session)
      count++
    }
    
    return count
  } catch {
    return 0
  }
}

async function migrateMemories(): Promise<number> {
  try {
    const res = await fetch('/api/files/read?path=.data/memories.json')
    if (!res.ok) return 0
    
    const oldMemories: OldMemory[] = JSON.parse(await res.text())
    let count = 0
    
    for (const old of oldMemories) {
      const memory: StoredMemory = {
        id: old.id,
        content: old.content,
        category: old.category,
        importance: old.importance,
        createdAt: old.createdAt,
        updatedAt: old.updatedAt,
        enabled: old.enabled
      }
      
      await memoryStorage.save(memory)
      count++
    }
    
    return count
  } catch {
    return 0
  }
}

async function migrateMessages(): Promise<number> {
  try {
    const res = await fetch('/api/files/read?path=.data/session-messages.json')
    if (!res.ok) return 0
    
    // 旧格式可能是 { sessionId: Message[] }
    const oldData = JSON.parse(await res.text())
    let count = 0
    
    for (const [sessionId, messages] of Object.entries(oldData)) {
      const msgs = messages as any[]
      for (const old of msgs) {
        const msg: StoredMessage = {
          id: old.id || generateUUID(),
          sessionId,
          role: old.role,
          content: old.content,
          timestamp: old.timestamp,
          tokens: old.tokens
        }
        await messageStorage.save(msg)
        count++
      }
    }
    
    return count
  } catch {
    return 0
  }
}

function mapTier(level: string): 'system' | 'manager' | 'worker' {
  if (level === 'meta' || level === 'core') return 'system'
  if (level === 'manager') return 'manager'
  return 'worker'
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
