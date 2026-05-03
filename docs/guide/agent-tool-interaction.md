# Agent 工具调用交互图

本文档用 UML 图完整描述 MetaBlog 中 AI Agent 调用工具的全流程,涵盖从用户输入到工具执行、再到结果返回的各个环节. 

---

## 一、完整时序图：从用户输入到 AI 回复

```mermaid
sequenceDiagram
    actor U as 用户
    participant F as 前端
    participant B as 后端
    participant LLM as LLM API
    participant Ext as 外部服务

    U->>F: 输入消息(可能含图片附件)

    alt 非 vision 模型 + 有图片附件
        F->>B: POST /api/ocr
        B->>Ext: PaddleOCR / Tesseract / OCR.space
        Ext-->>B: OCR 文字结果
        B-->>F: text + engine
        F->>F: attachment.ocrText = 结果
    end

    F->>B: POST /api/chat
    B->>B: getModelConfig
    B->>B: convertMessageToApiFormat

    alt vision 模型 + 消息含 ms file_id
        B->>B: 提取 file_id 转成 image_url
    end

    B->>LLM: 发送消息 + tools schema
    LLM-->>B: 返回 AI 响应

    alt AI 响应含 tool_calls
        B-->>F: SSE 流式传输 assistant 消息
        F->>F: 显示 AI 思考过程
        loop 逐个执行工具
            F->>B: executeTool(toolCall)
            B->>B: 读取工具注册表
            B->>B: 调用 executor

            alt readArticle
                B->>Ext: fetch 目标网页 HTML
                Ext-->>B: HTML 响应
                B->>B: HTML 转 Markdown
                B->>B: 提取图片 URLs
                alt embed_ocr=true
                    B->>Ext: 下载图片并 OCR
                    Ext-->>B: OCR 文字
                    B->>B: OCR 结果嵌入 Markdown
                end
                alt fetch_image_files=true
                    B->>Ext: 下载图片并上传 Kimi
                    Ext-->>B: file_id
                    B->>B: 替换 URL 为 ms file_id
                end
                B->>B: Markdown 全文加行号
            end

            B-->>F: ToolResult
            F->>F: 显示工具执行结果
        end

        F->>B: 再次 POST /api/chat
        B->>B: convertMessageToApiFormat

        alt 消息含 ms file_id + vision
            B->>B: 转成 image_url
        end

        B->>LLM: 发送完整对话历史
        LLM-->>B: 返回最终响应
    end

    B-->>F: SSE 流式传输最终回复
    F->>U: 显示 AI 回复
```

### 关键步骤说明

| 阶段 | 说明 |
|------|------|
| 附件预处理 | 非 vision 模型自动 OCR 图片附件,vision 模型跳过 |
| 消息转换 | 根据模型能力转换消息格式(纯文本 / vision 多模态) |
| AI 决策 | LLM 决定直接回复或调用工具 |
| 工具执行 | 前端执行工具,后端处理平台解析、OCR、文件上传等 |
| 结果回传 | 工具结果追加到对话,再次请求 LLM 生成最终回复 |

---

## 二、核心流程时序图：多模态文章解析

```mermaid
sequenceDiagram
    actor U as 用户
    participant AI as AI Agent
    participant FE as 前端框架
    participant BE as 后端服务
    participant Web as 外部网站
    participant KS as Kimi 服务

    U->>AI: 提供文章链接
    AI->>FE: 调用 readArticle
    FE->>BE: POST /api/platform/parse

    BE->>Web: fetch 目标网页
    Web-->>BE: HTML
    BE->>BE: HTML 转 Markdown
    BE->>BE: 提取图片 URLs

    Note over BE,KS: 并行处理图片(最多10张,并发3)
    loop 每张图片
        BE->>BE: downloadImageToTemp
        BE->>KS: POST /v1/files
        KS-->>BE: file_id
        BE->>BE: 替换 Markdown 图片 URL
    end

    BE->>BE: Markdown 全文加行号
    BE-->>FE: title + author + content + images + image_files
    FE-->>AI: ToolResult

    AI->>AI: 阅读 Markdown 文本
    Note right of AI: 文本中可见 ms file_id 标记

    AI->>FE: 后续对话请求
    FE->>BE: POST /api/chat
    BE->>BE: convertMessageToApiFormat

    Note over BE: 消息层自动识别 ms file_id
    BE->>BE: extractMsFileIds
    BE->>BE: 组装 content 数组

    BE->>KS: 发送多模态消息
    KS-->>BE: AI 响应
    BE-->>FE: SSE 流传输
    FE->>U: 显示回复
```

### 两种模型路径对比

| 模型类型 | 参数 | 后端动作 | AI 看到的内容 |
|----------|------|----------|---------------|
| 非 vision (DeepSeek) | embed_ocr=true | 下载图片 - OCR - 文字嵌入 Markdown | 带行号的 Markdown + 图片 OCR 引用块 |
| vision (Kimi) | fetch_image_files=true | 下载图片 - 上传 Kimi - 替换为 ms file_id | 带行号的 Markdown + 原图(通过 ms file_id) |

---

## 三、活动图：工具调用决策流程

```mermaid
graph TD
    Start([开始]) --> UserInput[用户输入消息]
    UserInput --> HasImage{有图片附件?}

    HasImage -->|是| IsVision{模型支持 vision?}
    HasImage -->|否| AssembleMsg[组装消息]

    IsVision -->|是| ToImageUrl[转成 image_url]
    IsVision -->|否| CallOcr[调用 /api/ocr]
    CallOcr --> EmbedOcr[ocrText 嵌入消息]
    ToImageUrl --> AssembleMsg
    EmbedOcr --> AssembleMsg

    AssembleMsg --> SendLLM[发送给 LLM]
    SendLLM --> HasToolCall{AI 响应含 tool_calls?}

    HasToolCall -->|否| StreamReply[SSE 流式传输]
    HasToolCall -->|是| ShowThinking[显示 AI 思考过程]

    ShowThinking --> ExecTool[执行工具]
    ExecTool --> WhichTool{工具类型?}

    WhichTool -->|readArticle| ParseLink[解析链接]
    WhichTool -->|ocrImage| DoOcr[下载后 OCR]
    WhichTool -->|createArticle| CreateFile[创建本地文件]
    WhichTool -->|其他工具| OtherTool[执行对应逻辑]

    ParseLink --> HandleImages{图片处理参数?}
    HandleImages -->|embed_ocr| DoEmbedOcr[OCR 嵌入 Markdown]
    HandleImages -->|fetch_image_files| DoUploadKimi[上传 Kimi 替换 file_id]
    HandleImages -->|无| AddLineNum[仅加行号]
    DoEmbedOcr --> AddLineNum
    DoUploadKimi --> AddLineNum

    DoOcr --> ToolResult[返回 ToolResult]
    CreateFile --> ToolResult
    OtherTool --> ToolResult
    AddLineNum --> ToolResult

    ToolResult --> ShowResult[显示工具结果]
    ShowResult --> AppendMsg[追加到对话历史]
    AppendMsg --> SendLLM

    StreamReply --> End([结束])
```

---

## 四、组件图：工具系统架构

```mermaid
graph TB
    subgraph UI["用户界面层"]
        Chat[ChatLayout.vue]
        Input[ChatInput.vue]
    end

    subgraph Frontend["前端工具层"]
        Registry[registry.ts]
        Platform[platform 工具]
        Article[article 工具]
        Github[github 工具]
        Feishu[feishu 工具]
        SkillLoader[skillLoader.ts]
    end

    subgraph BFF["BFF 中间层"]
        ChatRoute[chat.ts]
        OCRRoute[ocr.ts]
        ParserRoute[platform-parser.ts]
        PlatformParser[parser.ts]
    end

    subgraph Service["后端服务层"]
        OCRService[ocr.ts]
        KimiUpload[kimi-file-upload.ts]
        Fetcher[fetcher.ts]
    end

    subgraph External["外部 API"]
        DeepSeek[DeepSeek API]
        Kimi[Kimi API]
        GitHubAPI[GitHub API]
        FeishuAPI[Feishu API]
        Web[目标网站]
    end

    Chat --> Input
    Chat --> Registry
    Input --> Chat

    Registry --> Platform
    Registry --> Article
    Registry --> Github
    Registry --> Feishu
    SkillLoader --> Registry

    Chat --> ChatRoute
    ChatRoute --> DeepSeek
    ChatRoute --> Kimi
    ChatRoute --> KimiUpload

    Platform --> ParserRoute
    ParserRoute --> PlatformParser
    PlatformParser --> Fetcher
    Fetcher --> Web
    PlatformParser --> OCRService
    PlatformParser --> KimiUpload

    OCRRoute --> OCRService
    OCRService --> DeepSeek

    KimiUpload --> Kimi

    Github --> GitHubAPI
    Feishu --> FeishuAPI
```

---

## 五、状态图：工具调用生命周期

```mermaid
stateDiagram
    [*] --> Idle: 系统初始化

    Idle --> Processing: 用户发送消息

    Processing --> ToolExecuting: AI 返回 tool_calls
    Processing --> Streaming: AI 直接回复

    ToolExecuting --> ToolSuccess: 工具执行成功
    ToolExecuting --> ToolError: 工具执行失败

    ToolSuccess --> Processing: 追加结果到对话
    ToolError --> Processing: 追加错误到对话

    Streaming --> Completed: 流式传输完成

    Completed --> Idle: 等待新输入
    Completed --> Processing: 用户发送新消息
```

---

## 六、数据流图：图片处理的两种路径

```mermaid
graph LR
    subgraph Article["文章内容"]
        HTML["HTML 原文"]
        MD["Markdown"]
        Images["images 图片 URL 列表"]
    end

    subgraph NonVision["非 vision 模型路径"]
        OCR["OCR 服务"]
        Embed["嵌入 Markdown"]
        LineNum1["加行号"]
    end

    subgraph Vision["vision 模型路径"]
        Download["下载图片"]
        Upload["上传 Kimi API"]
        Replace["替换 URL"]
        MsgLayer["消息层转换"]
        LineNum2["加行号"]
    end

    HTML --> MD
    MD --> Images

    Images --> OCR
    OCR --> Embed
    Embed --> LineNum1
    LineNum1 --> DeepSeek["DeepSeek API"]

    Images --> Download
    Download --> Upload
    Upload --> Replace
    Replace --> LineNum2
    LineNum2 --> MsgLayer
    MsgLayer --> KimiVision["Kimi API"]
```

---

## 七、泳道图：多模态文章解析各角色职责

```mermaid
sequenceDiagram
    actor U as 用户
    participant AI as AI Agent
    participant FE as 前端框架
    participant BE as 后端服务
    participant KS as Kimi 服务

    U->>AI: 提供文章链接
    AI->>FE: 调用 readArticle

    Note over FE,BE: 前端职责：发起请求、传递参数
    FE->>BE: POST /api/platform/parse

    Note over BE: 后端职责：解析、下载、上传、格式化
    BE->>BE: 解析 HTML 转 Markdown
    BE->>BE: 提取图片 URLs
    loop 逐张处理
        BE->>BE: 下载图片到临时目录
        BE->>KS: POST /v1/files
        KS-->>BE: 返回 file_id
        BE->>BE: 替换 Markdown 图片 URL
    end
    BE->>BE: 全文加行号

    BE-->>FE: 返回结构化数据
    FE-->>AI: ToolResult

    Note over AI: AI 职责：理解文本、引用内容
    AI->>AI: 阅读带行号 Markdown

    AI->>FE: 后续对话请求
    FE->>BE: POST /api/chat

    Note over BE,KS: 消息层职责：格式转换
    BE->>BE: 检测 ms file_id
    BE->>BE: 转成 image_url
    BE->>KS: 发送多模态消息
    KS-->>BE: AI 响应

    BE-->>FE: SSE 流传输
    FE->>U: 显示回复
```

---

## 总结

本文档用 7 种 UML 图完整覆盖了 Agent 工具调用的各个环节：

| 图表类型 | 说明 | 重点关注 |
|----------|------|----------|
| 完整时序图 | 从用户输入到 AI 回复的全链路 | 附件预处理、消息转换、工具执行循环 |
| 核心流程时序图 | 多模态文章解析的详细步骤 | ms file_id 的生成与消费 |
| 活动图 | 工具调用的决策分支 | 模型类型判断、参数选择 |
| 组件图 | 系统分层架构 | 前端、后端、外部服务的职责边界 |
| 状态图 | 工具调用的生命周期 | 状态转换条件 |
| 数据流图 | 图片处理的两种路径 | OCR vs file_id 的对比 |
| 泳道图 | 各角色的职责划分 | 用户、AI、前端、后端、Kimi 的分工 |
