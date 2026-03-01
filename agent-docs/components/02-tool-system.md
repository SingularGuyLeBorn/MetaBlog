# 工具系统详细设计

## 概述

工具系统是 MetaBlog AI 的核心能力扩展机制，允许 Agent 调用外部功能来完成复杂任务。

## 架构设计

```
Tool System
├── Registry (注册表)
│   ├── registerTool()      # 注册工具
│   ├── executeTool()       # 执行工具
│   └── getToolDefinitions() # 获取工具定义
├── Definitions (定义层)
│   ├── 文章管理工具 (6个)
│   ├── 文件操作工具 (3个)
│   ├── 网络工具 (4个)
│   ├── GitHub 工具 (6个)
│   ├── 代码工具 (3个)
│   ├── 平台解析工具 (10个)
│   └── 富文本工具 (4个)
└── Executors (执行层)
    ├── 本地执行 (浏览器环境)
    └── 远程调用 (后端 API)
```

---

## 1. 工具注册表

### 核心 API

```typescript
// 注册单个工具
function registerTool(name: string, tool: ToolRegistration): void

// 批量注册工具
function registerTools(tools: ToolRegistration[]): void

// 获取工具
function getTool(name: string): ToolRegistration | undefined

// 执行工具
function executeTool(name: string, args: Record<string, any>): Promise<string>

// 获取所有工具定义（用于传给 LLM）
function getToolDefinitions(): ToolDefinition[]

// 检查工具是否存在
function hasTool(name: string): boolean
```

### 数据结构

```typescript
interface ToolRegistration {
  name: string
  definition: ToolDefinition    // 告诉 AI 这是什么工具
  executor: ToolExecutor        // 实际执行的函数
}

type ToolExecutor = (args: Record<string, any>) => Promise<string>

interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string        // 告诉 AI 什么时候用这个工具
    parameters: {
      type: 'object'
      properties: Record<string, {
        type: string
        description: string
        enum?: string[]         // 可选：枚举值
      }>
      required: string[]        // 必填参数
    }
  }
}
```

---

## 2. 工具调用流程

```
用户输入: "帮我搜索关于 React 的文章"
    ↓
LLM 分析: 需要调用 search_articles 工具
    ↓
返回工具调用请求:
{
  "tool_calls": [{
    "name": "search_articles",
    "arguments": {"query": "React", "limit": 5}
  }]
}
    ↓
系统执行工具:
const result = await executeTool('search_articles', {query: 'React', limit: 5})
    ↓
将结果返回给 LLM:
{
  "role": "tool",
  "content": "找到5篇文章: 1. React入门..."
}
    ↓
LLM 生成最终回复:
"我找到了5篇关于 React 的文章: ..."
```

---

## 3. 工具分类详解

### 3.1 文章管理工具

| 工具名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| `get_article_content` | 获取文章内容 | `path`, `max_length?` | 文章内容 |
| `search_articles` | 搜索文章 | `query`, `limit?` | 文章列表 |
| `list_articles` | 列出文章 | `section?`, `folder_path?` | 目录树 |
| `create_article` | 创建文章 | `title`, `path`, `content` | 创建结果 |
| `update_article` | 更新文章 | `path`, `content`, `mode?` | 更新结果 |
| `delete_article` | 删除文章 | `path`, `confirm?` | 删除结果 |

**示例**

```typescript
// 创建文章
const result = await executeTool('create_article', {
  title: 'React 最佳实践',
  path: 'frontend/react-best-practices.md',
  content: '# React 最佳实践\n\n...',
  tags: ['React', 'Frontend'],
  category: '技术'
})
```

### 3.2 平台解析工具

| 工具名 | 平台 | 功能 |
|--------|------|------|
| `parse_zhihu` | 知乎 | 解析问题/文章/回答 |
| `parse_xiaohongshu` | 小红书 | 解析笔记 |
| `parse_wechat` | 微信公众号 | 解析文章 |
| `parse_bilibili` | B站 | 解析视频信息 |
| `parse_douyin` | 抖音 | 解析视频 |
| `parse_csdn` | CSDN | 解析技术文章 |
| `parse_juejin` | 掘金 | 解析文章 |
| `parse_weibo` | 微博 | 解析微博内容 |
| `parse_twitter` | Twitter/X | 解析推文 |
| `parse_youtube` | YouTube | 解析视频信息 |
| `parse_multiple_links` | 多平台 | 批量解析多个链接 |

**实现原理**

```typescript
// platform-parsers-extended.ts
export const parseBilibiliExecutor = async (args: { url: string }) => {
  const { url } = args
  
  // 1. 提取 BV 号
  const bvMatch = url.match(/bv([a-zA-Z0-9]+)/i)
  if (!bvMatch) return '无法识别 B站链接'
  
  // 2. 调用后端代理 API（避免 CORS）
  const response = await fetch('/api/proxy/bilibili', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: bvMatch[1] })
  })
  
  // 3. 格式化输出
  const data = await response.json()
  return `📺 **${data.title}**
👤 UP主: ${data.owner.name}
▶️ 播放量: ${data.stat.view}
🔗 ${url}`
}
```

### 3.3 GitHub 工具

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `github_get_repo` | 获取仓库信息 | `owner`, `repo` |
| `github_list_repo_contents` | 列出目录内容 | `owner`, `repo`, `path?` |
| `github_get_file_content` | 获取文件内容 | `owner`, `repo`, `path` |
| `github_search_code` | 搜索代码 | `query`, `language?` |
| `github_get_commit_history` | 获取提交历史 | `owner`, `repo` |
| `github_get_issues` | 获取 Issues | `owner`, `repo`, `state?` |

**示例**

```typescript
// 获取 React 仓库信息
const result = await executeTool('github_get_repo', {
  owner: 'facebook',
  repo: 'react'
})

// 搜索代码
const result = await executeTool('github_search_code', {
  query: 'useState hook',
  language: 'typescript'
})
```

### 3.4 富文本文章工具

| 工具名 | 功能 | 参数 |
|--------|------|------|
| `create_rich_article` | 创建富文本文章 | `title`, `path`, `blocks[]` |
| `insert_images` | 插入图片 | `articlePath`, `images[]`, `layout?` |
| `create_linked_article` | 创建带链接文章 | `title`, `path`, `content`, `links[]` |
| `format_rich_media` | 格式化文章样式 | `articlePath`, `style?` |

**create_rich_article 示例**

```typescript
const result = await executeTool('create_rich_article', {
  title: 'AI 绘画入门指南',
  path: 'AI/ai-painting-guide.md',
  blocks: [
    { type: 'heading', level: 2, content: '什么是 AI 绘画' },
    { type: 'text', content: 'AI 绘画是利用人工智能...' },
    { type: 'image', url: '/uploads/example.jpg', alt: '示例', caption: 'AI 生成的图片' },
    { type: 'code', language: 'python', content: 'prompt = "a beautiful sunset"' },
    { type: 'link', link: { text: '查看更多', url: 'https://example.com' } },
    { type: 'list', items: ['Stable Diffusion', 'Midjourney', 'DALL-E'] }
  ],
  tags: ['AI', '绘画'],
  category: '技术'
})
```

**图片布局选项**

```typescript
// insert_images 布局
{
  layout: 'grid'     // 网格布局
  layout: 'carousel' // 轮播布局
  layout: 'vertical' // 垂直排列（默认）
}
```

---

## 4. 工具执行追踪

### 追踪数据结构

```typescript
interface ToolCallRecord {
  id: string                    // 唯一 ID
  toolName: string              // 工具名称
  args: Record<string, any>     // 调用参数
  status: 'pending' | 'running' | 'success' | 'error'
  result?: string               // 执行结果
  error?: string                // 错误信息
  startTime: number             // 开始时间
  endTime?: number              // 结束时间
}
```

### 执行过程追踪

```typescript
export async function executeToolWithRecord(
  name: string, 
  args: Record<string, any>
): Promise<{ result: string; record: ToolCallRecord }> {
  
  // 1. 创建记录
  const record: ToolCallRecord = {
    id: `call_${Date.now()}`,
    toolName: name,
    args,
    status: 'running',
    startTime: Date.now()
  }
  
  try {
    // 2. 执行工具
    const result = await executeTool(name, args)
    
    // 3. 更新成功状态
    record.status = 'success'
    record.result = result
    record.endTime = Date.now()
    
    return { result, record }
    
  } catch (error) {
    // 4. 更新错误状态
    record.status = 'error'
    record.error = error instanceof Error ? error.message : String(error)
    record.endTime = Date.now()
    
    throw error
  }
}
```

---

## 5. 工具开发指南

### 5.1 创建新工具

**步骤 1：定义工具 Schema**

```typescript
// definitions.ts
export const myNewToolDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'my_new_tool',
    description: `详细描述这个工具是做什么的，什么时候使用。
    
使用场景：
1. 场景一
2. 场景二

注意事项：
- 注意点一
- 注意点二`,
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: '参数1的详细说明，例如："示例值"'
        },
        param2: {
          type: 'number',
          description: '参数2的说明',
          minimum: 1,
          maximum: 100
        }
      },
      required: ['param1']
    }
  }
}
```

**步骤 2：实现执行函数**

```typescript
// executors-legacy.ts
export const myNewTool = async (args: { param1: string; param2?: number }): Promise<string> => {
  try {
    // 实现逻辑
    const result = await doSomething(args.param1, args.param2)
    
    // 返回格式化结果
    return `✅ 操作成功！\n\n${result}`
    
  } catch (error) {
    // 错误处理
    return `❌ 操作失败: ${error instanceof Error ? error.message : String(error)}`
  }
}
```

**步骤 3：注册工具**

```typescript
// tools/index.ts
import { myNewToolDef, myNewTool } from './executors-legacy'

export function initializeDefaultTools(): void {
  registerTools([
    // ... 其他工具
    { name: 'my_new_tool', definition: myNewToolDef, executor: myNewTool }
  ])
}
```

### 5.2 工具命名规范

| 类型 | 命名格式 | 示例 |
|------|---------|------|
| 文章操作 | `{action}_article` | `create_article`, `update_article` |
| 文件操作 | `{action}_file` | `read_file`, `write_file` |
| 平台解析 | `parse_{platform}` | `parse_zhihu`, `parse_bilibili` |
| GitHub | `github_{action}` | `github_get_repo`, `github_search_code` |
| 富文本 | `{action}_rich_{type}` | `create_rich_article`, `format_rich_media` |

### 5.3 错误处理最佳实践

```typescript
export const robustToolExecutor = async (args: Record<string, any>): Promise<string> => {
  // 1. 参数验证
  if (!args.required_param) {
    return '❌ 错误：缺少必需参数 required_param'
  }
  
  // 2. 类型检查
  if (typeof args.limit !== 'number' || args.limit < 1) {
    return '❌ 错误：limit 必须是正整数'
  }
  
  // 3. 业务逻辑验证
  if (args.limit > 100) {
    return '❌ 错误：limit 不能超过 100'
  }
  
  try {
    // 4. 执行操作
    const result = await performAction(args)
    
    // 5. 结果处理
    if (!result) {
      return '⚠️ 没有找到结果'
    }
    
    return formatSuccess(result)
    
  } catch (error) {
    // 6. 错误分类
    if (error instanceof NetworkError) {
      return `❌ 网络错误: ${error.message}\n请检查网络连接后重试`
    }
    if (error instanceof PermissionError) {
      return `❌ 权限错误: ${error.message}\n请检查是否有足够的权限`
    }
    
    return `❌ 未知错误: ${error instanceof Error ? error.message : String(error)}`
  }
}
```

---

## 6. 工具与 Skill 绑定

### 创建带工具的 Skill

```typescript
const researchSkill = {
  id: 'research',
  name: '研究助手',
  description: '帮助用户进行资料搜集和研究',
  icon: '🔍',
  category: 'research',
  content: `
## 研究助手

你是一个专业的研究助手，擅长搜集和整理资料。

### 你的工作流程
1. 使用 web_search 搜索相关资料
2. 使用 parse_platform_link 解析感兴趣的链接
3. 使用 create_note 记录重要发现
4. 使用 create_article 撰写研究报告

### 注意事项
- 确保信息来源可靠
- 记录引用来源
- 交叉验证重要信息
  `,
  tools: [
    'web_search',
    'parse_platform_link',
    'fetch_url',
    'create_note',
    'create_article',
    'summarize_text'
  ],
  usageScenarios: [
    '用户要求研究某个主题',
    '用户要求搜集资料',
    '用户要求写研究报告'
  ],
  isBuiltIn: true
}
```

---

## 7. 工具性能优化

### 7.1 缓存策略

```typescript
// 工具结果缓存
const toolResultCache = new Map<string, { result: string; timestamp: number }>()

export async function executeToolWithCache(
  name: string, 
  args: Record<string, any>,
  ttl: number = 60000  // 默认缓存 1 分钟
): Promise<string> {
  const cacheKey = `${name}_${JSON.stringify(args)}`
  const cached = toolResultCache.get(cacheKey)
  
  // 检查缓存
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.result
  }
  
  // 执行并缓存
  const result = await executeTool(name, args)
  toolResultCache.set(cacheKey, { result, timestamp: Date.now() })
  
  return result
}
```

### 7.2 并发控制

```typescript
// 批量执行工具（限制并发数）
export async function executeToolsBatch(
  calls: Array<{ name: string; args: Record<string, any> }>,
  concurrency: number = 3
): Promise<string[]> {
  const results: string[] = []
  
  // 分批执行
  for (let i = 0; i < calls.length; i += concurrency) {
    const batch = calls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(call => executeTool(call.name, call.args))
    )
    results.push(...batchResults)
  }
  
  return results
}
```

---

## 8. 工具调试

### 8.1 日志记录

```typescript
export async function executeToolWithLog(
  name: string,
  args: Record<string, any>
): Promise<string> {
  console.log(`[Tool] Executing: ${name}`, args)
  
  const startTime = Date.now()
  
  try {
    const result = await executeTool(name, args)
    const duration = Date.now() - startTime
    
    console.log(`[Tool] Success: ${name} (${duration}ms)`)
    return result
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Tool] Error: ${name} (${duration}ms)`, error)
    throw error
  }
}
```

### 8.2 工具测试器

```typescript
// 工具测试组件
<ToolTester 
  :tool="selectedTool"
  @test="async (args) => {
    const result = await executeTool(selectedTool.name, args)
    testResult.value = result
  }"
/>
```
