# 场景三：AI 主动创作

## 场景描述

AI **定时自主触发**内容创作，无需用户干预。系统：
1. 按设定时间/触发器自动运行
2. 从指定信源收集信息
3. 判断内容价值和存放位置
4. 自动生成并发布文章

**关键特征**:
- **完全自主**: 无需用户触发
- **定时执行**: GitHub Actions / Cron 任务
- **信源订阅**: Arxiv、RSS、API 等
- **价值判断**: AI 评估内容是否值得创作
- **自动归档**: 自行决定分类和位置

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│ 触发层 (Trigger Layer)                                       │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│ │ GitHub      │ │  Cron Job   │ │  Webhook (外部事件)     │ │
│ │ Actions     │ │  (定时任务)  │ │  (如 RSS 更新推送)      │ │
│ │ (定时触发)  │ │             │ │                         │ │
│ └──────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘ │
└────────┼───────────────┼───────────────────┼───────────────┘
         │               │                   │
         └───────────────┼───────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 编排层 (Orchestration Layer)                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                  AgentRuntime (无人值守模式)              │ │
│ │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │ │
│ │  │ Scheduler  │  │ Content    │  │ AutoPublisher    │  │ │
│ │  │ (任务调度)  │  │ Evaluator  │  │ (自动发布决策)    │  │ │
│ │  │            │  │ (内容评估)  │  │                  │  │ │
│ │  └────────────┘  └────────────┘  └──────────────────┘  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 执行层 (Execution Layer)                                    │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│ │ FeedMonitor │ │ ResearchWeb │ │ WriteArticleSkill       │ │
│ │ (信源监听)   │ │ (资料收集)  │ │ (内容生成)              │ │
│ └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 配置示例

### 1. 创作任务配置

```yaml
# .agent/config/cron-tasks.yaml
version: 1.0

tasks:
  # 任务1: Arxiv AI 论文摘要
  - id: arxiv-ai-summary
    name: "Arxiv AI 论文周报"
    schedule: "0 9 * * 1"  # 每周一早9点
    enabled: true
    
    trigger:
      type: cron
      expression: "0 9 * * 1"
    
    source:
      type: arxiv
      query: "cat:cs.AI OR cat:cs.CL OR cat:cs.LG"
      dateRange: "last_week"
      maxPapers: 10
    
    content:
      type: summary
      format: "weekly_digest"
      minRelevanceScore: 0.7
    
    output:
      targetPath: "posts/ai-digest/"
      filenamePattern: "weekly-ai-{date}.md"
      autoPublish: true  # 直接发布还是草稿
      
    notification:
      onComplete: true
      channels: ["email", "webhook"]

  # 任务2: 技术博客聚合
  - id: tech-news-aggregator
    name: "技术新闻聚合"
    schedule: "0 18 * * *"  # 每天晚6点
    
    source:
      type: rss
      feeds:
        - "https://news.ycombinator.com/rss"
        - "https://dev.to/feed"
      keywords: ["AI", "LLM", "Web Development"]
    
    content:
      type: curation
      format: "daily_news"
      deduplication: true
      
    output:
      targetPath: "posts/news/"
      autoPublish: false  # 保存为草稿，人工审核

  # 任务3: 代码库文档自动生成
  - id: auto-code-docs
    name: "代码文档自动生成"
    trigger:
      type: webhook
      events: ["push", "tag"]
    
    source:
      type: git
      path: "./code/"
      filePattern: "*.py"
      
    content:
      type: code_explanation
      template: "tutorial"
      
    output:
      targetPath: "knowledge/code-docs/"
      linkToGraph: true  # 自动链接到知识图谱
```

### 2. GitHub Actions 工作流

```yaml
# .github/workflows/agent-cron.yml
name: MetaUniverse Agent - Scheduled Tasks

on:
  schedule:
    - cron: '0 9 * * 1'  # 每周一 9:00 UTC
  workflow_dispatch:      # 支持手动触发

jobs:
  run-agent:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run Agent Tasks
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          SERP_API_KEY: ${{ secrets.SERP_API_KEY }}
        run: |
          npx tsx scripts/agent-cron.ts --config .agent/config/cron-tasks.yaml
      
      - name: Commit Changes
        run: |
          git config --local user.email "agent@metablog.local"
          git config --local user.name "MetaUniverse Agent"
          
          if [ -n "$(git status --porcelain)" ]; then
            git add .
            git commit -m "[agent-auto] $(date '+%Y-%m-%d') 定时任务生成内容

            - 触发任务: ${{ github.event.schedule }}
            - 模型: ${{ env.LLM_MODEL }}
            - 消耗: 详见提交详情"
            git push
          fi
```

## 执行流程

### 1. 定时触发

```typescript
// scripts/agent-cron.ts
import { AgentRuntime } from '../.vitepress/agent/core/AgentRuntime'
import { loadCronConfig } from './config-loader'

async function main() {
  // 加载配置
  const config = await loadCronConfig(process.argv['--config'])
  
  // 初始化 Runtime (无人值守模式)
  const agent = AgentRuntime.getInstance({
    mode: 'AGENT',  // 自动模式
    headless: true  // 无 UI
  })
  
  await agent.initialize()
  
  // 执行所有到期的任务
  for (const task of config.tasks) {
    if (shouldRun(task)) {
      console.log(`[Cron] 执行任务: ${task.name}`)
      await executeTask(agent, task)
    }
  }
}

function shouldRun(task: CronTask): boolean {
  if (!task.enabled) return false
  
  const now = new Date()
  const cron = parseCron(task.schedule)
  return cron.matches(now)
}
```

### 2. 信源收集

```typescript
// FeedMonitor 实现
class FeedMonitor {
  async collect(source: SourceConfig): Promise<FeedItem[]> {
    switch (source.type) {
      case 'arxiv':
        return this.fetchArxiv(source)
      case 'rss':
        return this.fetchRSS(source)
      case 'api':
        return this.fetchAPI(source)
      default:
        throw new Error(`Unknown source type: ${source.type}`)
    }
  }
  
  private async fetchArxiv(config: ArxivSource): Promise<FeedItem[]> {
    const query = encodeURIComponent(config.query)
    const url = `http://export.arxiv.org/api/query?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=${config.maxPapers}`
    
    const response = await fetch(url)
    const xml = await response.text()
    
    // 解析 XML
    const papers = parseArxivXML(xml)
    
    return papers.map(p => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      authors: p.authors,
      published: p.published,
      link: p.link,
      source: 'arxiv'
    }))
  }
}
```

### 3. 内容评估

```typescript
// ContentEvaluator - 判断内容是否值得创作
class ContentEvaluator {
  async evaluate(item: FeedItem, context: EvaluationContext): Promise<EvaluationResult> {
    // 1. 与现有内容去重
    const existing = await this.findSimilar(item)
    if (existing.similarity > 0.8) {
      return { shouldCreate: false, reason: 'DUPLICATE' }
    }
    
    // 2. 质量评估
    const quality = await this.assessQuality(item)
    if (quality.score < context.minQualityScore) {
      return { shouldCreate: false, reason: 'LOW_QUALITY' }
    }
    
    // 3. 相关性评估
    const relevance = await this.assessRelevance(item, context.interests)
    if (relevance.score < context.minRelevanceScore) {
      return { shouldCreate: false, reason: 'NOT_RELEVANT' }
    }
    
    // 4. 确定存放位置
    const targetPath = await this.decideLocation(item, relevance.category)
    
    return {
      shouldCreate: true,
      targetPath,
      suggestedTitle: await this.generateTitle(item),
      priority: this.calculatePriority(quality, relevance)
    }
  }
  
  private async assessQuality(item: FeedItem): Promise<QualityScore> {
    const prompt = `评估以下文章的质量（1-10分）：
    标题: ${item.title}
    摘要: ${item.summary}
    
    从以下维度评估：
    - 原创性
    - 技术深度
    - 实用性
    
    返回 JSON: { score: number, reasons: string[] }`
    
    const llm = getLLMManager()
    const response = await llm.chat({ messages: [{ role: 'user', content: prompt }] })
    return JSON.parse(response.content)
  }
  
  private async decideLocation(item: FeedItem, category: string): Promise<string> {
    // 基于分类和内容判断存放位置
    const categoryMap: Record<string, string> = {
      'ai': 'posts/tech/ai/',
      'web': 'posts/tech/web/',
      'database': 'posts/tech/database/',
      'news': 'posts/news/'
    }
    
    return categoryMap[category] || 'posts/auto-generated/'
  }
}
```

### 4. 内容生成

```typescript
// 使用 WriteArticleSkill 生成内容
async function generateFromFeed(
  agent: AgentRuntime,
  item: FeedItem,
  evaluation: EvaluationResult
): Promise<string> {
  
  const skill = agent.getSkill('WriteArticle')
  
  const result = await skill.handler(
    {
      taskId: `cron_${Date.now()}`,
      memory: agent.getMemory(),
      logger: agent.getLogger(),
      costTracker: agent.getCostTracker(),
      currentFile: '',
      sessionId: 'cron-session'
    },
    {
      topic: evaluation.suggestedTitle,
      outline: [
        '概述',
        '核心内容',
        '技术细节',
        '影响与意义',
        '参考链接'
      ],
      style: 'news_digest',
      targetPath: evaluation.targetPath,
      sourceMaterial: item,  // 传入原始资料
      autoPublish: true
    }
  )
  
  return result.data?.path
}
```

### 5. 自动发布

```typescript
// AutoPublisher
class AutoPublisher {
  async publish(contentPath: string, config: PublishConfig): Promise<void> {
    if (!config.autoPublish) {
      // 保存为草稿
      await this.saveAsDraft(contentPath)
      await this.notifyReview(contentPath)
      return
    }
    
    // 自动发布
    await this.commitAndPush(contentPath)
    await this.triggerBuild(contentPath)
    
    // 更新索引
    await this.updateSearchIndex(contentPath)
    
    // 通知
    await this.notifyComplete(contentPath)
  }
  
  private async saveAsDraft(path: string): Promise<void> {
    // 添加 draft: true 到 front matter
    const content = await readFile(path)
    const updated = content.replace('---\n', '---\ndraft: true\n')
    await writeFile(path, updated)
  }
  
  private async commitAndPush(path: string): Promise<void> {
    const git = simpleGit()
    await git.add(path)
    await git.commit(`[agent-auto] Create: ${path}`, path, {
      '--author': 'MetaUniverse Agent <agent@metablog.local>'
    })
    await git.push()
  }
}
```

## 执行示例

### 场景: 每周 Arxiv AI 论文摘要

```
[2026-02-17 09:00:00] Agent Cron 启动

[09:00:01] 加载配置: arxiv-ai-summary
[09:00:02] 查询 Arxiv: cat:cs.AI OR cat:cs.CL
[09:00:05] 获取 10 篇论文

论文列表:
1. "Mixture of Experts for Large Language Models" (cs.LG)
2. "Attention Is All You Need: 2024 Edition" (cs.CL)
3. "Scaling Laws for Neural Language Models" (cs.AI)
...

[09:00:10] 评估内容质量...
✓ 论文1: 质量 8.5/10, 相关度 9.0/10 → 生成完整文章
✓ 论文2: 质量 9.0/10, 相关度 8.5/10 → 生成完整文章
✗ 论文3: 质量 6.0/10, 相关度 5.0/10 → 跳过
...

[09:00:30] 生成文章: "Mixture of Experts for LLMs: 最新进展"
进度:  ████████████████████░░░░░ 80%
[09:01:15] 完成，保存至: posts/tech/ai/moe-llm-2024.md

[09:01:16] 生成文章: "Attention 机制 2024 新发展"
进度:  ██████████████████████░░░ 85%
[09:02:00] 完成，保存至: posts/tech/ai/attention-2024.md

[09:02:01] Git 提交
[09:02:05] 推送至远程
[09:02:10] 触发构建 (GitHub Actions)

[09:02:15] 发送通知
- Email: 管理员收到摘要
- Webhook: Slack 频道通知

[09:02:20] 任务完成
总消耗: Token 12,450 | 成本 $0.042
生成文章: 2 篇 | 跳过: 8 篇
```

## 人工审核流程

对于 `autoPublish: false` 的内容：

```
1. Agent 生成内容，标记为 draft: true
2. 保存到指定目录
3. 创建 Git PR (而非直接推送)
4. 发送审核通知给管理员
5. 管理员在 PR 中 review
6. 批准后合并，触发发布
```

## 实现状态

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 定时触发 | ⚠️ 配置有 | GitHub Actions 配置待部署 |
| 任务调度 | ❌ 未实现 | Scheduler 类待开发 |
| **FeedMonitor** | ❌ 未实现 | Arxiv/RSS/API 接入 |
| **ContentEvaluator** | ❌ 未实现 | 内容质量评估 |
| 内容生成 | ✅ 可用 | WriteArticleSkill 复用 |
| **AutoPublisher** | ❌ 未实现 | 自动发布流程 |
| 通知系统 | ❌ 未实现 | Email/Webhook |

## 待实现项

1. **Cron 调度器**: 解析 cron 表达式，管理任务队列
2. **FeedMonitor**: 多源信息收集
3. **ContentEvaluator**: AI 质量评估
4. **AutoPublisher**: 发布决策和流程
5. **通知系统**: 多通道通知
6. **管理界面**: 查看任务状态、手动触发

## 安全与成本控制

```typescript
// 安全限制
const SAFETY_LIMITS = {
  maxDailyTokens: 100000,    // 日 Token 上限
  maxDailyCost: 5.0,         // 日成本上限 $5
  maxArticlesPerRun: 5,      // 单次最大生成数
  requireReviewThreshold: 0.7 // 低于此质量需人工审核
}

// 成本预估
async function estimateCost(task: CronTask): Promise<CostEstimate> {
  const sourceItems = await estimateSourceItems(task.source)
  const avgTokensPerArticle = 4000
  const totalTokens = sourceItems * avgTokensPerArticle
  const estimatedCost = totalTokens / 1000 * 0.002
  
  return {
    estimatedTokens: totalTokens,
    estimatedCost,
    withinBudget: estimatedCost < getRemainingDailyBudget()
  }
}
```

---

## 架构与设计评估

### 1. 逻辑闭环与流程通畅度
- **流转层**：由 VitePress 启动时常驻的 `TaskScheduler` 或系统外部的定频 Webhook 进行心跳侦测触发 -> 拉起内置的任务配置模板 -> 调用爬虫进行聚合或清洗 -> `AgentRuntime` 把控生成逻辑 -> `fileWriter` 结合 `gitCommit` 入库保存。
- **评价**：全流程脱离了人工界面（支持界面按钮点击强行执行），作为后台 Daemon 服务闭环完成。通过设定了不同子任务 `Executor`（如 Github/RSS/Arxiv），保证了采集、生成、发布解耦。

### 2. 兜底与防灾机制
- **任务幂等与防重跑**：通过在内存或文件级别保存上次执行的时间戳/摘要哈希。如果一天内遇到系统重启，不会重复爬取已发布过的内容。
- **采集防雪崩与熔断**：如果目标站点（如 Arxiv 或 HackerNews）限流产生 429 或是网络抛出断连，单个 Task 会自动熔断并标识自己失败，绝不阻塞整个系统的其余调度流运行。
- **长文本爆炸防爆**：在汇总多篇文章时，若总文本超过大模型 Context 顶端（例如 128k Tokens），系统将抛弃完整的拼装改用摘要抽取式拼接，甚至直接存一个未转化的 Draft JSON 下来人工核对，作为极端长文合并的兜底。
- **路径创建失败降级**：生成结果默认放置在规划的目录，若该类别不可识别，将强制降级归口到 `posts/drafts/` 目录供未来审阅。

### 3. 日志系统监听
针对此类无人值守任务，完善度极高的日志追踪不仅是调试需要，也是系统安全防线的底气：
- **调度打点 (`task.scheduled`)**：记录每个进入队列和唤醒的任务时间。
- **网络拉取 (`fetch.source.start` / `fetch.source.error`)**：真实记录每一条拉取操作的状态。
- **核心推理 (`agent.llm`)**：作为成本的核心消费点，它会忠实记录在半夜自动运行时，每一次调用花费的 Tokens 和 USD 折算价。
- **落库与上报 (`api.git.commit` & `task.complete/task.fail`)**：成败不但会固化为 `.log` 文件，还会通过 Eventbus 同步至 `TaskTriggerPanel.vue` 中让用户第二天醒来一目了然。
