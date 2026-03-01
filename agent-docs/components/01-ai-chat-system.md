# AI 聊天系统组件设计

## 组件架构

```
AI Chat System
├── Core (核心层)
│   ├── tools/           # 工具系统
│   ├── skills/          # 技能系统
│   ├── services/        # 服务层
│   └── types/           # 类型定义
├── Modules (模块层)
│   ├── chat/            # 聊天模块
│   │   ├── input/       # 输入组件
│   │   ├── message/     # 消息组件
│   │   └── history/     # 历史记录
│   └── agent/           # Agent 模块
├── Layouts (布局层)
│   ├── ChatLayout.vue   # 聊天布局
│   └── AgentLayout.vue  # Agent 布局
└── UI (UI层)
    ├── Icon.vue         # 图标组件
    ├── Button.vue       # 按钮组件
    └── Modal.vue        # 弹窗组件
```

---

## 1. 工具系统 (tools/)

### 1.1 工具注册表 (registry.ts)

**功能**：管理所有工具的注册、查询和执行。

```typescript
// 核心函数
export function registerTool(name: string, tool: ToolRegistration): void
export function registerTools(tools: ToolRegistration[]): void
export function getTool(name: string): ToolRegistration | undefined
export function executeTool(name: string, args: Record<string, any>): Promise<string>
export function getToolDefinitions(): ToolDefinition[]
```

**数据结构**

```typescript
interface ToolRegistration {
  name: string
  definition: ToolDefinition        // JSON Schema 定义
  executor: ToolExecutor           // 执行函数
}

type ToolExecutor = (args: Record<string, any>) => Promise<string>
```

**使用示例**

```typescript
// 注册单个工具
registerTool('read_file', {
  name: 'read_file',
  definition: readFileDef,
  executor: readFile
})

// 批量注册
registerTools([
  { name: 'tool1', definition: def1, executor: exec1 },
  { name: 'tool2', definition: def2, executor: exec2 }
])

// 执行工具
const result = await executeTool('read_file', { path: 'docs/readme.md' })
```

### 1.2 工具定义 (definitions.ts)

**功能**：所有工具的 JSON Schema 定义，用于告诉 AI 工具的用途和参数。

**工具分类**

| 类别 | 工具数量 | 示例 |
|------|---------|------|
| 文章管理 | 6 | get_article_content, create_article |
| 文件操作 | 3 | read_file, write_file, list_files |
| 网络工具 | 4 | web_search, fetch_url, fetch_arxiv |
| GitHub | 6 | github_get_repo, github_search_code |
| 代码工具 | 3 | execute_code, analyze_code |
| 平台解析 | 10 | parse_zhihu, parse_bilibili, parse_twitter |
| 富文本 | 4 | create_rich_article, insert_images |
| 其他 | 8 | calculate, translate_text, get_weather |

**定义示例**

```typescript
export const getArticleContentDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_article_content',
    description: '获取指定文章的内容。仅在用户要求查看某篇文章时使用...',
    parameters: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: '文章路径' 
        },
        max_length: {
          type: 'number',
          description: '最大返回字符数'
        }
      },
      required: ['path']
    }
  }
}
```

### 1.3 平台解析工具 (platform-parsers-extended.ts)

**功能**：解析各大社交媒体平台的内容。

**实现原理**

```typescript
// 1. 提取平台 ID
const bvMatch = url.match(/bv([a-zA-Z0-9]+)/i)
const videoId = bvMatch ? bvMatch[1] : null

// 2. 调用后端代理（避免 CORS）
const response = await fetch('/api/proxy/bilibili', {
  method: 'POST',
  body: JSON.stringify({ video_id: videoId })
})

// 3. 格式化输出
return `📺 **${data.title}**
👤 UP主: ${data.owner.name}
▶️ 播放量: ${data.stat.view}
🔗 ${url}`
```

**平台列表**

| 平台 | 解析方式 | 特点 |
|------|---------|------|
| B站 | 后端代理 | 提取 BV 号调用 API |
| 抖音 | 后端代理 | 反爬严格，可能失败 |
| CSDN | 网页抓取 | HTML 提取 |
| 掘金 | 公开 API | juejin.cn API |
| 微博 | 通用解析 | 反爬严格 |
| Twitter | Nitter 代理 | 使用 Nitter 镜像 |
| YouTube | oEmbed API | 无需 API Key |

---

## 2. 技能系统 (skills/)

### 2.1 Skill 定义

**功能**：将多个工具组合成场景化的能力。

```typescript
interface Skill {
  id: string
  name: string
  description: string
  icon: string
  category: string
  content: string           // 详细说明（Markdown）
  tools: string[]          // 绑定的工具列表
  usageScenarios: string[] // 使用场景
  isBuiltIn: boolean
}
```

**示例 Skill**

```typescript
const writerSkill = {
  id: 'writer',
  name: '文章管理',
  description: '知识库文章的管理和写作能力',
  icon: '✍️',
  category: 'content',
  content: `
## 工作流程
1. 使用 search_articles 搜索文章
2. 使用 get_article_content 读取内容
3. 使用 create_article 创建新文章
4. 使用 update_article 更新文章
  `,
  tools: ['search_articles', 'get_article_content', 'create_article', 'update_article'],
  usageScenarios: ['用户要求创建文章', '用户要求搜索文章'],
  isBuiltIn: true
}
```

### 2.2 Skill 绑定

**Agent 配置中的 Skill 使用**

```typescript
interface AgentCapabilities {
  mode: 'raw' | 'tools-only' | 'skills-only' | 'hybrid'
  skillIds: string[]      // 选中的 Skills
  toolIds: string[]       // 额外选择的工具（hybrid 模式）
}
```

**模式说明**

| 模式 | 说明 | 使用场景 |
|------|------|---------|
| raw | 纯提示词，无工具 | 简单对话 |
| tools-only | 手动选择工具 | 精确控制 |
| skills-only | 只使用 Skill 绑定的工具 | 推荐方式 |
| hybrid | Skill + 额外工具 | 灵活组合 |

---

## 3. 服务层 (services/)

### 3.1 AI 服务 (aiService.ts)

**功能**：封装 LLM API 调用，支持流式输出和工具调用。

```typescript
class AIService {
  // 发送消息
  async sendMessage(params: {
    messages: Message[]
    tools?: ToolDefinition[]
    model?: string
    temperature?: number
    onChunk?: (chunk: string) => void
    onToolCall?: (toolCall: ToolCall) => void
  }): Promise<string>
  
  // 构建系统提示词
  buildSystemPrompt(agent: Agent): string
  
  // 处理工具调用循环
  async handleToolLoop(
    messages: Message[],
    tools: ToolDefinition[],
    onToolCall: (call: ToolCall) => void
  ): Promise<string>
}
```

**调用流程**

```
用户输入
    ↓
构建 messages（包含历史记录）
    ↓
调用 LLM API（流式）
    ↓
检查响应类型：
    ├── 普通文本 → 直接返回
    └── 工具调用 → 执行工具 → 结果返回 LLM → 再次调用
```

### 3.2 多媒体服务 (multimediaService.ts)

**功能**：处理图片、视频的上传和 Base64 编码（用于 Kimi）。

```typescript
// 文件转 Base64
export function fileToBase64(file: File): Promise<string>

// 构建 Kimi 图片消息
export function buildKimiImageContent(base64: string, mimeType: string): {
  type: 'image_url'
  image_url: { url: string }
}

// 构建 Kimi 视频消息
export function buildKimiVideoContent(base64: string, mimeType: string): {
  type: 'video_url'
  video_url: { url: string }
}

// 获取图片尺寸
export function getImageDimensions(file: File): Promise<{width: number, height: number}>

// 获取视频信息
export function getVideoInfo(file: File): Promise<{
  duration: number
  width: number
  height: number
}>

// 生成视频缩略图
export function generateVideoThumbnail(file: File, time?: number): Promise<string>
```

**使用示例**

```typescript
// 上传图片并发送给 Kimi
const file = imageInput.files[0]
const base64 = await fileToBase64(file)
const imageContent = buildKimiImageContent(base64, file.type)

const messages = [
  { role: 'user', content: [
    imageContent,
    { type: 'text', text: '描述这张图片' }
  ]}
]

const response = await aiService.sendMessage({ messages, model: 'kimi-k2.5' })
```

### 3.3 存储服务 (agentChatStorage.ts)

**功能**：管理聊天记录的本地存储。

```typescript
export const agentChatStorage = {
  // 保存消息
  saveMessage(agentId: string, message: Message): void
  
  // 获取历史
  getMessages(agentId: string, limit?: number): Message[]
  
  // 清空历史
  clearMessages(agentId: string): void
  
  // 导出对话
  exportConversation(agentId: string): string
}
```

---

## 4. 聊天模块 (modules/chat/)

### 4.1 增强输入框 (ChatInputEnhanced.vue)

**功能**：支持文本、图片、视频、链接的多模态输入。

**组件结构**

```vue
<template>
  <div class="chat-input-enhanced">
    <!-- 附件预览 -->
    <AttachmentsPreview 
      v-if="attachments.length > 0"
      :attachments="attachments"
      @remove="removeAttachment"
    />
    
    <!-- 输入区域 -->
    <div class="input-container">
      <!-- 附件按钮 -->
      <AttachButton @click="toggleAttachMenu" />
      
      <!-- 文本输入 -->
      <MentionInput
        v-model="inputValue"
        :placeholder="placeholder"
        @send="handleSend"
      />
      
      <!-- 发送按钮 -->
      <SendButton @click="handleSend" />
    </div>
    
    <!-- 附件菜单 -->
    <AttachMenu
      v-if="showAttachMenu"
      @select-image="triggerImageInput"
      @select-video="triggerVideoInput"
      @select-file="triggerFileInput"
      @add-link="showLinkInput = true"
    />
  </div>
</template>
```

**Props**

```typescript
interface Props {
  modelValue: string           // 输入值
  isStreaming: boolean         // 是否正在输出
  selectedSkill?: Skill        // 选中的 Skill
  supportsVision?: boolean     // 是否支持视觉
  supportsVideo?: boolean      // 是否支持视频
  maxAttachments?: number      // 最大附件数
}
```

**Emits**

```typescript
interface Emits {
  'update:modelValue': [value: string]
  'send': [content: string, attachments: MessageAttachment[], skill?: Skill]
  'stop': []
}
```

**核心逻辑**

```typescript
// 处理文件选择
async function handleFileSelect(event: Event, type: 'image' | 'video' | 'file') {
  const files = (event.target as HTMLInputElement).files
  
  for (const file of Array.from(files)) {
    // 检查文件类型和大小
    const check = isSupportedFile(file)
    if (!check.supported) {
      alert(check.reason)
      continue
    }
    
    // 创建附件对象
    const attachment: MessageAttachment = {
      id: `temp_${Date.now()}`,
      type: detectMediaType(file),
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      mimeType: file.type,
      uploadStatus: 'pending'
    }
    
    attachments.value.push(attachment)
    
    // 上传文件
    await uploadFile(file, attachment)
  }
}

// 发送消息
async function handleSend() {
  const finalContent = buildFinalContent(inputValue.value)
  
  emit('send', finalContent, attachments.value, selectedSkill.value)
  
  // 重置状态
  inputValue.value = ''
  attachments.value = []
}
```

### 4.2 消息组件 (ChatMessage.vue)

**功能**：渲染用户和 AI 的消息，支持 Markdown、代码高亮、工具调用痕迹。

**消息类型**

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: MessageAttachment[]
  toolCalls?: ToolCallRecord[]    // 工具调用记录
  timestamp: number
}
```

**渲染逻辑**

```vue
<template>
  <div class="chat-message" :class="message.role">
    <!-- 头像 -->
    <Avatar :role="message.role" />
    
    <!-- 内容 -->
    <div class="message-content">
      <!-- 附件 -->
      <AttachmentList 
        v-if="message.attachments?.length"
        :attachments="message.attachments"
      />
      
      <!-- 文本（Markdown） -->
      <MarkdownRenderer :content="message.content" />
      
      <!-- 工具调用痕迹 -->
      <ToolTrace 
        v-if="message.toolCalls?.length"
        :toolCalls="message.toolCalls"
      />
    </div>
  </div>
</template>
```

### 4.3 工具痕迹组件 (ToolTrace.vue)

**功能**：展示 AI 调用工具的过程和结果。

```vue
<template>
  <div class="tool-trace">
    <div 
      v-for="call in toolCalls" 
      :key="call.id"
      class="tool-call-item"
      :class="call.status"
    >
      <!-- 工具图标和名称 -->
      <Icon :name="getToolIcon(call.toolName)" />
      <span class="tool-name">{{ call.toolName }}</span>
      
      <!-- 状态 -->
      <span class="status-badge">{{ call.status }}</span>
      
      <!-- 参数（可展开） -->
      <details v-if="call.args">
        <summary>参数</summary>
        <pre>{{ JSON.stringify(call.args, null, 2) }}</pre>
      </details>
      
      <!-- 结果 -->
      <details v-if="call.result">
        <summary>结果</summary>
        <pre>{{ call.result }}</pre>
      </details>
    </div>
  </div>
</template>
```

---

## 5. 状态管理 (stores/)

### 5.1 Chat Store (chatStore.ts)

**功能**：管理聊天会话的全局状态。

```typescript
interface ChatState {
  currentAgentId: string | null
  messages: Map<string, Message[]>  // agentId -> messages
  isStreaming: boolean
  currentSkill: Skill | null
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    currentAgentId: null,
    messages: new Map(),
    isStreaming: false,
    currentSkill: null
  }),
  
  actions: {
    // 发送消息
    async sendMessage(content: string, attachments?: MessageAttachment[]) {
      // 1. 添加用户消息
      this.addMessage({
        role: 'user',
        content,
        attachments
      })
      
      // 2. 调用 AI
      this.isStreaming = true
      const response = await this.callAI(content)
      
      // 3. 添加 AI 消息
      this.addMessage({
        role: 'assistant',
        content: response
      })
      
      this.isStreaming = false
    },
    
    // 切换 Agent
    switchAgent(agentId: string) {
      this.currentAgentId = agentId
      // 加载历史消息
      if (!this.messages.has(agentId)) {
        this.messages.set(agentId, agentChatStorage.getMessages(agentId))
      }
    }
  }
})
```

---

## 6. 组件使用示例

### 完整聊天界面

```vue
<template>
  <ChatLayout>
    <!-- 侧边栏：Agent 列表 -->
    <template #sidebar>
      <AgentList 
        :agents="agents"
        :current-id="currentAgentId"
        @select="switchAgent"
      />
    </template>
    
    <!-- 主区域：消息列表 -->
    <template #main>
      <MessageList 
        :messages="currentMessages"
        :is-streaming="isStreaming"
      />
      
      <ChatInputEnhanced
        v-model="inputValue"
        :is-streaming="isStreaming"
        :selected-skill="currentSkill"
        :supports-vision="currentAgent?.supportsVision"
        :supports-video="currentAgent?.supportsVideo"
        @send="sendMessage"
        @stop="stopGeneration"
      />
    </template>
  </ChatLayout>
</template>

<script setup>
import { useChatStore } from '../stores/chatStore'
import ChatLayout from '../layouts/ChatLayout.vue'
import AgentList from './AgentList.vue'
import MessageList from './MessageList.vue'
import ChatInputEnhanced from './input/ChatInputEnhanced.vue'

const store = useChatStore()
const { currentAgentId, currentMessages, isStreaming } = storeToRefs(store)

async function sendMessage(content, attachments, skill) {
  await store.sendMessage(content, attachments, skill)
}
</script>
```

---

## 7. 组件开发规范

### 命名规范
- 组件名：PascalCase（如 `ChatInputEnhanced.vue`）
- 文件名：kebab-case（如 `chat-input-enhanced.ts`）
- Props：camelCase
- 事件：kebab-case（如 `@tool-call`）

### 类型安全
```typescript
// 定义 Props 类型
interface Props {
  modelValue: string
  maxLength?: number
}

// 使用 withDefaults 提供默认值
const props = withDefaults(defineProps<Props>(), {
  maxLength: 2000
})

// 定义 Emits
type Emits = {
  'update:modelValue': [value: string]
  'send': [content: string]
}
const emit = defineEmits<Emits>()
```

### 样式规范
- 使用 scoped CSS
- BEM 命名法（如 `.chat-input__button--primary`）
- CSS 变量统一管理主题色
