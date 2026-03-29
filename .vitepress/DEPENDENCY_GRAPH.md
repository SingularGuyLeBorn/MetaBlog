# 文件依赖关系图

## 阶段 1: Tools 合并 (最安全)

```
Before:
┌─────────────────────────────────────────────────────────────┐
│ tools/article/                                                │
│  ├── definitions.ts ─────┐                                   │
│  ├── executors.ts ───────┼──→ index.ts ──→ tools/index.ts    │
│  └── index.ts ───────────┘                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ tools/academic/                                               │
│  ├── definitions.ts ─────┐                                   │
│  ├── executors.ts ───────┼──→ index.ts ──→ tools/index.ts    │
│  └── index.ts ───────────┘                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
                           (重复11次)

After:
┌─────────────────────────────────────────────────────────────┐
│ tools/article.ts ───────────────────→ tools/index.ts         │
│ tools/academic.ts ──────────────────→ tools/index.ts         │
│ ... (11个文件)                                               │
└─────────────────────────────────────────────────────────────┘
```

**操作**: 每个文件夹合并为单个文件，依赖关系简单，IDE 可以自动处理

---

## 阶段 2: Services → Stores 合并

### 2.1 chatStorage + chatStore

```
Before:
┌─────────────────────────────────────────────────────────────┐
│ api/services/chatStorage.ts                                   │
│  ├── getSessions()                                           │
│  ├── saveSession()       ───────┐                            │
│  ├── getMessageGroups()         │                            │
│  └── saveMessageGroups()        │                            │
└─────────────────────────────────┼───────────────────────────┘
                                  │
                                  ↓ import
┌─────────────────────────────────────────────────────────────┐
│ stores/chatStore.ts                                           │
│  ├── useAIChat()                                              │
│  ├── sendMessage()         ─────┐                            │
│  └── ...                        │                            │
│       import { storage } ───────┘                            │
│                                  from '../api/services/storage'
└─────────────────────────────────────────────────────────────┘
        ↑
        │ import
┌─────────────────────────────────────────────────────────────┐
│ shared/composables/useChat.ts                                 │
│  └── useChat()                                               │
│       import { useAIChat } from '../stores/chatStore'        │
└─────────────────────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────────────────────┐
│ stores/chatStore.ts (合并后)                                  │
│  ├── useAIChat()                                              │
│  ├── sendMessage()                                            │
│  ├── getSessions()     (原 chatStorage)                      │
│  ├── saveSession()                                            │
│  └── ...                                                      │
└─────────────────────────────────────────────────────────────┘
        ↑
        │ import (路径不变)
┌─────────────────────────────────────────────────────────────┐
│ shared/composables/useChat.ts                                 │
│  └── useChat()                                               │
└─────────────────────────────────────────────────────────────┘

删除: api/services/chatStorage.ts
```

**IDE 操作**:
1. 打开 `chatStore.ts`
2. 把 `chatStorage.ts` 的函数复制粘贴到 `chatStore.ts`
3. 删除 `chatStorage.ts` 文件
4. IDE 会提示更新 import，选择 "Yes"

---

### 2.2 storage + dataStore 合并

```
Before:
┌─────────────────────────────────────────────────────────────┐
│ api/services/storage.ts                                       │
│  └── storage 对象                                            │
│       ├── load()                                             │
│       ├── saveSession()                                      │
│       └── ...                                                │
└─────────────────────────────────────────────────────────────┘
        ↑                                    ↓
        │                              export
        │                                    ↓
┌─────────────────────────────────────────────────────────────┐
│ stores/dataStore.ts                                           │
│  └── 使用 storage                                            │
└─────────────────────────────────────────────────────────────┘
        ↑
        │
┌─────────────────────────────────────────────────────────────┐
│ features/chat/index.ts                                        │
│  └── export { storage } from './api/services/storage'        │
└─────────────────────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────────────────────┐
│ stores/chatStore.ts (已合并 storage 功能)                     │
│  └── storage 对象                                            │
└─────────────────────────────────────────────────────────────┘
        ↑
        │
┌─────────────────────────────────────────────────────────────┐
│ features/chat/index.ts                                        │
│  └── export { storage } from './stores/chatStore'            │
└─────────────────────────────────────────────────────────────┘

删除: api/services/storage.ts, stores/dataStore.ts
```

---

### 2.3 agentStorage + agentStore

```
Before:
┌─────────────────────────────────────────────────────────────┐
│ api/services/agentStorage.ts                                  │
│  ├── getAgents()                                             │
│  ├── createAgent()                                           │
│  └── ...                                                     │
└─────────────────────────────────────────────────────────────┘
        ↑
        │ import
┌─────────────────────────────────────────────────────────────┐
│ stores/agentStore.ts                                          │
│  └── useAgentStore()                                         │
│       import { getAgents } from '../api/services/agentStorage'
└─────────────────────────────────────────────────────────────┘
        ↑
        │
        ├─────────────────────────────────────────────────────┐
        │                                                     │
        ↓                                                     ↓
┌──────────────────────┐                          ┌──────────────────────┐
│ components/agent/    │                          │ features/agent/      │
│  ├── AgentAdmin.vue  │                          │  └── ...             │
│  └── ...             │                          │    (直接引用 storage)│
└──────────────────────┘                          └──────────────────────┘

After:
┌─────────────────────────────────────────────────────────────┐
│ stores/agentStore.ts (合并后)                                 │
│  ├── useAgentStore()                                         │
│  ├── getAgents()                                             │
│  └── createAgent()                                           │
└─────────────────────────────────────────────────────────────┘
        ↑
        │
        ├─────────────────────────────────────────────────────┐
        │                                                     │
        ↓                                                     ↓
┌──────────────────────┐                          ┌──────────────────────┐
│ components/agent/    │                          │ features/agent/      │
└──────────────────────┘                          └──────────────────────┘

删除: api/services/agentStorage.ts
```

---

## 阶段 3: 删除冗余文件

```
Before:
stores/
├── agentStore.ts          ✓
├── chatStore.ts           ✓
├── dataStore.ts           ✗ (和 storage 重复)
├── index.ts               ✓
├── skillLoader.ts         ✗ (被新的 skills/ 替代)
├── skillStore.ts          ✗ (被新的 skills/ 替代)
├── useAgentConfig.ts      ? (检查)
├── useAgents.ts           ✗ (和 agentStore 重复)
└── useSkills.ts           ✗ (被新的替代)

依赖关系:
skillStore.ts ──export──→ stores/index.ts
skillLoader.ts ──export──→ stores/index.ts
useSkills.ts ──export──→ stores/index.ts
useAgents.ts ──export──→ stores/index.ts

After:
stores/
├── agentStore.ts          ✓
├── chatStore.ts           ✓
└── index.ts               ✓ (更新导出)

更新 stores/index.ts:
删除: export { useSkills } from './useSkills'
删除: export { useAgents } from './useAgents'
添加: export { useSkillLoader } from '../skills'
```

---

## 阶段 4: Services 精简

```
Before:
api/services/
├── aiService.ts           ✓ (保留)
├── agentStorage.ts        ✗ (已合并)
├── chatStorage.ts         ✗ (已合并)
├── index.ts               ✓ (更新)
├── logger.ts              ✓ (保留)
├── multimediaService.ts   ✓ (保留)
├── sessionLogger.ts       ? (检查是否可合并到 logger)
├── skillIntegratedService.ts ✓ (保留)
└── storage.ts             ✗ (已合并)

依赖关系:
sessionLogger.ts ──import──→ aiService.ts (多处)

After:
api/services/
├── aiService.ts           ✓
├── index.ts               ✓ (简化导出)
├── logger.ts              ✓ (合并 sessionLogger)
├── multimediaService.ts   ✓
└── skillIntegratedService.ts ✓

更新 services/index.ts:
删除 chatStorage, agentStorage, storage 的导出
添加从 stores/ 的重新导出
```

---

## 文件引用统计

### 被引用最多的文件 (重构时需要小心)

| 文件 | 被引用次数 | 重要程度 |
|-----|-----------|---------|
| `chatStore.ts` | 5 | ⭐⭐⭐⭐⭐ |
| `aiService.ts` | 4 | ⭐⭐⭐⭐⭐ |
| `logger.ts` | 3 | ⭐⭐⭐⭐ |
| `tools/index.ts` | 5 | ⭐⭐⭐⭐⭐ |

### 孤立文件 (可以安全删除)

| 文件 | 被引用次数 | 操作 |
|-----|-----------|-----|
| `stores/skillLoader.ts` | 0 | 删除 |
| `stores/dataStore.ts` | 1 | 合并后删除 |
| `stores/useSkills.ts` | 0 | 删除 |

---

## 重构顺序建议

```
Day 1: Tools 合并 (低风险)
  ├─ 合并 article/
  ├─ 合并 academic/
  ├─ 合并 github/
  ├─ ... (11个分类)
  └─ 测试 build

Day 2: Services → Stores (中风险)
  ├─ 合并 chatStorage → chatStore
  ├─ 合并 storage → chatStore
  ├─ 合并 agentStorage → agentStore
  └─ 测试 Chat 和 Agent 功能

Day 3: 清理冗余文件 (低风险)
  ├─ 删除 stores/skillLoader.ts
  ├─ 删除 stores/skillStore.ts
  ├─ 删除 stores/dataStore.ts
  ├─ 删除 stores/useSkills.ts
  ├─ 删除 stores/useAgents.ts
  └─ 更新所有 index.ts

Day 4: Services 精简 (低风险)
  ├─ 合并 sessionLogger → logger
  ├─ 删除 chatStorage.ts
  ├─ 删除 agentStorage.ts
  ├─ 删除 storage.ts
  └─ 更新 services/index.ts

Day 5: 全面测试
  ├─ 运行所有功能测试
  ├─ 检查是否有遗漏的 import
  └─ 提交最终版本
```

---

## 常见问题预防

### 问题 1: IDE 没有更新某些 import

**现象**: 移动文件后，有些文件的 import 还是旧路径

**解决**:
```bash
# 全局搜索旧路径，手动修复
grep -r "from.*tools/article/index" .vitepress/theme
grep -r "from.*services/chatStorage" .vitepress/theme
```

### 问题 2: 循环依赖

**现象**: `A.ts` import `B.ts`，`B.ts` 又 import `A.ts`

**解决**:
- 把共享的类型定义提取到单独文件
- 使用 `import type` 替代 `import`

### 问题 3: 导出丢失

**现象**: 外部引用报错 "Module has no exported member"

**解决**:
- 检查 `index.ts` 是否包含新的导出
- 确保重新导出路径正确

```typescript
// index.ts 示例
export { useAIChat } from './chatStore'  // 内部导出
export { storage } from './chatStore'    // 新增导出
```
