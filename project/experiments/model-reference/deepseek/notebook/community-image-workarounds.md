# 社区给 DeepSeek API 处理图片的主流方案

> **日期**: 2026-04-27  
> **调研目标**: 调研社区开发者如何绕过 DeepSeek Chat API 不支持图片输入的限制  
> **结论**: 社区主流方案是 **"OCR 预处理 + DeepSeek 推理" 的两阶段流水线**，而非直接传图给 DeepSeek

---

## 1. 为什么社区需要 workaround？

DeepSeek Chat API (`deepseek-v4-pro` / `deepseek-v4-flash`) **不支持图片输入**，但实际业务中用户经常需要：

- 让 AI 分析截图、图表、发票
- 理解 PDF 文档内容
- 处理手写笔记、扫描件
- 读取代码截图中的错误信息

社区的核心思路：**不直接给 DeepSeek 传图，而是先把图片转成文本，再把文本给 DeepSeek 做深度推理**。

---

## 2. 方案一：DeepSeek-OCR（官方推荐）

DeepSeek 官方开源了专门的 OCR 模型 `DeepSeek-OCR`（以及更新的 `DeepSeek-OCR-2`），用于从图片中提取结构化文本。

### 2.1 模型特点

| 特性 | 说明 |
|------|------|
| 架构 | DeepEncoder (SAM + CLIP) + MoE Decoder |
| 参数量 | ~3B 总参数，~570M 活跃参数 |
| 压缩率 | 视觉 token 压缩 10-16 倍 |
| 支持内容 | 印刷体、手写体、表格、公式、多栏布局 |
| 处理能力 | 单张 A100 每天可处理 ~20万 页 |

### 2.2 使用方式

**方式 A：通过 Clarifai API（无需自己部署）**

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_CLARIFAI_PAT",
    base_url="https://clarifai.com/v1"
)

response = client.chat.completions.create(
    model="deepseek-ocr",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Extract all text from this invoice"},
            {"type": "image_url", "image_url": {"url": "https://example.com/invoice.jpg"}}
        ]
    }]
)
print(response.choices[0].message.content)
```

**方式 B：本地部署（vLLM）**

```bash
# 需要 vLLM nightly 版本
pip install -U vllm --pre --extra-index-url https://wheels.vllm.ai/nightly

# 运行推理
python run_dpsk_ocr_image.py
```

### 2.3 优点与局限

| ✅ 优点 | ❌ 局限 |
|---------|---------|
| DeepSeek 官方出品，与 Chat API 生态一致 | 不是同一个 API，需要额外集成 |
| 压缩率高，token 成本低 | 需要自己部署或使用第三方平台 |
| 支持复杂文档（表格、公式、手写） | 对极小字体（<6pt）的高密度表格可能失败 |
| 开源，可本地运行 | 需要 GPU（建议 A100） |

### 2.4 两阶段流水线示例

```
用户上传 invoice.jpg
    ↓
[DeepSeek-OCR] 提取文本 + 表格结构
    ↓
提取结果: "Invoice #12345\nTotal: $1,234.56\n..."
    ↓
[DeepSeek V4 Pro] 分析文本内容
    ↓
DeepSeek 输出: "这是一张来自 XXX 公司的发票，金额 $1,234.56，..."
```

---

## 3. 方案二：通用 OCR 预处理 + DeepSeek

社区最常见的低成本方案，使用成熟的 OCR 工具提取图片文字，再传给 DeepSeek。

### 3.1 常用工具对比

| 工具 | 类型 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| **PaddleOCR** | 开源/本地 | 中文支持好，轻量，可离线 | 复杂布局精度一般 | 简单文档、截图 |
| **MinerU** | 开源/本地 | PDF 转 Markdown 效果好 | 对扫描件 OCR 能力有限 | PDF 文档解析 |
| **Tesseract** | 开源/本地 | 老牌 OCR，多语言支持 | 中文准确率一般 | 英文文档、简单排版 |
| **Mistral OCR** | API | 多语言强，支持公式 | 需要 API Key，有费用 | 学术论文、复杂文档 |
| **Azure Vision** | API | 企业级，支持手写 | 贵 | 企业发票、表单 |
| **Qwen2-VL** | 开源/本地 | 视觉理解 + OCR 一体 | 需要 GPU | 需要理解图片内容的场景 |

### 3.2 典型实现：Cherry Studio 的预处理流水线

Cherry Studio（一个流行的 AI 客户端）正在开发的预处理功能：

```
用户拖入 PDF/图片
    ↓
检测当前模型是否支持 vision
    ↓
不支持（如 DeepSeek）→ 自动调用预处理器
    PDF  → MinerU → Markdown
    图片 → PaddleOCR → 纯文本
    ↓
用提取的文本替换原文件
    ↓
传给 DeepSeek 进行对话
```

社区 Issue 参考：[CherryHQ/cherry-studio#11679](https://github.com/CherryHQ/cherry-studio/issues/11679)

### 3.3 代码示例

```python
import paddleocr
from openai import OpenAI

# 第一步：OCR 提取
ocr = paddleocr.PaddleOCR(use_angle_cls=True, lang='ch')
result = ocr.ocr("screenshot.png", cls=True)
text = "\n".join([line[1][0] for line in result[0]])

# 第二步：传给 DeepSeek 分析
client = OpenAI(api_key="sk-xxx", base_url="https://api.deepseek.com/v1")
response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[
        {"role": "system", "content": "你是一个技术专家，请分析以下截图内容。"},
        {"role": "user", "content": f"这是代码截图的 OCR 结果，请找出错误：\n\n{text}"}
    ]
)
print(response.choices[0].message.content)
```

---

## 4. 方案三：Vision 模型 + DeepSeek 两阶段流水线

对于需要"理解图片内容"（而非单纯提取文字）的场景，社区采用更高级的两阶段方案：

### 4.1 流水线架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vision 模型    │     │   提取的文本     │     │   DeepSeek V4   │
│ (GPT-4o/Claude/  │────→│  + 结构化描述    │────→│   深度推理       │
│  Kimi/Gemini)   │     │  + 边界框坐标    │     │   验证/补全      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 4.2 典型应用场景

**场景：处理手写保险表单**

```python
# 阶段 1：Vision 模型做高精度 OCR + 结构化
vision_response = client_gpt4o.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "OCR the form literally. Preserve ambiguities."},
            {"type": "image_url", "image_url": {"url": form_image_url}}
        ]
    }]
)
raw_ocr = parse_json(vision_response.choices[0].message.content)

# 阶段 2：DeepSeek 做数据验证和推理
deepseek_response = client_deepseek.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[{
        "role": "user",
        "content": f"Validate and refine this form data:\n{raw_ocr}"
    }],
    tools=[web_search_tool],  # DeepSeek 可以用工具补全缺失信息
    reasoning_effort="max"
)
final_result = deepseek_response.choices[0].message.content
```

### 4.3 各阶段模型选择

| 阶段 | 推荐模型 | 理由 |
|------|----------|------|
| Vision OCR | GPT-4o / Claude 3.5 Sonnet | 视觉理解最强，支持复杂布局 |
| Vision OCR (中文) | Qwen2-VL-72B / Kimi K2.5 | 中文文档效果好 |
| Vision OCR (公式) | DeepSeek-OCR-2 | 公式识别专业 |
| 推理验证 | DeepSeek V4 Pro | 深度推理 + 工具调用 + 低成本 |

---

## 5. 方案四：OCR-MCP Server（Agent 集成）

对于使用 Cursor、Windsurf、Claude Code 等 Agent IDE 的开发者，社区提供了 MCP (Model Context Protocol) 服务器，让 Agent 自动调用 OCR 工具。

### 5.1 ocr-mcp 项目

[sandraschi/ocr-mcp](https://github.com/sandraschi/ocr-mcp) 提供了：

- **10+ OCR 后端**：DeepSeek-OCR-2、Florence-2、PaddleOCR-VL、Mistral OCR 等
- **Web 界面**：拖拽上传，选择引擎，获取结果
- **MCP Server**：Agent 可通过工具调用自动执行 OCR

```json
// MCP 配置示例
{
  "mcpServers": {
    "ocr": {
      "command": "python",
      "args": ["-m", "ocr_mcp.server"],
      "env": {
        "MISTRAL_API_KEY": "..."
      }
    }
  }
}
```

Agent 对话示例：
```
用户：分析这个 PDF 里的财务数据
Agent：这个 PDF 需要 OCR 处理，我调用 ocr_mcp 工具提取文本...
Agent：[调用 ocr 工具] → 提取到 Markdown
Agent：现在用 DeepSeek 分析提取的内容...
```

---

## 6. 方案选型建议

| 你的场景 | 推荐方案 | 原因 |
|----------|----------|------|
| 只需要提取图片中的文字 | **PaddleOCR / Tesseract** | 免费、离线、速度快 |
| PDF 转 Markdown 再分析 | **MinerU + DeepSeek** | MinerU 的 PDF 解析质量极高 |
| 复杂文档（表格+公式+手写） | **DeepSeek-OCR-2** | 官方出品，压缩率高 |
| 需要"理解"图片内容（不只是 OCR） | **GPT-4o/Kimi → DeepSeek** | 视觉模型理解，DeepSeek 推理 |
| Agent/IDE 自动化工作流 | **ocr-mcp** | 无缝集成，自动选择最优引擎 |
| 不想自己部署任何服务 | **Clarifai DeepSeek-OCR API** | 即开即用，按量计费 |

---

## 7. 对 MetaBlog 项目的建议

基于社区实践，如果未来需要在 DeepSeek 对话中支持图片，可以考虑：

### 7.1 短期：用户侧提示

保持当前做法：前端明确提示 DeepSeek "仅支持文本输入"。用户如需分析图片，手动切换到 Kimi K2.5。

### 7.2 中期：自动 OCR 预处理

参考 Cherry Studio 的做法，在用户上传图片到 DeepSeek 会话时：

```
检测到图片上传 + 当前模型为 DeepSeek
    ↓
自动调用 PaddleOCR / MinerU 提取文本
    ↓
在消息前添加说明："[图片 OCR 结果]\n---\n"
    ↓
将提取的文本传给 DeepSeek
```

### 7.3 长期：多 Agent 协作

```
用户上传图片
    ↓
[路由 Agent] 判断图片类型
    ├── 纯文字截图 → DeepSeek-OCR + DeepSeek 分析
    ├── 复杂图表 → Kimi K2.5 视觉理解
    ├── 代码截图 → OCR + DeepSeek 代码分析
    └── PDF 文档 → MinerU + DeepSeek 文档问答
```

---

## 8. 参考链接

- [deepseek-ai/DeepSeek-OCR](https://github.com/deepseek-ai/DeepSeek-OCR) — 官方 OCR 模型
- [deepseek-ai/DeepSeek-OCR-2](https://github.com/deepseek-ai/DeepSeek-OCR-2) — OCR-2 模型
- [Clarifai DeepSeek-OCR Blog](https://www.clarifai.com/blog/run-deepseek-ocr-with-an-api) — Clarifai API 教程
- [rdumasia303/deepseek_ocr_app](https://github.com/rdumasia303/deepseek_ocr_app) — DeepSeek OCR 应用
- [sandraschi/ocr-mcp](https://github.com/sandraschi/ocr-mcp) — OCR MCP Server
- [CherryHQ/cherry-studio#11679](https://github.com/CherryHQ/cherry-studio/issues/11679) — 客户端自动预处理讨论
- [FareedKhan-dev/best-llm-finder-pipeline](https://github.com/FareedKhan-dev/best-llm-finder-pipeline) — Vision + Reasoning 流水线

---

*社区实践持续演进，建议定期关注 DeepSeek 官方是否开放 Vision API。*
