# Kimi API 调用示例

基于 [Kimi 官方文档](https://platform.moonshot.cn/docs) 的准确调用示例。

## 模型列表

| 模型 | 类型 | 上下文 | 说明 |
|:---|:---|:---:|:---|
| `kimi-k2.5` | 多模态 | 256K | **推荐** - 最智能，支持视觉+思考 |
| `kimi-k2-0905-Preview` | 文本 | 256K | K2 预览版 |
| `kimi-k2-turbo-preview` | 文本 | 256K | K2 高速版 |
| `kimi-k2-thinking` | 文本 | 256K | K2 强制思考版 |
| `kimi-k2-thinking-turbo` | 文本 | 256K | K2 思考高速版 |
| `moonshot-v1-8k` | 文本 | 8K | 轻量版 |
| `moonshot-v1-32k` | 文本 | 32K | 标准版 |
| `moonshot-v1-128k` | 文本 | 128K | 长上下文版 |

## 快速开始

### 1. 安装依赖

```bash
pip install --upgrade 'openai>=1.0' python-dotenv
```

### 2. 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
VITE_KIMI_API_KEY=your-api-key  # 从 https://platform.moonshot.cn/ 获取
VITE_KIMI_BASE_URL=https://api.moonshot.cn/v1
```

### 3. 基础调用

```python
from openai import OpenAI
import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 从环境变量获取配置
api_key = os.getenv("VITE_KIMI_API_KEY")
base_url = os.getenv("VITE_KIMI_BASE_URL", "https://api.moonshot.cn/v1")

if not api_key:
    raise ValueError("❌ 未找到 API Key，请在 .env 文件中设置 VITE_KIMI_API_KEY")

# 初始化客户端
client = OpenAI(
    api_key=api_key,
    base_url=base_url,
)

# 调用 API
completion = client.chat.completions.create(
    model="kimi-k2-turbo-preview",
    messages=[
        {"role": "system", "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手。"},
        {"role": "user", "content": "你好，我叫李雷，1+1等于多少？"}
    ],
    temperature=0.6,
)

print(completion.choices[0].message.content)
```

## 文档目录

- [00-环境配置](docs/00-环境配置.md) - .env 文件配置说明
- [01-基础对话](docs/01-基础对话.md) - 基础调用、多轮对话
- [02-视觉理解](docs/02-视觉理解.md) - 图片/视频理解（Base64 + 文件ID）
- [03-思考模型](docs/03-思考模型.md) - reasoning_content 处理
- [04-工具调用](docs/04-工具调用.md) - Function Call、多步工具调用
- [05-流式输出](docs/05-流式输出.md) - Stream 模式
- [06-API参考](docs/06-API参考.md) - 完整API参数、错误处理
- [07-文件上传](docs/07-文件上传.md) - 大文件处理、文件ID使用
- [08-Partial模式](docs/08-Partial模式.md) - 预填回复、角色扮演
- [09-文件接口](docs/09-文件接口.md) - 完整文件管理、内容抽取
- [10-Token计算](docs/10-Token计算.md) - Token估算、成本预估
- [11-查询余额](docs/11-查询余额.md) - 账户余额查询

## 重要提示

1. **API 兼容**: 完全兼容 OpenAI API 格式
2. **视觉输入**: 
   - 支持 Base64 编码: `data:image/png;base64,...`
   - 支持文件ID: `ms://<file_id>`（推荐大文件）
   - 不支持普通 URL
3. **思考模型**: kimi-k2.5 默认启用思考，kimi-k2-thinking 强制思考
4. **多步工具**: 思考模型支持多步工具调用，需保留 reasoning_content
5. **content 格式**: 可以是 `string` 或 `List[Dict]`（图文混合）
6. **工具限制**: 最多 128 个工具，name 必须符合 `^[a-zA-Z_][a-zA-Z0-9-_]{0,63}$`
7. **文件限制**: 单个用户最多 1000 个文件，单文件不超过 100MB，总共不超过 10GB
8. **Partial Mode**: 与 `response_format=json_object` 不可混用
