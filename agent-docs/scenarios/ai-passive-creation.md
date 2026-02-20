# 场景二：AI 被动创作

## 场景描述

用户通过 AIChatOrb 主动触发内容创作。AI 基于：
1. 博客内已有文章（RAG 检索）
2. 网络搜索结果（WebSearch）
生成新文章，并根据用户意图或 AI 判断决定存放位置。

**关键特征**:
- **用户触发**: 通过 ChatOrb 输入指令
- **意图解析**: 自动识别创作意图和目标位置
- **资料整合**: 结合内部知识 + 外部搜索
- **位置决策**: 用户指定或 AI 智能判断

## 用户旅程

### 1. 打开 AIChatOrb

用户在阅读页面点击右下角悬浮球：

```
┌─────────────────────────────────────┐
│ MetaUniverse Agent          [—] [×] │
├─────────────────────────────────────┤
│                                     │
│ 🎉 欢迎！当前正在阅读《RAG技术详解》  │
│                                     │
│ 我可以帮您：                         │
│ • 解释文中概念                       │
│ • 基于本文生成延伸阅读               │
│ • 搜索相关最新研究                   │
│                                     │
├─────────────────────────────────────┤
│ [输入指令...]              [发送]    │
│                                     │
│ 快捷操作：                           │
│ [📝 续写] [🔍 搜索] [📊 总结]       │
│                                     │
└─────────────────────────────────────┘
```

### 2. 输入创作指令

用户输入自然语言指令：

**示例 1: 明确指定位置**
```
用户: "基于我博客中关于Transformer和BERT的文章，
      结合2024年的最新改进，写一篇综述放到 posts/tech/ai/"

Agent 理解:
- 意图: WRITE_ARTICLE
- 主题: Transformer + BERT 综述
- 资料来源: 内部文章 + 网络搜索
- 目标位置: posts/tech/ai/ (已指定)
```

**示例 2: 未指定位置**
```
用户: "给我写一篇关于向量数据库的技术文章"

Agent 理解:
- 意图: WRITE_ARTICLE
- 主题: 向量数据库
- 目标位置: 未指定 → 需要 AI 判断
```

### 3. 意图解析与位置决策

**IntentRouter 处理流程**:

```typescript
// 1. 解析用户输入
const intent = await intentRouter.parse(input, context)

// 返回结果:
{
  type: 'WRITE_ARTICLE',
  confidence: 0.95,
  parameters: {
    topic: 'Transformer和BERT综述',
    sources: ['internal', 'web'],
    targetPath: 'posts/tech/ai/',  // 用户指定
    style: 'technical'
  }
}
```

**位置决策逻辑** (当用户未指定时):

```typescript
function decideTargetPath(intent: ParsedIntent, memory: MemoryManager): string {
  // 1. 分析主题分类
  const topic = intent.parameters.topic
  
  // 2. 查询已有相似文章的位置
  const similarArticles = memory.findEntitiesByName(topic)
    .filter(e => e.type === 'article')
  
  if (similarArticles.length > 0) {
    // 放到相似文章同目录
    const siblingPath = similarArticles[0].sources[0]
    return path.dirname(siblingPath)
  }
  
  // 3. 基于主题关键词判断
  if (/transformer|bert|llm|ai/i.test(topic)) {
    return 'posts/tech/ai/'
  }
  if (/react|vue|frontend/i.test(topic)) {
    return 'posts/tech/web/'
  }
  
  // 4. 默认位置
  return 'posts/'
}
```

### 4. 资料收集 (RAG + WebSearch)

**步骤 1: 内部知识检索**

```typescript
// MemoryManager.buildContext()
const internalContext = await memory.buildContext(
  'Transformer BERT',
  'posts/tech/ai/transformer-arch.md'  // 当前文件
)

// 返回:
[
  {
    content: 'Transformer 是一种基于注意力机制的架构...',
    source: 'posts/tech/ai/transformer-arch.md',
    score: 0.95,
    metadata: { type: 'article' }
  },
  {
    content: 'BERT 是 Google 提出的预训练语言模型...',
    source: 'posts/tech/ai/bert-explained.md',
    score: 0.88,
    metadata: { type: 'article' }
  }
]
```

**步骤 2: 网络搜索** (需要 WebSearch 工具)

```typescript
// WebSearch.search()
const webResults = await webSearch.search(
  'Transformer improvements 2024',
  { sources: ['arxiv', 'google'], maxResults: 5 }
)

// 返回:
[
  {
    title: 'Mixture of Experts for Transformer',
    link: 'https://arxiv.org/abs/2401.xxxxx',
    snippet: 'We propose a new MoE architecture...',
    source: 'arxiv',
    credibility: 0.95
  }
]
```

**步骤 3: 内容整合**

```typescript
// 组装 LLM 提示词
const prompt = `基于以下资料撰写综述文章：

## 内部文章
${internalContext.map(c => c.content).join('\n\n')}

## 外部资料
${webResults.map(r => r.snippet).join('\n\n')}

要求：
- 结构清晰，包含引言、主体、结论
- 结合内部观点和最新研究
- 添加 WikiLinks 如 [[Transformer]]
- 使用 Markdown 格式`
```

### 5. 文章生成

**WriteArticleSkill 执行流程**:

```typescript
async function generateArticle(context: SkillContext, params: any) {
  const { topic, targetPath, sources } = params
  
  // 1. 构建上下文
  const ragContext = await context.memory.buildContext(topic)
  
  // 2. 网络搜索 (如需要)
  let webContext = []
  if (sources?.includes('web') && context.webSearch) {
    webContext = await context.webSearch.search(topic)
  }
  
  // 3. 生成大纲
  const outline = await callLLM(outlinePrompt)
  
  // 4. 生成正文
  const content = await callLLM(contentPrompt, {
    stream: true,
    onChunk: context.stream  // 流式输出到 UI
  })
  
  // 5. 确定文件路径
  const fileName = slugify(topic) + '.md'
  const finalPath = targetPath 
    ? path.join(targetPath, fileName)
    : await decideTargetPath(topic, context.memory)
  
  // 6. 添加 Front Matter
  const fullContent = `---
title: ${topic}
date: ${new Date().toISOString().split('T')[0]}
category: ${inferCategory(topic)}
wikiLinks:
${ragContext.map(c => `  - ${c.metadata.title}`).join('\n')}
---

${content}`
  
  // 7. 保存文件
  await saveFile(finalPath, fullContent)
  
  // 8. Git 提交 (Agent 标记)
  if (context.git) {
    await context.git.commitAsAgent({
      path: finalPath,
      taskId: context.taskId,
      message: `Create article: ${topic}`,
      metadata: { model, tokens, cost, skill: 'WriteArticle' }
    })
  }
  
  // 9. 提取实体
  await context.memory.extractEntitiesFromContent(fullContent, finalPath)
  
  return {
    success: true,
    data: { path: finalPath, wordCount: content.length },
    tokensUsed, cost
  }
}
```

### 6. 结果展示与确认

**流式输出到 ChatOrb**:

```
Agent: 正在为您创作文章...

[步骤 1/4] 检索内部资料...
✓ 找到 3 篇相关文章
  - Transformer 架构详解
  - BERT 原理解析
  - 注意力机制入门

[步骤 2/4] 搜索最新研究...
✓ 找到 5 篇相关论文
  - Mixture of Experts (2024)
  - FlashAttention v3 (2024)

[步骤 3/4] 生成文章大纲...
✓ 大纲已生成
  1. 引言
  2. Transformer 基础回顾
  3. BERT 及其变体
  4. 2024 年最新进展
  5. 总结与展望

[步骤 4/4] 撰写正文...
生成中: ████████████████████░░░░░ 75%
"...在本文中，我们将探讨 Transformer 架构的最新改进..."

✅ 文章创作完成！
📄 保存至: posts/tech/ai/transformer-bert-survey-2024.md
📊 字数: 3,240 | Token: 4,560 | 成本: $0.015

[查看文章] [继续编辑] [创建关联文章]
```

### 7. 后续操作

用户可以选择：

1. **查看文章**: 跳转到文章页面
2. **继续编辑**: 在编辑器中打开（进入 COLLAB 模式）
3. **创建关联文章**: Agent 建议缺失的 WikiLinks 对应文章

## 数据流图

```
用户输入 (ChatOrb)
    ↓
AgentRuntime.processInput()
    ↓
IntentRouter.parse() → { type: 'WRITE_ARTICLE', targetPath? }
    ↓
WriteArticleSkill.handler()
    │
    ├──→ MemoryManager.buildContext()   # 内部知识
    │
    ├──→ WebSearch.search()             # 外部资料 (待实现)
    │
    ├──→ callLLM()                      # 生成大纲
    │       ↓
    ├──→ callLLM(stream)                # 生成正文
    │       ↓
    ├──→ decideTargetPath()             # 确定位置
    │
    ├──→ FileSystem.saveFile()          # 保存文件
    │
    ├──→ GitOperator.commitAsAgent()    # Git 提交 (待实现)
    │
    └──→ MemoryManager.extractEntities() # 提取实体
    ↓
返回结果 → ChatOrb 展示
    ↓
用户确认/编辑
```

## 实现状态

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| ChatOrb 界面 | ✅ 完成 | 悬浮球、流式输出 |
| 意图解析 | ✅ 完成 | IntentRouter |
| 技能执行 | ✅ 完成 | WriteArticleSkill |
| 内部 RAG | ⚠️ 部分 | 关键词匹配有，向量无 |
| **WebSearch** | ❌ 待实现 | 需要接入搜索 API |
| 位置决策 | ⚠️ 框架 | 基础逻辑有，待完善 |
| 流式生成 | ✅ 完成 | LLM stream |
| 文件保存 | ✅ 完成 | 通过 API |
| **Git 提交** | ❌ 待实现 | GitOperator |

## 待实现项

1. **WebSearch 工具**: 接入 SerpAPI 或 Google CSE
2. **GitOperator**: Agent 提交标记
3. **向量 RAG**: 真正的语义相似度搜索
4. **位置智能判断**: 更精准的主题分类
5. **大纲确认**: 生成大纲后暂停等待用户确认

## 示例代码

```typescript
// 在 AIChatOrb.vue 中调用
async function createArticle() {
  const result = await agent.processInput(
    '基于我的博客文章写一篇 Transformer 综述放到 posts/tech/ai/',
    { currentFile: page.value.filePath }
  )
  
  // 展示结果
  messages.value.push({
    role: 'assistant',
    content: result.content,
    metadata: result.metadata
  })
}
```
