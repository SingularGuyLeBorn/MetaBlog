# Agent + MCP 内容管理系统架构

## 系统概述

基于 Agent 和 MCP (Model Context Protocol) 的内容采集与管理系统，支持从社交媒体自动提取内容并发布到 VitePress 站点。

## 核心组件

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MetaAgent (编排器)                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  - 定时任务调度 (Cron)                                               │   │
│  │  - Agent 协调 (ContentAgent + StorageAgent)                         │   │
│  │  - 内容审核决策                                                      │   │
│  │  - 发布策略管理                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ContentAgent   │    │  StorageAgent   │    │  ReviewAgent    │
│  (内容提取)      │    │  (文件存储)      │    │  (内容审核)      │
└────────┬────────┘    └────────┬────────┘    └─────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MCP 工具集                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ URL Fetcher  │ │ Social Media │ │ File Operator│ │ Scheduler│ │
│  │ (网页提取)    │ │ (社媒读取)    │ │ (文件操作)    │ │ (定时器)  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Agent 职责

### 1. ContentAgent (内容提取 Agent)
**职责**: 从各种来源提取内容

**能力**:
- 读取网页内容 (Jina Reader)
- 提取社交媒体内容 (小红书、B站、Twitter)
- 解析视频字幕 (yt-dlp)
- 内容摘要和关键词提取

**输入**: URL / 平台链接
**输出**: 结构化内容 (标题、正文、图片、标签、作者)

### 2. StorageAgent (存储 Agent)
**职责**: 管理内容存储和发布

**能力**:
- 创建/更新 Markdown 文件
- 管理 Frontmatter
- 图片下载和本地化
- Git 提交和推送

**输入**: 结构化内容 + 目标路径
**输出**: 文件系统操作 + Git 提交

### 3. ReviewAgent (审核 Agent) - 可选
**职责**: 内容质量审核

**能力**:
- 内容质量评分
- 重复检测
- 敏感词过滤

### 4. MetaAgent (编排 Agent)
**职责**: 高级任务调度和协调

**能力**:
- 定时任务执行 (每天搜索指定平台)
- 多 Agent 协作流程
- 决策制定 (是否发布、发布到哪里)
- 错误处理和重试

## MCP 工具集

### Tool 1: url-fetcher
```typescript
interface URLFetcherInput {
  url: string;
  type: 'article' | 'video' | 'social';
}

interface URLFetcherOutput {
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  images: string[];
  tags: string[];
  platform: string;
}
```

**实现方式**:
- 通用网页: Jina Reader API
- 视频: yt-dlp 提取字幕
- 社交媒体: 专用解析器

### Tool 2: social-media-reader
```typescript
interface SocialMediaInput {
  platform: 'xiaohongshu' | 'bilibili' | 'twitter' | 'weibo';
  url: string;
  // 可选: Cookie 配置
}

interface SocialMediaOutput {
  title: string;
  content: string;
  author: string;
  likes: number;
  comments: number;
  images: string[];
  videoUrl?: string;
}
```

**实现方式**:
- 小红书: xiaohongshu-mcp (Docker)
- B站: yt-dlp
- Twitter: xreach + Cookie
- 微博: 内置解析

### Tool 3: file-operator
```typescript
interface FileOperator {
  // 创建/更新文章
  saveArticle(path: string, content: ArticleContent): Promise<void>;
  
  // 下载图片
  downloadImage(url: string, savePath: string): Promise<string>;
  
  // 读取 Frontmatter
  readFrontmatter(path: string): Promise<Frontmatter>;
  
  // Git 操作
  gitCommit(files: string[], message: string): Promise<void>;
  gitPush(): Promise<void>;
}
```

### Tool 4: scheduler
```typescript
interface Scheduler {
  // 创建定时任务
  schedule(cron: string, task: Task): void;
  
  // 立即执行
  runNow(task: Task): void;
  
  // 任务列表
  listTasks(): Task[];
}
```

## 数据流

### 场景 1: 用户发送链接 → Agent 存储

```
用户输入链接
    ↓
ContentAgent 接收任务
    ↓
调用 MCP: url-fetcher / social-media-reader
    ↓
提取结构化内容
    ↓
StorageAgent 接收内容
    ↓
调用 MCP: file-operator
    ↓
保存文件到指定位置
    ↓
Git commit & push
```

### 场景 2: MetaAgent 定时采集

```
MetaAgent Cron 触发 (每天 9:00)
    ↓
调用 ContentAgent 搜索指定平台
    ↓
批量提取内容
    ↓
ReviewAgent 审核 (可选)
    ↓
MetaAgent 决策
    ↓
StorageAgent 保存通过审核的内容
    ↓
汇总报告给 MetaAgent
```

## 与 VitePress 集成

### 1. 内容存储规范

```
docs/
├── sections/
│   ├── posts/              # 文章
│   │   └── {auto-generated}
│   ├── resources/          # 资源
│   │   └── {auto-generated}
│   └── knowledge/          # 知识库
│       └── {auto-generated}
└── .agent-content/         # Agent 工作目录
    ├── queue/              # 待处理内容
    ├── processed/          # 已处理内容
    └── failed/             # 失败内容
```

### 2. Frontmatter 模板

```yaml
---
title: {自动提取的标题}
description: {自动摘要}
author: {原作者}
source: {原始链接}
platform: {平台名称}
crawlDate: {采集日期}
publishDate: {原始发布日期}
tags: [{自动标签}]
status: draft | published
agentId: {采集 Agent ID}
---
```

### 3. 管理界面

在 VitePress 中添加 Agent Dashboard:
- 查看采集队列
- 手动触发采集
- 审核待发布内容
- 配置定时任务

## 技术栈

- **Agent 框架**: 自研轻量级 Agent 系统
- **MCP 协议**: Model Context Protocol
- **内容提取**: Jina Reader, yt-dlp, 专用 MCP 服务
- **文件操作**: Node.js fs + simple-git
- **定时任务**: node-cron
- **身份管理**: Agent-ID (未来集成)

## 安全考虑

1. **Cookie 管理**: 本地存储，不上传
2. **权限控制**: Agent 只能操作指定目录
3. **内容审核**: 自动 + 人工双重审核
4. **日志记录**: 所有操作可追溯

## 扩展性

1. **新平台支持**: 添加新的 MCP Tool
2. **新 Agent 类型**: 垂直领域 Agent
3. **AI 模型切换**: 支持不同 LLM 提供商
