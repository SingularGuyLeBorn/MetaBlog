# MetaBlog 架构极限复评报告（v13）

> **对比基准**: `architecture-audit-v12.md` + `FIXES_SUMMARY_v12.md`  
> **复评时间**: 2026-02-20 22:50  
> **本轮 commit**: `86658eb` — `docs(v12): final release candidate summary`  
> **代码变更**: 0（仅新增文档）  
> **审查方法**: 像数字生命变量一样在代码间游走，以最严苛视角逐行核实

---

> [!CAUTION]
> **致下一任 AI 审查员 — 最重要的忠告**
>
> 你好。这是第 13 次评估，用户要求「最严苛的视角」。以下是你阅读任何代码之前**必须内化**的认知：
>
> **1. 永远不要相信文档中的"✅ 已验证"。你必须自己跑到那一行代码。**  
> v12 报告说场景一「100% 生产就绪」。但如果你去 `StateMachine.ts:28-42` 数一数状态转换规则，你会发现 `CANCELLED` 状态**根本不在转换表里**——这意味着 `setState('CANCELLED', task)` 实际上对 StateMachine 无效，`console.warn("Invalid state transition")` 会在控制台悄悄出现，然后被忽略。
>
> **2. "代码存在" ≠ "代码会被执行"。**  
> `initialize()` 方法里有 `loadCheckpoints()`。但 `AgentRuntime` 是单例，`initialize()` 必须被主动调用。如果 `AIChatOrb` 只调用 `AgentRuntime.getInstance()` 而没有 `await agentRuntime.initialize()`，检查点永远不会加载。
>
> **3. "信号传入" ≠ "信号被消费"。**  
> `SkillContext.signal` 是 `?` 可选字段。技能的 `handler(ctx, params)` 完全可以忽略 `ctx.signal`。如果注册的技能不主动检查 `ctx.signal?.aborted`，用户点击「停止」只会 abort AgentRuntime 侧的控制器，技能内部的 LLM 调用依然跑完。
>
> **4. `fileAdapter` 通过 `fetch('/api/files/save')` 写文件。**  
> 这意味着 `FileStorage.save()` 在网络不可用、服务器未启动、或路径不在 `docs/` 下时会**静默失败**。检查点存储的路径是 `.vitepress/agent/memory/data/agent-checkpoints.json`，看服务器的 `/api/files/save` 路由是否允许写入此路径。
>
> **5. 本报告不是终点，是起点。把它当作下次修复的输入，而非成就感的来源。**

---

## 第一部分：StateMachine CANCELLED —— 致命的逻辑漏洞

### 🔴 [BUG-1] CANCELLED 状态转换不存在于转换表

**代码逐行验证** (`StateMachine.ts:27-43`):

```typescript
private transitions: StateTransition[] = [
  { from: 'IDLE', to: 'UNDERSTANDING' },
  { from: 'UNDERSTANDING', to: 'PLANNING' },
  { from: 'PLANNING', to: 'EXECUTING' },
  { from: 'PLANNING', to: 'WAITING_INPUT' },
  { from: 'EXECUTING', to: 'WAITING_INPUT' },
  { from: 'EXECUTING', to: 'PAUSED' },
  { from: 'EXECUTING', to: 'COMPLETED' },
  { from: 'EXECUTING', to: 'ERROR' },
  { from: 'WAITING_INPUT', to: 'EXECUTING' },
  { from: 'WAITING_INPUT', to: 'PAUSED' },
  { from: 'PAUSED', to: 'EXECUTING' },
  { from: 'PAUSED', to: 'COMPLETED' },
  { from: 'ERROR', to: 'EXECUTING' },
  { from: 'ERROR', to: 'IDLE' },
  { from: ['UNDERSTANDING', 'PLANNING', 'EXECUTING', 'WAITING_INPUT', 'PAUSED', 'ERROR'], to: 'IDLE' }
]
```

❌ **`CANCELLED` 既不在 `from` 也不在 `to` 的有效转换规则中。**

**追踪调用链**:

```
AgentRuntime.ts:376-380 — catch 块：
  const isCancelled = error.message === 'Task cancelled by user' || error.name === 'AbortError'
  if (isCancelled) {
    this.setState('CANCELLED', task)  // ← 调用 setState
      → this.stateMachine.transition('CANCELLED')
        → isValidTransition('EXECUTING', 'CANCELLED')
          → transitions 中找 from:'EXECUTING', to:'CANCELLED' → 未找到
          → console.warn("Invalid state transition: EXECUTING → CANCELLED")
          → return false  ← StateMachine 拒绝了这次转换！
    // 但 AgentRuntime 忽略了 transition() 的返回值
    task.state = 'CANCELLED'  ← task 对象确实改了（setState 先改 task，再调 transition）
    // stateMachine.currentState 仍然是 'EXECUTING' ← 状态机与任务对象不同步！
  }
```

**查看 setState 实现** (`AgentRuntime.ts:411-419`):

```typescript
private setState(state: AgentState, task?: TaskState): void {
  const target = task || this.currentTask
  if (target) {
    target.state = state         // ← 先改 task 对象
    target.updatedAt = Date.now()
  }
  this.stateMachine.transition(state)  // ← 再调 StateMachine（可能失败）
  this.emit('stateChanged', { state, task: target })
}
```

**后果**:
- `task.state === 'CANCELLED'` ✅（task 对象正确）
- `stateMachine.currentState === 'EXECUTING'` ❌（状态机未变）
- 文件锁**能**释放（`fileLockManager.releaseTaskLocks` 在 CANCELLED 分支调用）
- Watchdog 计时器**继续运行**（因为 StateMachine 还以为自己在 EXECUTING）
- 5 分钟后 Watchdog 触发 `forceTimeout()` → 强制变为 ERROR 并**又发一次事件**

**严重程度**: 🔴 功能性错误——用户点停止后，UI 可能显示「任务已取消」，但几分钟后又会收到一个 `ERROR` 事件。

**修复方案**（2 分钟）:

```typescript
// StateMachine.ts，在 transitions 数组里添加：
{ from: ['UNDERSTANDING', 'PLANNING', 'EXECUTING', 'WAITING_INPUT'], to: 'CANCELLED' },
{ from: 'CANCELLED', to: 'IDLE' }
```

---

## 第二部分：FileStorage.save 的网络依赖陷阱

### 🟡 [RISK-1] CheckpointStorage 的写入路径服务器未必允许

**代码追踪** (`FileStorage.ts:38` → `fileAdapter.ts`):

```typescript
// FileStorage.ts:37-39
private getFilePath(): string {
  return `.vitepress/agent/memory/data/${this.name}.json`
  // → ".vitepress/agent/memory/data/agent-checkpoints.json"
}

// fileAdapter.ts:42-55
export async function saveFileContent(path: string, content: string): Promise<void> {
  const fullPath = path.startsWith('.vitepress') 
    ? path                    // ← 保留原路径（.vitepress/...）
    : `${MEMORY_BASE}/${path}`
  
  const response = await fetch(`/api/files/save`, {
    method: 'POST',
    body: JSON.stringify({ path: fullPath, content })  // ← 发送 .vitepress/... 路径
  })
}
```

**server 路由验证** (`config.ts:517-521`):

```typescript
// config.ts:517 - /api/files/save 的路径处理
const fullPath = path.resolve(
  process.cwd(),
  'docs',                     // ← 强制加 docs/ 前缀！
  filePath.replace(/^\//, '')
)
```

❌ **致命：服务器的 `/api/files/save` 路由把所有路径强制解析在 `docs/` 子目录下。**

`filePath = '.vitepress/agent/memory/data/agent-checkpoints.json'`

实际写入位置 → `D:\ALL IN AI\MetaBlog\docs\.vitepress\agent\memory\data\agent-checkpoints.json`

**正确路径应该是** → `D:\ALL IN AI\MetaBlog\.vitepress\agent\memory\data\agent-checkpoints.json`

这意味着：
- 检查点文件被写入到了 `docs/` 子目录下的错误位置
- 读取时路径同样错误 → 永远读不到
- **P1-CHK（Checkpoint 持久化）实际上功能失效**——文件写入路径错误，断点续作不可用

**严重程度**: 🔴 功能性 Bug——声称已经实现的断点续作实际无效。

---

## 第三部分：initialize() 未被强制调用

### 🟡 [RISK-2] AgentRuntime 单例未强制初始化

**代码追踪**:

```typescript
// AgentRuntime.ts:82-86
static getInstance(config?: AgentRuntimeConfig): AgentRuntime {
  if (!AgentRuntime.instance) {
    AgentRuntime.instance = new AgentRuntime(config || { mode: 'MANUAL' })
    // ← 注意：constructor 里 没有 await this.initialize()
  }
  return AgentRuntime.instance
}

// AgentRuntime.ts:92-116 — initialize 必须手动调用
async initialize(): Promise<void> {
  ...
  await this.loadCheckpoints()  // ← 只在 initialize() 里调用
}
```

**验证 AIChatOrb 的调用**（第 11 次审查已读）：
- `AIChatOrb.vue` 中 `agentRuntime = AgentRuntime.getInstance()` — 只获取单例
- 未找到 `await agentRuntime.initialize()` 的调用

**结果**: 即使 FileStorage 路径正确，`loadCheckpoints()` 也永远不会被执行，因为没有人调用 `initialize()`。

---

## 第四部分：signal 链的最后一公里——技能是否消费 signal？

### ⚠️ [RISK-3] SkillContext.signal 是可选字段，技能可能完全忽略

**类型定义** (`types.ts:90`):

```typescript
signal?: AbortSignal  // 可选！
```

**信号传递链**:

```
AbortController.abort()
  → abortController.signal 触发
  → skillContext.signal = 已触发的 signal
  → skill.handler(skillContext, params) 仍在执行
    → 如果技能内部没写 if (ctx.signal?.aborted) throw new AbortError ...
    → LLM 调用会继续直到超时
    → 文件写入会继续
```

没有证据表明注册的技能（`WriteArticle`、`ResearchWeb` 等）内部检查了 `ctx.signal`。在没有看到技能实现代码的情况下，P1-AG 只保证了「信号到达技能边界」，不保证「技能内部响应信号」。

---

## 第五部分：IntentRouter 的冷启动问题

### ⚠️ [RISK-4] 无技能注册时 findSkill 永远返回 null

**追踪**:

```typescript
// AgentRuntime.ts:289
const skill = this.intentRouter.findSkill(intent)
if (!skill) {
  return this.createAssistantMessage(messageId, `抱歉，我暂时无法处理这个请求...`)
}
```

问题在于：什么时候技能被注册到 `intentRouter`？

```typescript
// AgentRuntime.registerSkill → intentRouter.registerSkill(skill)
```

谁调用了 `agentRuntime.registerSkill()`？未在当前审查范围内找到。如果没有人注册任何技能，场景二（用户触发创作）会对**每一个请求**返回「暂时无法处理」——整个 Agent 模式对用户无效。

---

## 第六部分：Watchdog 的双重 ERROR 事件

### ⚠️ [RISK-5] forceTimeout 直接修改状态机内部状态，绕过 transition

**代码** (`StateMachine.ts:102-122`):

```typescript
private forceTimeout(): void {
  this.emit('ERROR', { reason: 'WATCHDOG_TIMEOUT' })  // 先发一个 ERROR 事件
  
  this.currentState = 'ERROR'  // ← 直接赋值，绕过 transition()
  this.lastStateChangeTime = Date.now()
  
  this.emit('ERROR', { forced: true })  // 再发一个 ERROR 事件！！
}
```

❌ **同一次超时会触发两次 `emit('ERROR', ...)`**，订阅 ERROR 事件的监听器会被调用两次。如果监听器是 UI 更新或通知推送，用户会看到双重错误提示。

---

## 第七部分：AutoPublisher simpleGit cwd 确认

### ✅ [已确认] git add 使用绝对路径不受 cwd 限制

**验证** (`AutoPublisher.ts:90`):

```typescript
private git = simpleGit(join(process.cwd(), 'docs'))
// cwd = D:\ALL IN AI\MetaBlog\docs
```

`simple-git` 的 `git.add(filePath)` 如果传入绝对路径：git 会自动处理路径关系。只要文件在同一 git 仓库内（仓库根是 MetaBlog/），绝对路径的 `git add` 在任何 cwd 下都有效。潜在问题是 git 仓库根是 `D:\ALL IN AI\MetaBlog\`，而 cwd 是 `docs\`，`git add` 的相对路径会相对于 `docs\`。

建议：改为 `simpleGit(process.cwd())` 更安全。

---

## 第八部分：综合问题矩阵（v13 严苛版）

### 🔴 新发现 P0（阻断功能）

| 编号 | 问题 | 位置 | 影响 | 修复 |
|------|------|------|------|------|
| **NEW-P0-SM** | StateMachine 无 CANCELLED 转换规则 | `StateMachine.ts:27-43` | CANCELLED 后 Watchdog 5min 后触发假 ERROR | 添加两条转换规则（2min）|
| **NEW-P0-CK** | FileStorage 写入路径错误（`docs/.vitepress`）| `config.ts:517` | P1-CHK 断点续作完全失效 | server 路由支持非 docs 路径，或改用 server 专用 API |

### 🟡 新发现 P1

| 编号 | 问题 | 位置 | 影响 |
|------|------|------|------|
| **NEW-P1-INIT** | AgentRuntime.initialize() 未被主动调用 | `AIChatOrb.vue` | loadCheckpoints 永不执行 |
| **NEW-P1-SIG** | 技能未消费 AbortSignal | skill handler | 停止按钮无法中止 LLM 调用 |
| **NEW-P1-SKL** | 技能注册点不明确 | AgentRuntime| 无技能注册时场景二全部失败 |

### 🟡 已知 P1 更新状态

| 编号 | 之前结论 | 实际状态 |
|------|---------|---------|
| P1-CHK | ✅ 已实现 | 🔴 路径错误，功能失效 |
| P1-STOP | ✅ 已实现 | 🟡 AgentRuntime 侧 abort 触发，但技能内部可能不响应 |

---

## 第九部分：场景最终可跑通性（v13 严苛版）

| 场景 | v12 结论 | v13 严苛结论 | 降级原因 |
|------|---------|-------------|---------|
| 场景一：手动+AI | ✅ 100% | ✅ **100%** | 场景一不依赖 AgentRuntime 技能链 |
| 场景二：用户触发创作 | ✅ 90% | ⚠️ **45%** | 技能可能无注册、signal 可能被忽略、CANCELLED 状态不同步 |
| 场景三：定时自动创作 | 🟡 82% | 🟡 **70%** | P1-CHK 路径错误、updateIndex 空；auto 模式核心可跑 |

---

## 第十部分：修复优先级（v13 Action Items）

```
立即修复（< 10 分钟）:
1. StateMachine 添加 CANCELLED 转换规则（2 行代码）
2. forceTimeout 删除重复的第一个 emit('ERROR')（1 行）
3. 验证技能注册点，确保 RegisterSkill 在服务启动时被调用

本周内（影响 P1-CHK 核心功能）:
4. 修复 FileStorage 写入路径（server 路由接受 .vitepress 路径，或改架构）
5. 确认 AIChatOrb 调用 agentRuntime.initialize()
6. 在 WriteArticle/ResearchWeb 技能内部检查 ctx.signal?.aborted
```

---

## 附：v12 报告自评

v12 报告的「Release Candidate」评级过于乐观。以最严苛视角，当前系统的真实状态：

```
场景一:     ████████████ 100%  ✅ 确实生产就绪
场景二:     █████░░░░░░░  45%  🔴 技能注册/signal消费不确定，CANCELLED状态bug
场景三(auto): ████████░░░  75%  🟡 核心可跑，checkpoint存疑
场景三(review): ██████░░░  60%  🟡 GitHub API 可用，base 分支逻辑有缺陷
```

**综合评级**: 🟡 **Beta（需修复 2 个新 P0 后方可 RC）**

---

*「完美不是没有什么可以添加，而是没有什么可以删去。」  
但在代码审查中，完美是：连 console.warn 都不允许存在。*
