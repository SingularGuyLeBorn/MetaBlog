# Skills 与 Tools 集成指南

## 核心概念

### Tool (工具) = 能力
- **定义**: 可以执行的具体功能
- **形式**: TypeScript 函数
- **例子**: `createArticle`, `searchArxiv`
- **粒度**: 细粒度，单一职责

### Skill (技能) = 使用指南
- **定义**: 何时以及如何使用一组工具
- **形式**: Markdown 文档(Prompt Template)
- **例子**: "文章管理专家", "学术研究助手"
- **粒度**: 粗粒度，工作流指导

## 为什么需要 Skills？

### 问题：Tool 过多时 AI 会困惑
当 AI 面对 50+ 个工具时：
1. 不知道该用哪个
2. 不知道怎么组合使用
3. 容易陷入"选择困难"

### 解决方案：通过 Skills 分组
```
用户：写一篇关于 AI 的文章

AI 判断：涉及 "文章管理" Skill
    ↓
加载 "文章管理" Skill 到对话
    ↓
Skill 告诉 AI：
  1. 先 searchArticles 查重
  2. 再 createArticle 创建
  3. 然后 updateArticle 完善
```

## Claude Code 模式

### Progressive Disclosure (渐进式披露)

```
┌─────────────────────────────────────────────────────────────┐
│  LOD-0: System Prompt(系统提示词)                          │
│  - Agent 身份定义                                           │
│  - Skills 列表(name + description)                         │
│  - 工具列表(Function Calling)                              │
├─────────────────────────────────────────────────────────────┤
│  LOD-1: Tool Definition(工具定义)                          │
│  - 仅在 AI 决定调用时传递                                    │
├─────────────────────────────────────────────────────────────┤
│  LOD-2: Skill Content(技能内容)                            │
│  - 仅在匹配到 Skill 时注入对话                               │
│  - 包含详细工作流和示例                                      │
└─────────────────────────────────────────────────────────────┘
```

### 关键设计原则

#### 1. Skill 不是身份
```
❌ 错误：
"你是一个文章管理专家，专门负责管理博客文章..."

✅ 正确：
"你有一个 '文章管理' Skill，当用户涉及文章操作时：
 1. 先搜索确认是否已存在
 2. 根据结果决定创建或修改"
```

#### 2. 自动匹配
```typescript
// 不需要用户选择 Skill
// AI 根据输入自动匹配

function matchSkills(userInput: string): string[] {
  const matchedSkills = []
  
  for (const skill of allSkills) {
    // 检查 usageScenarios
    if (skill.usageScenarios.some(scenario => 
      userInput.includes(scenario)
    )) {
      matchedSkills.push(skill.id)
    }
  }
  
  return matchedSkills
}
```

## 架构实现

### 数据流

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户输入   │────▶│  Skill 匹配  │────▶│  加载 Skill │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   返回结果   │◀────│  Tool 执行   │◀────│  AI 决定调用 │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 代码结构

```typescript
// ===== Skill 定义 =====
interface Skill {
  id: string
  name: string
  description: string  // 用于匹配用户意图
  content: string      // 详细工作流说明(Markdown)
  tools: string[]      // 关联的工具列表
  usageScenarios: string[]  // 使用场景关键词
}

// ===== Skill 加载 =====
function invokeSkill(skillId: string): string {
  const skill = getSkill(skillId)
  
  return `
[Skill 激活: ${skill.name}]

${skill.content}

可用工具: ${skill.tools.join(', ')}
  `
}

// ===== 构建 System Prompt =====
function buildSystemPrompt(agent: Agent, userInput: string): string {
  // 1. 匹配 Skill
  const matchedSkills = matchSkills(userInput)
  
  // 2. 构建基础提示词
  let prompt = `你是 ${agent.name}，${agent.description}`
  
  // 3. 添加 Skills 列表(LOD-0)
  prompt += '\n\n## 你的 Skills\n'
  for (const skill of agent.skills) {
    prompt += `- ${skill.name}: ${skill.description}\n`
  }
  
  // 4. 如果有匹配的 Skill，注入详细内容(LOD-2)
  if (matchedSkills.length > 0) {
    prompt += '\n## 当前激活的 Skills\n'
    for (const skillId of matchedSkills) {
      prompt += invokeSkill(skillId)
    }
  }
  
  return prompt
}
```

## Skill 文件格式

```markdown
---
name: "文章管理专家"
description: "管理博客文章的创建、编辑、删除和搜索"
version: "2.0.0"
tools:
  - createArticle
  - getArticleContent
  - updateArticle
  - deleteArticle
  - listArticles
  - searchArticles
usageScenarios:
  - "创建文章"
  - "编辑文章"
  - "删除文章"
  - "查找文章"
  - "管理博客内容"
tags:
  - "写作"
  - "CMS"
  - "博客"
---

# 文章管理专家

## 能力范围

你是一个专业的 VitePress 内容管理专家，可以通过直接调用后端 API 对 `/sections/` 目录下的 Markdown 文稿进行 CRUD 操作。

## 核心概念

**路径格式**：所有操作均基于文章的 `path` (相对路径) 进行。
- 路径示例：`posts/my-post.md`, `knowledge/ai/transformer.md`
- 文件夹路径以 `/` 结尾

## 工作流程

### 1. 查找已有文章
如果用户提到一篇已存在的文章但没有提供路径：
1. 使用 `searchArticles(query="文章标题关键词")` 确认其准确路径
2. 从搜索结果中获取 path

### 2. 创建新文章
1. 确定文章的 section(knowledge/posts/resources)
2. 使用 `createArticle(title="标题", path="section/filename.md", content="内容")`
3. 确保包含规范的 Markdown 语法和 H1 标题、Frontmatter

### 3. 修改文章
1. 先使用 `getArticleContent(path="...")` 读取当前内容
2. 使用 `updateArticle(path="...", content="新内容")` 更新
3. 保留原有 frontmatter

### 4. 删除文章
1. **警告**：删除前必须确认，询问用户是否确定
2. 使用 `deleteArticle(path="...", confirm=true)`

## 示例对话

用户："帮我写一篇 React 入门指南"
→ 调用 `createArticle(title="React 入门指南", path="posts/react-guide.md", ...)`

用户："修改刚才那篇文章，添加 Hooks 章节"
→ 调用 `getArticleContent` 读取 → `updateArticle` 添加内容

用户："删除旧的那篇 Vue2 文章"
→ 调用 `searchArticles(query="Vue2")` 查找 → 确认后 `deleteArticle`
```

## Tool 与 Skill 的关系

| 场景 | Tool | Skill |
|------|------|-------|
| 粒度 | 单个功能 | 功能组合 |
| 类比 | "锤子" | "如何打造一张桌子" |
| 定义位置 | TypeScript 代码 | Markdown 文件 |
| 更新方式 | 改代码重新部署 | 修改 Markdown 即时生效 |
| 数量 | 少(50个左右) | 多(可动态创建) |

## 最佳实践

### 1. Tool 设计原则
- 单一职责：一个 Tool 只做一件事
- 参数清晰：必填/选填明确
- 错误友好：返回清晰的错误信息

### 2. Skill 设计原则
- 场景驱动：基于用户使用场景设计
- 工作流清晰：告诉 AI 步骤 1-2-3
- 示例丰富：提供具体的对话示例

### 3. 协作模式
```
用户输入 
    → AI 判断需要哪些 Skills 
    → 加载 Skills 内容到对话 
    → AI 决定调用哪些 Tools 
    → Tools 执行 
    → AI 根据结果继续或总结
```

## 实现建议

### 1. Skill 热更新
Skills 应该存储在文件系统中(如 `.skills/` 目录)，支持：
- 运行时重新加载
- 用户自定义创建
- 导入/导出分享

### 2. Skill 匹配优化
简单的关键词匹配可能不够准确，可以考虑：
- 向量相似度匹配(语义理解)
- 历史对话学习
- 用户反馈优化

### 3. 调试工具
提供 Skill 和 Tool 的调试面板：
- 查看已加载的 Skills
- 测试 Tool 调用
- 查看执行日志
