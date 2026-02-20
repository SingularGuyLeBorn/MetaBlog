/**
 * MetaUniverse Agent Runtime - Core Types
 * 核心类型定义 - 人机共生的数字生命体基础
 */

// ============================================
// L5: 人机共生界面层类型
// ============================================

/** 编辑器模式：人工 / 协作 / 托管 */
export type EditorMode = 'MANUAL' | 'COLLAB' | 'AGENT'

/** AI 建议类型 */
export interface InlineSuggestion {
  id: string
  type: 'completion' | 'link' | 'rewrite' | 'question'
  content: string
  position: { line: number; ch: number }
  confidence: number
  context?: string
}

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: {
    basedOn?: string
    tokens?: number
    cost?: number
    path?: string
  }
}

// ============================================
// L4: 智能编排层类型
// ============================================

/** Agent 意图类型 */
export type IntentType = 
  | 'WRITE_ARTICLE' 
  | 'EDIT_CONTENT' 
  | 'RESEARCH_WEB'
  | 'UPDATE_GRAPH'
  | 'CODE_EXPLAIN'
  | 'ANSWER_QUESTION'
  | 'SUMMARIZE'
  | 'EXPLORE_KNOWLEDGE'

/** 意图解析结果 */
export interface ParsedIntent {
  type: IntentType
  confidence: number
  entities: string[]
  parameters: Record<string, any>
  raw: string
}

/** 技能定义 */
export interface Skill {
  name: string
  description: string
  intentPattern: RegExp | string[]
  requiredParams: string[]
  optionalParams: string[]
  handler: (ctx: SkillContext, params: any) => Promise<SkillResult>
}

/** 文件锁管理器接口 */
export interface FileLockManager {
  acquireLock(filePath: string, taskId: string): boolean
  releaseLock(filePath: string, taskId: string): boolean
  releaseTaskLocks(taskId: string): number
  isLocked(filePath: string): boolean
  getLockInfo(filePath: string): { filePath: string; taskId: string; acquiredAt: number } | null
  acquireLocks(filePaths: string[], taskId: string): { success: boolean; failed: string[] }
}

/** 技能上下文 */
export interface SkillContext {
  taskId: string
  memory: MemoryManager
  logger: Logger
  costTracker: CostTracker
  currentFile?: string
  sessionId: string
  fileLock: FileLockManager
}

/** 技能执行结果 */
export interface SkillResult {
  success: boolean
  data?: any
  error?: string
  tokensUsed: number
  cost: number
  nextSteps?: string[]
}

/** Agent 状态 */
export type AgentState = 
  | 'IDLE'
  | 'UNDERSTANDING'    // 解析意图
  | 'PLANNING'         // 规划步骤
  | 'EXECUTING'        // 执行技能
  | 'WAITING_INPUT'    // 等待用户输入
  | 'PAUSED'           // 暂停（断点续作）
  | 'COMPLETED'
  | 'ERROR'

/** 任务状态 */
export interface TaskState {
  id: string
  state: AgentState
  currentStep: number
  totalSteps: number
  context: Record<string, any>
  checkpoint: any
  startedAt: number
  updatedAt: number
  completedAt?: number
}

// ============================================
// L3: 工具与感知层类型
// ============================================

/** 搜索结果 */
export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: 'arxiv' | 'google' | 'github' | 'blog'
  credibility: number
  publishedAt?: string
}

/** RAG 检索结果 */
export interface RAGResult {
  content: string
  source: string
  score: number
  metadata: {
    title?: string
    path?: string
    lineStart?: number
    lineEnd?: number
    type?: string
  }
}

/** Git 操作类型 */
export type GitOperation = 'commit' | 'branch' | 'merge' | 'diff' | 'log'

/** Git 提交信息 */
export interface GitCommitInfo {
  hash: string
  message: string
  author: 'human' | 'agent'
  model?: string
  timestamp: string
  skill?: string
  tokens?: number
  cost?: number
  taskId?: string
}

// ============================================
// L2: 运行时与观察层类型
// ============================================

/** 日志级别 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** 日志条目 */
export interface LogEntry {
  id: string
  timestamp: number
  level: LogLevel
  source: string
  message: string
  metadata?: any
  taskId?: string
}

/** 成本追踪 */
export interface CostEntry {
  timestamp: number
  model: string
  tokens: number
  cost: number
  taskId: string
  skill: string
}

/** 系统健康状态 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: Record<string, {
    status: 'up' | 'down' | 'unknown'
    latency?: number
    lastCheck: number
  }>
  lastUpdate: number
}

// ============================================
// L1: 记忆存储层类型
// ============================================

/** 实体类型 */
export type EntityType = 'concept' | 'paper' | 'person' | 'code' | 'technology'

/** 知识实体 */
export interface KnowledgeEntity {
  id: string
  name: string
  type: EntityType
  description: string
  aliases: string[]
  related: string[]  // 其他实体ID
  sources: string[]  // 来源文章路径
  createdAt: number
  updatedAt: number
}

/** 任务历史 */
export interface TaskHistory {
  id: string
  type: IntentType
  description: string
  steps: TaskStep[]
  result: 'success' | 'failure' | 'cancelled'
  tokensUsed: number
  cost: number
  startedAt: number
  completedAt: number
}

/** 任务步骤 */
export interface TaskStep {
  index: number
  skill: string
  input: any
  output: any
  tokens: number
  cost: number
  startedAt: number
  completedAt: number
}

/** 短期记忆（会话级） */
export interface SessionMemory {
  id: string
  messages: ChatMessage[]
  context: {
    currentFile?: string
    selectedText?: string
    wikiLinks?: string[]
  }
  createdAt: number
  lastActive: number
}

// ============================================
// 技能记忆相关
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

export interface SkillPreference {
  skillName: string
  preferredParams: Record<string, any>
  successRate: number
  avgExecutionTime: number
  totalExecutions: number
}

// ============================================
// 记忆管理器接口
// ============================================

export interface MemoryManager {
  // 初始化
  initialize(): Promise<void>
  
  // 子模块实例 - 直接访问
  entities: {
    get(id: string): Promise<KnowledgeEntity | null>
    save(entity: KnowledgeEntity): Promise<void>
    findByType(type: EntityType): Promise<KnowledgeEntity[]>
    findByName(name: string): Promise<KnowledgeEntity[]>
    extractFromContent(content: string, source: string): Promise<KnowledgeEntity[]>
    loadFromServer(): Promise<void>
  }
  tasks: {
    get(taskId: string): Promise<TaskHistory | null>
    save(history: TaskHistory): Promise<void>
    list(limit?: number): Promise<TaskHistory[]>
    loadFromServer(): Promise<void>
  }
  sessions: {
    get(sessionId: string): Promise<SessionMemory | null>
    save(session: SessionMemory): Promise<void>
    loadFromServer(): Promise<void>
  }
  skills: {
    recordExecution(record: Omit<SkillExecutionRecord, 'id' | 'executedAt'>): Promise<void>
    getPreference(skillName: string): Promise<SkillPreference | null>
  }
  
  // RAG 上下文
  buildContext(query: string, currentFile?: string): Promise<RAGResult[]>
}

// ============================================
// 日志记录器接口
// ============================================

export interface Logger {
  debug(message: string, metadata?: any): void
  info(message: string, metadata?: any): void
  warn(message: string, metadata?: any): void
  error(message: string, metadata?: any): void
  getLogs(level?: LogLevel, taskId?: string): LogEntry[]
}

// ============================================
// 成本追踪器接口
// ============================================

export interface CostTracker {
  record(entry: CostEntry): void
  getTotalCost(): number
  getCostByTask(taskId: string): number
  getCostBySkill(skill: string): number
  getDailyCost(date: string): number
}
