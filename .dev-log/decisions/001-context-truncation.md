# ADR-001: 上下文截断策略从硬编码到模型感知

## 状态
已通过 ✅

## 上下文

2026-04-18 用户质疑：`truncateMessages(..., 6000)` 在 256k 上下文时代是否太短？

当时状况：
- `aiService.ts` 中硬编码截断 6000 字符
- `messages.slice(-10)` 硬编码只保留最近 10 条消息
- `ModelConfig` 没有 `contextWindow` 字段
- 截断标记只是 `... [内容已截断]`，AI 不知道自己被截断了
- 工具层面无限制，`get_article_content` 一次返回全文

## 决策

采用**三级智能截断 + 工具源头控制 + 续读感知**策略。

### 1. 三级智能截断（`smartTruncateMessages`）

```
Level 1: 预算内不截
  → 估算总 token，没超预算原样返回（90%情况不走截断）

Level 2: 截 tool 结果
  → 按模型上下文分级：256k→48k, 128k→24k, 64k→12k, 短模型→4k
  → 保底 3000 字符

Level 3: 丢弃早期消息
  → 优先丢弃最早 tool 结果，其次 assistant 消息
  → 保留最近 6 条作为底线
```

### 2. 工具源头控制

每个可能返回长内容的工具增加 `max_length` 参数：
- `get_article_content`：默认 8000，支持 `start_line`/`end_line` 分段
- `fetch_url`：默认 15000
- `read_file`：默认 8000
- `github_get_file_content`：默认 5000

### 3. 续读感知标记

截断时不再只显示"..."，而是：
```
---
[内容已截断] 原长 X 字符，当前限制 Y 字符。
如需继续阅读，请调用 xxx(start_line=xxx / max_length=xxx)
```

让 AI 知道自己被截断了，能主动发起第二轮工具调用续读。

## 后果

### 正面
- 长文章/网页不再"读一半就瞎"
- 多轮对话历史保留更完整（不再硬 slice(-10)）
- 大模型（Kimi 256k）的上下文优势真正发挥
- Agent 可以自主续读，不需要用户手动干预

### 负面
- 截断标记文字占用额外 token（约 50-100 token/条）
- 工具参数变多，AI 调用时需要多考虑一个 `max_length`
- Token 估算（字符/3）不够精确，可能偶尔误判

### 风险
- 如果新模型没配 `contextWindow`，会抛异常（已做防御）
- 极端长内容（如 10MB 网页）即使截断到 48k 还是可能超预算（需后续源头控制）

## 替代方案

| 方案 | 放弃原因 |
|------|---------|
| 全部不截，让 API 报错 | 用户体验差，请求会直接炸 |
| 固定 128k 截断上限 | 无视模型差异，8k 模型会崩溃 |
| LLM 摘要压缩历史（Claude Code Tier 2） | 实现复杂，需要额外 LLM 调用和成本 |

## 参考

- Claude Code Context Compaction: https://github.com/anthropics/claude-code
- OpenAI Codex truncation: https://github.com/openai/codex/issues/6426
- Cline Smart Truncation: https://cline.bot/blog/understanding-the-new-context-window-progress-bar-in-cline

## 相关提交

- 待用户 review 后提交
- 修改文件：8 个（详见 session-2026-04-18-part2.md）
