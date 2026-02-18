# DeepSeek API 调用示例

基于 [DeepSeek 官方文档](https://api-docs.deepseek.com/zh-cn/) 的准确调用示例。

## 模型列表

| 模型 | 说明 | 上下文 | 输出长度 | 特点 |
|:---|:---|:---:|:---:|:---|
| `deepseek-chat` | DeepSeek-V3.2 非思考模式 | 128K | 默认 4K，最大 8K | 日常对话、快速响应 |
| `deepseek-reasoner` | DeepSeek-V3.2 思考模式 | 128K | 默认 32K，最大 64K | 深度推理、复杂问题 |

## 价格（人民币）

| 类型 | deepseek-chat | deepseek-reasoner |
|:---|:---:|:---:|
| 输入（缓存命中） | ¥0.2/百万 tokens | - |
| 输入（缓存未命中） | ¥2/百万 tokens | - |
| 输出 | ¥3/百万 tokens | - |

> **注意**: `deepseek-chat` 和 `deepseek-reasoner` 是同一模型（DeepSeek-V3.2）的两种模式，与 APP/WEB 版不同。

## 快速开始

### 1. 安装依赖

```bash
pip install --upgrade 'openai>=1.0' python-dotenv
```

### 2. 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
VITE_DEEPSEEK_API_KEY=your-api-key  # 从 https://platform.deepseek.com/ 获取
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
```

### 3. 基础调用

```python
from openai import OpenAI
import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 从环境变量获取配置
api_key = os.getenv("VITE_DEEPSEEK_API_KEY")
base_url = os.getenv("VITE_DEEPSEEK_BASE_URL", "https://api.deepseek.com")

if not api_key:
    raise ValueError("❌ 未找到 API Key，请在 .env 文件中设置 VITE_DEEPSEEK_API_KEY")

# 初始化客户端
client = OpenAI(
    api_key=api_key,
    base_url=base_url,
)

# 非思考模式（deepseek-chat）
response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ],
    stream=False
)

print(response.choices[0].message.content)
```

## 文档目录

- [00-环境配置](docs/00-环境配置.md) - .env 文件配置说明
- [01-基础对话](docs/01-基础对话.md) - 基础调用、多轮对话
- [02-思考模式](docs/02-思考模式.md) - deepseek-reasoner 深度推理（⚠️ 重要限制）
- [03-流式输出](docs/03-流式输出.md) - Stream 模式
- [04-工具调用](docs/04-工具调用.md) - Function Calling、Strict 模式
- [05-结构化输出](docs/05-结构化输出.md) - JSON Output
- [06-对话前缀续写](docs/06-对话前缀续写.md) - Beta 功能（需 beta 端点）
- [07-FIM补全](docs/07-FIM补全.md) - Beta 功能（仅 chat，需 beta 端点）
- [08-硬盘缓存](docs/08-硬盘缓存.md) - KV Cache 机制（节省费用）
- [09-Anthropic兼容](docs/09-Anthropic兼容.md) - Claude Code 集成

## Notebook 目录

- [01-基础对话](notebook/01-基础对话.ipynb)
- [02-流式输出](notebook/02-流式输出.ipynb)
- [03-JSON结构化输出](notebook/03-JSON结构化输出.ipynb)
- [04-工具调用](notebook/04-工具调用.ipynb)
- [05-思考模式](notebook/05-思考模式.ipynb)
- [06-对话前缀续写](notebook/06-对话前缀续写.ipynb)
- [07-FIM补全](notebook/07-FIM补全.ipynb)

## API 基本信息

| 项目 | 值 |
|:---|:---|
| Base URL | `https://api.deepseek.com` 或 `https://api.deepseek.com/v1` |
| Beta 端点 | `https://api.deepseek.com/beta` |
| 认证方式 | Bearer Token |
| 兼容格式 | OpenAI API 兼容 |
| Anthropic | `https://api.deepseek.com/anthropic` |

## 重要提示

### 1. 模型模式

- **deepseek-chat**: 非思考模式，默认 4K 输出，最大 8K
- **deepseek-reasoner**: 思考模式，默认 32K 输出，最大 64K

### 2. deepseek-reasoner 限制 ⚠️

**以下参数不支持**（设置不会生效或报错）：

| 参数 | 行为 |
|:---|:---|
| `temperature` | 设置不生效 |
| `top_p` | 设置不生效 |
| `presence_penalty` | 设置不生效 |
| `frequency_penalty` | 设置不生效 |
| `logprobs` | **会报错** |
| `top_logprobs` | **会报错** |

### 3. 多轮对话处理 ⚠️

- `reasoning_content` **不会**拼接到上下文
- 新一轮只传 `content`，不传 `reasoning_content`

### 4. Beta 功能

- **对话前缀续写**: `base_url="https://api.deepseek.com/beta"` + `prefix: True`
- **FIM 补全**: `base_url="https://api.deepseek.com/beta"`，仅 `deepseek-chat` 支持
- **Strict 模式**: `base_url="https://api.deepseek.com/beta"` + `strict: True`

### 5. 硬盘缓存

- **缓存命中**: ¥0.2/百万 tokens（节省 90%）
- **缓存未命中**: ¥2/百万 tokens
- 使用固定前缀（如 system prompt）可大幅提高命中率

### 6. Anthropic 兼容

- 支持 Claude Code 集成
- 支持 Anthropic SDK
- Base URL: `https://api.deepseek.com/anthropic`
