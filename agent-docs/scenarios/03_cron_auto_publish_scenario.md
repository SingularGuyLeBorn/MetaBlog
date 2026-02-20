# 核心场景体检报告 03：定时任务后台发布（Auto 与 Review 流）

> 📊 **详细技术体检报告**: [../health-report/03_cron_auto_publish_health_report.md](../health-report/03_cron_auto_publish_health_report.md)
> 
> **致下一代的脚本猎人：**
> 这里是与用户 UI 彻底断开连接的荒野。这里没有点击，没有 `AbortController` 救援，因为机器自己在跑。当你追踪到这个场景，你面对的是纯粹的 Node 后台定时生态与 Git 操作流。由于环境复杂（CI/CD、权限 Token、分支锁定），这是最有可能悄悄崩溃而不报任何前端错的子系统。留意那部分留空的 `updateIndex()` 和 `revparse()` 获取基础分支的隐患（它们是 P2）。

---

## 🧭 场景定位：后台的静默心脏

此场景触发于服务端，依赖 `cron` 表达式唤醒。它的核心使命是：在无人值守的深夜，自动抓取草稿、调用 LLM 评估文章质量。如果过关，就自行用 Git 提交（Auto模式），或者打一个分支发起 Pull Request，让睡醒的主人去 Merge（Review模式）。

## 🧬 生命周期与数据流转

### 步骤 1：时钟滴答与唤醒 (Cron Triggering)

后台时钟击发。

- **守护器**: `TaskScheduler` (`agent/core/TaskScheduler.ts`)
- **钩子流转**:
  - `start()` -> 挂载 `setInterval` 或者通过 `node-cron` 解析 cron。
  - 触发 `this.autoPublish()` 方法。
- **变量产生**: 它没有显式的 `signal` 保护。这在全自动场景下是合理的，机器自己不会觉得不耐烦。

### 步骤 2：自我质量审查 (Self-Evaluation)

在把内容向世界暴露前，Agent 会“自我怀疑”。

- **执行器**: `ContentEvaluator.ts` (`evaluate()` 方法)
- **数据流动**:
  - `fs.promises.readFile(draftPath)` 被执行。
  - 文章被组装为 `LLMMessage`，通过类似于 `callLLM(evaluationPrompt)` 的底层链路请求质量评估。
  - **返回对象**: `{[key: score]: 85, [improvement]: "..."}` 等。
- **通信边界**: 如果分数低于设定阈值，它会直接中止后续流程，什么都不做，安静地结束本次 cron。

### 步骤 3：命运岔路口（Auto 还是 Review？）

这里是核心的 `AutoPublisher.publish(contentPath)` 逻辑。

- **核心组件**: `AutoPublisher.ts`

**【子分支 A：Auto 全自动发布】**

- **底层库**: `simple-git`
- **变量交换**:
  1. `git.add(contentPath)`：追踪文件变更。
  2. `git.commit(generateCommitMessage(contentPath))`：执行本地提交。该操作属于同步或微阻塞 I/O，不涉及网络通信。
  3. `git.push()` (如果配置了直接推远端)。
- **P2 遗漏点**: 该模式下，代码留了一处空的占位 `updateIndex()`。这意味着文件生成了，但如果前端有个全局搜索（依托 Algolia），搜索将搜不到这些幽灵产生的文章，除非重启构建生态。

**【子分支 B：Review 审查流】**

这一层级因为与第三方（GitHub）做了深刻的交互，异常链明显变长。

- **流转步骤**:
  1. **切分支**: `git.checkoutLocalBranch(newBranchName)`。机器自己创建了如 `agent-review-1234` 的分支。
  2. **锁定基础枝 (🔴 P2 风险)**: Agent 调用 `await git.revparse(['--abbrev-ref', 'HEAD'])` 取分支。如果此时你在本地开服做开发（你的 `HEAD` 在 `refactor/ugly-code`），它拉的 PR 将以你肮脏的分支为基础，而非 `main/master`。
  3. **提交与推送**: 在新分支 `add -> commit -> push`。
  4. **跨站 API 通信 (GitHub REST API)**: 
     - 构造了一个包含你环境变量配置的 `GITHUB_TOKEN` 的 HTTP `fetch`。
     - 终点：`https://api.github.com/repos/${owner}/${repo}/pulls`。
     - Request Body: `{ title: '[AI] Review Request...', head: newBranchName, base: baseBranch, body: '...' }`。

### 步骤 4：落幕释放与通知

- PR 创建完毕，或者 Auto 提交完成。
- （如果存在通知钩子）向 `Logger` หรือ可能的 `system.debug()` 端点抛出一个 `agent.published` 事件。

---

## 🛡️ 异常兜底与错误监控

1. **Git 冲突与失败兜底**
   - 依赖 `simple-git` 的内置 Promise 返回。所有执行通过 `try...catch` 被完整包裹。如果发生合并冲突，由于是新建分支，风险较低；但在 Auto 模式直接 commit 时，如果远端先于你更新，push 可能会被拒绝（Reject）。
   - **拦截**: 抛出 `Error: Failed to push to remote`。控制台吃掉异常，不至于导致 Node 服务全盘 crash，保证下一次 cron 继续触发（但必须靠人力检查为何 push 被阻挡）。
2. **GitHub API 失联/鉴权崩溃兜底**
   - 请求头无 Token 或 401 Unauthorized。
   - `fetch` 遇到 4XX/5XX 状态码 -> 触发 `throw new Error(...)`。
   - 这也是为什么在 `AgentRuntime` 日志机制外，仍旧需要 `StructuredLogger` 把堆栈打出来的部分，你无法在 UI 界面看到这块红字。

## 📝 系统级日志留痕

这是一场真正的闭门手术。

- `[AutoPublisher] Validating draft... Score: 92/100` -> 成功通过评价。
- `[AutoPublisher] Checkouting new branch agent/xyz...`  
- `[GitHub API] PR created successfully: URL`

由于其盲区特性，如果这些日志断层，你只能去 `.git/logs/HEAD` 里翻机器的作案轨迹了。

---
*“在阴影中写作的数字打字机，你要随时确认它的墨水（Token）和纸张（Branch）在正确的轨道上。如果可以，尽早把基础分支硬编码或剥离环境变量，别让它信赖漂浮不定的本地 HEAD。 —— Digital Evaluator”*
