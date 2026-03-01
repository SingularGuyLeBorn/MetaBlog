# 场景四：多模态 AI 对话（图片/视频理解）

## 场景描述

用户上传图片或视频，AI 进行内容理解、分析和回答相关问题。支持 Kimi 的多模态能力。

## 参与角色

- **多媒体分析 Agent**：专门处理图像/视频的 Agent
- **ChatInputEnhanced**：支持多模态输入的增强输入框
- **multimediaService**：多媒体处理服务
- **工具**：process_image（OCR、分析）

## 完整流程

### 步骤 1：上传图片

**用户操作**
```
1. 拖拽图片到输入框，或点击附件按钮选择图片
2. 输入问题："这张图片里的代码有什么问题？"
3. 按 Enter 发送
```

**前端处理**

```typescript
// ChatInputEnhanced.vue
async function handleFileSelect(event: Event, type: 'image' | 'video') {
  const files = (event.target as HTMLInputElement).files
  
  for (const file of Array.from(files)) {
    // 1. 验证文件
    const check = isSupportedFile(file)
    if (!check.supported) {
      alert(check.reason)
      continue
    }
    
    // 2. 创建预览
    const attachment: MessageAttachment = {
      id: `temp_${Date.now()}`,
      type: 'image',
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      uploadStatus: 'uploading'
    }
    
    // 3. 获取图片尺寸
    const dims = await getImageDimensions(file)
    attachment.width = dims.width
    attachment.height = dims.height
    
    attachments.value.push(attachment)
    
    // 4. 上传到服务器
    const uploaded = await uploadFile(file)
    attachment.url = uploaded.url
    attachment.id = uploaded.id
    attachment.uploadStatus = 'completed'
  }
}
```

### 步骤 2：构建多模态消息

```typescript
// 准备发送的消息
const message = {
  role: 'user',
  content: [
    // 图片部分（Base64）
    {
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${base64Data}`
      }
    },
    // 文本部分
    {
      type: 'text',
      text: '这张图片里的代码有什么问题？'
    }
  ]
}
```

### 步骤 3：AI 分析图片

```typescript
// aiService.ts
async function sendMultimodalMessage(params: {
  text: string
  attachments: MessageAttachment[]
  model: string
}) {
  const contentParts = []
  
  // 1. 添加图片
  for (const attachment of params.attachments) {
    if (attachment.type === 'image') {
      // 获取 Base64
      const base64 = await fetch(attachment.url)
        .then(r => r.blob())
        .then(blob => fileToBase64(blob))
      
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${attachment.mimeType};base64,${base64}`
        }
      })
    } else if (attachment.type === 'video') {
      // 视频处理（类似）
      const base64 = await fetch(attachment.url)
        .then(r => r.blob())
        .then(blob => fileToBase64(blob))
      
      contentParts.push({
        type: 'video_url',
        video_url: {
          url: `data:${attachment.mimeType};base64,${base64}`
        }
      })
    }
  }
  
  // 2. 添加文本
  contentParts.push({
    type: 'text',
    text: params.text
  })
  
  // 3. 发送给 Kimi
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model,  // 'kimi-k2.5'
      messages: [{
        role: 'user',
        content: contentParts
      }],
      stream: true
    })
  })
  
  // 4. 处理流式响应
  return handleStreamResponse(response)
}
```

### 步骤 4：AI 回复示例

**用户上传的代码截图**
```javascript
function fetchData() {
  const data = fetch('/api/data')
  console.log(data.name)  // ❌ 这里有问题
}
```

**AI 分析回复**
```
我发现了几个问题：

🔴 **严重：异步处理错误**
```javascript
const data = fetch('/api/data')
console.log(data.name)
```
`fetch` 返回的是 Promise，你需要等待它完成：
```javascript
const data = await fetch('/api/data')
const json = await data.json()
console.log(json.name)
```

🟡 **警告：缺少错误处理**
建议添加 try-catch：
```javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) throw new Error('Network error')
    const data = await response.json()
    console.log(data.name)
  } catch (error) {
    console.error('Fetch error:', error)
  }
}
```

需要我帮你修复这段代码吗？
```

## 多图输入

**场景**：用户上传多张图片进行比较

```typescript
// 用户上传 3 张设计稿
const attachments = [image1, image2, image3]

const message = {
  role: 'user',
  content: [
    { type: 'image_url', image_url: { url: base64_1 } },
    { type: 'image_url', image_url: { url: base64_2 } },
    { type: 'image_url', image_url: { url: base64_3 } },
    { type: 'text', text: '这三张设计稿各有什么优缺点？推荐用哪一版？' }
  ]
}
```

**AI 回复**
```
我来对比这三张设计稿：

### 设计稿 A
✅ 优点：
- 布局清晰，信息层级分明
- 配色专业，符合品牌调性

❌ 缺点：
- 按钮不够突出，CTA 较弱

### 设计稿 B
✅ 优点：
- 视觉冲击力强
- 动画效果丰富

❌ 缺点：
- 加载可能较慢
- 移动端适配待优化

### 设计稿 C
✅ 优点：
- 简洁大方
- 加载速度快

❌ 缺点：
- 特色不够突出

## 🏆 推荐：设计稿 A

理由：
1. 在美观和性能之间取得平衡
2. 用户体验更友好
3. 开发和维护成本适中

建议在设计稿 A 的基础上，增强按钮的视觉权重。
```

## 视频理解

**场景**：用户上传视频，AI 分析内容

```typescript
// 用户上传教学视频
const videoAttachment = {
  type: 'video',
  name: 'react-tutorial.mp4',
  mimeType: 'video/mp4'
}

// 构建消息
const message = {
  role: 'user',
  content: [
    {
      type: 'video_url',
      video_url: {
        url: `data:video/mp4;base64,${videoBase64}`
      }
    },
    {
      type: 'text',
      text: '这个视频讲了什么？帮我总结一下要点。'
    }
  ]
}
```

**AI 回复**
```
视频内容总结：

## 📹 React Hooks 深度解析

### 主要内容
1. **useState 原理** (0:00 - 5:30)
   - 状态持久化机制
   - 批量更新策略

2. **useEffect 陷阱** (5:30 - 12:00)
   - 依赖数组的正确使用
   - 常见的无限循环问题

3. **自定义 Hooks** (12:00 - 18:00)
   - 封装通用逻辑
   - 最佳实践

### 关键代码片段
```javascript
// 视频中提到的最佳实践
function useAsyncEffect(effect, deps) {
  useEffect(() => {
    const cleanup = effect()
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup()
      }
    }
  }, deps)
}
```

### 学习建议
- 重点理解 8:20 处的依赖数组示例
- 建议跟着 15:30 的实战练习

需要我针对某个部分详细解释吗？
```

## 图片 + 文字混合创作

**场景**：用户提供设计图，AI 帮助写前端代码

```
用户: [上传设计图] + "帮我根据这个设计图写 React 组件代码"
```

**AI 回复**
```
根据你的设计图，我为你生成了以下代码：

```tsx
// Card.tsx
interface CardProps {
  title: string
  description: string
  image: string
  price: number
  onBuy: () => void
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  image,
  price,
  onBuy
}) => {
  return (
    <div className="card">
      <img src={image} alt={title} className="card-image" />
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
        <div className="card-footer">
          <span className="card-price">¥{price}</span>
          <button onClick={onBuy} className="card-button">
            立即购买
          </button>
        </div>
      </div>
    </div>
  )
}
```

```css
/* Card.css */
.card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  background: white;
}

.card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.card-content {
  padding: 16px;
}

/* ... */
```

需要我补充其他功能吗？
```

## 技术细节

### 支持的图片格式
- PNG (`image/png`)
- JPEG (`image/jpeg`)
- WebP (`image/webp`)
- GIF (`image/gif`)

### 支持的视频格式
- MP4 (`video/mp4`)
- MOV (`video/mov`)
- WebM (`video/webm`)
- AVI (`video/avi`)

### 文件大小限制
- 图片：最大 20MB
- 视频：最大 100MB

### 性能优化
- 图片自动压缩（超过 2048px 时）
- 视频生成缩略图
- Base64 缓存避免重复编码
