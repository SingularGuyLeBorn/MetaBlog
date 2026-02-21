# 场景二：悬浮球主动触发创作（AI 被动创作）- 深度体检报告

> **体检目标**：追踪从用户点击“悬浮球”直到“一篇文章生成并落盘”的完整技术生命周期。评估数据流转的准确性、UI 交互的平滑度、异常兜底的可靠性以及日志留存的完备性。

---

## 整体链条健康度评估：🟢 优秀 (链条完整，无断裂)

该场景的生命周期从 `AIChatOrb.vue` 启动，经由双通道路由将携带意图的文本与媒体介质发送给核心引擎 `AgentRuntime.ts`，后者编排 `IntentRouter` 获取准确意图后通过对应的 `Skill` 完成文件创作。流程无断点，异常捕获结构坚固。

---

## 阶段一：前端 UI 唤起与参数构造 (UI Interaction & Input)

### 1. 悬浮球的启动与交互
- **相关组件**：`AIChatOrb.vue`
- **UI 动作表现**：
  - 页面右下角常驻圆形悬浮球，支持自由拖拽（监听 `mousemove`, `mouseup`）。
  - 用户点击悬浮球触发 `openConsole()`，悬浮球展开为宽 480px、高 480px（支持动态 Resizing）的对话面板。
- **可输入性（交互状态）**：
  - 高度可用。面板内包含 `contenteditable="true"` 的高亮富文本输入框 `inputRef`。
  - 用户按下 `/` 键触发 `popoverMode = 'skill'` 的下拉菜单（如：“深度研究”、“自动创作”）。
  - 用户按下 `@` 键触发 `popoverMode = 'article'`，允许将本地 `.md` 文件打包为 `ArticleData` 胶囊插入输入框。
- **UI 评价**：界面清晰，操作反馈实时，具备完善的话术引导（“输入消息，使用 / 技能 @ 引用文章...”）。

### 2. 消息封装与投递
- **相关函数**：`sendMessage()`
- **变量提取与流转**：
  - `extractInputContent()` 扫描输入框 DOM，将纯文本抽离为 `text: string`，将 `@` 引用的胶囊提取为 `articles: ArticleData[]` 的对象数组。
  - 对于引入的文章，调用 `fetchArticleContent(article.path)` 向本地域名服务器发起 `fetch`，提取前 5000 字符拼装在 `fullContent` 中。
- **发送路由判定**：
  - `shouldUseAgentRuntime(text)` 判定当前语境是否应交由 Agent（写文章、增改查），若为纯聊天则走 `sendViaChat` 直连大模型，否则走核心链路 `sendViaAgent(fullContent, rawText, articlesWithContent)`。
- **UI 即时反馈**：
  - 面板立刻追加一条卡片：`role: 'assistant', content: '⏳ 正在执行技能...'`，并将 `isAgentExecuting` 置为 `true` 阻断按钮双击。

---

## 阶段二：意图拆解与核心引擎接管 (Orchestration & Routing)

### 3. AgentRuntime 接盘与状态跃迁
- **涉及文件**：`AgentRuntime.ts` (`processInput` & `executeIntent` 方法)
- **输入**: `fullContent` (含上下文的完整提示词字符串), `context: { currentFile: string }`
- **变量流转**：
  - `processInput` 被触发，第一时间调用 `this.setState('UNDERSTANDING')`。
  - 并发生成唯一追踪句柄 `messageId = this.generateId()`。
- **通信手段**：单例内存通信。`AIChatOrb` 共享了注入在 Vue App 上下文里的 `agentRuntime` 实例。

### 4. 路由切分 (IntentRouter)
- **涉及文件**：`IntentRouter.ts` (`parse` 方法)
- **函数输入**：`input: string`
- **数据流转与赋值**：
  - 先去查基于内存的 `LRUCache` 缓存有没有解析过相同的输入。
  - 执行 `intentPatterns` 的正则测试。检测到诸如“写、生成、创作”配对“文章、博客”时，匹配命中 `WRITE_ARTICLE`。
  - 进一步执行 `parameterExtractors.topic(m, input)` 正则捕获提取具体的“主题（Topic）”。
- **输出**：返回复杂的强类型 `ParsedIntent` 对象：
  ```json
  {
    "type": "WRITE_ARTICLE",
    "confidence": 0.95,
    "parameters": { "topic": "提取的主题内容" }
  }
  ```

---

## 阶段三：自动化落地执行 (Execution & File IO)

### 5. 任务与进度管理
- **流转枢纽**：`executeIntent(intent)`
- **运行机理**：
  - `AgentRuntime` 生成一个新的 `TaskState`（状态置于 `PLANNING`），并压入 `activeTasks`。
  - 创建 `AbortController` 加入 `activeControllers` 字典，**意味着这条链支持用户在中途从 UI 发起物理中断截停**。
  - 分配 `SkillContext` 对象，其中包含 `memory`, `logger`, `costTracker`, `fileLock` 以及 `onProgress` 回调钩子。

### 6. 写作技能展开 (Skill Engine)
- **涉及组件**：注册给 `WRITE_ARTICLE` 意图的技能 Handler（例如 `WriteArticleSkill.ts`，或者是默认的 `ResearchWithFallbackSkill` 根据参数变阵）。
- **具体通信与操作**：
  - **资料检索**：通过注入的 `MemoryManager` 拉取过往向量相似度知识；如果有 `WebSearch` 工具实例，利用 `SerpApi` 补充外围知识。
  - **大模型通信**：由 `LLMManager` 承接最终整合好的 Prompt 发向云端 API，执行全篇输出。
  - **进度通知**：Skill 内部每隔阶段会调用 `context.onProgress({ step: N, message: "..."})`。这些进度通过 `this.emit('progress', ...)` 由 `eventBus` 抛出，最终被 UI 截获更新进度条。
- **最后落盘输出**：
  - 生成 `Markdown` 内容，通过调用后端 API 端点 `/api/files/save` 传输 `path` 和 `content` 实现保存。
  - 触发 `/api/git/commit` 记录 `[Auto-Agent] Create article`。
  - 函数返回 `SkillResult`，形如：`{ success: true, data: { path: "xx.md" }, tokensUsed: 1540, cost: 0.003 }`。

---

## 阶段四：返回与 UI 侧展示 (Response Verification)

### 7. 结束与状态解除
- **数据回流 (`AgentRuntime` -> `AIChatOrb`)**：
  - `AgentRuntime` 将状态打为 `COMPLETED`。
  - 放开之前占用的 Node 侧并发用文件锁（`fileLockManager.releaseTaskLocks`）。
  - 返回包装好的 `ChatMessage` 对象。
- **前端界面的闭环**：
  - `AIChatOrb` 接收到消息对象，将原本等待状态的 `"⏳ 正在执行技能..."` 弹窗，原地替换为生成结果（`result.content`）。
  - UI 捕捉到 `metadata?.path` 附加参数，生成超链接跳转按钮：“📄 文件已保存：`/posts/tech/xxx.md`”。
  - 解锁输入框和按钮状态（`isAgentExecuting = false`）。

---

## 异常兜底机制 (Error Handling & Fallback)

1. **输入意图不明确的兜底**：
   若 `IntentRouter` 返回置信度低于 `< 0.6` 或识别包含强硬的否定词（不需要写了），在 `processInput` 马上中断主链，直接回复提示框强行征求用户意见：“我不太确定您的意图。您是想要……”，防止 Agent 自作主张乱建文件夹。

2. **接口网络超时或配额阻断的兜底**：
   包含在 `executeIntent` 的 Try-Catch 中断。任何 `await skill.handler` 的底层异常，不论是 Fetch 失败还是大模型并发 429 失败，均会被捕获并将任务标记为 `ERROR` 状态。`ActiveControllers` 会释放相关锁，并在聊天窗打印安全的 `❌ 执行过程中出现错误：错误明细...`，指导用户继续对话。

3. **文档引用读取为空的兜底**：
   在 `AIChatOrb` 前端尝试 `fetchArticleContent` 时，做了深度路径猜测策略。无论后缀是 `.md`, `.html`, 还是 `index.md`，使用 `for-of` 进行穷举。如果所有路径皆报 `404` 或返回的不是合法的 Markdown 纯量内容开头，它会自动向送给 Agent 的文本塞入 `(无法获取文章内容)` 的字眼来防止运行时整个方法体直接崩溃。

---

## 日志监控生态 (Logging System)

整个流程采用高配的 `StructuredLogger` 按事件主题记录一切动作的账本：
- **`[AIChatOrb.vue]`** 
  - `chat.message`：记录每次点击 Send，传了多少字、多少引用的 ArticleData。
  - `agent.execute`：记录调用的 Skill 类型。
- **`[IntentRouter.ts]`**
  - `router.parse` & `router.cache.hit`：记录分类消耗时间与命中结果。
- **`[AgentRuntime.ts]`**
  - 使用了硬挂载成本管控器 `costTracker`，最终生成后不仅打出 `agent.complete` 成功日志，还顺手追加记录 `tokens` 与 `cost`，保证整个智能行为每一分钱的支出、每个字节的创建在后台控制台留有完美的一对一凭证记录。
