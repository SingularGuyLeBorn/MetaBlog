# Skills + Tools 系统架构文档

> Claude Code 风格的渐进式披露实现

## 📋 目录

- [概述](#概述)
- [核心概念](#核心概念)
- [架构图](#架构图)
- [渐进式披露](#渐进式披露)
- [文件结构](#文件结构)
- [数据流](#数据流)
- [使用指南](#使用指南)
- [性能优化](#性能优化)

---

## 概述

本系统实现了类似 Claude Code 的 **Skills + Tools** 整合机制，解决了以下问题：

1. **Context Window 限制** - 不一次性加载所有 Skill 的完整内容
2. **工具选择困惑** - AI 不知道何时使用什么工具
3. **技能发现** - 自动匹配用户意图到相关 Skill
4. **扩展性** - 新增 Skill 不会线性增加 Token 消耗

---

## 核心概念

### 1. Skill (技能)

Skill 是**领域专业知识**的封装，包含：

```typescript
interface Skill {
  // 元数据 (LOD-0)
  id: string           // 唯一标识
  name: string         // 显示名称
  description: string  // 一句话描述
  icon: string         // 图标
  category: string     // 分类
  tags: string[]       // 标签/关键词
  
  // 触发条件
  scenarios: string[]  // 使用场景描述
  tools: string[]      // 声明需要的工具
  
  // 完整内容 (LOD-2)
  prompt: string       // 详细工作流指导
}
```

### 2. Tool (工具)

Tool 是**原子能力**，通过 Function Calling 暴露给 AI：

```typescript
interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: object  // JSON Schema
  }
}
```

### 3. 渐进式披露 (Progressive Disclosure)

| 层级 | 内容 | 大小 | 时机 |
|------|------|------|------|
| **LOD-0** | Skill 元数据 (name, desc, icon) | ~50 tokens | 始终包含 |
| **LOD-1** | 工具定义 (schema) | ~200 tokens/工具 | Function Calling |
| **LOD-2** | Skill 完整 Prompt | ~500-1000 tokens | 匹配时注入 |

---

## 架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户输入层                                    │
│                    "帮我写一篇关于 AI 的文章"                         │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Skill Matcher (匹配器)                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  规则 1: 场景匹配 (weight: 1.0)                                │  │
│  │  规则 2: 标签匹配 (weight: 0.8)                                │  │
│  │  规则 3: 工具名匹配 (weight: 0.7)                              │  │
│  │  规则 4: 名称匹配 (weight: 0.6)                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
                    匹配结果: [article-manager, writing-master]
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   Prompt Builder (构建器)                            │
│                                                                     │
│  LOD-0: 所有 Skill 列表 (~500 tokens)                               │
│  ├─ 📝 article-manager: 管理 VitePress 文章                        │
│  ├─ ✍️ writing-master: 专业写作辅助                                │
│  ├─ 🎓 academic-research: 学术研究助手                             │
│  └─ ... (13 个 Skills)                                              │
│                                                                     │
│  LOD-2: 激活 Skill 的完整内容 (~1000 tokens)                        │
│  ├─ ### 📝 article-manager (自动匹配, 置信度 85%)                  │
│  │   你是文章管理专家...                                            │
│  │   工作流: 1. 搜索文章 → 2. 读取内容 → 3. 修改/更新              │
│  │                                                                   │
│  └─ ### ✍️ writing-master (自动匹配, 置信度 72%)                   │
│      你是专业写作助手...                                            │
│      写作流程: 1. 确定主题 → 2. 大纲 → 3. 撰写 → 4. 润色          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      AI 服务层                                       │
│                                                                     │
│  System Prompt + 用户消息 → AI                                     │
│                              ↓                                      │
│  AI 决定调用: create_article(title="AI发展趋势", ...)              │
│                              ↓                                      │
│  工具执行 → 结果返回给 AI                                          │
│                              ↓                                      │
│  AI 生成最终回复                                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 渐进式披露

### LOD-0: 轻量级元数据

**大小**: ~50 tokens per Skill  
**内容**: 仅 name + description  
**目的**: 让 AI 知道有哪些 Skill 可用

```markdown
## 可用 Skills

- 📝 **article-manager**: 管理 VitePress 博客文章和知识库文档
- 🎓 **academic-research**: 访问学术平台和AI模型库
- 💻 **code-craft**: 代码开发和编程辅助
...
```

### LOD-1: 工具定义

**大小**: ~200 tokens per tool  
**方式**: 通过 OpenAI Function Calling 的 `tools` 参数  
**目的**: 让 AI 知道如何调用工具

```json
{
  "type": "function",
  "function": {
    "name": "create_article",
    "description": "创建新的 Markdown 文章",
    "parameters": { ... }
  }
}
```

### LOD-2: 完整 Skill 内容

**大小**: ~500-1000 tokens per Skill  
**触发**: Skill 匹配分数 > 0.3 时注入  
**目的**: 指导 AI 如何组合工具完成任务

```markdown
### 📝 article-manager (自动匹配, 置信度 85%)

你是 VitePress 博客系统的文章管理专家。

#### 存储位置
- `/sections/posts/` - 博客文章
- `/sections/knowledge/` - 知识库文档

#### 工作流

##### 查找文章
1. 先询问用户文章标题或关键词
2. 调用 `search_articles(query="关键词")`
3. 获取文章路径后调用 `get_article_content(path="...")`

##### 创建文章
1. 询问文章标题和存储位置
2. 调用 `create_article(title="...", path="...", content="...")`

#### 重要提示
- 不知道路径时: 先用 `search_articles` 搜索
- 删除操作: 必须设置 `confirm=true`
```

---

## 文件结构

```
skills/
├── index.ts                    # 统一入口，导出所有功能
├── types.ts                    # TypeScript 类型定义
├── skillParser.ts              # Skill 文件解析器
├── skillMatcher.ts             # 意图匹配算法
├── skillLoader.ts              # Skill 加载和管理
├── promptBuilder.ts            # System Prompt 构建器
├── ARCHITECTURE.md             # 本架构文档
└── README.md                   # 使用指南

# Skill 文件存储在项目根目录
.skills/
├── article-manager/
│   └── SKILL.md               # YAML frontmatter + Markdown
├── academic-research/
│   └── SKILL.md
├── code-craft/
│   └── SKILL.md
└── ... (13 个内置 Skills)
```

---

## 数据流

### 1. 初始化流程

```
App 启动
  ↓
loadBuiltinSkills()           # 从 /.skills/ 加载所有 SKILL.md
  ↓
parseSkillFile()              # 解析 YAML frontmatter + Markdown
  ↓
availableSkills: Skill[]      # 存储所有可用 Skill 元数据
```

### 2. 对话流程

```
用户输入: "帮我写篇 AI 文章"
  ↓
matchSkillsWithContext()      # 基于规则匹配 Skills
  ├── 场景匹配: "写文章" → article-manager (score: 0.85)
  └── 标签匹配: "AI" → writing-master (score: 0.72)
  ↓
activateSkills()              # 激活高匹配 Skills (score > 0.3)
  ├── 标记: article-manager [激活]
  └── 标记: writing-master [激活]
  ↓
buildSystemPrompt()           # 构建渐进式 Prompt
  ├── LOD-0: 所有 13 个 Skill 的元数据
  ├── LOD-2: 2 个激活 Skill 的完整 Prompt
  └── LOD-1: 通过 Function Calling 提供工具定义
  ↓
aiService.chatStream()        # 发送到 AI 服务
  ↓
AI 响应
  ├── 中间思考: "用户想写文章，我需要用 create_article"
  ├── 工具调用: create_article(title="AI发展趋势", ...)
  ├── 等待工具执行结果
  └── 最终回复: "已为您创建文章《AI发展趋势》..."
```

---

## 使用指南

### Vue 组件中使用

```typescript
import { useSkillLoader } from '../skills'

// 在 setup 中
const {
  availableSkills,      // 所有可用 Skills
  activeSkills,         // 当前激活的 Skills
  isLoading,            // 加载状态
  loadSkills,           // 加载所有 Skills
  matchSkills,          // 匹配 Skills
  activateSkill,        // 激活 Skill
  buildSystemPrompt     // 构建 System Prompt
} = useSkillLoader()

// 初始化
onMounted(() => {
  loadSkills()
})

// 发送消息时
async function sendMessage(userInput: string) {
  // 1. 匹配并自动激活 Skills
  const matches = matchSkills(userInput)
  matches.forEach(m => {
    if (m.score > 0.3) {
      activateSkill(m.skill.id, 'auto', m.score)
    }
  })
  
  // 2. 构建 System Prompt
  const systemPrompt = buildSystemPrompt(
    'MetaBlog AI 助手',
    userInput,
    getToolDefinitions()
  )
  
  // 3. 调用 AI 服务
  await aiService.chatStream(
    messages,
    { ...config, systemPrompt },
    callbacks
  )
}
```

### 使用增强版服务 (推荐)

```typescript
import { skillIntegratedService } from '../api/services'

// 初始化
const skills = await loadBuiltinSkills()
skillIntegratedService.initializeSkills(skills)

// 发送消息 (自动处理 Skills)
await skillIntegratedService.chatStream(
  messages,
  {
    ...config,
    enableSkills: true,           // 启用 Skills 系统
    skillMatchThreshold: 0.2,     // 匹配阈值
    maxActiveSkills: 3            // 最大激活数
  },
  {
    onContent: (text) => { ... },
    onSkillActivation: (result) => {
      // 显示 Skill 激活提示
      console.log('激活 Skills:', result.activated.map(s => s.id))
    }
  }
)
```

---

## 性能优化

### Token 使用对比

| 场景 | 传统方式 | 渐进式披露 | 节省 |
|------|---------|-----------|------|
| 13 Skills 全部加载 | ~8000 tokens | ~500 tokens (LOD-0) | **93%** |
| 匹配 2 Skills | ~8000 tokens | ~2500 tokens (LOD-0+2) | **69%** |
| 无匹配 | ~8000 tokens | ~500 tokens | **93%** |

### 关键优化点

1. **Skill 匹配阈值**: 默认 0.2，可调整以平衡准确性和覆盖率
2. **最大激活数**: 默认 3，防止过多 Skill 同时激活
3. **上下文连续性**: 不清空之前的激活，保持对话连贯
4. **工具过滤**: 仅提供激活 Skills 声明的工具，减少选择负担

---

## 扩展指南

### 添加新 Skill

1. 在 `.skills/` 下创建新目录
2. 编写 `SKILL.md` 文件 (YAML frontmatter + Markdown)
3. 添加到 `BUILTIN_SKILL_IDS` 列表

```markdown
---
id: my-skill
name: 我的技能
description: 描述这个技能的作用
icon: 🎯
category: custom
tags: [标签1, 标签2]
tools: [tool_1, tool_2]
---

## 使用场景
- 当用户需要做某事时

## Prompt

你是某领域专家...

### 工作流
1. 步骤一
2. 步骤二
```

### 自定义匹配规则

```typescript
// skillMatcher.ts
const MATCH_RULES: MatchRule[] = [
  {
    name: 'my_custom_rule',
    weight: 0.9,
    match: (input, tokens, skill) => {
      // 自定义匹配逻辑
      return { score: 0.8, keywords: ['keyword'] }
    }
  }
]
```

---

## 调试技巧

```typescript
// 查看匹配过程
import { debugMatch } from './skillMatcher'

console.log(debugMatch('帮我写文章', availableSkills))
// 输出:
// 输入: "帮我写文章"
// 阈值: 0.15
// 最多匹配: 3 个
// ──────────────────────────────────────────────────
// 
// 1. 📝 文章管理 (article-manager)
//    分数: 85.0%
//    原因: scenario(用户想要创建新文章) + tag(文章)
//    关键词: 用户想要创建新文章, 文章
```

```typescript
// 查看 Token 使用
import { analyzePromptTokens } from './promptBuilder'

const analysis = analyzePromptTokens(context)
console.log(analysis)
// {
//   lod0: 150,    // Skill 列表
//   lod1: 800,    // 工具摘要
//   lod2: 1200,   // 激活 Skill 内容
//   total: 2150
// }
```

---

## 总结

本系统通过 **渐进式披露** 实现了：

✅ **Context Window 高效利用** - 仅加载必要的 Skill 内容  
✅ **智能 Skill 匹配** - 基于多规则启发式算法  
✅ **工具权限控制** - 仅提供激活 Skills 声明的工具  
✅ **上下文连续性** - 保持对话中的 Skill 状态  
✅ **可扩展架构** - 易于添加新 Skills 和工具  

核心设计原则：**简单可解释、快速响应、可调试** 🎯
