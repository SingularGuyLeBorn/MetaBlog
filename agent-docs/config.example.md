# Agent 配置示例文档

> 配置文件路径: `.vitepress/agent/agent.config.js`

---

## 概述

本文档说明 `agent.config.js` 的配置格式和各项参数含义。配置采用 ES Module 格式，支持类型提示。

---

## 完整配置示例

```javascript
/** @type {import('./config/types').AgentConfig} */
export const agentConfig = {
  tasks: {
    // Arxiv 论文摘要配置
    arxivDigest: { /* ... */ },
    
    // RSS 新闻聚合配置
    rssAggregator: { /* ... */ },
    
    // 代码文档生成配置
    codeDocs: { /* ... */ },
    
    // 内容清理配置
    contentCleanup: { /* ... */ }
  },
  
  content: { /* 内容生成配置 */ },
  llm: { /* LLM 配置 */ }
}
```

---

## Task 2C: 后台任务配置

### 1. Arxiv 论文摘要 (`tasks.arxivDigest`)

```javascript
arxivDigest: {
  enabled: true,
  
  // Arxiv API 配置
  api: {
    baseUrl: 'http://export.arxiv.org/api/query',
    timeout: 30000,
    maxResults: 50
  },
  
  // 抓取分类 (见 https://arxiv.org/category_taxonomy)
  categories: [
    'cs.AI',      // 人工智能
    'cs.CL',      // 计算与语言
    'cs.LG',      // 机器学习
    'cs.CV',      // 计算机视觉
    'cs.IR',      // 信息检索
    'cs.DB'       // 数据库
  ],
  
  // 抓取参数
  fetch: {
    maxPapers: 10,
    dateRange: 'last_week',  // last_day | last_week | last_month
    sortBy: 'submittedDate', // submittedDate | lastUpdatedDate
    sortOrder: 'descending'
  },
  
  // 内容生成配置
  content: {
    targetPath: 'posts/ai-digest/',
    template: 'arxiv-digest',
    generateSummary: true,
    summaryMaxLength: 500
  },
  
  // 定时规则 (cron 表达式)
  schedule: {
    enabled: false,      // 当前手动触发
    cron: '0 9 * * 1'    // 每周一上午 9:00
  }
}
```

### 2. RSS 新闻聚合 (`tasks.rssAggregator`)

```javascript
rssAggregator: {
  enabled: true,
  
  // RSS 信源列表
  feeds: [
    {
      name: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      category: 'tech-news',
      enabled: true,
      weight: 1.0
    },
    {
      name: 'Dev.to',
      url: 'https://dev.to/feed',
      category: 'dev-community',
      enabled: true,
      weight: 0.8
    }
  ],
  
  // 内容筛选
  filter: {
    keywords: ['AI', 'LLM', 'Web Development'],
    minContentLength: 100,
    excludeKeywords: ['NSFW'],
    dedupWindowDays: 7
  },
  
  // 抓取参数
  fetch: {
    timeout: 15000,
    maxRetries: 2,
    userAgent: 'MetaUniverse-Agent/1.0',
    concurrent: 3
  },
  
  // 内容生成
  content: {
    targetPath: 'posts/news/',
    maxArticles: 5
  },
  
  // 定时规则
  schedule: {
    enabled: false,
    cron: '0 */6 * * *'  // 每 6 小时
  }
}
```

### 3. 代码文档生成 (`tasks.codeDocs`)

```javascript
codeDocs: {
  enabled: true,
  
  source: {
    basePath: './code/',
    include: ['**/*.py', '**/*.ts', '**/*.js'],
    exclude: ['**/node_modules/**', '**/*.test.*']
  },
  
  parser: {
    extractComments: true,
    extractTypes: true,
    extractFunctions: true
  },
  
  output: {
    targetPath: 'knowledge/code-docs/',
    format: 'markdown',
    singleFile: false
  },
  
  schedule: {
    enabled: false,
    cron: '0 2 * * 0'  // 每周日凌晨 2:00
  }
}
```

### 4. 内容清理 (`tasks.contentCleanup`)

```javascript
contentCleanup: {
  enabled: true,
  
  checks: {
    orphanLinks: true,     // 孤立链接
    emptyFolders: true,    // 空文件夹
    brokenImages: true,    // 损坏的图片
    duplicateTags: true,   // 重复标签
    unusedAssets: false    // 未使用资源
  },
  
  repair: {
    autoFix: false,
    moveToArchive: true,
    archivePath: '_archive/'
  },
  
  schedule: {
    enabled: false,
    cron: '0 3 1 * *'  // 每月 1 日 3:00
  }
}
```

---

## Cron 表达式说明

| 表达式 | 含义 |
|--------|------|
| `0 9 * * 1` | 每周一上午 9:00 |
| `0 */6 * * *` | 每 6 小时 |
| `0 2 * * 0` | 每周日凌晨 2:00 |
| `0 3 1 * *` | 每月 1 日凌晨 3:00 |
| `0 0 * * *` | 每天午夜 |

**格式**: `分 时 日 月 周`

---

## 环境变量覆盖

支持通过环境变量覆盖配置，格式:

```bash
AGENT_TASK_ARXIVDIGEST_MAXPAPERS=20
AGENT_TASK_RSSAGGREGATOR_FEEDS='[{"name":"Custom","url":"https://example.com/rss"}]'
```

在代码中使用:

```javascript
import { getTaskConfig } from './agent.config.js'

const config = getTaskConfig('arxivDigest')
console.log(config.fetch.maxPapers) // 20 (来自环境变量)
```

---

## Arxiv 分类参考

| 分类代码 | 名称 |
|----------|------|
| cs.AI | 人工智能 |
| cs.CL | 计算与语言 (NLP) |
| cs.LG | 机器学习 |
| cs.CV | 计算机视觉 |
| cs.IR | 信息检索 |
| cs.DB | 数据库 |
| cs.SE | 软件工程 |
| cs.CR | 密码学与安全 |
| cs.NE | 神经与进化计算 |
| cs.RO | 机器人学 |

完整列表: https://arxiv.org/category_taxonomy
