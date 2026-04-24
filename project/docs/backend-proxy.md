# 后端代理层迁移计划

> 状态：计划阶段 | 优先级：P1（API Key 安全）
> 基于代码实际读取日期：2026-04-23

---

## 一、当前真实架构

### 1.1 LLM 调用链路（前端直连）

```
用户输入
  │
  ▼
┌─────────────────────────────────────────┐
│  src/theme/stores/chatStore.ts          │  ← 消息状态管理（Vue reactivity）
│  sendMessage()                          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  src/theme/api/services/aiService.ts    │  ← 1490行，核心中的核心
│  chatStreamInternal()                   │
│  ├─ fetch(https://api.deepseek.com/...) │  ← API Key 暴露！
│  ├─ getToolDefinitions()                │
│  ├─ smartTruncateMessages()             │
│  ├─ token 估算（js-tiktoken）            │
│  └─ 流式 SSE 解析 + 工具调用循环          │
└────────┬────────────────────────────────┘
         │
         ▼
    DeepSeek / Kimi API（公网）
```

### 1.2 API Key 暴露证据

文件：`src/theme/api/services/aiService.ts` 第 286~389 行

```ts
apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
```

`VITE_` 前缀的环境变量会被 Vite **打包进前端 bundle**。任何人打开浏览器 DevTools → Network → 查看请求头，或 Sources → 搜索 `sk-` 即可拿到完整 Key。

### 1.3 后端 `/api/chat` 现状

文件：`server/routes/agent-system.ts` 第 651~792 行

```ts
const llm: any = {
  chat: async () => ({ content: "Not Implemented" }),
  chatStream: async (opts: any, cb: any) => cb({ finishReason: "unsupported" }),
};
```

**已被注释掉，返回 `"Not Implemented"`**。前端根本不走这个接口。

### 1.4 会话/消息持久化

文件：`src/theme/api/services/chatStorage.ts`

| 功能 | 后端 API | 状态 |
|------|---------|------|
| 会话列表 | `GET /api/sessions` | ✅ 已实现 |
| 创建会话 | `POST /api/sessions` | ✅ 已实现 |
| 更新会话 | `PUT /api/sessions/:id` | ✅ 已实现 |
| 删除会话 | `DELETE /api/sessions/:id` | ✅ 已实现 |
| 获取消息 | `GET /api/sessions/:id/messages` | ✅ 已实现 |
| 保存消息 | `POST /api/sessions/:id/messages` | ✅ 已实现 |
| 批量保存 | `POST /api/sessions/:id/messages/batch` | ✅ 已实现 |

**结论**：会话/消息的持久化存储**已经**在后端。前端只是维护了一个内存中的 Vue reactive 缓存层。

---

## 二、迁移目标

| # | 目标 | 当前位置 | 目标位置 | 优先级 |
|---|------|---------|---------|--------|
| 1 | **隐藏 API Key** | 前端 bundle | 后端环境变量 | 🔴 P0 |
| 2 | Token 估算显示 | `src/theme/utils/tokenEstimator.ts` | 后端代理层计算 | 🟡 P1 |
| 3 | 消息/会话状态管理 | 前端 reactive + 后端 API | 保持现状即可（已后端化） | 🟢 无需改动 |
| 4 | 流式响应代理 | 前端直连 LLM | 后端 SSE 透传 | 🟡 P1 |

---

## 三、技术方案

### 3.1 目标架构

```
用户输入
  │
  ▼
┌─────────────────────────────────────────┐
│  前端（保持不变）                         │
│  ├─ chatStore.ts（消息状态、UI 回调）      │
│  ├─ ChatLayout.vue（流式渲染、版本管理）   │
│  └─ 工具执行（executeToolWithRecord）     │
└────────┬────────────────────────────────┘
         │ fetch('/api/chat')
         ▼
┌─────────────────────────────────────────┐
│  后端 BFF（Vite 中间件）                  │
│  server/routes/chat.ts（新建）            │
│  ├─ 从 process.env 读取 API Key           │
│  ├─ Token 估算（js-tiktoken）             │
│  ├─ 智能消息截断                         │
│  ├─ 调用 LLM API（带真实 Key）            │
│  ├─ SSE 透传 + token_estimate 事件注入    │
│  └─ 审计日志（.logs/chat/）               │
└────────┬────────────────────────────────┘
         │
         ▼
    DeepSeek / Kimi API
```

### 3.2 后端 `/api/chat` 协议设计

**请求体**：
```ts
{
  messages: any[]           // OpenAI 风格消息数组
  config: SessionConfig     // model, temperature, maxTokens, systemPrompt...
  stream?: boolean          // 默认 true
  sessionId?: string        // 用于审计日志
  toolContext?: {...}       // agentId, availableTools, availableSkills...
  tools?: any[]             // 工具定义（前端传入，后端透传）
}
```

**流式 SSE 响应格式**：
```
// 1. 后端注入：输入 token 估算
data: {"token_estimate":{"input":1234}}

// 2. 透传 LLM 原始 SSE（透明代理）
data: {"choices":[{"delta":{"content":"你好"}}]}
data: {"choices":[{"delta":{"content":"！"}}]}
data: {"choices":[{"delta":{"reasoning_content":"让我思考..."}}]}
data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":1234,"completion_tokens":56,"total_tokens":1290}}

// 3. 结束
data: [DONE]
```

**非流式响应格式**：
```ts
{
  success: true,
  data: { choices: [...], usage: {...} },  // LLM 原始响应
  meta: { tokenEstimate: { input: 1234 } }
}
```

### 3.3 API Key 环境变量迁移

| 变量 | 当前（前端） | 迁移后（后端） | 兼容性 |
|------|------------|--------------|--------|
| DeepSeek | `VITE_DEEPSEEK_API_KEY` | `LLM_DEEPSEEK_API_KEY` | 后端同时读取 `LLM_` 和 `VITE_` 前缀，过渡期兼容 |
| Kimi | `VITE_KIMI_API_KEY` | `LLM_KIMI_API_KEY` | 同上 |

操作步骤：
1. 在 `.env` 文件中新增 `LLM_DEEPSEEK_API_KEY` 和 `LLM_KIMI_API_KEY`
2. 删除 `.env` 中的 `VITE_DEEPSEEK_API_KEY` 和 `VITE_KIMI_API_KEY`
3. 重新构建前端（确保旧 Key 不再被打包）

---

## 四、需要改动的文件

### 4.1 新建文件

| 文件 | 说明 |
|------|------|
| `server/routes/chat.ts` | 后端 LLM 代理路由（~400行） |

### 4.2 修改文件

| 文件 | 改动范围 | 说明 |
|------|---------|------|
| `server/vitepress-integration.ts` | +2 行 import | 注册 `registerChatRoutes` |
| `server/routes/agent-system.ts` | -~150 行 | 删除旧的 `/api/chat` 代码 |
| `src/theme/api/services/aiService.ts` | ~100 行 | `chatStreamInternal` / `chatNonStream` 改为调用 `/api/chat` |
| `src/theme/api/services/aiService.ts` | +5 行 | `StreamCallbacks` 接口新增 `onTokenEstimate` |
| `src/theme/stores/chatStore.ts` | +10 行 | `sendMessage` 中新增 `onTokenEstimate` 回调处理 |
| `src/theme/api/config.ts` | 0 行 | 无需改动，`CHAT: '/api/chat'` 端点已定义 |

### 4.3 无需改动的文件

| 文件 | 原因 |
|------|------|
| `src/theme/api/services/chatStorage.ts` | 会话/消息 API 已经是后端持久化 |
| `src/theme/api/services/storage.ts` | 同上 |
| `src/theme/components/ai-chat/*.vue` | UI 渲染层完全不受影响 |
| `src/theme/composables/useChat.ts` | 只依赖 chatStore，接口不变 |

---

## 五、关键代码改动点（详细）

### 5.1 后端 `server/routes/chat.ts` 核心逻辑

```ts
// 模型配置（从后端环境变量读取）
const MODEL_CONFIGS = {
  'deepseek-chat': {
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: process.env.LLM_DEEPSEEK_API_KEY || process.env.VITE_DEEPSEEK_API_KEY || ''
  },
  // ... 其他模型
}

// Token 估算（复用 js-tiktoken）
function estimateChatTokens(messages) { ... }

// 智能截断（复用前端 smartTruncateMessages 逻辑）
function smartTruncateMessages(messages, modelConfig, systemPrompt) { ... }

// SSE 代理
async function proxyStream(reqBody, res) {
  const llmRes = await fetch(`${baseURL}/chat/completions`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(reqBody)
  })
  
  // 注入 token 估算事件
  res.write(`data: ${JSON.stringify({token_estimate:{input}})}\n\n`)
  
  // 透传 LLM SSE
  const reader = llmRes.body.getReader()
  // ... 逐行转发
}
```

### 5.2 前端 `aiService.ts` 改动

`chatStreamInternal` 中：
- URL 从 `${modelConfig.baseURL}/chat/completions` 改为 `/api/chat`
- 不再传 `Authorization` header
- `requestBody` 改为 `{ messages, config, stream, sessionId, toolContext, tools }`
- SSE 解析增加 `if (chunk.token_estimate) callbacks.onTokenEstimate?.(chunk.token_estimate)`

### 5.3 前端 `chatStore.ts` 改动

`sendMessage` 的 callbacks 中增加：
```ts
onTokenEstimate: (estimate) => {
  tokenUsageMap.value[sessionId] = {
    ...existingUsage,
    estimatedInput: estimate.input,
    lastUpdated: Date.now()
  }
}
```

---

## 六、实施步骤

```
Step 1: 新建 server/routes/chat.ts（后端代理层）
        └─ 包含：模型配置、token估算、智能截断、SSE代理、审计日志

Step 2: 修改 server/vitepress-integration.ts
        └─ import 并注册 registerChatRoutes

Step 3: 删除 server/routes/agent-system.ts 中旧的 /api/chat 代码
        └─ 避免路由冲突

Step 4: 修改前端 aiService.ts
        └─ chatStreamInternal 改调 /api/chat
        └─ chatNonStream 改调 /api/chat
        └─ StreamCallbacks 增加 onTokenEstimate

Step 5: 修改前端 chatStore.ts
        └─ sendMessage / regenerateResponse 中增加 onTokenEstimate 回调

Step 6: 环境变量迁移
        └─ .env 中新增 LLM_DEEPSEEK_API_KEY、LLM_KIMI_API_KEY
        └─ 删除 VITE_DEEPSEEK_API_KEY、VITE_KIMI_API_KEY

Step 7: 测试验证
        └─ 确认前端 bundle 中不再包含 API Key
        └─ 确认流式输出正常
        └─ 确认工具调用循环正常
        └─ 确认 Token 用量条显示正常
        └─ 确认会话/消息持久化正常
```

---

## 七、风险与回滚

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 后端 SSE 代理增加延迟 | 流式响应慢 50~100ms | 后端与前端同机部署，延迟可忽略 |
| 工具调用循环多了一跳 | 每轮 tool call 增加一次 HTTP 往返 | 当前前端也是每轮重新 fetch LLM，行为一致 |
| 环境变量配错导致服务不可用 | 聊天功能完全失效 | 后端同时读取 `LLM_` 和 `VITE_` 前缀，双保险 |
| 多模态图片传输问题 | 图片过大导致后端内存溢出 | 后端图片大小限制（如 5MB），超大图拒绝或压缩 |
| 构建后测试发现 Key 仍在 bundle | 安全漏洞未修复 | 构建后用 `grep -r "sk-" dist/` 检查 |

**回滚策略**：
- 前端 `aiService.ts` 保留旧代码注释（或 git revert）
- 后端 `/api/chat` 是新增路由，移除 `registerChatRoutes` 即可恢复旧状态

---

## 八、当前系统的真实状态速查

基于代码实际读取：

| 模块 | 状态 | 备注 |
|------|------|------|
| 文档站 VitePress | ✅ 可用 | 内容充实，CS336 + RL 系列笔记完整 |
| AI 聊天前端 | ✅ 完整 | 1490 行 aiService，功能齐全 |
| AI 聊天后端 | ❌ 被注释 | `/api/chat` 返回 "Not Implemented" |
| 会话持久化 | ✅ 已实现 | `sessions.json` 在后端 `.data/` |
| 消息持久化 | ✅ 已实现 | `session-messages.json` 在后端 `.data/` |
| 工具系统 | ✅ 完整 | 13 类工具，定义 + 执行器齐全 |
| 技能系统 | ✅ 完整 | 16 个 Skill，SKILL.md 规范 |
| Agent Runtime | ⚠️ 框架 | 有状态管理，执行逻辑是模拟的 |
| 任务调度 | ⚠️ 框架 | 有队列管理，执行是 sleep 模拟 |
| MCP 集成 | ⚠️ 配置 | `mcp-servers.json` 有配置，连接逻辑存疑 |

---

## 九、一句话总结

> **把 `src/theme/api/services/aiService.ts` 中直接 fetch LLM API 的 ~200 行代码搬到后端 `server/routes/chat.ts`，让 API Key 留在服务器，前端只负责 UI。**
