# Function Call（工具调用）

## 功能概述

Function Call（工具调用）让模型能够调用外部工具/函数，扩展模型能力，实现与外部系统的交互。通过工具调用，模型可以：

- 获取实时信息（天气、股票、新闻等）
- 执行计算任务（数学运算、数据分析等）
- 与数据库或外部API交互
- 执行复杂的业务逻辑

## 包含的免费模型

| 模型 | 模型代码 | 上下文 | 最大输出 | 思考模式 | 思维链支持 | 工具调用支持 |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| GLM-4.7-Flash | glm-4.7-flash | 200K | 128K | ✅ 支持 | ✅ 支持 | ✅ 支持 |
| GLM-4-Flash-250414 | glm-4-flash-250414 | 128K | 16K | ❌ 不支持 | ❌ 不支持 | ✅ 支持 |
| GLM-4.6V-Flash | glm-4.6v-flash | 128K | 32K | ✅ 支持 | ✅ 支持 | ✅ 支持 |

**模型特点说明：**
- **GLM-4.7-Flash**：支持思考模式和工具调用，适合复杂推理任务
- **GLM-4-Flash-250414**：基础工具调用，不支持思考模式，响应速度快
- **GLM-4.6V-Flash**：支持思考模式和工具调用，适合多模态场景

## 工具调用的工作原理

工具调用遵循以下流程：

```
用户提问 → 模型判断是否需要工具 → 如需工具，返回工具调用请求
                                          ↓
执行工具函数 → 回传结果给模型 → 模型生成最终回复
```

### 核心概念

1. **工具定义（Tools）**：通过 JSON Schema 定义可用的函数及其参数
2. **工具选择（Tool Choice）**：控制模型是否必须使用工具、自动判断或禁用工具
3. **工具调用（Function Calling）**：模型输出需要调用的函数名和参数
4. **结果回传**：将工具执行结果回传给模型，生成最终回复

## 适用场景

### 1. 实时信息查询
- 天气查询
- 股票价格
- 新闻资讯
- 航班/酒店查询

### 2. 数学计算
- 复杂数学运算
- 单位换算
- 统计分析

### 3. 数据库操作
- SQL 查询
- 数据检索
- 记录更新

### 4. 外部 API 集成
- 发送邮件/短信
- 创建日程
- 调用第三方服务

### 5. 智能助手
- 多步骤任务执行
- 自动化工作流
- 决策支持系统

## 支持的工具类型

### 1. Function（自定义函数）

最常用的工具类型，允许定义自己的函数供模型调用。

```python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取指定城市的天气信息",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "城市名称"
                }
            },
            "required": ["city"]
        }
    }
}]
```

### 2. Web Search（网络搜索）

让模型能够搜索互联网获取最新信息。

```python
tools = [{
    "type": "web_search",
    "web_search": {
        "enable": True
    }
}]
```

### 3. Retrieval（知识库检索）

从知识库中检索相关信息（需要配合知识库使用）。

```python
tools = [{
    "type": "retrieval",
    "retrieval": {
        "knowledge_id": "your_knowledge_id",
        "prompt_template": "从知识库中检索相关信息"
    }
}]
```

## 完整调用流程

### 步骤 1：定义工具
```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的当前天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如北京、上海"
                    }
                },
                "required": ["city"]
            }
        }
    }
]
```

### 步骤 2：发送请求（带工具定义）
```python
response = client.chat.completions.create(
    model="glm-4-flash-250414",
    messages=[{"role": "user", "content": "北京今天天气怎么样？"}],
    tools=tools
)
```

### 步骤 3：检查模型响应
```python
message = response.choices[0].message

# 检查是否有工具调用
if message.tool_calls:
    # 模型请求调用工具
    tool_call = message.tool_calls[0]
    function_name = tool_call.function.name
    arguments = json.loads(tool_call.function.arguments)
```

### 步骤 4：执行工具函数
```python
# 根据函数名调用对应的函数
if function_name == "get_weather":
    result = get_weather(**arguments)
```

### 步骤 5：回传结果给模型
```python
# 构建包含工具结果的消息序列
messages = [
    {"role": "user", "content": "北京今天天气怎么样？"},
    message,  # 模型的工具调用请求
    {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "content": str(result)
    }
]

# 再次请求模型生成最终回复
final_response = client.chat.completions.create(
    model="glm-4-flash-250414",
    messages=messages,
    tools=tools
)
```

## API 调用参数

### tools 参数

定义可用的工具列表，每个工具包含类型和具体配置。

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "函数名",
            "description": "函数描述，帮助模型理解何时使用",
            "parameters": {
                "type": "object",
                "properties": {
                    "参数名": {
                        "type": "参数类型",
                        "description": "参数描述"
                    }
                },
                "required": ["必填参数列表"]
            }
        }
    }
]
```

### tool_choice 参数

控制工具选择行为：

| 值 | 说明 |
|:---|:---|
| `"auto"` | 模型自动判断是否使用工具（默认） |
| `"none"` | 禁用工具调用 |
| `{"type": "function", "function": {"name": "函数名"}}` | 强制使用指定工具 |

```python
# 自动判断（默认）
response = client.chat.completions.create(
    model="glm-4-flash-250414",
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# 强制使用特定工具
response = client.chat.completions.create(
    model="glm-4-flash-250414",
    messages=messages,
    tools=tools,
    tool_choice={"type": "function", "function": {"name": "get_weather"}}
)
```

## 完整代码示例

```python
import os
import json
from openai import OpenAI

# 初始化客户端
client = OpenAI(
    api_key="your-api-key",
    base_url="https://open.bigmodel.cn/api/paas/v4"
)

# 定义工具函数
def get_weather(city: str) -> str:
    """模拟天气查询"""
    weather_data = {
        "北京": "晴天，25°C",
        "上海": "多云，28°C",
        "广州": "小雨，30°C"
    }
    return weather_data.get(city, "未知城市")

def calculate(expression: str) -> str:
    """安全计算表达式"""
    try:
        # 只允许基本数学运算
        allowed_chars = set('0123456789+-*/.() ')
        if not all(c in allowed_chars for c in expression):
            return "错误：表达式包含非法字符"
        result = eval(expression)
        return str(result)
    except Exception as e:
        return f"计算错误: {str(e)}"

# 工具定义
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市的天气信息",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "执行数学计算",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {
                        "type": "string",
                        "description": "数学表达式，如 1+2*3"
                    }
                },
                "required": ["expression"]
            }
        }
    }
]

# 可用的函数映射
available_functions = {
    "get_weather": get_weather,
    "calculate": calculate
}

def chat_with_tools(user_message: str, model: str = "glm-4-flash-250414") -> str:
    """带工具调用的对话函数"""
    messages = [{"role": "user", "content": user_message}]
    
    # 第一次调用：获取工具调用请求
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )
    
    message = response.choices[0].message
    
    # 检查是否需要工具调用
    if message.tool_calls:
        # 添加模型的工具调用请求到消息列表
        messages.append(message)
        
        # 执行所有工具调用
        for tool_call in message.tool_calls:
            function_name = tool_call.function.name
            function_to_call = available_functions.get(function_name)
            
            if function_to_call:
                function_args = json.loads(tool_call.function.arguments)
                function_response = function_to_call(**function_args)
                
                # 添加工具执行结果
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(function_response)
                })
        
        # 第二次调用：获取最终回复
        final_response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools
        )
        return final_response.choices[0].message.content
    
    # 无需工具调用，直接返回回复
    return message.content

# 使用示例
if __name__ == "__main__":
    # 测试天气查询
    result = chat_with_tools("北京今天天气怎么样？", model="glm-4.7-flash")
    print(f"天气查询结果: {result}")
    
    # 测试数学计算
    result = chat_with_tools("计算 123 * 456 等于多少？", model="glm-4-flash-250414")
    print(f"计算结果: {result}")
```

## 注意事项

### 1. 工具定义规范
- **描述要清晰**：函数和参数的描述直接影响模型判断的准确性
- **参数类型明确**：使用正确的 JSON Schema 类型定义
- **必填参数标记**：使用 `required` 字段标记必需参数

### 2. 安全性考虑
- **输入验证**：在执行工具函数前验证参数
- **权限控制**：避免暴露敏感操作（如删除文件、发送邮件）
- **沙箱执行**：对于代码执行类工具，使用沙箱环境

### 3. 错误处理
- **工具执行失败**：如果工具执行失败，将错误信息回传给模型
- **超时处理**：设置合理的超时时间，避免长时间等待
- **重试机制**：对于临时性失败，可以实现重试逻辑

### 4. 性能优化
- **减少工具数量**：同时提供过多工具可能影响模型判断准确性
- **缓存结果**：对于不频繁变化的数据，可以缓存工具结果
- **异步执行**：多个工具调用可以并行执行

### 5. 多轮对话管理
- **保留上下文**：在多轮对话中保留工具调用历史
- **工具调用链**：支持复杂的工具调用链（工具A的结果作为工具B的输入）

### 6. 模型选择建议
| 场景 | 推荐模型 | 说明 |
|:---|:---|:---|
| 简单工具调用 | GLM-4-Flash-250414 | 响应速度快，不支持思考 |
| 复杂推理+工具 | GLM-4.7-Flash | 支持思考模式和工具调用 |
| 视觉+工具 | GLM-4.6V-Flash | 支持多模态和工具调用 |

### 7. Token 消耗
- 工具定义会消耗 tokens
- 工具调用结果也会计入上下文 tokens
- 注意控制工具返回内容的长度

## 参考链接

- [智谱 AI 官方文档](https://open.bigmodel.cn/dev/howuse/functioncall)
- [OpenAI Function Calling 指南](https://platform.openai.com/docs/guides/function-calling)
