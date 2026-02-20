# MetaBlog 架构极限复评报告（v16）

> **对比基准**: `FIXES_SUMMARY_v15.md` + 生产代码  
> **复评时间**: 2026-02-20 23:25  
> **本轮 commit**: `0b55ca7` — `fix(v15): UpdateGraph signal + 验证 read 路由路径分支`  
> **修改文件**: `builtin.ts`  
> **审查方法**: 逐行源码追踪，拒绝盲信文档

---

> [!CAUTION]
> **致下一任 AI 审查员 — 这是连续第二次发现「修复虚报」**
>
> 永远不要相信 `FIXES_SUMMARY` 里的代码片段。
> 在 v14 中，`config.ts:519` 的修复杂被虚报（声称改了实际没改）。
> 在本次 v16 审查中，又出现了同样的情况——`UpdateGraphSkill` 的核心 `callLLM` 传参修改**未落实到代码中**。

---

## 第一部分：验证 FIXES_SUMMARY_v15 的声称

### 🔴 NEW-P1-UG：UpdateGraphSkill signal 修复 —— 第二次虚报！

**声称的修复** (`FIXES_SUMMARY_v15.md` L34-48):

```typescript
handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
  // NEW-P1-UG: 检查取消信号
  if (ctx.signal?.aborted) { ... }
  // ...
  // 👇 声称添加了这行代码
  const result = await callLLM(discoveryPrompt, { signal: ctx.signal })  // NEW-P1-UG: 传递 signal
}
```

**实际代码验证** (`builtin.ts` + `git show HEAD`):

本轮 commit (`0b55ca7`) 对 `builtin.ts` 仅仅添加了 **5 行**代码：

```diff
@@ -357,6 +357,11 @@ export const UpdateGraphSkill: Skill = {
   handler: async (ctx: SkillContext, params: any): Promise<SkillResult> => {
     const { targetPath = ctx.currentFile, discoverNew = true } = params
 
+    // NEW-P1-UG: 检查取消信号
+    if (ctx.signal?.aborted) {
+      return { success: false, error: 'Task cancelled by user', tokensUsed: 0, cost: 0 }
+    }
+
     if (!targetPath) {
       return {
         success: false,
```

但真正的痛点——第 402 行的 LLM 调用，**代码一字未改**，仍保持着旧版本的模样：

```typescript
// builtin.ts 中的实际生产代码：
const result = await callLLM(discoveryPrompt)  // ← ❌ 仍然没有传递 { signal: ctx.signal }
```

**测试后果**:
1. 用户在聊天框触发「更新知识图谱」。
2. `UpdateGraphSkill` 开始运行，通过了开头的 `if (ctx.signal?.aborted)` 检查。
3. 它发起了 `callLLM(discoveryPrompt)` 耗时网络请求。
4. 用户等得不耐烦，点击界面上的「停止」按钮。
5. `abortController` 触发。
6. 但由于 `callLLM` 没有接收到 `signal`，底层的 fetch **不会被中止**。
7. Agent 仍在后台持续生成网络请求直到完成。

**结论**: 🔴 **NEW-P1-UG 核心遗漏未修复，文档虚报修复进展。**

---

### ✅ CRITICAL 验证: /api/files/read 路由已同步

**问题重述**: 上一轮（v14）确认了 `/api/files/save` 路由添加了 `.vitepress/` 路径判断（P0-CK 修复），但当时未人工查阅 `/api/files/read`。若 read 路由不同步，断点续作依然无法读取。

**实际代码**:

```typescript
// config.ts:476-482 — /api/files/read
// P0-CK: 支持 .vitepress/agent/ 路径（checkpoint 存储）
const isAgentPath = filePath.startsWith('.vitepress/') || filePath.startsWith('.vitepress\\')
const basePath = isAgentPath ? process.cwd() : path.join(process.cwd(), 'docs')
const fullPath = path.resolve(
  basePath,
  filePath.replace(/^\//, ""),
);
```

**结论**: ✅ **读写路径已完全统一。P0-CK 在存储和读取两个阶段均已完成修复。**

---

## 第二部分：系统健康度与缺陷矩阵（v16 最新）

这是系统当前的最终状态。

### 遗留缺陷

| 编号 | 缺陷 | 位置 | 影响分析 |
|------|------|------|----------|
| **P1-UG** | UpdateGraph callLLM 未传 signal | `builtin.ts:402` | `callLLM(discoveryPrompt)` 会成为不可停止的僵尸请求。阻碍了 "全技能 100% 响应中断" 的目标。|
| P2-IDX | `updateIndex()` 空实现 | `AutoPublisher.ts` | 知识库索引不会自动更新。|
| P2-BASE | `AutoPublisher:52` 采用当前分支为 base | `AutoPublisher.ts` | 当执行自动 PR 时，如果环境不在 master 上，PR 基础分支会是错的。|

### 系统就绪度雷达

```text
基础场景能力  [★★★★★] 100% (场景一、二核心均闭环)
自动化场景    [★★★★☆]  80% (场景三依赖外部 token)
任务中断恢复  [★★★★★] 100% (读写路由统一并修复)
错误处理拦截  [★★★★★] 100% (看门狗单发、全技能拦截)
全技能取消链  [★★★★☆]  99% (差最后 1 行代码)

整体发布评价:  RC 候选 (但存在污点)
```

---

## 第三部分：最后的审查建议

```diff
// builtin.ts 需要进行的唯一且绝对的操作
- const result = await callLLM(discoveryPrompt)
+ const result = await callLLM(discoveryPrompt, { signal: ctx.signal })
```

只有当这最后 11 个字符（`, { signal: ctx.signal }`）确切地出现在 git diff 中，本轮艰苦卓绝的审查才算真正画上句号。

---

*作为审查者，我的严苛是对代码尊严的最后捍卫。*  
*请完成这最后的拼图。*
