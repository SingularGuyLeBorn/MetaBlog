# 智谱 AI 免费模型参考手册

本目录包含智谱 AI 所有免费大语言模型和多模态模型的详细文档和交互式 Jupyter Notebook 示例。

## 📚 文档结构

```
model-reference/zhipu/
├── docs/              # Markdown 文档
│   ├── 01-基础对话（多轮）.md
│   ├── 02-视觉理解.md
│   ├── 03-深度思考（思维链）.md
│   ├── 04-工具调用与结构化输出.md
│   ├── 05-轻量视觉理解.md
│   ├── 06-图像生成.md
│   └── 07-视频生成.md
├── notebook/          # Jupyter Notebook 交互式教程
│   ├── 01-基础对话（多轮）.ipynb
│   ├── 02-视觉理解.ipynb
│   ├── 03-深度思考（思维链）.ipynb
│   ├── 04-工具调用与结构化输出.ipynb
│   ├── 05-轻量视觉理解.ipynb
│   ├── 06-图像生成.ipynb
│   └── 07-视频生成.ipynb
└── README.md          # 本文件
```

## 🎯 免费模型总览

| 模型 | 类型 | 思考模式 | 上下文 | 最大输出 | 特色能力 |
|:---|:---|:---:|:---:|:---:|:---|
| **GLM-4.7-Flash** | 文本 | ✅ 可选 | 200K | 128K | Agentic Coding, 推理链, 工具调用 |
| **GLM-4.6V-Flash** | 多模态 | ✅ 可选 | 128K | 32K | 视觉+工具，50图/视频/文件 |
| **GLM-4.1V-Thinking-Flash** | 多模态 | ✅ 强制 | 64K | 16K | 视觉深度推理，强制思维链 |
| **GLM-4-Flash-250414** | 文本+图 | ❌ | 128K | 16K | 工具调用+结构化输出 |
| **GLM-4V-Flash** | 视觉 | ❌ | 16K | 1K | 轻量级，单图快速识别 |
| **CogView-3-Flash** | 图像生成 | - | - | - | 文生图，7种分辨率 |
| **CogVideoX-Flash** | 视频生成 | - | - | - | 文生视频，异步API |

## 📖 详细文档

### 01-基础对话（多轮） - [文档](docs/01-基础对话（多轮）.md) | [Notebook](notebook/01-基础对话（多轮）.ipynb)

**GLM-4.7-Flash** - 旗舰级文本模型，支持深度思考模式

- ✅ **可选思考模式** - 通过 `thinking` 参数控制
- ✅ **思维链输出** - `reasoning_content` 查看推理过程
- ✅ **200K 超长上下文** - 适合长文档处理
- ✅ **Agentic Coding** - 强化代码能力

### 02-视觉理解 - [文档](docs/02-视觉理解.md) | [Notebook](notebook/02-视觉理解.ipynb)

**GLM-4.6V-Flash** - 强大的多模态理解能力

- ✅ **50 张图片** - 支持单图/多图/Base64
- ✅ **视频理解** - 最大 200MB
- ✅ **文件理解** - PDF/TXT 最多 50 个
- ✅ **可选思考模式** - 深度分析图像内容
- ✅ **原生工具调用** - Function Call 原生支持

### 03-深度思考（思维链） - [文档](docs/03-深度思考（思维链）.md) | [Notebook](notebook/03-深度思考（思维链）.ipynb)

**GLM-4.1V-Thinking-Flash** - 视觉深度推理专家

- ✅ **强制思考** - 思考能力内置，无法关闭
- ✅ **视觉推理闭环** - 看见即思考，思考即解答
- ✅ **理科题目解答** - 图表、公式、流程图分析
- ✅ **GUI Agent 能力** - 理解界面生成操作序列

### 04-工具调用与结构化输出 - [文档](docs/04-工具调用与结构化输出.md) | [Notebook](notebook/04-工具调用与结构化输出.ipynb)

**GLM-4-Flash-250414** - 工具调用专家

- ✅ **Function Call** - 强大的工具调用能力
- ✅ **结构化输出** - JSON Schema 约束
- ✅ **图片理解** - 支持图片输入
- ❌ **无思考模式** - 专注工具调用

### 05-轻量视觉理解 - [文档](docs/05-轻量视觉理解.md) | [Notebook](notebook/05-轻量视觉理解.ipynb)

**GLM-4V-Flash** - 轻量级视觉识别

- ✅ **快速响应** - 轻量化设计
- ❌ **单图限制** - 仅支持 1 张图片
- ❌ **无思考模式** - 基础视觉识别

### 06-图像生成 - [文档](docs/06-图像生成.md) | [Notebook](notebook/06-图像生成.ipynb)

**CogView-3-Flash** - 免费图像生成

- ✅ **7 种分辨率** - 1024x1024 到 720x1440
- ✅ **免费调用** - 单账号 10 张/秒，日限 10,000 张
- ✅ **多种风格** - vivid/natural 风格切换

### 07-视频生成 - [文档](docs/07-视频生成.md) | [Notebook](notebook/07-视频生成.ipynb)

**CogVideoX-Flash** - 业界首个免费视频生成 API

- ✅ **文生视频** - 文本描述生成视频
- ✅ **图生视频** - 以图片为首帧生成
- ✅ **异步 API** - 提交任务 + 轮询结果
- ✅ **完全免费** - 无额度限制

## 🔑 快速开始

### 环境配置

```bash
pip install openai jupyter requests
```

### API 配置

```python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",  # 从智谱开放平台获取
    base_url="https://open.bigmodel.cn/api/paas/v4"
)
```

### 基础调用示例

```python
# 文本对话
response = client.chat.completions.create(
    model="glm-4.7-flash",
    messages=[{"role": "user", "content": "你好"}]
)

# 视觉理解
response = client.chat.completions.create(
    model="glm-4.6v-flash",
    messages=[{
        "role": "user",
        "content": [
            {"type": "image_url", "image_url": {"url": "https://..."}},
            {"type": "text", "text": "描述这张图片"}
        ]
    }]
)

# 图像生成
response = client.images.generate(
    model="cogview-3-flash",
    prompt="一只可爱的猫咪",
    size="1024x1024"
)
```

## 📊 模型能力对比矩阵

| 能力 | 4.7-Flash | 4.6V-Flash | 4.1V-Thinking | 4-Flash-250414 | 4V-Flash | CogView-3 | CogVideoX |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 文本对话 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 图片理解 | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 视频理解 | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 文件理解 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 思考模式 | ✅ 可选 | ✅ 可选 | ✅ 强制 | ❌ | ❌ | ❌ | ❌ |
| 工具调用 | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| 结构化输出 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 流式输出 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 图像生成 | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| 视频生成 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## ⚠️ 重要限制

### 视觉模型限制

| 模型 | 图片 | 视频 | 文件 | 思考 |
|:---|:---:|:---:|:---:|:---:|
| GLM-4.6V-Flash | 50 张 | ✅ 200MB | ✅ 50个 | 可选 |
| GLM-4.1V-Thinking-Flash | 50 张 | ✅ | ❌ | 强制 |
| GLM-4V-Flash | **仅 1 张** | ❌ | ❌ | ❌ |

> **注意**：GLM-4.6V-Flash 和 GLM-4.1V-Thinking-Flash 不支持同时理解文件、视频和图像，需分别调用。

### 生成模型限制

- **CogView-3-Flash**：单账号 10 张/秒，日限 10,000 张
- **CogVideoX-Flash**：异步 API，通常 1-5 分钟生成完成

## 🔗 相关链接

- [智谱 AI 开放平台](https://open.bigmodel.cn/)
- [官方文档](https://open.bigmodel.cn/dev/howuse/glm-4.7-flash)
- [模型定价](https://open.bigmodel.cn/pricing)

## 📝 更新日志

| 日期 | 更新内容 |
|:---|:---|
| 2025-01 | 创建完整模型参考手册，包含 7 个模型文档和 Notebook |

---

> 💡 **提示**：所有 Notebook 都包含可运行的代码示例，建议使用 Jupyter 打开并亲自体验！
