/**
 * 数据存储类型定义
 */

// ==================== 配置 ====================
export interface SystemConfig {
  version: string
  app: { name: string; description: string; debug: boolean }
  features: {
    agentOrchestrator: { enabled: boolean; autoStart: boolean; managerDecisionInterval: number; maxWorkers: number; enableSelfEvolution: boolean }
    websocket: { enabled: boolean; port: number; heartbeatInterval: number }
    mcp: { enabled: boolean; autoReconnect: boolean; maxRetries: number }
    memory: { enabled: boolean; maxMemories: number; autoCleanup: boolean }
    skills: { autoLoad: boolean; hotReload: boolean; allowCustomSkills: boolean }
  }
  storage: { format: string; prettyPrint: boolean; autoBackup: boolean; backupInterval: number; maxBackups: number }
  ui: { theme: 'light' | 'dark' | 'auto'; compact: boolean; animations: 'none' | 'minimal' | 'full' }
  llm: { defaultProvider: string; maxConcurrentRequests: number; requestTimeout: number; retryAttempts: number }
  limits: { maxAgents: number; maxSessions: number; maxMessagesPerSession: number; maxFileSize: number; maxLogEntries: number }
}

// ==================== Agent ====================
export interface StoredAgent {
  id: string
  name: string
  avatar: string
  description: string
  tier: 'system' | 'manager' | 'worker'
  mode: 'passive' | 'scheduled' | 'hybrid' | 'always_on'
  runtimeStatus: string
  capabilities: any
  memory: any
  stats: {
    totalTasks: number
    successfulTasks: number
    failedTasks: number
    totalExecutionTime: number
  }
  createdAt: number
  updatedAt: number
  createdBy: string
}

// ==================== Session & Message ====================
export interface StoredSession {
  id: string
  title: string
  agentId: string
  agentName: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface StoredMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  tokens?: number
}

// ==================== Memory ====================
export interface StoredMemory {
  id: string
  content: string
  category: string
  importance: number
  createdAt: number
  updatedAt: number
  enabled: boolean
}

// ==================== Article Metadata ====================
export interface ArticleMetadata {
  id: string
  path: string           // MD文件路径
  title: string
  createdAt: number
  updatedAt: number
  wordCount: number
  readingTime: number
  section: string
  tags: string[]
  category?: string
  readCount: number
  likeCount: number
  source: 'manual' | 'agent-generated' | 'imported'
  sessionId?: string
  agentId?: string
  aiSummary?: string
  embedding?: number[]
  keywords?: string[]
}

// ==================== MCP Server ====================
export interface StoredMCPServer {
  id: string
  name: string
  type: string
  config: any
  enabled: boolean
  lastConnectedAt?: number
}

// ==================== Log ====================
export interface LogEntry {
  id: string
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  component: string
  event: string
  message: string
  metadata?: any
}

// ==================== Task ====================
export interface StoredTask {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  type: string
  createdAt: number
  startedAt?: number
  completedAt?: number
  result?: any
  error?: string
}

// ==================== Skill ====================
export interface StoredSkill {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  prompts: any[]
  tools: string[]
  createdAt: number
  updatedAt: number
}
