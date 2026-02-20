/**
 * EntityManager.ts - 知识实体管理
 * 
 * 负责实体�?CRUD、搜索、关联管�?
 * **已文件化**: 实体数据持久化到文件系统
 */
import type { KnowledgeEntity, EntityType, RAGResult } from '../../core/types'
import { createStorage } from '../FileStorage'

// 存储结构
interface EntityStorage {
  entities: Record<string, KnowledgeEntity>
  version: number
  lastUpdated: string
}

// 创建文件存储实例
const storage = createStorage<EntityStorage>({
  name: 'entities',
  defaultData: {
    entities: {},
    version: 1,
    lastUpdated: new Date().toISOString()
  }
})

/**
 * 实体管理�?
 */
export class EntityManager {
  private cacheLoaded: boolean = false

  /**
   * 初始化：从文件加载数�?
   */
  async initialize(): Promise<void> {
    if (this.cacheLoaded) return
    
    await storage.load()
    this.cacheLoaded = true
    
    const data = storage.getData()
    console.log(`[EntityManager] 初始化完成，加载 ${Object.keys(data.entities).length} 个实体`)
  }

  /**
   * 从服务器加载（兼容旧接口，实际从文件加载�?
   */
  async loadFromServer(): Promise<void> {
    return this.initialize()
  }

  /**
   * 保存到文件（内部方法�?
   */
  private async persist(): Promise<void> {
    storage.updateData(data => {
      data.lastUpdated = new Date().toISOString()
    })
    await storage.save()
  }

  /**
   * 获取单个实体
   */
  async get(id: string): Promise<KnowledgeEntity | null> {
    await this.initialize()
    const data = storage.getData()
    return data.entities[id] || null
  }

  /**
   * 保存实体
   */
  async save(entity: KnowledgeEntity): Promise<void> {
    await this.initialize()
    
    entity.updatedAt = Date.now()
    storage.updateData(data => {
      data.entities[entity.id] = entity
    })
    
    await this.persist()
    console.log(`[EntityManager] 保存实体: ${entity.name} (${entity.id})`)
  }

  /**
   * 按类型查找实�?
   */
  async findByType(type: EntityType): Promise<KnowledgeEntity[]> {
    await this.initialize()
    const data = storage.getData()
    return Object.values(data.entities).filter(e => e.type === type)
  }

  /**
   * 按名称查找实体（支持别名�?
   */
  async findByName(name: string): Promise<KnowledgeEntity[]> {
    await this.initialize()
    const data = storage.getData()
    const lowerName = name.toLowerCase()
    
    return Object.values(data.entities).filter(e => 
      e.name.toLowerCase().includes(lowerName) ||
      e.aliases?.some(alias => alias.toLowerCase().includes(lowerName))
    )
  }

  /**
   * 查找相关实体
   */
  async findRelated(entityId: string): Promise<KnowledgeEntity[]> {
    const entity = await this.get(entityId)
    if (!entity) return []

    const related: KnowledgeEntity[] = []
    for (const relatedId of entity.related || []) {
      const e = await this.get(relatedId)
      if (e) related.push(e)
    }
    return related
  }

  /**
   * 搜索实体（用�?RAG�?
   */
  async search(query: string): Promise<RAGResult[]> {
    await this.initialize()
    const data = storage.getData()
    const lowerQuery = query.toLowerCase()
    
    const results: RAGResult[] = []
    
    for (const entity of Object.values(data.entities)) {
      const score = this.calculateSearchScore(entity, lowerQuery)
      if (score > 0) {
        results.push({
          content: `${entity.name}: ${entity.description}`,
          source: entity.sources[0] || 'unknown',
          score,
          metadata: {
            title: entity.name,
            type: entity.type
          }
        })
      }
    }
    
    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * 计算搜索匹配分数
   */
  private calculateSearchScore(entity: KnowledgeEntity, query: string): number {
    let score = 0
    
    // 名称匹配
    if (entity.name.toLowerCase().includes(query)) {
      score += 0.5
    }
    
    // 描述匹配
    if (entity.description?.toLowerCase().includes(query)) {
      score += 0.3
    }
    
    // 别名匹配
    if (entity.aliases?.some(a => a.toLowerCase().includes(query))) {
      score += 0.4
    }
    
    // 来源匹配
    if (entity.sources?.some(s => s.toLowerCase().includes(query))) {
      score += 0.2
    }
    
    return Math.min(score, 1)
  }

  /**
   * 从内容中提取实体
   */
  async extractFromContent(content: string, source: string): Promise<KnowledgeEntity[]> {
    // 简单的实体提取：识别标题、专有名词等
    const entities: KnowledgeEntity[] = []
    
    // 提取 [[WikiLinks]]
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g
    let match
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const name = match[1].split('|')[0].trim()
      const id = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const entity: KnowledgeEntity = {
        id,
        name,
        type: 'concept',
        description: `�?${source} 提取的实体`,
        aliases: [],
        related: [],
        sources: [source],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      // 检查是否已存在同名实体
      const existing = await this.findByName(name)
      if (existing.length === 0) {
        await this.save(entity)
        entities.push(entity)
      }
    }
    
    console.log(`[EntityManager] �?${source} 提取 ${entities.length} 个实体`)
    return entities
  }

  /**
   * 获取所有实�?
   */
  async getAll(): Promise<KnowledgeEntity[]> {
    await this.initialize()
    const data = storage.getData()
    return Object.values(data.entities)
  }

  /**
   * 删除实体
   */
  async delete(id: string): Promise<void> {
    await this.initialize()
    storage.updateData(data => {
      delete data.entities[id]
    })
    await this.persist()
    console.log(`[EntityManager] 删除实体: ${id}`)
  }

  /**
   * 清空所有实�?
   */
  async clear(): Promise<void> {
    await storage.clear()
    console.log('[EntityManager] 清空所有实�?)
  }
}

// 单例实例
let instance: EntityManager | null = null

export function getEntityManager(): EntityManager {
  if (!instance) {
    instance = new EntityManager()
  }
  return instance
}

export default EntityManager
