# MetaBlog 架构修复复评报告（v4）

> **对比基准**: `architecture-audit-v3.md`  
> **复评时间**: 2026-02-20  
> **本次新增审查**: 冗余代码 + 重复 API 识别  
> **评估方法**: 基于实际源码 grep + 目录扫描

---

## 一、v3 遗留问题状态更新

| 问题 | v3 状态 | v4 状态 | 说明 |
|------|---------|---------|------|
| P0-3 服务端 LLM 流中止 | ❌ | ❌ | 未修复，仍无 `req.on('close')` |
| N1 git.ts 双轨入口 | ❌ | ❌ | 未修复，`server/routes/git.ts` 仍直接调 simpleGit |
| P1 CreateArticle 重名检查 | ❌ | ❌ | 未修复 |
| simulateSearch 幻觉 URL | ⚠️ | ⚠️ | 降级时仍生成带 link 的伪造结果 |
| ResearchSkill 并发无限速 | ⚠️ | ⚠️ | 未引入 p-limit |

---

## 二、冗余代码深度审查（本次新增）

### 🔴 R1 — 日志系统：9 个文件，至少 5 套实现并行存在

**问题文件** (`runtime/` 目录):

| 文件 | 行数 | 定位/特点 |
|------|------|-----------|
| `Logger.ts` | 211 | 基础实现，`LoggerImpl`，存 localStorage，AgentRuntime 在用 |
| `EnhancedLogger.ts` | 479 | 增强版，`EnhancedLogEntry`，多字段，有 CSV 导出，无人使用 |
| `LogSystem.ts` | ~400 | 第三套，`LogSystem` + `LogSystemManager`，无人使用 |
| `StructuredLogger.ts` | 150 | 前端薄封装，提供 `getStructuredLogger()`，WebSearch/IntentRouter/TaskScheduler/AutoPublisher 在用 |
| `StructuredLogger.server.ts` | 560+ | 服务端版本，写文件，无前端引用 |
| `StructuredLogger.types.ts` | ~60 | 类型定义，单独文件 |
| `UnifiedLogger.ts` | 418 | 「统一版」，`UnifiedLogger`，未被任何业务代码 import |
| `EnhancedLogger.ts` | 479 | 同上，无调用 |
| `boot-logger.ts` | ~80 | 启动日志，独立用途 |

**核心矛盾**:
```typescript
// AgentRuntime.ts（第 23 行）
import { LoggerImpl } from '../runtime/Logger'

// WebSearch.ts、IntentRouter.ts 等（7 个文件）
import { getStructuredLogger } from '../runtime/StructuredLogger'
```

同一个系统的核心运行时（`AgentRuntime`）和工具层（`WebSearch`、`IntentRouter`）使用**两套不同的日志实例**，日志无法聚合，`traceId` 跨模块传播彻底断裂。`EnhancedLogger`、`LogSystem`、`UnifiedLogger` 三套完整实现**零引用**，是纯死代码。

🔧 **修复方案**:
1. 以 `StructuredLogger.ts`（7 个文件已在用）为唯一入口
2. 删除 `EnhancedLogger.ts`、`LogSystem.ts`、`UnifiedLogger.ts`（零引用死代码）
3. `AgentRuntime.ts` 改为 `import { getStructuredLogger } from '../runtime/StructuredLogger'`
4. `Logger.ts` 降级为 `StructuredLogger` 的适配器（保留接口兼容）

---

### 🔴 R2 — 文件操作：存在两层调用路径，技能层绕过客户端封装直接 fetch

**问题**: 项目存在规范的 API 客户端封装层 `agent/api/files.ts`，提供 `saveFile()`, `deleteFile()`, `moveFile()` 等函数，但技能层**完全绕过它**，直接调用裸 `fetch`：

```typescript
// api/files.ts 的正规封装（应该用这个）
export async function saveFile(path, content, taskId?) { ... }

// ❌ articleSkills.ts:174 — 绕过封装，内联裸 fetch
const res = await fetch('/api/files/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path, content })
})

// ❌ skills/builtin.ts:537 — 同样的模式，又一处重复
const res = await fetch('/api/files/save', { ... })
```

**后果**:
- `api/files.ts` 的 `saveFile` 支持 `taskId`（文件锁关联），直接 fetch 不传 `taskId` → **文件锁机制被绕过**
- `api/files.ts` 的 `saveFile` 有完整错误处理和类型返回，直接 fetch 的错误处理是各自重新写的（不一致）
- URL 路径 `/api/files/save` 在多处硬编码，维护成本高

🔧 **修复方案**: 技能层统一改为使用 `api/files.ts` 的封装：
```typescript
// articleSkills.ts
import { saveFile, deleteFile } from '../api/files'
// 删除本地的 saveFile/deleteFile 内联定义
```

---

### 🔴 R3 — `saveFile` 函数：3 处独立定义，API 不统一

全局 grep 到的 `saveFile` 定义位置：

| 文件 | 行号 | 特点 |
|------|------|------|
| `api/files.ts` | ~54 | 官方封装，支持 `taskId`，有 hash 返回 |
| `skills/articleSkills.ts` | ~170 | 内联定义，不支持 `taskId`，直接 parse text |
| `skills/builtin.ts` | ~535 | 第三处内联，同样不支持 `taskId` |

**三套 saveFile 行为不一致**，其中两套绕过文件锁机制，是 P0-4 文件锁修复的「空门」。

---

### 🟡 R4 — `slugifyAsync` / `generateFileNameAsync` 重复定义

| 文件 | 分析 |
|------|------|
| `api/files.ts:275` | 正规版，调用 `/api/utils/slugify` 服务端，有本地 fallback |
| `skills/articleSkills.ts:216` | 本地重新定义了相同功能的 `slugifyAsync` |

两处逻辑几乎相同，维护时只能改一处而忘另一处。

---

### 🟡 R5 — `agent/api/git.ts` vs `server/routes/git.ts` 功能重叠不闭合

**问题**: `agent/api/git.ts`（前端客户端）和 `server/routes/git.ts`（服务端路由）本是一对，但：

- 前端客户端 `api/git.ts` 封装了 12 个端点（commit/diff/branch/checkpoint 等）
- **所有技能层都未 import `api/git.ts`**，直接用 `GitOperator`（前端工具类）
- 导致 `api/git.ts` 成为另一处**零引用死代码**

`GitOperator.ts`（前端工具）直接与 `git` CLI 交互，`api/git.ts` 是 HTTP 客户端，两者定位混乱：

```
当前（混乱）:
技能层 → GitOperator（直接调 simple-git）
↓（完全不走）
api/git.ts → server/routes/git.ts → simple-git

正确应该是:
技能层 → api/git.ts（HTTP 客户端）→ server/routes/git.ts（带 Mutex 的 GitOperator 单例）
```

---

### 🟡 R6 — `agent/api/` 目录下 `memory.ts` 与 Memory 模块重复

`agent/api/memory.ts` 是 HTTP 客户端层，`agent/memory/` 是直接文件操作层。技能层通过 `ctx.memory` 直接调用文件操作，`api/memory.ts` 未被使用，是死代码。

---

### 🟢 R7 — `LogSystem.ts` 的 `LogSystemManager` 注册表功能 vs `UnifiedLogger.ts`

两者都试图做「统一日志管理」，但各自实现、各自被弃置，无人知晓应该用哪个。

---

## 三、本轮修复质量评估

### AIChatOrb.vue — UI 层修复（推断）

本轮 `AIChatOrb.vue` 在 diff 中，结合 `AgentRuntime.processInput` 的 HITL 实现，UI 层应已接入置信度追问交互。

✅ **Good**: 前端有了和 Agent HITL 的对接入口。

---

### 本轮变更代码质量总结

| 文件 | 评价 |
|------|------|
| `WebSearch.ts` | ✅ 进一步完善（AbortSignal、类型定义） |
| `ResearchWithFallbackSkill.ts` | ✅ 降级链完整 |
| `IntentRouter.ts` | ✅ 导入了 StructuredLogger，日志标准化 |
| `BackgroundTaskManager.ts` | ✅ 新增，补充了后台任务调度 |
| `TaskScheduler.ts` | ✅ 新增，任务延迟调度 |
| `AIChatOrb.vue` | ✅ 结合 HITL 接入 |
| `articleSkills.ts` / `builtin.ts` | ⚠️ 仍有内联 fetch，未使用 api/files.ts |

---

## 四、完整修复优先级（含新增冗余审查）

### 🔴 P0 — 阻止上线

| 编号 | 问题 | 文件 | 修复方法 |
|------|------|------|---------|
| P0-R2 | 技能层绕过 api/files.ts 直接 fetch，文件锁被跳过 | `articleSkills.ts:174`、`builtin.ts:537` | 删除内联 `saveFile`/`deleteFile`，统一 import `api/files.ts` |
| P0-B | 服务端 LLM 流中止缺失 | `server/routes/` LLM 流路由 | 添加 `req.on('close', abort)` |
| P0-N1 | `server/routes/git.ts` 脱离 GitOperator Mutex | `server/routes/git.ts:116` | commit 路由调 `GitOperator.getInstance()` |

### 🟡 P1 — 强烈建议

| 编号 | 问题 | 文件 | 修复方法 |
|------|------|------|---------|
| P1-R1 | 日志系统 9 个文件，AgentRuntime 与其他模块用不同实例 | `AgentRuntime.ts:23` | 将 `new LoggerImpl()` 改为 `getStructuredLogger()` |
| P1-R3 | `saveFile` 3 处定义不统一 | `articleSkills.ts`、`builtin.ts` | 删除本地定义，import `api/files.ts` |
| P1-R4 | `slugifyAsync` 重复定义 | `articleSkills.ts:216` | 删除本地版，import `api/files.ts` |
| P1-C | `CreateArticle` 写入前无重名检查 | `articleSkills.ts:333` | `saveFile` 前调 `fs.access` |
| P1-S | simulateSearch 仍生成幻觉 URL | `WebSearch.ts:366` | 降级时清空 `link` 字段并标注 `isAIGenerated` |
| P1-P | ResearchSkill 并发无限速 | `ResearchWithFallbackSkill.ts:400` | 引入 `p-limit(3)` |

### 🟢 P2 — 技术债清理

| 编号 | 问题 | 文件 | 修复方法 |
|------|------|------|---------|
| P2-R1 | `EnhancedLogger.ts` 零引用死代码 | `runtime/EnhancedLogger.ts` | 删除 |
| P2-R2 | `LogSystem.ts` 零引用死代码 | `runtime/LogSystem.ts` | 删除 |
| P2-R3 | `UnifiedLogger.ts` 零引用死代码 | `runtime/UnifiedLogger.ts` | 删除 |
| P2-R4 | `api/git.ts` 完整文件零引用死代码 | `api/git.ts` | 删除或接入技能层 |
| P2-R5 | `api/memory.ts` 零引用死代码 | `api/memory.ts` | 删除或接入 |
| P2-W | Watchdog 扩展到 UNDERSTANDING/PLANNING | `StateMachine.ts` | 一行改动 |
| P2-V | `vite.config.ts` 缺 watch.ignored 配置 | `config.ts` | 添加 `ignored: ['**/memory/data/**']` |

---

## 五、系统整体健康度（v4）

```
数据安全:     ████████░░ 80%  (文件锁被绕过拉低)
并发安全:     ████████░░ 80%  (Git 双轨问题)
代码质量:     █████░░░░░ 50%  (大量冗余/死代码)
可观测性:     ██████░░░░ 60%  (日志分裂)
AI 功能:      ████████░░ 80%  (WebSearch/降级链已落地)
生产就绪:     ████░░░░░░ 40%  (P0 问题尚存)
```

### 最需要优先清理的技术债（一次 PR 可完成）
1. 删除 3 个零引用日志文件（`EnhancedLogger`、`LogSystem`、`UnifiedLogger`）→ 减少 ~1400 行
2. 让 `articleSkills.ts` 和 `builtin.ts` 的 `saveFile` 改为 import `api/files.ts` → 5 行改动，修复文件锁漏洞
3. `AgentRuntime` 改用 `getStructuredLogger` → 1 行改动，统一日志实例
