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

**Skill 目录结构**

```
.skills/
└── writing-master/           # Skill 目录
    └── SKILL.md              # Skill 定义文件
```

**SKILL.md 格式**

```markdown
# 文章大师

## 描述
专业写作助手，擅长各类文本创作和编辑

## 元数据
- **ID**: skill-writing-master
- **图标**: ✍️
- **分类**: writing
- **版本**: 1.0.0

## 可用工具
- summarize_text: 生成文本摘要
- format_text: 格式化文本
- create_article: 创建文章
- update_article: 更新文章

---

## Prompt

你是一位专业的写作助手，擅长各类文本创作。

### 职责范围
1. 文章撰写和润色
2. 文案创作
3. 内容编辑和校对

### 工具使用指南

**create_article**
- 何时使用：用户明确要求创建文章时
- 参数说明：
  - title: 文章标题（简洁明了）
  - path: 文件路径（如 "knowledge/my-article.md"）
  - content: 文章内容（Markdown 格式）
  - tags: 标签数组（可选）
- 示例：
  ```
  title: "React 最佳实践"
  path: "frontend/react-best-practices.md"
  content: "# React 最佳实践..."
  tags: ["React", "前端"]
  ```

### 输出风格
- 流畅自然的语言表达
- 符合目标受众的语气
- 结构清晰，逻辑连贯
```

**重要说明**

- `---` 分隔线以上的内容是**元数据**，用于 Skill 列表展示
- `---` 分隔线以下的内容是**Prompt**，在 Skill 被调用时注入对话
- Prompt 中应包含**详细的工具使用说明**，帮助 AI 正确使用工具

### 2.2 Skill 加载机制（Claude Code 模式）

**核心设计原则**

采用 Claude Code 的 Skills 模式：
1. Agent 只配置**可用 Skills 列表**（名称 + 描述）
2. **不预加载**任何 Skill 的详细内容
3. AI 根据对话上下文**自行判断**何时加载哪个 Skill
4. Skill 的详细内容（包括工具定义）在调用时**动态注入**

**Agent 配置**

```typescript
interface AgentCapabilities {
  // 基础身份定义
  baseRole: string
  
  // 可用 Skills 列表（仅名称和描述）
  availableSkills: Array<{
    name: string
    description: string
  }>
}
```

**系统提示词构建**

```typescript
function buildSystemPrompt(agent: Agent): string {
  let prompt = `## 身份\n${agent.baseRole}\n\n`
  
  // 只列出可用 Skills，不加载详细内容
  prompt += `## 可用 Skills\n\n`
  for (const skill of agent.availableSkills) {
    prompt += `### ${skill.name}\n${skill.description}\n\n`
  }
  
  prompt += `## 使用说明\n`
  prompt += `请根据用户需求，自行判断是否需要调用某个 Skill。\n`
  prompt += `如果需要，请说明你要使用哪个 Skill，我会为你加载详细能力。`
  
  return prompt
}
```

**Skill 动态加载**

```typescript
// 当 AI 表示要使用某个 Skill 时
async function loadSkill(skillId: string): Promise<string> {
  const skillPath = `.skills/${skillId}/SKILL.md`
  const content = fs.readFileSync(skillPath, 'utf-8')
  
  // 提取 Prompt 部分（--- 之后的内容）
  const promptMatch = content.match(/---\s*\n([\s\S]+)/)
  return promptMatch ? promptMatch[1] : content
}

// 注入到对话上下文
const skillContent = await loadSkill('writing-master')
messages.push({
  role: 'system',
  content: `[加载 Skill: 文章大师]\n\n${skillContent}`
})
```

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
