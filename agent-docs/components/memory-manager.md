# MemoryManager 组件详细设计

## 基本信息

| 属性 | 值 |
|-----|-----|
| **层级** | L1/L4 - 记忆存储层/智能编排层 |
| **文件位置** | `.vitepress/agent/memory/MemoryManager.ts` |
| **实现状态** | ⚠️ 部分实现 |
| **完成度** | 50% (功能70%，存储层30%) |

## 功能设计

### 核心职责
MemoryManager 是系统的"记忆中枢"，负责：
1. **实体管理**: 知识图谱的实体 CRUD、WikiLinks 提取
2. **任务历史**: Agent 任务的执行记录、成本追踪
3. **会话记忆**: 对话历史、上下文维护
4. **RAG 上下文**: 为 LLM 构建相关上下文

### 存储演进

```
Phase 0 (当前): localStorage 存储
    └── 浏览器本地，页面刷新丢失风险

Phase 1 (目标): 文件化存储  
    └── docs/.vitepress/memory/
        ├── entities/        # 实体库
        ├── tasks/           # 任务历史
        ├── context/         # 会话记忆
        └── skills/          # 技能模板

Phase 2 (未来): Git-based 版本控制
    └── 记忆与内容一起版本控制
```

## 交互方式

### 对外接口

```typescript
interface MemoryManager {
  // 生命周期
  initialize(): Promise<void>
  
  // ========== 实体操作 ==========
  getEntity(id: string): Promise<KnowledgeEntity | null>
  saveEntity(entity: KnowledgeEntity): Promise<void>
  findEntitiesByType(type: EntityType): Promise<KnowledgeEntity[]>
  findEntitiesByName(name: string): Promise<KnowledgeEntity[]>
  findRelatedEntities(entityId: string): Promise<KnowledgeEntity[]>
  extractEntitiesFromContent(content: string, source: string): Promise<KnowledgeEntity[]>
  
  // ========== 任务历史 ==========
  getTaskHistory(taskId: string): Promise<TaskHistory | null>
  saveTaskHistory(history: TaskHistory): Promise<void>
  listTaskHistories(limit?: number): Promise<TaskHistory[]>
  getAgentTaskHistories(): Promise<TaskHistory[]>
  
  // ========== 会话记忆 ==========
  getSession(sessionId: string): Promise<SessionMemory | null>
  saveSession(session: SessionMemory): Promise<void>
  createSession(): Promise<SessionMemory>
  
  // ========== RAG 上下文 ==========
  buildContext(query: string, currentFile?: string): Promise<RAGResult[]>
  keywordSearch(query: string): Promise<RAGResult[]>
  addToRAGIndex(content: string, source: string, metadata?: any): Promise<void>
}
```

### 数据结构

```typescript
interface KnowledgeEntity {
  id: string
  name: string
  type: 'concept' | 'technology' | 'paper' | 'person' | 'code' | 'article'
  description: string
  aliases: string[]
  related: string[]      // 关联实体ID
  sources: string[]      // 来源文件路径
  createdAt: number
  updatedAt: number
}

interface TaskHistory {
  id: string
  type: string
  description: string
  steps: TaskStep[]
  result: 'success' | 'failure' | 'cancelled'
  tokensUsed: number
  cost: number
  startedAt: number
  completedAt: number
}

interface SessionMemory {
  id: string
  messages: ChatMessage[]
  context: Record<string, any>
  createdAt: number
  lastActive: number
}

interface RAGResult {
  content: string
  source: string
  score: number
  metadata: {
    type: 'entity' | 'task_history' | 'article'
    entityType?: EntityType
    title?: string
  }
}
```

### 与其他组件交互

```
AgentRuntime (L4)
    │
    ├──→ MemoryManager.buildContext(query)  # 构建 LLM 上下文
    │       │
    │       ├──→ keywordSearch(query)       # 关键词匹配
    │       ├──→ getRelatedContent(file)    # WikiLinks 关联
    │       └──→ 合并/去重/排序
    │
    ├──→ MemoryManager.saveTaskHistory()    # 记录任务
    │
    └──→ Skill.handler
            │
            ├──→ memory.extractEntitiesFromContent()  # 提取实体
            ├──→ memory.saveEntity()                     # 保存实体
            └──→ memory.addToRAGIndex()                  # 添加向量索引
```

## 实现进度

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| **内存存储** | ✅ 完成 | Map 存储，运行时可读写 |
| **localStorage** | ✅ 完成 | 浏览器持久化 |
| **实体 CRUD** | ✅ 完成 | 完整的增删改查 |
| **WikiLinks 提取** | ✅ 完成 | 正则提取 [[...]] |
| **实体类型推断** | ✅ 完成 | 基于名称和内容推断 |
| **任务历史** | ✅ 完成 | 保存和查询 |
| **会话记忆** | ✅ 完成 | 创建和保存 |
| **关键词搜索** | ✅ 完成 | 基于关键词匹配分数 |
| **文件化存储** | ❌ 待实现 | 需要从 localStorage 迁移 |
| **向量检索** | ❌ 待实现 | RAG 向量相似度搜索 |
| **检查点恢复** | ❌ 待实现 | 任务断点续作 |

## 当前实现代码

### 内存存储

```typescript
const memoryStore = {
  entities: new Map<string, KnowledgeEntity>(),
  tasks: new Map<string, TaskHistory>(),
  sessions: new Map<string, SessionMemory>(),
  ragIndex: new Map<string, { content: string; embedding: number[]; metadata: any }>()
}
```

### RAG 上下文构建

```typescript
async buildContext(query: string, currentFile?: string): Promise<RAGResult[]> {
  // 1. 关键词匹配
  const keywordResults = await this.keywordSearch(query)
  
  // 2. 获取 WikiLinks 相关内容
  const relatedResults = currentFile 
    ? await this.getRelatedContent(currentFile)
    : []

  // 3. 合并并去重
  const allResults = [...keywordResults, ...relatedResults]
  const unique = this.deduplicate(allResults)

  // 4. 按相关性排序并返回 (最多5条)
  return unique
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}
```

## 待实现：文件化存储

### 目标存储结构

```
docs/.vitepress/memory/
├── entities/
│   ├── concepts.json      # 概念实体
│   ├── technologies.json  # 技术实体
│   ├── papers.json        # 论文实体
│   └── index.json         # 实体索引
├── tasks/
│   ├── task_xxx.json      # 单个任务
│   └── index.json         # 任务索引
├── context/
│   └── sess_xxx.json      # 会话记忆
└── skills/
    └── templates.yaml     # 技能提示词模板
```

### 实现计划

```typescript
// 文件化 MemoryManager
class FileBasedMemoryManager implements MemoryManager {
  private basePath = 'docs/.vitepress/memory'
  
  async initialize(): Promise<void> {
    // 确保目录结构存在
    await ensureDir(`${this.basePath}/entities`)
    await ensureDir(`${this.basePath}/tasks`)
    await ensureDir(`${this.basePath}/context`)
  }
  
  async saveEntity(entity: KnowledgeEntity): Promise<void> {
    const filePath = `${this.basePath}/entities/${entity.type}s.json`
    const entities = await this.loadJson(filePath) || []
    
    // 更新或添加
    const index = entities.findIndex(e => e.id === entity.id)
    if (index >= 0) {
      entities[index] = { ...entity, updatedAt: Date.now() }
    } else {
      entities.push({ ...entity, createdAt: Date.now(), updatedAt: Date.now() })
    }
    
    await this.saveJson(filePath, entities)
  }
  
  async getEntity(id: string): Promise<KnowledgeEntity | null> {
    // 从所有类型文件中查找
    const types = ['concepts', 'technologies', 'papers', 'people', 'code']
    for (const type of types) {
      const filePath = `${this.basePath}/entities/${type}.json`
      const entities = await this.loadJson<KnowledgeEntity[]>(filePath)
      const found = entities?.find(e => e.id === id)
      if (found) return found
    }
    return null
  }
}
```

## 待完善项

1. **文件化存储**: 将 localStorage 迁移到文件系统
2. **向量检索**: 实现真正的 RAG 向量相似度搜索
3. **检查点机制**: 支持任务断点续作
4. **实体关系**: 增强实体间的关系推理
5. **记忆压缩**: 长期记忆的摘要和压缩
