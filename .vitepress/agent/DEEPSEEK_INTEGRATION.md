# DeepSeek 集成指南

项目已内置 DeepSeek 支持，只需配置即可使用。

## 1. 配置 .env 文件

在项目根目录 `.env` 文件中添加：

```bash
# DeepSeek 配置
VITE_DEEPSEEK_API_KEY=your-deepseek-api-key
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com
VITE_DEEPSEEK_MODEL=deepseek-chat  # 或 deepseek-reasoner

# 设置默认使用 DeepSeek
VITE_LLM_DEFAULT_PROVIDER=deepseek
```

## 2. 前端聊天组件示例

### 基础聊天组件

```vue
<template>
  <div class="chat-container">
    <!-- 消息列表 -->
    <div class="messages">
      <div 
        v-for="msg in messages" 
        :key="msg.id"
        :class="['message', msg.role]"
      >
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
        <div class="content">
          <div v-if="msg.reasoning" class="reasoning">
            💭 {{ msg.reasoning }}
          </div>
          <div class="text">{{ msg.content }}</div>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="message assistant loading">
        <div class="avatar">🤖</div>
        <div class="content">思考中...</div>
      </div>
    </div>
    
    <!-- 输入框 -->
    <div class="input-area">
      <textarea
        v-model="userInput"
        @keydown.enter.prevent="sendMessage"
        placeholder="输入消息..."
        :disabled="isLoading"
      />
      <button @click="sendMessage" :disabled="isLoading || !userInput.trim()">
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getLLMManager } from '../llm'

const messages = ref<Array<{
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
}>>([])

const userInput = ref('')
const isLoading = ref(false)

// 获取 LLM Manager
const llm = getLLMManager()

// 发送消息
async function sendMessage() {
  const content = userInput.value.trim()
  if (!content || isLoading.value) return
  
  // 添加用户消息
  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    content
  })
  
  userInput.value = ''
  isLoading.value = true
  
  try {
    // 使用 DeepSeek 发送请求
    const response = await llm.chat('deepseek', {
      messages: messages.value.map(m => ({
        role: m.role,
        content: m.content
      })),
      model: 'deepseek-chat',  // 或 'deepseek-reasoner'
      temperature: 0.7,
      maxTokens: 4096
    })
    
    // 添加助手回复
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content
    })
    
  } catch (error) {
    console.error('Chat error:', error)
    messages.value.push({
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '❌ 发送失败，请检查配置'
    })
  } finally {
    isLoading.value = false
  }
}

// 流式聊天
async function sendMessageStream() {
  const content = userInput.value.trim()
  if (!content || isLoading.value) return
  
  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    content
  })
  
  userInput.value = ''
  isLoading.value = true
  
  // 创建助手消息占位
  const assistantMsg = {
    id: (Date.now() + 1).toString(),
    role: 'assistant' as const,
    content: ''
  }
  messages.value.push(assistantMsg)
  
  try {
    await llm.chatStream(
      'deepseek',
      {
        messages: messages.value
          .filter(m => m.role !== 'assistant' || m.content !== '')
          .map(m => ({ role: m.role, content: m.content })),
        model: 'deepseek-chat',
        stream: true
      },
      (chunk) => {
        // 实时更新消息内容
        assistantMsg.content += chunk.content
      }
    )
  } catch (error) {
    console.error('Stream error:', error)
    assistantMsg.content = '❌ 发送失败'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f5f5f5;
}

.message.user .content {
  background: #007bff;
  color: white;
}

.reasoning {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 8px;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  height: 60px;
}

button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
}
</style>
</template>
```

### 使用 DeepSeek Reasoner（思考模式）

```typescript
import { getLLMManager } from '../llm'

const llm = getLLMManager()

// 使用 deepseek-reasoner（会返回思考过程）
async function chatWithReasoning() {
  const response = await llm.chat('deepseek', {
    messages: [{ role: 'user', content: '解方程 2x + 5 = 13' }],
    model: 'deepseek-reasoner',  // 思考模式
    maxTokens: 8192  // reasoner 支持更长输出
  })
  
  // 如果有思考过程
  if (response.reasoningContent) {
    console.log('思考过程:', response.reasoningContent)
  }
  
  console.log('最终答案:', response.content)
}
```

## 3. 在 Agent 中使用

```typescript
import { AgentRuntime } from './core/AgentRuntime'

// 获取 Agent 实例
const agent = AgentRuntime.getInstance({
  mode: 'COLLAB',
  enableCostTracking: true
})

// 处理用户输入（自动使用配置的 DeepSeek）
async function handleUserInput(input: string) {
  const response = await agent.processInput(input, {
    currentFile: 'article.md'
  })
  
  console.log('Agent 回复:', response.content)
  console.log('Token 消耗:', response.metadata?.tokens)
  console.log('成本:', response.metadata?.cost)
}
```

## 4. 直接使用 Provider

```typescript
import { DeepSeekProvider } from './llm/providers/deepseek'

const deepseek = new DeepSeekProvider({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 4096
})

// 普通聊天
const response = await deepseek.chat({
  messages: [{ role: 'user', content: 'Hello!' }]
})

// 流式聊天
await deepseek.chatStream(
  { messages: [...] },
  (chunk) => {
    console.log(chunk.content)  // 实时输出
  }
)
```

## 5. 可用的 DeepSeek 模型

| 模型 | 说明 | 输出长度 |
|:---|:---|:---:|
| `deepseek-chat` | 日常对话，快速响应 | 8K |
| `deepseek-coder` | 代码生成 | 8K |
| `deepseek-reasoner` | 深度推理，思维链 | 64K |

## 6. 价格参考

| 类型 | 价格（人民币） |
|:---|:---|
| 输入（缓存命中） | ¥0.2/百万 tokens |
| 输入（缓存未命中） | ¥2/百万 tokens |
| 输出 | ¥3/百万 tokens |

## 7. 故障排查

### API Key 无效
```
❌ 错误：401 Unauthorized
✅ 解决：检查 .env 中的 VITE_DEEPSEEK_API_KEY 是否正确
```

### 模型不存在
```
❌ 错误：Model not found
✅ 解决：确认模型名称为 deepseek-chat 或 deepseek-reasoner
```

### 网络错误
```
❌ 错误：Network error
✅ 解决：检查 VITE_DEEPSEEK_BASE_URL 是否为 https://api.deepseek.com
```

## 8. 完整示例

查看 `theme/components/AIChatOrb.vue` 获取完整的前端聊天实现。
