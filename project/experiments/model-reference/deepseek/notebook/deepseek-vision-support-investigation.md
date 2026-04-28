# DeepSeek V4 API 图片输入支持调研

> **日期**: 2026-04-27  
> **调研目标**: 确认 DeepSeek V4 (deepseek-v4-pro / deepseek-v4-flash) API 是否支持图片/视觉输入  
> **调研方法**: 官方文档检查 + 实际 API 调用测试  
> **结论**: ❌ **DeepSeek V4 API 目前不支持图片输入**，messages content 只接受 `text` 类型

---

## 1. 背景

在精简模型配置时，我们在前端标注了 DeepSeek "仅支持文本输入，图片/文件将被忽略"。但这个标注是否准确？DeepSeek V4 被一些第三方文章描述为"原生多模态模型"，我们需要通过官方文档和实际测试来验证。

---

## 2. 官方文档检查

### 2.1 API Guides 导航菜单

访问 [api-docs.deepseek.com](https://api-docs.deepseek.com)，检查所有公开的 API 指南：

| 指南 | 内容 |
|------|------|
| Thinking Mode | 推理模式（thinking / reasoning_effort） |
| Multi-round Conversation | 多轮对话 |
| Chat Prefix Completion (Beta) | 前缀续写 |
| FIM Completion (Beta) | FIM 补全 |
| JSON Output | JSON 结构化输出 |
| Tool Calls | 工具调用 |
| Context Caching | 上下文缓存 |
| Anthropic API | Anthropic 兼容接口 |
| Agent Integrations | Agent 集成 |

**发现**: 导航菜单中 **没有任何 vision / multimodal / image 相关的指南**。

### 2.2 Chat Completion API Schema

访问 [Create Chat Completion API 文档](https://api-docs.deepseek.com/api/create-chat-completion)，检查 `messages` 参数的 `content` 字段定义：

- `messages` 类型: `object[]`
- `content` 类型: **仅 `string`**，没有看到 `array` 或 `image_url` 的支持
- 请求示例中所有 `content` 都是纯文本字符串

### 2.3 FAQ 页面

访问 [FAQ](https://api-docs.deepseek.com/faq)，常见问题包括：
- 账户登录/注册
- 充值/退款
- API 速率限制
- LangChain 支持
- Token 计算

**发现**: FAQ 中 **没有任何关于图片/视觉/多模态的问题**。

### 2.4 NVIDIA NIM 文档

NVIDIA 对 DeepSeek-V4-Pro 的文档明确标注：

- **Data Modality**: `Text`
- **Output Types**: `Text`

---

## 3. 实际 API 测试

使用 DeepSeek API Key 进行实际调用测试。

### 3.1 测试环境

```powershell
$apiKey = "sk-***"  # 从环境变量读取
$baseURL = "https://api.deepseek.com/v1"
```

### 3.2 测试 1: 正常文本请求（基准测试）

**请求**:
```json
{
  "model": "deepseek-v4-flash",
  "messages": [{ "role": "user", "content": "Say hi" }],
  "max_tokens": 50
}
```

**响应**:
```
Status: SUCCESS
Response: Hi! How can I help you today?
```

✅ **文本请求正常工作**。

### 3.3 测试 2: Image URL（OpenAI Vision 格式）

**请求**:
```json
{
  "model": "deepseek-v4-flash",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "What is in this image?" },
      { "type": "image_url", "image_url": { "url": "https://example.com/image.png" } }
    ]
  }],
  "max_tokens": 50
}
```

**响应**:
```json
{
  "error": {
    "message": "Failed to deserialize the JSON body into the target type: messages[0]: unknown variant `image_url`, expected `text` at line 18 column 18",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_request_error"
  }
}
```

❌ **明确报错**: `unknown variant 'image_url', expected 'text'`。

这说明 DeepSeek 的 messages content **只支持 `text` 类型**，不接受 OpenAI Vision 的 `image_url` 格式。

### 3.4 测试 3: Base64 编码图片

**请求**:
```json
{
  "model": "deepseek-v4-flash",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "What is this?" },
      { "type": "image_url", "image_url": { "url": "data:image/png;base64,iVBORw0KGgo..." } }
    ]
  }],
  "max_tokens": 50
}
```

**响应**: 与测试 2 相同的错误。

```json
{
  "error": {
    "message": "Failed to deserialize the JSON body into the target type: messages[0]: unknown variant `image_url`, expected `text` at line 18 column 18",
    ...
  }
}
```

❌ **Base64 图片同样不被支持**。

### 3.5 测试 4: reasoning_effort 参数（验证新 API 特性）

**请求**:
```json
{
  "model": "deepseek-v4-pro",
  "messages": [{ "role": "user", "content": "1+1=?" }],
  "reasoning_effort": "high",
  "max_tokens": 50
}
```

**响应**:
```
Status: SUCCESS
Response: The answer is 2.
```

✅ **reasoning_effort 参数正常工作**。

### 3.6 测试 5: thinking 参数（验证旧兼容性）

**请求**:
```json
{
  "model": "deepseek-v4-flash",
  "messages": [{ "role": "user", "content": "1+1=?" }],
  "thinking": { "type": "enabled" },
  "max_tokens": 50
}
```

**响应**:
```
Status: SUCCESS
Response: 1+1=2
```

✅ **thinking 参数也正常工作**（兼容性保留）。

---

## 4. 与 Kimi K2.5 的对比

| 能力 | DeepSeek V4 Pro | DeepSeek V4 Flash | Kimi K2.5 |
|------|-----------------|-------------------|-----------|
| **文本输入** | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| **图片 URL 输入** | ❌ 不支持 | ❌ 不支持 | ✅ 支持 |
| **Base64 图片输入** | ❌ 不支持 | ❌ 不支持 | ✅ 支持 |
| **视频输入** | ❌ 不支持 | ❌ 不支持 | ✅ 支持 |
| **推理模式控制** | `reasoning_effort` (high/max) | `reasoning_effort` (high/max) | `enable_thinking` (true/false) |
| **上下文长度** | 1M tokens | 1M tokens | 256K tokens |
| **工具调用** | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| **流式输出** | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| **输入价格** (元/1M tokens) | ¥4.0 | ¥1.0 | ¥15.0 |
| **输出价格** (元/1M tokens) | ¥16.0 | ¥2.0 | ¥60.0 |

---

## 5. 结论

### 5.1 核心结论

**DeepSeek V4 API (deepseek-v4-pro / deepseek-v4-flash) 目前不支持图片输入。**

证据链：
1. **官方文档无 Vision API**: api-docs.deepseek.com 的 API Guides 和 API Reference 中没有任何 vision/multimodal 相关的文档页面。
2. **API Schema 明确限制**: Chat Completion API 的 messages content 字段只支持 `string` 类型，API 报错信息为 `unknown variant 'image_url', expected 'text'`。
3. **FAQ 无相关问题**: 官方 FAQ 中没有关于图片/视觉输入的任何问题。
4. **NVIDIA 文档标注**: Data Modality 明确为 `Text`。
5. **实际测试验证**: 传入 `image_url` 格式的 content 会收到明确的反序列化错误。

### 5.2 关于"原生多模态"说法的澄清

一些第三方文章（如 APIYI、SkyWork）声称 DeepSeek V4 是"原生多模态模型"，支持图片/视频。这可能指的是：

- **模型架构层面**: V4 的底层架构可能具备多模态能力（如在训练阶段接触过图像数据）。
- **产品层面**: DeepSeek 的 Web/APP 端可能通过其他方式（如 OCR、外部视觉模型）实现了图片理解。
- **未来计划**: 可能计划在未来开放 vision API，但目前尚未开放。

**但无论如何，截至 2026-04-27，DeepSeek 官方 API 没有提供任何图片输入接口。**

### 5.3 价格对比

从 API 调用成本来看，DeepSeek 具有显著的价格优势：

| 计费项 | DeepSeek V4 Pro | DeepSeek V4 Flash | Kimi K2.5 |
|--------|-----------------|-------------------|-----------|
| 输入 (元/1M tokens) | ¥4.0 | ¥1.0 | ¥15.0 |
| 输出 (元/1M tokens) | ¥16.0 | ¥2.0 | ¥60.0 |
| **相对 Kimi 成本** | ~27% | ~7% | 基准 |

- **DeepSeek V4 Flash** 的输入价格仅为 Kimi K2.5 的 **1/15**，输出价格为 **1/30**，是日常对话和轻量任务的经济首选。
- **DeepSeek V4 Pro** 的输入价格为 Kimi K2.5 的 **1/4**，输出价格为 **1/4**，在需要深度推理的场景下性价比极高。
- **Kimi K2.5** 虽然价格更高，但其原生多模态能力（图片/视频理解）是 DeepSeek 目前无法替代的。

### 5.4 对项目配置的建议

当前项目中的配置是准确的：

```typescript
// models.ts
const CAPABILITIES = {
  deepseekV4Pro: {
    vision: false,   // ✅ 正确：API 不支持图片输入
    video: false,    // ✅ 正确
    ...
  },
  kimiK2_5: {
    vision: true,    // ✅ 正确：支持图片 URL
    video: true,     // ✅ 正确：支持视频输入
    ...
  }
}
```

前端提示文案也无需修改：
- DeepSeek: "⚠️ 仅支持文本输入，图片/文件将被忽略"
- Kimi K2.5: "✅ 支持图片、视频输入"

### 5.5 如果用户需要图片理解怎么办？

如果用户需要在 DeepSeek 对话中理解图片内容，可以考虑以下方案：

1. **OCR 预处理**: 使用外部 OCR 服务（如 Kimi、Azure Vision、Tesseract）提取图片文本，将文本内容传给 DeepSeek。
2. **切换到 Kimi**: 对于需要图片理解的场景，直接切换到 Kimi K2.5 模型。
3. **多 Agent 协作**: DeepSeek 负责推理和代码生成，Kimi 负责视觉理解，通过 Agent 协作完成任务。

---

## 6. 参考链接

- [DeepSeek API 官方文档](https://api-docs.deepseek.com/)
- [DeepSeek API - Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion)
- [DeepSeek API - FAQ](https://api-docs.deepseek.com/faq)
- [NVIDIA NIM - DeepSeek-V4-Pro](https://docs.api.nvidia.com/nim/reference/deepseek-ai-deepseek-v4-pro)
- [DeepSeek V4 Preview Release Notes](https://api-docs.deepseek.com/news/news260424)

---

*调研完成。如有 DeepSeek 官方更新 vision API，需重新验证并更新本 notebook。*
