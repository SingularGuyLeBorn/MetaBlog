# 场景二：社交媒体监控与内容聚合

## 场景描述

自动监控多个社交媒体平台（知乎、B站、Twitter等）的热点内容，筛选有价值的信息并生成每日简报。

## 参与角色

- **内容监控 Agent**：多平台内容抓取和分析
- **Master Agent**：管理监控 Agent，配置触发器
- **工具**：parse_zhihu、parse_bilibili、parse_twitter、create_linked_article
- **触发方式**：定时触发（每天早上8点）

## 完整流程

### 步骤 1：Master Agent 创建监控 Agent

**用户通过 Master Agent 下达指令**
```
帮我创建一个社交媒体监控助手，每天早上8点抓取知乎、B站、Twitter上关于AI的热点内容，生成简报。
```

**Master Agent 调用系统工具**

```typescript
// Master Agent 执行
const result = await masterToolExecutors.sys_create_agent({
  name: '社交媒体监控助手',
  description: '自动监控多平台AI热点内容',
  systemPrompt: `你是一个社交媒体监控专家。

任务：
1. 监控知乎、B站、Twitter等平台
2. 关注AI、机器学习、深度学习相关话题
3. 筛选高价值内容
4. 生成每日简报

输出格式：
- 标题：简明扼要
- 摘要：核心观点
- 链接：原始来源
- 重要性：⭐-⭐⭐⭐⭐⭐`,
  level: 'custom',
  skills: ['content_monitor', 'social_media_parse'],
  triggers: [{
    type: 'scheduled',
    name: '每日简报',
    enabled: true,
    config: {
      cron: '0 8 * * *',
      timezone: 'Asia/Shanghai'
    }
  }]
})
```

**Master Agent 回复**
```
已为您创建「社交媒体监控助手」，配置如下：

📋 Agent 信息
- 名称：社交媒体监控助手
- ID: agent-1772464000000-xxxx

⏰ 触发设置
- 类型：定时触发
- 时间：每天 08:00 (北京时间)
- 状态：已启用

🛠️ 能力配置
- 技能：内容监控、社交媒体解析
- 平台：知乎、B站、Twitter

明天早上8点将首次执行，您可以在「Agent 档案馆」中查看或修改配置。
```

### 步骤 2：定时触发执行

每天早上8点，Scheduler 自动触发 Agent。

```typescript
// Scheduler 调用
await scheduler.executeTask(agent, trigger)
```

### 步骤 3：Agent 执行监控任务

**Agent 工作流程**

```typescript
// 1. 获取目标链接列表（可以通过配置或搜索）
const targetUrls = [
  'https://www.zhihu.com/question/xxx',
  'https://www.bilibili.com/video/BVxxx',
  'https://twitter.com/username/status/xxx'
]

// 2. 批量解析内容
const parsedResults = await executeTool('parse_multiple_links', {
  urls: targetUrls,
  extract_content: true
})

// 3. AI 分析内容价值
const analysisPrompt = `
分析以下内容，筛选出最有价值的信息：

${parsedResults}

标准：
- 创新性：是否有新的观点/技术
- 影响力：阅读/点赞/转发数据
- 实用性：对读者是否有帮助

输出Top 5，按重要性排序。
`

const topContent = await aiService.sendMessage({
  messages: [{ role: 'user', content: analysisPrompt }]
})
```

### 步骤 4：生成每日简报文章

```typescript
const result = await executeTool('create_linked_article', {
  title: `AI 日报 - ${formatDate(new Date())}`,
  path: `daily/ai-daily-${formatDate(new Date(), 'YYYYMMDD')}.md`,
  content: `## 今日热点

以下是今日值得关注的AI相关内容：

### 1. 知乎热门讨论

**标题**：如何看待最新的GPT-5传闻？
**作者**：@AI观察者
**热度**：⭐⭐⭐⭐⭐
**摘要**：据可靠消息，GPT-5可能在...（AI生成的摘要）

### 2. B站精彩视频

**标题**：我用AI做了一个游戏
**UP主**：技术宅小明
**热度**：⭐⭐⭐⭐
**摘要**：详细展示了使用AI工具开发游戏的完整流程...

### 3. Twitter 前沿动态

**作者**：@AIResearcher
**热度**：⭐⭐⭐⭐⭐
**摘要**：Google发布了新的多模态模型...`,
  links: [
    { text: '知乎讨论', url: 'https://zhihu.com/question/xxx', description: 'GPT-5传闻讨论' },
    { text: 'B站视频', url: 'https://bilibili.com/video/BVxxx', description: 'AI制作游戏' },
    { text: 'Twitter', url: 'https://twitter.com/xxx/status/xxx', description: 'Google新模型' }
  ],
  references: [
    { title: 'GPT-5 技术规格预测', url: 'https://example.com/1', author: 'TechDaily' },
    { title: 'AI游戏开发指南', url: 'https://example.com/2', author: 'GameDev' }
  ],
  tags: ['AI日报', '知乎', 'B站', 'Twitter'],
  category: '资讯'
})
```

### 步骤 5：通知用户

```typescript
// 可以集成邮件/Slack/企业微信通知
const notification = {
  type: 'daily_brief',
  title: 'AI 日报已生成',
  content: `今日共监控到 ${targetUrls.length} 条内容，筛选出 5 条重点资讯。`,
  link: `/daily/ai-daily-${formatDate(new Date(), 'YYYYMMDD')}.md`
}
```

## 扩展功能

### 1. 关键词监控

```typescript
// 配置监控关键词
const monitorConfig = {
  keywords: ['GPT', 'Stable Diffusion', '大模型', 'AGI'],
  platforms: ['zhihu', 'bilibili', 'twitter'],
  minScore: 100  // 最低热度阈值
}
```

### 2. 智能分类

```typescript
// AI 自动分类内容
type Category = '技术突破' | '产品发布' | '行业动态' | '教程资源' | '观点讨论'

const classification = await aiService.sendMessage({
  messages: [{
    role: 'user',
    content: `将以下内容分类到：技术突破、产品发布、行业动态、教程资源、观点讨论

内容：${content}

只返回分类名称。`
  }]
})
```

### 3. 情感分析

```typescript
// 分析舆论倾向
const sentiment = await aiService.sendMessage({
  messages: [{
    role: 'user',
    content: `分析以下内容的情感倾向：正面/负面/中性

内容：${content}

返回：情感标签 (置信度)`
  }]
})
// 输出：正面 (0.85)
```

## 配置文件示例

```json
{
  "id": "agent-social-monitor-001",
  "name": "社交媒体监控助手",
  "description": "自动监控多平台AI热点内容",
  "level": "custom",
  "skills": ["content_monitor", "social_media_parse"],
  "systemPrompt": "你是一个社交媒体监控专家...",
  "runtime": {
    "model": "kimi-k2.5",
    "temperature": 0.5
  },
  "triggers": [{
    "id": "trigger-daily-001",
    "type": "scheduled",
    "name": "每日简报",
    "enabled": true,
    "config": {
      "cron": "0 8 * * *",
      "timezone": "Asia/Shanghai"
    }
  }],
  "memory": {
    "config": {
      "keywords": ["GPT", "Stable Diffusion", "大模型"],
      "platforms": ["zhihu", "bilibili", "twitter"],
      "outputPath": "daily/"
    }
  }
}
```

## 运行效果

每天早上8点，系统自动：

1. ⏰ 触发监控 Agent
2. 🔍 抓取配置的平台内容
3. 🧠 AI 分析内容价值
4. 📝 生成结构化简报
5. 📧 通知用户查看

用户收到的是一篇包含：
- 精选内容摘要
- 原始链接
- 重要性评级
- 分类标签
- 引用参考

的完整文章。
