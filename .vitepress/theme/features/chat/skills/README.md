# Skills System 使用指南

> Claude Code 风格的 Skills + Tools 整合系统

## 快速开始

### 1. 基础用法 (Vue 组件)

```vue
<script setup lang="ts">
import { useSkillLoader, type SkillMatchResult } from './skills'
import { aiService } from './api/services'
import { getToolDefinitions } from './tools'

const {
  availableSkills,
  activeSkills,
  isLoading,
  loadSkills,
  matchSkills,
  activateSkill,
  buildSystemPrompt
} = useSkillLoader()

// 初始化加载 Skills
onMounted(() => {
  loadSkills()
})

// 发送消息
async function sendMessage(userInput: string) {
  // 1. 匹配并激活 Skills
  const matches = matchSkills(userInput, {
    threshold: 0.2,
    maxMatches: 3
  })
  
  // 自动激活高匹配的 Skills
  matches.forEach((m: SkillMatchResult) => {
    if (m.score > 0.3) {
      activateSkill(m.skill.id, 'auto', m.score)
    }
  })
  
  // 2. 构建 System Prompt
  const systemPrompt = buildSystemPrompt(
    'MetaBlog AI 助手',
    userInput,
    getToolDefinitions(),
    { includeLOD0: true, includeLOD1: true, includeLOD2: true }
  )
  
  // 3. 调用 AI 服务
  await aiService.chatStream(
    messages,
    { 
      model: 'deepseek-chat',
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4000,
      enableReasoning: false,
      streaming: true
    },
    {
      onContent: (text) => { /* 处理内容 */ },
      onReasoning: (text) => { /* 处理思考 */ },
      onComplete: () => { /* 完成 */ },
      onError: (error) => { /* 处理错误 */ }
    }
  )
}
</script>
```

### 2. 推荐用法 (增强版服务)

```typescript
import { 
  skillIntegratedService, 
  loadBuiltinSkills 
} from './skills'

// 初始化 (应用启动时)
async function initialize() {
  const skills = await loadBuiltinSkills()
  skillIntegratedService.initializeSkills(skills)
}

// 发送消息
async function sendMessage(userInput: string) {
  await skillIntegratedService.chatStream(
    messages,
    {
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 4000,
      systemPrompt: '你是 MetaBlog AI 助手',
      // Skills 配置
      enableSkills: true,
      skillMatchThreshold: 0.2,
      maxActiveSkills: 3
    },
    {
      onContent: (text) => { /* 处理内容 */ },
      onReasoning: (text) => { /* 处理思考 */ },
      onComplete: () => { /* 完成 */ },
      onError: (error) => { /* 处理错误 */ },
      // Skill 激活回调
      onSkillActivation: (result) => {
        console.log('匹配的 Skills:', result.matches)
        console.log('新激活的 Skills:', result.activated)
        // UI 提示: "已激活文章管理、写作助手技能"
      }
    }
  )
}
```

---

## API 参考

### useSkillLoader() Hook

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `availableSkills` | `Ref<SkillMetadata[]>` | 所有可用 Skills |
| `activeSkills` | `Ref<ActiveSkill[]>` | 当前激活的 Skills |
| `isLoading` | `Ref<boolean>` | 加载状态 |
| `error` | `Ref<string\|null>` | 错误信息 |
| `loadSkills()` | `() => Promise<void>` | 加载所有 Skills |
| `matchSkills(input, options?)` | `(string, options) => SkillMatchResult[]` | 匹配 Skills |
| `activateSkill(id, source?, score?)` | `(string, source, number) => boolean` | 激活 Skill |
| `deactivateSkill(id)` | `(string) => void` | 停用 Skill |
| `toggleSkill(id)` | `(string) => boolean` | 切换激活状态 |
| `clearActiveSkills()` | `() => void` | 清空所有激活 |
| `buildSystemPrompt(baseRole, input, tools?, options?)` | 构建 System Prompt |

### SkillIntegratedService

| 方法 | 说明 |
|------|------|
| `initializeSkills(skills)` | 初始化 Skills 系统 |
| `chatStream(messages, config, callbacks, signal?, sessionId?)` | 增强版对话流 |
| `chatStreamSimple(messages, config, callbacks, signal?, sessionId?)` | 基础对话流 (无 Skills) |
| `toggleSkill(skillId)` | 切换 Skill 激活状态 |
| `getActiveSkills()` | 获取当前激活的 Skills |
| `clearActiveSkills()` | 清空所有激活的 Skills |

---

## Skill 文件格式

Skill 文件使用 YAML frontmatter + Markdown 格式：

```markdown
---
# 必填字段
id: article-manager           # 唯一标识 (小写+连字符)
name: 文章管理                 # 显示名称
description: 管理 VitePress 博客文章  # 一句话描述

# 可选字段 (推荐填写)
icom: 📝                      # 图标 emoji
category: content             # 分类 (content/research/code/file/system/multimedia/custom)
version: 1.0.0               # 版本
tags: [文章, 博客, 知识库]    # 标签列表
author: system               # 作者
builtin: true                # 是否内置
enabled: true                # 是否启用

# 触发条件
tools:                       # 声明需要的工具
  - search_articles
  - get_article_content
  - create_article
  - update_article
  - delete_article
  - list_articles
scenarios:                   # 使用场景描述
  - 用户想要查找已有文章
  - 用户想要创建新文章
  - 用户想要修改文章内容
  - 用户想要删除文章
  - 用户想要列出某个目录下的文章
---

## 使用场景

更详细的使用场景描述...

## Prompt

你是 VitePress 博客系统的文章管理专家...

### 存储位置
- `/sections/posts/` - 博客文章
- `/sections/knowledge/` - 知识库文档

### 工作流

#### 查找文章
1. 先询问用户文章标题或关键词
2. 调用 `search_articles(query="关键词")`
3. 获取文章路径后调用 `get_article_content(path="...")`

#### 创建文章
1. 询问文章标题和存储位置
2. 调用 `create_article(...)`

### 重要提示
- 不知道路径时: 先用 `search_articles` 搜索
- 删除操作: 必须设置 `confirm=true`
```

---

## 匹配规则

Skill 匹配器使用多规则加权算法：

| 规则 | 权重 | 说明 |
|------|------|------|
| 场景匹配 | 1.0 | 用户输入与 scenario 的相似度 |
| 标签匹配 | 0.8 | 用户输入包含 tag |
| 工具名匹配 | 0.7 | 用户输入包含工具名 |
| 名称匹配 | 0.6 | 用户输入与 Skill 名相似 |
| 描述匹配 | 0.4 | 用户输入与 description 相似 |

匹配分数 = Σ(规则分数 × 权重) / Σ(权重)

---

## 配置选项

### SkillMatchOptions

```typescript
interface SkillMatchOptions {
  threshold?: number      // 匹配阈值 (默认 0.15)
  maxMatches?: number     // 最大匹配数 (默认 3)
  include?: string[]      // 强制包含的 Skill IDs
  exclude?: string[]      // 强制排除的 Skill IDs
}
```

### PromptBuildOptions

```typescript
interface PromptBuildOptions {
  includeLOD0?: boolean   // 包含 Skill 列表 (默认 true)
  includeLOD1?: boolean   // 包含工具摘要 (默认 true)
  includeLOD2?: boolean   // 包含激活 Skill 内容 (默认 true)
  showToolInstructions?: boolean  // 显示工具使用说明 (默认 true)
}
```

---

## 示例场景

### 场景 1: 写文章

```
用户: "帮我写一篇关于 AI 的博客"

匹配:
- article-manager: 85% (场景: 用户想要创建新文章)
- writing-master: 72% (标签: 写作)

激活: [article-manager, writing-master]

AI 行为:
1. 使用 create_article 工具创建文章
2. 提供写作建议和大纲
3. 生成文章内容
```

### 场景 2: 查论文

```
用户: "查找最近的 GPT-4 研究"

匹配:
- academic-research: 90% (工具: search_arxiv, 标签: 学术)

激活: [academic-research]

AI 行为:
1. 使用 search_arxiv 搜索论文
2. 总结论文要点
3. 提供论文链接
```

### 场景 3: 管理文件

```
用户: "列出所有笔记"

匹配:
- file-manager: 80% (场景: 用户想要列出...)
- note-manager: 75% (标签: 笔记)

激活: [file-manager, note-manager]
```

---

## 调试

### 查看匹配过程

```typescript
import { debugMatch } from './skillMatcher'

const debug = debugMatch('帮我写文章', availableSkills)
console.log(debug)

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
//
// 2. ✍️ 写作大师 (writing-master)
//    分数: 72.0%
//    原因: tag(写作)
//    关键词: 写作
```

### 查看 Token 使用

```typescript
import { analyzePromptTokens } from './promptBuilder'

const analysis = analyzePromptTokens({
  baseRole: 'AI 助手',
  userInput: '帮我写文章',
  availableSkills,
  activeSkills,
  availableTools
})

console.log(analysis)
// {
//   lod0: 150,      // Skill 列表
//   lod1: 800,      // 工具摘要
//   lod2: 1200,     // 激活 Skill 内容
//   total: 2150     // 总计
// }
```

---

## 最佳实践

1. **Skill 粒度**: 每个 Skill 专注于一个领域，避免过于庞大
2. **触发条件**: 编写清晰的 scenarios，帮助匹配器准确识别
3. **工具声明**: 只声明 Skill 实际需要的工具，避免滥用
4. **Prompt 内容**: 使用清晰的结构和步骤，指导 AI 工作流
5. **标签选择**: 使用常用词汇作为标签，提高匹配率

---

## 故障排除

### Skill 未匹配

- 检查 scenario 是否包含用户可能的表达方式
- 添加更多相关标签
- 降低匹配阈值

### Token 使用过高

- 减少同时激活的 Skills 数量 (maxActiveSkills)
- 精简 Prompt 内容
- 禁用不必要的 LOD-1 工具摘要

### 工具未找到

- 确保 Skill 的 tools 字段声明了需要的工具
- 检查工具是否正确注册

---

## 相关文档

- [架构设计](./ARCHITECTURE.md) - 详细架构说明
- [Skill 示例](../../../../../.skills/article-manager/SKILL.md) - 示例 Skill 文件
- [工具系统](../tools/README.md) - Tools 系统文档
