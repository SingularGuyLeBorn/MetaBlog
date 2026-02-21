# 场景一：手动写作模式

## 场景描述

用户主导博客的内容创作，进行传统的手动增删改查。在此基础上，**AI 提供轻度参与和辅助**，它不主动控制全篇，但在卡壳或需要帮助时随叫随到。这是系统的**基础与协作模式**，确保：
1. 向后兼容：原有传统博客的灵活特性完全保留
2. 隐私保护：敏感内容的编辑完全由用户掌控，AI 只处理显式指定的内容
3. 随时唤起：选中文字片段进行润色、解释或扩写
4. 精确控制：每个段落和细节由用户决定合并集成

## 用户旅程

### 1. 创建内容结构

用户直接在 `docs/` 目录下创建文件夹和文件：

```
docs/
├── posts/
│   ├── tech/                    # 创建技术分类
│   │   ├── ai/
│   │   │   └── llm-basics.md   # 新建文章
│   │   └── web/
│   │       └── vitepress-guide.md
│   └── life/
│       └── reading-notes.md
├── code/
│   └── python/
│       └── data-analysis.py    # 代码文件
└── knowledge/
    └── machine-learning/
        └── transformer-arch.md
```

**文件类型支持**:
- `.md` - Markdown 文章（主要）
- `.py/.js/.ts` 等 - 代码文件（Shadow 自动转 Markdown）
- `.json/.yaml` - 配置文件
- 图片、PDF 等附件

### 2. 编辑文章

用户访问编辑器页面，进行纯手动编辑：

```
URL: http://localhost:5173/posts/tech/ai/llm-basics.html

┌─────────────────────────────────────────────────────────────┐
│ MetaUniverse Blog                              [编辑] [历史] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 模式: [👤 MANUAL ▼]  ← 默认手动模式，无 AI 介入              │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ # LLM 基础概念                                          │  │
│ │                                                         │  │
│ │ ## 什么是大语言模型                                      │  │
│ │                                                         │  │
│ │ 大语言模型（LLM）是指...                                  │  │
│ │                                                         │  │
│ │ ## 核心概念                                              │  │
│ │                                                         │  │
│ │ - [[Transformer]] 架构                                  │  │
│ │ - [[Attention Mechanism]] 注意力机制                     │  │
│ │ - [[Embedding]] 嵌入向量                                 │  │
│ │                                                         │  │
│ │ [光标在此输入...]                                         │  │
│ │                                                         │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ 状态: 已保存 | 字数: 1,240 | 最后保存: 10秒前                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**编辑器特性**:
- Vditor Markdown 编辑器（完整功能）
- 实时预览
- 大纲导航
- WikiLinks 高亮 `[[...]]`
- 自动保存（本地存储 + 文件保存）
- **无 AI 建议、无悬浮球提示**

### 3. 保存与版本控制

用户按 `Ctrl+S` 保存：

```typescript
// 保存流程
1. 前端: 调用 POST /api/files/save
   Body: { path: 'posts/tech/ai/llm-basics.md', content: '...' }

2. 后端: 写入文件系统
   → docs/posts/tech/ai/llm-basics.md

3. 后端: 自动 Git 提交
   → git commit -m "content: 更新LLM基础概念"
   
4. 前端: 显示 "保存成功"，更新状态栏
```

**Git 提交信息规范（人工）**:
```
commit 7a3b2c1d
Author: User <user@example.com>
Date:   Mon Feb 18 10:00:00 2026

    content: 更新LLM基础概念，补充注意力机制章节
    
    - 添加 Transformer 架构说明
    - 补充代码示例
    - 修复格式问题
```

### 4. 自动识别与展示

VitePress 自动识别文件结构并生成导航：

```typescript
// .vitepress/config.ts
export default {
  themeConfig: {
    sidebar: {
      // 自动生成侧边栏
      '/posts/tech/': [
        {
          text: 'AI',
          items: [
            { text: 'LLM 基础', link: '/posts/tech/ai/llm-basics' },
            // 自动识别新文件并添加
          ]
        },
        {
          text: 'Web',
          items: [
            { text: 'VitePress 指南', link: '/posts/tech/web/vitepress-guide' }
          ]
        }
      ]
    }
  }
}
```

**前端自动识别**:
- 文件夹 → 导航分类
- `index.md` → 分类首页
- 其他 `.md` → 文章页面
- 代码文件 → Shadow 展示页

### 5. 访问与分享

```
文章 URL: https://blog.domain.com/posts/tech/ai/llm-basics.html

特性:
- SEO 友好的静态页面
- 快速加载（CDN 缓存）
- 响应式设计
- 代码高亮
- WikiLinks 可点击跳转
```

## 系统行为

### AI 组件状态

| 组件 | 行为 | 原因 |
|-----|------|------|
| AIChatOrb | 隐藏/禁用 | 手动模式下不干扰 |
| InlineSuggestion | 关闭 | 无 AI 建议 |
| ContextIndicator | 显示基础信息 | 字数、保存状态 |
| KnowledgeGraph | 正常工作 | 展示 WikiLinks 关系 |

### 数据流

```
用户编辑 (L5)
    ↓
Vditor 编辑器
    ↓
自动保存 (localStorage)
    ↓
Ctrl+S / 定时保存
    ↓
POST /api/files/save (BFF API)
    ↓
文件系统写入 (L1)
    ↓
Git 提交 (人工标记)
    ↓
触发构建 (可选)
```

## 实现状态

| 功能 | 状态 | 说明 |
|-----|------|------|
| 文件创建 | ✅ 完成 | 用户手动创建 |
| 文件夹结构 | ✅ 完成 | 自动识别为导航 |
| Vditor 编辑 | ✅ 完成 | 完整 Markdown 支持 |
| 自动保存 | ✅ 完成 | localStorage + 文件 |
| Git 版本 | ✅ 完成 | 自动提交 |
| 静态生成 | ✅ 完成 | VitePress 原生 |
| WikiLinks | ✅ 完成 | 高亮 + 跳转 |
| 代码 Shadow | ✅ 完成 | 自动转 Markdown |

## 配置方式

```typescript
// .vitepress/theme/components/agent/GlobalPageEditorAGI.vue
const editorMode = ref<'MANUAL' | 'COLLAB' | 'AGENT'>('MANUAL')

// MANUAL 模式下禁用 AI 功能
watch(editorMode, (mode) => {
  if (mode === 'MANUAL') {
    // 隐藏 AI 悬浮球
    showAIChatOrb.value = false
    // 关闭内联建议
    enableInlineSuggestion.value = false
    // 停止监听输入
    stopContentAnalysis()
  }
})
```

## 总结

轻度辅助写作模式是系统的**基础保障与最佳实践结合点**：

1. **绝对主导**: 原有博客创作灵活特性 100% 保留
2. **渐进增强**: AI 在用户需要时提供选段改写、术语解释的轻量级辅助
3. **隐私可控**: 只有主动请求的 Context 才会进入 AI 处理流

---

## 架构与设计评估

### 1. 逻辑闭环与流程通畅度
- **流转层**：用户的划选请求及光标位置构成 `Context`，借由前端发送给后端 `AgentRuntime` 的 `processInput` 接口，模型生成后原路展示给用户或由客户端脚本执行增量替换，形成完整的请求 -> 响应 -> 渲染修改 -> 保存（`Ctrl+S` -> `/api/files/save`）的数据闭环。
- **评价**：流程绝对通畅且设计正确，全部落地均依托底层的显式 File IO，无任何魔改脱轨隐患。

### 2. 兜底与防灾机制
- **接口防抖与超时挂起**：轻度调用的网络接口设有自动防抖控制，并在模型响应（通常受到网络提供商不稳定影响）超过 30s 时降级报错，同时**不会打断**用户自身对编辑器的继续输入。
- **文件防丢与恢复**：本地拥有浏览器 `localStorage` 级别的富文本缓存防灾处理。若 AI 推荐内容导致 DOM 断层，用户也可直接进行页面重刷新找回原本手写底稿。
- **Token 限额兜底**：如果遇到超长文章的修改，`Context` 将仅截取用户光标前后的前置和后置 500 字符上下文传入，防止遇到 `Context Window Exceeded` 和过度计费。

### 3. 日志系统监听
本流程每个阶段皆由 `StructuredLogger` 记录入档：
- **请求阶段 (`logger.ai`)**: `agent.start` 日志打印，记录时间戳以及本次请求是否携带了轻度修改的上下文（`Context Object`）。
- **执行阶段 (`IntentRouter`)**: 若触发快捷指令，系统依然会记录 `parse` 判断分支是否精准命中了 `EDIT_CONTENT`。
- **结束断言 (`logger.ai`)**: 生成完毕返回 `agent.complete`，或者遇到断网抛出带有 `error` 堆栈内容的 `agent.error` 日志，附带每次调用的 Token 消耗详情，确保存档追踪一览无余。
