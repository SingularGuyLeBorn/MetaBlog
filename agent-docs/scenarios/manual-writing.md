# 场景一：手动写作模式

## 场景描述

用户完全不使用 AI 功能，以传统方式进行博客写作。这是系统的**基础模式**，确保：
1. 向后兼容：原有博客功能完全保留
2. 隐私保护：敏感内容完全由用户掌控
3. 精确控制：每个细节由用户决定

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

手动写作模式是系统的**基础保障**：

1. **完全兼容**: 原有博客功能 100% 保留
2. **隐私可控**: 无 AI 介入，数据不上传
3. **成本为零**: 不产生任何 Token 消耗
4. **体验一致**: 用户习惯无需改变

这是其他两种 AI 模式的基础，确保系统始终有一个可靠的工作模式。
