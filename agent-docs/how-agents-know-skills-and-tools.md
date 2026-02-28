# 模型如何知道 Skills 和 Tools？

## 核心原理（3层机制）

### 1️⃣ 系统提示词注入（System Prompt Injection）

每次对话开始时，将 Skills 和 Tools 的描述注入系统提示词：

```typescript
const systemPrompt = `
你是 MetaBlog 的 AI 助手，具备以下能力：

## 你的身份
${agent.baseRole}

## 你可以使用的技能
- 文章管理: 知识库文章的管理和写作能力
- GitHub代码管理: 代码仓库的浏览、搜索和管理能力

## 你可以调用的工具
### get_article_content
- 描述: 获取指定文章的内容
- 参数: { path: string }

### parse_zhihu
- 描述: 解析知乎文章内容
- 参数: { url: string }
`
```

### 2️⃣ Function Calling 协议

工具使用 OpenAI 标准的 JSON Schema 格式：

```typescript
{
  type: "function",
  function: {
    name: "read_file",
    description: "读取文件内容，当用户要求查看文件时使用",
    parameters: {
      type: "object",
      properties: {
        path: { 
          type: "string", 
          description: "文件路径，例如 'docs/readme.md'" 
        }
      },
      required: ["path"]
    }
  }
}
```

### 3️⃣ Skills 语义化包装

Skill 是工具的**场景化组合**：

```typescript
const writerSkill = {
  id: 'writer',
  name: '文章管理',
  content: `
## 工作流程
1. 使用 search_articles 搜索文章
2. 使用 get_article_content 读取内容
3. 使用 create_article 创建新文章
  `,
  tools: ['search_articles', 'get_article_content', 'create_article'],
  usageScenarios: ['用户要求创建文章', '用户要求搜索文章']
}
```

---

## 动态加载机制（3种方式）

| 方式 | 时机 | 说明 |
|------|------|------|
| **启动初始化** | 应用启动 | 注册所有内置工具（文章管理、GitHub、平台解析等） |
| **运行时动态** | MCP连接时 | 连接知乎/B站/GitHub等MCP Server时自动注册工具 |
| **Agent配置** | 切换Agent时 | 根据Agent的skillIds筛选可用工具 |

---

## 与 Claude Code / Kimi Code 对比

| 特性 | MetaBlog | Claude Code | Kimi Code |
|------|----------|-------------|-----------|
| **工具格式** | OpenAI JSON | XML标签 | OpenAI JSON |
| **Skills系统** | ✅ 显式定义 | ⚠️ 提示词描述 | ⚠️ 提示词描述 |
| **多Agent** | ✅ 支持多个专业Agent | ❌ 单Agent | ❌ 单Agent |
| **动态扩展** | ✅ MCP Server | ✅ MCP Client | ✅ MCP Client |
| **权限控制** | ✅ Agent级别 | ✅ 用户确认 | ✅ 用户确认 |

**关键差异**：
- MetaBlog 有**显式的 Skills 系统**，可以组合工具并定义使用场景
- MetaBlog 支持**多 Agent**，每个 Agent 可以有不同的能力组合
- Claude Code 使用 XML 格式描述工具，而 MetaBlog 和 Kimi 使用 OpenAI JSON 格式

---

## 执行流程图解

```
用户输入
    ↓
构建系统提示词（注入当前Agent的Skills + Tools）
    ↓
调用 LLM API，附带 tools 参数
    ↓
LLM 决定：直接回复 / 调用工具
    ↓
如需工具 → 执行工具函数 → 结果返回LLM → 生成最终回复
    ↓
返回给用户
```

---

## 项目中的具体实现位置

| 文件 | 功能 |
|------|------|
| `.vitepress/theme/components/ai-chat/core/tools/definitions.ts` | 所有工具的定义（JSON Schema） |
| `.vitepress/theme/components/ai-chat/core/tools/registry.ts` | 工具注册表，管理所有工具 |
| `.vitepress/theme/components/ai-chat/core/skills/registry.ts` | 技能注册表，管理所有 Skills |
| `.vitepress/theme/components/ai-chat/core/services/aiService.ts` | 构建系统提示词，调用LLM |

---

## 简单总结

> **模型并不"知道"自己有什么工具，而是每次对话时我们告诉它**：
> 1. 通过系统提示词描述 Skills 和 Tools
> 2. 通过 Function Calling API 传递工具 Schema
> 3. 模型根据描述**自主决定**何时调用哪个工具

这与 Claude Code 和 Kimi Code 的原理相同，但 MetaBlog 增加了**多 Agent 管理**和**显式 Skills 系统**，让能力组合更灵活可控。
