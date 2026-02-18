/**
 * Memory API - BFF 层记忆管理接口
 * 提供实体、任务、会话的 CRUD API
 */
import type { KnowledgeEntity, TaskHistory, SessionMemory } from '../core/types'

const API_BASE = '/api/memory'

// ============================================
// 实体 API
// ============================================

export async function getAllEntities(): Promise<KnowledgeEntity[]> {
  const response = await fetch(`${API_BASE}/entities`)
  if (!response.ok) throw new Error('Failed to fetch entities')
  return response.json()
}

export async function getEntity(id: string): Promise<KnowledgeEntity | null> {
  const response = await fetch(`${API_BASE}/entities/${id}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Failed to fetch entity')
  return response.json()
}

export async function saveEntity(entity: KnowledgeEntity): Promise<void> {
  const response = await fetch(`${API_BASE}/entities/${entity.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entity)
  })
  if (!response.ok) throw new Error('Failed to save entity')
}

export async function deleteEntity(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/entities/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete entity')
}

export async function searchEntities(query: string): Promise<KnowledgeEntity[]> {
  const response = await fetch(`${API_BASE}/entities/search?q=${encodeURIComponent(query)}`)
  if (!response.ok) throw new Error('Failed to search entities')
  return response.json()
}

// ============================================
// 任务历史 API
// ============================================

export async function getAllTasks(): Promise<TaskHistory[]> {
  const response = await fetch(`${API_BASE}/tasks`)
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

export async function getTask(id: string): Promise<TaskHistory | null> {
  const response = await fetch(`${API_BASE}/tasks/${id}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Failed to fetch task')
  return response.json()
}

export async function saveTask(task: TaskHistory): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${task.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  })
  if (!response.ok) throw new Error('Failed to save task')
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete task')
}

// ============================================
// 会话 API
// ============================================

export async function getAllSessions(): Promise<SessionMemory[]> {
  const response = await fetch(`${API_BASE}/context`)
  if (!response.ok) throw new Error('Failed to fetch sessions')
  return response.json()
}

export async function getSession(id: string): Promise<SessionMemory | null> {
  const response = await fetch(`${API_BASE}/context/${id}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Failed to fetch session')
  return response.json()
}

export async function saveSession(session: SessionMemory): Promise<void> {
  const response = await fetch(`${API_BASE}/context/${session.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  })
  if (!response.ok) throw new Error('Failed to save session')
}

export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/context/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete session')
}

// ============================================
// 别名方法（兼容各模块调用）
// ============================================

export const listEntities = getAllEntities
export const listTasks = getAllTasks
export const listSessions = getAllSessions

// ============================================
// 技能执行记录 API
// ============================================

export interface SkillExecutionRecord {
  id: string
  skillName: string
  input: Record<string, any>
  output: any
  success: boolean
  executionTime: number
  tokensUsed: number
  cost: number
  executedAt: number
}

export async function saveSkillExecution(record: SkillExecutionRecord): Promise<void> {
  const response = await fetch(`${API_BASE}/skills/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  })
  if (!response.ok) throw new Error('Failed to save skill execution')
}

export async function getSkillExecutions(skillName?: string): Promise<SkillExecutionRecord[]> {
  const url = skillName 
    ? `${API_BASE}/skills/executions?skill=${encodeURIComponent(skillName)}`
    : `${API_BASE}/skills/executions`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch skill executions')
  return response.json()
}

// ============================================
// 批量操作
// ============================================

export async function exportAll(): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`)
  if (!response.ok) throw new Error('Failed to export')
  return response.blob()
}

export async function importAll(data: string): Promise<void> {
  const response = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data
  })
  if (!response.ok) throw new Error('Failed to import')
}
