# 模型参考文档中心

本目录包含各类 AI 模型的详细文档和可运行的测试代码，按厂商和功能分类整理。每个功能的文档明确标注了**思考模型**和**思维链**支持情况。

---

## 📁 目录结构

```
model-reference/
├── README.md                                    # 本文件（总览）
└── zhipu/                                       # 智谱 AI (已完成)
    ├── README.md                               # 智谱 AI 总览
    ├── docs/                                   # 功能文档
    │   ├── 01-基础对话（多轮）.md
    │   ├── 02-流式输出.md
    │   ├── 03-深度思考（思维链）.md
    │   ├── 04-图片理解.md
    │   ├── 05-视频理解.md
    │   ├── 06-文件理解.md
    │   ├── 07-音频对话.md
    │   ├── 08-FunctionCall（工具调用）.md
    │   ├── 09-图像生成.md
    │   └── 10-视频生成.md
    └── notebook/                               # Jupyter Notebook 测试
        ├── 01-基础对话（多轮）.ipynb
        ├── 02-流式输出.ipynb
        ├── 03-深度思考（思维链）.ipynb
        ├── 04-图片理解.ipynb
        ├── 05-视频理解.ipynb
        ├── 06-文件理解.ipynb
        ├── 07-音频对话.ipynb
        ├── 08-FunctionCall（工具调用）.ipynb
        ├── 09-图像生成.ipynb
        └── 10-视频生成.ipynb
```

---

## 🏢 已支持厂商

| 厂商 | 路径 | 免费模型数 | 功能数 | 状态 |
|:---:|:---|:---:|:---:|:---:|
| **智谱 AI** | [zhipu/](./zhipu/) | 7 | 10 | ✅ 已完成 |
| OpenAI | openai/ | - | - | 📝 待添加 |
| Anthropic | anthropic/ | - | - | 📝 待添加 |
| Google | google/ | - | - | 📝 待添加 |
| DeepSeek | deepseek/ | - | - | 📝 待添加 |
| 阿里云 | aliyun/ | - | - | 📝 待添加 |
| Moonshot | moonshot/ | - | - | 📝 待添加 |

---

## 🎯 智谱 AI 功能导航

智谱 AI 提供 **7 个免费模型**，涵盖 **10 个核心功能**：

### 对话类功能

| 序号 | 功能 | 思考模型 | 思维链 | 包含模型 | 快速链接 |
|:---:|:---|:---:|:---:|:---|:---|
| 01 | **基础对话（多轮）** | ❌ | ❌ | GLM-4.7-Flash<br>GLM-4-Flash-250414 | [文档](./zhipu/docs/01-基础对话（多轮）.md) / [测试](./zhipu/notebook/01-基础对话（多轮）.ipynb) |
| 02 | **流式输出** | 部分 | 部分 | GLM-4.7-Flash<br>GLM-4-Flash-250414<br>GLM-4.6V-Flash<br>GLM-4.1V-Thinking-Flash<br>GLM-4V-Flash | [文档](./zhipu/docs/02-流式输出.md) / [测试](./zhipu/notebook/02-流式输出.ipynb) |
| 03 | **深度思考（思维链）** | ✅ | ✅ | GLM-4.6V-Flash<br>GLM-4.1V-Thinking-Flash | [文档](./zhipu/docs/03-深度思考（思维链）.md) / [测试](./zhipu/notebook/03-深度思考（思维链）.ipynb) |
| 07 | **音频对话** | ❌ | ❌ | GLM-4-Voice | [文档](./zhipu/docs/07-音频对话.md) / [测试](./zhipu/notebook/07-音频对话.ipynb) |
| 08 | **Function Call（工具调用）** | 部分 | ❌ | GLM-4.7-Flash<br>GLM-4-Flash-250414<br>GLM-4.6V-Flash | [文档](./zhipu/docs/08-FunctionCall（工具调用）.md) / [测试](./zhipu/notebook/08-FunctionCall（工具调用）.ipynb) |

### 视觉类功能

| 序号 | 功能 | 思考模型 | 思维链 | 包含模型 | 快速链接 |
|:---:|:---|:---:|:---:|:---|:---|
| 04 | **图片理解** | 部分 | 部分 | GLM-4.6V-Flash<br>GLM-4.1V-Thinking-Flash<br>GLM-4V-Flash | [文档](./zhipu/docs/04-图片理解.md) / [测试](./zhipu/notebook/04-图片理解.ipynb) |
| 05 | **视频理解** | ✅ | ❌ | GLM-4.6V-Flash | [文档](./zhipu/docs/05-视频理解.md) / [测试](./zhipu/notebook/05-视频理解.ipynb) |
| 06 | **文件理解** | ✅ | ❌ | GLM-4.6V-Flash | [文档](./zhipu/docs/06-文件理解.md) / [测试](./zhipu/notebook/06-文件理解.ipynb) |

### 生成类功能

| 序号 | 功能 | 思考模型 | 思维链 | 包含模型 | 快速链接 |
|:---:|:---|:---:|:---:|:---|:---|
| 09 | **图像生成** | N/A | N/A | CogView-3-Flash | [文档](./zhipu/docs/09-图像生成.md) / [测试](./zhipu/notebook/09-图像生成.ipynb) |
| 10 | **视频生成** | N/A | N/A | CogVideoX-Flash | [文档](./zhipu/docs/10-视频生成.md) / [测试](./zhipu/notebook/10-视频生成.ipynb) |

**图例说明：** ✅ = 支持 ｜ ❌ = 不支持 ｜ 部分 = 部分模型支持 ｜ N/A = 不适用

👉 [查看智谱 AI 完整文档](./zhipu/README.md)

---

## 🧠 思考模型与思维链

### 概念说明

| 概念 | 说明 | 标识 |
|:---|:---|:---:|
| **思考模型** | 支持 `thinking` 参数，可开启深度思考模式 | 是否思考模型 |
| **思维链** | 返回 `reasoning_content` 字段，展示推理过程 | 思维链支持 |

### 智谱 AI 免费模型能力

| 模型 | 模型代码 | 是否思考模型 | 思维链支持 | 思考模式 |
|:---|:---|:---:|:---:|:---|
| GLM-4.7-Flash | glm-4.7-flash | ❌ | ❌ | - |
| GLM-4-Flash-250414 | glm-4-flash-250414 | ❌ | ❌ | - |
| GLM-4.6V-Flash | glm-4.6v-flash | ✅ | ❌ | 自动判断 |
| GLM-4.1V-Thinking-Flash | glm-4.1v-thinking-flash | ✅ | ✅ | 强制思考 |
| GLM-4V-Flash | glm-4v-flash | ❌ | ❌ | - |
| GLM-4-Voice | glm-4-voice | ❌ | ❌ | - |
| CogView-3-Flash | cogview-3-flash | N/A | N/A | 图像生成 |
| CogVideoX-Flash | cogvideox-flash | N/A | N/A | 视频生成 |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install openai python-dotenv jupyter requests
```

### 2. 配置 API Key

创建或编辑项目根目录的 `.env` 文件：

```env
# 智谱 AI
VITE_ZHIPU_API_KEY=your-zhipu-api-key
```

### 3. 运行测试

```bash
# 进入对应厂商目录
cd model-reference/zhipu

# 启动 Jupyter
jupyter notebook

# 打开 notebook/ 目录下的测试文件
```

---

## 📊 能力对比总览

| 能力 | 智谱 AI | OpenAI | Anthropic | Google | DeepSeek |
|:---:|:---:|:---:|:---:|:---:|:---:|
| 基础对话 | ✅ | 📝 | 📝 | 📝 | 📝 |
| 流式输出 | ✅ | 📝 | 📝 | 📝 | 📝 |
| 深度思考 | ✅ | 📝 | 📝 | 📝 | 📝 |
| 图片理解 | ✅ | 📝 | 📝 | 📝 | 📝 |
| 视频理解 | ✅ | 📝 | ❌ | 📝 | ❌ |
| 文件理解 | ✅ | 📝 | ❌ | 📝 | ❌ |
| 音频对话 | ✅ | 📝 | ❌ | 📝 | 📝 |
| 工具调用 | ✅ | 📝 | 📝 | 📝 | 📝 |
| 图像生成 | ✅ | 📝 | ❌ | 📝 | ❌ |
| 视频生成 | ✅ | 📝 | ❌ | 📝 | ❌ |

✅ = 已完成 ｜ 📝 = 待添加 ｜ ❌ = 不支持

---

## 📝 文档规范

### 文件命名规范

- **功能文档**：`序号-功能名称.md`（如：`01-基础对话（多轮）.md`）
- **测试文件**：`序号-功能名称.ipynb`（如：`01-基础对话（多轮）.ipynb`）
- **序号规则**：从 01 开始，按功能逻辑顺序排列

### 功能文档内容规范

每个功能文档必须包含：
1. **功能介绍**
2. **包含模型表格**（必须标注：是否思考模型、思维链支持）
3. **适用场景**
4. **API 调用方式**
5. **代码示例**
6. **参数说明**
7. **注意事项**

### 模型表格示例

```markdown
| 模型 | 模型代码 | 上下文 | 最大输出 | 是否思考模型 | 思维链支持 |
|:---|:---|:---:|:---:|:---:|:---:|
| GLM-4.7-Flash | glm-4.7-flash | 200K | 128K | ❌ 否 | ❌ 不支持 |
| GLM-4.6V-Flash | glm-4.6v-flash | 128K | 32K | ✅ 是 | ❌ 不支持 |
| GLM-4.1V-Thinking-Flash | glm-4.1v-thinking-flash | 64K | 16K | ✅ 是 | ✅ 支持 |
```

---

## 🔧 添加新厂商指南

### 1. 创建目录结构

```bash
mkdir -p model-reference/new-vendor/{docs,notebook}
```

### 2. 创建文档文件

参考 [zhipu/](./zhipu/) 目录结构，每个功能必须标注：
- 是否思考模型
- 思维链支持

### 3. 更新主 README

在本文件的「已支持厂商」表格中添加新厂商信息。

---

## 📚 参考资料

- [项目根目录模型概览](../模型概览.md)
- [项目根目录 Agent 文档](../agent.md)
- [智谱 AI 官方文档](https://docs.bigmodel.cn/)
- [OpenAI API 文档](https://platform.openai.com/docs)

---

## 📝 更新日志

| 日期 | 版本 | 说明 |
|-----|------|------|
| 2026-02-17 | v2.0 | 完成智谱 AI 10 个功能的文档，明确标注思考模型和思维链支持 |

---

**Happy Coding! 🎉**
