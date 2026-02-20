# 场景四：日志仪表盘与可视化 完整体检报告

> **版本**: v1.0  
> **生成时间**: 2026-02-20  
> **涵盖范围**: StructuredLogger → Dashboard 渲染的完整数据流

---

## 一、启动与初始化流程

### 1.1 VitePress 启动时的日志系统初始化

| 文件 | 函数 | 输入 | 输出 | 说明 |
|-----|------|------|------|------|
| `config.ts` | `configureServer()` | `server: ViteDevServer` | - | Vite 配置钩子 |
| `structured-logger.ts` | `getStructuredLogger()` | - | `StructuredLogger` | 获取日志实例 |

**初始化流程**:
```typescript
// config.ts 模块加载时
import { getStructuredLogger } from "./utils/structured-logger"
const system = getStructuredLogger({ category: "system" })

// 在 configureServer 中
export default defineConfig({
  // ...
  configureServer(server) {
    // 1. 记录服务器启动
    system.info("server.start", "MetaBlog BFF Server 初始化...")
    
    // 2. 加载配置
    const agentConfig = loadAgentConfig()
    system.info("config.loaded", "配置加载完成", agentConfig)
    
    // 3. 启动完成后记录
    system.success("server.ready", "服务器已就绪")
  }
})
```

### 1.2 StructuredLogger 初始化

| 文件 | 函数 | 输入 | 输出 | 说明 |
|-----|------|------|------|------|
| `structured-logger.ts` | `constructor()` | `options: LoggerOptions` | - | 构造函数 |
| `structured-logger.ts` | `initializeStorage()` | - | `Promise<void>` | 初始化存储 |

**Logger 初始化**:
```typescript
// structured-logger.ts:86-154
export class StructuredLogger implements IStructuredLogger {
  private config: Required<LoggerConfig>
  private storage?: FileStorage<LogData>
  private readonly BROWSER_MAX_SIZE = 1000  // 浏览器端最多保留 1000 条
  
  constructor(options: LoggerOptions = {}) {
    this.config = {
      name: options.name || 'structured-logger',
      category: options.category || 'default',
      level: options.level || (typeof window === 'undefined' ? 'debug' : 'info'),
      maxEntries: options.maxEntries || (typeof window === 'undefined' ? 5000 : 1000),
      consoleOutput: options.consoleOutput ?? true,
      fileOutput: options.fileOutput ?? (typeof window === 'undefined'),
      format: options.format || 'json'
    }
    
    // 服务端：初始化文件存储
    if (this.config.fileOutput && typeof window === 'undefined') {
      this.initializeStorage()
    }
  }
  
  private async initializeStorage(): Promise<void> {
    this.storage = new FileStorage<LogData>({
      name: this.config.name,
      defaultData: {
        metadata: {
          name: this.config.name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: '2.0'
        },
        entries: [],
        stats: { byLevel: {}, byCategory: {}, byEvent: {}, hourly: {} }
      },
      maxEntries: this.config.maxEntries
    })
    
    await this.storage.load()
  }
}
```

---

## 二、完整调用链详解

### 阶段 1：日志记录

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `structured-logger.ts` | `info(eventId, message, data?, options?)` | `string`, `string`, `object?`, `object?` | `Promise<void> \| void` | 记录 INFO 级别日志 |
| `structured-logger.ts` | `error(eventId, message, data?, options?)` | `string`, `string`, `object?`, `object?` | `Promise<void> \| void` | 记录 ERROR 级别日志 |

**日志记录流程**:
```typescript
// structured-logger.ts:156-195
info(eventId: string, message: string, data?: Record<string, any>, options?: LogOptions): Promise<void> | void {
  return this.log('info', eventId, message, data, options)
}

error(eventId: string, message: string, data?: Record<string, any>, options?: LogOptions): Promise<void> | void {
  return this.log('error', eventId, message, data, options)
}

// 核心 log 方法
private async log(
  level: LogLevel,
  eventId: string,
  message: string,
  data?: Record<string, any>,
  options?: LogOptions
): Promise<void> {
  // 1. 级别过滤
  const levelPriority = { debug: 0, info: 1, success: 1, warn: 2, error: 3 }
  if (levelPriority[level] < levelPriority[this.config.level]) {
    return
  }
  
  // 2. 构建日志条目
  const entry: LogEntry = {
    id: this.generateId(),
    timestamp: Date.now(),
    level,
    eventId,
    message,
    data,
    category: options?.category || this.config.category,
    source: options?.source || this.detectSource(),
    tags: options?.tags,
    duration: options?.duration,
    error: level === 'error' ? { message, stack: data?.stack } : undefined
  }
  
  // 3. 控制台输出
  if (this.config.consoleOutput) {
    this.consoleOutput(entry)
  }
  
  // 4. 文件存储（服务端）
  if (this.config.fileOutput && this.storage) {
    await this.fileOutput(entry)
  }
  
  // 5. 浏览器端事件广播
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('structured-log', {
      detail: entry
    }))
  }
}

// 控制台输出
private consoleOutput(entry: LogEntry): void {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString()
  const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.eventId}]`
  
  const colorMap = {
    debug: '\x1b[36m',    // 青色
    info: '\x1b[34m',     // 蓝色
    success: '\x1b[32m',  // 绿色
    warn: '\x1b[33m',     // 黄色
    error: '\x1b[31m'     // 红色
  }
  
  const reset = '\x1b[0m'
  const color = colorMap[entry.level] || ''
  
  console.log(`${color}${prefix}${reset} ${entry.message}`, entry.data || '')
}

// 文件输出
private async fileOutput(entry: LogEntry): Promise<void> {
  if (!this.storage) return
  
  const data = await this.storage.load()
  data.entries.push(entry)
  
  // 统计更新
  data.stats.byLevel[entry.level] = (data.stats.byLevel[entry.level] || 0) + 1
  data.stats.byCategory[entry.category] = (data.stats.byCategory[entry.category] || 0) + 1
  data.stats.byEvent[entry.eventId] = (data.stats.byEvent[entry.eventId] || 0) + 1
  
  const hour = new Date(entry.timestamp).getHours()
  data.stats.hourly[hour] = (data.stats.hourly[hour] || 0) + 1
  
  // 截断旧日志
  if (data.entries.length > this.config.maxEntries) {
    data.entries = data.entries.slice(-this.config.maxEntries)
  }
  
  data.metadata.updatedAt = Date.now()
  await this.storage.save(data)
}
```

---

### 阶段 2：日志查询与检索

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `structured-logger.ts` | `query(options)` | `LogQueryOptions` | `Promise<LogQueryResult>` | 日志查询 |
| `structured-logger.ts` | `getStats(timeRange?)` | `TimeRange?` | `Promise<LogStats>` | 统计信息 |

**查询实现**:
```typescript
// structured-logger.ts:285-341
async query(options: LogQueryOptions = {}): Promise<LogQueryResult> {
  // 服务端：从文件加载
  if (this.storage) {
    const data = await this.storage.load()
    let entries = data.entries
    
    // 时间过滤
    if (options.startTime) {
      entries = entries.filter(e => e.timestamp >= options.startTime!)
    }
    if (options.endTime) {
      entries = entries.filter(e => e.timestamp <= options.endTime!)
    }
    
    // 级别过滤
    if (options.levels?.length) {
      entries = entries.filter(e => options.levels!.includes(e.level))
    }
    
    // 类别过滤
    if (options.categories?.length) {
      entries = entries.filter(e => options.categories!.includes(e.category))
    }
    
    // 事件过滤
    if (options.eventIds?.length) {
      entries = entries.filter(e => options.eventIds!.includes(e.eventId))
    }
    
    // 搜索文本
    if (options.search) {
      const search = options.search.toLowerCase()
      entries = entries.filter(e => 
        e.message.toLowerCase().includes(search) ||
        JSON.stringify(e.data).toLowerCase().includes(search)
      )
    }
    
    // 分页
    const limit = options.limit || 100
    const offset = options.offset || 0
    const total = entries.length
    entries = entries.slice(offset, offset + limit)
    
    return { entries, total, offset, limit }
  }
  
  // 浏览器端：返回空结果（通过 API 获取）
  return { entries: [], total: 0, offset: 0, limit: 100 }
}

// 统计查询
async getStats(timeRange?: TimeRange): Promise<LogStats> {
  if (!this.storage) {
    return { byLevel: {}, byCategory: {}, byEvent: {}, hourly: {} }
  }
  
  const data = await this.storage.load()
  return data.stats
}
```

---

### 阶段 3：API 路由暴露

| 文件 | 路由 | 方法 | 请求参数 | 响应 | 说明 |
|-----|------|------|---------|------|------|
| `config.ts` | `/api/logs` | GET | `level`, `category`, `startTime`, `endTime`, `search`, `limit`, `offset` | `LogQueryResult` | 日志查询 |
| `config.ts` | `/api/logs/stats` | GET | `startTime`, `endTime` | `LogStats` | 统计信息 |
| `config.ts` | `/api/logs/stream` | SSE | `levels` | `Server-Sent Events` | 实时日志流 |

**API 实现**:
```typescript
// config.ts:186-251
server.middlewares.use("/api/logs", async (req, res, next) => {
  const url = new URL(req.url!, "http://localhost")
  const level = url.searchParams.get("level") as LogLevel
  const category = url.searchParams.get("category")
  const startTime = url.searchParams.get("startTime")
  const endTime = url.searchParams.get("endTime")
  const search = url.searchParams.get("search")
  const limit = parseInt(url.searchParams.get("limit") || "100")
  const offset = parseInt(url.searchParams.get("offset") || "0")
  
  try {
    const queryOptions: LogQueryOptions = {
      levels: level ? [level] : undefined,
      categories: category ? [category] : undefined,
      startTime: startTime ? parseInt(startTime) : undefined,
      endTime: endTime ? parseInt(endTime) : undefined,
      search: search || undefined,
      limit,
      offset
    }
    
    const result = await system.query(queryOptions)
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify(result))
  } catch (e) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: String(e) }))
  }
})

// 统计 API
server.middlewares.use("/api/logs/stats", async (req, res) => {
  const url = new URL(req.url!, "http://localhost")
  const startTime = url.searchParams.get("startTime")
  const endTime = url.searchParams.get("endTime")
  
  try {
    const stats = await system.getStats({
      start: startTime ? parseInt(startTime) : undefined,
      end: endTime ? parseInt(endTime) : undefined
    })
    res.setHeader("Content-Type", "application/json")
    res.end(JSON.stringify(stats))
  } catch (e) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: String(e) }))
  }
})

// SSE 实时日志流
server.middlewares.use("/api/logs/stream", async (req, res) => {
  const url = new URL(req.url!, "http://localhost")
  const levels = url.searchParams.get("levels")?.split(",") || []
  
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  
  // 发送初始连接确认
  res.write(`event: connected\ndata: {"message": "Log stream connected"}\n\n`)
  
  // 监听日志事件
  const logHandler = (entry: LogEntry) => {
    if (levels.length === 0 || levels.includes(entry.level)) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    }
  }
  
  system.on('log', logHandler)
  
  // 客户端断开时清理
  req.on('close', () => {
    system.off('log', logHandler)
  })
})
```

---

### 阶段 4：Dashboard 组件渲染

| 文件 | 函数 | 输入参数 | 返回值 | 说明 |
|-----|------|---------|--------|------|
| `AgentDashboard.vue` | `setup()` | - | - | 组件初始化 |
| `AgentDashboard.vue` | `loadLogs()` | - | `Promise<void>` | 加载日志数据 |
| `AgentDashboard.vue` | `loadStats()` | - | `Promise<void>` | 加载统计信息 |
| `AgentDashboard.vue` | `setupLogStream()` | - | `void` | 建立 SSE 连接 |

**Dashboard 实现**:
```typescript
// AgentDashboard.vue:86-154
import { ref, onMounted, onUnmounted, computed } from 'vue'

// 状态
const logs = ref<LogEntry[]>([])
const stats = ref<LogStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const eventSource = ref<EventSource | null>(null)

// 筛选器
const filters = ref({
  level: '',
  category: '',
  search: '',
  startTime: '',
  endTime: ''
})

// 分页
const pagination = ref({
  page: 1,
  limit: 50,
  total: 0
})

// 加载日志
async function loadLogs() {
  loading.value = true
  error.value = null
  
  try {
    const params = new URLSearchParams({
      limit: String(pagination.value.limit),
      offset: String((pagination.value.page - 1) * pagination.value.limit)
    })
    
    if (filters.value.level) params.set('level', filters.value.level)
    if (filters.value.category) params.set('category', filters.value.category)
    if (filters.value.search) params.set('search', filters.value.search)
    
    const response = await fetch(`/api/logs?${params}`)
    const result: LogQueryResult = await response.json()
    
    logs.value = result.entries
    pagination.value.total = result.total
  } catch (e) {
    error.value = `加载日志失败: ${e}`
  } finally {
    loading.value = false
  }
}

// 加载统计
async function loadStats() {
  try {
    const response = await fetch('/api/logs/stats')
    stats.value = await response.json()
  } catch (e) {
    console.error('加载统计失败:', e)
  }
}

// SSE 实时日志
function setupLogStream() {
  const levels = ['error', 'warn', 'info']
  eventSource.value = new EventSource(`/api/logs/stream?levels=${levels.join(',')}`)
  
  eventSource.value.onmessage = (event) => {
    const entry: LogEntry = JSON.parse(event.data)
    
    // 添加到列表头部
    logs.value.unshift(entry)
    
    // 限制列表长度
    if (logs.value.length > 500) {
      logs.value = logs.value.slice(0, 500)
    }
    
    // 更新统计
    updateRealtimeStats(entry)
  }
  
  eventSource.value.onerror = () => {
    // 3秒后重连
    setTimeout(() => {
      eventSource.value?.close()
      setupLogStream()
    }, 3000)
  }
}

// 实时统计更新
function updateRealtimeStats(entry: LogEntry) {
  if (!stats.value) {
    stats.value = { byLevel: {}, byCategory: {}, byEvent: {}, hourly: {} }
  }
  
  stats.value.byLevel[entry.level] = (stats.value.byLevel[entry.level] || 0) + 1
  stats.value.byCategory[entry.category] = (stats.value.byCategory[entry.category] || 0) + 1
  stats.value.byEvent[entry.eventId] = (stats.value.byEvent[entry.eventId] || 0) + 1
  
  const hour = new Date(entry.timestamp).getHours()
  stats.value.hourly[hour] = (stats.value.hourly[hour] || 0) + 1
}

// 组件挂载
onMounted(() => {
  loadLogs()
  loadStats()
  setupLogStream()
})

// 组件卸载
onUnmounted(() => {
  eventSource.value?.close()
})
```

---

## 三、涉及文件与组件清单

### 3.1 服务端

| 文件路径 | 职责 | 关键函数 |
|---------|------|---------|
| `structured-logger.ts` | 结构化日志记录器 | `info()`, `error()`, `query()`, `getStats()` |
| `config.ts` | API 路由暴露 | `/api/logs`, `/api/logs/stats`, `/api/logs/stream` |

### 3.2 客户端

| 文件路径 | 职责 | 关键函数 |
|---------|------|---------|
| `AgentDashboard.vue` | 日志可视化仪表盘 | `loadLogs()`, `loadStats()`, `setupLogStream()` |
| `LogEntry.vue` | 单条日志条目组件 | - |
| `LogStats.vue` | 统计图表组件 | - |

---

## 四、错误兜底机制

### 4.1 错误类型与处理

| 错误类型 | 发生位置 | 兜底行为 |
|---------|---------|---------|
| 存储初始化失败 | `initializeStorage()` | 降级到仅控制台输出 |
| 日志写入失败 | `fileOutput()` | 记录到备用日志文件 |
| API 查询失败 | `/api/logs` | 返回 500 + 错误信息 |
| SSE 连接断开 | `setupLogStream()` | 3 秒后自动重连 |
| 日志过大 | 截断逻辑 | 保留最近 N 条，丢弃旧日志 |

---

## 五、目前实现的问题

### 5.1 P2 级问题

| 问题 | 影响 | 建议 |
|-----|------|------|
| 无日志轮转 | 单日志文件会无限增长 | 按天/按大小自动拆分 |
| SSE 无认证 | 日志可能被未授权访问 | 添加 API Key 校验 |
| 浏览器端无本地缓存 | 每次刷新重新加载 | IndexedDB 缓存 |
| 缺少日志聚合查询 | 复杂分析需手动处理 | 添加聚合 API |

### 5.2 性能考虑

| 场景 | 潜在问题 | 优化建议 |
|-----|---------|---------|
| 高频日志写入 | I/O 瓶颈 | 批量写入 + 内存缓冲 |
| 大量日志查询 | 响应慢 | 索引优化 + 分页 |
| 实时日志流 | 连接数过多 | 限流 + 批量推送 |

---

## 六、总结

场景四是 MetaBlog 的监控基础设施：

1. **结构化日志**: JSON 格式，支持分类、事件 ID、元数据
2. **多级输出**: 控制台 + 文件 + 浏览器事件
3. **实时流**: SSE 推送实现实时监控
4. **可视化**: Vue 组件实现 Dashboard
5. **查询能力**: 支持时间、级别、类别、文本搜索

整个系统可以记录、查询、可视化 Agent 系统的运行状态，是运维和调试的关键工具。
