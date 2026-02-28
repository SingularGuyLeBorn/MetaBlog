# AI Agent 如何知道 Skills 和 Tools？

## 概述

本文档详细解释 MetaBlog 中的 AI Agent 如何获取关于可用 Skills（技能）和 Tools（工具）的知识，以及与 Claude Code 和 Kimi Code 的实现对比。

---

## 核心原理

### 1. 系统提示词注入（System Prompt Injection）

这是让模型知道其能力的主要方式。在每次对话开始时，我们将 Skills 和 Tools 的描述注入到系统提示词中。

```typescript
// 示例：系统提示词结构
const systemPrompt = `
你是 MetaBlog 的 AI 助手，具备以下能力：

## 你的身份
${agent.baseRole}

## 你可以使用的技能
${skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}

## 你可以调用的工具
${tools.map(t => `
### ${t.function.name}
- 描述: ${t.function.description}
- 参数: ${JSON.stringify(t.function.parameters)}
`).join('\n')}

## 使用说明
当你需要执行特定任务时，请使用对应的工具。
调用工具时，请确保参数符合 JSON Schema 规范。
`
```

### 2. 工具定义（Tool Definitions）

每个工具都有严格的 JSON Schema 定义，符合 OpenAI Function Calling 规范：

```typescript
interface ToolDefinition {
  type: 'function'
  function: {
    name: string                    // 工具名称（唯一标识）
    description: string             // 工具描述（告诉AI何时使用）
    parameters: {
      type: 'object'
      properties: Record<string, {
        type: string
        description: string
        enum?: string[]            // 可选：枚举值
      }>
      required: string[]           // 必填参数
    }
  }
}
```

### 3. 技能定义（Skill Definitions）

Skill 是对工具的语义化包装，提供使用场景和方法论：

```typescript
interface Skill {
  id: string
  name: string
  description: string
  content: string        // 详细的使用指南（Markdown格式）
  tools: string[]        // 该技能包含的工具列表
  usageScenarios: string[]  // 使用场景
}
```

---

## 动态加载机制

### 1. 启动时初始化

```typescript
// tools/registry.ts
const tools = new Map<string, ToolRegistration>()

export function registerTool(
  name: string, 
  definition: ToolDefinition, 
  executor: ToolExecutor
): void {
  tools.set(name, { definition, executor })
}

// 应用启动时注册所有内置工具
export function initializeDefaultTools(): void {
  registerTools([
    { name: 'get_article_content', definition: getArticleContentDef, executor: getArticleContent },
    { name: 'parse_zhihu', definition: parseZhihuDef, executor: parseZhihuExecutor },
    // ... 更多工具
  ])
}
```

### 2. 运行时动态注册

```typescript
// MCP Server 连接时动态注册工具
mcpManager.onEvent((event, data) => {
  if (event === 'server.connected') {
    data.server.tools.forEach(tool => {
      registerTool(
        `${data.server.id}_${tool.name}`,
        createMCPToolDefinition(tool),
        createMCPToolExecutor(data.server.id, tool)
      )
    })
  }
})
```

### 3. Agent 配置时筛选

每个 Agent 可以配置可用的 Skills 和 Tools：

```typescript
interface AgentConfig {
  skillIds: string[]      // 激活的技能
  toolIds: string[]       // 额外激活的工具
  mode: 'raw' | 'skills' | 'tools' | 'hybrid'
}

// 构建该Agent的可用工具列表
function getAgentTools(agent: Agent): ToolDefinition[] {
  const tools = new Set<string>()
  
  // 从Skills获取工具
  agent.skillIds.forEach(skillId => {
    const skill = getSkillById(skillId)
    skill?.tools.forEach(tool => tools.add(tool))
  })
  
  // 添加额外工具
  agent.toolIds.forEach(tool => tools.add(tool))
  
  // 获取工具定义
  return Array.from(tools).map(name => getToolDefinition(name))
}
```

---

## 执行流程

### 完整的消息处理流程

```
用户输入 → 构建系统提示词（注入Skills/Tools） → 调用LLM API
                                              ↓
响应处理 ← 执行工具调用 ← 检测到tool_calls ←┘
   ↓
返回结果给用户
```

### 代码示例

```typescript
// aiService.ts
async function processMessage(userMessage: string, agentConfig: AgentConfig) {
  // 1. 获取系统提示词（包含Skills和Tools）
  const systemPrompt = buildSystemPrompt(agentConfig)
  
  // 2. 获取可用工具定义
  const tools = getAgentTools(agentConfig)
  
  // 3. 调用LLM
  const response = await fetch('/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      tools  // 告诉LLM有哪些工具可用
    })
  })
  
  // 4. 检查是否需要调用工具
  if (response.tool_calls) {
    const results = await executeTools(response.tool_calls)
    
    // 5. 将工具结果送回LLM获取最终回复
    const finalResponse = await fetch('/chat/completions', {
      body: JSON.stringify({
        messages: [
          ...previousMessages,
          { role: 'assistant', tool_calls: response.tool_calls },
          ...results.map(r => ({ role: 'tool', content: r }))
        ]
      })
    })
    
    return finalResponse.content
  }
  
  return response.content
}
```

---

## 与 Claude Code 和 Kimi Code 的对比

### 功能对比表

| 特性 | MetaBlog | Claude Code | Kimi Code |
|------|----------|-------------|-----------|
| **工具发现** | 系统提示词注入 + Function Calling | 系统提示词 + XML工具标签 | 系统提示词 + Function Calling |
| **动态加载** | ✅ MCP Server 运行时注册 | ✅ 内置工具 + 可扩展 | ✅ 内置工具 + 可扩展 |
| **Skills系统** | ✅ 语义化工具组合 | ⚠️ 通过系统提示词 | ⚠️ 通过系统提示词 |
| **权限控制** | ✅ Agent级别工具筛选 | ✅ 用户确认机制 | ✅ 用户确认机制 |
| **多Agent** | ✅ 支持多个专业Agent | ⚠️ 单Agent模式 | ⚠️ 单Agent模式 |
| **MCP支持** | ✅ 完整MCP Client/Server | ✅ MCP Client | ✅ MCP Client |
| **持久化** | ✅ 后端JSON文件 | ✅ 本地存储 | ✅ 本地存储 |

### 实现差异

#### 1. 工具描述格式

**MetaBlog / Kimi Code**（OpenAI风格）：
```json
{
  "type": "function",
  "function": {
    "name": "read_file",
    "description": "读取文件内容",
    "parameters": {
      "type": "object",
      "properties": {
        "path": { "type": "string" }
      },
      "required": ["path"]
    }
  }
}
```

**Claude Code**（XML风格）：
```xml
<tool>
  <name>read_file</name>
  <description>读取文件内容</description>
  <parameters>
    <parameter name="path" type="string" required="true"/>
  </parameters>
</tool>
```

#### 2. 工具调用响应

**MetaBlog / Kimi Code**：
```json
{
  "tool_calls": [{
    "id": "call_123",
    "type": "function",
    "function": {
      "name": "read_file",
      "arguments": "{\"path\":\"/tmp/test.txt\"}"
    }
  }]
}
```

**Claude Code**：
```xml
<tool_use>
  <name>read_file</name>
  <parameters>{"path": "/tmp/test.txt"}</parameters>
</tool_use>
```

#### 3. Skills 实现

**MetaBlog**（显式Skills系统）：
```typescript
// Skill定义包含详细的使用指南
const writerSkill: Skill = {
  id: 'writer',
  name: '文章管理',
  content: `
## 文章管理流程
1. 使用 search_articles 搜索文章
2. 使用 get_article_content 读取内容
3. 使用 create_article 创建新文章
  `,
  tools: ['search_articles', 'get_article_content', 'create_article'],
  usageScenarios: ['用户要求创建文章', '用户要求搜索文章']
}
```

**Claude Code / Kimi Code**（通过系统提示词）：
```typescript
// 直接在系统提示词中描述能力
const systemPrompt = `
你可以使用以下工具：
- read_file: 读取文件
- write_file: 写入文件

使用场景：
当用户要求查看文件时，使用 read_file
当用户要求修改文件时，使用 write_file
`
```

### 优势对比

| 方面 | MetaBlog优势 | Claude Code优势 | Kimi Code优势 |
|------|-------------|-----------------|---------------|
| **灵活性** | 多Agent系统，每个Agent有不同能力 | 简单直接，开箱即用 | 与Kimi模型深度集成 |
| **可扩展性** | 完整的MCP生态系统 | Anthropic官方支持 | Moonshot官方支持 |
| **可控性** | 精细的工具权限控制 | 强大的代码能力 | 强大的中文理解 |
| **多模态** | ✅ 图片/视频理解 | ⚠️ 有限支持 | ✅ 图片/视频理解 |

---

## 最佳实践

### 1. 工具描述编写

```typescript
// ✅ 好的描述
{
  name: 'search_articles',
  description: `搜索知识库文章。当用户询问"查找XX文章"、"搜索关于XX的内容"时使用。

使用场景：
1. 用户想找特定主题的文章
2. 需要获取文章路径以便读取内容
3. 在特定分类下搜索文章

返回结果包含可直接用于 get_article_content 的文章路径。`,
  parameters: {
    properties: {
      query: { 
        type: 'string',
        description: '搜索关键词，支持模糊匹配。例如"深度学习"、"Docker"'
      }
    }
  }
}

// ❌ 差的描述
{
  name: 'search_articles',
  description: '搜索文章',
  parameters: {
    properties: {
      query: { type: 'string' }
    }
  }
}
```

### 2. Skill 设计原则

```typescript
// ✅ 好的Skill设计
const githubSkill: Skill = {
  id: 'github',
  name: 'GitHub代码管理',
  description: '浏览和搜索GitHub代码仓库的能力',
  content: `
## 工作流程
1. 使用 github_get_repo 获取仓库信息
2. 使用 github_list_repo_contents 浏览目录
3. 使用 github_get_file_content 读取源代码

## 注意事项
- 搜索时使用具体的关键词
- 优先参考知名项目的代码（高Star数）
- 注意代码的License信息
  `,
  tools: ['github_get_repo', 'github_list_repo_contents', 'github_get_file_content'],
  usageScenarios: [
    '用户要求查看GitHub仓库',
    '用户要求学习开源项目代码',
    '用户要求搜索代码示例'
  ]
}
```

### 3. 权限控制

```typescript
// Agent配置时限制可用工具
const researchAgent: Agent = {
  name: '研究助手',
  skillIds: ['web-search', 'data-analysis'],  // 只能使用搜索和分析技能
  toolIds: ['fetch_url'],  // 额外授权fetch_url
  forbiddenTools: ['delete_article', 'write_file']  // 明确禁止危险操作
}
```

---

## 故障排查

### 模型不调用工具

1. **检查工具描述是否清晰**
   - 描述中是否包含使用场景？
   - 参数描述是否足够详细？

2. **检查系统提示词**
   - Skills和Tools是否正确注入？
   - 提示词是否过于冗长导致模型混淆？

3. **检查模型支持**
   - 当前模型是否支持Function Calling？
   - DeepSeek-chat和Kimi系列支持，GPT-3.5-turbo不支持

### 工具调用参数错误

1. **检查JSON Schema**
   - 参数类型定义是否正确？
   - required数组是否包含所有必填参数？

2. **添加参数验证**
```typescript
const executor = async (args: Record<string, any>) => {
  // 参数验证
  if (!args.path || typeof args.path !== 'string') {
    return '❌ 错误：path参数必须是字符串'
  }
  
  // 执行工具
  return await readFile(args.path)
}
```

---

## 总结

MetaBlog 的 Agent 系统通过以下方式让模型知道其能力：

1. **系统提示词注入**：在每次请求时将Skills和Tools描述发送给模型
2. **Function Calling**：使用标准的OpenAI格式定义工具
3. **动态注册**：支持运行时通过MCP添加新工具
4. **权限控制**：Agent级别控制可用工具集

与 Claude Code 和 Kimi Code 相比，MetaBlog 提供了更灵活的**多Agent系统**和**显式Skills管理**，适合构建复杂的Agent生态。
