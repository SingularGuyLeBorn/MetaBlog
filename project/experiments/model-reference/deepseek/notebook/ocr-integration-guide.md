# OCR 集成指南 — PaddleOCR + Tesseract + OCR.space

> **日期**: 2026-04-27  
> **目标**: 让 DeepSeek（非多模态）对话也能"理解"图片内容  
> **核心机制**: 用户传图 → 后端 OCR 提取文字 → 文本传给 DeepSeek 分析

---

## 1. 系统动作链路（用户传一张图后发生了什么）

### 完整流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户在前端页面                                  │
│                                                                             │
│  1. 用户在输入框粘贴/拖拽了一张图片 screenshot.png                          │
│                                                                             │
│  2. 前端检测到当前会话模型 = "deepseek-v4-pro"（非多模态）                  │
│                                                                             │
│     ┌─────────────────────────────────────────┐                            │
│     │  ⚠️ 模型不支持图片，是否自动 OCR 提取文字？ │                            │
│     │  [取消]        [确定，提取文字后发送]        │                            │
│     └─────────────────────────────────────────┘                            │
│                                                                             │
│  3. 用户点击"确定"                                                          │
│                                                                             │
│     POST /api/ocr                                                          │
│     Content-Type: multipart/form-data                                       │
│     file: screenshot.png                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              后端 OCR 服务                                   │
│                                                                             │
│  4. 后端接收图片，保存到 .data/uploads/ocr/ocr_1714291234_a3f2d1.png        │
│                                                                             │
│  5. 调用 OCR 服务（自动降级）                                               │
│                                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │  尝试引擎 1: PaddleOCR                                              │ │
│     │  ├── 检查: paddleocr 包已安装？                                     │ │
│     │  │   └── ❌ 未安装（或安装失败）                                    │ │
│     │  │       → 降级到下一个引擎                                        │ │
│     │  │                                                                 │ │
│     │  尝试引擎 2: Tesseract                                              │ │
│     │  ├── 检查: pytesseract 包 + Tesseract 引擎已安装？                  │ │
│     │  │   └── ❌ 未安装                                                │ │
│     │  │       → 降级到下一个引擎                                        │ │
│     │  │                                                                 │ │
│     │  尝试引擎 3: OCR.space（云端 API）                                   │ │
│     │  ├── 检查: OCR_SPACE_API_KEY 已配置？                               │ │
│     │  │   └── ✅ 已配置                                                │ │
│     │  ├── 调用 api.ocr.space/parse/image                                │ │
│     │  │   └── 上传图片...                                              │ │
│     │  │       └── ✅ 返回提取的文本                                    │ │
│     │  │                                                                 │ │
│     │  最终使用的引擎: OCR.space                                        │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  6. 删除临时文件，返回结果                                                  │
│                                                                             │
│     HTTP 200 OK                                                             │
│     {                                                                       │
│       "success": true,                                                      │
│       "data": {                                                             │
│         "text": "发票号码: 12345678\n金额: ¥1,234.56\n...",                  │
│         "engine": "OCR.space"                                               │
│       }                                                                     │
│     }                                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端继续对话                                    │
│                                                                             │
│  7. 前端收到 OCR 结果，自动构建消息                                         │
│                                                                             │
│     系统消息（前端自动插入，用户不可见）:                                    │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │ [图片 OCR 提取结果 - 由 OCR.space 引擎处理]                          │ │
│     │ ─────────────────────────────────────                                │ │
│     │ 发票号码: 12345678                                                   │ │
│     │ 金额: ¥1,234.56                                                      │ │
│     │ ...                                                                  │ │
│     │ ─────────────────────────────────────                                │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  8. 用户原始消息作为追问附加在后面                                          │
│                                                                             │
│     用户实际输入: "帮我分析一下这张发票"                                    │
│                                                                             │
│     最终传给 DeepSeek 的完整消息:                                           │
│                                                                             │
│     {                                                                       │
│       "role": "user",                                                       │
│       "content": "[图片 OCR 提取结果]\n发票号码: 12345678\n...\n\n" +         │
│                      "用户原话: 帮我分析一下这张发票"                        │
│     }                                                                       │
│                                                                             │
│  9. DeepSeek V4 Pro 收到纯文本，正常分析并回复                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 关键设计决策

| 决策点 | 选择 | 原因 |
|--------|------|------|
| **OCR 在前端还是后端做？** | 后端 | OCR 依赖 Python 生态（PaddleOCR/Tesseract），前端无法直接运行 |
| **用户是否感知 OCR 过程？** | 是，需确认 | 自动 OCR 可能产生误差，让用户确认可以避免误解 |
| **临时文件怎么处理？** | 立即删除 | 上传后立即 OCR，OCR 完成后异步删除临时文件 |
| **OCR 结果怎么呈现？** | 作为系统消息前缀 | DeepSeek 看到的是"有人已经帮它读完了图片"，减少模型困惑 |

---

## 2. 三引擎对比与选型

| 维度 | PaddleOCR | Tesseract | OCR.space |
|------|-----------|-----------|-----------|
| **类型** | 本地深度学习模型 | 本地传统 OCR 引擎 | 云端 API |
| **中文准确率** | ⭐⭐⭐ 极高 | ⭐⭐ 一般 | ⭐⭐⭐ 高 |
| **英文准确率** | ⭐⭐⭐ 高 | ⭐⭐⭐ 高 | ⭐⭐⭐ 高 |
| **表格/公式** | ✅ 支持 | ❌ 不支持 | ✅ 部分支持 |
| **安装难度** | 中等（需 pip + 模型下载） | 简单（一个安装包） | 无需安装 |
| **网络依赖** | ❌ 不需要 | ❌ 不需要 | ✅ 需要联网 |
| **费用** | 完全免费 | 完全免费 | 免费 25,000 次/月 |
| **离线可用** | ✅ 是 | ✅ 是 | ❌ 否 |
| **推荐场景** | 主力引擎（中文文档首选） | 轻量降级（英文/简单文本） | 云端兜底（不想安装任何东西） |

---

## 3. 安装指南

### 3.1 安装 Python 依赖（公共依赖）

```bash
# 所有方案都需要的基础依赖
pip install requests pillow
```

### 3.2 方案 A: PaddleOCR（推荐，中文最强）

```bash
# 安装 paddleocr（首次会自动下载约 100MB 模型文件）
pip install paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple

# 验证安装
python -c "from paddleocr import PaddleOCR; print('PaddleOCR OK')"
```

**Windows 注意**: 如果遇到 `Microsoft Visual C++` 相关的编译错误，先安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)。

### 3.3 方案 B: Tesseract（轻量降级）

**Step 1: 安装 Tesseract 引擎**

| 系统 | 安装命令 |
|------|----------|
| Windows | 下载安装包：https://github.com/UB-Mannheim/tesseract/wiki <br> 安装时勾选 Chinese (Simplified) 语言包 |
| macOS | `brew install tesseract tesseract-lang` |
| Ubuntu | `apt install tesseract-ocr tesseract-ocr-chi-sim` |

**Step 2: 安装 Python 包**

```bash
pip install pytesseract

# Windows 用户可能需要额外指定路径
# 在代码中: pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

**Step 3: 验证**

```bash
tesseract --version
python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
```

### 3.4 方案 C: OCR.space（云端，无需安装）

**不需要安装任何软件**，只需要获取 API Key。

---

## 4. OCR.space API Key 获取教程

### Step 1: 访问官网

打开浏览器，访问 **https://ocr.space/ocrapi/freekey**

### Step 2: 注册账号

```
┌──────────────────────────────────────────┐
│  Get your Free OCR API Key               │
│                                          │
│  Email: [your-email@example.com    ]     │
│  Password: [********************** ]     │
│                                          │
│  [✓] I agree to the Terms of Service     │
│                                          │
│        [ Sign Up for Free ]              │
└──────────────────────────────────────────┘
```

- 填入邮箱和密码
- 勾选同意条款
- 点击 **Sign Up for Free**

### Step 3: 邮箱验证

登录你的邮箱，查找来自 `ocrspace@a9t9.com` 的验证邮件，点击验证链接。

### Step 4: 获取 API Key

验证完成后，回到 https://ocr.space/ocrapi/freekey，登录后你会看到：

```
┌──────────────────────────────────────────┐
│  Your API Key                            │
│                                          │
│  API Key: K8xxxxxxxxxxxxxxxxxxxxxx       │
│  [Copy to Clipboard]                     │
│                                          │
│  Free Plan: 25,000 requests/month        │
│  Rate Limit: 500 requests/day            │
└──────────────────────────────────────────┘
```

点击 **Copy to Clipboard** 复制你的 API Key。

### Step 5: 配置到项目

打开项目根目录的 `.env` 文件，添加：

```bash
# OCR.space API Key（免费版每月 25,000 次）
# 获取地址: https://ocr.space/ocrapi/freekey
OCR_SPACE_API_KEY=K8xxxxxxxxxxxxxxxxxxxxxx

# OCR.space 默认语言（chs=中文简体，eng=英文）
OCR_SPACE_DEFAULT_LANG=chs
```

保存后重启开发服务器即可生效。

### 免费额度说明

| 项目 | 免费版额度 |
|------|-----------|
| 每月请求数 | 25,000 次 |
| 每日请求数 | 500 次 |
| 文件大小限制 | 1 MB |
| 支持语言 | 所有 |
| 并发限制 | 1 请求/秒 |

**注意**: 如果 25,000 次/月不够用，可以升级到 PRO 版（$30/月），支持更快处理、更大文件和离线 PDF。

---

## 5. 降级策略详解

### 5.1 降级顺序

```
用户上传图片
    ↓
尝试 PaddleOCR ──→ 成功？→ 返回结果 ✓
    │                  └── 失败/未安装
    ↓
尝试 Tesseract ──→ 成功？→ 返回结果 ✓
    │                  └── 失败/未安装
    ↓
尝试 OCR.space ──→ 成功？→ 返回结果 ✓
    │                  └── 失败/未配置 Key
    ↓
所有引擎失败 → 返回错误提示，建议用户切换到 Kimi K2.5
```

### 5.2 各场景下的实际行为

| 你的环境 | PaddleOCR | Tesseract | OCR.space | 实际使用的引擎 |
|----------|-----------|-----------|-----------|----------------|
| 什么都没装 | ❌ 未安装 | ❌ 未安装 | ✅ 已配置 Key | **OCR.space** |
| 装了 Tesseract | ❌ 未安装 | ✅ 已安装 | ✅ 已配置 Key | **Tesseract** |
| 装了 PaddleOCR | ✅ 已安装 | — | — | **PaddleOCR**（最强） |
| 全装了 | ✅ 已安装 | — | — | **PaddleOCR**（优先级最高） |
| 什么都没装 + 没 Key | ❌ | ❌ | ❌ | **失败** → 提示用户安装或配置 |

### 5.3 查看当前引擎状态

启动项目后，访问：

```bash
curl http://localhost:5173/api/ocr/status
```

返回示例：

```json
{
  "success": true,
  "data": {
    "engines": [
      { "name": "PaddleOCR", "available": false, "reason": "未安装 paddleocr 包" },
      { "name": "Tesseract", "available": true },
      { "name": "OCR.space", "available": true }
    ],
    "recommended": "Tesseract"
  }
}
```

---

## 6. API 使用示例

### 6.1 后端 API

**POST /api/ocr**

上传图片进行 OCR 提取。

```bash
curl -X POST http://localhost:5173/api/ocr \
  -F "file=@screenshot.png" \
  -F "language=chs"
```

**请求参数**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | ✅ | 图片文件 (png/jpg/jpeg/webp/gif/bmp) |
| `language` | string | ❌ | 语言: `auto`(默认) / `chs`(中文) / `en`(英文) / `cht`(繁中) / `jpn`(日文) / `kor`(韩文) |

**响应示例（成功）**:

```json
{
  "success": true,
  "data": {
    "text": "发票号码: 12345678\n金额: ¥1,234.56\n开票日期: 2026-04-27",
    "engine": "OCR.space"
  }
}
```

**响应示例（失败）**:

```json
{
  "success": false,
  "error": "所有 OCR 引擎均失败。\nPaddleOCR: 未安装 paddleocr 包\nTesseract: 未安装 pytesseract\nOCR.space: 未配置 OCR_SPACE_API_KEY"
}
```

**GET /api/ocr/status**

查看各引擎可用性。

```bash
curl http://localhost:5173/api/ocr/status
```

---

## 7. 前端集成示例

### 7.1 图片上传 + OCR 提取

```typescript
async function uploadImageForOCR(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('language', 'chs')

  const response = await fetch('/api/ocr', {
    method: 'POST',
    body: formData
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error)
  }

  return result.data.text
}

// 使用示例
async function handleImageUpload(file: File, currentModel: string) {
  // 如果当前模型支持 vision（如 Kimi K2.5），直接传图
  if (currentModel === 'kimi-k2.5') {
    return { type: 'image', file }
  }

  // 如果当前模型不支持 vision（如 DeepSeek），先 OCR
  try {
    const extractedText = await uploadImageForOCR(file)

    // 包装成带前缀的文本消息
    const wrappedText = `[图片 OCR 提取结果 - 由 ${result.data.engine} 引擎处理]\n` +
                        `────────────────────────────\n` +
                        `${extractedText}\n` +
                        `────────────────────────────\n` +
                        `（以上为图片内容的文本提取，可能存在识别误差）`

    return { type: 'text', content: wrappedText }
  } catch (err) {
    // OCR 失败，提示用户
    return {
      type: 'error',
      message: '图片 OCR 提取失败，建议切换到 Kimi K2.5 模型以直接支持图片输入。'
    }
  }
}
```

### 7.2 发送消息时自动处理

```typescript
async function sendMessage(userInput: string, attachments: File[]) {
  let finalContent = userInput

  // 处理附件
  for (const file of attachments) {
    if (file.type.startsWith('image/')) {
      const result = await handleImageUpload(file, currentModel.value)

      if (result.type === 'text') {
        finalContent = result.content + '\n\n用户原话: ' + userInput
      } else if (result.type === 'error') {
        // 显示错误提示，不发送消息
        showToast(result.message)
        return
      }
    }
  }

  // 发送给后端
  await chatAPI.send({ role: 'user', content: finalContent })
}
```

---

## 8. 常见问题

### Q1: PaddleOCR 安装很慢/失败怎么办？

**A**: PaddleOCR 依赖较多，首次安装需要下载约 100MB 模型文件。如果安装失败：

1. 使用清华镜像源: `pip install paddleocr -i https://pypi.tuna.tsinghua.edu.cn/simple`
2. Windows 用户先安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
3. 如果实在装不上，直接用 **OCR.space**（无需安装任何东西）

### Q2: Tesseract 中文识别很差怎么办？

**A**: 确保安装了中文语言包：

- Windows: 安装 Tesseract 时勾选 `Chinese (Simplified)` 和 `Chinese (Traditional)`
- macOS: `brew install tesseract-lang`
- Ubuntu: `apt install tesseract-ocr-chi-sim tesseract-ocr-chi-tra`

### Q3: OCR.space 免费额度用完了怎么办？

**A**: 三个选择：
1. 注册多个邮箱获取多个免费 Key（不推荐，违反 ToS）
2. 安装 PaddleOCR 或 Tesseract 切换到本地 OCR（推荐）
3. 升级到 OCR.space PRO（$30/月）

### Q4: OCR 提取的文本质量不好，影响 DeepSeek 理解怎么办？

**A**: 可以在系统提示词中告诉 DeepSeek"这是 OCR 提取的文本，可能存在识别误差"：

```
[系统提示词补充]
以下内容是通过 OCR 从图片中提取的文本，可能存在排版错乱或识别错误。
请结合上下文进行理解，如有明显错误请指出。
```

### Q5: 支持哪些图片格式？

**A**: PNG、JPG、JPEG、WEBP、GIF、BMP。文件大小限制 10MB。

---

## 9. 文件清单

| 文件 | 说明 |
|------|------|
| `server/services/ocr.ts` | OCR 服务核心（三引擎 + 自动降级） |
| `server/routes/internal/ocr.ts` | OCR 路由（POST /api/ocr + GET /api/ocr/status） |
| `server/routes/index.ts` | 导出新路由 |
| `server/vitepress-integration.ts` | 注册新路由到 Vite 服务器 |

---

*如有问题或建议，请更新本 notebook。*
