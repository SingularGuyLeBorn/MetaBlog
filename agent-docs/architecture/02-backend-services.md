# 后端服务详细设计

## 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Server                          │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│  API Routes │  Middleware │   Services  │   Data Storage    │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ /api/agents │   CORS      │  Scheduler │   agents.json     │
│ /api/mcp    │   JSON      │  EventBus  │   mcp-servers.json│
│ /api/chat   │   Upload    │ MasterTools│   skills.json     │
│ /api/upload │   Auth      │  GitOperator│  memories/       │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

---

## 1. Agent 管理服务 (agents.ts)

### 功能概述
管理 Agent 的生命周期：创建、更新、删除、查询。

### 数据模型

```typescript
interface Agent {
  id: string                    // 唯一标识
  name: string                  // 显示名称
  avatar: string               // Emoji 头像
  description: string          // 描述
  level: 'meta' | 'core' | 'fixed' | 'custom' | 'temp'
  status: 'online' | 'offline' | 'busy' | 'idle' | 'running' | 'paused' | 'error'
  seat: number                 // 座位号
  skills: string[]            // 技能 ID 列表
  permissions: AgentPermission[]
  systemPrompt: string        // 系统提示词
  memoryEnabled: boolean
  memoryContent: string
  memory?: MemoryConfig
  functionCall?: FunctionCallConfig
  lifecycle?: LifecycleConfig
  runtime?: RuntimeConfig      // 模型配置
  triggers?: Trigger[]        // 触发器
  isMaster?: boolean          // 是否 Master Agent
  createdAt: number
  updatedAt: number
}

interface RuntimeConfig {
  model: string               // 模型名称
  temperature: number         // 温度
  maxTokens: number          // 最大 Token
  timeout: number
  retryCount: number
  retryDelay: number
}
```

### API 端点

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/api/agents` | 获取所有 Agent |
| POST | `/api/agents` | 创建 Agent |
| POST | `/api/agents/update` | 更新 Agent |
| POST | `/api/agents/delete` | 删除 Agent |
| POST | `/api/agents/trigger` | 手动触发 Agent |

### 核心逻辑

#### Master Agent 保护
```typescript
// 删除时检查
if (agentToDelete.level === 'meta' || agentToDelete.isMaster) {
  return { success: false, error: 'Cannot delete meta-level or master agent' }
}

// 更新时保护字段
if (existingAgent.level === 'meta' || existingAgent.isMaster) {
  delete updates.level
  delete updates.isMaster
  if (existingAgent.isMaster) {
    delete updates.systemPrompt
    delete updates.permissions
  }
}
```

#### 默认创建
```typescript
const MASTER_AGENT_CONFIG = {
  id: 'master-agent',
  name: 'Master Agent',
  level: 'meta',
  isMaster: true,
  permissions: [...所有权限],
  systemPrompt: '你是 MetaBlog 系统的 Master Agent...'
}
```

---

## 2. MCP 服务 (mcp.ts)

### 功能概述
管理 MCP Server 的连接、配置和工具调用。

### 数据模型

```typescript
interface MCPServerConfig {
  id: string
  name: string
  description: string
  icon?: string
  category: 'code' | 'social' | 'dev' | 'productivity' | 'custom'
  transport: 'stdio' | 'sse' | 'http' | 'websocket'
  
  // stdio 配置
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  
  // http/sse 配置
  url?: string
  headers?: Record<string, string>
  
  enabled: boolean
  autoConnect: boolean
  timeout: number
  retryCount: number
  
  createdAt: number
  updatedAt: number
}

interface MCPServerState {
  id: string
  config: MCPServerConfig
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
}
```

### API 端点

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/api/mcp/servers` | 获取所有 MCP Server |
| GET | `/api/mcp/servers/:id` | 获取单个 Server |
| POST | `/api/mcp/servers` | 创建 Server |
| POST | `/api/mcp/servers/update` | 更新 Server |
| POST | `/api/mcp/servers/delete` | 删除 Server |
| POST | `/api/mcp/servers/:id/connect` | 连接 Server |
| POST | `/api/mcp/servers/:id/disconnect` | 断开 Server |
| POST | `/api/mcp/servers/:id/tools/:toolName/execute` | 执行工具 |
| POST | `/api/mcp/import` | 批量导入 |
| POST | `/api/mcp/export` | 导出配置 |

### 预设 MCP Servers

```typescript
const MCP_PRESETS = [
  {
    id: 'github-mcp',
    name: 'GitHub MCP',
    category: 'code',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@github/mcp-server'],
    env: { GITHUB_TOKEN: '' }
  },
  {
    id: 'zhihu-mcp',
    name: '知乎 MCP',
    category: 'social',
    transport: 'sse',
    url: 'https://zhihu-mcp.example.com/sse'
  },
  // ... 更多预设
]
```

---

## 3. 调度服务 (Scheduler.ts)

### 功能概述
基于 node-cron 的定时任务调度器，管理 Agent 的定时触发。

### 核心类

```typescript
class Scheduler extends EventEmitter {
  private tasks: Map<string, ScheduledTask>
  private isRunning = false
  
  // 启动调度器
  async start(): Promise<void>
  
  // 停止调度器
  stop(): void
  
  // 重新加载所有任务
  async reloadTasks(): Promise<void>
  
  // 手动触发任务
  async manualTrigger(agentId: string, triggerId: string): Promise<boolean>
}
```

### 触发器配置

```typescript
interface Trigger {
  id: string
  type: 'manual' | 'scheduled' | 'event' | 'webhook'
  name: string
  enabled: boolean
  config: {
    cron?: string           // Cron 表达式
    timezone?: string       // 时区
    eventName?: string      // 事件名称
    webhookUrl?: string     // Webhook URL
  }
  lastTriggered?: string
  triggerCount: number
}
```

### Cron 表达式示例

```typescript
// 每天早上9点
'0 9 * * *'

// 每小时
'0 * * * *'

// 每周一早上8点
'0 8 * * 1'

// 每5分钟
'*/5 * * * *'
```

### 使用方式

```typescript
import { scheduler } from './services/Scheduler'

// 启动
await scheduler.start()

// 监听触发事件
scheduler.on('trigger', ({ agentId, triggerId }) => {
  console.log(`Agent ${agentId} triggered`)
})

// 手动触发
await scheduler.manualTrigger('agent-xxx', 'trigger-xxx')
```

---

## 4. 事件总线 (EventBus.ts)

### 功能概述
基于 chokidar 的文件监听和事件分发系统。

### 核心类

```typescript
class EventBus extends EventEmitter {
  private fileWatcher: chokidar.FSWatcher
  private eventQueue: SystemEvent[]
  
  // 启动
  async start(): Promise<void>
  
  // 停止
  async stop(): Promise<void>
  
  // 发出事件
  emitEvent(type: SystemEventType, payload: Record<string, any>): void
}
```

### 事件类型

```typescript
type SystemEventType = 
  | 'article.created'
  | 'article.updated'
  | 'article.deleted'
  | 'file.created'
  | 'file.modified'
  | 'file.deleted'
  | 'git.commit'
  | 'agent.triggered'
  | 'chat.mentioned'
  | 'system.startup'
  | 'system.shutdown'
```

### 事件过滤

```typescript
// 在 Agent 配置中
{
  triggers: [{
    type: 'event',
    name: '监听文章创建',
    config: {
      eventName: 'article.created',
      eventFilter: {
        path: '/docs/AI/*',     // 路径通配符
        pattern: '.*\.md$'      // 正则匹配
      }
    }
  }]
}
```

---

## 5. Master Tools 服务 (MasterTools.ts)

### 功能概述
Master Agent 专属的系统级工具。

### 工具列表

| 工具名 | 功能 | 权限 |
|--------|------|------|
| `sys_list_agents` | 列出所有 Agent | 读取 |
| `sys_create_agent` | 创建新 Agent | 写入 |
| `sys_update_agent` | 更新 Agent | 写入 |
| `sys_delete_agent` | 删除 Agent | 写入（不能删 meta）|
| `sys_update_trigger` | 配置触发器 | 写入 |
| `sys_list_skills` | 列出所有 Skills | 读取 |
| `sys_get_system_status` | 获取系统状态 | 读取 |

### 使用示例

```typescript
// 创建新 Agent
const result = await masterToolExecutors.sys_create_agent({
  name: '代码审查员',
  description: '审查代码质量',
  systemPrompt: '你是一个代码审查专家...',
  level: 'custom',
  skills: ['code_review', 'github'],
  triggers: [{
    type: 'event',
    name: 'PR创建时审查',
    config: { eventName: 'github.pr.created' }
  }]
})

// 更新触发器
await masterToolExecutors.sys_update_trigger({
  agentId: 'agent-xxx',
  type: 'scheduled',
  name: '每日报告',
  config: { cron: '0 9 * * *' }
})
```

---

## 6. 文件上传服务 (upload.ts)

### 功能概述
处理图片、视频等文件的上传和存储。

### API 端点

| 方法 | 端点 | 功能 |
|------|------|------|
| POST | `/api/upload` | 上传文件 |
| POST | `/api/upload/image` | 上传图片（转 Base64）|
| POST | `/api/upload/video` | 上传视频 |

### 响应格式

```typescript
{
  success: true,
  data: {
    id: 'file-xxx',
    url: '/uploads/filename.jpg',
    base64: 'data:image/jpeg;base64,...',  // 用于 Kimi
    name: 'filename.jpg',
    size: 12345,
    mimeType: 'image/jpeg'
  }
}
```

---

## 7. 文章服务 (articles.ts)

### 功能概述
Markdown 文章的 CRUD 操作。

### API 端点

| 方法 | 端点 | 功能 |
|------|------|------|
| GET | `/api/articles` | 获取文章列表（树形）|
| GET | `/api/articles/read` | 读取文章内容 |
| POST | `/api/articles/create` | 创建文章 |
| POST | `/api/articles/update` | 更新文章 |
| POST | `/api/articles/delete` | 删除文章 |
| GET | `/api/articles/search` | 搜索文章 |

### 路径规范

```typescript
// 文件夹路径（以 / 结尾）
'docs/AI/machine-learning/'

// 文件路径
'docs/AI/transformer-guide.md'

// URL 格式（自动转换）
'/sections/knowledge/folder/'  → 'docs/knowledge/folder/index.md'
```

---

## 数据持久化

### 存储位置

```
.data/
├── agents.json          # Agent 配置
├── mcp-servers.json     # MCP 配置
├── skills.json          # Skills 配置
├── memories/            # 长期记忆
│   ├── agent-xxx/
│   └── agent-yyy/
└── uploads/            # 上传文件
```

### 读写模式

```typescript
// 读取
async function readAgents(): Promise<Agent[]> {
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []  // 文件不存在返回空数组
  }
}

// 写入
async function writeAgents(agents: Agent[]): Promise<void> {
  await fs.writeFile(
    AGENTS_FILE, 
    JSON.stringify(agents, null, 2), 
    'utf-8'
  )
}
```

---

## 错误处理

### 统一响应格式

```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: '错误信息' }
```

### 错误类型

| 状态码 | 含义 | 场景 |
|--------|------|------|
| 200 | 成功 | 正常响应 |
| 400 | 请求错误 | 参数缺失/格式错误 |
| 403 | 禁止访问 | 删除 Master Agent |
| 404 | 不存在 | Agent/文章未找到 |
| 500 | 服务器错误 | 内部异常 |

---

## 启动流程

```typescript
// server/index.ts
async function startServer() {
  // 1. 启动 Express
  const app = express()
  
  // 2. 注册中间件
  app.use(cors())
  app.use(json())
  app.use('/uploads', static('uploads'))
  
  // 3. 注册路由
  app.use('/api/agents', agentsRouter)
  app.use('/api/mcp', mcpRouter)
  app.use('/api/upload', uploadRouter)
  
  // 4. 启动服务
  app.listen(3000, () => {
    console.log('Server running on port 3000')
  })
  
  // 5. 启动后台服务
  await scheduler.start()
  await eventBus.start()
}
```
