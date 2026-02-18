# 原有博客架构详解 (VitePress-Based)

> **【总-分-总】原有 MetaUniverse Blog 架构**
> 
> 本文档详细描述原有博客系统的设计，包括核心功能、技术选型和数据流。

---

## 【总】系统概述

原有 MetaUniverse Blog 是一个基于 **VitePress** 的静态博客系统，专为技术写作者设计，强调知识的连接性和可追溯性。

### 核心设计理念

```
┌─────────────────────────────────────────────────────────────────┐
│                    知识网络 (Knowledge Network)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  传统博客                    MetaUniverse Blog                  │
│  ─────────                   ─────────────────                  │
│  孤立的文章      →           连接的知识网络                      │
│  线性时间轴      →           可回溯的演进历史                    │
│  静态展示        →           可交互的探索                        │
│                                                                 │
│  核心机制：                                                      │
│  • WikiLinks: [[概念]] 语法建立知识连接                         │
│  • Git History: 完整的编辑演进轨迹                               │
│  • Knowledge Graph: 可视化的知识网络                            │
│  • Shadow Files: 代码即文档                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 功能特性总览

| 功能 | 描述 | 技术实现 |
|------|------|---------|
| **GlobalPageEditor** | 全局 Markdown 编辑器 | Vditor + BFF API |
| **HistoryViewer** | 文件历史查看与回滚 | Git Log + Diff |
| **KnowledgeGraph** | 知识图谱可视化 | Cytoscape.js |
| **RAGSearch** | 智能搜索 | FlexSearch + 模拟 RAG |
| **ShadowFiles** | 代码自动转文档 | chokidar + 模板生成 |

---

## 【分】核心功能详解

### 1. GlobalPageEditor - 全局页面编辑器

**【总】功能定位**

提供沉浸式的 Markdown 编辑体验，支持自动保存、大纲导航、实时预览。

**【分】界面结构**

```
┌─────────────────────────────────────────────────────────────────┐
│ 顶部工具栏                                                       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │ 💾 保存      │ │ 📄 大纲      │ │ ✓ 完成       │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  编辑区域 (Vditor)                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ # 文章标题                                                 │ │
│  │                                                           │ │
│  │ 正文内容支持 [[WikiLinks]] 语法...                        │ │
│  │                                                           │ │
│  │ ## 章节标题                                                │ │
│  │                                                           │ │
│  │ ```python                                                 │ │
│  │ # 代码块                                                   │ │
│  │ ```                                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 底部状态栏                                                       │
│ 字数: 1,240        最后保存: 10s前        自动保存: ✓          │
└─────────────────────────────────────────────────────────────────┘
```

**【分】技术实现**

```typescript
// GlobalPageEditor.vue 核心逻辑
interface EditorState {
  content: string
  isSaving: boolean
  lastSaved: number
  outline: OutlineItem[]
}

// 自动保存机制
const autoSave = debounce(async (content: string) => {
  await fetch('/api/files/save', {
    method: 'POST',
    body: JSON.stringify({ path: currentFile.value, content })
  })
  state.lastSaved = Date.now()
}, 3000)  // 3秒防抖

// 大纲生成
function generateOutline(content: string): OutlineItem[] {
  const headings = content.match(/^#{1,6}\s+.+$/gm) || []
  return headings.map(h => {
    const level = h.match(/^#+/)![0].length
    const text = h.replace(/^#+\s+/, '')
    return { level, text, id: slugify(text) }
  })
}
```

**【分】数据流**

```
用户输入
    ↓
VditorEditor (onChange)
    ↓
内容更新到本地状态
    ↓
触发自动保存（防抖 3s）
    ↓
POST /api/files/save
    ↓
服务端保存文件
    ↓
Git 自动提交（可选）
    ↓
返回保存成功
    ↓
更新 lastSaved 状态
```

**【总】设计要点**

```
✅ 自动保存，防止数据丢失
✅ 大纲导航，快速跳转章节
✅ 支持 WikiLinks 语法高亮
✅ 实时预览，所见即所得
✅ 快捷键支持（Ctrl+S 保存）
```

---

### 2. HistoryViewer - 历史查看器

**【总】功能定位**

查看文件的编辑历史，支持 Diff 对比和版本回滚。

**【分】界面结构**

```
┌─────────────────────────────────────────────────────────────────┐
│ 历史查看器                                          [✕] 关闭   │
├─────────────────────────────────────────────────────────────────┤
│ 文件历史    │ 文件夹历史                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 提交列表                          │  Diff 对比                    │
│                                   │                              │
│  ┌─────────────────────────────┐  │  ┌────────────────────────┐ │
│  │ abc1234 更新首页内容         │  │  │ - 旧内容               │ │
│  │ 2小时前 • 作者              │  │  │ + 新内容               │ │
│  └─────────────────────────────┘  │  │                        │ │
│  ┌─────────────────────────────┐  │  │ @@ -1,5 +1,5 @@       │ │
│  │ def5678 添加新段落           │  │  │  - 删除的行           │ │
│  │ 昨天 • 作者                 │  │  │  + 添加的行           │ │
│  └─────────────────────────────┘  │  │                        │ │
│  ┌─────────────────────────────┐  │  └────────────────────────┘ │
│  │ hij9012 初始化文章          │  │                              │
│  │ 3天前 • 作者                │  │  [回滚到此版本]              │
│  └─────────────────────────────┘  │                              │
│                                   │                              │
└─────────────────────────────────────────────────────────────────┘
```

**【分】技术实现**

```typescript
// HistoryViewer.vue 核心逻辑
interface CommitInfo {
  hash: string
  message: string
  author: string
  date: string
  body?: string
}

// 加载提交历史
async function loadHistory(path: string): Promise<CommitInfo[]> {
  const res = await fetch(`/api/git/log?path=${encodeURIComponent(path)}`)
  const logs = await res.json()
  return logs.map((log: any) => ({
    hash: log.hash.substring(0, 7),
    message: log.message.split('\n')[0],
    author: log.author_name,
    date: formatRelativeTime(log.date)
  }))
}

// 查看 Diff
async function viewDiff(from: string, to: string) {
  const res = await fetch(`/api/git/diff?from=${from}&to=${to}`)
  const { diff } = await res.json()
  diffHtml.value = renderDiff(diff)  // 使用 diff2html 或自定义渲染
}

// 回滚版本
async function rollback(commitHash: string) {
  if (!confirm('确定要回滚到这个版本吗？')) return
  
  await fetch('/api/git/checkout', {
    method: 'POST',
    body: JSON.stringify({ commit: commitHash, path: currentFile.value })
  })
  
  // 重新加载文件内容
  await reloadContent()
}
```

**【分】Git 集成 API**

```typescript
// server/routes/git.ts
import simpleGit from 'simple-git'

const git = simpleGit('docs')

// 获取提交日志
app.get('/api/git/log', async (req, res) => {
  const { path } = req.query
  const log = await git.log({ file: path as string })
  res.json(log.all)
})

// 获取 Diff
app.get('/api/git/diff', async (req, res) => {
  const { from, to } = req.query
  const diff = await git.diff([`${from}..${to}`])
  res.json({ diff })
})

// 回滚到指定版本
app.post('/api/git/checkout', async (req, res) => {
  const { commit, path } = req.body
  await git.checkout(commit, [path])
  res.json({ success: true })
})
```

---

### 3. KnowledgeGraph - 知识图谱

**【总】功能定位**

可视化展示 WikiLinks 构成的知识网络，支持节点探索。

**【分】数据结构**

```typescript
// 图谱节点
interface GraphNode {
  id: string           // 节点 ID（文章路径或概念名）
  label: string        // 显示标签
  type: 'article' | 'concept' | 'code' | 'external'
  url?: string         // 跳转链接
  color?: string       // 节点颜色
  size?: number        // 节点大小
}

// 图谱边
interface GraphEdge {
  source: string       // 源节点 ID
  target: string       // 目标节点 ID
  label?: string       // 边标签
  color?: string       // 边颜色
}

// 图谱数据
interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
```

**【分】WikiLinks 解析**

```typescript
// 从 Markdown 提取 WikiLinks
function extractWikiLinks(content: string, sourceFile: string): GraphEdge[] {
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  const edges: GraphEdge[] = []
  
  let match
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const target = match[1].trim()
    edges.push({
      source: sourceFile,
      target: normalizePath(target),
      label: 'links to'
    })
  }
  
  return edges
}

// 构建完整图谱
async function buildKnowledgeGraph(): Promise<GraphData> {
  const articles = await getAllArticles()
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeSet = new Set<string>()
  
  for (const article of articles) {
    // 添加文章节点
    if (!nodeSet.has(article.path)) {
      nodes.push({
        id: article.path,
        label: article.title,
        type: 'article',
        url: article.url,
        color: '#4a90e2'
      })
      nodeSet.add(article.path)
    }
    
    // 提取链接
    const links = extractWikiLinks(article.content, article.path)
    
    for (const link of links) {
      // 添加目标节点（如果不存在）
      if (!nodeSet.has(link.target)) {
        const exists = await articleExists(link.target)
        nodes.push({
          id: link.target,
          label: link.target,
          type: exists ? 'concept' : 'external',
          url: exists ? `/${link.target}` : undefined,
          color: exists ? '#50c878' : '#999'
        })
        nodeSet.add(link.target)
      }
      
      edges.push(link)
    }
  }
  
  return { nodes, edges }
}
```

**【分】可视化渲染**

```vue
<template>
  <div ref="container" class="knowledge-graph"></div>
</template>

<script setup lang="ts">
import cytoscape from 'cytoscape'

const container = ref<HTMLElement>()
let cy: cytoscape.Core

onMounted(async () => {
  const data = await buildKnowledgeGraph()
  
  cy = cytoscape({
    container: container.value,
    elements: [
      ...data.nodes.map(n => ({ data: n })),
      ...data.edges.map(e => ({ data: e }))
    ],
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'background-color': 'data(color)',
          'width': 'data(size)',
          'height': 'data(size)',
          'font-size': '12px',
          'text-valign': 'center',
          'text-halign': 'center'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#ccc',
          'target-arrow-color': '#ccc',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        }
      }
    ],
    layout: {
      name: 'cose',  // 力导向布局
      padding: 10,
      nodeRepulsion: 4500,
      edgeElasticity: 100,
      gravity: 0.5
    }
  })
  
  // 点击节点跳转
  cy.on('tap', 'node', (evt) => {
    const node = evt.target.data()
    if (node.url) {
      window.open(node.url, '_blank')
    }
  })
})
</script>
```

**【总】设计要点**

```
✅ 力导向布局，自动优化节点位置
✅ 颜色区分：文章(蓝)、概念(绿)、外部(灰)
✅ 点击节点跳转对应页面
✅ 支持缩放和平移
✅ 实时响应数据变化
```

---

### 4. RAGSearch - 智能搜索

**【总】功能定位**

提供比传统搜索更智能的检索体验，展示相关上下文而非仅标题匹配。

**【分】当前实现 (FlexSearch)

```typescript
// 基于 FlexSearch 的本地搜索
import FlexSearch from 'flexsearch'

// 创建索引
const index = new FlexSearch.Document({
  document: {
    id: 'path',
    index: ['title', 'content']
  }
})

// 添加文档到索引
async function buildSearchIndex() {
  const articles = await getAllArticles()
  
  for (const article of articles) {
    index.add({
      path: article.path,
      title: article.title,
      content: article.content.substring(0, 10000)  // 限制长度
    })
  }
}

// 搜索
function search(query: string): SearchResult[] {
  const results = index.search(query, { limit: 10 })
  
  return results.map(r => ({
    path: r.id,
    title: r.doc.title,
    excerpt: generateExcerpt(r.doc.content, query),
    score: r.score
  }))
}

// 生成摘要
function generateExcerpt(content: string, query: string): string {
  const index = content.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return content.substring(0, 200) + '...'
  
  const start = Math.max(0, index - 100)
  const end = Math.min(content.length, index + query.length + 100)
  
  return (start > 0 ? '...' : '') + 
         content.substring(start, end) + 
         (end < content.length ? '...' : '')
}
```

**【分】模拟 RAG 展示**

```
搜索结果页面
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 搜索结果: "RAG 技术"                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 基于 RAG 的 LLM 应用                                  │   │
│  │                                                         │   │
│  │ ...检索增强生成（RAG）是一种结合检索和生成的技术...      │   │
│  │                                                         │   │
│  │ 相关度: 95%  •  来源: posts/rag-application.md          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📄 LLM 架构设计                                          │   │
│  │                                                         │   │
│  │ ...RAG 模式可以有效解决大模型的幻觉问题...               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Shadow Files - 代码即文档

**【总】功能定位**

自动将代码文件转换为 Markdown 文档，实现代码的文档化展示。

**【分】工作流程**

```
code/python/transformer.py  创建/修改
            ↓
    chokidar 监听到变化
            ↓
    ShadowFileGenerator 处理
            ↓
    ┌─────────────────────────────────────────┐
    │ 1. 读取代码文件                          │
    │ 2. 识别编程语言                          │
    │ 3. 应用代码高亮                          │
    │ 4. 生成 Markdown 包装                    │
    └─────────────────────────────────────────┘
            ↓
    保存到 code/python/transformer.py.md
            ↓
    VitePress 渲染为页面
```

**【分】实现代码**

```typescript
// ShadowFileGenerator.ts
import chokidar from 'chokidar'
import fs from 'fs/promises'
import path from 'path'

class ShadowFileGenerator {
  private watcher: chokidar.FSWatcher
  
  constructor(watchDir: string) {
    this.watcher = chokidar.watch(`${watchDir}/**/*.{py,js,ts,java,go,rs}`, {
      ignored: /\.md$/,  // 忽略已生成的 md 文件
      persistent: true
    })
    
    this.watcher
      .on('add', (filePath) => this.generateShadow(filePath))
      .on('change', (filePath) => this.generateShadow(filePath))
      .on('unlink', (filePath) => this.removeShadow(filePath))
  }
  
  async generateShadow(sourcePath: string): Promise<void> {
    const content = await fs.readFile(sourcePath, 'utf-8')
    const ext = path.extname(sourcePath).slice(1)
    const shadowPath = `${sourcePath}.md`
    
    const markdown = this.wrapInMarkdown(sourcePath, content, ext)
    
    await fs.writeFile(shadowPath, markdown)
    console.log(`Generated shadow file: ${shadowPath}`)
  }
  
  private wrapInMarkdown(
    sourcePath: string, 
    content: string, 
    language: string
  ): string {
    const fileName = path.basename(sourcePath)
    
    return `---
title: ${fileName}
codeSource: ${sourcePath}
---

# ${fileName}

> 此文件由 Shadow File 系统自动生成
> 
> 源文件: \`${sourcePath}\`

## 源代码

\`\`\`${language}
${content}
\`\`\`
`
  }
  
  async removeShadow(sourcePath: string): Promise<void> {
    const shadowPath = `${sourcePath}.md`
    try {
      await fs.unlink(shadowPath)
      console.log(`Removed shadow file: ${shadowPath}`)
    } catch {
      // 文件可能不存在
    }
  }
}

// 使用
const generator = new ShadowFileGenerator('docs/code')
```

---

## 【总】技术架构总结

### 技术栈全景

```
Frontend (VitePress)
├── VitePress 1.x        # 静态站点生成
├── Vue 3 + TypeScript   # 组件开发
├── Vditor 3.x           # Markdown 编辑器
├── Cytoscape.js 3.x     # 图可视化
├── FlexSearch 0.7.x     # 本地搜索
└── Diff.js              # Diff 计算

Backend (BFF)
├── Express.js 4.x       # API 服务
├── simple-git           # Git 操作
├── chokidar             # 文件监听
└── CORS / Body Parser   # 中间件

Build & Deploy
├── Vite                 # 构建工具
├── GitHub Actions       # CI/CD
└── GitHub Pages / Vercel # 部署
```

### 数据流总结

```
用户编辑 (GlobalPageEditor)
    ↓
Vditor (实时预览)
    ↓
自动保存 → BFF API
    ↓
文件系统保存
    ↓
Git 提交 (可选)
    ↓
构建时重新索引 (FlexSearch)
    ↓
静态站点生成

代码文件保存
    ↓
chokidar 监听
    ↓
Shadow File 生成
    ↓
包含在构建中
```

### 与 Agent 架构的融合点

```
原有组件              融合方式                    Agent 增强
────────────────────────────────────────────────────────────
GlobalPageEditor  →  GlobalPageEditorAGI      三模态编辑
HistoryViewer     →  HistoryViewerAGI         Agent 操作历史
KnowledgeGraph    →  KnowledgeGraph + AI      自动知识发现
RAGSearch         →  RAGSearch (真实 RAG)      向量检索
Shadow Files      →  Shadow + AI 文档         自动生成教学文档
```

---

*文档版本: 1.0*  
*关联文档: [Agent 五层架构](./agent-five-layer.md), [整体架构概览](./overview.md)*
