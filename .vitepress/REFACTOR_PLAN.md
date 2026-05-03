# VitePress 项目重构计划

> 利用 IDE 自动重构功能,安全地精简文件结构

## ⚠️ 重构前准备

1. **确保所有代码已提交**
   ```bash
   git status  # 应该是干净的
   ```

2. **创建重构分支** (可选但推荐)
   ```bash
   git checkout -b refactor/cleanup-structure
   ```

3. **IDE 设置**
   - 确保 IDE 开启了 "自动更新 imports" 功能
   - VS Code: `Settings → TypeScript › Update Imports`
   - WebStorm: 移动文件时选择 "Search for references"

---

## 📊 当前问题诊断

### 问题 1: Stores 和 Services 重复 (最严重)

| Store 文件 | Service 文件 | 关系 | 被引用次数 |
|-----------|-------------|------|-----------|
| `chatStore.ts` | `chatStorage.ts` | chatStore 依赖 chatStorage | 2 |
| `dataStore.ts` | `storage.ts` | dataStore 依赖 storage | 1 |
| `agentStore.ts` | `agentStorage.ts` | agentStore 依赖 agentStorage | 1 |
| `skillStore.ts` | `useSkills.ts` | 功能完全重复 | 0 |
| `useAgents.ts` | `useAgentConfig.ts` | 功能重叠 80% | 2 |

**解决方案**: 合并到 `stores/` 目录,删除 `api/services/` 中对应的文件

### 问题 2: Tools 文件过度拆分

每个 tool 分类有 3 个文件：
```
tools/article/
  ├── definitions.ts   (100-200行)
  ├── executors.ts     (100-300行)
  └── index.ts         (10-20行,只是导出)
```

**可以合并为单个文件** `article.ts` (200-500行)

### 问题 3: 旧文件残留

以下文件已废弃但未删除：
- `stores/skillLoader.ts` (被新的 `skills/skillLoader.ts` 替代)
- `stores/skillStore.ts` (功能被新的 skills 系统覆盖)
- `stores/dataStore.ts` (和 `storage.ts` 重复)

---

## 🚀 重构执行计划

### 阶段 1: 合并 Tools (最安全,依赖最少)

**目标**: 将 `tools/xxx/definitions.ts + executors.ts + index.ts` 合并为 `tools/xxx.ts`

**操作步骤** (每个 tool 分类重复):

1. **创建合并后的文件** `tools/article.ts`:
   ```typescript
   // 复制 definitions.ts 内容
   // 复制 executors.ts 内容
   // 添加导出
   export const articleDefinitions = [...]
   export const articleExecutors = {...}
   ```

2. **IDE 移动文件**:
   - 在 IDE 中选中 `tools/article/definitions.ts`
   - 右键 Refactor → Move File → 重命名为 `tools/article.ts`
   - IDE 会自动更新所有 import

3. **合并内容**:
   - 打开新的 `article.ts`
   - 把 `executors.ts` 的内容粘贴进去
   - 确保 export 正确

4. **删除旧文件夹**:
   - 删除 `tools/article/` 整个文件夹

5. **验证**:
   - 运行 `npm run build` 或 TypeScript 检查
   - 确保没有报错

**重复以上步骤处理**:
- [ ] article/
- [ ] academic/
- [ ] github/
- [ ] platform/
- [ ] kb/
- [ ] note/
- [ ] file/
- [ ] text/
- [ ] code/
- [ ] network/
- [ ] system/

**预计减少文件**: 33 → 11 (减少 22 个文件)

---

### 阶段 2: 合并 Services → Stores

**目标**: 将 `api/services/*.ts` 合并到 `stores/`

#### Step 2.1: 合并 chatStorage → chatStore

**依赖关系**:
```
chatStore.ts ──import──→ chatStorage.ts
    ↑
useChat.ts ──import──→ chatStore.ts
```

**操作步骤**:

1. **打开 `chatStorage.ts` 和 `chatStore.ts`**

2. **复制内容**:
   - 把 `chatStorage.ts` 的所有函数复制到 `chatStore.ts` 底部
   - 在 `chatStore.ts` 中添加注释标记:
   ```typescript
   // ==================== Storage Functions (from chatStorage.ts) ====================
   ```

3. **更新 chatStore 中的 import**:
   - 把 `import { storage } from '../api/services/storage'`
   - 改为直接实现或使用内联函数

4. **IDE Refactor**:
   - 在 `chatStore.ts` 中,右键点击 `storage` 相关函数
   - Refactor → Inline (内联化)
   - 或手动合并相关逻辑

5. **删除 `chatStorage.ts`**

6. **更新 `services/index.ts`**:
   - 删除 `chatStorage` 的导出
   - 改为从 `stores/` 重新导出:
   ```typescript
   export { useAIChat, storage } from '../stores/chatStore'
   ```

7. **验证**:
   - 检查 `useChat.ts` 是否正常工作
   - 运行 TypeScript 检查

#### Step 2.2: 合并 storage → dataStore

**依赖关系**:
```
dataStore.ts ──import──→ storage.ts
chat/index.ts ──export──→ storage
```

**操作步骤**:

1. **打开 `storage.ts` 和 `dataStore.ts`**

2. **合并策略**:
   - `storage.ts` 是底层 API 封装
   - `dataStore.ts` 是 Pinia Store
   - 保留 `storage.ts` 的内容,删除 `dataStore.ts`

3. **重命名** (IDE Refactor):
   - 把 `storage.ts` 重命名为 `chatStorage.ts` (避免和之前的冲突)
   - 或者合并到 `chatStore.ts`

4. **更新导出**:
   - `chat/index.ts` 中的导出需要更新路径

#### Step 2.3: 合并 agentStorage → agentStore

**依赖关系**:
```
agentStore.ts ──import──→ agentStorage.ts
components/agent/* ──import──→ agentStorage (直接)
```

**操作步骤**:

1. **检查 `agentStorage.ts` 被谁引用**:
   ```bash
   grep -r "from.*agentStorage" .vitepress/theme
   ```

2. **把 `agentStorage` 的函数合并到 `agentStore.ts`**

3. **更新所有引用** (IDE 会自动处理)

4. **删除 `agentStorage.ts`**

#### Step 2.4: 删除冗余文件

- [ ] `stores/skillLoader.ts` (被新的 `skills/` 替代)
- [ ] `stores/skillStore.ts` (被新的 `skills/` 替代)
- [ ] `stores/dataStore.ts` (已合并)
- [ ] `stores/useSkills.ts` (和 `skillStore.ts` 重复)
- [ ] `stores/useAgents.ts` (和 `useAgentConfig.ts` 重叠)

**预计减少文件**: 9 → 4 (减少 5 个文件)

---

### 阶段 3: 整理 Services 目录

**目标**: 清理 `api/services/`,只保留真正的服务层代码

**保留的文件**:
- `aiService.ts` - 核心 AI 服务
- `skillIntegratedService.ts` - Skills 集成服务
- `logger.ts` - 日志服务
- `multimediaService.ts` - 多媒体处理
- `index.ts` - 统一导出

**删除或合并的文件**:
- [ ] `chatStorage.ts` (已合并到 stores/)
- [ ] `agentStorage.ts` (已合并到 stores/)
- [ ] `storage.ts` (已合并)
- [ ] `sessionLogger.ts` (可以合并到 logger.ts)

**操作步骤**:

1. **合并 `sessionLogger.ts` → `logger.ts`**:
   - 复制所有函数到 `logger.ts`
   - 更新 `aiService.ts` 中的 import
   - 删除 `sessionLogger.ts`

2. **更新 `services/index.ts`**:
   ```typescript
   // 简化后的导出
   export { aiService } from './aiService'
   export { skillIntegratedService } from './skillIntegratedService'
   export { logger, addLog } from './logger'
   export { multimediaService } from './multimediaService'
   // storage 相关从 stores 重新导出
   export { storage, useAIChat } from '../stores'
   ```

**预计减少文件**: 9 → 5 (减少 4 个文件)

---

### 阶段 4: 清理 Stores 目录

**当前文件**:
```
stores/
├── agentStore.ts       ✓ 保留 (合并后)
├── chatStore.ts        ✓ 保留 (合并后)
├── dataStore.ts        ✗ 删除 (已合并)
├── index.ts            ✓ 保留 (更新导出)
├── skillLoader.ts      ✗ 删除 (被新的替代)
├── skillStore.ts       ✗ 删除 (被新的替代)
├── useAgentConfig.ts   ? 检查 (可能和 agentStore 重叠)
├── useAgents.ts        ✗ 删除 (和 agentStore 重叠)
└── useSkills.ts        ✗ 删除 (被新的替代)
```

**操作步骤**:

1. **检查 `useAgentConfig.ts` 的内容**:
   - 如果和 `agentStore.ts` 重叠,合并到 `agentStore.ts`
   - 如果有独特功能,保留但重命名

2. **更新 `stores/index.ts`**:
   ```typescript
   // 简化后的导出
   export { useAIChat, storage } from './chatStore'
   export { useAgentStore } from './agentStore'
   // 新的 skills 系统
   export { useSkillLoader } from '../skills'
   ```

**预计减少文件**: 9 → 3 (减少 6 个文件)

---

### 阶段 5: 验证和测试

**检查清单**:

- [ ] 运行 `npm run build` 或 `npm run dev`,确保没有编译错误
- [ ] 检查所有页面的功能是否正常
- [ ] 测试 Chat 功能
- [ ] 测试 Agent 功能
- [ ] 测试 Tools 调用

**常见问题**:

1. **Import 路径错误**:
   - IDE 可能没有更新某些动态 import
   - 搜索 `"from '` 检查是否有旧路径残留

2. **循环依赖**:
   - 合并后可能出现 `A → B → A`
   - 使用 `type` import 打破循环

3. **导出丢失**:
   - 检查 `index.ts` 文件是否导出所有需要的内容

---

## 📊 预期效果

| 区域 | 重构前 | 重构后 | 减少 |
|-----|-------|-------|-----|
| `tools/` | 33 文件 | 11 文件 | -67% |
| `stores/` | 9 文件 | 3 文件 | -67% |
| `services/` | 9 文件 | 5 文件 | -44% |
| **总计** | **~51 文件** | **~19 文件** | **-63%** |

---

## 🔄 回滚方案

如果重构过程中出现问题：

```bash
# 放弃所有修改,回到重构前状态
git checkout -- .
git clean -fd

# 或者切换到 main 分支
git checkout main
```

---

## ❓ 需要帮助？

如果在某个步骤遇到问题：

1. 记录当前的错误信息
2. 运行 `git status` 查看修改了哪些文件
3. 可以部分提交已完成的步骤,然后继续

**建议**: 每完成一个阶段就提交一次,方便逐步回滚. 
