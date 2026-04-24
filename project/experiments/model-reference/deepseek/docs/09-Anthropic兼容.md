# 13-Anthropic API 兼容

来源：https://api-docs.deepseek.com/zh-cn/guides/anthropic_api

## 概述

DeepSeek API 支持 Anthropic API 格式，可以接入 Anthropic 生态，如 Claude Code。

## Base URL

```
https://api.deepseek.com/anthropic
```

## 接入 Claude Code

### 1. 安装 Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. 配置环境变量

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_AUTH_TOKEN=${DEEPSEEK_API_KEY}
export API_TIMEOUT_MS=600000  # 10分钟超时，防止输出过长
export ANTHROPIC_MODEL=deepseek-chat
export ANTHROPIC_SMALL_FAST_MODEL=deepseek-chat
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

### 3. 使用

进入项目目录，执行：

```bash
claude
```

## 通过 Anthropic SDK 调用

### 1. 安装 SDK

```bash
pip install anthropic
```

### 2. 配置环境变量

```bash
export ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
export ANTHROPIC_API_KEY=${DEEPSEEK_API_KEY}
```

### 3. 调用代码

```python
import anthropic

client = anthropic.Anthropic()

message = client.messages.create(
    model="deepseek-chat",
    max_tokens=1000,
    system="You are a helpful assistant.",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Hi, how are you?"
                }
            ]
        }
    ]
)

print(message.content)
```

> **注意**: 传入不支持的模型名时，API 会自动映射到 `deepseek-chat`。

## API 兼容性对照表

### 简单字段

| Field | 支持状态 |
|:---|:---:|
| model | 使用 DeepSeek 模型 |
| max_tokens | ✅ 完全支持 |
| stop_sequences | ✅ 完全支持 |
| stream | ✅ 完全支持 |
| system | ✅ 完全支持 |
| temperature | ✅ 完全支持 (0.0 ~ 2.0) |
| thinking | ✅ 支持 (budget_tokens 被忽略) |
| top_p | ✅ 完全支持 |
| top_k | ❌ 忽略 |
| container | ❌ 忽略 |
| mcp_servers | ❌ 忽略 |
| metadata | ❌ 忽略 |
| service_tier | ❌ 忽略 |

### 消息字段

| Field | Variant | 支持状态 |
|:---|:---|:---:|
| content | string | ✅ 完全支持 |
| | array, type="text" | ✅ 完全支持 |
| | array, type="image" | ❌ 不支持 |
| | array, type="document" | ❌ 不支持 |
| | array, type="thinking" | ✅ 支持 |
| | array, type="tool_use" | ✅ 完全支持 |
| | array, type="tool_result" | ✅ 完全支持 |

### 工具字段

| Field | 支持状态 |
|:---|:---:|
| name | ✅ 完全支持 |
| input_schema | ✅ 完全支持 |
| description | ✅ 完全支持 |
| cache_control | ❌ 忽略 |

### Tool Choice

| Value | 支持状态 |
|:---|:---:|
| none | ✅ 完全支持 |
| auto | ✅ 支持 (disable_parallel_tool_use 被忽略) |
| any | ✅ 支持 (disable_parallel_tool_use 被忽略) |
| tool | ✅ 支持 (disable_parallel_tool_use 被忽略) |

## 完整示例

```python
import anthropic
import os

client = anthropic.Anthropic(
    api_key=os.environ.get("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com/anthropic"
)

# 简单对话
message = client.messages.create(
    model="deepseek-chat",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(message.content)

# 带 system prompt
message = client.messages.create(
    model="deepseek-chat",
    max_tokens=1024,
    system="You are a helpful coding assistant.",
    messages=[
        {"role": "user", "content": "Write a quick sort in Python"}
    ]
)
print(message.content)

# 流式输出
with client.messages.stream(
    model="deepseek-chat",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Tell me a story"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```
