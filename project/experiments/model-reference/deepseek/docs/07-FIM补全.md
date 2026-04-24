# 07-FIM 补全（Beta）

来源：https://api-docs.deepseek.com/zh-cn/guides/fim_completion

> ⚠️ **Beta 功能**：需要使用 `https://api.deepseek.com/beta`
> 
> ⚠️ **不支持**: `deepseek-reasoner` 不支持 FIM 补全

## 概述

FIM（Fill In the Middle）补全允许模型根据前缀和后缀，补全中间的内容。适合代码补全场景。

## 使用方法

使用 `/completions` 端点（非 `/chat/completions`）：

```python
from openai import OpenAI

# ⚠️ 注意：使用 beta 端点
client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.deepseek.com/beta",  # beta 端点
)

# FIM 补全
response = client.completions.create(
    model="deepseek-chat",  # 仅支持 deepseek-chat
    prompt="def fib(a):",
    suffix="    return fib(a-1) + fib(a-2)",  # 后缀
    max_tokens=128
)

print(response.choices[0].text)
```

## 代码补全示例

### Python 函数补全

```python
code_prefix = '''def fibonacci(n):
    if n <= 1:
        return n
    '''

code_suffix = '''
    return result'''

response = client.completions.create(
    model="deepseek-chat",
    prompt=code_prefix,
    suffix=code_suffix,
    max_tokens=256,
    temperature=0.2  # 低温度确保确定性
)

completed_code = code_prefix + response.choices[0].text + code_suffix
print(completed_code)
```

### 类方法补全

```python
prefix = '''class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, a, b):
        '''

suffix = '''
        self.history.append(f"{a} + {b} = {result}")
        return result'''

response = client.completions.create(
    model="deepseek-chat",
    prompt=prefix,
    suffix=suffix,
    max_tokens=128,
    temperature=0.1
)

print(response.choices[0].text)
```

### 根据注释生成代码

```python
prefix = '''# 计算列表中所有偶数的和
def sum_even(numbers):
    '''

suffix = '''
    return total'''

response = client.completions.create(
    model="deepseek-chat",
    prompt=prefix,
    suffix=suffix,
    max_tokens=128
)

print(response.choices[0].text)
```

## 流式 FIM 补全

```python
response = client.completions.create(
    model="deepseek-chat",
    prompt="def quicksort(arr):",
    suffix="    return arr",
    max_tokens=512,
    stream=True
)

for chunk in response:
    if chunk.choices[0].text:
        print(chunk.choices[0].text, end="", flush=True)

print()
```

## 与 Chat Completion 的区别

| 特性 | Chat Completion | FIM Completion |
|:---|:---|:---|
| 端点 | `/chat/completions` | `/completions` |
| 输入 | `messages` | `prompt` + `suffix` |
| 模型 | `deepseek-chat` / `deepseek-reasoner` | 仅 `deepseek-chat` |
| 思考模式 | 支持 | **不支持** |
| 适用场景 | 对话、推理 | 代码补全 |

## 不支持 FIM 的情况

```python
# ❌ 错误：deepseek-reasoner 不支持 FIM
try:
    response = client.completions.create(
        model="deepseek-reasoner",  # 会报错
        prompt="def test():",
        suffix="    pass"
    )
except Exception as e:
    print(f"错误: {e}")

# ✅ 正确：使用 deepseek-chat
response = client.completions.create(
    model="deepseek-chat",
    prompt="def test():",
    suffix="    pass"
)
```

## 注意事项

1. **仅 chat 支持**: `deepseek-reasoner` 不支持 FIM
2. **Beta 端点**: 使用 `https://api.deepseek.com/beta`
3. **temperature**: 建议 0.1-0.3 获得确定性结果
4. **max_tokens**: 根据补全长度合理设置
