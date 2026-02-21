# 核心场景体检报告 02：深度 AGI 创作与修改

> 📊 **详细技术体检报告**: [../health-report/02_deep_agi_creation_health_report.md](../health-report/02_deep_agi_creation_health_report.md)

> **致未来的 AI 架构师：**
> 这是 MetaBlog 系统的“深水区”。当你读懂这里的数据流向，你就掌握了整套 Agent 框架的心跳。这个场景涉及自然语言理解、技能分发、多轮网络通信、本地文件锁以及看门狗的死亡宣告。在这里，`AbortController` 必须是你的最高信仰——只要有一处 `callLLM` 不理会它，系统就会滑入深渊。

---

## 🧭 场景定位：最复杂的机器呼吸

该场景发生于用户在弹出的聊天面板（`AIChatWindow.vue`）中，输入了具有强行为倾向的指令。例如：“写一篇关于前端微存管理的文章”、“帮我重写这里”、“研究一下目前最新的 RLHF 论文”。此时，文本匹配将把请求导流进重装上阵的 `AgentRuntime` 及其插件化技能树（Skills）。

## 🧬 全生命周期与数据流转

### 阶段 0：启动引擎与环境注射 (Initialization)

在此场景唤醒之前，环境必须就绪。

- **触发**: `AIChatOrb.vue:onMounted`（当挂件加载时）。
- **函数**: `initAgentRuntime()` -> `agentRuntime.initialize()`。
- **注射物流向**: 
  - `builtinSkills`（7 大预设技能，如 `WriteArticleSkill`, `EditContentSkill`）被实例化成一个个闭包对象，挂载入 `agentRuntime.registerSkill(skill)`。
  - `AgentRuntime` 的内部结构发生了实质性变化：
    - `this.skills.set('WriteArticle', _WriteArticleSkill_)`
  - 并发执行了内部三大核心组建的挂接：`MemoryManager` 启动，`LLMManager` 初始化环境变量，`CheckpointStorage.load()` 通过 `/api/files/read` 读取断点。

### 阶段 1：理解与分发冲动 (Routing)

- **输入节点**: `agentRuntime.processInput(text: string)`
- **核心组件**: `IntentRouter.ts`
- **变量流转**:
  - `text` 被捕获，`stateMachine.transition('UNDERSTANDING')`。
  - **网络探测 (可选)**: 如果正则无法解析，`processInput` 将悄悄向底座大模型抛出一个 `parsePrompt`，索要一个 JSON，比如 `{ "type": "WRITE_ARTICLE", "confidence": 0.95 }`。
  - **路由分拣**: 拿到 `intent` 后，`intentRouter.findSkill(intent)` 会去遍历 `this.skills` 字典。匹配到对应的 `Skill` 对象。

### 阶段 2：执行前传的生命绑定 (Execution Prep)

此时，系统已经知道要拔出那把刀了。

- **文件**: `agent/core/AgentRuntime.ts:executeTask()`
- **生命挂载**:
  - 一个随机生成的 `taskId` 被捏出：`uuidv4()` 变种。
  - 核心生命信号生成拉环：`const abortController = new AbortController()`。
  - **存储管控**: `this.activeControllers.set(taskId, abortController)`。如果中途你想停下来，这是唯一的拉锯。
  - **组装弹药 Context**: `const skillContext: SkillContext = { signal: abortController.signal, memory, logger, mode, currentFile }`。

### 阶段 3：执行与生死劫 (Skill Processing)

这就进入了各 `Skill` 内部逻辑。以 `WriteArticleSkill` 为例。

- **文件**: `.vitepress/agent/skills/builtin.ts` 
- **函数**: `WriteArticleSkill.handler(ctx, params)`
- **第一道断头台**: 入口处立刻校验 `if (ctx.signal?.aborted) return { success: false, ... }`。
- **Memory 构建**: `ctx.memory.buildContext(topic)` 抽取 RAG 内容作为前情提要。
- **大模型双发齐射**: 
  1. **提纲射击**: `callLLM(outlinePrompt, { signal: ctx.signal })`。
     - **底层通信**: fetch 请求挂着 `ctx.signal` 传入 Node Http Layer / Vercel Edge Layer。如果这时收到来自 UI 的停止信号，底层抛出 `AbortError`。
     - 大模型吐出 `tokens` 和 `cost`。
  2. **第二道断头台**: 再次校验 `if (ctx.signal?.aborted) return ...`。
  3. **内容射击**: `callLLM(contentPrompt, { signal: ctx.signal })`。如果这没挂载 signal（像 v16 之前的 UpdateGraph），这就是不可杀死的寄生怪形。
- **变量返回**: `return { success: true, result: _ArticleContent_, tokensUsed: 1540 }`。

### 阶段 4：记忆固化与文件持久化 (Persistence)

一旦返回了 `success: true`，`AgentRuntime` 会接管这具遗体。

- **函数**: `agentRuntime` 内回调块。
- **操作**: 存储历史操作日志（方便回滚与解释），状态机归零 `stateMachine.transition('COMPLETED')`。
- **网络通信**: 调用 `/api/files/save` 接口发起了对文件系统的物理覆写。它会将 `docs/posts` 或者 `.vitepress/agent/memory` 写入磁盘，改变外部世界。因为配置了完整的路径分支，数据精确降落。

---

## 🛡️ 异常兜底与错误监控

1. **Watchdog 超时绝杀 (The Watchdog Guard)**
   - 文件：`StateMachine.ts`
   - 机制：每次状态变更，系统重置一个倒计时器 `watchdogTimer`（通常 5 分钟或 10 分钟）。
   - 触发：如果你在 `EXECUTING` 卡主了，LLM 没有回复，超时触发 `this.forceTimeout()`。单次抛出 `ERROR: WATCHDOG_TIMEOUT`。
   - 这避免了无声的锁死事件。

2. **用户强杀中断链 (User Abort Flow)**
   - UI 按钮发送信号。
   - `AgentRuntime.abort()` 捕获信号，捞起 `this.activeControllers.get(taskId)`，执行 `.abort()`。
   - `callLLM` 触发底层的 `DOMException: The operation was aborted`。这个错误经由 `catch (e)` 拦截，转化为 `success: false` 平滑输出。

## 📝 系统级日志留痕

这是一场高度跟踪的精密手术，它的日志远多于场景一：

- `[AgentRuntime] Processing input...`
- `[StateMachine] State transition: IDLE -> UNDERSTANDING`
- `[IntentRouter] Mapped intent to skill: EditContent`
- `[AgentRuntime] Executing task 8f72a9...`
- `[Skill: EditContent] Starting LLM call... (tokens pending)`

你可以清楚地从浏览器的 Console 中，凭借前缀定位出“事故发生在哪一家医院的哪个科室”。

---
*“永远心怀底线：在任何长时耗操作前后，请加上你的断头台（ctx.signal?.aborted）。这个系统赋予了你自由编排多轮通信的权力，但不代表你能擅自把门焊死。—— Digital Evaluator”*
