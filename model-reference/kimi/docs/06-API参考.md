# 06-API 参考

来源：https://platform.moonshot.cn/docs/api/chat

## 基本信息

- **Base URL**: `https://api.moonshot.cn/v1`
- **协议**: HTTP/HTTPS
- **SDK**: 兼容 OpenAI SDK (Python >= 3.7.1, Node.js >= 18)

## 认证

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",  # 从平台创建的 API Key
    base_url="https://api.moonshot.cn/v1",
)
```

## Chat Completions API

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `model` | string | 是 | 模型ID，如 `kimi-k2.5` |
| `messages` | array | 是 | 消息列表 |
| `temperature` | float | 否 | 采样温度，默认 0.6 |
| `top_p` | float | 否 | 核采样 |
| `max_tokens` | integer | 否 | 最大生成token数 |
| `stream` | boolean | 否 | 是否流式输出 |
| `tools` | array | 否 | 工具列表 |
| `tool_choice` | string/object | 否 | 工具选择策略 |

### messages 格式

#### 简单文本
```python
messages = [
    {"role": "system", "content": "你是 Kimi"},
    {"role": "user", "content": "你好"}
]
```

#### 复杂内容（List[Dict]）
```python
# 纯文本
{"type": "text", "text": "你好"}

# 图片
{"type": "image_url", "image_url": {"url": "data:image/png;base64,abc123..."}}

# 视频
{"type": "video_url", "video_url": {"url": "data:video/mp4;base64,def456..."}}

# 混合内容
messages = [{
    "role": "user",
    "content": [
        {"type": "text", "text": "这是什么？"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
    ]
}]
```

### content 字段支持的格式

```python
# 1. 普通字符串
"你好"

# 2. List[Dict] - 纯文本
[{"type": "text", "text": "你好"}]

# 3. List[Dict] - 图片
[{"type": "image_url", "image_url": {"url": "data:image/png;base64,abc123..."}}]

# 4. List[Dict] - 视频
[{"type": "video_url", "video_url": {"url": "data:video/mp4;base64,def456..."}}]

# 5. List[Dict] - 图文混合
[
    {"type": "text", "text": "这是什么？"},
    {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
]
```

### 图片/视频 URL 格式

支持两种格式：
1. **Base64**: `data:image/png;base64,...`
2. **文件ID**: `ms://<file_id>`（通过文件上传接口获取）

## 响应格式

### 非流式响应

```json
{
  "id": "chatcmpl-xxxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "kimi-k2.5",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "回答内容",
      "reasoning_content": "思考过程"  // 仅思考模型
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### 流式响应

```json
// 思考内容
{"choices": [{"delta": {"reasoning_content": "思考..."}}]}

// 正式内容
{"choices": [{"delta": {"content": "回答..."}}]}

// 工具调用
{"choices": [{"delta": {"tool_calls": [...]}}]}
```

## 错误处理

### 常见错误码

| HTTP 状态码 | 说明 |
|:---|:---|
| 400 | 请求参数错误 |
| 401 | 认证失败，API Key 无效 |
| 429 | 请求过于频繁，超出速率限制 |
| 500 | 服务器内部错误 |
| 503 | 服务暂时不可用 |

### 错误响应示例

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "authentication_error",
    "code": "invalid_api_key"
  }
}
```

### Python 错误处理

```python
from openai import OpenAI, AuthenticationError, RateLimitError, APIError

client = OpenAI(api_key="your-api-key", base_url="https://api.moonshot.cn/v1")

try:
    response = client.chat.completions.create(
        model="kimi-k2.5",
        messages=[{"role": "user", "content": "你好"}]
    )
except AuthenticationError as e:
    print(f"认证失败: {e}")
except RateLimitError as e:
    print(f"请求过于频繁: {e}")
except APIError as e:
    print(f"API 错误: {e}")
except Exception as e:
    print(f"其他错误: {e}")
```

## 模型列表

| 模型 | 上下文 | 说明 |
|:---|:---:|:---|
| `kimi-k2.5` | 256K | 多模态+思考 |
| `kimi-k2-0905-Preview` | 256K | K2 预览版 |
| `kimi-k2-turbo-preview` | 256K | K2 高速版 |
| `kimi-k2-thinking` | 256K | K2 思考版 |
| `kimi-k2-thinking-turbo` | 256K | K2 思考高速版 |
| `moonshot-v1-8k` | 8K | 轻量版 |
| `moonshot-v1-32k` | 32K | 标准版 |
| `moonshot-v1-128k` | 128K | 长上下文版 |
| `moonshot-v1-8k-vision-preview` | 8K | 视觉预览版 |

## Token 计算

```python
# 使用 /v1/tokenize 接口
response = client.post(
    "/v1/tokenize",
    json={
        "model": "kimi-k2.5",
        "messages": messages
    }
)

tokens = response["data"]["total_tokens"]
print(f"Token 数: {tokens}")
```

## 注意事项

1. **Python 版本**: >= 3.7.1
2. **OpenAI SDK**: >= 1.0.0
3. **message.content**: 可以是 string 或 List[Dict]
4. **思考模型**: 使用 `getattr()` 获取 `reasoning_content`
5. **流式输出**: `reasoning_content` 一定先于 `content` 出现
