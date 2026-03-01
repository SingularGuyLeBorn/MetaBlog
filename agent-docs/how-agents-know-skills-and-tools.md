# 模型如何知道 Skills 和 Tools？（Claude Code 模式）

## 核心原理

MetaBlog 采用 **Claude Code 的 Skills 模式**，与 Claude Code 和 Kimi Code 的实现方式一致：

### 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  Agent (agent.md)                                       │
│  - 身份定义（baseRole）                                   │
│  - 可用 Skills 列表（仅名称+描述）                          │
│  - 记忆配置                                             │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ 对话时 AI 自行判断加载
┌─────────────────────────────────────────────────────────┐
│  Skills (SKILL.md)                                      │
│  - 能力描述（name + description）                         │
│  - 详细 Prompt（调用时注入）                              │
│  - 可用工具列表                                          │
│  - 工具定义和使用说明                                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼ 工具执行
┌─────────────────────────────────────────────────────────┐
│  Tools (definitions + executors)                        │
│  - JSON Schema 定义（给 AI 看）                           │
│  - 执行函数（实际逻辑）                                    │
└─────────────────────────────────────────────────────────┘
```

## 与旧模式的区别

### ❌ 已废弃：四模式配置

```typescript
// 旧模式（已废弃）
interface OldAgentConfig {
  mode: 'raw' | 'skills-only' | 'tools-only' | 'hybrid'
  skillIds: string[]
  toolIds: string[]
}
```

| 旧模式 | 问题 |
|--------|------|
| raw | 无工具能力 |
| skills-only | 固定加载所有 skills，不够灵活 |
| tools-only | 需要手动选择工具 |
| hybrid | 配置复杂，容易冲突 |

### ✅ 当前：Claude Code 模式

```typescript
// 当前模式（Claude Code 风格）
interface AgentConfig {
  // 基础身份
  baseRole: string
  
  // 可用 Skills 列表（仅名称和描述）
  availableSkills: Array<{
    name: string
    description: string
  }>
  
  // 没有 mode 概念
  // 没有固定 skillIds
  // AI 自己判断何时加载哪个 Skill
}
```

**优势：**
- ✅ 更自然的 AI 交互
- ✅ 按需加载，节省 Token
- ✅ 与 Claude Code 兼容
- ✅ 配置更简单

---

## 详细机制

### 1. Agent 配置（agent.md）

每个 Agent 有一个 `agent.md` 配置文件：

```markdown
# Agent: 写作助手

## 身份
你是 MetaBlog 的写作助手，擅长技术文章创作和编辑。

## 可用 Skills

### 文章大师
专业写作助手，擅长各类文本创作和编辑

### 翻译专家
多语言翻译助手，支持技术文档翻译

### 内容分析
分析和总结文章内容，提取关键信息

## 记忆
- 用户的写作风格偏好
- 常用的技术术语
- 历史对话要点
```

**关键特点：**
- 只列出 **Skill 名称 + 简短描述**
- **不预加载** Skill 的详细内容
- AI 根据用户输入**自行判断**需要哪个 Skill

### 2. Skill 定义（SKILL.md）

每个 Skill 是一个目录，包含 `SKILL.md`：

```markdown
# 文章大师

## 描述
专业写作助手，擅长各类文本创作和编辑

## 元数据
- **ID**: skill-writing-master
- **图标**: ✍️
- **分类**: writing
- **版本**: 1.0.0

## 可用工具
- summarize_text: 生成文本摘要
- format_text: 格式化文本
- create_article: 创建文章
- update_article: 更新文章

---

## Prompt（调用时注入）

你是一位专业的写作助手，擅长各类文本创作。

### 职责范围
1. 文章撰写和润色
2. 文案创作
3. 内容编辑和校对

### 工具使用指南

**summarize_text**
- 何时使用：用户要求总结长文本时
- 参数：text (要总结的文本), max_length (最大长度)

**create_article**
- 何时使用：用户要求创建新文章时
- 参数：title, path, content, tags?
- 示例：
  ```
  title: "React 最佳实践"
  path: "frontend/react-best-practices.md"
  content: "# React 最佳实践\n\n..."
  ```

### 输出风格
- 流畅自然的语言表达
- 结构清晰，逻辑连贯
```

**关键特点：**
- 包含 **完整的工具定义和使用说明**
- 包含 **何时使用哪个工具的指南**
- 只在 **调用时注入** 到对话上下文

### 3. Tools 定义

工具使用标准的 JSON Schema（OpenAI Function Calling 格式）：

```typescript
// definitions.ts
export const createArticleDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'create_article',
    description: '创建一篇新文章。当用户明确要求创建文章时使用。',
    parameters: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: '文章标题' 
        },
        path: { 
          type: 'string', 
          description: '文章路径，如 "knowledge/my-article.md"' 
        },
        content: { 
          type: 'string', 
          description: '文章内容（Markdown）' 
        }
      },
      required: ['title', 'path', 'content']
    }
  }
}
```

---

## 对话流程

### 单次 Skill 调用

```
用户输入: "帮我写一篇关于 React 的文章"
    ↓
系统构建 Prompt:
---
你是 MetaBlog 的写作助手...

可用 Skills:
- 文章大师: 专业写作助手...
- 翻译专家: 多语言翻译助手...
- 内容分析: 分析和总结文章...

请根据用户需求，自行判断是否需要调用某个 Skill。
如果需要，请说明你要使用哪个 Skill。
---
    ↓
AI 判断: 用户需要写作，调用「文章大师」
    ↓
系统注入 Skill 内容:
---
[文章大师 Skill 的完整 Prompt]

可用工具:
- create_article: ...
- summarize_text: ...
---
    ↓
AI 决定调用: create_article
    ↓
执行工具 → 返回结果
    ↓
AI 生成回复: "文章已创建成功！"
```

### 多 Skill 协作

```
用户输入: "帮我找一篇 React 文章，翻译成中文，然后总结要点"
    ↓
AI 判断: 需要多个 Skills
    ↓
第一轮 - 调用「内容分析」Skill:
- 使用 search_articles 找到 React 文章
- 使用 get_article_content 获取内容

第二轮 - 调用「翻译专家」Skill:
- 使用 translate_text 翻译成中文

第三轮 - 再次调用「内容分析」Skill:
- 使用 summarize_text 总结要点
    ↓
生成最终回复
```

---

## 与 Claude Code / Kimi Code 对比

| 特性 | MetaBlog | Claude Code | Kimi Code |
|------|----------|-------------|-----------|
| **配置方式** | agent.md + SKILL.md | claude.md + skill/ | system prompt |
| **Skill 加载** | AI 自行判断 | AI 自行判断 | 预加载所有 |
| **工具定义位置** | SKILL.md | skill/ 目录 | system prompt |
| **动态加载** | ✅ | ✅ | ❌ |
| **多 Agent** | ✅ | ❌ | ❌ |

**核心差异：**
- MetaBlog 支持**多 Agent**，每个 Agent 有自己的 agent.md
- Claude Code 是单 Agent，通过 claude.md 配置
- Kimi Code 通常预加载所有 tools

---

## 项目实现

### 目录结构

```
.skills/                          # Skills 目录
├── writing-master/               # 文章大师 Skill
│   └── SKILL.md                  # Skill 定义
├── code-craft/                   # 代码专家 Skill
│   └── SKILL.md
├── content-analyst/              # 内容分析 Skill
│   └── SKILL.md
└── ...

.vitepress/theme/components/ai-chat/core/
├── tools/                        # 工具实现
│   ├── definitions.ts            # 工具 Schema
│   ├── registry.ts               # 工具注册表
│   └── executors-*.ts            # 工具执行器
├── skills/                       # Skill 管理
│   └── registry.ts               # Skill 注册表
└── services/
    └── aiService.ts              # AI 服务（构建 Prompt）
```

### 关键实现代码

```typescript
// aiService.ts - 构建系统提示词
function buildSystemPrompt(agent: Agent): string {
  // 1. 基础身份
  let prompt = `# ${agent.name}\n\n`
  prompt += `## 身份\n${agent.baseRole}\n\n`
  
  // 2. 可用 Skills 列表（仅名称和描述）
  prompt += `## 可用 Skills\n\n`
  for (const skill of agent.availableSkills) {
    prompt += `### ${skill.name}\n${skill.description}\n\n`
  }
  
  // 3. 使用说明
  prompt += `## 使用说明\n\n`
  prompt += `请根据用户需求，自行判断是否需要调用某个 Skill。`
  prompt += `如果需要，请回复："我将使用 [Skill名称] 来帮助您"，`
  prompt += `然后我会为你加载该 Skill 的详细能力。`
  
  return prompt
}

// 加载 Skill 内容
function loadSkillContent(skillId: string): string {
  const skillPath = `.skills/${skillId}/SKILL.md`
  const content = fs.readFileSync(skillPath, 'utf-8')
  
  // 提取 Prompt 部分（--- 之后的内容）
  const promptMatch = content.match(/---\s*\n([\s\S]+)/)
  return promptMatch ? promptMatch[1] : content
}
```

---

## 开发指南

### 创建新 Skill

1. **创建目录**
```bash
mkdir .skills/my-skill
```

2. **编写 SKILL.md**
```markdown
# My Skill

## 描述
简短描述这个 Skill 是做什么的

## 元数据
- **ID**: skill-my-skill
- **图标**: 🎯
- **分类**: custom

## 可用工具
- tool_1: 工具1描述
- tool_2: 工具2描述

---

## Prompt

你是...（详细角色定义）

### 职责范围
1. ...
2. ...

### 工具使用指南
...
```

3. **在 Agent 中配置**
```markdown
# agent.md

## 可用 Skills
...

### My Skill
简短描述
```

### 创建新工具

在 `tools/definitions.ts` 中添加：

```typescript
export const myToolDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: '详细描述',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: '参数说明' }
      },
      required: ['param1']
    }
  }
}
```

在 `tools/executors-*.ts` 中实现：

```typescript
export const myTool = async (args: { param1: string }) => {
  // 实现逻辑
  return '执行结果'
}
```

---

## 总结

> **Claude Code 模式的核心思想：**
> 1. Agent 只定义身份和可用 Skills 列表
> 2. Skill 包含详细的能力和工具定义
> 3. AI 根据对话上下文**自行判断**何时加载哪个 Skill
> 4. Skill 的详细内容**按需注入**，节省 Token
> 
> 这与 Claude Code 的实现方式完全一致，是最先进的 AI 工具调用模式。
