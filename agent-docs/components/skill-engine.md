# SkillEngine 组件详细设计

## 基本信息

| 属性 | 值 |
|-----|-----|
| **层级** | L4 - 智能编排层 |
| **文件位置** | `.vitepress/agent/skills/SkillEngine.ts` |
| **实现状态** | ✅ 已实现 |
| **完成度** | 80% |

## 功能设计

### 核心职责
SkillEngine 是技能的管理和执行中心，负责：
1. **技能注册**: 动态注册、卸载技能
2. **意图匹配**: 根据意图类型匹配对应的技能
3. **执行调度**: 带并发控制、超时、重试的技能执行
4. **中间件支持**: 支持前置/后置处理中间件

### 内置技能清单

| 技能名 | 功能 | 意图匹配 | 状态 |
|-------|------|---------|------|
| **WriteArticle** | 撰写新文章 | "写文章"/"创作内容" | ✅ 已实现 |
| **EditContent** | 编辑现有内容 | "编辑"/"修改"/"优化" | ✅ 已实现 |
| **ResearchWeb** | 网络研究 | "搜索"/"调研"/"研究" | ⚠️ 模拟实现 |
| **UpdateGraph** | 更新知识图谱 | "更新图谱"/"完善链接" | ✅ 已实现 |
| **CodeExplain** | 代码解释 | "解释代码"/"代码说明" | ✅ 已实现 |
| **AnswerQuestion** | 问答 | "什么是"/"为什么"/"怎么" | ✅ 已实现 |
| **Summarize** | 生成摘要 | "总结"/"概括"/"TL;DR" | ✅ 已实现 |

## 交互方式

### 对外接口

```typescript
class SkillEngine {
  // 注册技能
  register(skill: Skill): void
  registerMany(skills: Skill[]): void
  
  // 卸载技能
  unregister(name: string): boolean
  
  // 获取技能
  get(name: string): Skill | undefined
  list(): Skill[]
  
  // 意图匹配
  match(intent: ParsedIntent): Skill | null
  findByIntent(intentType: string): Skill | null
  
  // 执行技能
  execute(name: string, context: SkillContext, params: any): Promise<SkillResult>
  
  // 中间件
  use(middleware): void
}
```

### Skill 接口定义

```typescript
interface Skill {
  name: string                    // 技能名称
  description: string             // 技能描述
  intentPattern?: RegExp          // 意图正则匹配
  intentType?: string             // 意图类型
  requiredParams: string[]        // 必需参数
  optionalParams?: string[]       // 可选参数
  handler: (context: SkillContext, params: any) => Promise<SkillResult>
}

interface SkillContext {
  taskId: string
  memory: MemoryManager
  logger: Logger
  costTracker: CostTracker
  currentFile: string
  sessionId: string
  stream?: (chunk: string) => void  // 流式输出回调
}

interface SkillResult {
  success: boolean
  message?: string
  data?: any
  error?: string
  tokensUsed: number
  cost: number
  nextSteps?: string[]
}
```

### 执行流程

```
AgentRuntime.processInput()
    ↓
IntentRouter.parse() → ParsedIntent
    ↓
SkillEngine.match(intent) → Skill
    ↓
SkillEngine.execute(skill, context, params)
    │
    ├──→ 验证参数 (requiredParams)
    ├──→ 运行中间件链
    ├──→ skill.handler(context, params)
    │       │
    │       ├──→ 调用 LLM (callLLM)
    │       ├──→ 调用 Memory
    │       ├──→ 调用 FileSystem API
    │       └──→ 返回 SkillResult
    │
    └──→ 返回结果给 Runtime
```

## 实现进度

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| 技能注册 | ✅ 完成 | 动态注册、批量注册 |
| 技能卸载 | ✅ 完成 | 支持热卸载 |
| 意图匹配 | ✅ 完成 | 正则匹配 + 类型匹配 |
| 参数验证 | ✅ 完成 | 必需参数检查 |
| 执行控制 | ✅ 完成 | 基础执行流程 |
| 中间件 | ✅ 完成 | 中间件链支持 |
| 并发控制 | ⚠️ 框架 | 有队列设计，待完善 |
| 超时控制 | ❌ 未实现 | 需要添加 Promise.race |
| 重试机制 | ❌ 未实现 | 需要添加错误重试 |
| 流式输出 | ✅ 完成 | 通过 context.stream 支持 |

## 典型技能实现示例

### WriteArticleSkill

```typescript
export const WriteArticleSkill: Skill = {
  name: 'WriteArticle',
  description: '撰写新文章',
  intentPattern: /(?:写|创作|生成|创建).{0,5}(?:文章|博客|内容|文档)/i,
  requiredParams: ['topic'],
  optionalParams: ['outline', 'style', 'length', 'targetPath'],
  
  handler: async (ctx, params) => {
    // 1. 构建上下文
    const context = await ctx.memory.buildContext(params.topic)
    
    // 2. 生成大纲
    const outline = await callLLM(outlinePrompt)
    
    // 3. 撰写内容
    const content = await callLLM(contentPrompt)
    
    // 4. 保存文件
    const filePath = params.targetPath || `posts/${slugify(params.topic)}.md`
    await saveFile(filePath, fullContent)
    
    // 5. 提取实体
    await ctx.memory.extractEntitiesFromContent(fullContent, filePath)
    
    return {
      success: true,
      data: { message: '文章已创建', path: filePath },
      tokensUsed: outline.tokens + content.tokens,
      cost: outline.cost + content.cost
    }
  }
}
```

## 待完善项

1. **并发控制**: 完善 `executionQueue` 和 `runningCount` 逻辑
2. **超时处理**: 添加 `Promise.race` 超时机制
3. **错误重试**: 添加指数退避重试策略
4. **技能编排**: 支持多技能组合工作流
