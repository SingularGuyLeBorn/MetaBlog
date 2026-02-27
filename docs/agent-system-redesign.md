# Agent 系统重构设计文档

## 调研总结

### 1. Agent-Browser (Vercel Labs) - 浏览器自动化 CLI

**核心特性：**
- Rust CLI + Node.js Daemon 架构（高性能）
- 支持快照（snapshot）+ 引用（refs）的 AI 工作流
- 多平台支持（Browserbase, Browser Use, Kernel, iOS Simulator）
- 安全性（加密存储、域名白名单、动作确认）
- 支持 CDP (Chrome DevTools Protocol)
- 支持流式传输（WebSocket 实时预览）

**关键命令：**
```bash
agent-browser open <url>
agent-browser snapshot -i           # 获取可交互元素
agent-browser click @e2             # 通过 ref 点击
agent-browser fill @e3 "text"       # 通过 ref 填充
```

### 2. OpenViking (字节跳动) - Agent 上下文数据库

**核心概念：**
- **文件系统范式**：统一内存、资源、技能的管理（viking:// 协议）
- **分层上下文加载**：L0(摘要)、L1(概览)、L2(详情) 三级结构
- **目录递归检索**：结合目录定位和语义搜索
- **可视化检索轨迹**：可追溯的上下文获取过程
- **自动会话管理**：会话结束自动提取记忆

**目录结构：**
```
viking://
├── resources/          # 项目文档、网页等
├── user/              # 用户偏好、习惯
│   └── memories/
└── agent/             # 技能、指令、任务记忆
    ├── skills/
    └── memories/
```

### 3. AgentQL - AI 驱动的网页查询语言

**核心特性：**
- 自然语言查询定位页面元素
- 结构化数据输出
- 跨站点兼容性（类似站点使用相同查询）
- 自动适应 UI 变化
- Playwright 集成

**示例查询：**
```python
{
  products[] {
    name
    price
    rating
  }
}
```

### 4. 连续型 Claude (Continuous-Claude-v3)

**上下文管理特点：**
- 通过 ledger 和 handoff 保持状态
- MCP 执行不污染上下文
- Agent 编排与隔离上下文窗口

### 5. Fat-Cat - 文档为中心的上下文管理

**核心理念：**
- 让上下文管理像阅读聊天记录一样简单
- 文档为中心的 Agent 上下文管理

---

## 设计目标

基于以上调研，我们需要实现：

1. **Gene (基因) 系统** - 替代/升级 Skills
2. **Agent 上下文管理** - 参考 OpenViking 和 Continuous-Claude
3. **网页自动化工具** - 参考 Agent-Browser 和 AgentQL
4. **多平台接入能力** - 统一的链接解析和处理

---

## 架构设计

### 1. Gene (基因) 系统

Gene 是 Skills 的进化版，概念来自生物基因：

**核心概念：**
- **Gene (基因)**: 可复用的能力单元，包含提示词模板、工具定义、元数据
- **Genome (基因组)**: Agent 的完整能力集合 = 多个 Gene 的组合
- **Expression (表达)**: Gene 在特定上下文中的实例化
- **Mutation (突变)**: Gene 的自适应进化（根据使用反馈优化）

**与 Skills 的区别：**

| 特性 | Skills | Gene |
|------|--------|------|
| 静态/动态 | 静态定义 | 可动态进化 |
| 版本控制 | 简单版本号 | Gene 谱系 |
| 上下文感知 | 无 | 有（L0/L1/L2 分层）|
| 组合方式 | 简单叠加 | 基因组组合 |
| 自学习 | 无 | 有（Mutation）|

**Gene 文件格式：**
```markdown
# Gene: content_analyzer

## Metadata
- version: 1.0.0
- lineage: content_analyzer@v1.0.0
- tags: [analysis, content, link]
- author: system

## L0: Abstract (摘要层 ~100 tokens)
专业的内容分析助手，擅长解析链接、图片和各类媒体内容

## L1: Overview (概览层 ~2k tokens)
### 核心能力
1. 链接解析 - 自动识别平台，提取元数据
2. 图片处理 - OCR、内容分析
3. 内容评估 - 可信度、客观性分析

### 工具依赖
- parse_platform_link
- process_image
- fetch_url

## L2: Detail (详情层 - 完整 Prompt)
[完整的工作流程、输出格式、注意事项]

## Expression Rules (表达规则)
- trigger: 用户发送链接或图片时激活
- priority: 高（当检测到 URL 或图片时）
- context_window: L1 默认，用户要求深度分析时加载 L2
```

### 2. Agent 上下文管理

参考 OpenViking 的文件系统范式：

**上下文层级结构：**
```
agent://{agent_id}/
├── context/                 # 当前会话上下文
│   ├── current/            # 当前激活的上下文
│   ├── history/            # 历史会话记录
│   └── temp/               # 临时数据
├── memory/                  # 长期记忆
│   ├── user/               # 用户相关记忆
│   │   ├── preferences/    # 用户偏好
│   │   └── patterns/       # 行为模式
│   └── task/               # 任务相关记忆
│       ├── success/        # 成功经验
│       └── failure/        # 失败教训
├── genome/                  # Gene 组合
│   ├── active/             # 当前激活的 Genes
│   └── history/            # 历史 Genome 版本
└── workspace/               # 工作空间
    ├── resources/          # 加载的资源
    ├── tools/              # 工具调用记录
    └── outputs/            # 输出缓存
```

**上下文加载策略：**
1. **按需加载**：只加载当前需要的 L0/L1 层
2. **分层压缩**：L0(100 tokens) → L1(2000 tokens) → L2(完整)
3. **引用追踪**：记录上下文来源，可追溯
4. **自动清理**：临时数据自动过期

### 3. 网页自动化工具

整合 Agent-Browser 和 AgentQL 的优点：

**工具集合：**
```typescript
// 基础浏览器控制
browser_navigate(url: string)
browser_snapshot(options: { interactive?: boolean, depth?: number })
browser_click(selector: string | Ref)
browser_fill(selector: string | Ref, value: string)
browser_screenshot(options?: { fullPage?: boolean, annotate?: boolean })

// AgentQL 风格的智能查询
browser_query<T>(query: string): Promise<T>
// 示例: browser_query('{ products[] { name, price } }')

// 流式监控
browser_stream(callback: (frame: Frame) => void)

// 状态管理
browser_save_state(name: string)
browser_load_state(name: string)
```

**AI 友好设计：**
1. **快照 + 引用模式**：先获取页面快照，AI 选择引用进行操作
2. **自然语言查询**：AgentQL 风格的查询语言
3. **状态持久化**：支持登录状态保存和恢复

### 4. 多平台接入

统一的平台内容解析系统：

**平台适配器架构：**
```typescript
interface PlatformAdapter {
  name: string
  domains: string[]
  
  // 解析内容
  parse(url: string): Promise<ParsedContent>
  
  // 平台特定操作（如需要登录）
  authenticate?(credentials: Credentials): Promise<void>
  
  // 内容类型检测
  detectContentType(url: string): ContentType
}

// 已支持平台
- UniversalAdapter    // 通用网页解析
- ZhihuAdapter       // 知乎
- WechatAdapter      // 微信公众号
- XiaohongshuAdapter // 小红书
- BilibiliAdapter    // B站
- GithubAdapter      // GitHub
- TwitterAdapter     // Twitter/X
- YoutubeAdapter     // YouTube
```

---

## 实现计划

### Phase 1: Gene 系统基础 (预计 3-4 天)

**Day 1: Gene 文件格式与解析**
- [ ] 设计 Gene 文件规范
- [ ] 实现 Gene 解析器（支持 L0/L1/L2 分层）
- [ ] 创建 .genes/ 目录结构
- [ ] 迁移现有 Skills 到 Gene 格式

**Day 2: Gene 管理系统**
- [ ] 实现 Gene 注册表
- [ ] 实现 Gene 加载/卸载
- [ ] 实现 Gene 组合（Genome）
- [ ] API: /api/genes/*

**Day 3: 上下文分层加载**
- [ ] 实现 L0/L1/L2 加载逻辑
- [ ] 实现上下文压缩/解压缩
- [ ] 实现基于token的上下文预算管理
- [ ] 测试不同层的加载性能

**Day 4: 测试与优化**
- [ ] 编写 Gene 系统单元测试
- [ ] 性能测试：大上下文加载
- [ ] 集成测试：与现有 Agent 系统
- [ ] Git commit

### Phase 2: Agent 上下文管理 (预计 3-4 天)

**Day 1: 上下文文件系统设计**
- [ ] 设计 agent:// 协议
- [ ] 实现虚拟文件系统
- [ ] 创建目录结构管理
- [ ] 实现基础 CRUD 操作

**Day 2: 记忆系统**
- [ ] 实现用户偏好记忆
- [ ] 实现任务成功/失败记忆
- [ ] 实现记忆提取（会话后处理）
- [ ] 记忆搜索与检索

**Day 3: 会话管理升级**
- [ ] 重构现有会话系统
- [ ] 实现会话上下文持久化
- [ ] 实现会话恢复
- [ ] 实现多会话并发

**Day 4: 测试与优化**
- [ ] 上下文管理测试
- [ ] 记忆系统测试
- [ ] 性能测试
- [ ] Git commit

### Phase 3: 网页自动化 (预计 4-5 天)

**Day 1: 浏览器控制基础**
- [ ] 集成 Playwright
- [ ] 实现基础导航命令
- [ ] 实现快照系统
- [ ] 实现元素引用（Ref）系统

**Day 2: AgentQL 风格查询**
- [ ] 设计查询语言
- [ ] 实现查询解析器
- [ ] 实现自然语言到选择器转换
- [ ] 测试复杂查询

**Day 3: 状态管理与安全**
- [ ] 实现登录状态保存/恢复
- [ ] 实现加密存储
- [ ] 实现域名白名单
- [ ] 实现动作确认机制

**Day 4: 流式与 CDP**
- [ ] 实现 WebSocket 流式传输
- [ ] 实现 CDP 连接
- [ ] 实现远程浏览器支持
- [ ] 实现 iOS 模拟器支持

**Day 5: 测试**
- [ ] 浏览器控制测试
- [ ] 查询语言测试
- [ ] 安全测试
- [ ] Git commit

### Phase 4: 多平台接入 (预计 3-4 天)

**Day 1: 平台适配器框架**
- [ ] 设计适配器接口
- [ ] 实现通用适配器
- [ ] 实现适配器注册机制
- [ ] API: /api/platform/parse

**Day 2: 国内平台适配器**
- [ ] 知乎适配器
- [ ] 微信公众号适配器
- [ ] 小红书适配器
- [ ] B站适配器

**Day 3: 国际平台适配器**
- [ ] Twitter/X 适配器
- [ ] YouTube 适配器
- [ ] GitHub 适配器
- [ ] StackOverflow 适配器

**Day 4: 测试与优化**
- [ ] 各平台解析测试
- [ ] 反爬策略测试
- [ ] 错误处理测试
- [ ] Git commit

### Phase 5: 整合与系统测试 (预计 3-4 天)

**Day 1: 系统整合**
- [ ] Gene 与上下文管理整合
- [ ] 上下文与网页自动化整合
- [ ] 网页自动化与多平台整合
- [ ] 端到端流程测试

**Day 2: UI 更新**
- [ ] 更新 Agent 配置界面（支持 Gene）
- [ ] 添加上下文可视化界面
- [ ] 添加浏览器控制界面
- [ ] 添加平台内容预览界面

**Day 3: 文档与示例**
- [ ] 编写 Gene 开发文档
- [ ] 创建示例 Genes
- [ ] 编写 API 文档
- [ ] 编写用户使用指南

**Day 4: 最终测试与提交**
- [ ] 完整系统测试
- [ ] 性能测试
- [ ] 修复 bug
- [ ] Git commit & push

---

## 技术选型

| 组件 | 选型 | 理由 |
|------|------|------|
| 浏览器控制 | Playwright | 功能全面，支持多浏览器 |
| 后端 | Node.js + TypeScript | 与现有代码一致 |
| 存储 | SQLite + JSON | 简单，易于备份 |
| 向量检索 | 可选 (初期用简单搜索) | 后期可接入 VikingDB |
| 加密 | Node.js crypto | 内置，无需额外依赖 |

---

## 风险与挑战

1. **反爬机制**：平台可能有反爬，需要处理验证码、IP 限制等
2. **性能问题**：大量 Gene 加载可能影响性能
3. **上下文爆炸**：Agent 长期运行后上下文过大
4. **隐私安全**：用户数据加密存储，避免泄露

---

## 下一步行动

请确认这个设计文档后，我将开始 Phase 1 的实现。
