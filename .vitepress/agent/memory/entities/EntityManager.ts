/**
 * EntityManager.ts - 知识实体管理
 * 负责实体的 CRUD、搜索、关联管理
 */
import type { KnowledgeEntity, EntityType, RAGResult } from '../../core/types'
import { 
  getAllEntities, 
  getEntity as getEntityApi, 
  saveEntity as saveEntityApi 
} from '../../api/memory'

// 内存缓存
const entityCache = new Map<string, KnowledgeEntity>()

/**
 * 实体管理器
 */
export class EntityManager {
  /**
   * 从服务器加载所有实体到缓存
   */
  async loadFromServer(): Promise<void> {
    try {
      const entities = await getAllEntities()
      for (const e of entities) {
        entityCache.set(e.id, e)
      }
      console.log(`[EntityManager] Loaded ${entities.length} entities`)
    } catch (e) {
      console.warn('[EntityManager] Failed to load from server:', e)
    }
  }

  /**
   * 获取单个实体
   */
  async get(id: string): Promise<KnowledgeEntity | null> {
    // 优先从缓存获取
    const cached = entityCache.get(id)
    if (cached) return cached
    
    // 从服务器获取
    try {
      const entity = await getEntityApi(id)
      if (entity) {
        entityCache.set(id, entity)
        return entity
      }
    } catch (e) {
      console.error('[EntityManager] Failed to get entity:', e)
    }
    
    return null
  }

  /**
   * 保存实体
   */
  async save(entity: KnowledgeEntity): Promise<void> {
    entity.updatedAt = Date.now()
    entityCache.set(entity.id, entity)
    await saveEntityApi(entity)
  }

  /**
   * 按类型查找实体
   */
  async findByType(type: EntityType): Promise<KnowledgeEntity[]> {
    return Array.from(entityCache.values()).filter(e => e.type === type)
  }

  /**
   * 按名称查找实体（支持别名）
   */
  async findByName(name: string): Promise<KnowledgeEntity[]> {
    const lowerName = name.toLowerCase()
    return Array.from(entityCache.values())
      .filter(e => 
        e.name.toLowerCase().includes(lowerName) ||
        e.aliases?.some(alias => alias.toLowerCase().includes(lowerName))
      )
  }

  /**
   * 查找相关实体
   * @todo 将在知识图谱功能中启用
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
   * 从内容中提取实体（WikiLinks）
   */
  async extractFromContent(content: string, source: string): Promise<KnowledgeEntity[]> {
    const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
    const entities: KnowledgeEntity[] = []
    
    let match
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const name = match[1].trim()
      const existing = await this.findByName(name)
      
      if (existing.length === 0) {
        // 创建新实体
        const entity: KnowledgeEntity = {
          id: `entity_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          name,
          type: this.inferType(name, content),
          description: '',
          aliases: [],
          related: [],
          sources: [source],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        await this.save(entity)
        entities.push(entity)
      } else {
        // 更新现有实体
        const entity = existing[0]
        if (!entity.sources.includes(source)) {
          entity.sources.push(source)
          entity.updatedAt = Date.now()
          await this.save(entity)
        }
        entities.push(entity)
      }
    }

    return entities
  }

  /**
   * 关键词搜索
   */
  async search(query: string): Promise<RAGResult[]> {
    const keywords = query.toLowerCase().split(/\s+/)
    const results: RAGResult[] = []

    for (const entity of entityCache.values()) {
      const score = this.calculateScore(keywords, entity.name + ' ' + entity.description)
      if (score > 0) {
        results.push({
          content: `${entity.name}: ${entity.description || ''}`,
          source: entity.sources[0] || 'memory',
          score,
          metadata: { 
            title: entity.name,
            path: entity.sources?.[0] || ''
          }
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * 获取所有实体
   */
  getAll(): KnowledgeEntity[] {
    return Array.from(entityCache.values())
  }

  // ============ 私有方法 ============

  private calculateScore(keywords: string[], text: string): number {
    const lowerText = text.toLowerCase()
    let matches = 0
    for (const kw of keywords) {
      if (lowerText.includes(kw)) matches++
    }
    return matches / keywords.length
  }

  private inferType(_name: string, context: string): EntityType {
    const lower = context.toLowerCase()
    if (lower.includes('技术') || lower.includes('框架') || lower.includes('工具')) return 'technology'
    if (lower.includes('概念') || lower.includes('理论')) return 'concept'
    if (lower.includes('人物') || lower.includes('作者')) return 'person'
    if (lower.includes('代码') || lower.includes('程序')) return 'code'
    return 'paper'
  }
}

// 导出单例
let instance: EntityManager | null = null
export function getEntityManager(): EntityManager {
  if (!instance) {
    instance = new EntityManager()
  }
  return instance
}

// 类型导出
export type { KnowledgeEntity, EntityType } from '../../core/types'
