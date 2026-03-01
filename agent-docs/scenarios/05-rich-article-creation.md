# 场景五：富文本文章创作（图文并茂+超链接）

## 场景描述

用户使用自然语言描述需求，Agent 自动创建包含图片、视频、代码块、链接的富文本文章。

## 参与角色

- **写作 Agent**：专业的内容创作 Agent
- **富文本工具**：create_rich_article、insert_images、create_linked_article
- **平台解析工具**：parse_platform_link（获取引用内容）

## 完整流程

### 步骤 1：用户描述需求

**用户输入**
```
帮我写一篇关于 "TypeScript 高级类型" 的技术文章，要包含：
1. 基础概念介绍
2. 实用的代码示例
3. 推荐一些学习资源
4. 配图说明
```

### 步骤 2：Agent 规划内容结构

```typescript
// 写作 Agent 分析需求
const contentPlan = {
  title: 'TypeScript 高级类型完全指南',
  sections: [
    { type: 'heading', level: 2, content: '什么是高级类型' },
    { type: 'text', content: '介绍...' },
    { type: 'heading', level: 2, content: '泛型（Generics）' },
    { type: 'code', language: 'typescript', content: '...' },
    { type: 'heading', level: 2, content: '条件类型' },
    { type: 'code', language: 'typescript', content: '...' },
    { type: 'heading', level: 2, content: '映射类型' },
    { type: 'code', language: 'typescript', content: '...' },
    { type: 'heading', level: 2, content: '实用工具类型' },
    { type: 'list', items: ['Partial', 'Required', 'Pick', 'Omit'] },
    { type: 'heading', level: 2, content: '学习资源' },
    { type: 'link', link: { text: '官方文档', url: '...' } }
  ]
}
```

### 步骤 3：搜索并获取参考资料

```typescript
// 1. 搜索相关资料
const searchResults = await executeTool('web_search', {
  query: 'TypeScript 高级类型 教程',
  num_results: 5
})

// 2. 解析优质资源
const resources = [
  { title: 'TypeScript 官方文档', url: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html' },
  { title: '泛型指南', url: 'https://example.com/generics' }
]

for (const resource of resources) {
  const parsed = await executeTool('parse_platform_link', {
    url: resource.url,
    extract_content: true
  })
  resource.summary = extractSummary(parsed)
}
```

### 步骤 4：创建富文本文章

```typescript
const result = await executeTool('create_rich_article', {
  title: 'TypeScript 高级类型完全指南',
  path: 'typescript/advanced-types-complete-guide.md',
  blocks: [
    // 引言
    {
      type: 'text',
      content: 'TypeScript 的高级类型系统是其最强大的特性之一。本文将深入探讨泛型、条件类型、映射类型等核心概念，帮助你写出更健壮、更可维护的代码。'
    },
    
    // 章节 1
    {
      type: 'heading',
      level: 2,
      content: '一、泛型（Generics）'
    },
    {
      type: 'text',
      content: '泛型允许我们编写灵活的、可重用的代码组件。它们类似于其他语言中的模板。'
    },
    {
      type: 'code',
      language: 'typescript',
      content: `// 基础泛型函数
function identity<T>(arg: T): T {
  return arg
}

// 使用
let output = identity<string>("myString")
let output2 = identity(123)  // 类型推断

// 泛型接口
interface GenericIdentityFn<T> {
  (arg: T): T
}

// 泛型类
class GenericNumber<T> {
  zeroValue: T
  add: (x: T, y: T) => T
}`
    },
    {
      type: 'quote',
      content: '泛型是 TypeScript 中最强大的特性之一，它让我们能够在定义函数、接口或类的时候不预先指定具体类型，而是在使用的时候再指定。'
    },
    
    // 章节 2
    {
      type: 'heading',
      level: 2,
      content: '二、条件类型'
    },
    {
      type: 'text',
      content: '条件类型根据条件选择两种类型之一，类似于三元运算符。'
    },
    {
      type: 'code',
      language: 'typescript',
      content: `// 基础条件类型
type IsString<T> = T extends string ? true : false

type A = IsString<string>  // true
type B = IsString<number>  // false

// 实际应用：根据类型选择处理函数
type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends Function ? "function" :
  "object"

// infer 关键字
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any`
    },
    
    // 图片示例
    {
      type: 'image',
      url: 'https://example.com/typescript-type-hierarchy.png',
      alt: 'TypeScript 类型层次图',
      caption: 'TypeScript 类型系统层次结构'
    },
    
    // 章节 3
    {
      type: 'heading',
      level: 2,
      content: '三、映射类型'
    },
    {
      type: 'text',
      content: '映射类型允许我们基于旧类型创建新类型，通过转换属性来实现。'
    },
    {
      type: 'code',
      language: 'typescript',
      content: `// 基础映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}

type Partial<T> = {
  [P in keyof T]?: T[P]
}

// 自定义映射类型
type Nullable<T> = {
  [P in keyof T]: T[P] | null
}

type EventPayload<T> = {
  [K in keyof T]: {
    key: K
    value: T[K]
  }
}

// 使用示例
interface User {
  id: number
  name: string
  email: string
}

type NullableUser = Nullable<User>
// { id: number | null, name: string | null, email: string | null }`
    },
    
    // 章节 4
    {
      type: 'heading',
      level: 2,
      content: '四、内置工具类型'
    },
    {
      type: 'text',
      content: 'TypeScript 提供了许多内置的工具类型，帮助我们进行常见的类型转换。'
    },
    {
      type: 'list',
      items: [
        '**Partial<T>**：将类型 T 的所有属性变为可选',
        '**Required<T>**：将类型 T 的所有属性变为必选',
        '**Readonly<T>**：将类型 T 的所有属性变为只读',
        '**Pick<T, K>**：从 T 中选取属性 K 组成新类型',
        '**Omit<T, K>**：从 T 中排除属性 K 组成新类型',
        '**Exclude<T, U>**：从 T 中排除可赋值给 U 的类型',
        '**Extract<T, U>**：从 T 中提取可赋值给 U 的类型',
        '**ReturnType<T>**：获取函数类型 T 的返回类型',
        '**Parameters<T>**：获取函数类型 T 的参数类型',
        '**Awaited<T>**：获取 Promise 的返回值类型'
      ]
    },
    
    // 实际案例
    {
      type: 'heading',
      level: 2,
      content: '五、实战案例'
    },
    {
      type: 'text',
      content: '让我们通过一个实际的 API 响应处理场景，来综合运用这些高级类型。'
    },
    {
      type: 'code',
      language: 'typescript',
      content: `// API 响应类型
type ApiResponse<T> = {
  data: T
  status: number
  message: string
}

// 用户相关类型
interface User {
  id: number
  name: string
  email: string
  password: string  // 敏感字段
  createdAt: Date
}

// 创建 DTO：排除敏感字段
type UserDto = Omit<User, 'password' | 'createdAt'>

// 创建表单类型：所有字段可选
type UserForm = Partial<User>

// 创建更新类型：id 必选，其他可选
type UserUpdate = Pick<User, 'id'> & Partial<Omit<User, 'id'>>

// API 函数类型
async function fetchUser(id: number): Promise<ApiResponse<UserDto>> {
  const response = await fetch(\`/api/users/\${id}\`)
  return response.json()
}

// 使用
const user = await fetchUser(1)
// user.data 的类型是 UserDto，不包含 password 和 createdAt`
    },
    
    // 分隔线
    {
      type: 'divider'
    },
    
    // 学习资源
    {
      type: 'heading',
      level: 2,
      content: '六、推荐学习资源'
    },
    {
      type: 'text',
      content: '以下是一些优质的学习资源，帮助你深入理解 TypeScript 高级类型。'
    },
    {
      type: 'link',
      link: {
        text: 'TypeScript 官方手册 - 高级类型',
        url: 'https://www.typescriptlang.org/docs/handbook/advanced-types.html'
      }
    },
    {
      type: 'text',
      content: '官方文档是最权威的学习资料，涵盖了所有高级类型的详细说明和示例。'
    },
    {
      type: 'link',
      link: {
        text: 'Type Challenges',
        url: 'https://github.com/type-challenges/type-challenges'
      }
    },
    {
      type: 'text',
      content: '通过实际练习题来巩固你的类型体操技能，从简单到困难，循序渐进。'
    },
    {
      type: 'link',
      link: {
        text: 'React + TypeScript 最佳实践',
        url: 'https://react-typescript-cheatsheet.netlify.app/'
      }
    },
    {
      type: 'text',
      content: '如果你使用 React，这份速查表将帮助你正确地使用 TypeScript 编写组件。'
    },
    
    // 总结
    {
      type: 'heading',
      level: 2,
      content: '总结'
    },
    {
      type: 'text',
      content: '掌握 TypeScript 的高级类型系统需要时间和练习，但一旦熟练，你将能够编写出更加健壮、可维护的代码。记住，类型的最终目的是为了提高开发效率和代码质量，不要为了炫技而过度使用复杂类型。'
    }
  ],
  tags: ['TypeScript', '前端', '类型系统'],
  category: '技术',
  author: '写作助手'
})
```

### 步骤 5：插入图片集

用户希望添加更多图片：

```
用户: "在泛型那一节添加几张图说明"
```

**Agent 执行**

```typescript
await executeTool('insert_images', {
  articlePath: 'typescript/advanced-types-complete-guide.md',
  images: [
    {
      url: 'https://example.com/generics-concept.png',
      alt: '泛型概念图',
      caption: '泛型允许类型像参数一样传递'
    },
    {
      url: 'https://example.com/generics-example.png',
      alt: '泛型使用示例',
      caption: '泛型在函数、接口、类中的使用'
    },
    {
      url: 'https://example.com/type-inference.png',
      alt: '类型推断',
      caption: 'TypeScript 的类型推断机制'
    }
  ],
  layout: 'grid'  // 网格布局
})
```

生成的 Markdown：

```markdown
<div class="image-grid">

![泛型概念图](https://example.com/generics-concept.png)
*泛型允许类型像参数一样传递*

![泛型使用示例](https://example.com/generics-example.png)
*泛型在函数、接口、类中的使用*

![类型推断](https://example.com/type-inference.png)
*TypeScript 的类型推断机制*

</div>
```

### 步骤 6：格式化文章样式

```typescript
// 应用现代风格
await executeTool('format_rich_media', {
  articlePath: 'typescript/advanced-types-complete-guide.md',
  style: 'modern'  // 现代风格
})
```

样式效果：
- 大标题区（Hero section）
- 卡片式章节
- 代码块高亮
- 引用块样式

## 文章效果预览

生成的文章包含：

### 内容结构
- ✅ 清晰的标题层级（H1 → H2 → 内容）
- ✅ 代码块（TypeScript 语法高亮）
- ✅ 引用块（重点提示）
- ✅ 列表（工具类型枚举）
- ✅ 图片（概念图解）
- ✅ 超链接（学习资源）
- ✅ 分隔线（章节分割）

### 元数据
```yaml
---
title: TypeScript 高级类型完全指南
date: 2024-03-01T12:00:00.000Z
tags:
  - TypeScript
  - 前端
  - 类型系统
category: 技术
author: 写作助手
---
```

## 进阶用法

### 创建带引用的综述文章

```typescript
await executeTool('create_linked_article', {
  title: '前端框架发展趋势 2024',
  path: 'frontend/framework-trends-2024.md',
  content: `## 前言

2024年，前端框架领域发生了许多重要变化...`,
  links: [
    { text: 'React 官方博客', url: 'https://react.dev/blog', description: 'React 最新动态' },
    { text: 'Vue 3.4 发布', url: 'https://vuejs.org/', description: '性能提升 30%' },
    { text: 'Svelte 5', url: 'https://svelte.dev/', description: 'Runes 新特性' }
  ],
  references: [
    { title: 'State of JS 2023', url: 'https://stateofjs.com/', author: 'Devographics' },
    { title: '前端性能优化指南', url: 'https://web.dev/performance', author: 'Google Chrome Team' }
  ],
  tags: ['前端', 'React', 'Vue', '趋势'],
  category: '资讯'
})
```

## 总结

通过富文本文章工具，你可以：

1. 📝 **结构化内容** - 标题、段落、列表、引用
2. 💻 **代码展示** - 带语法高亮的代码块
3. 🖼️ **图文混排** - 图片网格、轮播、垂直布局
4. 🔗 **超链接** - 内嵌链接、参考资料
5. 🎨 **样式美化** - 现代、杂志、极简风格
6. 📊 **元数据** - 标签、分类、作者

让 AI 帮你创作专业、美观的技术文章！
