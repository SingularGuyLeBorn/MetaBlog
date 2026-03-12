/**
 * 数据迁移脚本 - 直接操作文件系统
 * node scripts/migrate-data.js
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(process.cwd(), '.data')

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`创建目录: ${dir}`)
  }
}

function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (e) {}
  return null
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  console.log(`写入: ${filePath}`)
}

function mapTier(level) {
  if (level === 'meta' || level === 'core') return 'system'
  if (level === 'manager') return 'manager'
  return 'worker'
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

console.log('=== 数据迁移开始 ===\n')

// 1. Agents
console.log('1. 迁移 Agents...')
const oldAgents = readJson(path.join(DATA_DIR, 'agents.json'))
if (oldAgents) {
  const newAgents = oldAgents.map(old => ({
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
  }))
  writeJson(path.join(DATA_DIR, 'agents', 'index.json'), newAgents)
  console.log(`   ✓ ${newAgents.length} 个Agent\n`)
} else {
  console.log('   ⚠ 无数据\n')
}

// 2. Sessions
console.log('2. 迁移 Sessions...')
const oldSessions = readJson(path.join(DATA_DIR, 'sessions.json'))
if (oldSessions) {
  const newSessions = oldSessions.map(old => ({
    id: old.id,
    title: old.title,
    agentId: old.config?.agentId || '',
    agentName: old.config?.agentName || '',
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
    messageCount: old.stats?.messageCount || 0
  }))
  writeJson(path.join(DATA_DIR, 'sessions', 'index.json'), newSessions)
  console.log(`   ✓ ${newSessions.length} 个Session\n`)
} else {
  console.log('   ⚠ 无数据\n')
}

// 3. Memories
console.log('3. 迁移 Memories...')
const oldMemories = readJson(path.join(DATA_DIR, 'memories.json'))
if (oldMemories) {
  const newMemories = oldMemories.map(old => ({
    id: old.id,
    content: old.content,
    category: old.category,
    importance: old.importance,
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
    enabled: old.enabled
  }))
  writeJson(path.join(DATA_DIR, 'memories', 'index.json'), newMemories)
  console.log(`   ✓ ${newMemories.length} 个Memory\n`)
} else {
  console.log('   ⚠ 无数据\n')
}

// 4. Messages
console.log('4. 迁移 Messages...')
const oldMessages = readJson(path.join(DATA_DIR, 'session-messages.json'))
if (oldMessages) {
  let total = 0
  for (const [sessionId, messages] of Object.entries(oldMessages)) {
    const newMessages = messages.map(old => ({
      id: old.id || generateUUID(),
      sessionId,
      role: old.role,
      content: old.content,
      timestamp: old.timestamp,
      tokens: old.tokens
    }))
    writeJson(path.join(DATA_DIR, 'messages', sessionId, 'index.json'), newMessages)
    total += newMessages.length
  }
  console.log(`   ✓ ${total} 条Message\n`)
} else {
  console.log('   ⚠ 无数据\n')
}

// 5. Config
console.log('5. 初始化配置...')
const configPath = path.join(DATA_DIR, 'config', 'system.json')
if (!fs.existsSync(configPath)) {
  writeJson(configPath, {
    version: '2.0.0',
    app: { name: 'MetaBlog', description: 'AI驱动的智能博客系统', debug: false },
    features: {
      agentOrchestrator: { enabled: true, autoStart: true, managerDecisionInterval: 60000, maxWorkers: 10, enableSelfEvolution: true },
      websocket: { enabled: true, port: 5173, heartbeatInterval: 30000 },
      mcp: { enabled: true, autoReconnect: true, maxRetries: 3 },
      memory: { enabled: true, maxMemories: 1000, autoCleanup: true },
      skills: { autoLoad: true, hotReload: true, allowCustomSkills: true }
    },
    storage: { format: 'json', prettyPrint: true, autoBackup: true, backupInterval: 86400000, maxBackups: 7 },
    ui: { theme: 'light', compact: true, animations: 'minimal' },
    llm: { defaultProvider: 'deepseek', maxConcurrentRequests: 3, requestTimeout: 60000, retryAttempts: 2 },
    limits: { maxAgents: 20, maxSessions: 100, maxMessagesPerSession: 500, maxFileSize: 10485760, maxLogEntries: 10000 }
  })
}

console.log('=== 迁移完成 ===')

// 清理旧文件
const oldFiles = ['agents.json', 'sessions.json', 'memories.json', 'session-messages.json']
let deleted = 0
oldFiles.forEach(file => {
  const p = path.join(DATA_DIR, file)
  if (fs.existsSync(p)) {
    fs.unlinkSync(p)
    deleted++
  }
})
if (deleted > 0) {
  console.log(`\n清理旧文件: ${deleted} 个`)
}
