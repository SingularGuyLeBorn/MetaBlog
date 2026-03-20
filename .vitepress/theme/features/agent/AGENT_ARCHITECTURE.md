# Agent + MCP 内容自动化系统 v2.0

## 架构设计

参考项目：
- **agent-id.dev** - Agent 身份管理（邮箱、手机号、钱包绑定）
- **agentreach** - 浏览器自动化（视觉感知 + 操作）
- **Google Workspace CLI** - Agent 专用浏览器操作接口

```
┌─────────────────────────────────────────────────────────────────┐
│                     MetaAgent (编排中心)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 调度器       │  │ 工作流引擎   │  │ 离线托管模式             │  │
│  │ Scheduler   │  │ Workflow    │  │ (Cron + Webhook)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼──────┐    ┌────────▼───────┐    ┌───────▼────────┐
│ ContentAgent │    │  BrowserAgent  │    │  SearchAgent   │
│ (URL提取)     │    │ (浏览器自动化)  │    │ (定时搜索)      │
└──────────────┘    └────────────────┘    └────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                      MCP 工具层                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ URL获取   │ │ 社媒读取  │ │ 浏览器    │ │ 文件操作  │           │
│  │ Jina AI  │ │ xhs/bili │ │ Playwright│ │ Git/FS   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Agent 类型

### 1. ContentAgent（已有）
负责从 URL 提取内容
- 支持普通网页（Jina AI）
- 支持社交媒体链接解析

### 2. BrowserAgent（新增）
基于 Playwright 的真实浏览器自动化
- **能力**：模拟人类浏览行为
- **平台**：小红书、B站、Twitter、知乎等
- **功能**：登录、滚动、截图、内容提取
- **感知**：页面截图分析（Agent 的"眼睛"）

### 3. SearchAgent（新增）
定时搜索发现新内容
- **源**：平台热门、关键词搜索、作者订阅
- **频率**：每小时/每天/每周
- **输出**：待处理链接队列

### 4. MetaAgent（已有，增强）
编排所有 Agent 的调度中心
- **离线托管**：支持长期运行模式
- **工作流**：定义复杂的内容处理流程
- **决策**：基于规则的内容筛选和分类

## Agent Identity 系统

每个 Agent 拥有独立身份：

```typescript
interface AgentIdentity {
  id: string           // 唯一标识
  name: string         // 显示名称
  avatar?: string      // 头像
  
  // 联系方式
  email?: string       // 专用邮箱
  phone?: string       // 手机号
  
  // Web3 身份
  wallet?: {
    address: string
    chain: 'ethereum' | 'solana' | 'bitcoin'
  }
  
  // 平台账号
  accounts: {
    platform: string
    username: string
    cookie?: string
    isLoggedIn: boolean
  }[]
  
  // 权限
  permissions: string[]
  
  // 行为偏好
  preferences: {
    contentTypes: string[]
    keywords: string[]
    ignoreKeywords: string[]
  }
}
```

## 核心工作流

### 场景 1：用户发送链接 → 内容入库
```
用户发送链接 → MetaAgent → ContentAgent → URL分析 → 内容提取 
→ StorageAgent → 保存到指定位置 → 生成文章草稿
```

### 场景 2：定时发现内容（离线托管）
```
MetaAgent(定时触发) → SearchAgent(搜索平台) → 获取链接列表 
→ ContentAgent(提取) → 内容过滤 → StorageAgent(入库)
→ MetaAgent(生成汇总报告) → 通知用户
```

### 场景 3：浏览器自动化采集
```
MetaAgent → BrowserAgent(打开浏览器) → 登录平台 
→ 滚动浏览 → 截图分析 → 提取内容 → 保存数据
```

## MCP 工具清单

| 工具 | 功能 | 实现方式 |
|-----|------|---------|
| url-fetcher | 通用网页提取 | Jina AI API |
| social-media-reader | 社媒内容解析 | 平台 API + yt-dlp |
| browser-automation | 浏览器操作 | Playwright |
| file-operator | 文件操作 | Node.js FS |
| git-operator | Git 操作 | isomorphic-git |
| scheduler | 定时任务 | node-cron |
| search-api | 搜索引擎 | Serper API |

## 数据流

```
外部链接/平台
     │
     ▼
┌────────────┐
│ ContentIngest │ 内容摄取层
└─────┬──────┘
      │
      ▼
┌────────────┐
│ ContentProcess │ 内容处理层（清洗/摘要/标签）
└─────┬──────┘
      │
      ▼
┌────────────┐
│ ContentStore   │ 内容存储层（Markdown/Git）
└────────────┘
```

## UI 界面

需要创建的管理界面：
1. **Agent Dashboard** - Agent 状态监控
2. **Workflow Editor** - 工作流可视化编辑
3. **Content Queue** - 待处理内容队列
4. **Identity Manager** - Agent 身份管理
5. **Schedule Calendar** - 定时任务日历
