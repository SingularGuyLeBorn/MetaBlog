# AI Chat 重构文档

## 概述

本次提交完成了 AI Chat 系统的全面重构，从旧的 monolithic 架构迁移到模块化、可维护的新架构。

---

## 主要变更

### 1. 架构重构

#### 删除的目录
- `.vitepress/agent/` - 旧版 Agent 系统（过度设计，难以维护）
- `.vitepress/theme/components/agent/` - 旧版 Agent UI 组件
- `agent-docs/` - 旧的文档（已过时）

#### 新架构目录结构
```
.vitepress/theme/components/ai-chat/
├── core/                      # 核心层
│   ├── composables/           # 组合式函数
│   │   ├── useAIChat.ts      # 聊天核心逻辑
│   │   ├── useSkills.ts      # 技能管理
│   │   └── useAgents.ts      # Agent 管理
│   ├── services/              # 服务层
│   │   ├── aiService.ts      # DeepSeek API 服务
│   │   ├── storage.ts        # 本地存储
│   │   └── toolRegistry.ts   # 工具注册表
│   ├── types/                 # 类型定义
│   │   ├── index.ts          # 核心类型
│   │   └── tools.ts          # 工具类型
│   └── index.ts              # 核心导出
├── modules/                   # 功能模块
│   ├── agent/                # Agent 模块
│   │   ├── admin/            # Agent 管理中心
│   │   ├── skills/           # 技能管理 UI
│   │   ├── memory/           # 记忆管理
│   │   └── tools/            # 工具管理
│   └── chat/                 # 聊天模块
│       ├── session/          # 会话管理
│       ├── messages/         # 消息展示
│       ├── input/            # 输入框
│       └── settings/         # 设置面板
├── ui/                       # UI 组件
│   ├── MentionInput.vue     # 提及/技能输入
│   └── index.ts             # UI 导出
├── layouts/                  # 布局组件
│   └── ChatLayout.vue       # 聊天主布局
└── styles/                   # 样式文件
    └── index.css            # 主样式
```

---

## 2. 核心功能实现

### 2.1 技能管理系统

**文件**: `.vitepress/theme/components/ai-chat/core/composables/useSkills.ts`

**功能**:
- 8个内置技能（写作助手、文章总结、中英翻译、润色优化、代码生成、代码审查、概念解释、头脑风暴）
- 支持从文件系统加载/保存技能 (`.skills/*.md`)
- 完整的 CRUD 操作（创建、读取、更新、删除）
- 支持导入/导出技能文件

**数据结构**:
```typescript
interface Skill {
  id: string
  name: string
  description: string
  icon: string
  category: SkillCategory
  systemPrompt: string
  version: string
  tags?: string[]
}
```

### 2.2 文章引用系统 (@)

**文件**: `.vitepress/theme/components/ai-chat/ui/MentionInput.vue`

**功能**:
- 输入 `@` 触发文章选择面板
- 支持按标题和内容搜索
- 选中后在输入框显示 `@文章标题`
- 发送时自动加载完整文章内容

**实现细节**:
- 用户输入: `测试 引用 @测试文章的标题`
- 发送给 AI: 包含完整文章内容（在 `<reference>` 标签内）

### 2.3 Function Call (工具调用)

**文件**: 
- `.vitepress/theme/components/ai-chat/core/services/aiService.ts`
- `.vitepress/theme/components/ai-chat/core/services/toolRegistry.ts`

**实现流程**:
```
用户消息 → API 调用（非流式）检查 tool_calls → 
如有则执行工具 → 添加 assistant + tool 消息 → 
重新调用 API（流式）输出最终回复
```

**可用工具**:
- `get_article_content` - 获取指定文章完整内容
- `search_articles` - 根据关键词搜索文章
- `list_articles` - 列出所有可用文章
- `get_current_time` - 获取当前时间

---

## 3. 消息版本系统

**文件**: `.vitepress/theme/components/ai-chat/core/composables/useAIChat.ts`

**特性**:
- 一个用户消息对应多个 AI 响应版本
- 重新生成时保留历史版本
- 支持版本切换、删除
- 避免切换版本时的闪烁动画

**数据结构**:
```typescript
interface MessageGroup {
  userMessage: ChatMessage
  aiVersions: ChatMessage[]
  currentVersionIndex: number
}
```

---

## 4. Agent 等级系统

**文件**: `.vitepress/theme/components/ai-chat/core/composables/useAgents.ts`

**等级**（从高到低）:
1. `meta` - 元级别（最高优先级）
2. `core` - 核心级别
3. `fixed` - 固定级别
4. `custom` - 自定义级别
5. `temp` - 临时级别（最低优先级）

**座次系统**: 数字越小优先级越高

---

## 5. UI 组件

### 5.1 MentionInput.vue
- 支持 `@` 引用文章
- 支持 `/` 选择技能
- 技能显示为蓝色胶囊
- 引用显示为浅色提示

### 5.2 MessageBubble.vue
- 用户消息中的 `@文章` 显示为白色胶囊
- 技能信息从 metadata 读取并显示
- 支持 Markdown 渲染
- 思考过程可折叠

### 5.3 AgentAdmin.vue
- Agent 控制中心
- 按等级分组管理
- CRUD 操作
- 工具/记忆/统计管理

---

## 6. API 兼容性修复

### 6.1 Reasoner 模型约束
DeepSeek Reasoner 不接受连续的 assistant 消息，已通过 `cleanMessages()` 函数处理:
```typescript
const cleanMessages = messages
  .filter(m => m.content.trim() || m.role === 'user')
  .reduce((acc, m) => {
    const last = acc[acc.length - 1]
    if (last?.role === 'assistant' && m.role === 'assistant') {
      return acc  // 跳过连续的 assistant
    }
    acc.push(m)
    return acc
  }, [])
```

### 6.2 Tool 消息格式
确保 tool 消息紧跟在带 tool_calls 的 assistant 消息后:
```typescript
// assistant 消息
{ role: 'assistant', content: '', tool_calls: [...] }

// tool 结果消息
{ role: 'tool', content: '...', tool_call_id: '...', name: '...' }
```

---

## 7. 使用方式

### 7.1 基本聊天
```vue
<ChatLayout />
```

### 7.2 使用技能
1. 输入 `/` 打开技能面板
2. 选择技能（如"翻译助手"）
3. 输入内容发送
4. AI 会使用技能的 systemPrompt

### 7.3 引用文章
1. 输入 `@` 打开文章面板
2. 搜索并选择文章
3. 输入框显示 `@文章标题`
4. 发送时自动附加文章内容

---

## 8. 配置

### 8.1 环境变量
```bash
VITE_DEEPSEEK_API_KEY=your_api_key
```

### 8.2 技能存储
技能文件存储在项目根目录 `.skills/` 文件夹下，格式:
```markdown
---
name: "技能名称"
description: "技能描述"
icon: "✨"
category: "content"
version: "1.0.0"
tags: ["标签1", "标签2"]
---

系统提示词内容...
```

---

## 9. 技术细节

### 9.1 状态管理
- 使用 Vue 3 Composition API
- 状态存储在 composables 中
- 持久化到 localStorage

### 9.2 类型安全
- 完整的 TypeScript 类型定义
- 严格的类型检查

### 9.3 性能优化
- 组件按需加载
- 消息虚拟滚动（待实现）
- 防抖搜索

---

## 10. 已知问题

1. **Tool 调用在重新生成时**: 如果原消息触发了 tool 调用，重新生成时可能需要特殊处理
2. **大量文章加载**: 当前加载所有文章到内存，大量文章时可能需要分页

---

## 11. 后续计划

- [ ] 消息虚拟滚动
- [ ] 多模态支持（图片）
- [ ] 更多工具（搜索、计算器等）
- [ ] 会话导入/导出
- [ ] 云端同步

---

## 作者

本次重构由 AI 辅助完成，目标是构建一个简洁、可维护的 AI Chat 系统。
