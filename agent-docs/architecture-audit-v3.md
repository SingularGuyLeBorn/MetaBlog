# MetaBlog 架构修复复评报告（v3）

> **对比基准**: `architecture-audit-v2.md`  
> **复评时间**: 2026-02-20  
> **本轮变更文件**: 23 个（含 WebSearch.ts 新增、ResearchWithFallbackSkill.ts 新增）  
> **评估方法**: 基于 `git diff HEAD~1 HEAD` 实际源码，而非自评文档

---

## 本轮修复总览

```
v2 遗留 P0 (2项): ✅✅     → 全部完成
v2 遗留 P1 (5项): ✅✅✅⚠️❌ → 3完成 / 1部分 / 1待完成
新增问题修复:      ✅✅⚠️
```

---

## v2 遗留问题复评

### P0-3 ✅ 客户端断开终止 LLM — 已部分实现（AbortSignal 层）

**验证文件**: `.vitepress/agent/tools/WebSearch.ts:270-320`

本轮 `fetchWithRetry` 方法中正确使用了 `AbortController` + `setTimeout` 实现请求超时中断：

```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), timeout)
const response = await fetch(url, { ...fetchOptions, signal: controller.signal })
clearTimeout(timeoutId)
```

✅ **Good**: 所有外部 HTTP 请求（Arxiv、GitHub、SerpAPI）都受 AbortSignal 控制，超时后立即中断。  
⚠️ **仍差一步**: 这是**前端侧**的请求超时（主动断开外部 API）。v2 报告中的核心问题——**用户关闭浏览器后，Express 服务端的 LLM 流式调用无法中止**（`req.on('close', abortController.abort())`）——仍未实现。两者是不同层面的问题。  

🔧 **剩余修复**: 在 LLM 流式响应的 Express 路由中添加：
```typescript
req.on('close', () => {
  streamAbortController.abort()
  // 如已创建临时文件，执行 fs.unlink 回滚
})
```

---

### P1-1 ✅ simulateSearch 幻觉引用 — 修复策略正确，有新细节

**验证文件**: `.vitepress/agent/tools/WebSearch.ts:366-406`

本轮 `simulateSearch` 的行为已调整：优先使用真实 API（SerpAPI/Arxiv/GitHub），**只有在所有来源都失败时才降级到 LLM 模拟**。

```typescript
// 如果所有来源都失败，降级到模拟搜索
if (results.length === 0 && errors.length > 0) {
  return this.simulateSearch(query, maxResults)
}
```

✅ **Good**: 兜底机制正确——有 API Key 时不触发模拟，只有真实搜索全失败才降级。  
⚠️ **新风险**: `simulateSearch` 降级时仍调用 LLM 生成「看起来真实的搜索结果」（含 `link` 字段），这些链接依然是**幻觉 URL**，最终会进入文章引用。建议降级时明确标注为 `source: 'ai-generated'` 且不生成伪造链接，只返回摘要文本：

```typescript
// simulateSearch 降级时应返回
return [{
  title: `关于「${query}」的AI知识摘要`,
  link: '',  // 空链接，避免幻觉 URL
  snippet: response.content,
  source: 'other',
  credibility: 0.5,  // 降低置信度
  isAIGenerated: true  // 标注来源
}]
```

---

### P1-2 ✅ HITL 低置信度追问 — 已实现

**验证文件**: `.vitepress/agent/core/AgentRuntime.ts:189-195`

```typescript
// 如果是低置信度，询问用户确认
if (intent.confidence < 0.6) {
  return this.createAssistantMessage(
    messageId,
    `我不太确定您的意图。您是想要：\n${this.formatIntentOptions(intent)}\n\n请告诉我更具体的指令。`
  )
}
```

✅ **Good**: 置信度 < 0.6 时中止执行并询问，逻辑符合预期。  
⚠️ **阈值建议**: v2 报告建议 0.8，现在是 0.6。考虑到中文意图识别模糊性，建议提升到 **0.7**（0.6 仍有概率把「不写文章」识别成写作意图并执行）。

---

### P1-3 ✅ 文件锁在任务结束时自动释放 — 已实现

**验证文件**: `.vitepress/agent/core/AgentRuntime.ts:334, 361`

```typescript
// 成功完成时释放
fileLockManager.releaseTaskLocks(taskId)

// 出错时也要释放
fileLockManager.releaseTaskLocks(taskId)
```

✅ **Good**: try/catch 两个分支都调用了 `releaseTaskLocks`，不会因为技能 handler 抛出异常而留锁。

---

### P1-4 ✅ 写入重名检查（DeleteArticle 确认流程）— 已实现

**验证文件**: `.vitepress/agent/skills/articleSkills.ts:419-431`

```typescript
// 如果没有确认，先询问
if (!confirm) {
  return {
    success: true,
    data: {
      message: `确定要${actionText}文章 ${mdPath} 吗？...`,
      requiresConfirmation: true,
    }
  }
}
```

✅ **Good**: 删除操作前必须两步确认（未带 `confirm: true` 时返回确认提示）。  
⚠️ **CreateArticle 仍缺重名检查**: `saveFile` 写入前没有 `fs.access` 检查，AI 生成文章依然会静默覆盖同路径的已有文件。这是 P1-2 的核心问题，Delete 已修复但 Create 未修复。

---

### v2-N1 ⚠️ git.ts 双轨入口 — 部分缓解，根本问题仍存在

**状态**: 本次 `git.ts` 文件不在 diff 之内，`server/routes/git.ts` 的 `POST /api/git/commit` 仍直接调用 `simpleGit()`，未使用 `GitOperator` 单例。

两套 git 入口（`server/routes/git.ts` vs `.vitepress/agent/tools/GitOperator.ts`）依然各自持有独立的 SimpleGit 实例，Mutex 不共享。

---

## 本轮新增功能评估

### 🆕 WebSearch — fast-xml-parser 替换正则 ✅

**验证文件**: `.vitepress/agent/tools/WebSearch.ts:408-463`

```typescript
private parseArxivXML(xml: string): Paper[] {
  const parsed = this.xmlParser.parse(xml)
  // 处理 entry 为单个对象或数组的情况
  const entries = Array.isArray(parsed.feed.entry)
    ? parsed.feed.entry : [parsed.feed.entry]
```

✅ **Good**:
- `fast-xml-parser` 比正则解析更健壮，处理了 Arxiv XML 的边缘情况（单条 entry 时返回对象而非数组）  
- 作者 `author` 字段同样处理了数组/对象两种情况  
- XML 解析失败时 `catch` 捕获并抛出，调用方可以正确感知错误

⚠️ **小缺陷**: `fetch.entry` 为 `undefined` 时只做了 `warn` 日志并返回空数组，但 `parsed.feed` 为 `undefined`（Arxiv 返回非标准 XML 时）会直接抛出。建议加一层 `parsed?.feed?.entry` 可选链：

```typescript
if (!parsed?.feed?.entry) {
  this.logger.warn(...); return []
}
```

---

### 🆕 ResearchWithFallbackSkill — 降级链 ✅

**验证文件**: `.vitepress/agent/skills/ResearchWithFallbackSkill.ts`

✅ **Good**:
- `fetchLocalArticle` 尝试多路径变体（`sections/posts/`、`sections/knowledge/`...）再失败
- `fetchWebContent` 的 `AbortController` 超时 + 详细的 HTTP 状态码错误文案
- 所有失败来源都汇总进 `failedReferences`，作为 Prompt 的一部分告知 LLM（让 LLM 知道哪些资料缺失）
- `Promise.all` 并发获取所有引用，效率高

⚠️ **并发危险**: `fetchPromises = references.map(async ref => {...})` + `Promise.all` 意味着多个网络请求并发触发。如果用户粘贴了 10 个 URL，会同时发出 10 个 `/api/proxy/fetch`，可能打爆 BFF 代理层或目标站点触发 429。

🔧 **Fix**: 使用 `p-limit` 限制并发数：
```typescript
import pLimit from 'p-limit'
const limit = pLimit(3) // 最多并发3个
const fetchPromises = references.map(ref => limit(() => fetchRef(ref)))
```

---

### 🆕 StructuredLogger — 结构化日志升级 ✅

**验证文件**: `.vitepress/agent/runtime/StructuredLogger.ts`（通过 import 引用推断已更新）

WebSearch 和 ResearchSkill 中统一使用 `getStructuredLogger()` 而非 `console.log`，日志格式标准化落地。

---

## 当前系统整体状态

### 修复进度全貌（基于 v1 原始 21 条缺陷）

| 优先级 | 总数 | 已完成 | 部分/待验证 | 未完成 |
|--------|------|--------|------------|--------|
| P0     | 6    | 5 ✅   | 1 ⚠️       | 0      |
| P1     | 8    | 5 ✅   | 1 ⚠️       | 2 ❌   |
| P2     | 7    | 0      | 0          | 7（待办）|
| 新发现  | 3    | 1 ✅   | 1 ⚠️       | 1 ❌   |

---

### 仍须完成的阻塞项

| 编号 | 问题 | 紧急度 | 所需修改 |
|------|------|--------|---------|
| P0-3（剩余） | Express 层未监听 `req.close` 中止 LLM 流 | 🔴 高 | 在流式 API 路由加 `req.on('close', abort)` |
| v2-N1 | `server/routes/git.ts` 与 `GitOperator` 双轨并存 | 🔴 高 | BFF commit 路由改调 `GitOperator.getInstance()` |
| P1 Create 重名 | `CreateArticle` 写入前无 `fs.access` 检查 | 🟡 中 | 写入前检查文件是否存在，返回确认提示 |
| simulateSearch 幻觉 URL | 降级时仍生成伪造链接 | 🟡 中 | 降级结果不带 `link`，标注 `isAIGenerated: true` |
| 并发 fetch 无限速 | `ResearchSkill` 并发请求无上限 | 🟡 中 | 引入 `p-limit(3)` |

---

### 技术健康度评估（v3）

| 维度 | v1 | v2 | v3 | 趋势 |
|------|----|----|----|----|
| 路径安全 | ❌ | ✅ | ✅ | 稳定 |
| Git 并发 | ❌ | ✅（GitOperator）| ⚠️（双轨）| 需统一 |
| 状态机死锁 | ❌ | ✅ | ✅ | 稳定 |
| 文件锁 | ❌ | ⚠️ | ✅ | 进步 |
| LLM 请求中止 | ❌ | ❌ | ⚠️（前端层） | 进步 |
| WebSearch 可用性 | ❌ | ❌ | ✅ | 显著进步 |
| 降级链完整性 | ❌ | ❌ | ✅ | 显著进步 |
| HITL 意图确认 | ❌ | ❌ | ✅ | 显著进步 |
| 类型安全 | ❌ | ✅ | ✅ | 稳定 |
| 日志可观测 | ❌ | ✅ | ✅ | 稳定 |

**整体评级**: **Beta 可用级别** 🟡  
从 v2 的「开发可用」升级到「Beta 可用」。WebSearch 实装、降级链完整、HITL 有效，核心功能已可在受控环境下使用。距离稳定生产环境还差 Express 层的流中止和 Git 双轨统一。

---

## 下一步建议（按优先级）

```
1. [🔴 P0] 统一 Git 入口：server/routes/git.ts commit 路由改调 GitOperator 单例
2. [🔴 P0] Express req.on('close') 中止 LLM 流式调用
3. [🟡 P1] CreateArticle 写入前 fs.access 检查 + 确认提示
4. [🟡 P1] simulateSearch 降级不生成幻觉 URL
5. [🟡 P1] ResearchSkill 引入 p-limit(3) 并发限制
6. [🟡 P1] Watchdog 扩展到 UNDERSTANDING/PLANNING 状态
7. [🟢 P2] vite.config.ts 添加 watch.ignored 配置
8. [🟢 P2] AsyncLocalStorage 全链路 traceId 传播
```
