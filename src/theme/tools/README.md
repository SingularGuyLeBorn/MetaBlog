# 工具系统 (Tool System)

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    工具系统架构                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Types     │───▶│  Registry   │───▶│  Executors  │     │
│  │   (类型)     │    │  (注册表)    │    │  (执行器)    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ ToolResult  │    │  Tool Call  │    │   Skill     │     │
│  │  统一返回    │    │   工具调用   │    │   技能集成   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 核心概念

### 1. Tool (工具)
工具是 Agent 可以调用的功能单元，每个工具包含：
- **Definition**: 工具定义（描述、参数 schema）- 给 AI 看的
- **Executor**: 执行器（实际实现逻辑）- 真正执行代码

### 2. ToolResult (统一返回格式)
所有工具必须返回统一的格式：
```typescript
interface ToolResult<T = any> {
  success: boolean      // 是否成功
  data?: T             // 返回数据
  error?: string       // 错误信息（技术细节）
  message?: string     // 用户友好消息
  action?: string      // 操作类型
  suggestion?: string  // 下一步建议
}
```

### 3. Skill (技能)
Skill 是工具的**组合包装**，定义了：
- 使用场景（何时应该调用这些工具）
- 工作流程（如何组合使用工具）
- 系统提示词（角色定义）

## 目录结构

```
tools/
├── README.md              # 本文件
├── index.ts               # 统一入口，注册所有工具
├── types.ts               # 类型定义
├── registry.ts            # 工具注册表
│
├── article/               # 文章管理工具
│   ├── index.ts          # 导出所有工具
│   └── <feature>.ts      # 工具定义 + 执行器（同一文件）
│
├── lark/                  # 飞书工具（已拆分）
│   ├── index.ts
│   ├── doc.ts            # 文档工具
│   ├── wiki.ts           # Wiki 工具
│   ├── im.ts             # IM 工具
│   ├── user.ts           # 用户工具
│   ├── image.ts          # 图片工具
│   └── permission.ts     # 权限工具
│
├── yuque/                 # 语雀工具（已拆分）
│   ├── index.ts
│   ├── repo.ts           # 知识库工具
│   ├── doc.ts            # 文档工具
│   ├── image.ts          # 图片工具
│   ├── search.ts         # 搜索工具
│   └── toc.ts            # 目录工具
│
├── github/                # GitHub 操作工具
├── academic/              # 学术研究工具
├── file/                  # 文件操作工具
├── platform/              # 平台解析工具
├── note/                  # 笔记工具
├── text/                  # 文本处理工具
├── code/                  # 代码工具
├── network/               # 网络工具
└── system/                # 系统工具
```

## 如何添加新工具

### 步骤 1: 创建分类文件
在对应目录创建 `<feature>.ts`，同时包含定义和执行器：

```typescript
import type { ToolDefinition, ToolExecutor } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

// --- 工具定义（给 AI 看） ---
export const myToolDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'my_tool',
    description: '工具的详细描述，告诉 AI 什么时候应该使用这个工具',
    parameters: {
      type: 'object',
      properties: {
        requiredParam: {
          type: 'string',
          description: '参数的描述'
        },
        optionalParam: {
          type: 'number',
          description: '可选参数',
          default: 10
        }
      },
      required: ['requiredParam']
    }
  }
}
// --- 执行器（实际实现） ---
export const myTool: ToolExecutor = async (args): Promise<ToolResult> => {
  // 1. 参数验证
  if (!args.requiredParam) {
    return createErrorResult(
      'Missing required parameter',
      '请提供必需的参数',
      '示例: my_tool(requiredParam="值")'
    )
  }

  // 2. 执行业务逻辑
  try {
    const result = await doSomething(args)

    // 3. 返回成功结果
    return createSuccessResult(result, '操作成功', 'my_tool')
  } catch (error: any) {
    // 4. 返回错误结果
    return createErrorResult(error.message, '操作失败', '请稍后重试')
  }
}
```

### 步骤 2: 导出工具
在对应目录的 `index.ts` 中导出：
```typescript
export { myTool, myToolDef } from './feature'
```

### 步骤 3: 注册工具
在 `index.ts` 的 `initializeDefaultTools()` 中注册：
```typescript
import { myTool, myToolDef } from './xxx'

registerTools([
  { name: 'my_tool', definition: myToolDef, executor: myTool }
])
```

## Skill 与 Tool 的关系

### 对比

| 维度 | Tool | Skill |
|------|------|-------|
| **粒度** | 单个功能 | 功能组合 |
| **定义** | 做什么 | 何时做、如何做 |
| **形式** | Function | Prompt Template |
| **注册** | 代码注册 | 配置文件 |

### 协作流程

```
用户输入
    ↓
Agent 判断需要哪个 Skill
    ↓
Skill 加载到对话上下文
    ↓
AI 决定调用哪些 Tool
    ↓
Tool 执行并返回结果
    ↓
AI 继续下一步或总结
```

### Skill 配置示例
```yaml
# skills/article-manager.md
---
name: "文章管理专家"
description: "管理博客文章的创建、编辑、删除"
tools:
  - create_article
  - get_article_content
  - update_article
  - delete_article
  - list_articles
  - search_articles
---

# 工作流说明
1. 先使用 search_articles 或 list_articles 查找文章
2. 使用 get_article_content 读取内容
3. 使用 update_article 修改内容
4. 或 create_article 创建新文章
```

## Claude Code 模式参考

Claude Code 的设计理念：

### 1. Progressive Disclosure (渐进式披露)
```
LOD-0 (System Prompt): 只有 Skills 列表（name + description）
LOD-1 (Function Calling): Tool 详细定义
LOD-2 (Skill Invoke): Skill 完整内容注入对话
```

### 2. Skill 不是身份
- ❌ "你是一个文章管理助手"
- ✅ "你有一个文章管理 Skill，当用户涉及文章操作时使用"

### 3. 自动匹配
AI 根据用户输入自动匹配应该调用的 Skill，不需要用户显式选择。

## 最佳实践

1. **单一职责**: 每个工具只做一件事
2. **参数验证**: 始终验证输入参数
3. **错误处理**: 返回友好的错误信息
4. **文档注释**: 详细的 JSDoc 注释
5. **返回格式**: 始终使用 ToolResult
