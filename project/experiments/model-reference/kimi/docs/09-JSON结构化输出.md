# 09-JSON 结构化输出

## 概述

JSON 模式(JSON Mode)确保模型输出有效的 JSON 格式，适用于需要结构化数据的场景，如 API 响应、数据提取、配置生成等。

## 基础 JSON 模式

```python
from openai import OpenAI
import json

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.moonshot.cn/v1",
)

response = client.chat.completions.create(
    model="kimi-k2-turbo-preview",
    messages=[
        {
            "role": "system",
            "content": "You are a helpful assistant that outputs JSON."
        },
        {
            "role": "user",
            "content": """
            提取以下信息的结构化数据：
            张三，28岁，软件工程师，爱好篮球和编程
            
            请输出以下格式的 JSON：
            {
                "name": "姓名",
                "age": 年龄,
                "occupation": "职业",
                "hobbies": ["爱好1", "爱好2"]
            }
            """
        }
    ],
    response_format={"type": "json_object"},
)

# 解析 JSON 输出
json_output = response.choices[0].message.content
data = json.loads(json_output)

print(json.dumps(data, indent=2, ensure_ascii=False))
```

## 数据提取示例

```python
from openai import OpenAI
import json

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.moonshot.cn/v1",
)

def extract_entities(text: str) -> dict:
    """从文本中提取命名实体"""
    response = client.chat.completions.create(
        model="kimi-k2-turbo-preview",
        messages=[
            {
                "role": "system",
                "content": """你是一个命名实体识别助手。从文本中提取人名、地名、组织名，
                并以 JSON 格式输出，格式如下：
                {
                    "persons": ["人名1", "人名2"],
                    "locations": ["地名1", "地名2"],
                    "organizations": ["组织1", "组织2"]
                }
                如果没有某类实体，使用空数组。"""
            },
            {
                "role": "user",
                "content": f"文本：{text}"
            }
        ],
        response_format={"type": "json_object"},
    )
    
    return json.loads(response.choices[0].message.content)

# 示例
text = "马云创建了阿里巴巴集团，总部设在杭州。"
entities = extract_entities(text)
print(json.dumps(entities, indent=2, ensure_ascii=False))
```

## 代码生成结构化输出

```python
from openai import OpenAI
import json

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.moonshot.cn/v1",
)

def generate_function_spec(description: str) -> dict:
    """生成函数规范"""
    response = client.chat.completions.create(
        model="kimi-k2-turbo-preview",
        messages=[
            {
                "role": "system",
                "content": """根据功能描述，生成函数规范 JSON，格式如下：
                {
                    "function_name": "函数名",
                    "description": "函数描述",
                    "parameters": [
                        {
                            "name": "参数名",
                            "type": "参数类型",
                            "description": "参数描述",
                            "required": true/false
                        }
                    ],
                    "return_type": "返回值类型",
                    "return_description": "返回值描述"
                }"""
            },
            {
                "role": "user",
                "content": f"功能描述：{description}"
            }
        ],
        response_format={"type": "json_object"},
    )
    
    return json.loads(response.choices[0].message.content)

# 示例
spec = generate_function_spec("""
计算两个日期之间的天数差，支持字符串格式或 datetime 对象。
如果输入无效，返回 None。
""")
print(json.dumps(spec, indent=2, ensure_ascii=False))
```

## 多轮对话中的 JSON 输出

```python
from openai import OpenAI
import json

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.moonshot.cn/v1",
)

class StructuredChat:
    """支持结构化输出的对话"""
    
    def __init__(self, api_key: str):
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.moonshot.cn/v1",
        )
        self.messages = []
    
    def chat(
        self,
        message: str,
        json_mode: bool = False,
        json_schema: dict = None
    ) -> dict | str:
        """
        发送消息
        
        Args:
            message: 用户消息
            json_mode: 是否启用 JSON 模式
            json_schema: JSON 格式要求描述
        """
        content = message
        if json_mode and json_schema:
            content += f"\n\n请以以下 JSON 格式输出：{json.dumps(json_schema, ensure_ascii=False)}"
        
        self.messages.append({"role": "user", "content": content})
        
        kwargs = {}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        response = self.client.chat.completions.create(
            model="kimi-k2-turbo-preview",
            messages=self.messages,
            **kwargs
        )
        
        reply = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": reply})
        
        if json_mode:
            try:
                return json.loads(reply)
            except json.JSONDecodeError:
                return {"error": "Invalid JSON", "content": reply}
        
        return reply

# 使用示例
chat = StructuredChat("your-api-key")

# 普通对话
print("普通回复:", chat.chat("你好"))

# JSON 模式
schema = {
    "greeting": "问候语",
    "mood": "心情描述",
    "suggestions": ["建议1", "建议2"]
}
result = chat.chat("给我一些今天的建议", json_mode=True, json_schema=schema)
print("\n结构化回复:")
print(json.dumps(result, indent=2, ensure_ascii=False))
```

## JSON 模式 + 流式输出

注意：JSON 模式下流式输出的内容需要累积后解析：

```python
from openai import OpenAI
import json

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.moonshot.cn/v1",
)

response = client.chat.completions.create(
    model="kimi-k2-turbo-preview",
    messages=[
        {
            "role": "user",
            "content": """
            生成一份用户画像 JSON：
            {
                "user_id": "用户ID",
                "demographics": {"age": 年龄, "gender": "性别"},
                "interests": ["兴趣1", "兴趣2"],
                "preferences": {"key": "value"}
            }
            """
        }
    ],
    response_format={"type": "json_object"},
    stream=True,
)

# 累积 JSON 内容
json_parts = []
for chunk in response:
    content = chunk.choices[0].delta.content
    if content:
        json_parts.append(content)
        print(content, end="", flush=True)

print("\n")

# 解析完整 JSON
try:
    full_json = "".join(json_parts)
    data = json.loads(full_json)
    print("\n解析结果:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
except json.JSONDecodeError as e:
    print(f"JSON 解析错误: {e}")
```

## 最佳实践

1. **明确的提示词**：在提示词中明确指定期望的 JSON 格式
2. **示例说明**：提供示例帮助模型理解格式要求
3. **错误处理**：始终处理 JSON 解析错误
4. **验证数据**：使用 JSON Schema 验证输出数据

```python
from jsonschema import validate, ValidationError

# 定义 JSON Schema
schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer", "minimum": 0},
        "email": {"type": "string", "format": "email"}
    },
    "required": ["name", "age"]
}

# 验证输出
try:
    validate(instance=data, schema=schema)
    print("✅ 数据验证通过")
except ValidationError as e:
    print(f"❌ 数据验证失败: {e.message}")
```
