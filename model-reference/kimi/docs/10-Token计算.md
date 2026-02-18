# 10-Token 计算

来源：https://platform.moonshot.cn/docs/api/estimate

## 接口信息

```
POST https://api.moonshot.cn/v1/tokenizers/estimate-token-count
```

## 用途

计算请求（包括纯文本输入和视觉输入）的 Token 数量，帮助预估成本。

## 请求参数

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---:|:---|
| `model` | string | 是 | 模型 ID |
| `messages` | List[Dict] | 是 | 消息列表，格式与 Chat Completion 相同 |

## 纯文本 Token 计算

```python
import requests
import os

api_key = os.environ.get("MOONSHOT_API_KEY")
endpoint = "https://api.moonshot.cn/v1/tokenizers/estimate-token-count"

payload = {
    "model": "kimi-k2-turbo-preview",
    "messages": [
        {
            "role": "system",
            "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手。"
        },
        {
            "role": "user",
            "content": "你好，我叫李雷，1+1等于多少？"
        }
    ]
}

response = requests.post(
    endpoint,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    json=payload
)

result = response.json()
total_tokens = result["data"]["total_tokens"]
print(f"预估 Token 数: {total_tokens}")
```

## 视觉输入 Token 计算

```python
import base64

# 读取图片
image_path = "image.png"
with open(image_path, "rb") as f:
    image_data = f.read()

image_url = f"data:image/{image_path.split('.')[-1]};base64,{base64.b64encode(image_data).decode('utf-8')}"

payload = {
    "model": "kimi-k2.5",
    "messages": [
        {
            "role": "system",
            "content": "你是 Kimi。"
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": image_url}
                },
                {
                    "type": "text",
                    "text": "请描述图片的内容。"
                }
            ]
        }
    ]
}

response = requests.post(
    endpoint,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    json=payload
)

result = response.json()
print(f"预估 Token 数: {result['data']['total_tokens']}")
```

## 响应格式

```json
{
    "data": {
        "total_tokens": 80
    }
}
```

> 当没有 error 字段时，`data.total_tokens` 即为计算结果。

## 完整封装

```python
class TokenEstimator:
    def __init__(self, api_key):
        self.api_key = api_key
        self.endpoint = "https://api.moonshot.cn/v1/tokenizers/estimate-token-count"
    
    def estimate(self, model, messages):
        """
        估算 Token 数量
        
        Args:
            model: 模型 ID
            messages: 消息列表
        
        Returns:
            int: Token 数量
        """
        response = requests.post(
            self.endpoint,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages
            }
        )
        
        result = response.json()
        
        if "error" in result:
            raise Exception(f"Token 计算失败: {result['error']}")
        
        return result["data"]["total_tokens"]
    
    def estimate_chat(self, client, model, messages):
        """
        便捷的估算方法
        
        使用 OpenAI SDK 的 client 进行估算
        """
        # 使用 client 的 post 方法
        result = client.post(
            "/v1/tokenizers/estimate-token-count",
            cast_to=dict,
            body={
                "model": model,
                "messages": messages
            }
        )
        
        return result["data"]["total_tokens"]

# 使用
estimator = TokenEstimator(api_key="your-api-key")

# 估算简单对话
tokens = estimator.estimate(
    model="kimi-k2.5",
    messages=[{"role": "user", "content": "你好"}]
)
print(f"预估消耗: {tokens} tokens")

# 估算长文档
tokens = estimator.estimate(
    model="kimi-k2.5",
    messages=[{"role": "user", "content": long_document}]
)
print(f"长文档预估: {tokens} tokens")
print(f"是否超过 256K 限制: {tokens > 256000}")
```

## 成本估算

```python
# 模型价格（元/1M tokens）
PRICING = {
    "kimi-k2.5": {"input": 4.0, "output": 21.0},
    "kimi-k2-turbo-preview": {"input": 1.0, "output": 3.0},
    "moonshot-v1-8k": {"input": 0.6, "output": 0.6},
}

def estimate_cost(model, input_tokens, output_tokens=1000):
    """估算成本"""
    if model not in PRICING:
        return None
    
    price = PRICING[model]
    input_cost = (input_tokens / 1_000_000) * price["input"]
    output_cost = (output_tokens / 1_000_000) * price["output"]
    
    return {
        "input_cost": round(input_cost, 6),
        "output_cost": round(output_cost, 6),
        "total_cost": round(input_cost + output_cost, 6)
    }

# 示例
estimator = TokenEstimator(api_key="your-api-key")
input_tokens = estimator.estimate("kimi-k2.5", messages)
cost = estimate_cost("kimi-k2.5", input_tokens, output_tokens=2000)

print(f"输入 Token: {input_tokens}")
print(f"预估输入成本: ¥{cost['input_cost']}")
print(f"预估输出成本: ¥{cost['output_cost']}")
print(f"预估总成本: ¥{cost['total_cost']}")
```
