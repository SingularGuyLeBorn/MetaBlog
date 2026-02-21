# AI Chat 重构说明 - 清晰结构 + 浅色主题

## 目录结构

```
.vitepress/theme/
├── components/ai-chat/
│   ├── styles/
│   │   ├── variables.css      # CSS 变量（浅色主题）
│   │   ├── animations.css     # 动画关键帧
│   │   └── components.css     # 通用组件样式
│   ├── ui/                    # 基础 UI 组件
│   │   ├── Avatar.vue         # 头像组件
│   │   ├── Button.vue         # 按钮组件
│   │   ├── Icon.vue           # 图标组件
│   │   └── index.ts           # 入口
│   ├── features/              # 功能组件
│   │   ├── SessionPanel.vue   # 会话列表面板
│   │   ├── MessageList.vue    # 消息列表
│   │   ├── MessageBubble.vue  # 消息气泡
│   │   ├── ChatInput.vue      # 输入框
│   │   ├── SettingsPanel.vue  # 设置面板
│   │   └── index.ts           # 入口
│   ├── layouts/               # 布局组件
│   │   └── ChatLayout.vue     # 主布局
│   ├── types.ts               # 类型定义
│   └── index.ts               # 总入口
├── composables/ai-chat/
│   ├── useAIChat.ts           # 核心逻辑
│   └── index.ts
└── services/ai-chat/
    ├── storage.ts             # 本地存储
    ├── aiService.ts           # AI API
    └── index.ts
```

## 浅色主题特点

- **主背景**: #f8fafc (浅灰蓝)
- **卡片背景**: #ffffff (纯白)
- **主色调**: #3b82f6 (清新蓝)
- **成功色**: #10b981 (青绿)
- **文字层级**: 主文字 #111827 → 次文字 #4b5563 → 辅助 #6b7280 → 禁用 #9ca3af

## 组件依赖关系

```
ChatLayout
├── SessionPanel (左侧)
│   └── Avatar, Button, Icon
├── MessageList (中间)
│   └── MessageBubble
│       └── Avatar, Icon
├── ChatInput (底部)
│   └── Icon
└── SettingsPanel (右侧)
    └── Icon
```

## 使用

```vue
<template>
  <ChatLayout />
</template>

<script setup>
import { ChatLayout } from './components/ai-chat'
</script>
```
