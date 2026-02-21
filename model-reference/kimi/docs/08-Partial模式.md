# 08-Partial 模式

来源：https://platform.moonshot.cn/docs/api/partial

## 概述

Partial Mode（部分模式）允许通过**预填（Prefill）**部分模型回复来引导模型的输出。这可以帮助我们：
- 控制输出格式
- 引导输出内容
- 让模型在角色扮演场景中保持更好的一致性

## 使用方法

在最后一个 `role` 为 `assistant` 的 messages 条目中，增加 `"partial": True` 即可开启 partial mode。

> ⚠️ **注意**: 请勿混用 partial mode 和 `response_format=json_object`，否则可能会获得预期外的模型回复。

## 示例 1: JSON 格式控制

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.moonshot.cn/v1",
)

response = client.chat.completions.create(
    model="kimi-k2-turbo-preview",
    messages=[
        {
            "role": "system",
            "content": "你是一个助手，请用 JSON 格式回答"
        },
        {
            "role": "user",
            "content": "请介绍北京"
        },
        {
            "role": "assistant",
            "content": "{",           # 预填 JSON 开头
            "partial": True           # 开启 partial mode
        }
    ],
    temperature=0.6
)

# 注意：API 返回不包含预填的 leading_text，需要手动拼接
leading_text = "{"
full_response = leading_text + response.choices[0].message.content

print(full_response)
# 输出: {"city": "北京", "description": "..."}
```

## 示例 2: 角色扮演

```python
# 凯尔希医生角色扮演（明日方舟）
response = client.chat.completions.create(
    model="kimi-k2-turbo-preview",
    messages=[
        {
            "role": "system",
            "content": """你是凯尔希，罗德岛的医生。
你的特点是：
- 说话冷静、理性
- 经常以"博士"称呼对方
- 语气带有医学专业性

经典语录：
- "博士，你需要休息。"
- "这不在我的职责范围内，但我还是会帮你。"
- "你的身体状况我很清楚。"""
        },
        {
            "role": "user",
            "content": "凯尔希，我今天很累"
        },
        {
            "role": "assistant",
            "content": "博士，",      # 预填角色称呼
            "name": "凯尔希",         # 角色名（可选，帮助保持角色一致性）
            "partial": True
        }
    ],
    temperature=0.6
)

leading_text = "博士，"
full_response = leading_text + response.choices[0].message.content
print(full_response)
```

## 角色扮演最佳实践

1. **提供清晰的角色描述**
   - 个性、背景、特征
   - 说话语气、风格

2. **增加角色细节**
   - 背景故事和动机
   - 经典语录（可用 RAG 框架准备）

3. **指导特定情况的行动**
   - 特定用户输入下的反应
   - 配合 tool use 功能

4. **定期强化角色设定**
   - 长对话中定期提醒角色设定
   - 当模型偏离时及时纠正

## 注意事项

| 项目 | 说明 |
|:---|:---|
| 预填内容 | 不会出现在 API 返回中，需手动拼接 |
| JSON Mode | 与 `response_format=json_object` 不可混用 |
| name 字段 | 可选，帮助保持角色一致性 |
| partial 字段 | 必须放在最后一个 assistant message 中 |

## 完整示例：结构化输出

```python
def structured_output(prompt, schema_hint="{"):
    """使用 Partial Mode 强制 JSON 输出"""
    
    response = client.chat.completions.create(
        model="kimi-k2-turbo-preview",
        messages=[
            {
                "role": "system",
                "content": "你是一个助手，必须用 JSON 格式回答。"
            },
            {
                "role": "user",
                "content": prompt
            },
            {
                "role": "assistant",
                "content": schema_hint,
                "partial": True
            }
        ],
        temperature=0.3  # 低温度确保格式稳定
    )
    
    # 拼接完整响应
    full_json = schema_hint + response.choices[0].message.content
    
    import json
    return json.loads(full_json)

# 使用
result = structured_output(
    "提取人名和年龄：张三，28岁",
    '{"name": "'")
print(result)
```
