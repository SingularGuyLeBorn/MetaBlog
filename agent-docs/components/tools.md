# Tools 组件详细设计

## 基本信息

| 属性 | 值 |
|-----|-----|
| **层级** | L3 - 工具与感知层 |
| **文件位置** | `.vitepress/agent/tools/` (待创建) |
| **实现状态** | ❌ 未实现 |
| **完成度** | 0% |

## 功能设计

### 核心职责
Tools 层是系统的"手脚和感官"，负责与外部服务和编辑器交互：
1. **WebSearch**: 网络搜索、资料收集
2. **VditorBridge**: 与编辑器交互、内容插入
3. **GitOperator**: Git 版本控制操作
4. **RAGEngine**: 向量检索引擎 (本文档范围外)

## 组件清单

### 1. WebSearch 工具

**功能**: 多源网络搜索，收集最新资料

**接口设计**:

```typescript
interface WebSearchTool {
  // 通用搜索
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
  
  // 特定站点搜索
  searchArxiv(query: string): Promise<Paper[]>
  searchGoogle(query: string): Promise<SearchResult[]>
  searchGitHub(query: string): Promise<Repo[]>
  
  // 网页抓取
  fetchContent(url: string): Promise<string>
  
  // 可信度评分
  scoreCredibility(result: SearchResult): number
}

interface SearchOptions {
  sources?: ('google' | 'arxiv' | 'github' | 'wiki')[]
  maxResults?: number
  timeRange?: 'day' | 'week' | 'month' | 'year'
  recencyBias?: number  // 0-1，时间权重
}

interface SearchResult {
  title: string
  link: string
  snippet: string
  source: 'google' | 'arxiv' | 'github' | 'wiki' | 'other'
  credibility: number   // 0-1
  publishedDate?: string
}
```

**实现方案**:

```typescript
// .vitepress/agent/tools/WebSearch.ts
export class WebSearchToolImpl implements WebSearchTool {
  private serpApiKey: string
  
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    // 方案1: SerpAPI (推荐，稳定但收费)
    if (this.serpApiKey) {
      return this.searchViaSerpAPI(query, options)
    }
    
    // 方案2: 模拟搜索 (使用 LLM 生成模拟结果)
    return this.simulateSearch(query, options)
  }
  
  private async searchViaSerpAPI(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const response = await fetch(`https://serpapi.com/search?api_key=${this.serpApiKey}&q=${encodeURIComponent(query)}`)
    const data = await response.json()
    
    return data.organic_results.map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      source: 'google',
      credibility: this.calculateCredibility(r),
      publishedDate: r.date
    }))
  }
  
  // 当没有 API key 时，使用 LLM 模拟搜索结果
  private async simulateSearch(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const llm = getLLMManager()
    const prompt = `作为搜索助手，基于你的知识提供关于"${query}"的相关信息，以搜索结果格式返回。`
    
    const response = await llm.chat({ messages: [{ role: 'user', content: prompt }] })
    
    // 解析 LLM 输出为结构化结果
    return this.parseSimulatedResults(response.content)
  }
}
```

**依赖**:
- SerpAPI key (可选，用于真实搜索)
- LLM Manager (用于模拟搜索)

---

### 2. VditorBridge 工具

**功能**: 连接 Agent 与 Vditor 编辑器，实现内容操作

**接口设计**:

```typescript
interface VditorBridge {
  // 获取编辑器状态
  getContent(): string
  getSelection(): { text: string; range: Range }
  getCursorPosition(): { line: number; ch: number }
  
  // 修改内容
  setContent(content: string): void
  insertText(text: string, position?: Position): void
  replaceSelection(text: string): void
  insertAtCursor(text: string): void
  
  // 协作功能
  showInlineHint(hint: string, position: Position): void
  highlightText(range: Range, className: string): void
  clearHighlights(): void
  
  // 事件监听
  onChange(callback: (content: string) => void): void
  onSave(callback: () => void): void
  onSelectionChange(callback: () => void): void
}

interface Position {
  line: number
  ch: number
}
```

**实现方案**:

```typescript
// .vitepress/agent/tools/VditorBridge.ts
export class VditorBridgeImpl implements VditorBridge {
  private vditor: any  // Vditor 实例
  
  constructor(vditorInstance: any) {
    this.vditor = vditorInstance
  }
  
  getContent(): string {
    return this.vditor.getValue()
  }
  
  setContent(content: string): void {
    this.vditor.setValue(content)
  }
  
  insertText(text: string, position?: Position): void {
    if (position) {
      // 在指定位置插入
      const lines = this.getContent().split('\n')
      const line = lines[position.line] || ''
      lines[position.line] = line.slice(0, position.ch) + text + line.slice(position.ch)
      this.setContent(lines.join('\n'))
    } else {
      // 在光标位置插入
      this.insertAtCursor(text)
    }
  }
  
  insertAtCursor(text: string): void {
    this.vditor.insertValue(text)
  }
  
  showInlineHint(hint: string, position: Position): void {
    // 创建浮动提示元素
    const hintEl = document.createElement('div')
    hintEl.className = 'agent-inline-hint'
    hintEl.textContent = hint
    
    // 定位到编辑器指定位置
    const coords = this.vditor.vditor.ir.element.querySelector(`[data-line="${position.line}"]`)
    if (coords) {
      coords.appendChild(hintEl)
    }
  }
}
```

**与编辑器集成**:

```typescript
// 在 GlobalPageEditor.vue 中
import { VditorBridgeImpl } from '../agent/tools/VditorBridge'

const vditor = new Vditor(editorRef.value, {
  // ... Vditor 配置
})

// 创建 Bridge 实例
const vditorBridge = new VditorBridgeImpl(vditor)

// 注入到 AgentRuntime
agentRuntime.setVditorBridge(vditorBridge)
```

---

### 3. GitOperator 工具

**功能**: Git 版本控制操作，支持人工/Agent 提交区分

**接口设计**:

```typescript
interface GitOperator {
  // 基本信息
  status(): Promise<GitStatus>
  log(options?: LogOptions): Promise<CommitInfo[]>
  
  // 基本操作
  commit(options: CommitOptions): Promise<CommitResult>
  diff(from: string, to: string): Promise<DiffResult>
  
  // 分支操作
  branch(name: string): Promise<void>
  checkout(ref: string): Promise<void>
  
  // Agent 专用
  commitAsAgent(params: AgentCommitParams): Promise<CommitResult>
  revertToCheckpoint(checkpointId: string): Promise<void>
  createCheckpoint(name: string): Promise<string>
  
  // 标签/标记
  tagAgentCommit(commitHash: string, taskId: string): Promise<void>
}

interface AgentCommitParams {
  path: string
  taskId: string
  message: string
  metadata: {
    model: string
    tokens: number
    cost: number
    skill: string
  }
}

interface CommitInfo {
  hash: string
  author: { name: string; email: string }
  date: Date
  message: string
  isAgent: boolean        // 是否是 Agent 提交
  agentMetadata?: {
    taskId: string
    model: string
    tokens: number
    cost: number
  }
}
```

**实现方案**:

```typescript
// .vitepress/agent/tools/GitOperator.ts
export class GitOperatorImpl implements GitOperator {
  private apiBase: string = '/api/git'
  
  async status(): Promise<GitStatus> {
    const res = await fetch(`${this.apiBase}/status`)
    return res.json()
  }
  
  async commit(options: CommitOptions): Promise<CommitResult> {
    const res = await fetch(`${this.apiBase}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })
    return res.json()
  }
  
  async commitAsAgent(params: AgentCommitParams): Promise<CommitResult> {
    // Agent 提交使用特殊格式
    const agentMessage = `[agent:${params.taskId}] ${params.message}

Agent-Model: ${params.metadata.model}
Agent-Tokens: ${params.metadata.tokens}
Agent-Cost: $${params.metadata.cost}
Agent-Skill: ${params.metadata.skill}`

    return this.commit({
      path: params.path,
      message: agentMessage,
      author: {
        name: 'MetaUniverse Agent',
        email: 'agent@metablog.local'
      }
    })
  }
  
  async log(options: LogOptions = {}): Promise<CommitInfo[]> {
    const res = await fetch(`${this.apiBase}/log?${new URLSearchParams(options as any)}`)
    const commits = await res.json()
    
    // 解析 Agent 提交标记
    return commits.map(c => ({
      ...c,
      isAgent: c.message.startsWith('[agent:'),
      agentMetadata: this.parseAgentMetadata(c.message)
    }))
  }
  
  private parseAgentMetadata(message: string): AgentMetadata | undefined {
    if (!message.startsWith('[agent:')) return undefined
    
    const taskId = message.match(/\[agent:([^\]]+)\]/)?.[1]
    const model = message.match(/Agent-Model: (.+)/)?.[1]
    const tokens = parseInt(message.match(/Agent-Tokens: (\d+)/)?.[1] || '0')
    const cost = parseFloat(message.match(/Agent-Cost: \$(.+)/)?.[1] || '0')
    
    return { taskId, model, tokens, cost }
  }
}
```

**后端 API** (需要实现):

```typescript
// server/routes/git.ts
app.post('/api/git/commit', async (req, res) => {
  const { path, message, author } = req.body
  
  try {
    const git = simpleGit()
    await git.add(path)
    
    if (author) {
      await git.commit(message, path, { '--author': `${author.name} <${author.email}>` })
    } else {
      await git.commit(message, path)
    }
    
    res.json({ success: true, hash: (await git.log({ maxCount: 1 })).latest?.hash })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/git/log', async (req, res) => {
  const git = simpleGit()
  const log = await git.log({ maxCount: parseInt(req.query.limit as string) || 50 })
  res.json(log.all)
})

app.get('/api/git/status', async (req, res) => {
  const git = simpleGit()
  const status = await git.status()
  res.json(status)
})
```

## 实现优先级

| 工具 | 优先级 | 依赖 | 说明 |
|-----|-------|------|------|
| **GitOperator** | P0 | BFF API | 基础版本控制，区分人工/Agent 提交 |
| **VditorBridge** | P0 | Vditor 实例 | 编辑器交互，内容插入 |
| **WebSearch** | P1 | SerpAPI key | 网络搜索，增强内容创作 |

## 与 Skill 的集成

```typescript
// Skill 通过 SkillContext 访问 Tools
interface SkillContext {
  taskId: string
  memory: MemoryManager
  logger: Logger
  costTracker: CostTracker
  currentFile: string
  sessionId: string
  
  // 工具访问
  webSearch?: WebSearchTool
  git?: GitOperator
  editor?: VditorBridge
}

// WriteArticleSkill 中使用
const WriteArticleSkill: Skill = {
  name: 'WriteArticle',
  handler: async (ctx, params) => {
    // 使用 WebSearch 收集资料
    if (ctx.webSearch) {
      const research = await ctx.webSearch.search(params.topic)
      // 基于搜索结果生成文章
    }
    
    // 保存后使用 Git 提交
    await saveFile(path, content)
    if (ctx.git) {
      await ctx.git.commitAsAgent({
        path,
        taskId: ctx.taskId,
        message: `Create article: ${params.topic}`,
        metadata: { model, tokens, cost, skill: 'WriteArticle' }
      })
    }
  }
}
```

## 待实现项

1. **GitOperator**: BFF API + 前端封装
2. **VditorBridge**: 与现有编辑器集成
3. **WebSearch**: SerpAPI 接入 + 模拟回退
4. **错误处理**: 网络失败、权限问题等
