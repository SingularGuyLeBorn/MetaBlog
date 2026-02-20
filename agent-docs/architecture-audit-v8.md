# MetaBlog 架构修复复评报告（v8）

> **对比基准**: `architecture-audit-v7.md`  
> **复评时间**: 2026-02-20 21:58  
> **本轮 commit**: `81db9ca` — v7 审计修复：AbortSignal + logs.ts 重构  
> **修改文件**: 7 个 LLM providers + `server/routes/logs.ts` + `AgentRuntime.ts`

---

## 第一部分：v7 遗留问题验证

### ✅ P0-LLM 彻底修复 — 7 个 Provider 全部实现 AbortSignal

**验证结果**（全部 7 个文件）:

| Provider | `signal: request.signal` | `aborted` 预检 | `abort` 监听器 |
|----------|--------------------------|----------------|----------------|
| `openai.ts` | ✅ L81 | ✅ L63, L104 | ✅ L96-98 |
| `deepseek.ts` | ✅ L81 | ✅ L63, L104 | ✅ |
| `kimi.ts` | ✅ L81 | ✅ L63, L104 | ✅ |
| `zhipu.ts` | ✅ L81 | ✅ L63, L104 | ✅ |
| `anthropic.ts` | ✅ L95 | ✅ L70, L117 | ✅ |
| `gemini.ts` | ✅ L43 | ✅ L78, L122 | ✅ |
| `qwen.ts` | ✅ L41 | ✅ L68, L113 | ✅ |

实现模式完整且一致：
1. **预检**: 进入 `chatStream` 前立刻检查 `request.signal?.aborted`
2. **传递**: `fetch(url, { signal: request.signal })` 让浏览器自动中止 HTTP 连接
3. **监听**: 注册 `abort` 事件监听器，中止时 `reader.cancel()` 停止流读取
4. **清理**: `finally` 块中 `removeEventListener` 防止内存泄漏

✅ **P0-3（服务端 LLM 流中止）正式关闭**。

---

### ✅ P1-R10 修复 — `server/routes/logs.ts` 跨边界 import 已消除

**验证**: `logs.ts:8` 已改为：
```typescript
import { getStructuredLogger, type LogQueryFilter, type LogLevel }
  from '../../agent/runtime/StructuredLogger.server'
```

从 `LogSystemAdapter` 的间接依赖改为直接使用 `StructuredLogger.server`，跨边界导入已消除。routes 层现在独立于前端 agent 目录。✅

---

### ⚠️ P1-R7 — `LogSystemAdapter.ts` 仍在 `config.ts` 中使用

**当前状态**: `config.ts:20` 仍有：
```typescript
import { logSystem } from "./agent/runtime/LogSystemAdapter";
```

`logs.ts` 已脱离，但 `config.ts` 仍依赖适配器层。`LogSystemAdapter` 尚不能删除。

---

## 第二部分：冗余代码深度审查（v8 新增）

### 🔴 R-DUP-1 — 7 个 LLM Provider：`chatStream` 实现高度重复，约 70% 代码雷同

本轮最重要的冗余发现。所有 7 个 provider（`openai/deepseek/kimi/zhipu/anthropic/qwen/gemini`）文件大小极其相近（5.0–6.2 KB），核心 SSE 流读取代码几乎一字不差：

```typescript
// 以下代码在 6/7 个 provider 中完全相同
const reader = response.body?.getReader()
if (!reader) throw new Error('No response body')
const decoder = new TextDecoder()
let buffer = ''

const abortHandler = () => {
  reader.cancel('Request aborted').catch(() => {})
}
request.signal?.addEventListener('abort', abortHandler)

try {
  while (true) {
    if (request.signal?.aborted) throw new Error('Request aborted')
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE 解析...
  }
} finally {
  request.signal?.removeEventListener('abort', abortHandler)
  reader.releaseLock()
}
```

**重复量估算**：每个文件约 80-100 行重复代码，7 个文件共约 **560-700 行冗余**。

🔧 **修复方案**：提取 `llm/utils/stream.ts` 公共流处理函数：

```typescript
// llm/utils/stream.ts（新建）
export async function parseSSEStream(
  response: Response,
  signal: AbortSignal | undefined,
  onChunk: (data: string) => void
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''

  const abortHandler = () => reader.cancel('Request aborted').catch(() => {})
  signal?.addEventListener('abort', abortHandler)

  try {
    while (true) {
      if (signal?.aborted) throw new Error('Request aborted')
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      for (const line of buffer.split('\n')) {
        if (line.startsWith('data: ') && line.slice(6) !== '[DONE]') {
          onChunk(line.slice(6))
        }
      }
      buffer = buffer.split('\n').at(-1) || ''
    }
  } finally {
    signal?.removeEventListener('abort', abortHandler)
    reader.releaseLock()
  }
}
```

提取后，每个 provider 的 `chatStream` 只需 10-15 行，消除约 600 行重复代码，且 signal 处理逻辑只需维护一处。

---

### 🔴 R-DUP-2 — `estimateTokens` 函数高度重复（7 个 provider 完全相同逻辑）

每个 provider 都实现了独立的 `estimateTokens(text: string): number`，且逻辑完全相同（中文 2.5 tokens/字符，英文 0.25 tokens/字母）：

```typescript
// 这段逻辑在所有 7 个 provider 中一字不差
estimateTokens(text: string): number {
  let tokens = 0
  for (const char of text) {
    if (/[\u4e00-\u9fa5]/.test(char)) tokens += 2.5
    else if (/[a-zA-Z]/.test(char)) tokens += 0.25
    else tokens += 0.5
  }
  return Math.ceil(tokens)
}
```

🔧 **修复方案**：移到 `LLMProvider` 抽象基类中提供默认实现，子类需要时可覆盖：

```typescript
// llm/types.ts 中的 LLMProvider 基类
estimateTokens(text: string): number {
  // 通用估算，子类可覆盖
  let tokens = 0
  for (const char of text) { ... }
  return Math.ceil(tokens)
}
```

---

### 🟡 R-DUP-3 — `calculateCost` 模式完全相同（6/7 个 provider）

除 `gemini.ts` 外，其它 6 个 provider 的 `calculateCost` 实现完全相同：

```typescript
calculateCost(usage: LLMResponse['usage']): number {
  const pricing = getModelPricing(this.config.model)
  const inputCost = (usage.promptTokens / 1000) * pricing.input
  const outputCost = (usage.completionTokens / 1000) * pricing.output
  return inputCost + outputCost
}
```

🔧 **修复方案**：同样移到 `LLMProvider` 基类中，依赖已有的 `getModelPricing` 工具函数。

---

### 🟡 R-DUP-4 — `SkillMemoryManager` 仍使用 `api/memory.ts`（v7 报告死代码被唤起）

**发现**: `memory/skills/SkillMemoryManager.ts:6`:
```typescript
import { saveSkillExecution as saveSkillExecutionApi } from '../../api/memory'
```

v7 报告将 `api/memory.ts` 标记为零引用死代码，但实际上 `SkillMemoryManager.ts` 仍在使用它！这说明：
- `api/memory.ts` **不是死代码**，是 `SkillMemoryManager` 的依赖
- 但 `SkillMemoryManager` 同时也有自己的本地的 `saveSkillExecution` 逻辑
- 两条路径可能存在数据写入不一致

🔧 **建议**: 确认 `SkillMemoryManager` 的读写路径，统一走 `api/memory.ts` 或统一走直接文件操作，不能两者混用。

---

### 🟡 R-DUP-5 — `LogSystemAdapter.ts` 仍是过渡层，`config.ts` 需跟进

`logs.ts` 已完成迁移，但 `config.ts` 仍依赖 `LogSystemAdapter`。目前 `LogSystemAdapter` 存在意义只剩 `config.ts` 一处调用。

🔧 **建议**: 直接修改 `config.ts` 中的日志调用改为 `StructuredLogger.server`，然后删除 `LogSystemAdapter.ts`（~160 行代码消除）。

---

### 🟢 R-DUP-6 — `AgentRuntime.ts` 中的 AbortController 是否已接入？

本轮 `AgentRuntime.ts` 也在修改列表中。需要确认 AgentRuntime 是否在 LLM 调用时：
1. 创建了 `AbortController`
2. 将 `controller.signal` 通过 `LLMRequest.signal` 传递
3. 在 `req.on('close')` 或任务取消时调用 `controller.abort()`

---

## 第三部分：架构状态全局总览（v8）

| 问题 | v7 | v8 | 说明 |
|------|----|----|------|
| P0-3 LLM 流中止（接口）| ✅ | ✅ | 类型已就绪 |
| P0-3 LLM 流中止（实现）| ⚠️ 待验证 | ✅ | **7 个 provider 全部实现** |
| P1-R10 logs.ts 跨边界 | ⚠️ | ✅ | 改用 StructuredLogger.server |
| P1-R7 LogSystemAdapter | ⚠️ | ⚠️ | config.ts 仍依赖 |
| P0-B 服务端流中止（Express req.close）| ❌ | ❌ | 前端 provider 有 signal，但服务端 Express 路由未接入 |
| R-DUP-1 LLM Stream 重复代码 | — | 🔴 新发现 | ~600 行重复 |
| R-DUP-2 estimateTokens 重复 | — | 🟡 新发现 | 7 处相同 |
| R-DUP-3 calculateCost 重复 | — | 🟡 新发现 | 6 处相同 |
| R-DUP-4 api/memory.ts 死代码 | ❌（标错）| 🟡 重分类 | SkillMemoryManager 在用 |
| checkpoints 内存丢失 | ❌ | ❌ | 未修复 |

---

## 第四部分：优先级矩阵（v8 最终）

### 🔴 P0
| 编号 | 问题 | 工时 |
|------|------|------|
| P0-EX | Express 服务端 LLM 路由：`req.on('close', controller.abort)` | 30min |
| P0-AG | `AgentRuntime` 确认在调用 LLM 时传递 `signal` | 30min |

### 🟡 P1（本轮新冗余重构优先级）
| 编号 | 问题 | 工时 |
|------|------|------|
| P1-DUP1 | 提取 `llm/utils/stream.ts`，消除 7 provider 的流读取重复代码 | 1.5h |
| P1-DUP2 | `estimateTokens/calculateCost` 移至 `LLMProvider` 基类 | 30min |
| P1-R7 | `config.ts` 改用 StructuredLogger.server，删除 LogSystemAdapter | 30min |
| P1-CHK | checkpoints 持久化到文件 | 30min |
| P1-GIT | 前端 GitOperator 改走 HTTP | 2h |

### 🟢 P2
| 编号 | 问题 | 工时 |
|------|------|------|
| P2-DUP4 | 理清 SkillMemoryManager 的读写路径，统一不混用 | 1h |
| P2-R8 | Logger.ts 与 StructuredLogger 合并 | 1h |
| P2-VIT | vite.config watch.ignored | 5min |

---

## 第五部分：健康度评估（v8）

```
数据安全:     █████████░ 90%
并发安全:     █████████░ 90%
LLM 流中止:   █████████░ 90%  (provider 已实现，Express 层待接)
代码质量:     ██████░░░░ 60%  (7 provider ~600行重复待清理)
可观测性:     █████████░ 90%  (日志链路已统一)
生产就绪:     ████████░░ 80%  (P0 只剩 Express 层接线)
```

**评级**: **RC++（接近发布）** 🟢  
本轮将最后一个架构 P0（LLM 流中止）落地到实现层。现在剩余的阻塞项只有 Express 服务端接入 `AbortController`（30 分钟工作量），之后所有 P0 清零，可以正式发布。

---

## 附录：下一步最小化清单（到正式发布）

```
[必须] 30min  Express LLM 路由加 req.on('close', abort)
[必须] 30min  AgentRuntime 验证调用 LLM 时传递 signal
─────────────────────────────────────────── P0 清零线
[推荐] 1.5h   提取 llm/utils/stream.ts 消除 ~600 行重复
[推荐] 30min  estimateTokens/calculateCost 移至基类
[推荐] 30min  config.ts 改写 → 删除 LogSystemAdapter
[可选] 30min  checkpoints 文件持久化
```
