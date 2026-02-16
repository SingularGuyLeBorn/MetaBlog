/**
 * Memory Manager - 记忆管理器
 * 实现可查询、可关联的知识网络
 */
import type {
  MemoryManager as IMemoryManager,
  KnowledgeEntity,
  EntityType,
  TaskHistory,
  SessionMemory,
  RAGResult
} from '../core/types'

// 内存存储（开发阶段），后续可替换为 IndexedDB 或后端存储
const memoryStore = {
  entities: new Map<string, KnowledgeEntity>(),
  tasks: new Map<string, TaskHistory>(),
  sessions: new Map<string, SessionMemory>(),
  ragIndex: new Map<string, { content: string; embedding: number[]; metadata: any }>()
}

export class MemoryManagerImpl implements IMemoryManager {
  private initialized = false

  async initialize(): Promise<void> {
    // 加载持久化的记忆
    await this.loadFromStorage()
    this.initialized = true
    console.log('Memory Manager initialized')
  }

  // ============================================
  // 实体操作
  // ============================================

  async getEntity(id: string): Promise<KnowledgeEntity | null> {
    return memoryStore.entities.get(id) || null
  }

  async saveEntity(entity: KnowledgeEntity): Promise<void> {
    entity.updatedAt = Date.now()
    memoryStore.entities.set(entity.id, entity)
    await this.persistToStorage()
  }

  async findEntitiesByType(type: EntityType): Promise<KnowledgeEntity[]> {
    return Array.from(memoryStore.entities.values())
      .filter(e => e.type === type)
  }

  async findEntitiesByName(name: string): Promise<KnowledgeEntity[]> {
    const lowerName = name.toLowerCase()
    return Array.from(memoryStore.entities.values())
      .filter(e => 
        e.name.toLowerCase().includes(lowerName) ||
        e.aliases.some(alias => alias.toLowerCase().includes(lowerName))
      )
  }

  async findRelatedEntities(entityId: string): Promise<KnowledgeEntity[]> {
    const entity = await this.getEntity(entityId)
    if (!entity) return []

    const related: KnowledgeEntity[] = []
    for (const relatedId of entity.related) {
      const e = await this.getEntity(relatedId)
      if (e) related.push(e)
    }
    return related
  }

  async extractEntitiesFromContent(content: string, source: string): Promise<KnowledgeEntity[]> {
    // 提取 [[WikiLinks]] 作为实体
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
    const entities: KnowledgeEntity[] = []
    
    let match
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const name = match[1].trim()
      const existing = await this.findEntitiesByName(name)
      
      if (existing.length === 0) {
        // 创建新实体
        const entity: KnowledgeEntity = {
          id: `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          type: this.inferEntityType(name, content),
          description: '',
          aliases: [],
          related: [],
          sources: [source],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        await this.saveEntity(entity)
        entities.push(entity)
      } else {
        // 更新现有实体
        const entity = existing[0]
        if (!entity.sources.includes(source)) {
          entity.sources.push(source)
          await this.saveEntity(entity)
        }
        entities.push(entity)
      }
    }

    return entities
  }

  // ============================================
  // 任务历史
  // ============================================

  async getTaskHistory(taskId: string): Promise<TaskHistory | null> {
    return memoryStore.tasks.get(taskId) || null
  }

  async saveTaskHistory(history: TaskHistory): Promise<void> {
    memoryStore.tasks.set(history.id, history)
    await this.persistToStorage()
  }

  async listTaskHistories(limit: number = 50): Promise<TaskHistory[]> {
    return Array.from(memoryStore.tasks.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
  }

  async getAgentTaskHistories(): Promise<TaskHistory[]> {
    return Array.from(memoryStore.tasks.values())
      .filter(t => t.id.startsWith('agent_'))
      .sort((a, b) => b.startedAt - a.startedAt)
  }

  // ============================================
  // 会话记忆
  // ============================================

  async getSession(sessionId: string): Promise<SessionMemory | null> {
    return memoryStore.sessions.get(sessionId) || null
  }

  async saveSession(session: SessionMemory): Promise<void> {
    session.lastActive = Date.now()
    memoryStore.sessions.set(session.id, session)
    await this.persistToStorage()
  }

  async createSession(): Promise<SessionMemory> {
    const session: SessionMemory = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messages: [],
      context: {},
      createdAt: Date.now(),
      lastActive: Date.now()
    }
    await this.saveSession(session)
    return session
  }

  // ============================================
  // RAG 上下文构建
  // ============================================

  async buildContext(query: string, currentFile?: string): Promise<RAGResult[]> {
    // 1. 关键词匹配
    const keywordResults = await this.keywordSearch(query)
    
    // 2. 如果当前文件有 WikiLinks，获取相关内容
    const relatedResults = currentFile 
      ? await this.getRelatedContent(currentFile)
      : []

    // 3. 合并并去重
    const allResults = [...keywordResults, ...relatedResults]
    const seen = new Set<string>()
    const unique = allResults.filter(r => {
      const key = r.source + r.content.substring(0, 100)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // 4. 按相关性排序并返回
    return unique
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  async keywordSearch(query: string): Promise<RAGResult[]> {
    const keywords = query.toLowerCase().split(/\s+/)
    const results: RAGResult[] = []

    // 搜索实体
    for (const entity of memoryStore.entities.values()) {
      const score = this.calculateKeywordScore(keywords, entity.name + ' ' + entity.description)
      if (score > 0) {
        results.push({
          content: `${entity.name}: ${entity.description}`,
          source: entity.sources[0] || 'memory',
          score,
          metadata: { 
            type: 'entity',
            entityType: entity.type 
          }
        })
      }
    }

    // 搜索任务历史
    for (const task of memoryStore.tasks.values()) {
      const score = this.calculateKeywordScore(keywords, task.description)
      if (score > 0) {
        results.push({
          content: task.description,
          source: `task:${task.id}`,
          score: score * 0.8, // 任务历史的权重稍低
          metadata: { type: 'task_history' }
        })
      }
    }

    return results
  }

  async addToRAGIndex(content: string, source: string, metadata?: any): Promise<void> {
    const id = `${source}_${Date.now()}`
    // 简化版本：存储文本，实际应计算 embedding
    memoryStore.ragIndex.set(id, {
      content,
      embedding: [], // TODO: 计算向量
      metadata: { source, ...metadata }
    })
  }

  // ============================================
  // 持久化
  // ============================================

  private async loadFromStorage(): Promise<void> {
    if (typeof localStorage === 'undefined') return

    try {
      const stored = localStorage.getItem('metablog_memory')
      if (stored) {
        const data = JSON.parse(stored)
        
        // 恢复实体
        if (data.entities) {
          for (const [id, entity] of Object.entries(data.entities)) {
            memoryStore.entities.set(id, entity as KnowledgeEntity)
          }
        }

        // 恢复任务
        if (data.tasks) {
          for (const [id, task] of Object.entries(data.tasks)) {
            memoryStore.tasks.set(id, task as TaskHistory)
          }
        }

        // 恢复会话
        if (data.sessions) {
          for (const [id, session] of Object.entries(data.sessions)) {
            memoryStore.sessions.set(id, session as SessionMemory)
          }
        }
      }
    } catch (e) {
      console.error('Failed to load memory from storage:', e)
    }
  }

  private async persistToStorage(): Promise<void> {
    if (typeof localStorage === 'undefined') return

    try {
      const data = {
        entities: Object.fromEntries(memoryStore.entities),
        tasks: Object.fromEntries(memoryStore.tasks),
        sessions: Object.fromEntries(memoryStore.sessions)
      }
      localStorage.setItem('metablog_memory', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to persist memory:', e)
    }
  }

  // ============================================
  // 私有辅助方法
  // ============================================

  private inferEntityType(name: string, content: string): EntityType {
    // 基于名称和内容推断实体类型
    const nameLower = name.toLowerCase()
    
    // 代码相关
    if (/\.(py|js|ts|java|cpp|c|go|rs)$/.test(name) || 
        /class|function|def|const|let|var/.test(content.substring(0, 200))) {
      return 'code'
    }

    // 论文相关
    if (/arxiv|paper|\d{4}\.\d{4,5}/.test(nameLower)) {
      return 'paper'
    }

    // 技术概念
    const techTerms = ['transformer', 'llm', 'ai', 'ml', 'neural', 'algorithm', 'model']
    if (techTerms.some(t => nameLower.includes(t))) {
      return 'technology'
    }

    // 人名（简单启发式）
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(name)) {
      return 'person'
    }

    return 'concept'
  }

  private calculateKeywordScore(keywords: string[], text: string): number {
    const textLower = text.toLowerCase()
    let matches = 0
    for (const kw of keywords) {
      if (textLower.includes(kw)) matches++
    }
    return matches / keywords.length
  }

  private async getRelatedContent(filePath: string): Promise<RAGResult[]> {
    // 基于文件路径获取相关内容
    const results: RAGResult[] = []

    // 查找引用该文件的实体
    for (const entity of memoryStore.entities.values()) {
      if (entity.sources.includes(filePath)) {
        results.push({
          content: `${entity.name}: ${entity.description}`,
          source: entity.id,
          score: 0.9,
          metadata: { 
            type: 'entity',
            entityType: entity.type 
          }
        })
      }
    }

    return results
  }
}
