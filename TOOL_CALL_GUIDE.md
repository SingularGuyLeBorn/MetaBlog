# AI Chat 工具调用指南

## 概述

工具调用（Function Call）让 AI 能够"使用工具"来获取信息或执行操作。比如查询天气、搜索文章、获取当前时间等。

---

## 工具调用流程

```
用户: "北京天气如何？"
    ↓
AI 判断: 需要调用 get_weather 工具
    ↓
系统: 执行 get_weather(city="北京")
    ↓
系统: 返回结果 "晴天，25°C"
    ↓
AI: "北京今天晴天，25°C，适合出门！"
```

---

## 当前可用的工具

### 1. 获取文章内容
```typescript
name: "get_article_content"
参数: { path: string }
用途: 获取指定路径的完整文章内容
```

### 2. 搜索文章
```typescript
name: "search_articles"
参数: { query: string, limit?: number }
用途: 根据关键词搜索文章
```

### 3. 列出所有文章
```typescript
name: "list_articles"
参数: { section?: string, limit?: number }
用途: 列出所有可用文章
```

### 4. 获取当前时间
```typescript
name: "get_current_time"
参数: {}
用途: 获取当前时间
```

---

## 如何添加新工具

### 步骤 1: 在 toolRegistry.ts 中定义工具

```typescript
// .vitepress/theme/components/ai-chat/core/services/toolRegistry.ts

/**
 * 查询天气工具
 */
async function getWeather(args: Record<string, any>): Promise<string> {
  const city = args.city as string
  
  try {
    // 调用天气 API
    const response = await fetch(`https://api.weather.com/v1/current?city=${encodeURIComponent(city)}`)
    if (!response.ok) {
      return `无法获取 ${city} 的天气信息`
    }
    const data = await response.json()
    return `${city}当前天气：${data.weather}，温度 ${data.temperature}°C`
  } catch (error) {
    return `查询失败: ${error instanceof Error ? error.message : String(error)}`
  }
}
```

### 步骤 2: 注册工具

```typescript
const tools: RegisteredTool[] = [
  // ... 现有工具 ...
  
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_weather',
        description: '获取指定城市的当前天气',
        parameters: {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '城市名称，如"北京"、"上海"'
            }
          },
          required: ['city']
        }
      }
    },
    executor: getWeather
  }
]
```

### 步骤 3: 重新编译

```bash
npm run dev
```

---

## 工具定义详解

### 定义结构

```typescript
{
  type: 'function',
  function: {
    name: string,        // 工具名称（英文，无空格）
    description: string, // 工具描述（AI 根据这个决定何时使用）
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: '参数描述'
        },
        param2: {
          type: 'number',
          description: '参数描述'
        }
      },
      required: ['param1'] // 必填参数
    }
  }
}
```

### 参数类型

- `string` - 字符串
- `number` - 数字
- `boolean` - 布尔值
- `array` - 数组
- `object` - 对象

### 示例：计算器工具

```typescript
{
  definition: {
    type: 'function',
    function: {
      name: 'calculator',
      description: '执行数学计算',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '数学表达式，如"1 + 2"、"sqrt(16)"'
          }
        },
        required: ['expression']
      }
    }
  },
  executor: async (args) => {
    try {
      // 注意：实际使用需要安全的计算方式
      const result = eval(args.expression)
      return `计算结果: ${result}`
    } catch {
      return '计算错误，请检查表达式'
    }
  }
}
```

---

## 用户如何使用工具

用户**不需要**手动调用工具，只需要自然语言描述需求：

| 用户输入 | AI 行为 |
|---------|--------|
| "北京天气如何？" | 自动调用 `get_weather` |
| "搜索关于 Vue3 的文章" | 自动调用 `search_articles` |
| "现在几点了？" | 自动调用 `get_current_time` |
| "给我讲讲 DeepSeek 的文章" | 自动调用 `search_articles` → `get_article_content` |

---

## 完整示例：添加搜索工具

### 1. 实现搜索逻辑

```typescript
// 在 toolRegistry.ts 中添加

async function webSearch(args: Record<string, any>): Promise<string> {
  const query = args.query as string
  
  try {
    // 使用搜索引擎 API（示例使用 DuckDuckGo）
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    if (!response.ok) {
      return '搜索失败'
    }
    const results = await response.json()
    
    return results.slice(0, 5).map((r: any, i: number) => 
      `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.url}`
    ).join('\n\n')
  } catch (error) {
    return `搜索错误: ${error instanceof Error ? error.message : String(error)}`
  }
}
```

### 2. 注册工具

```typescript
{
  definition: {
    type: 'function',
    function: {
      name: 'web_search',
      description: '搜索互联网信息，获取最新资讯',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词'
          }
        },
        required: ['query']
      }
    }
  },
  executor: webSearch
}
```

### 3. 用户测试

```
用户: "搜索一下最新的 AI 新闻"
AI: 🔧 正在使用工具: web_search...
AI: 根据搜索结果，最新的 AI 新闻包括：
     1. OpenAI 发布 GPT-5...
     2. Google 推出新模型...
```

---

## 工具调用的技术细节

### API 请求流程

1. **第一次请求**（非流式）：
```json
{
  "model": "deepseek-chat",
  "messages": [{"role": "user", "content": "北京天气如何？"}],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "获取指定城市的当前天气",
        "parameters": {
          "type": "object",
          "properties": {
            "city": {"type": "string"}
          },
          "required": ["city"]
        }
      }
    }
  ],
  "stream": false
}
```

2. **AI 响应**（需要工具调用）：
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "",
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"city\": \"北京\"}"
        }
      }]
    }
  }]
}
```

3. **系统执行工具**并添加消息：
```json
[
  {"role": "assistant", "content": "", "tool_calls": [...]},
  {"role": "tool", "tool_call_id": "call_abc123", "name": "get_weather", "content": "晴天，25°C"}
]
```

4. **第二次请求**（流式）：获取最终回复

---

## 常见问题

### Q: AI 为什么不调用工具？
A: 可能原因：
1. 工具描述不够清晰，AI 不知道何时使用
2. 用户问题不需要工具（如"你好"）
3. 使用的是 `deepseek-reasoner` 模型（不支持工具）

### Q: 工具调用失败怎么办？
A: 检查：
1. 工具执行函数是否返回字符串
2. API 调用是否有错误处理
3. 网络连接是否正常

### Q: 如何让 AI 必须使用工具？
A: 可以设置 `tool_choice: "required"`（当前实现为 `"auto"`）

---

## 最佳实践

1. **清晰的描述**: 工具描述要明确告诉 AI 何时使用
2. **错误处理**: 工具执行要有 try-catch，返回友好的错误信息
3. **参数验证**: 在工具函数内验证参数有效性
4. **返回值**: 始终返回字符串，不要太长（建议 < 2000 字符）
