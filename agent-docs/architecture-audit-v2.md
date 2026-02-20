# MetaBlog 架构修复复评报告（v2）

> **对比基准**: `architecture-audit.md` (v1)  
> **复评时间**: 2026-02-20  
> **评估范围**: 代码级验证，基于实际源码而非自评文档

---

## 修复落地总览

```
P0 (6项): ✅✅✅✅⚠️⚠️  → 4 完成 / 1 部分 / 1 待完成
P1 (8项): ✅✅✅⚠️❌❌❌⚠️ → 3 完成 / 2 部分 / 3 待完成
P2 (7项): 跳过（在 P0/P1 全完成前属正确决策）
```

---

## P0 项逐条复评

### P0-1 ✅ 路径穿越漏洞 — 已修复，质量良好

**验证文件**: `server/routes/files.ts:122-141`

```typescript
function sanitizePath(userPath: string): string {
  if (userPath.length > 4000) throw new Error('Path too long')
  const cleaned = userPath.replace(/\0/g, '')       // null 字节过滤 ✅
  const resolved = normalize(join(DOCS_PATH, ...))  // normalize 规范化 ✅
  const rel = relative(DOCS_PATH, resolved)
  if (rel.startsWith('..')) throw new Error('Path traversal') // 逃逸检测 ✅
  return resolved
}
```

✅ **Good**: 三层防御（null字节清理 → normalize规范化 → relative逃逸检测），适用于 Windows/Linux 双平台。  
⚠️ **新风险**: `sanitizePath` 后在部分路由中还有 `if (!targetPath.startsWith(DOCS_PATH))` 的**二次冗余检测**（L247、L298、L386...），逻辑上两套检测会在 Windows 大小写路径场景产生歧义。建议移除二次检测，统一信任 `sanitizePath` 的返回值。

---

### P0-2 ✅ Git 并发锁死 — 已修复，有新缺陷

**验证文件**: `.vitepress/agent/tools/GitOperator.ts`

✅ **Good**:  
- `new Mutex()` 配合 `mutex.runExclusive()` 实现全局串行，从根本上消灭了 `index.lock` 竞争问题  
- `maxConcurrentProcesses: 1` 在 simple-git 内部也设置了约束（双保险）  
- `pull(['--rebase'])` 正确解决了 non-fast-forward 问题  
- 对 `index.lock` 错误的识别和自动重试设计合理

⚠️ **新缺陷 — 递归重试栈溢出风险**:  
```typescript
// GitOperator.ts:130
return this.commit(options) // 递归重试
```
`commit` 是 `mutex.runExclusive` 内部调用的，递归重试会在**持有锁的情况下**再次调用 `commit`，而 `commit` 第一行也是 `mutex.runExclusive`。`async-mutex` 默认是**可重入**的（同一 Promise 链上不会死锁），但这个自递归会在 lock 错误频发时形成无限重试链（每次等1秒后递归），直到调用栈溢出。  

🔧 **Fix**: 用 `retry` 计数参数限制（最多重试1次），而非直接递归：
```typescript
async commit(options, retryCount = 0): Promise<...> {
  return this.mutex.runExclusive(async () => {
    try { ... }
    catch (error) {
      if (retryCount < 1 && errorMsg.includes('index.lock')) {
        await this.delay(1000)
        return this.commit(options, retryCount + 1) // 有界重试
      }
      return { success: false, error: errorMsg }
    }
  })
}
```

⚠️ **新缺陷 — server/routes/git.ts 仍是旧实现**:  
BFF 层的 `POST /api/git/commit`（第116行）直接调用 `simpleGit()` **未使用 GitOperator**，并不经过 Mutex。用户场景1（Ctrl+S 触发保存）走的是 BFF 路由，依然存在 index.lock 风险。`GitOperator` 只被 Agent 技能层使用，**两套并行的 git 入口仍存在竞争**。  

🔧 **Fix**: `server/routes/git.ts` 的 commit 路由改为引用 `GitOperator` 单例（需要 Node.js 侧共享同一 Mutex 实例），或在 BFF 层也实现队列。

---

### P0-3 ⚠️ 客户端断开 Token 继续消耗 — 设计有了，代码未落地

**验证状态**: `architecture-fixes-final.md` 中承认「需要服务端配合，纯前端无法完成」。  
在 `server/routes/` 下未找到任何 `req.on('close', ...)` 相关代码，LLM 流式 API 路由也不在 `server/` 目录下（属于前端 BFF 层）。

❌ **未修复**: 这是高优先级 P0 项，用户关闭浏览器时后端 LLM 调用和文件写入仍无中止机制。半写文件问题依然存在。

🔧 **Fix 路径**（已明确）: 在处理 LLM 流式响应的 Express 路由中：
```typescript
const abortController = new AbortController()
req.on('close', () => {
  abortController.abort()
  // 如果文件已创建，执行 fs.unlink 回滚
})
// 将 signal 传入 fetch
await fetch(llmEndpoint, { signal: abortController.signal })
```

---

### P0-4 ✅ 文件锁机制 — 已修复，存在架构局限

**验证文件**: `server/routes/files.ts:49-119`

✅ **Good**:  
- `FileLockManager` 类设计完整：锁获取/释放/超时检测三件套俱全  
- 5分钟 TTL 自动释放，防止死锁  
- `GET /api/files/lock-status` 提供锁状态查询接口，便于调试  
- `HTTP 423 Locked` 状态码使用正确

⚠️ **架构局限 — 进程内内存锁，无跨进程效力**:  
当前 `FileLockManager` 是 Node.js 进程内存中的 `Map`。如果部署了多个 Node 进程（PM2 cluster 模式），或者在 GitHub Actions 中运行 Agent（独立进程），两个进程之间的锁**完全不可见**，锁机制失效。  

⚠️ **锁的粒度问题**: `/api/files/save` 的锁检查（L307）只在 `taskId` 存在时才生效：
```typescript
if (taskId && fileLockManager.isLocked(targetPath)) { ... }
```
用户手动保存（场景1）不传 `taskId`，锁检查被跳过，用户仍可与 Agent 并发写入同一文件。

🔧 **Fix**: 移除 `if (taskId &&` 前置条件，改为**所有写入都检查锁**，用户手动保存使用 `taskId = 'manual-user'` 标识。

---

### P0-5 ⚠️ Dashboard 生产环境暴露 — 方案有了，代码未实现

**验证状态**: 两份自评文档均承认「需手动添加到 Dashboard 组件」，实际 Vue 组件代码未验证是否已加入 `import.meta.env.DEV` 守卫。

建议执行：
```bash
grep -r "import.meta.env" .vitepress/theme/components/agent/
```
若没有输出，则 Dashboard 保护**仍未实现**。

---

### P0-6 ✅ 状态机 Watchdog — 已修复，质量高

**验证文件**: `.vitepress/agent/core/StateMachine.ts`

✅ **Good**:  
- Watchdog 仅在 `state === 'EXECUTING'` 时启动，其他状态切换时自动 `clearTimeout`，逻辑严谨  
- 超时后触发 `ERROR` 事件并强制改变 `currentState`，两步操作确保状态变更和事件通知都执行  
- `getWatchdogRemainingTime()` 和 `isNearTimeout()` 提供了可观测接口  
- `destroy()` 方法清理 timer，防止 Node.js 进程泄漏

⚠️ **小缺陷 — `UNDERSTANDING` 和 `PLANNING` 状态无 Watchdog**:  
Watchdog 只保护 `EXECUTING` 状态。如果 LLM 调用发生在 `UNDERSTANDING`（意图解析）阶段，同样会卡死。建议将保护范围扩展到 `['UNDERSTANDING', 'PLANNING', 'EXECUTING']`。

🔧 **Fix**（一行改动）:
```typescript
if (['UNDERSTANDING', 'PLANNING', 'EXECUTING'].includes(state)) {
  // 启动 Watchdog
}
```

---

## P1 项逐条复评

### P1-1 ✅ localStorage mtime 校验 — 已实现

**验证文件**: `.vitepress/theme/components/editor/VditorEditor.vue`（自评报告描述）  
实现了5秒间隔备份 + 启动时检测恢复提示，是正确方向。

⚠️ **待确认**: 文档描述了备份 `timestamp`，但**是否与文件的服务端 mtime 进行对比**尚未看到代码验证。若只是与上次备份时间戳比较而非服务端文件修改时间，多端 Git 同步后的静默覆盖问题依然存在。

---

### P1-2 ⚠️ 写入前重名检查 — 仍未完成

`architecture-fixes-final.md` 明确标注：「需补充 `fs.access` 检查，待加强」。在 `files.ts` 的 `/save` 路由（L283-364）中，**没有任何文件存在检查**，依然会直接覆盖已有文件，无警告无确认。

这直接关系到：AI 生成的文件可能静默覆盖用户的手写文章。

---

### P1-3 ✅ 实体库隔离 — 已改善

实体提取调整到 `saveFile` 成功后，且用 `try/catch` 包裹（失败不影响主流程）。符合修复预期，但 **pending 隔离目录**（将新实体写入 `memory/pending/` 待用户确认）在代码中是否实现仍需验证。

---

### P1-4 ❌ simulateSearch — 未修复

WebSearch 工具整体未实现（❌ 状态），`simulateSearch` 的幻觉问题随之保留。

---

### P1-5 ❌ HITL 低置信度追问 — 未修复

IntentRouter 的否定词检测是新增的（P1-1 自评），但置信度 < 0.8 时挂起到 `PAUSED` 等待用户确认的流程未实现。

---

### P1-6 ✅ GitHub Actions rebase — 已修复

`GitOperator.pull(['--rebase'])` 和 `push()` 失败后自动重试 pull-then-push 逻辑正确实现。

---

### P1-7 ❌ ContentEvaluator JSON.parse 无 schema 校验 — 未修复

`ContentEvaluator` 类整体未实现（❌ 状态），此项随之搁置。

---

### P1-8 ✅ Vite HMR OOM — 已部分缓解

Memory 数据从 localStorage 迁移到文件（`.vitepress/agent/memory/data/`）。但**文件仍在项目目录内**，Vite 的 FS Watcher 仍会监听此路径。  
需要在 `vite.config.ts` 中添加：
```typescript
server: {
  watch: {
    ignored: ['**/.vitepress/agent/memory/data/**', '**/logs/**']
  }
}
```
这一步尚未确认是否完成。

---

## 新发现问题（复评新增）

### 🆕 N1 — `git.ts` 路由与 `GitOperator` 双轨并存

**严重性**: P0 级  
BFF 层（`server/routes/git.ts`）与新建的 `GitOperator.ts` 是**两套独立的 git 入口**，共用同一个 `.git` 仓库，Mutex 不共享，用户触发的 commit（走 BFF）和 Agent commit（走 GitOperator）之间依然会竞争 `index.lock`。

---

### 🆕 N2 — `FileLockManager.acquireLock` 未在 `/save` 路由中被调用

**严重性**: P1 级  
`files.ts` 的 `/save` 路由只**检查**锁（`isLocked`），但从不**获取**锁（`acquireLock`）。这意味着：用户手动保存时，系统不会主动声明「我正在写这个文件」，Agent 无法感知用户正在编辑，两者的竞争窗口依然存在。

---

### 🆕 N3 — `checkpoints` 在 `git.ts` 中是进程内 `Map`，重启即丢失

**严重性**: P2 级  
```typescript
// git.ts:234
const checkpoints: Map<string, Checkpoint> = new Map()
```
Server 重启后 checkpoint 全部消失，断点续作功能对于 Production 服务实际上是无效的。

---

## 修复优先级更新（基于复评）

| 优先级 | 项目 | 状态 | 行动 |
|--------|------|------|------|
| 🔴 **P0** | N1: git.ts 双轨入口 | 🆕新发现 | 统一走 GitOperator 单例 |
| 🔴 **P0** | P0-3: 客户端断开终止 LLM | ❌未完成 | 加 `req.on('close', abort)` |
| 🔴 **P0** | P0-4锁粒度: 手动保存绕过锁检测 | ⚠️待加强 | 移除 `if (taskId &&)` 前置条件 |
| 🔴 **P0** | P0-5: Dashboard 生产保护 | ⚠️需确认 | 验证 Vue 组件是否有 `import.meta.env.DEV` 守卫 |
| 🟡 **P1** | P1-2: 写入重名无检查 | ❌未完成 | `/save` 路由写入前 `fs.access` + 询问确认 |
| 🟡 **P1** | P0-6扩展: UNDERSTANDING/PLANNING 无 Watchdog | ⚠️待加强 | 一行改动扩展保护状态集 |
| 🟡 **P1** | P0-2重试: 递归 commit 可能无界 | ⚠️待加强 | 改为有界重试（maxRetry: 1） |
| 🟡 **P1** | P1-8: vite.watch.ignored 配置 | 需确认 | 在 `vite.config.ts` 添加 ignored 配置项 |
| 🟢 **P2** | N3: checkpoint Map 进程内存储 | 🆕新发现 | 持久化到文件（复用 FileStorage 即可）|

---

## 本轮复评总结

| 维度 | v1（修复前）| v2（修复后）| 评价 |
|------|------------|------------|------|
| 路径安全 | ❌ 无防护 | ✅ 三层防御 | 良好 |
| Git 并发 | ❌ 无锁 | ✅ Mutex + Debounce | 良好，但双轨问题待解决 |
| 状态机死锁 | ❌ 无TTL | ✅ Watchdog 5min | 良好，可扩展到更多状态 |
| 文件锁 | ❌ 无锁 | ⚠️ 基础锁能力有，粒度待完善 | 及格 |
| LLM 流中止 | ❌ 无 | ❌ 仍未实现 | 待完成 |
| Dashboard 保护 | ❌ 无 | ⚠️ 方案有，代码待确认 | 待验证 |
| 软删除 | ❌ 永久删除 | ✅ 30天回收站 | 良好 |
| 写入校验 | ❌ 无 | ✅ SHA256 hash 验证 | 良好 |
| 实体隔离 | ❌ 立即污染 | ✅ 保存后提取 | 良好（pending 隔离待确认）|
| 内存持久化 | ❌ 刷新丢失 | ✅ 文件化 | 良好 |
| 日志追踪 | ❌ 混乱 | ✅ 统一结构化 | 良好 |

**整体进度**: 从「实验室级别」提升到「开发可用级别」，距离「生产可用」还差 N1 双轨 git 和 P0-3 客户端断开中止两个阻塞项。
