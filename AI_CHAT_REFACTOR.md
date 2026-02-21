# AI Chat 界面重构说明

## 概述

本次重构基于 VitePress 框架，重新设计并实现了 MetaBlog 项目的 AI 对话界面。重构目标：简化架构、完善功能、提升体验。

---

## 一、现有问题总结

### 架构问题
1. **过度复杂的状态管理**：使用了状态机 + 4个 Pinia Store，层级太深
2. **职责边界模糊**：chatStore 既管状态流转又管消息发送
3. **持久化策略混乱**：同时使用了 localStorage、后端 API 和文件存储
4. **SSR 兼容性差**：localStorage 和 fetch streaming 没有做好环境判断

### 功能缺陷
1. 思考模式后端未正确处理 DeepSeek 的 reasoning_content
2. 模型切换后不生效，未与请求关联
3. 流式输出不支持思考过程的展示
4. AI 生成时输入框被禁用，用户无法提前输入
5. Session 删除确认、重命名交互不完善

### 代码质量问题
1. 多处使用 `any` 类型，类型定义分散
2. API 错误处理不完善
3. 消息列表没有虚拟滚动
4. 日志系统虽然存在但使用不一致

---

## 二、重构方案

### 2.1 架构简化

```
旧架构（复杂）：
ChatStateMachine + 4个 Pinia Store (chatStore/sessionStore/messageStore/streamStore)
    ↓
新架构（简化）：
单一 Composable: useAIChat
    ├── 状态管理 (ref/computed)
    ├── 会话管理
    ├── 消息管理
    └── API 调用
```

### 2.2 目录结构

```
.vitepress/theme/
├── components/ai-chat/           # AI Chat 组件目录
│   ├── types.ts                  # 统一类型定义
│   ├── ChatInterface.vue         # 主界面（三栏布局）
│   ├── SessionList.vue           # 会话列表（左侧栏）
│   ├── SessionItem.vue           # 单个会话项
│   ├── MessageList.vue           # 消息列表（中间栏）
│   ├── MessageItem.vue           # 单条消息
│   ├── ChatInput.vue             # 输入框
│   ├── SettingsPanel.vue         # 设置面板（右侧栏）
│   └── index.ts                  # 组件库入口
├── composables/
│   └── useAIChat.ts              # 核心 Composable
└── services/
    ├── ai.ts                     # DeepSeek API 服务
    ├── storage.ts                # localStorage 服务
    └── logger.ts                 # 日志服务
```

---

## 三、核心功能实现

### 3.1 三栏布局设计

| 栏位 | 组件 | 功能 |
|------|------|------|
| 左侧栏 | SessionList | 会话列表、搜索、新建、重命名、删除 |
| 中间栏 | MessageList + ChatInput | 消息展示、欢迎页、快捷提示、输入框 |
| 右侧栏 | SettingsPanel | 模型选择、思考模式、温度、最大 Token、System Prompt |

### 3.2 输入框交互体验

```typescript
// AI 生成期间：
// - 输入框保持可编辑状态 ✓
// - 发送按钮禁用 ✓
// - Enter 键发送禁用 ✓
// - placeholder 提示"AI 回复中，请稍候发送..." ✓
// - 显示停止生成按钮 ✓

// AI 回复完成后：
// - 自动恢复发送功能 ✓
// - 焦点回到输入框 ✓

// 快捷键支持：
// - Enter 发送 ✓
// - Shift+Enter 换行 ✓
```

### 3.3 思考模式（Chain-of-Thought）

```typescript
// DeepSeek API 返回的 reasoning_content 处理
interface ReasoningContent {
  content: string      // 思考过程文本
  isVisible: boolean   // 是否展开显示
}

// UI 展示：
// - 可折叠的思考过程区块
// - 箭头图标指示展开/折叠状态
// - 斜体显示以区分正常内容
```

### 3.4 流式输出实现

```typescript
// 使用 ReadableStream 逐字渲染
async function chatStream(
  messages: ChatMessage[],
  config: SessionConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
) {
  // 1. 发起 fetch 请求
  // 2. 获取 reader 读取流
  // 3. 解析 SSE 数据
  // 4. 区分 content 和 reasoning_content
  // 5. 回调更新 UI
}
```

### 3.5 本地存储持久化

```typescript
// 数据结构
interface PersistedData {
  sessions: ChatSession[]
  messages: Record<string, ChatMessage[]>
  lastSessionId: string | null
  version: number  // 用于数据迁移
}

// 存储策略
// - 每次操作后自动保存
// - 清理旧数据（保留最近 50 个会话）
// - 存储空间不足时自动清理
```

---

## 四、新增文件说明

### 4.1 服务层 (services/)

| 文件 | 职责 |
|------|------|
| `ai.ts` | DeepSeek API 封装，支持普通/流式对话，思考模式 |
| `storage.ts` | localStorage 封装，数据持久化、迁移、清理 |
| `logger.ts` | 结构化日志，开发模式详细日志，生产模式仅错误 |

### 4.2 Composable (composables/)

| 文件 | 职责 |
|------|------|
| `useAIChat.ts` | 单一入口管理所有 Chat 状态和功能 |

### 4.3 组件层 (components/ai-chat/)

| 文件 | 职责 |
|------|------|
| `types.ts` | 所有类型定义集中管理 |
| `ChatInterface.vue` | 主组件，整合三栏布局 |
| `SessionList.vue` | 会话列表，按时间分组 |
| `SessionItem.vue` | 单个会话，支持重命名/删除 |
| `MessageList.vue` | 消息列表，自动滚动，欢迎页 |
| `MessageItem.vue` | 单条消息，Markdown 渲染，思考过程 |
| `ChatInput.vue` | 输入框，高度自适应，快捷键 |
| `SettingsPanel.vue` | 设置面板，模型/参数配置 |

---

## 五、使用方式

### 5.1 在页面中使用

```vue
<template>
  <ChatPage />
</template>

<script setup>
// ChatPage 内部已使用 ClientOnly 包裹
</script>
```

### 5.2 在其他组件中使用

```vue
<template>
  <ClientOnly>
    <ChatInterface />
  </ClientOnly>
</template>

<script setup>
import { ChatInterface } from './components/ai-chat'
</script>
```

### 5.3 使用 Composable

```typescript
import { useAIChat } from './composables/useAIChat'

const {
  // 状态
  sessions,
  currentSession,
  currentMessages,
  isStreaming,
  canSend,
  
  // 会话操作
  createSession,
  switchSession,
  renameSession,
  deleteSession,
  updateSessionConfig,
  
  // 消息操作
  sendMessage,
  interruptGeneration,
  regenerateLastMessage
} = useAIChat()
```

---

## 六、环境变量配置

在项目根目录创建 `.env` 文件：

```bash
# DeepSeek API 配置
VITE_DEEPSEEK_API_KEY=your-api-key-here
VITE_DEEPSEEK_MODEL=deepseek-chat
```

---

## 七、与旧代码对比

| 维度 | 旧代码 | 新代码 |
|------|--------|--------|
| 状态管理 | 4个 Pinia Store + 状态机 | 1个 Composable |
| 代码行数 | ~3000+ 行 | ~2000 行 |
| 类型安全 | 多处 any | 完整类型定义 |
| 输入框体验 | 生成时禁用 | 保持可编辑 |
| 思考模式 | 前端支持，后端未处理 | 完整支持 |
| 持久化 | 混乱（localStorage + API） | 统一 localStorage |
| 日志 | 不一致 | 统一 logger 服务 |
| SSR 兼容 | 差 | 完善 |

---

## 八、后续优化建议

1. **性能优化**
   - 消息列表虚拟滚动（大数据量）
   - 图片懒加载
   - 代码分割

2. **功能增强**
   - 文件上传支持
   - 多模态输入（图片）
   - 导出对话（Markdown/PDF）

3. **后端集成**
   - 可选后端持久化
   - 用户认证
   - 多端同步

---

## 九、迁移指南

### 从旧版本迁移：

1. **数据迁移**：
   - 旧版本的 localStorage 数据会自动迁移
   - 无需手动操作

2. **代码迁移**：
   - 使用 `useAIChat` 替代原有的多个 Store
   - 使用新的组件替代旧组件

3. **API 迁移**：
   - 确保环境变量配置正确
   - DeepSeek API Key 必须配置

---

## 十、开发检查清单

- [ ] 环境变量配置（VITE_DEEPSEEK_API_KEY）
- [ ] 依赖安装（marked, dompurify）
- [ ] 类型检查通过
- [ ] 基础对话功能正常
- [ ] 流式输出正常
- [ ] 思考模式正常
- [ ] 会话管理正常
- [ ] 本地存储持久化正常
- [ ] SSR 无错误
