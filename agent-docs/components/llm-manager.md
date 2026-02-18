# LLMManager 组件详细设计

## 基本信息

| 属性 | 值 |
|-----|-----|
| **层级** | L2 - 运行时与观察层 |
| **文件位置** | `.vitepress/agent/llm/manager.ts` |
| **实现状态** | ✅ 已实现 |
| **完成度** | 90% |

## 功能设计

### 核心职责
LLMManager 是大语言模型的统一管理器，负责：
1. **多 Provider 管理**: 支持 7 个 LLM 提供商
2. **统一接口**: 提供一致的 chat/chatStream 接口
3. **故障切换**: 主 Provider 故障时自动切换
4. **成本追踪**: Token 统计和费用计算
5. **预算控制**: 日预算限制和告警

### 支持的 Provider

| Provider | 默认模型 | 成本/1K tokens | 特点 | 状态 |
|---------|---------|---------------|------|------|
| **DeepSeek** | deepseek-chat | $0.001 | 中文优化、快速 | ✅ 已实现 |
| **OpenAI** | gpt-4-turbo | $0.01 | 最强性能 | ✅ 已实现 |
| **Anthropic** | claude-3-opus | $0.015 | 代码能力强 | ✅ 已实现 |
| **Gemini** | gemini-pro | $0.0005 | 性价比高 | ✅ 已实现 |
| **Moonshot** | kimi-latest | $0.005 | 长上下文(200K) | ✅ 已实现 |
| **Qwen** | qwen-max | - | 阿里通义 | ✅ 已实现 |
| **Zhipu** | glm-4 | - | 智谱 AI | ✅ 已实现 |

## 交互方式

### 对外接口

```typescript
class LLMManager {
  // 获取 Provider
  getProvider(type?: ProviderType): LLMProvider
  getAvailableProviders(): ProviderType[]
  
  // 非流式聊天
  chat(request: LLMRequest, providerType?: ProviderType): Promise<LLMResponse & { cost: number }>
  
  // 流式聊天
  chatStream(
    request: LLMRequest, 
    onChunk: (chunk: LLMStreamChunk) => void,
    providerType?: ProviderType
  ): Promise<{ usage: LLMUsage; cost: number }>
  
  // 预算管理
  isOverBudget(): boolean
  getRemainingBudget(): number
  getUsageStats(): UsageStats
  
  // 模型信息
  getAvailableModels(): Array<{ provider: ProviderType; models: string[] }>
  estimateTokens(text: string): number
}
```

### 请求/响应类型

```typescript
interface LLMRequest {
  messages: LLMMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface LLMStreamChunk {
  content: string
  finishReason?: string
}
```

### Provider 接口

```typescript
interface LLMProvider {
  readonly name: string
  readonly defaultModel: string
  readonly supportedModels: string[]
  
  chat(request: LLMRequest): Promise<LLMResponse>
  chatStream(request: LLMRequest, handler: (chunk: string) => void): Promise<void>
  calculateCost(usage: LLMUsage): number
  estimateTokens(text: string): number
  isHealthy(): Promise<boolean>
}
```

### 与其他组件交互

```
Skill.handler (L4)
    │
    ├──→ callLLM() helper
    │       │
    │       └──→ LLMManager.chat() / chatStream()
    │               │
    │               ├──→ getProvider() → Provider.chat()
    │               │
    │               ├──→ recordUsage() → CostTracker
    │               │
    │               └──→ return { content, tokens, cost }
    │
    └──→ AgentRuntime (成本记录)
```

## 实现进度

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| **Provider 注册** | ✅ 完成 | 动态注册多个 Provider |
| **统一接口** | ✅ 完成 | chat/chatStream 统一封装 |
| **流式输出** | ✅ 完成 | Server-Sent Events 实现 |
| **成本计算** | ✅ 完成 | 各 Provider 成本公式 |
| **Token 估算** | ✅ 完成 | 中文+英文混合估算 |
| **使用统计** | ✅ 完成 | 日预算、历史记录 |
| **localStorage** | ✅ 完成 | 使用量持久化 |
| **故障切换** | ⚠️ 框架 | 健康检查待完善 |
| **智能路由** | ❌ 未实现 | 按任务类型选 Provider |

## 关键实现代码

### 流式聊天

```typescript
async chatStream(
  request: LLMRequest,
  onChunk: (chunk: LLMStreamChunk) => void,
  providerType?: ProviderType
): Promise<{ usage: LLMResponse['usage']; cost: number }> {
  if (this.isOverBudget()) {
    throw new Error('Daily budget exceeded')
  }

  const provider = this.getProvider(providerType)
  let totalTokens = 0
  let fullContent = ''

  await provider.chatStream(request, (chunk) => {
    fullContent += chunk
    onChunk({ content: chunk })
  })

  // 估算 token
  const usage = {
    promptTokens: provider.estimateTokens(
      request.messages.map(m => m.content).join('\n')
    ),
    completionTokens: provider.estimateTokens(fullContent),
    totalTokens: 0
  }
  usage.totalTokens = usage.promptTokens + usage.completionTokens

  const cost = provider.calculateCost(usage)
  this.recordUsage(providerType || this.config.defaultProvider, request.model || 'unknown', usage.totalTokens, cost)

  return { usage, cost }
}
```

### 成本计算示例

```typescript
// DeepSeek
estimateCost(tokens: number): number {
  // $0.001/1K tokens (输入), $0.002/1K tokens (输出)
  return (tokens / 1000) * 0.0015  // 平均成本
}

// OpenAI
estimateCost(tokens: number, model?: string): number {
  if (model?.includes('gpt-4')) {
    return (tokens / 1000) * 0.03
  }
  return (tokens / 1000) * 0.002  // gpt-3.5
}
```

## 配置示例

```typescript
// .env
VITE_LLM_DEFAULT_PROVIDER=deepseek
VITE_LLM_DEEPSEEK_API_KEY=sk-xxx
VITE_LLM_DEEPSEEK_MODEL=deepseek-chat
VITE_LLM_OPENAI_API_KEY=sk-xxx
VITE_LLM_ANTHROPIC_API_KEY=sk-ant-xxx

// 初始化
const llmManager = createLLMManager({
  defaultProvider: 'deepseek',
  dailyBudget: 10,  // $10/天
  providers: {
    deepseek: { apiKey: 'sk-xxx', model: 'deepseek-chat' },
    openai: { apiKey: 'sk-xxx', model: 'gpt-4-turbo' },
    // ...
  }
})
```

## 待完善项

1. **故障切换**: 完善 Provider 健康检查和自动切换
2. **智能路由**: 根据任务类型自动选择最优 Provider
3. **缓存机制**: 相同查询的结果缓存
4. **请求合并**: 批量请求优化
