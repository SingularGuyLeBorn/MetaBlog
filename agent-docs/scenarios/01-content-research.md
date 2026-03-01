# 场景一：内容研究与自动整理

## 场景描述

用户想要研究一个主题（如"AI 绘画"），自动搜集资料并整理成一篇博客文章。

## 参与角色

- **研究助手 Agent**：专门用于资料搜集和整理的 Agent
- **工具**：web_search、parse_platform_link、create_rich_article
- **触发方式**：手动触发

## 完整流程

### 步骤 1：配置研究助手 Agent

```typescript
// 创建研究助手
const researchAgent = {
  id: 'agent-research-001',
  name: '研究助手',
  avatar: '🔍',
  description: '专业的资料搜集和研究整理助手',
  level: 'custom',
  skills: ['research', 'content_analysis'],
  systemPrompt: `你是一个专业的研究助手，擅长搜集和整理资料。

工作流程：
1. 使用 web_search 搜索相关资料
2. 解析用户提供的链接获取详细内容
3. 总结关键信息
4. 创建结构化的文章

注意事项：
- 确保信息来源可靠
- 交叉验证重要信息
- 标注引用来源`,
  runtime: {
    model: 'kimi-k2.5',
    temperature: 0.7,
    maxTokens: 4096
  },
  triggers: [{
    type: 'manual',
    name: '手动触发',
    enabled: true
  }]
}
```

### 步骤 2：开始研究对话

**用户输入**
```
帮我研究一下 AI 绘画，搜集一些最新的资料，整理成一篇文章。
```

**AI 处理过程**

```typescript
// 1. 调用搜索工具
const searchResult = await executeTool('web_search', {
  query: 'AI 绘画 2024 最新进展 Stable Diffusion Midjourney',
  num_results: 10
})

// 返回结果：
// "找到10篇相关文章:
// 1. 2024年AI绘画技术发展趋势 - https://example.com/1
// 2. Stable Diffusion 3 发布 - https://example.com/2
// ..."

// 2. 解析重点链接
const parsedContent = await executeTool('parse_multiple_links', {
  urls: [
    'https://example.com/1',
    'https://example.com/2',
    'https://zhuanlan.zhihu.com/p/xxx'
  ]
})

// 3. 分析并总结
const analysis = await aiService.sendMessage({
  messages: [
    { role: 'system', content: '分析以下资料，提取关键信息' },
    { role: 'user', content: parsedContent }
  ]
})
```

**AI 回复**
```
我搜索到了10篇相关资料，并解析了其中3篇重点内容。以下是我发现的要点：

## 主要发现

1. **Stable Diffusion 3 发布**
   - 更好的文字渲染能力
   - 多模态输入支持
   - 开源可商用

2. **Midjourney V6 更新**
   - 更真实的图像质量
   - 支持更长的提示词

3. **国内AI绘画工具崛起**
   - 文心一格、通义万相等
   - 针对中文优化

让我为你创建一篇详细的文章？
```

### 步骤 3：创建富文本文章

**用户输入**
```
好的，帮我创建文章。
```

**AI 调用工具创建文章**

```typescript
const result = await executeTool('create_rich_article', {
  title: '2024年AI绘画技术全景：从Stable Diffusion到Midjourney',
  path: 'AI/ai-painting-2024-guide.md',
  blocks: [
    {
      type: 'heading',
      level: 2,
      content: '引言'
    },
    {
      type: 'text',
      content: '2024年是AI绘画技术飞速发展的一年。本文将全面梳理主流AI绘画工具的最新进展...'
    },
    {
      type: 'heading',
      level: 2,
      content: '一、Stable Diffusion 3：开源之王的新篇章'
    },
    {
      type: 'text',
      content: 'Stable Diffusion 3于2024年初发布，带来了革命性的改进：'
    },
    {
      type: 'list',
      items: [
        '文字渲染能力大幅提升，终于能正确生成带文字的图片',
        '多模态输入支持，可以结合图像和文本进行生成',
        '开源协议更加友好，商业使用限制更少'
      ]
    },
    {
      type: 'image',
      url: 'https://example.com/sd3-demo.jpg',
      alt: 'Stable Diffusion 3 示例',
      caption: 'Stable Diffusion 3 生成的图片示例'
    },
    {
      type: 'heading',
      level: 2,
      content: '二、Midjourney V6：追求极致的艺术性'
    },
    {
      type: 'text',
      content: 'Midjourney V6专注于提升图像的艺术性和真实感...'
    },
    {
      type: 'code',
      language: 'markdown',
      content: `# Midjourney V6 提示词示例
photorealistic portrait of a woman, 
cinematic lighting, 8k, --ar 16:9 --v 6`
    },
    {
      type: 'heading',
      level: 2,
      content: '三、国内AI绘画工具崛起'
    },
    {
      type: 'text',
      content: '除了国际工具，国内的AI绘画工具也在快速发展：'
    },
    {
      type: 'link',
      link: {
        text: '文心一格',
        url: 'https://yige.baidu.com'
      }
    },
    {
      type: 'text',
      content: '百度推出的AI绘画工具，对中文提示词支持更好...'
    },
    {
      type: 'divider'
    },
    {
      type: 'heading',
      level: 2,
      content: '总结与展望'
    },
    {
      type: 'text',
      content: 'AI绘画技术在2024年取得了长足进步。我们可以期待...'
    }
  ],
  tags: ['AI', 'AI绘画', 'Stable Diffusion', 'Midjourney'],
  category: '技术',
  author: '研究助手'
})
```

**执行结果**
```
✅ 富文本文章创建成功！

📄 2024年AI绘画技术全景：从Stable Diffusion到Midjourney
📝 内容块数: 15
🏷️ 标签: AI, AI绘画, Stable Diffusion, Midjourney
📁 路径: AI/ai-painting-2024-guide.md

文章预览：
---
title: 2024年AI绘画技术全景：从Stable Diffusion到Midjourney
date: 2024-03-01T10:30:00.000Z
tags:
  - AI
  - AI绘画
  - Stable Diffusion
  - Midjourney
category: 技术
author: 研究助手
---

# 2024年AI绘画技术全景：从Stable Diffusion到Midjourney

## 引言

2024年是AI绘画技术飞速发展的一年...
```

## 效果展示

生成的文章包含：
- ✅ 结构化的目录（引言、多个章节、总结）
- ✅ 列表展示关键要点
- ✅ 图片示例
- ✅ 代码块展示提示词
- ✅ 超链接到相关工具
- ✅ 标签和分类

## 自动化扩展

可以配置定时触发，每周自动搜索并生成周报：

```typescript
{
  triggers: [{
    type: 'scheduled',
    name: '每周AI绘画周报',
    enabled: true,
    config: {
      cron: '0 9 * * 1',  // 每周一早上9点
      timezone: 'Asia/Shanghai'
    }
  }]
}
```
